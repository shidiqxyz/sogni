const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');
const { SogniClient } = require('@sogni-ai/sogni-client');

// Konstanta konfigurasi (delay lebih cepat)
const DELAY_INTERVAL = 5000; // 2 detik antar iterasi
const MAX_RETRY = 3;         // jumlah maksimal retry
const BASE_BACKOFF = 500;    // delay dasar untuk backoff (500 ms)

// Validasi sederhana URL proxy
function isValidProxyUrl(url) {
  return /^(http:\/\/|https:\/\/|socks:\/\/|socks5:\/\/|socks4:\/\/)/i.test(url);
}

// Membuat HTTPS proxy agent
function createHttpsProxyAgent(proxyUrl) {
  try {
    const pkg = require('https-proxy-agent');
    const Agent = pkg.HttpsProxyAgent || pkg.default || pkg;
    if (typeof Agent !== 'function') {
      throw new Error('HttpsProxyAgent is not a constructor');
    }
    return new Agent(proxyUrl);
  } catch (error) {
    throw new Error(`Gagal membuat HTTPS proxy agent: ${error.message}`);
  }
}

// Mendapatkan IP publik melalui proxy
async function connectToProxy(proxyUrl) {
  if (!isValidProxyUrl(proxyUrl)) {
    throw new Error('Proxy URL tidak valid');
  }
  let agent;
  try {
    if (
      proxyUrl.startsWith('socks://') ||
      proxyUrl.startsWith('socks5://') ||
      proxyUrl.startsWith('socks4://')
    ) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = createHttpsProxyAgent(proxyUrl);
    }
  } catch (err) {
    throw new Error(`Gagal membuat proxy agent: ${err.message}`);
  }
  try {
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpAgent: agent,
      httpsAgent: agent,
      proxy: false
    });
    return response.data.ip;
  } catch (err) {
    throw new Error(`Gagal mengambil IP dari proxy: ${err.message}`);
  }
}

// Daftar akun dengan properti username, password, appid, dan proxy
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

// Array prompt (contoh prompt, bisa disesuaikan)
const prompts = [
  { positivePrompt: "A futuristic cyberpunk cityscape with neon lights", stylePrompt: "cyberpunk" },
  { positivePrompt: "A peaceful Japanese zen garden with cherry blossoms", stylePrompt: "traditional Japanese" },
  { positivePrompt: "A majestic medieval castle on top of a mountain", stylePrompt: "fantasy" },
  { positivePrompt: "A post-apocalyptic wasteland with abandoned buildings", stylePrompt: "dystopian" },
  { positivePrompt: "An underwater city glowing with bioluminescent life", stylePrompt: "sci-fi" },
  { positivePrompt: "A cozy cottage surrounded by a magical forest", stylePrompt: "storybook illustration" },
  { positivePrompt: "A high-speed futuristic race with hovercars", stylePrompt: "futuristic" },
  { positivePrompt: "A Viking warrior standing on a frozen battlefield", stylePrompt: "historical" },
  { positivePrompt: "A neon-lit street filled with holograms and robots", stylePrompt: "neo-noir" },
  { positivePrompt: "A dreamy pastel-colored sky with floating islands", stylePrompt: "surreal" }
];

// Objek untuk menyimpan data akumulasi per akun.
// Struktur: { [username]: { totalGambar: number, ip: string, timestamp: string } }
const accountStats = {};

// Graceful shutdown flag
let shuttingDown = false;
process.on('SIGINT', () => {
  console.log('SIGINT diterima, menghentikan proses...');
  shuttingDown = true;
});
process.on('SIGTERM', () => {
  console.log('SIGTERM diterima, menghentikan proses...');
  shuttingDown = true;
});

/**
 * Fungsi untuk mencoba membuat project.
 * Jika error karena "Project not found" (errorCode 102), maka buat instance baru dan re-login.
 * Menggunakan exponential backoff untuk retry error lainnya.
 *
 * @param {Object} account - Data akun.
 * @param {string} modelId - ID model yang dipilih.
 * @param {Object} prompt - Objek prompt yang akan digunakan.
 * @param {number} retry - Percobaan ke berapa (default: 1).
 * @returns {Promise<number>} - Mengembalikan jumlah gambar (misalnya 1) jika berhasil, atau 0 jika gagal.
 */
