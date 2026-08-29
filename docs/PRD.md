# PRD: Aplikasi Kinerja ASN (Kinerja)

## 1. Ringkasan Produk

**Nama:** Kinerja  
**Visi:** Memudahkan pimpinan mendelegasikan tugas harian dan memudahkan pegawai melaporkan capaian — sederhana seperti post-it, powerful untuk arsip kinerja bulanan.  
**Platform:** Web app mobile-first (PWA), Next.js + PostgreSQL  
**Cakupan:** Multi unit/bidang dalam satu instansi

---

## 2. Masalah yang Diselesaikan

| Masalah | Solusi |
|---------|--------|
| Delegasi tugas tidak terstruktur (chat/WA) | Menu Pimpinan: posting tugas ke board unit |
| Sulit melacak siapa mengerjakan apa | Fitur **Keep** — pegawai klaim tugas secara eksplisit |
| Bukti kerja tidak terdokumentasi | Foto + geo-tag saat selesai |
| Penilaian kinerja tidak transparan | Approval + nilai oleh pimpinan |
| Pegawai menunggu tugas dari atas | Tugas mandiri pegawai (self-initiated) |
| Arsip kinerja bulanan manual | Dashboard bulanan + printout PDF |

---

## 3. Persona & Peran

| Peran | Hak Akses |
|-------|-----------|
| **Admin Instansi** | CRUD unit/bidang, assign user ke unit, assign pimpinan per unit |
| **Pimpinan** | Post tugas ke unit, approve & beri nilai, lihat laporan unit |
| **Pegawai** | Keep tugas, update selesai, buat tugas mandiri, lihat laporan pribadi |

**Catatan scope:** Satu pegawai terikat ke satu unit. Pimpinan hanya melihat/mengelola unit yang dipimpinnya.

---

## 4. Alur Utama (User Flow)

### 4.1 Alur Pimpinan — Delegasi Tugas
1. Login → Menu **Pimpinan**
2. Tap **+ Tugas Baru** → isi: judul, deskripsi singkat, deadline (opsional), prioritas (rendah/sedang/tinggi)
3. Tugas muncul di **Board Post-it** unit sebagai kartu warna-warni (status: *Tersedia*)

### 4.2 Alur Pegawai — Keep & Selesai
1. Buka **Board Tugas** → lihat post-it *Tersedia* (warna kuning) dan *Mandiri* (warna biru)
2. Tap **Keep** pada tugas → status *Dikerjakan*
3. Saat selesai → tap **Telah Selesai** dengan catatan, foto, dan geo-tag
4. Status → *Menunggu Approval*

### 4.3 Alur Pimpinan — Approve & Nilai
1. Menu **Persetujuan** → daftar tugas selesai menunggu review
2. Buka detail → lihat foto, lokasi, catatan pegawai
3. Aksi: **Setujui + Nilai (1–100)** atau **Tolak + Catatan revisi**

### 4.4 Alur Pegawai — Tugas Mandiri
1. Tap **+ Tugas Mandiri** → isi judul, deskripsi
2. Langsung status *Dikerjakan*
3. Alur selesai & approval sama dengan tugas delegasi

---

## 5. Fitur Detail

### 5.1 Board Post-it

| Kolom | Isi | Warna Post-it |
|-------|-----|---------------|
| **Tersedia** | Tugas belum di-keep | Kuning `#FFF9C4` |
| **Dikerjakan** | Tugas saya (keep/mandiri) | Oranye `#FFE0B2` |
| **Selesai** | Menunggu/disahkan | Hijau `#C8E6C9` |

### 5.2 Menu Pimpinan
- **Board Unit** — lihat semua post-it unit
- **Delegasi Tugas** — form buat tugas baru
- **Persetujuan** — badge counter tugas pending
- **Laporan Unit** — ringkasan bulanan unit

### 5.3 Foto & Geo-tagging
- Min 1, max 3 foto per penyelesaian; compress client-side (max 1MB/foto)
- Auto-capture lat/lng via browser Geolocation API; fallback input alamat manual
- Leaflet/OpenStreetMap — pin lokasi read-only di detail tugas

### 5.4 Laporan Bulanan & Printout
- Filter: bulan/tahun, unit, pegawai
- KPI: total tugas, selesai, rata-rata nilai, % tepat waktu
- Printout PDF dengan header instansi, tabel tugas, footer tanda tangan

---

## 6. Model Data

**Enum `Task.status`:** `tersedia | dikerjakan | menunggu_approval | disetujui | ditolak | dibatalkan`  
**Enum `Task.source`:** `delegasi | mandiri`  
**Enum `User.role`:** `admin | pimpinan | pegawai`

---

## 7. Arsitektur Teknis

| Layer | Pilihan |
|-------|---------|
| Frontend | Next.js 14+ App Router, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui + custom post-it card |
| Auth | NextAuth.js (credentials) |
| ORM | Prisma |
| Database | PostgreSQL |
| Maps | Leaflet + react-leaflet |
| PWA | next-pwa |

---

## 8. Aturan Bisnis

1. Satu tugas hanya bisa di-keep oleh **1 pegawai** (first-come)
2. Tugas mandiri otomatis assigned ke pembuat
3. Foto + geo-tag **wajib** saat tandai selesai
4. Nilai 1–100, hanya pimpinan unit terkait yang bisa approve
5. Tugas ditolak kembali ke status *Dikerjakan* dengan catatan revisi
6. Arsip bulanan dihitung berdasarkan `reviewed_at`

---

## 9. Fase Implementasi

### Fase 1 — MVP
- Auth + RBAC, CRUD unit & user, Board post-it, Tugas mandiri, Foto + geo-tag, Approve & nilai, Laporan bulanan + PDF

### Fase 2 — Enhancement
- Push notification, SSO, Offline queue, Export Excel, Dashboard analitik

### Fase 3 — Skala
- Multi instansi, Integrasi SKP/e-Kinerja, API publik
