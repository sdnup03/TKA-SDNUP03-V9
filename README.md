# 📚 Exam Room - Blueprint Dokumentasi Lengkap

> **Penjelasan Sederhana**: Aplikasi ini seperti "ruang ujian digital" yang bisa digunakan di komputer atau HP. Guru bisa membuat soal ujian, siswa bisa mengerjakan, dan aplikasi akan otomatis menghitung nilai. Semuanya tersimpan di Google Sheets seperti buku catatan digital.

---

## 🎯 Apa Itu Aplikasi Ini?

Bayangkan aplikasi ini seperti **buku ujian digital** yang bisa digunakan di mana saja:

- **Guru** = Orang yang membuat soal ujian (seperti guru di kelas)
- **Siswa** = Orang yang mengerjakan ujian (seperti murid di kelas)
- **Google Sheets** = Buku catatan digital tempat semua data disimpan
- **Aplikasi** = Kotak ajaib yang menghubungkan guru, siswa, dan buku catatan

### Contoh Sederhana:
```
Guru membuat soal → Simpan di Google Sheets → Siswa buka aplikasi → 
Masukkan token (seperti kunci pintu) → Kerjakan soal → Submit → 
Nilai otomatis muncul!
```

---

## 🏗️ Bagaimana Aplikasi Ini Bekerja? (Seperti Cerita)

### Cerita 1: Guru Membuat Ujian
1. **Guru login** → Masuk ke "ruang guru"
2. **Buat ujian baru** → Isi judul, tanggal, waktu, kelas
3. **Tambah soal** → Bisa pilihan ganda, isian, uraian, benar-salah, menjodohkan
5. **Simpan** → Data tersimpan di Google Sheets
6. **Buka ujian** → Siswa bisa mulai mengerjakan

### Cerita 2: Siswa Mengerjakan Ujian
1. **Siswa login** → Masuk ke "ruang siswa"
2. **Lihat jadwal** → Ada kalender dan daftar ujian
3. **Masukkan token** → Seperti kunci untuk masuk ke ujian
4. **Kerjakan soal** → Aplikasi akan:
   - Memaksa fullscreen (tidak bisa buka aplikasi lain)
   - Deteksi jika keluar dari ujian
   - Hitung waktu tersisa
5. **Submit** → Jawaban tersimpan, nilai otomatis dihitung

### Cerita 3: Guru Memantau
1. **Guru buka Live Monitor** → Lihat siapa yang sedang mengerjakan
2. **Lihat progress** → Berapa soal yang sudah dikerjakan
3. **Lihat hasil** → Setelah ujian selesai, lihat nilai semua siswa

---

## 📦 Bagian-Bagian Aplikasi (Seperti Puzzle)

Aplikasi ini terdiri dari beberapa bagian yang bekerja sama:

### 1. **Frontend** (Yang Terlihat)
- **React** = Framework untuk membuat tampilan (seperti kotak mainan)
- **TypeScript** = Bahasa pemrograman yang lebih aman
- **Vite** = Alat untuk membangun aplikasi dengan cepat
- **Tailwind CSS** = Alat untuk membuat tampilan cantik

**Lokasi**: Semua file di folder `components/`, `context/`, `lib/`

### 2. **Backend** (Yang Tidak Terlihat)
- **Google Apps Script** = Server yang memproses semua permintaan
- **Google Sheets** = Database tempat semua data disimpan

**Lokasi**: File `backend/Code.js`

### 3. **Database** (Tempat Menyimpan Data)
Google Sheets memiliki beberapa "lembar" (sheet):
- **Exams** = Daftar semua ujian
- **Attempts** = Jawaban siswa dan nilai
- **LiveProgress** = Progress siswa yang sedang mengerjakan
- **Users** = Data guru/admin
- **Students** = Data siswa
- **Config** = Konfigurasi aplikasi (nama aplikasi, nama sekolah)

---

## 🎨 Tampilan Aplikasi (UI Components)

### Untuk Siswa:
1. **LoginPage** = Halaman masuk
2. **StudentDashboard** = Halaman utama siswa
   - **Timetable** = Daftar ujian (seperti jadwal pelajaran)
   - **ExamCalendar** = Kalender ujian (bisa klik tanggal untuk detail)
3. **ExamRoom** = Ruang ujian (tempat mengerjakan soal)

