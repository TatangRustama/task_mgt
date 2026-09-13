# Kinerja — Peningkatan Kinerja ASN

Aplikasi mobile-first untuk delegasi tugas pimpinan, post-it board, keep/selesai tugas pegawai, bukti foto+geo-tag, approval/nilai, dan laporan arsip bulanan.

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- NextAuth.js (credentials)
- Leaflet + OpenStreetMap

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Setup database & seed demo data

```bash
npm run db:setup
```

### 4. Run development server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

Perangkat lain di Wi-Fi yang sama: `http://<IP-LAN-PC>:3000` (IP tampil di log `Network` saat `npm run dev`).

## Akun Demo

| Role | Login | Password |
|------|-------|----------|
| Super Admin | superadmin | password123 |
| Admin | hr@demo.go.id | password123 |
| Personal | NIP pegawai | NIP |

## Fitur MVP

- Board post-it (Tersedia / Dikerjakan / Selesai)
- Keep tugas delegasi
- Tugas mandiri pegawai
- Selesai dengan foto + geo-tag
- Menu pimpinan: delegasi, persetujuan, nilai
- Laporan bulanan + cetak PDF
- Admin: kelola unit & user

## Environment

### Development (Supabase — default)

Copy `.env.example` ke `.env`. Database dan storage memakai Supabase yang sama dengan production:

```
DATABASE_URL=postgresql://postgres.PROJECT_REF:...@...pooler.supabase.com:6543/postgres?sslmode=no-verify
DIRECT_URL=postgresql://postgres.PROJECT_REF:...@...pooler.supabase.com:5432/postgres?sslmode=no-verify
NEXTAUTH_URL=http://localhost:3000
```

Backup lengkap untuk deploy: **`.env.production`**.

### Local Docker (optional)

Jika ingin database PostgreSQL lokal tanpa Supabase:

```bash
docker compose up -d
npm run db:setup
```

Aktifkan baris `localhost:5432` di `.env` dan comment baris Supabase database.
