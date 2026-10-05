<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- PostgreSQL 16 runs on the VM. Docker is not available, and systemd is not PID 1, so start the cluster with `pg_ctlcluster` (the Cloud Agent `start` script does this). Database `kinerja`, user `postgres`, password `postgres`, matching `docker-compose.yml`.
- When `.env` is missing, `start` writes local `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`, then runs `npx prisma db push` and `npx tsx prisma/seed.ts` before `npm run dev` on port 3000.
- Demo password is `password123`. Super admin username is `superadmin`. Other accounts are in `README.md`.
- Photo upload needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Login, the task board, and admin screens work without them. `/api/health` sets `ok` only when those Supabase variables are present; `env.DATABASE_OK` is the database check.
- `npx tsc --noEmit` is the type check. There is no automated test script. `npm run lint` currently reports existing `react-hooks/set-state-in-effect` errors in the app.

