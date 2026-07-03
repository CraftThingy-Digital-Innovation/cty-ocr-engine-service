# cty-ocr-engine-service

[Bahasa Indonesia](#bahasa-indonesia) | [English](#english)

---

## Bahasa Indonesia

Layanan backend berkinerja tinggi berbasis **Node.js (Express.js)** untuk pengekstrakan teks dokumen dan analisis layout menggunakan engine kecerdasan buatan **PaddleOCR**. 

Proyek ini menggunakan pustaka isomorphic mandiri **`cty-paddle-ocr`** secara lokal dan membaca berkas model langsung dari folder bersama untuk memproses gambar dan dokumen PDF secara efisien.

### 1. Fitur Utama
*   **Isomorphic Engine**: Menggunakan engine OCR biner yang sama dengan sisi browser client, dioptimalkan untuk performa backend (multi-threaded paralel).
*   **Dukungan Model Fleksibel**: Mendukung penuh model PP-OCRv3 dan PP-OCRv6 (format `.onnx` dan `.ort`).
*   **Pemrosesan PDF Multipage**: Mengonversi dan memproses dokumen PDF halaman-demi-halaman secara asinkron.
*   **Model Manager Terintegrasi**: Mengunduh aset model secara aman dari repositori organisasi GitHub resmi Anda.
*   **Dual Processing Mode**: Pemrosesan sinkron (untuk respons instan) dan asinkron menggunakan antrean SQLite3 (untuk dokumen besar).

---

### 2. Cara Instalasi & Persiapan

#### Langkah A: Kloning & Masuk ke Direktori
```bash
cd D:\CraftThingy\ocr-engine-service
```

#### Langkah B: Instal Dependensi
Pustaka memerlukan bindings native `onnxruntime-node` dan `@techstark/opencv-js` untuk akselerasi CPU:
```bash
npm install
```

#### Langkah C: Konfigurasi Environment (`.env`)
Buat berkas `.env` di folder root proyek untuk mengonfigurasi port dan direktori model:
```env
PORT=3000
MODELS_DIR=../php-ocr-application-test/public/models
UPLOAD_DIR=./uploads
DATABASE_PATH=./jobs.db
```

---

### 3. API Reference (Endpoint Dokumentasi)

#### **`POST /api/ocr/upload`**
Mengunggah dokumen (gambar atau PDF) untuk diproses oleh engine OCR.

*   **Headers**: `Content-Type: multipart/form-data`
*   **Body Parameters**:
    *   `file` (File, Wajib): Berkas gambar (`.jpg`, `.png`) atau dokumen PDF (`.pdf`).
    *   `model` (string, Opsional): Pilihan model yang digunakan:
        *   `v3` (Default): Ringan dan sangat cepat.
        *   `v6` (Atau `v6_ort`): Akurasi tinggi dengan model PP-OCRv6.
    *   `async` (string/boolean, Opsional): Jika `"true"`, pemrosesan akan berjalan secara asinkron di latar belakang dan segera mengembalikan `jobId`.

##### **Respon Sinkron (async = false)**
```json
{
  "success": true,
  "jobId": "f7d79b90-128a-49f2-b883-999321528cb1",
  "status": "completed",
  "results": [
    {
      "page": 1,
      "text": "Teks lengkap halaman 1...",
      "lines": [
        {
          "text": "Baris Teks Pertama",
          "box": { "x": 12, "y": 15, "width": 120, "height": 24 }
        }
      ]
    }
  ],
  "durationMs": 1420
}
```

##### **Respon Asinkron (async = true)**
```json
{
  "success": true,
  "jobId": "f7d79b90-128a-49f2-b883-999321528cb1",
  "status": "pending",
  "message": "Dokumen sedang diproses di latar belakang."
}
```

---

#### **`GET /api/ocr/status/:jobId`**
Mengecek status dan mengambil hasil dari tugas pemrosesan asinkron.

*   **Path Parameter**: `jobId` (string, Wajib)
*   **Respon Sukses**:
```json
{
  "success": true,
  "jobId": "f7d79b90-128a-49f2-b883-999321528cb1",
  "status": "completed",
  "progress": 100,
  "results": [ ... ],
  "error": null
}
```

---

### 4. Integrasi Model Manager (Mengunduh Model Baru)
Jika file model di server hilang atau ingin diperbarui dari repositori GitHub organisasi Anda, Anda dapat menggunakan skrip Node.js interaktif dengan memanfaatkan kelas `ModelManager`:

```javascript
import { ModelManager } from './src/cty-ocr/model-manager.js';

// Mengunduh model PP-OCRv6 dari GitHub LFS organisasi Anda
const destFolder = './public/models';
await ModelManager.downloadModelFromGithub('PP-OCRv6_medium_det.ort', destFolder);
await ModelManager.downloadModelFromGithub('PP-OCRv6_medium_rec.ort', destFolder);
```

---

## English

A high-performance **Node.js (Express.js)** backend service for document text extraction and layout analysis powered by the **PaddleOCR** AI engine.

This project integrates the standalone **`cty-paddle-ocr`** isomorphic library locally, reading model assets directly from a shared directory to process images and PDFs with high server-side throughput.

### 1. Key Features
*   **Isomorphic Engine**: Runs the same binary OCR engine as the web browser clients, optimized with Node.js multi-threaded parallel execution.
*   **Flexible Model Selection**: Supports PP-OCRv3 and PP-OCRv6 models (`.onnx` and `.ort` formats).
*   **Asynchronous Processing**: Handles large PDF files and image queues in the background using SQLite3 status tables.
*   **Built-in Model Manager**: Safely download large network weights directly from your organization's GitHub models repository.

---

### 2. Setup & Installation

#### Step A: Navigate to the Directory
```bash
cd D:\CraftThingy\ocr-engine-service
```

#### Step B: Install Dependencies
```bash
npm install
```

#### Step C: Configure Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
PORT=3000
MODELS_DIR=../php-ocr-application-test/public/models
UPLOAD_DIR=./uploads
DATABASE_PATH=./jobs.db
```

---

### 3. API Reference

#### **`POST /api/ocr/upload`**
Uploads a document image or PDF for OCR layout scanning.

*   **Headers**: `Content-Type: multipart/form-data`
*   **Body Parameters**:
    *   `file` (File, Required): Image (`.jpg`, `.png`) or PDF document (`.pdf`).
    *   `model` (string, Optional): The model preset to load:
        *   `v3` (Default): Lightweight and highly optimized.
        *   `v6` (or `v6_ort`): High-accuracy PP-OCRv6 model.
    *   `async` (string/boolean, Optional): If `"true"`, processes in the background and returns a `jobId` immediately.

##### **Response (Synchronous)**
```json
{
  "success": true,
  "jobId": "f7d79b90-128a-49f2-b883-999321528cb1",
  "status": "completed",
  "results": [
    {
      "page": 1,
      "text": "Extracted text content...",
      "lines": [
        {
          "text": "Line text",
          "box": { "x": 12, "y": 15, "width": 120, "height": 24 }
        }
      ]
    }
  ],
  "durationMs": 1420
}
```

---

#### **`GET /api/ocr/status/:jobId`**
Queries the execution status and retrieves results of an asynchronous task.

*   **Path Parameter**: `jobId` (string, Required)
*   **Response**:
```json
{
  "success": true,
  "jobId": "f7d79b90-128a-49f2-b883-999321528cb1",
  "status": "completed",
  "progress": 100,
  "results": [ ... ],
  "error": null
}
```

---

## Origins & Credits
This project is developed by **CraftThingy Digital Innovation (Alif Nurhidayat)**. It is built on top of:
1.  **Baidu PaddleOCR** for world-class text detection and recognition models.
2.  **PT Perkasa Pilar Utama** for initial ONNX conversions.
3.  **Microsoft ONNX Runtime Node** for high-speed server-side model execution.
