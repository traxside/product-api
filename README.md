# Product API

REST API sederhana untuk manajemen data produk e-commerce. Dibangun menggunakan Node.js dan Express.js dengan penyimpanan data secara in-memory.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Module System:** ESM (`import/export`)
- **API Documentation:** swagger-ui-express
- **Data Storage:** In-memory JavaScript array (tidak menggunakan database)

## Cara Menjalankan

1. Install dependencies:
   ```bash
   npm install
   ```

2. Jalankan server:
   ```bash
   node index.js
   ```

3. Server berjalan di: `http://localhost:3000`

> **Catatan:** Data bersifat in-memory — seluruh perubahan (POST, PUT, DELETE) akan hilang saat server di-restart.

## Dokumentasi Interaktif (Swagger UI)

Buka browser dan akses:
```
http://localhost:3000/api-docs
```

Swagger UI menyediakan dokumentasi interaktif lengkap. Setiap endpoint dapat langsung diuji dari halaman ini menggunakan fitur **"Try it out"**.

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

Mengambil seluruh daftar produk.

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

Mengambil satu produk berdasarkan ID.

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

Membuat produk baru. ID di-assign otomatis oleh server.

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

Memperbarui produk yang sudah ada. Mendukung **partial update** — hanya field yang dikirim yang akan diperbarui, field lain tetap tidak berubah.

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

Menghapus produk berdasarkan ID.

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
| `id`          | integer  | ID unik produk, di-assign otomatis oleh server     |
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
