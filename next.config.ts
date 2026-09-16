import os from "os";
import type { NextConfig } from "next";

const supabaseHost = process.env.SUPABASE_URL
  ? new URL(process.env.SUPABASE_URL).hostname
  : "*.supabase.co";

function lanDevOrigins() {
  const origins = new Set<string>([
    "127.0.0.1",
    "192.168.*.*",
    "10.*.*.*",
    "*.trycloudflare.com",
    "*.loca.lt",
  ]);
  for (let octet = 16; octet <= 31; octet += 1) {
    origins.add(`172.${octet}.*.*`);
  }
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family === "IPv4" && !addr.internal) origins.add(addr.address);
    }
  }
  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: lanDevOrigins(),
  serverExternalPackages: ["web-push"],
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/foto_tugas/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["*.trycloudflare.com", "192.168.*.*"],
    },
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
