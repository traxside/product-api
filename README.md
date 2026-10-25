# Product API

REST API sederhana untuk manajemen data produk e-commerce. Dibangun menggunakan Node.js dan Express.js dengan penyimpanan data di MySQL.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Module System:** ESM (`import/export`)
- **Database:** MySQL
- **MySQL Driver:** mysql2 (promise-based)
- **Env Config:** dotenv
- **API Documentation:** swagger-ui-express

## Prerequisites

Pastikan sudah terinstall di mesin lokal sebelum memulai:

- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [MySQL](https://dev.mysql.com/downloads/) (v5.7 atau lebih baru) — server harus berjalan

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

**6. Jalankan server**
```bash
node src/index.js
```

Server berjalan di: `http://localhost:3000`

**7. Buka Swagger UI**

```
http://localhost:3000/api-docs
```

Swagger UI menyediakan dokumentasi interaktif lengkap. Setiap endpoint dapat langsung diuji menggunakan fitur **"Try it out"**.

> **Catatan:** Data bersifat persisten — perubahan (POST, PUT, DELETE) akan tetap ada setelah server di-restart karena disimpan di database MySQL.

---

## Database Schema

Data produk disimpan dalam dua tabel yang saling berelasi:

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

| Method   | Path                  | Description                     | Status Codes      |
|----------|-----------------------|---------------------------------|-------------------|
| `GET`    | `/api/products`       | Ambil semua produk              | 200               |
| `GET`    | `/api/products/:id`   | Ambil satu produk berdasarkan ID| 200, 404          |
| `POST`   | `/api/products`       | Tambah produk baru              | 201, 400          |
| `PUT`    | `/api/products/:id`   | Update produk berdasarkan ID    | 200, 400, 404     |
| `DELETE` | `/api/products/:id`   | Hapus produk berdasarkan ID     | 200, 404          |

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

**Response — 400 Bad Request:**
```json
{ "error": "Fields 'name', 'price', 'image', 'variants', 'description' are required" }
```

---

### PUT /api/products/:id

Mendukung **partial update** — hanya field yang dikirim yang akan diperbarui. Jika `variants` disertakan, seluruh variants akan diganti dengan yang baru.

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

**Response — 400 Bad Request:**
```json
{ "error": "Request body cannot be empty" }
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

**Response — 404 Not Found:**
```json
{ "error": "Product with id 99 not found" }
```

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

### Struktur Variants

| Field         | Tipe     | Keterangan                              |
|---------------|----------|-----------------------------------------|
| `colorOrSize` | string   | Label ukuran (S, M, L) atau nama warna  |
| `quantity`    | integer  | Jumlah stok untuk variasi ini           |
