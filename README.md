# 🚧 Road Damaged Detection System

[![GitHub License](https://img.shields.io/github/license/ghifaryyy/WGTIK?style=flat-square&color=blue)](LICENSE)
[![GitHub PRs](https://img.shields.io/github/issues-pr/ghifaryyy/WGTIK?style=flat-square&color=orange)](https://github.com/ghifaryyy/WGTIK/pulls)
[![Fakultas](https://img.shields.io/badge/Telkom%20University-FIF%20%2F%20DS--48--03-red?style=flat-square)](https://telkomuniversity.ac.id/)

**Road Damaged Detection System** adalah sebuah platform crowdsourcing kolaboratif berbasis kecerdasan buatan (*Computer Vision YOLOv8*) untuk mendeteksi, memetakan, dan mempercepat siklus pelaporan perbaikan infrastruktur jalan rusak secara real-time demi meningkatkan keselamatan warga Bandung.

---

## 👥 Kelompok D - DS-48-03 (Innovation Project)

| Nama Anggota | NIM | Peran |
| --- | --- | --- |
| **Ghifary Wibisono** | *103052400016* | Lead Full-Stack & UI/UX Developer |
| **Prayata Yasinkha** | *103052400060* | Data Scientist / ML Engineer |
| **Zaky Muhammad** | *103052400064* | GIS Integration Analyst |
| **Luthfia Maulidya** | *103052400066* | QA Engineer & Researcher |

---

## 🌟 Fitur Utama Aplikasi

### 1. 🗺️ Peta Kerusakan Real-Time (Interactive GIS Map)
* Didukung oleh **Leaflet.js** dan peta **CartoDB Voyager Light** tanpa memerlukan biaya lisensi Google Maps API.
* Penandaan titik koordinat berwarna interaktif sesuai tingkat urgensi (*severity level*):
  * 🔴 **High Severity** (Lubang jalan kritis/berbahaya)
  * 🟠 **Medium Severity** (Lubang jalan sedang)
  * 🟡 **Low Severity** (Retakan kecil/non-kritis)
  * 🟢 **Repaired** (Jalan yang telah selesai diperbaiki)

### 2. 🤖 AI Diagnostics Sandbox Uploader
* Fitur **Drag & Drop** unggah gambar yang dilengkapi animasi pemindai holografik AI.
* Menganalisis gambar jalan secara instan menggunakan deep learning untuk mendeteksi kontur jalan berlubang dengan rating akurasi (*confidence score*) tinggi.
* Otomatis mengekstrak koordinat GPS smartphone dari data metadata EXIF foto asli.
* Tombol **Commit Gateway** untuk menyimpan hasil diagnosa langsung ke database dan menyematkan pin baru ke peta interaktif.

### 3. 👥 Citizen Manual Incidents Portal
* Formulir pelaporan warga untuk memasukkan laporan jalan rusak secara manual.
* Dilengkapi dengan **Mini-Map Picker** (cukup klik lokasi pada peta untuk mengunci koordinat) dan pencarian lokasi otomatis (*Nominatim OpenStreetMap Geocoder*).
* Lembar riwayat laporan (*My Submissions*) dengan bar pelacak status penanganan (*Reported* $\rightarrow$ *Verified* $\rightarrow$ *Scheduled* $\rightarrow$ *Repaired*).

### 4. 💼 Panel Operator Pemerintah (Gov Console)
* Konsol khusus dinas bina marga/pemerintah kota untuk meninjau semua laporan warga.
* Fitur filter tabel cepat berdasarkan tingkat keparahan dan status pengerjaan.
* Aksi pengerjaan interaktif (*Verify*, *Schedule for Repair*, *Mark Repaired*, atau *Delete*) yang otomatis merubah warna pin peta secara real-time.

---

## 🛠️ Arsitektur & Teknologi

* **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism, Fluid Transitions, Mobile Responsive), Vanilla JavaScript (Single Page Application, DOM Manipulation).
* **Mapping**: Leaflet.js, OpenStreetMap API.
* **Analytics & Charting**: Chart.js.
* **Backend**: Flask (Python 3), SQLAlchemy (ORM).
* **Database**: SQLite3 (Local file-based database `rodation.db`).
* **Machine Learning**: YOLOv8 (Computer Vision Object Detection).

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

Pastikan laptop Anda telah terinstal **Python 3.8+** dan **Git**.

### 1. Kloning Repositori
```bash
git clone https://github.com/ghifaryyy/WGTIK.git
cd WGTIK
```

### 2. Buat & Aktifkan Virtual Environment
* **Windows**:
  ```powershell
  python -m venv .venv
  .\.venv\Scripts\activate
  ```
* **macOS / Linux**:
  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  ```

### 3. Instalasi Dependencies
```bash
pip install -r app/backend/requirements.txt
```

### 4. Jalankan Aplikasi Backend
```bash
python app/backend/run.py
```
Aplikasi database SQLite akan otomatis membuat berkas seeder awal berisi 10 titik data berlubang di daerah Telkom University.

### 5. Akses Aplikasi di Browser
Buka peramban Anda dan navigasikan ke alamat:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🔑 Akun Demo Presentasi

Untuk memudahkan proses demo presentasi di depan dosen dan kelas, silakan gunakan akun berikut untuk masuk (*Sign In*) ke portal:

| Peran Akun | Username | Password | Deskripsi Akses |
| --- | --- | --- | --- |
| 💼 **Pemerintah (Admin)** | `admin` | `admin` | Memiliki akses penuh ke **Gov Console** untuk memproses laporan |
| 👥 **Warga (Public Patroller)** | `ghifary`, `prayata`, `zaky`, `luthfia`, `user` | *(sama dengan username)* | Akses ke menu **AI Sandbox** & **Citizen Reports** dengan riwayat personal |

---

*Wawasan Global TIK - Kelompok D DS-48-03 Telkom University*
