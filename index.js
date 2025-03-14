require('dotenv').config();
const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');
const { SogniClient } = require('@sogni-ai/sogni-client');
const winston = require('winston');

// Konfigurasi dari environment variables
const DELAY_INTERVAL = parseInt(process.env.DELAY_INTERVAL, 10) || 5000; // ms delay antar iterasi
const MAX_RETRY = parseInt(process.env.MAX_RETRY, 10) || 3;                // jumlah maksimal retry
const BASE_BACKOFF = parseInt(process.env.BASE_BACKOFF, 10) || 2000;         // delay dasar untuk backoff (ms)

// Inisialisasi logger menggunakan Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`
    )
  ),
  transports: [new winston.transports.Console()]
});

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

// Objek untuk menyimpan data akumulasi per akun:
// Struktur: { [username]: { totalGambar: number, ip: string, timestamp: string } }
const accountStats = {};

// Graceful shutdown flag
let shuttingDown = false;
process.on('SIGINT', () => {
  logger.info('SIGINT diterima, menghentikan proses...');
  shuttingDown = true;
});
process.on('SIGTERM', () => {
  logger.info('SIGTERM diterima, menghentikan proses...');
  shuttingDown = true;
});

/**
 * Fungsi untuk mencoba membuat project dengan reconnect jika terjadi error "Project not found".
 * Jika error terjadi karena errorCode 102, akan dilakukan re-login dan mencoba ulang.
 * Menggunakan exponential backoff untuk retry.
 *
 * @param {Object} client - Instance SogniClient.
 * @param {Object} account - Data akun.
 * @param {string} modelId - ID model yang dipilih.
 * @param {Object} prompt - Objek prompt yang akan digunakan.
 * @param {number} retry - Percobaan ke berapa (default: 1).
 * @returns {Promise<number>} - Mengembalikan jumlah gambar (misalnya 1) jika berhasil, atau 0 jika gagal.
 */
async function createProjectWithReconnect(client, account, modelId, prompt, retry = 1) {
  try {
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
      logger.info(`[${account.username}] Progres: ${progress}`);
    });

    await project.waitForCompletion();
    return 1; // Misal 1 gambar berhasil
  } catch (err) {
    logger.error(`[${account.username}] Error membuat project: ${err.message}`);

    // Jika error karena "Project not found", coba re-login dan retry
    if (err.status === 404 && err.payload?.errorCode === 102) {
      logger.warn(`[${account.username}] Project not found, mencoba re-login...`);
      try {
        await client.account.login(account.username, account.password);
        logger.info(`[${account.username}] Re-login berhasil, mencoba ulang...`);
        return await createProjectWithReconnect(client, account, modelId, prompt, retry);
      } catch (loginErr) {
        logger.error(`[${account.username}] Gagal re-login: ${loginErr.message}`);
        return 0;
      }
    }

    // Jika sudah mencapai batas retry, hentikan
    if (retry >= MAX_RETRY) {
      logger.error(`[${account.username}] Gagal setelah ${MAX_RETRY} percobaan. Berhenti.`);
      return 0;
    }

    // Exponential backoff untuk retry
    const delay = BASE_BACKOFF * (2 ** (retry - 1));
    logger.info(`[${account.username}] Menunggu ${delay / 1000} detik sebelum mencoba ulang (retry ${retry}/${MAX_RETRY})...`);
    await new Promise(res => setTimeout(res, delay));

    return await createProjectWithReconnect(client, account, modelId, prompt, retry + 1);
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
    logger.error(`[${account.username}] Error koneksi proxy: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  let client;
  try {
    client = await SogniClient.createInstance({ appId: account.appid, network: 'fast' });
  } catch (err) {
    logger.error(`[${account.username}] Gagal membuat instance SogniClient: ${err.message}`);
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
    logger.error(`[${account.username}] Gagal login: ${err.message}`);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }

  let models;
  try {
    models = await client.projects.waitForModels();
  } catch (err) {
    logger.error(`[${account.username}] Gagal mendapatkan model: ${err.message}`);
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
    const gambarDihasilkan = await createProjectWithReconnect(client, account, mostPopularModel.id, currentPrompt);
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    accountStats[account.username].totalGambar += gambarDihasilkan;
    accountStats[account.username].ip = ip;
    accountStats[account.username].timestamp = new Date().toLocaleString();
    logger.info(`[${account.username}] Project berhasil. Total gambar: ${accountStats[account.username].totalGambar}`);
  } catch (err) {
    logger.error(`[${account.username}] Error pada proses project: ${err.message}`);
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
  logger.info('Proses dihentikan.');
  process.exit(0);
}

main();
