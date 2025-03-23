# Sogni Image Generator

## Daftar Sogni

Silakan daftar di [Sogni AI](https://app.sogni.ai/) dan gunakan referral: **shidiq**.

## Instalasi

1. **Clone Repository:**

   ```bash
   git clone https://github.com/shidiqxyz/sogni.git
   cd sogni
   ```

2. **Install Dependensi:**

   ```bash
   npm install
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
      proxy: 'http://username1:password1@hostname1:port'
    },
   ];
   ```

2. **Prompt:**

   Sesuaikan array `prompts` jika ingin menggunakan prompt berbeda untuk pembuatan gambar. Secara default, prompt pertama yang digunakan.


## Penggunaan PM2 untuk Restart Otomatis

Agar aplikasi berjalan stabil, gunakan PM2 untuk otomatis restart setiap 10 menit:

```bash
pm2 start index.js --name sogni-bot  
pm2 restart sogni-bot --cron "*/10 * * * *"
```

Untuk mengecek logs
```bash
pm2 logs
```
Untuk melihat list pm2
```bash
pm2 ls
```