### Untuk Guru:
1. **LoginPage** = Halaman masuk (sama dengan siswa)
2. **TeacherDashboard** = Halaman utama guru
   - **ExamForm** = Form untuk membuat/edit ujian
   - **QuestionManager** = Pengelola soal
   - **LiveMonitor** = Monitor real-time siswa yang sedang ujian
   - **ExamResults** = Hasil ujian dan nilai

### Komponen Umum:
- **Header** = Bagian atas (logo, nama aplikasi, tombol logout)
- **Footer** = Bagian bawah (copyright)
- **ErrorBoundary** = Penangkap error (jika ada masalah)
- **InstallPrompt** = Prompt untuk install PWA

---

## 🔧 Teknologi yang Digunakan

### Frontend Stack:
```
React 19          → Framework utama (seperti pondasi rumah)
TypeScript        → Bahasa pemrograman (lebih aman dari JavaScript)
Vite              → Build tool (alat untuk membangun aplikasi)
Tailwind CSS      → Styling (membuat tampilan cantik)
Lucide React      → Icons (gambar-gambar kecil)
```

### Backend Stack:
```
Google Apps Script → Server (memproses semua permintaan)
Google Sheets      → Database (tempat menyimpan data)
Google Drive       → Storage (tempat menyimpan gambar soal)
```

### Testing:
```
Vitest             → Testing framework
React Testing Library → Alat untuk test komponen React
```

---

## 📁 Struktur Folder (Seperti Organizer)

```
examroomgoogle/
│
├── 📂 backend/
│   └── Code.js              → Kode backend (Google Apps Script)
│
├── 📂 components/           → Semua komponen UI
│   ├── 📂 auth/            → Halaman login
│   ├── 📂 student/         → Komponen untuk siswa
│   │   ├── StudentDashboard.tsx  → Dashboard siswa
│   │   ├── ExamRoom.tsx          → Ruang ujian
│   │   ├── ExamCalendar.tsx      → Kalender ujian
│   │   └── Timetable.tsx         → Jadwal ujian
│   ├── 📂 teacher/         → Komponen untuk guru
│   │   ├── TeacherDashboard.tsx → Dashboard guru
│   │   ├── ExamForm.tsx         → Form ujian
│   │   ├── QuestionManager.tsx  → Pengelola soal
│   │   ├── LiveMonitor.tsx      → Monitor real-time
│   │   └── ExamResults.tsx      → Hasil ujian
│   ├── 📂 ui/              → Komponen UI yang bisa dipakai ulang
│   │   ├── brutalist.tsx        → Button, Card, Input, dll
│   │   └── RichTextEditor.tsx   → Editor teks kaya
│   ├── 📂 layout/          → Layout komponen
│   │   └── Header.tsx          → Header aplikasi
│   ├── 📂 common/          → Komponen umum
│   │   ├── Clock.tsx           → Jam
│   │   └── NoiseIndicator.tsx  → Indikator kebisingan
│   ├── 📂 pwa/             → Komponen PWA
│   │   └── InstallPrompt.tsx   → Prompt install
│   └── ErrorBoundary.tsx   → Penangkap error
│
├── 📂 context/
│   └── AppContext.tsx      → State management (tempat menyimpan data global)
│
├── 📂 lib/                 → Library/utility functions
│   ├── api.ts              → API client (cara berkomunikasi dengan backend)
│   ├── cache.ts            → Sistem cache (menyimpan data sementara)
│   ├── logger.ts           → Sistem logging (mencatat aktivitas)
│   └── polling.ts          → Smart polling (update data otomatis)
│
├── 📂 test/                → File-file test
│   ├── setup.ts            → Setup untuk testing
│   └── 📂 utils/
│       └── scoreCalculator.test.ts → Test untuk kalkulasi nilai
│
├── 📂 public/              → File-file statis
│   ├── manifest.json       → Konfigurasi PWA
│   ├── sw.js               → Service worker (untuk offline)
│   ├── icon-192.png        → Icon PWA 192x192
│   └── icon-512.png        → Icon PWA 512x512
│
├── 📂 scripts/             → Script-script helper
│   └── resize-icon.py      → Script untuk resize icon
│
├── App.tsx                 → Komponen utama aplikasi
├── index.tsx               → Entry point aplikasi
├── index.html              → HTML utama
├── types.ts                → TypeScript type definitions
├── constants.ts            → Konstanta (nilai yang tidak berubah)
├── vite.config.ts          → Konfigurasi Vite
├── vitest.config.ts        → Konfigurasi Vitest
├── tsconfig.json           → Konfigurasi TypeScript
├── package.json            → Daftar dependencies
└── README.md               → File ini!
```

