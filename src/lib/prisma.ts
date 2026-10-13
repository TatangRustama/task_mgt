import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const SOFT_DELETE_MODELS = new Set(["User", "Pegawai", "Task"]);
const SOFT_DELETE_LISTS = new Set([
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

function withActive(where: unknown) {
  if (where && typeof where === "object" && "deletedAt" in where) return where;
  return { AND: [where ?? {}, { deletedAt: null }] };
}

function softDeleteExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!SOFT_DELETE_MODELS.has(model)) return query(args);
          const queryArgs = args as { where?: unknown; select?: Record<string, boolean> | null };
          if (SOFT_DELETE_LISTS.has(operation)) {
            queryArgs.where = withActive(queryArgs.where);
            return query(args);
          }
          if (model === "Task" && (operation === "findUnique" || operation === "findUniqueOrThrow")) {
            const select = queryArgs.select;
            if (select) queryArgs.select = { ...select, deletedAt: true };
            const row = (await query(args)) as { deletedAt?: Date | null } | null;
            if (!row || row.deletedAt) return null;
            if (select && !select.deletedAt) delete row.deletedAt;
            return row;
          }
          return query(args);
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter }).$extends(softDeleteExtension());
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as ReturnType<typeof createPrismaClient>, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof typeof client];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});
