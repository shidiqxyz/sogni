const axios = require('axios');
const SocksProxyAgent = require('socks-proxy-agent');
const { SogniClient } = require('@sogni-ai/sogni-client');

// Fungsi untuk membuat HTTPS proxy agent yang kompatibel dengan beberapa versi modul
function createHttpsProxyAgent(proxyUrl) {
  try {
    const pkg = require('https-proxy-agent');
    const Agent = pkg.HttpsProxyAgent || pkg.default || pkg;
    if (typeof Agent !== 'function') {
      throw new Error('HttpsProxyAgent is not a constructor');
    }
    return new Agent(proxyUrl);
  } catch (error) {
    throw new Error(`Gagal membuat https proxy agent: ${error.message}`);
  }
}

// Fungsi untuk mendapatkan IP publik melalui proxy
async function connectToProxy(proxyUrl) {
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

// Array akun dengan properti username, password, appid, dan proxy masing-masing
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
  },
  // Tambahkan akun lainnya jika diperlukan
];

// Array prompt (contoh prompt, bisa diubah sesuai kebutuhan)
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

// Objek untuk menyimpan data akumulasi per akun
const accountStats = {};

// Fungsi untuk memproses setiap akun
async function processAccount(account) {
  let ip = '-';
  try {
    ip = await connectToProxy(account.proxy);
  } catch (err) {
    // Jika gagal, pastikan statistik akun diinisialisasi jika belum ada
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }
  
  let client;
  try {
    client = await SogniClient.createInstance({ appId: account.appid, network: 'fast' });
  } catch (err) {
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
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }
  
  let models;
  try {
    models = await client.projects.waitForModels();
  } catch (err) {
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    return;
  }
  
  const mostPopularModel = client.projects.availableModels.reduce((a, b) =>
    a.workerCount > b.workerCount ? a : b
  );
  
  // Gunakan prompt pertama sebagai contoh
  const currentPrompt = prompts[0];
  
  try {
    const project = await client.projects.create({
      modelId: mostPopularModel.id,
      disableNSFWFilter: true,
      positivePrompt: currentPrompt.positivePrompt,
      negativePrompt: "malformation, bad anatomy, low quality, jpeg artifacts, watermark",
      stylePrompt: currentPrompt.stylePrompt,
      steps: 20,
      guidance: 7.5,
      numberOfImages: 1
    });
    
    await project.waitForCompletion();
    
    // Jika berhasil, increment total gambar untuk akun ini
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
    // Increment total gambar sesuai jumlah gambar yang dihasilkan (misal: 1)
    accountStats[account.username].totalGambar += 1;
    // Update ip dan timestamp (waktu terakhir sukses)
    accountStats[account.username].ip = ip;
    accountStats[account.username].timestamp = new Date().toLocaleString();
    
  } catch (err) {
    // Pada kasus gagal, pastikan data akun sudah diinisialisasi
    if (!accountStats[account.username]) {
      accountStats[account.username] = { totalGambar: 0, ip, timestamp: new Date().toLocaleString() };
    }
  }
}

// Fungsi utama dengan infinite loop
async function main() {
  while (true) {
    // Proses semua akun secara paralel
    await Promise.all(accounts.map(account => processAccount(account)));
    
    // Siapkan data untuk ditampilkan dalam tabel
    const tableData = accounts.map(account => ({
      akun: account.username,
      'total gambar': accountStats[account.username] ? accountStats[account.username].totalGambar : 0,
      timestamp: accountStats[account.username] ? accountStats[account.username].timestamp : '-',
      ip: accountStats[account.username] ? accountStats[account.username].ip : '-'
    }));
    
    console.clear();
    console.table(tableData);
    
    // Delay antar iterasi, misalnya 5 detik (5000 ms)
    await new Promise(res => setTimeout(res, 5000));
  }
}

main();
