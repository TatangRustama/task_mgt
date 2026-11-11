# PRD: API Outgoing Data Sharing Kinerja Pegawai (Daily & Monthly By NIP)

**Versi:** 1.0.0  
**Status:** Draf Siap Implementasi  
**Tanggal:** 11 November 2026  
**Penanggung Jawab:** Tim Pengembang Aplikasi Kinerja  

---

## 1. Latar Belakang & Tujuan

Aplikasi **Kinerja** mencatat aktivitas kerja, tugas harian (delegasi maupun mandiri), bukti pekerjaan (foto, geo-tag, catatan), serta review/rating dari pimpinan secara real-time.

Untuk mendukung interoperabilitas antar sistem di lingkungan pemerintah daerah/instansi, aplikasi eksternal (seperti **E-Kinerja BKD/BKPSDM**, **SIMPEG**, **Aplikasi Pembayaran TPP/Payroll**, atau **Executive Dashboard**) membutuhkan akses terstandar untuk menarik data kinerja pegawai secara programmatic.

### Tujuan Utama:
1. Menyediakan jalur integrasi *machine-to-machine* (M2M) yang aman menggunakan **Bearer API Token**.
2. Memungkinkan sistem eksternal menarik rekapitulasi dan detail kinerja per hari berdasarkan **NIP**.
3. Memungkinkan sistem eksternal menarik rekapitulasi dan daftar kinerja bulanan berdasarkan **NIP**, bulan, dan tahun.
4. Menstandarkan format respon data JSON, validasi parameter, dan penanganan kode status HTTP.

---

## 2. Arsitektur & Keamanan (Authentication & Authorization)

### 2.1 Mekanisme Otentikasi
- Setiap request wajib menyertakan header HTTP:
  ```http
  Authorization: Bearer <API_TOKEN>
  Accept: application/json
  ```
- Token diterbitkan melalui sistem admin aplikasi Kinerja dengan scope perizinan `read:kinerja`.
- Token di-hash (misal SHA-256) saat disimpan di basis data untuk mencegah kebocoran secret.

### 2.2 Usulan Skema Database Manajemen Token (`ApiToken`)
```prisma
model ApiToken {
  id          String    @id @default(cuid())
  name        String    // Contoh: "Integrasi E-Kinerja BKD", "Portal TPP"
  tokenHash   String    @unique
  prefix      String    // 8 karakter pertama untuk identifikasi di UI admin (misal: "kin_live_...")
  scopes      String[]  @default(["read:kinerja"])
  isActive    Boolean   @default(true)
  lastUsedAt  DateTime?
  expiresAt   DateTime?
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([tokenHash])
}
```

### 2.3 Standar Keamanan & Pembatasan Akses
- **Transport Security:** Wajib HTTPS (TLS 1.2+).
- **Rate Limiting:** Maksimum 120 request/menit per token (kembalikan `429 Too Many Requests` jika melampaui limit).
- **Audit Logging:** Setiap penarikan data mencatat IP pemanggil, token id, NIP yang ditarik, dan response code.
- **Data Privacy:** Password, credential internal, dan data privat non-kinerja tidak pernah diekspos dalam payload JSON.

---

## 3. Spesifikasi Endpoint

Prefix Base URL: `/api/v1/external`

---

### 3.1 Endpoint 1: Tarik Data Kinerja Harian (`GET /kinerja/daily`)

Mengambil rincian tugas dan bukti kerja seorang pegawai pada satu tanggal spesifik berdasarkan NIP.

#### A. Request
- **Method:** `GET`
- **Path:** `/api/v1/external/kinerja/daily`
- **Query Parameters:**
  | Parameter | Tipe Data | Wajib? | Format / Default | Deskripsi |
  |---|---|---|---|---|
  | `nip` | String | Ya | 18 digit angka (ASN) | NIP pegawai yang dicari |
  | `date` | String | Ya | `YYYY-MM-DD` | Tanggal kinerja (contoh: `2026-11-11`) |
  | `page` | Integer | Tidak | Default: `1`, Min: `1` | Nomor halaman data tugas |
  | `limit` | Integer | Tidak | Default: `10`, Min: `1`, Max: `100` | Jumlah data tugas per halaman |

