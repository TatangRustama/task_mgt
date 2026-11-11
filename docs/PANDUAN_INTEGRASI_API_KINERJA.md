# Panduan Integrasi API Kinerja

API untuk penarikan data kinerja pegawai ASN oleh sistem eksternal (BKD, SIMPEG, TPP).

---

## 1. Base URL & Otentikasi

- **Production:** `https://siapkinerja.dev-ims.net/api/v1/external`
- **Training:** `https://kinerjapb.pondokmatoa.id/api/v1/external`
- **Lokal:** `http://localhost:3000/api/v1/external`

Sertakan Bearer Token pada setiap request:
```http
Authorization: Bearer <API_TOKEN>
Accept: application/json
```

---

## 2. Endpoint

### A. Kinerja Harian
`GET /kinerja/daily`

**Parameter Query:**
| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `nip` | string | Ya | 18 digit NIP pegawai |
| `date` | string | Ya | Format `YYYY-MM-DD` (contoh: `2026-11-11`) |
| `page` | integer | Tidak | Halaman data (default: `1`) |
| `limit` | integer | Tidak | Jumlah tugas per halaman (default: `10`, maks: `100`) |

**Contoh Request:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://siapkinerja.dev-ims.net/api/v1/external/kinerja/daily?nip=199101012021011001&date=2026-11-11&page=1&limit=10"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pegawai": {
      "nip": "199101012021011001",
      "nama": "Budi Santoso, S.Kom",
      "jabatan": "Pranata Komputer Ahli Pertama",
      "unitKerja": "Bidang TI",
      "instansi": "Pemerintah Provinsi"
    },
    "tanggal": "2026-11-11",
    "ringkasan": {
      "totalTugas": 2,
      "selesai": 2,
      "totalIntervensi": 3,
      "statusVerifikasi": "approved",
      "rataRataRating": 5.0
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 2,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "daftarTugas": [
      {
        "id": "cm3task001",
        "judul": "Pemeliharaan Server Database",
        "deskripsi": "Backup harian PostgreSQL",
        "sumber": "mandiri",
        "prioritas": "sedang",
        "jumlahIntervensi": 2,
        "satuan": "kegiatan",
        "status": "disetujui",
        "waktuSelesai": "2026-11-11T14:30:00.000Z",
        "bukti": {
          "alamat": "Ruang Server Lt. 2",
          "catatan": "Pekerjaan selesai.",
          "koordinat": { "lat": -2.5337, "lng": 140.7181 },
          "fotoUrls": ["https://.../api/reports/evidence-image?id=..."]
        },
        "reviewAtasan": {
          "keputusan": "disetujui",
          "skor": 95,
          "catatan": "Tepat waktu",
          "dinilaiOleh": "Hendra Pratama, M.T",
          "dinilaiPada": "2026-11-11T16:30:00.000Z"
        },
        "rating": { "bintang": 5 }
      }
    ]
  }
}
```

---

### B. Kinerja Bulanan
`GET /kinerja/monthly`

**Parameter Query:**
| Parameter | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `nip` | string | Ya | 18 digit NIP pegawai |
| `month` | integer | Ya | Bulan (`1` - `12`) |
| `year` | integer | Ya | Tahun 4 digit (contoh: `2026`) |
| `page` | integer | Tidak | Halaman data tugas (default: `1`) |
| `limit` | integer | Tidak | Jumlah tugas per halaman (default: `50`, maks: `200`) |

**Contoh Request:**
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  "https://siapkinerja.dev-ims.net/api/v1/external/kinerja/monthly?nip=199101012021011001&month=11&year=2026&page=1&limit=50"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "pegawai": {
      "nip": "199101012021011001",
      "nama": "Budi Santoso, S.Kom",
      "jabatan": "Pranata Komputer Ahli Pertama",
      "unitKerja": "Bidang TI",
      "instansi": "Pemerintah Provinsi"
    },
    "periode": {
      "bulan": 11,
      "tahun": 2026,
      "namaBulan": "November 2026"
    },
    "ringkasanBulanan": {
      "totalHariLapor": 20,
      "totalTugas": 45,
      "totalTugasSelesai": 43,
      "totalIntervensi": 62,
      "tugasTepatWaktu": 41,
      "persentaseTepatWaktu": 95.3,
      "rataRataSkorReview": 92.0,
      "rataRataRatingBintang": 4.9
    },
    "kalenderHarian": [
      {
        "tanggal": "2026-11-01",
        "jumlahTugas": 2,
        "selesai": 2,
        "totalIntervensi": 3,
        "statusVerifikasi": "approved"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "totalItems": 45,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "daftarTugas": [
      {
        "id": "cm3task001",
        "tanggalKinerja": "2026-11-11",
        "judul": "Pemeliharaan Server Database",
        "jumlahIntervensi": 2,
        "satuan": "kegiatan",
        "status": "disetujui",
        "tepatWaktu": true,
        "waktuSelesai": "2026-11-11T14:30:00.000Z",
        "reviewStatus": "disetujui",
        "skor": 95,
        "rating": 5
      }
    ]
  }
}
```

---

## 3. Status Error

Format error:
```json
{
  "success": false,
  "error": {
    "code": "KODE_ERROR",
    "message": "Keterangan error"
  }
}
```

| HTTP | Code | Keterangan |
|---|---|---|
| `400` | `MISSING_NIP` / `INVALID_DATE_FORMAT` / `INVALID_MONTH` | Parameter tidak lengkap / salah format |
| `401` | `MISSING_BEARER_TOKEN` | Header Authorization tidak ada |
| `403` | `INVALID_OR_EXPIRED_TOKEN` | Token salah atau sudah dicabut |
| `404` | `PEGAWAI_NOT_FOUND` | NIP tidak terdaftar |
| `500` | `INTERNAL_SERVER_ERROR` | Kesalahan server |

---

## 4. Contoh Integrasi

### JavaScript / Fetch
```javascript
const res = await fetch("https://siapkinerja.dev-ims.net/api/v1/external/kinerja/daily?nip=199101012021011001&date=2026-11-11", {
  headers: { "Authorization": "Bearer <TOKEN>" }
});
const { data } = await res.json();
```

### Python
```python
import requests
res = requests.get(
    "https://siapkinerja.dev-ims.net/api/v1/external/kinerja/daily",
    headers={"Authorization": "Bearer <TOKEN>"},
    params={"nip": "199101012021011001", "date": "2026-11-11"}
)
data = res.json()["data"]
```

### PHP
```php
$ch = curl_init("https://siapkinerja.dev-ims.net/api/v1/external/kinerja/daily?nip=199101012021011001&date=2026-11-11");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer <TOKEN>"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$data = json_decode(curl_exec($ch), true);
```