async function createProjectWithRelogin(account, modelId, prompt, retry = 1) {
  try {
    // Buat instance baru dan lakukan login
    const client = await SogniClient.createInstance({ appId: account.appid, network: 'fast' });
    await client.account.login(account.username, account.password);

    const project = await client.projects.create({
      modelId,
      disableNSFWFilter: true,
      positivePrompt: prompt.positivePrompt,
      negativePrompt: "malformation, bad anatomy, low quality, jpeg artifacts, watermark",
      stylePrompt: prompt.stylePrompt,
      steps: 20,
      guidance: 7.5,
      numberOfImages: 1
    });

    project.on('progress', (progress) => {
      console.log(`[${account.username}] Progres: ${progress}`);
    });

    await project.waitForCompletion();
    return 1; // Misalnya, 1 gambar berhasil
  } catch (err) {
    console.error(`[${account.username}] Error membuat project: ${err.message}`);

    // Jika error karena "Project not found", lakukan re-login dengan membuat instance baru
    if (err.status === 404 && err.payload?.errorCode === 102) {
      console.warn(`[${account.username}] Project tidak ditemukan, melakukan re-login dan reinitialize client...`);
      try {
        return await createProjectWithRelogin(account, modelId, prompt, retry);
      } catch (innerErr) {
        console.error(`[${account.username}] Reinitialize client gagal: ${innerErr.message}`);
        return 0;
      }
    }

    // Jika sudah mencapai batas retry, hentikan percobaan
    if (retry >= MAX_RETRY) {
      console.error(`[${account.username}] Gagal setelah ${MAX_RETRY} percobaan. Berhenti.`);
      return 0;
    }

    // Exponential backoff untuk retry (jika error lain)
    const delay = BASE_BACKOFF * (2 ** (retry - 1));
    console.log(`[${account.username}] Menunggu ${delay} ms sebelum mencoba ulang (retry ${retry}/${MAX_RETRY})...`);
    await new Promise(res => setTimeout(res, delay));

    return await createProjectWithRelogin(account, modelId, prompt, retry + 1);
  }
}

/**
 * Fungsi untuk memproses setiap akun.
 * Melakukan koneksi proxy, login, mendapatkan model, dan membuat project.
 * Jika project berhasil dibuat, total gambar akun diakumulasi.
 */
async function processAccount(account) {
  let ip = '-';
  try {
    ip = await connectToProxy(account.proxy);
  } catch (err) {
    console.error(`[${account.username}] Error koneksi proxy: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  // Dapatkan instance awal untuk login dan mendapatkan model
  let client;
  try {
    client = await SogniClient.createInstance({ appId: account.appid, network: 'fast' });
  } catch (err) {
    console.error(`[${account.username}] Gagal membuat instance SogniClient: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  // Fungsi login untuk akun
  async function login() {
    try {
      await client.account.login(account.username, account.password);
    } catch (err) {
      throw err;
    }
  }
  try {
    await login();
  } catch (err) {
    console.error(`[${account.username}] Gagal login: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  let models;
  try {
    models = await client.projects.waitForModels();
  } catch (err) {
    console.error(`[${account.username}] Gagal mendapatkan model: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  // Pilih model paling populer berdasarkan jumlah worker
  const mostPopularModel = client.projects.availableModels.reduce((a, b) =>
    a.workerCount > b.workerCount ? a : b
  );

  // Gunakan prompt pertama sebagai contoh
  const currentPrompt = prompts[0];

  try {
    const gambarDihasilkan = await createProjectWithRelogin(account, mostPopularModel.id, currentPrompt);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    accountStats[account.username].totalGambar += gambarDihasilkan;
    accountStats[account.username].ip = ip;
    accountStats[account.username].timestamp = new Date().toLocaleString();
    console.log(`[${account.username}] Project berhasil. Total gambar: ${accountStats[account.username].totalGambar}`);
  } catch (err) {
    console.error(`[${account.username}] Error pada proses project: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
  }
}

/**
 * Fungsi utama dengan infinite loop.
 * Memproses semua akun secara paralel dan menampilkan output dalam bentuk tabel.
 * Loop akan berhenti jika menerima sinyal shutdown.
 */
async function main() {
  while (!shuttingDown) {
    await Promise.all(accounts.map(account => processAccount(account)));

    const tableData = accounts.map(account => ({
      akun: account.username,
      'total gambar': accountStats[account.username] ? accountStats[account.username].totalGambar : 0,
      timestamp: accountStats[account.username] ? accountStats[account.username].timestamp : '-',
      ip: accountStats[account.username] ? accountStats[account.username].ip : '-'
    }));

    console.clear();
    console.table(tableData);
    await new Promise(res => setTimeout(res, DELAY_INTERVAL));
  }
  console.log('Proses dihentikan.');
  process.exit(0);
}

main();
