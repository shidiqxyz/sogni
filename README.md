
# Sogni Image Generator

Proyek ini adalah aplikasi Node.js yang mengintegrasikan SogniClient untuk menghasilkan gambar secara otomatis melalui akun-akun yang berbeda. Aplikasi menggunakan proxy (HTTP/HTTPS atau SOCKS) untuk mendapatkan IP publik masing-masing akun dan melakukan request secara terus-menerus (infinite loop). Hasil akumulasi jumlah gambar per akun ditampilkan dalam bentuk tabel dengan kolom: **akun**, **total gambar**, **timestamp** (waktu terakhir sukses), dan **ip**.

## Fitur

- **Proxy Support:** Mendukung proxy HTTP/HTTPS dan SOCKS untuk setiap akun.
- **Multiple Accounts:** Dapat mengelola beberapa akun secara bersamaan.
- **Infinite Loop:** Melakukan request secara berulang (infinite loop) dengan delay antar iterasi.
- **Akumulasi Gambar:** Menyimpan dan menampilkan total gambar (gambar yang berhasil dihasilkan) per akun secara akumulatif.
- **Output Tabel:** Menampilkan output dalam bentuk tabel di console, hanya menampilkan kolom:
  - `akun`
  - `total gambar`
  - `timestamp` (waktu terakhir sukses)
  - `ip` (IP publik yang didapatkan melalui proxy)

## Persyaratan

- Node.js versi 12 ke atas
- Paket Node.js berikut:
  - `axios`
  - `socks-proxy-agent`
  - `https-proxy-agent`
  - `@sogni-ai/sogni-client`

## Instalasi

1. **Clone Repository:**

   ```bash
   git clone https://github.com/shidiqxyz/sogni.git
   cd sogni
   ```

2. **Install Dependensi:**

   ```bash
   npm install axios socks-proxy-agent https-proxy-agent @sogni-ai/sogni-client
   ```

   Pastikan semua paket yang dibutuhkan telah terinstall.

## Konfigurasi

1. **Akun dan Proxy:**

   Buka file kode dan edit array `accounts` untuk menyesuaikan dengan data akun Anda. Contoh format:

   ```js
   const accounts = [
     {
       username: 'akun1',
       password: 'password1',
       appid: 'appid1',
       proxy: 'http://your-proxy-url:port'
     },
     {
       username: 'akun2',
       password: 'password2',
       appid: 'appid2',
       proxy: 'socks://your-socks-proxy:port'
     }
     // Tambahkan akun lainnya jika diperlukan
   ];
   ```

2. **Prompt:**

   Sesuaikan array `prompts` jika ingin menggunakan prompt berbeda untuk pembuatan gambar. Secara default, prompt pertama yang digunakan.

## Cara Menjalankan

Jalankan aplikasi dengan perintah berikut:

```bash
node index.js
```

Aplikasi akan memproses semua akun secara paralel dalam infinite loop. Setiap iterasi, output akan dibersihkan dan ditampilkan kembali dalam bentuk tabel di console. Tabel hanya berisi:

- **akun:** Nama akun.
- **total gambar:** Total gambar yang dihasilkan secara akumulatif.
- **timestamp:** Waktu terakhir kali gambar berhasil dihasilkan.
- **ip:** IP publik yang didapatkan melalui proxy.

## Catatan

- **Delay:** Anda dapat menyesuaikan delay antar iterasi dengan mengubah nilai pada `setTimeout` (default 5000 ms).
- **Error Handling:** Jika terjadi error (misalnya gagal koneksi proxy atau login), aplikasi tidak akan mengakumulasi gambar dan akan menyimpan data awal (total gambar = 0).
- **Log:** Aplikasi akan mengosongkan output console (`console.clear()`) setiap iterasi sehingga hanya tampilan tabel yang terlihat.

## Lisensi

Proyek ini bersifat open-source. Silakan lihat file [LICENSE](LICENSE) untuk informasi lebih lanjut.