---

## 🚀 Cara Setup (Step-by-Step)

### Prasyarat (Yang Harus Ada Dulu)

1. **Node.js 18+** 
   - Download dari [nodejs.org](https://nodejs.org/)
   - Install seperti aplikasi biasa
   - Cek dengan: `node --version` di terminal

2. **Google Account**
   - Punya akun Google (untuk Google Sheets & Apps Script)

3. **Text Editor**
   - VS Code (disarankan) atau editor lain

### Langkah 1: Download & Install

```bash
# 1. Clone atau download project ini
# 2. Buka terminal di folder project
cd examroomgoogle

# 3. Install semua dependencies (seperti download semua bahan)
npm install
```

**Penjelasan**: `npm install` akan mengunduh semua "bahan" yang dibutuhkan aplikasi (seperti React, TypeScript, dll) ke folder `node_modules/`.

### Langkah 2: Setup Backend (Google Apps Script)

**Ini seperti membuat "server" di Google:**

1. **Buka Google Apps Script**
   - Pergi ke [script.google.com](https://script.google.com/)
   - Klik "New Project"

2. **Copy Kode Backend**
   - Buka file `backend/Code.js` di project ini
   - Copy semua isinya
   - Paste ke editor Google Apps Script

3. **Buat Google Sheets**
   - Buat Google Sheets baru
   - Beri nama (misalnya: "Exam Room Database")
   - **PENTING**: Copy ID dari URL Sheets
     - URL: `https://docs.google.com/spreadsheets/d/ID_INI/d/edit`
     - ID adalah bagian di antara `/d/` dan `/edit`

4. **Link Sheets ke Apps Script**
   - Di Apps Script, klik nama project (kiri atas)
   - Pilih "Project Settings"
   - Scroll ke "Google Cloud Platform (GCP) Project"
   - Klik "Change project"
   - Pilih project yang sama dengan Sheets

5. **Deploy sebagai Web App**
   - Klik "Deploy" > "New deployment"
   - Pilih type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone" (atau sesuai kebutuhan)
   - Klik "Deploy"
   - **COPY URL yang muncul** (penting!)

### Langkah 3: Setup Frontend

1. **Edit API URL**
   - Buka file `lib/api.ts`
   - Cari baris: `export const GAS_API_URL = '...'`
   - Ganti dengan URL dari Langkah 2.5

```typescript
export const GAS_API_URL = 'https://script.google.com/macros/s/YOUR_URL_HERE/exec';
```

2. **Jalankan Development Server**

```bash
npm run dev
```

3. **Buka Browser**
   - Buka `http://localhost:5173` (atau port yang ditampilkan)
   - Aplikasi akan muncul!

### Langkah 4: Setup Database (Google Sheets)

**Apps Script akan otomatis membuat sheet-sheet yang dibutuhkan saat pertama kali dijalankan:**

- **Exams** = Daftar ujian
- **Attempts** = Jawaban siswa
- **LiveProgress** = Progress real-time
- **Users** = Data guru (default: admin/admin123)
- **Students** = Data siswa (default: siswa1/siswa123)
- **Config** = Konfigurasi aplikasi

**Atau buat manual:**
1. Buka Google Sheets yang sudah dibuat
2. Buat sheet baru dengan nama: `Exams`, `Attempts`, `LiveProgress`, `Users`, `Students`, `Config`
3. Apps Script akan otomatis mengisi header kolom

---

## 🎮 Cara Menggunakan Aplikasi

### Untuk Guru:

#### 1. Login
- Username: `admin`
- Password: `admin123`
- Klik "Gas Masuk"

#### 2. Buat Ujian Baru
- Klik tombol "Buat Ujian Baru"
- Isi form:
  - **Judul**: Nama ujian (contoh: "Ujian IPA Kelas 8")
  - **Kelas**: Pilih kelas target (bisa lebih dari satu)
  - **Tanggal**: Kapan ujian dilaksanakan
  - **Waktu**: Jam mulai dan selesai
  - **Durasi**: Berapa menit (otomatis dari waktu)
  - **Token**: Kode rahasia untuk masuk ujian (contoh: "UJIAN123")
- Klik "Simpan"

#### 3. Tambah Soal
- Klik ikon "Soal" di ujian yang sudah dibuat
- Klik "Tambah Soal"
- Pilih jenis soal:
  - **Pilihan Ganda**: Pilih A, B, C, D
  - **Isian Singkat**: Isi jawaban pendek
  - **Uraian**: Jawaban panjang (tidak auto-grade)
  - **Benar/Salah**: Pilih Benar atau Salah
  - **Menjodohkan**: Pasangkan kiri-kanan
- Isi soal, opsi (jika ada), dan jawaban benar
- Klik "Simpan"

#### 4. Buka Ujian
- Setelah soal selesai, klik tombol "Buka" di ujian
- Status berubah menjadi "DIBUKA"
- Siswa sekarang bisa masuk dengan token

#### 5. Monitor Siswa
- Klik ikon "Live" di ujian yang sedang berlangsung
- Lihat siapa yang sedang mengerjakan
- Lihat progress (berapa soal sudah dikerjakan)
- Lihat pelanggaran (jika ada)

#### 6. Lihat Hasil
- Setelah ujian selesai, klik "Tutup" ujian
- Klik ikon "Hasil" untuk melihat nilai semua siswa
- Bisa edit nilai manual jika perlu
- Klik "Publish" untuk membuat hasil terlihat oleh siswa

### Untuk Siswa:

#### 1. Login
- Username: `siswa1` (atau username yang diberikan guru)
- Password: `siswa123` (atau password yang diberikan)
- Klik "Gas Masuk"

#### 2. Lihat Jadwal
- Di dashboard, ada 2 tab:
  - **Jadwal Kelas**: Daftar ujian (seperti jadwal pelajaran)
  - **Kalender**: Kalender ujian (bisa klik tanggal untuk detail)

#### 3. Masuk Ujian
- Masukkan **token** yang diberikan guru
- Klik "Masuk Ujian"
- Aplikasi akan:
  - Masuk ke mode fullscreen
  - Mulai hitung waktu
  - Lock aplikasi (tidak bisa buka aplikasi lain)

#### 4. Mengerjakan Soal
- Klik nomor soal untuk pindah
- Isi jawaban
- Klik "Tandai untuk Review" jika ingin kembali lagi
- Lihat navigasi di kiri untuk melihat semua soal

#### 5. Submit
- Setelah selesai, klik "Submit Ujian"
- Konfirmasi submit
- Nilai akan muncul otomatis (jika sudah di-publish guru)

---

## 🔐 Fitur Keamanan (Anti-Cheat)

Aplikasi ini punya beberapa "penjaga" untuk mencegah curang:

### 1. **Fullscreen Lock**
- Saat ujian dimulai, aplikasi memaksa fullscreen
- Tidak bisa minimize atau resize window
- Seperti "mengunci" layar

### 2. **Blur Detection**
- Jika siswa keluar dari aplikasi (Alt+Tab, buka aplikasi lain)
- Layar akan blur (buram)
- Muncul peringatan
- Hitung pelanggaran

### 3. **Violation Tracking**
- Setiap pelanggaran dicatat
- Maksimal 3 pelanggaran
- Setelah 3x, ujian bisa di-submit otomatis atau diberi penalti

### 4. **Password Hashing**
- Password tidak disimpan langsung
- Di-hash dengan SHA-256 (seperti dienkripsi)
- Lebih aman jika database bocor

### 5. **Input Validation**
- Semua input dicek dan dibersihkan
- Mencegah serangan XSS dan injection

---

## 📊 Alur Data (Data Flow)

### Contoh: Siswa Submit Jawaban

```
1. Siswa klik "Submit"
   ↓
2. Frontend (ExamRoom.tsx)
   - Validasi jawaban
   - Hitung violation count
   ↓
3. AppContext.tsx
   - Panggil submitExam()
   ↓
4. lib/api.ts
   - POST ke Google Apps Script
   - Action: "SUBMIT_ATTEMPT"
   ↓
5. Backend (Code.js)
   - Terima data
   - Validasi input
   - Simpan ke Google Sheets (sheet "Attempts")
   - Hitung nilai otomatis
   ↓
6. Response kembali ke Frontend
   ↓
7. AppContext.tsx
   - Update state
   - Refresh data
   ↓
8. UI Update
   - Tampilkan konfirmasi
   - Tampilkan nilai (jika sudah di-publish)
```

### Contoh: Guru Lihat Live Monitor

```
1. Guru buka Live Monitor
   ↓
2. AppContext.tsx
   - Start polling (update otomatis setiap beberapa detik)
   ↓
3. Smart Polling (lib/polling.ts)
   - Request ke backend setiap 2-5 detik
   - Exponential backoff jika error
   ↓
4. Backend (Code.js)
   - Baca dari sheet "LiveProgress"
   - Return data
   ↓
5. Frontend Update
   - Tampilkan progress siswa real-time
```

---

## 🎨 Design System (Neobrutalism)

Aplikasi ini menggunakan design style "Neobrutalism":

### Ciri-ciri:
- **Bold borders** = Garis tebal hitam di semua elemen
- **Sharp shadows** = Bayangan tajam (seperti dipotong)
- **Bright colors** = Warna cerah dan kontras
- **Bold typography** = Font tebal dan jelas
- **No rounded corners** = Sudut tajam (kecuali untuk beberapa elemen)

### Warna Utama:
- **Primary**: `#4F46E5` (Biru ungu)
- **Secondary**: `#FFD43B` (Kuning)
- **Danger**: `#FF6B6B` (Merah)
- **Success**: `#51CF66` (Hijau)
- **Background**: `#FDFDF7` (Krem putih)

### Komponen UI:
Semua komponen ada di `components/ui/brutalist.tsx`:
- `Button` = Tombol dengan shadow tebal
- `Card` = Kotak dengan border dan shadow
- `Input` = Input field dengan border tebal
- `Badge` = Label kecil berwarna
- `AlertDialog` = Dialog peringatan
- `DialogOverlay` = Overlay untuk modal
- `Toast` = Notifikasi kecil

---

## 🔄 State Management (Cara Menyimpan Data)

Aplikasi menggunakan **React Context API** untuk menyimpan data global:

### AppContext.tsx
Ini seperti "kotak penyimpanan" yang bisa diakses semua komponen:

```typescript
// Data yang disimpan:
- currentUser      → User yang sedang login
- exams            → Daftar semua ujian
- attempts         → Jawaban siswa
- liveProgress     → Progress real-time
- activeExamId     → ID ujian yang sedang aktif
- noiseLevel       → Level kebisingan
- appConfig        → Konfigurasi aplikasi
- isLoading        → Status loading

// Fungsi yang tersedia:
- login()          → Login user
- logout()         → Logout user
- addExam()        → Tambah ujian
- updateExam()     → Update ujian
- deleteExam()     → Hapus ujian
- enterExam()      → Masuk ke ujian
- submitExam()     → Submit jawaban
- refreshData()    → Refresh data dari backend
```

### Cara Menggunakan:
```typescript
// Di komponen manapun:
import { useApp } from '../context/AppContext';

const MyComponent = () => {
  const { exams, currentUser, addExam } = useApp();
  
  // Sekarang bisa pakai exams, currentUser, addExam, dll
};
```

---

## 📡 API Communication (Cara Berkomunikasi dengan Backend)

### lib/api.ts
File ini berisi semua fungsi untuk berkomunikasi dengan backend:

```typescript
// Contoh fungsi:
api.login(username, password)        → Login
api.fetchExams()                    → Ambil daftar ujian
api.saveExam(examData)              → Simpan ujian
api.submitAttempt(attemptData)      → Submit jawaban
api.fetchConfig()                   → Ambil konfigurasi
```

### Cara Kerja:
1. Frontend memanggil fungsi di `api.ts`
2. Fungsi membuat HTTP request ke Google Apps Script
3. Backend memproses dan mengembalikan response
4. Frontend menerima response dan update UI

### Error Handling:
- Jika error, akan muncul alert dialog
- Error dicatat di console untuk debugging
- User-friendly error messages

---

## 🗄️ Database Structure (Struktur Database)

### Google Sheets Structure:

#### Sheet: **Exams**
| id | title | classGrade | date | startTime | endTime | durationMinutes | token | status | questions | areResultsPublished | randomizeQuestions | randomizeOptions |
|----|-------|------------|------|-----------|---------|-----------------|-------|--------|-----------|-------------------|-------------------|------------------|
| ex-1 | Ujian IPA | VIII A | 2025-01-15 | 08:00 | 09:30 | 90 | ABC123 | DIBUKA | [...] | false | true | false |

#### Sheet: **Attempts**
| examId | studentName | answers | score | submittedAt | violationCount |
|--------|-------------|---------|-------|-------------|----------------|
| ex-1 | Budi Santoso | {...} | 85 | 2025-01-15T09:25:00Z | 0 |

#### Sheet: **LiveProgress**
| examId | studentName | answeredCount | totalQuestions | lastActive | status | violationCount |
|--------|-------------|---------------|----------------|------------|--------|----------------|
| ex-1 | Budi Santoso | 5 | 10 | 2025-01-15T09:10:00Z | WORKING | 0 |

#### Sheet: **Users** (Guru)
| username | password | name | role |
|----------|----------|------|------|
| admin | [hashed] | Pak Guru | GURU |

#### Sheet: **Students** (Siswa)
| username | password | name | classId |
|----------|----------|------|---------|
| siswa1 | [hashed] | Budi Santoso | VIII A |

#### Sheet: **Config**
| key | value |
|-----|-------|
| appName | Exam Room |
| schoolName | SMP Negeri 1 Jakarta |

---

## 🧪 Testing

### Menjalankan Test:

```bash
# Run semua test
npm test

# Run test dengan watch mode (auto-run saat file berubah)
npm test -- --watch

# Run test dengan UI
npm run test:ui

# Run test dengan coverage report
npm run test:coverage
```

### Test yang Ada:
- `test/utils/scoreCalculator.test.ts` → Test untuk fungsi kalkulasi nilai

### Menambah Test Baru:
Buat file baru di folder `test/` dengan format:
```typescript
import { describe, it, expect } from 'vitest';

describe('Nama Test', () => {
  it('harus melakukan sesuatu', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## 🚀 Build untuk Production

### Build Aplikasi:

```bash
npm run build
```

File hasil build ada di folder `dist/`. File ini siap untuk di-deploy ke hosting (Vercel, Netlify, dll).

### Preview Build:

```bash
npm run preview
```

Ini akan menjalankan versi production lokal untuk testing.

### Deploy ke Production:

1. **Vercel** (Disarankan):
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**:
   - Drag & drop folder `dist/` ke [netlify.com](https://netlify.com)

3. **GitHub Pages**:
   - Push ke GitHub
   - Setup GitHub Pages di Settings

---

## 📱 PWA (Progressive Web App)

Aplikasi ini bisa di-install seperti aplikasi native!

### Fitur PWA:
- ✅ Bisa di-install di HP/tablet
- ✅ Bisa digunakan offline (dengan service worker)
- ✅ Launch screen yang cepat
- ✅ Tidak perlu app store

### Install di Android:
1. Buka aplikasi di Chrome Android
2. Card "Install Aplikasi" muncul otomatis
3. Tap "Install"
4. Aplikasi muncul di home screen

### Install di iOS:
1. Buka aplikasi di Safari iOS
2. Card "Install Aplikasi" muncul
3. Tap "Lihat Cara Install"
4. Ikuti instruksi (Share → Add to Home Screen)

### Setup PWA:
- `manifest.json` → Konfigurasi PWA (nama, icon, warna)
- `sw.js` → Service worker (untuk offline)
- Icon 192x192 dan 512x512 → Icon aplikasi

---

## ⚙️ Konfigurasi Aplikasi

### Mengubah Nama Aplikasi & Sekolah:

1. Buka Google Sheets
2. Buka sheet "Config"
3. Edit nilai:
   - `appName` → Nama aplikasi
   - `schoolName` → Nama sekolah
4. Refresh aplikasi (Ctrl+Shift+R)

Lihat `CONFIG_GUIDE.md` untuk detail lengkap.

---

## 🐛 Troubleshooting (Mengatasi Masalah)

### Masalah: Error 429 - Too Many Requests (Gambar tidak muncul)
**Gejala:**
- Gambar soal tidak muncul
- Error "Failed to load resource: 429"
- Pesan "Terlalu banyak request"

**Penyebab:**
- Google Drive membatasi jumlah request per waktu
- Terlalu banyak gambar dimuat sekaligus
- Banyak siswa login bersamaan

**Solusi Otomatis (Sudah Diterapkan):**
- ✅ Image caching (gambar disimpan di memori 5 menit)
- ✅ Lazy loading (gambar dimuat saat terlihat)
- ✅ Auto retry dengan exponential backoff
- ✅ Throttling upload image

**Solusi Manual:**
1. **Tunggu 1-2 menit** - Rate limit biasanya reset sendiri
2. **Klik tombol "Coba Lagi"** - Muncul otomatis jika gambar gagal
3. **Jangan refresh berulang kali** - Ini memperburuk masalah
4. **Jadwalkan login siswa bertahap** - 5 siswa per 2 menit

**Untuk Guru - Best Practices:**
- Kompres gambar sebelum upload (target: 200-500KB)
- Upload gambar bertahap, beri jeda 2-3 detik
- Maksimal 15-20 gambar per ujian
- Gunakan resolusi sedang (800x600 atau 1024x768)
- Login siswa secara bertahap, bukan bersamaan

**Detail Lengkap:** Lihat `IMAGE_429_GUIDE.md`

### Masalah: Aplikasi tidak bisa login
**Solusi:**
- Pastikan backend sudah di-deploy
- Pastikan API URL di `lib/api.ts` benar
- Cek console browser untuk error

### Masalah: Data tidak muncul
**Solusi:**
- Pastikan Google Sheets sudah dibuat
- Pastikan Apps Script sudah di-link ke Sheets
- Cek network tab di browser untuk error API

### Masalah: Ujian tidak bisa dibuka
**Solusi:**
- Pastikan status ujian sudah "DIBUKA"
- Pastikan token benar
- Pastikan kelas siswa sesuai dengan kelas ujian

### Masalah: Nilai tidak muncul
**Solusi:**
- Pastikan guru sudah klik "Publish Results"
- Pastikan ujian sudah ditutup
- Refresh halaman

---

## 📚 File-File Penting

### Backend:
- `backend/Code.js` → Semua logika backend

### Frontend:
- `App.tsx` → Komponen utama
- `context/AppContext.tsx` → State management
- `lib/api.ts` → API client
- `components/` → Semua komponen UI

### Konfigurasi:
- `vite.config.ts` → Konfigurasi build
- `tsconfig.json` → Konfigurasi TypeScript
- `package.json` → Dependencies

---

## 🎓 Penjelasan Teknis (Untuk yang Ingin Belajar Lebih)

### React Hooks yang Digunakan:
- `useState` → Menyimpan state lokal
- `useEffect` → Side effects (fetch data, dll)
- `useContext` → Mengakses context
- `useMemo` → Memoization (optimasi)
- `useRef` → Reference ke DOM element

### Pattern yang Digunakan:
- **Context API** → Global state management
- **Custom Hooks** → Reusable logic
- **Component Composition** → Membuat komponen dari komponen kecil
- **Error Boundary** → Menangkap error dengan graceful

### Optimasi yang Dilakukan:
- **Code Splitting** → Lazy load komponen besar
- **Memoization** → Cache hasil perhitungan
- **Smart Polling** → Update data dengan interval adaptif
- **Response Caching** → Cache API response
- **Bundle Optimization** → Pisahkan vendor chunks

---

## 📝 Default Credentials

Setelah setup backend, default credentials:

**Guru:**
- Username: `admin`
- Password: `admin123`

**Siswa:**
- Username: `siswa1`
- Password: `siswa123`

⚠️ **PENTING**: Ganti password default setelah setup pertama kali!

---

## 🤝 Contributing

Ingin berkontribusi? Silakan:
1. Fork project ini
2. Buat branch baru (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

---

## 📄 License

© 2025 Exam Room
Developed by Devi Saidulloh, S.Pd., Gr.

---

## 🎉 Status

✅ **Production Ready**

Aplikasi ini sudah siap digunakan untuk production dengan fitur:
- ✅ Security (password hashing, input validation)
- ✅ Performance optimization
- ✅ Error handling
- ✅ Testing
- ✅ PWA support
- ✅ Real-time monitoring
- ✅ Anti-cheat system

---

## 📞 Support

Jika ada pertanyaan atau masalah:
1. Cek dokumentasi ini dulu
2. Cek file-file `.md` lainnya (CONFIG_GUIDE.md, dll)
3. Buat issue di GitHub (jika ada)

---

**Selamat menggunakan Exam Room! 🎓**
