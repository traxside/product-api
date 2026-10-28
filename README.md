# Product API

REST API sederhana untuk manajemen data produk e-commerce. Dibangun menggunakan Node.js dan Express.js dengan penyimpanan data di MySQL.

## Tech Stack

- **Runtime:** Node.js (v18 atau lebih baru)
- **Framework:** Express.js 5
- **Module System:** ESM (`import/export`)
- **Database:** MySQL
- **MySQL Driver:** mysql2 (promise-based, connection pool)
- **Env Config:** dotenv
- **API Documentation:** swagger-ui-express
- **Testing:** Node.js built-in test runner (`node --test`)
- **Linting / Formatting:** ESLint + `.editorconfig`

## Prerequisites

Pastikan sudah terinstall di mesin lokal sebelum memulai:

- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [MySQL](https://dev.mysql.com/downloads/) (v5.7 atau lebih baru) — server harus berjalan

## Arsitektur Singkat

```
Client (Postman / browser)
        |
        v
Express app (src/app.js)
        |
        v
Product routes (src/routes/products.js)
        |
        v
Product repository (src/productRepository.js)
        |
        v
Connection Pool (src/db.js — mysql2/promise)
        |
        v
MySQL Database
  ├── products
  └── variants
```

- `src/index.js` hanya bertugas menjalankan server dan graceful shutdown.
- `src/app.js` menyiapkan middleware, Swagger UI, routes, dan JSON error handler.
- Route handler bersifat `async`; validasi berada di `src/productValidator.js`, akses SQL di `src/productRepository.js`.
- Data produk dan variants dibaca menggunakan `LEFT JOIN`, lalu diubah menjadi bentuk nested oleh helper `groupProducts()`.
- Operasi POST dan PUT menggunakan transaksi. Jika `variants` dikirim saat PUT, seluruh variants lama diganti dengan yang baru.
- Variants di-insert secara batch dalam satu query.
- DELETE produk memanfaatkan `ON DELETE CASCADE`, sehingga variants ikut terhapus otomatis.
- `src/config.js` memuat `.env` dan memvalidasi environment variables sebelum pool dibuat.

## Struktur Project

```
product-api/
├── src/
│   ├── index.js              # Entry point — server listen + graceful shutdown
│   ├── app.js                # Express app, Swagger, routes, error handlers
│   ├── config.js             # dotenv loader + environment validation
│   ├── db.js                 # MySQL connection pool (mysql2/promise)
│   ├── productRepository.js  # SQL queries, transactions, grouping
│   ├── productValidator.js   # Validasi field dan ID
│   └── routes/
│       └── products.js       # Handler untuk 5 endpoint product
├── test/
│   └── api.test.js           # Integration test (Node test runner)
├── seed.js                   # Membuat tabel dan mengisi data demo — jalankan sekali
├── swagger.js                # Definisi Swagger spec (ESM, manual)
├── eslint.config.js          # Konfigurasi ESLint
├── .editorconfig             # Konfigurasi format editor
├── package.json              # Metadata project, dependencies, "type": "module"
├── .env                      # Kredensial database (git-ignored)
├── .env.example              # Template .env — aman untuk di-commit
├── README.md                 # Dokumentasi project
└── .kiro/
    └── specs/
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## Getting Started

Ikuti langkah-langkah berikut untuk menjalankan project dari awal:

**1. Clone repository**
```bash
git clone <repository-url>
cd product-api
```

**2. Install dependencies**
```bash
npm install
```

**3. Buat database MySQL**

Login ke MySQL dan jalankan perintah berikut:
```sql
CREATE DATABASE product_db;
```

**4. Konfigurasi environment variables**

Salin file template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Lalu buka `.env` dan isi dengan kredensial MySQL kamu:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=product_db
```

`PORT` bersifat opsional dan hanya dipakai oleh server (bukan oleh seed script):
```
PORT=3000
```

> `.env` berisi kredensial dan sudah masuk `.gitignore`. Jangan commit file ini.

**5. Jalankan seed script** (hanya perlu dilakukan sekali)

Script ini akan membuat tabel `products` dan `variants`, lalu mengisi 2 produk demo:
```bash
node seed.js
```

Output yang diharapkan:
```
Creating tables...
✓ products table ready
✓ variants table ready
Inserting demo data...
✓ Product 1 inserted (id: 1)
✓ Product 2 inserted (id: 2)

Seeding complete! You can now start the server with: node src/index.js
```

> ID yang dihasilkan mengikuti `AUTO_INCREMENT`, jadi bisa berbeda jika tabel sudah pernah berisi data. Seed script tidak menghapus data yang ada: jika tabel `products` sudah berisi data, proses insert demo dilewati dengan pesan `Demo data already exists — skipping insert.`

**6. Jalankan server**
```bash
node src/index.js
```

Atau menggunakan script npm:
```bash
npm start
# atau
npm run dev
```

Server berjalan di: `http://localhost:3000`

**7. Buka Swagger UI**

```
http://localhost:3000/api-docs
```

Swagger UI menyediakan dokumentasi interaktif lengkap. Setiap endpoint dapat langsung diuji menggunakan fitur **"Try it out"**.

> **Catatan:** Data bersifat persisten — perubahan (POST, PUT, DELETE) akan tetap ada setelah server di-restart karena disimpan di database MySQL.

### Menjalankan Test

Test integrasi menggunakan Node.js test runner dan database sementara:

```bash
npm test
```

Test akan:
1. Membuat database sementara `product_api_test_<pid>`.
2. Menjalankan `seed.js` pada database tersebut.
3. Menjalankan server pada port acak.
4. Menguji endpoint CRUD, validasi, error handling, cascade delete, dan Swagger UI.
5. Menghapus database sementara setelah selesai.

User MySQL pada `.env` harus memiliki izin `CREATE DATABASE` dan `DROP DATABASE`.

### Linting

```bash
npm run lint
```

Script ini menjalankan ESLint untuk semua file JavaScript. Format dasar editor diatur di `.editorconfig`.

### Scripts

| Command         | Fungsi                                      |
|-----------------|---------------------------------------------|
| `npm start`     | Menjalankan server                          |
| `npm run dev`   | Menjalankan server (sama seperti `start`)   |
| `npm test`      | Menjalankan integration test                |
| `npm run lint`  | Menjalankan ESLint                          |
| `node seed.js`  | Membuat tabel dan data demo                 |

---

## Database Schema

Data produk disimpan dalam dua tabel yang saling berelasi.

### Tabel `products`

| Kolom         | Tipe             | Keterangan                        |
|---------------|------------------|-----------------------------------|
| `id`          | INT (PK, AUTO)   | ID unik produk                    |
| `name`        | VARCHAR(255)     | Nama produk                       |
| `price`       | DECIMAL(15, 2)   | Harga produk dalam IDR            |
| `image`       | VARCHAR(500)     | URL gambar produk                 |
| `description` | TEXT             | Deskripsi singkat produk          |

### Tabel `variants`

| Kolom         | Tipe             | Keterangan                                    |
|---------------|------------------|-----------------------------------------------|
| `id`          | INT (PK, AUTO)   | ID unik variant                               |
| `product_id`  | INT (FK)         | Referensi ke `products(id)` — CASCADE DELETE  |
| `colorOrSize` | VARCHAR(100)     | Label ukuran (S, M, L) atau nama warna        |
| `quantity`    | INT              | Jumlah stok untuk variasi ini                 |

Relasi: satu produk memiliki banyak variants (one-to-many). Menghapus produk akan otomatis menghapus semua variants-nya.

---

## API Endpoints

| Method   | Path                  | Description                     | Status Codes              |
|----------|-----------------------|---------------------------------|---------------------------|
| `GET`    | `/api/products`       | Ambil semua produk              | 200, 500                  |
| `GET`    | `/api/products/:id`   | Ambil satu produk berdasarkan ID| 200, 400, 404, 500        |
| `POST`   | `/api/products`       | Tambah produk baru              | 201, 400, 413, 500        |
| `PUT`    | `/api/products/:id`   | Update produk berdasarkan ID    | 200, 400, 404, 413, 500   |
| `DELETE` | `/api/products/:id`   | Hapus produk berdasarkan ID     | 200, 400, 404, 500        |

`GET /api/products` mengembalikan array kosong (`[]`) jika belum ada produk. Endpoint ini selalu mengembalikan seluruh produk; pagination belum termasuk dalam scope spesifikasi.

### Aturan Validasi

- `name` — string non-empty, maksimal 255 karakter.
- `price` — number, nilai finite, `>= 0`, dan maksimal `9999999999999.99`.
- `image` — URL valid dengan protokol `http` atau `https`, maksimal 500 karakter.
- `variants` — array; setiap item harus memiliki `colorOrSize` (string non-empty, maksimal 100 karakter) dan `quantity` (integer `>= 0`, maksimal `2147483647`). Array kosong diperbolehkan.
- `description` — string non-empty, maksimal 65535 byte.

`id` pada path harus berupa bilangan bulat positif. Nilai seperti `abc`, `0`, atau `-1` menghasilkan `400 Bad Request`.

---

## Contoh Request & Response

### GET /api/products

**Request:**
```
GET http://localhost:3000/api/products
```

**Response — 200 OK:**
```json
[
  {
    "id": 1,
    "name": "Nama Product",
    "price": 150000,
    "image": "https://placehold.co/600x400/png",
    "variants": [
      { "colorOrSize": "S", "quantity": 10 },
      { "colorOrSize": "M", "quantity": 10 },
      { "colorOrSize": "L", "quantity": 10 }
    ],
    "description": "Deskripsi singkat product..."
  },
  {
    "id": 2,
    "name": "Nama Product 2",
    "price": 250000,
    "image": "https://placehold.co/600x400/png",
    "variants": [
      { "colorOrSize": "XL", "quantity": 5 },
      { "colorOrSize": "XXL", "quantity": 3 }
    ],
    "description": "Deskripsi singkat product 2..."
  }
]
```

Produk diurutkan berdasarkan `p.id`, dan variants berdasarkan `v.id`.

---

### GET /api/products/:id

**Request:**
```
GET http://localhost:3000/api/products/1
```

**Response — 200 OK:**
```json
{
  "id": 1,
  "name": "Nama Product",
  "price": 150000,
  "image": "https://placehold.co/600x400/png",
  "variants": [
    { "colorOrSize": "S", "quantity": 10 },
    { "colorOrSize": "M", "quantity": 10 },
    { "colorOrSize": "L", "quantity": 10 }
  ],
  "description": "Deskripsi singkat product..."
}
```

**Response — 400 Bad Request (ID tidak valid):**
```json
{ "error": "Product id must be a positive integer" }
```

**Response — 404 Not Found:**
```json
{ "error": "Product with id 99 not found" }
```

---

### POST /api/products

**Request:**
```
POST http://localhost:3000/api/products
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Product Baru",
  "price": 200000,
  "image": "https://placehold.co/600x400/png",
  "variants": [
    { "colorOrSize": "M", "quantity": 5 }
  ],
  "description": "Deskripsi product baru..."
}
```

**Response — 201 Created:**
```json
{
  "id": 3,
  "name": "Product Baru",
  "price": 200000,
  "image": "https://placehold.co/600x400/png",
  "variants": [
    { "colorOrSize": "M", "quantity": 5 }
  ],
  "description": "Deskripsi product baru..."
}
```

**Response — 400 Bad Request (field wajib tidak lengkap):**
```json
{ "error": "Fields 'name', 'price', 'image', 'variants', 'description' are required" }
```

**Response — 400 Bad Request (nilai field tidak valid):**
```json
{ "error": "Field 'price' must be a non-negative number" }
```

**Response — 400 Bad Request (body bukan JSON object):**
```json
{ "error": "Request body must be a JSON object" }
```

---

### PUT /api/products/:id

Mendukung **partial update** — hanya field yang dikirim yang akan diperbarui. Field yang dapat di-update: `name`, `price`, `image`, `description`, dan `variants`. Jika `variants` disertakan, seluruh variants lama akan diganti dengan yang baru (termasuk jika dikirim sebagai array kosong).

**Request:**
```
PUT http://localhost:3000/api/products/1
Content-Type: application/json
```

**Request Body:**
```json
{
  "price": 175000,
  "description": "Deskripsi yang sudah diperbarui."
}
```

**Response — 200 OK:**
```json
{
  "id": 1,
  "name": "Nama Product",
  "price": 175000,
  "image": "https://placehold.co/600x400/png",
  "variants": [
    { "colorOrSize": "S", "quantity": 10 },
    { "colorOrSize": "M", "quantity": 10 },
    { "colorOrSize": "L", "quantity": 10 }
  ],
  "description": "Deskripsi yang sudah diperbarui."
}
```

**Response — 400 Bad Request (body kosong):**
```json
{ "error": "Request body cannot be empty" }
```

**Response — 400 Bad Request (field tidak didukung):**
```json
{ "error": "Unsupported field(s): stock" }
```

**Response — 400 Bad Request (ID tidak valid):**
```json
{ "error": "Product id must be a positive integer" }
```

**Response — 404 Not Found:**
```json
{ "error": "Product with id 99 not found" }
```

---

### DELETE /api/products/:id

**Request:**
```
DELETE http://localhost:3000/api/products/1
```

**Response — 200 OK:**
```json
{ "message": "Product with id 1 has been deleted" }
```

**Response — 400 Bad Request (ID tidak valid):**
```json
{ "error": "Product id must be a positive integer" }
```

**Response — 404 Not Found:**
```json
{ "error": "Product with id 99 not found" }
```

---

## Penanganan Error

Semua error dikembalikan dalam format JSON.

| Kondisi                                  | Status | Response Body                                                  |
|------------------------------------------|--------|----------------------------------------------------------------|
| Produk tidak ditemukan                   | 404    | `{ "error": "Product with id X not found" }`                   |
| ID path tidak valid                      | 400    | `{ "error": "Product id must be a positive integer" }`         |
| Field wajib tidak lengkap (POST)         | 400    | `{ "error": "Fields 'name', 'price', ... are required" }`      |
| Nilai field tidak valid                  | 400    | `{ "error": "Field '<nama>' must be ..." }`                    |
| Field tidak didukung (PUT)               | 400    | `{ "error": "Unsupported field(s): ..." }`                     |
| Body kosong (PUT)                        | 400    | `{ "error": "Request body cannot be empty" }`                  |
| JSON malformed                           | 400    | `{ "error": "Invalid JSON in request body" }`                  |
| Body terlalu besar                       | 413    | `{ "error": "Request body is too large" }`                     |
| Route tidak dikenal                      | 404    | `{ "error": "Route <METHOD> <PATH> not found" }`               |
| Error database / tak terduga             | 500    | `{ "error": "Internal server error" }`                         |

---

## Struktur Data Produk

| Field         | Tipe     | Keterangan                                         |
|---------------|----------|----------------------------------------------------|
| `id`          | integer  | ID unik produk, di-assign otomatis oleh MySQL      |
| `name`        | string   | Nama produk                                        |
| `price`       | number   | Harga produk dalam IDR                             |
| `image`       | string   | URL gambar produk                                  |
| `variants`    | array    | Daftar variasi produk (warna/ukuran & stok)        |
| `description` | string   | Deskripsi singkat produk                           |

> `price` disimpan sebagai `DECIMAL` di MySQL dan dikembalikan sebagai `number` pada response JSON.

### Struktur Variants

| Field         | Tipe     | Keterangan                              |
|---------------|----------|-----------------------------------------|
| `colorOrSize` | string   | Label ukuran (S, M, L) atau nama warna  |
| `quantity`    | integer  | Jumlah stok untuk variasi ini           |