#### B. Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Data kinerja harian berhasil diambil",
  "data": {
    "pegawai": {
      "nip": "198801012015011001",
      "nama": "Budi Santoso, S.Kom",
      "jabatan": "Pranata Komputer Ahli Muda",
      "unitKerja": "Bidang Teknologi Informasi dan Komunikasi"
    },
    "tanggal": "2026-11-11",
    "ringkasan": {
      "totalTugas": 3,
      "selesai": 3,
      "totalIntervensi": 5,
      "statusVerifikasi": "approved", // "approved" | "pending" | "none"
      "rataRataRating": 5.0
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 3,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "daftarTugas": [
      {
        "id": "cm3task001",
        "judul": "Pemeliharaan Server Database SIMPEG",
        "deskripsi": "Melakukan backup rutin dan pengecekan service PostgreSQL",
        "sumber": "atasan", // "atasan" | "mandiri"
        "prioritas": "tinggi", // "rendah" | "sedang" | "tinggi"
        "jumlahIntervensi": 2,
        "satuan": "kegiatan",
        "status": "selesai",
        "waktuSelesai": "2026-11-11T14:30:00.000Z",
        "bukti": {
          "alamat": "Kantor Bappeda Lt. 2, Jayapura",
          "koordinat": {
            "lat": -2.5337,
            "lng": 140.7181
          },
          "catatan": "Pekerjaan selesai 100%, load average normal 0.2",
          "fotoUrls": [
            "https://siapkinerja.dev-ims.net/api/reports/evidence-image?id=cm3task001&idx=0"
          ]
        },
        "reviewAtasan": {
          "keputusan": "disetujui", // "disetujui" | "ditolak"
          "skor": 95,
          "catatan": "Kerja bagus dan tepat waktu",
          "dinilaiOleh": "Ir. Hendra Pratama, M.T",
          "dinilaiPada": "2026-11-11T16:00:00.000Z"
        },
        "rating": {
          "bintang": 5,
          "diberikanPada": "2026-11-11T16:00:00.000Z"
        }
      }
    ]
  }
}
```

---

### 3.2 Endpoint 2: Tarik Data Kinerja Bulanan (`GET /kinerja/monthly`)

Mengambil rekapitulasi capaian bulanan pegawai beserta rekap kalender per hari dan daftar tugas pada bulan tersebut.

#### A. Request
- **Method:** `GET`
- **Path:** `/api/v1/external/kinerja/monthly`
- **Query Parameters:**
  | Parameter | Tipe Data | Wajib? | Format / Contoh | Deskripsi |
  |---|---|---|---|---|
  | `nip` | String | Ya | 18 digit angka | NIP pegawai yang dicari |
  | `month` | Integer | Ya | `1` - `12` | Bulan kinerja (1=Januari, ..., 11=November) |
  | `year` | Integer | Ya | `YYYY` (contoh: `2026`) | Tahun kinerja |

#### B. Response Sukses (`200 OK`)
```json
{
  "success": true,
  "message": "Data kinerja bulanan berhasil diambil",
  "data": {
    "pegawai": {
      "nip": "198801012015011001",
      "nama": "Budi Santoso, S.Kom",
      "jabatan": "Pranata Komputer Ahli Muda",
      "unitKerja": "Bidang Teknologi Informasi dan Komunikasi"
    },
    "periode": {
      "bulan": 11,
      "tahun": 2026,
      "namaBulan": "November 2026"
    },
    "ringkasanBulanan": {
      "totalHariLapor": 18,
      "totalTugasSelesai": 42,
      "totalIntervensi": 58,
      "tugasTepatWaktu": 40,
      "persentaseTepatWaktu": 95.2,
      "rataRataSkorReview": 92.4,
      "rataRataRatingBintang": 4.8
    },
    "kalenderHarian": [
      {
        "tanggal": "2026-11-02",
        "jumlahTugas": 2,
        "selesai": 2,
        "totalIntervensi": 3,
        "statusVerifikasi": "approved"
      },
      {
        "tanggal": "2026-11-03",
        "jumlahTugas": 1,
        "selesai": 1,
        "totalIntervensi": 2,
        "statusVerifikasi": "approved"
      }
    ],
    "daftarTugas": [
      {
        "id": "cm3task001",
        "tanggalKinerja": "2026-11-11",
        "judul": "Pemeliharaan Server Database SIMPEG",
        "jumlahIntervensi": 2,
        "satuan": "kegiatan",
        "status": "selesai",
        "tepatWaktu": true,
        "reviewStatus": "disetujui",
        "skor": 95,
        "rating": 5
      }
    ]
  }
}
```

---

## 4. Penanganan Status HTTP & Format Error

Semua error response dikembalikan dalam format standar:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan deskripsi kesalahan yang mudah dipahami",
    "details": null
  }
}
```

### Tabel Kode Error:
| HTTP Status | Error Code | Skenario |
|---|---|---|
| `400 Bad Request` | `INVALID_QUERY_PARAMS` | Format `date` bukan `YYYY-MM-DD`, `month` di luar rentang 1-12, atau parameter wajib tidak disertakan. |
| `401 Unauthorized` | `MISSING_BEARER_TOKEN` / `INVALID_TOKEN` | Header `Authorization` tidak disertakan, token salah, atau sudah kadaluarsa. |
| `403 Forbidden` | `INSUFFICIENT_SCOPE` / `TOKEN_REVOKED` | Token aktif tetapi tidak memiliki scope `read:kinerja` atau telah dinonaktifkan oleh admin. |
| `404 Not Found` | `PEGAWAI_NOT_FOUND` | Pegawai dengan NIP yang diminta tidak terdaftar dalam sistem. |
| `429 Too Many Requests` | `RATE_LIMIT_EXCEEDED` | Request melebihi batas 120 req/menit per token. |
| `500 Internal Server Error` | `INTERNAL_SERVER_ERROR` | Kesalahan internal server / koneksi database. |

---

## 5. Rencana Tahapan Implementasi (Roadmap)

### Fase 1: Fondasi & Manajemen Token
1. Buat tabel `ApiToken` di Prisma dan migrasikan ke database.
2. Tambahkan UI sederhana di menu **Pengaturan Sistem** (Super Admin) untuk generate, salin, dan revoke Token API.
3. Buat middleware / helper otentikasi API `validateApiToken(request)`.

### Fase 2: Implementasi Endpoint Data Kinerja
1. Buat route handler `src/app/api/v1/external/kinerja/daily/route.ts`.
2. Buat route handler `src/app/api/v1/external/kinerja/monthly/route.ts`.
3. Gunakan query Prisma teroptimasi dengan index yang sudah tersedia (`nip`, `assignedToId`, `tanggalKinerja`, `completedAt`).

### Fase 3: Testing & Dokumentasi Pengembang
1. Buat unit test & integration test untuk kedua endpoint.
2. Sediakan contoh integrasi cURL, JavaScript (Fetch / Axios), dan Python.
3. Publikasikan dokumen spesifikasi ke mitra pengembang instansi terkait.
