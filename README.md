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

## Akun Demo

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@demo.go.id | password123 |
| Pimpinan | pimpinan@demo.go.id | password123 |
| Pegawai | pegawai@demo.go.id | password123 |

## Fitur MVP

- Board post-it (Tersedia / Dikerjakan / Selesai)
- Keep tugas delegasi
- Tugas mandiri pegawai
- Selesai dengan foto + geo-tag
- Menu pimpinan: delegasi, persetujuan, nilai
- Laporan bulanan + cetak PDF
- Admin: kelola unit & user

## Environment

Copy `.env.example` ke `.env` dan sesuaikan:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/kinerja?schema=public
AUTH_SECRET=ganti-dengan-secret-panjang-minimal-32-karakter
NEXTAUTH_URL=http://localhost:3000
```
