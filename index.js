import { SogniClient } from '@sogni-ai/sogni-client';
import HttpsProxyAgent from 'https-proxy-agent';

// Daftar akun
const accounts = [
  {
    username: 'akun1',
    password: 'password1',
    appid: 'appid1',
    proxy: 'https://your-proxy-url:port'
  },
  {
    username: 'akun2',
    password: 'password2',
    appid: 'appid2',
    proxy: 'https://your-proxy-url:port'
  }
  // Tambahkan akun lainnya jika diperlukan
];

// Fungsi untuk mengecek IP eksternal melalui proxy
const checkIP = async (proxy, username) => {
  try {
    const agent = new HttpsProxyAgent(proxy);
    const response = await fetch('https://api.ipify.org?format=json', { agent });
    const data = await response.json();
    console.log(`[${username}] IP eksternal yang terdeteksi: ${data.ip}`);
  } catch (error) {
    console.error(`[${username}] Gagal mengecek IP:`, error);
  }
};

// Fungsi untuk membuat koneksi, login, dan mengecek IP dengan proxy untuk setiap akun
const connectProxy = async ({ username, password, appid, proxy }) => {
  const options = {
    appId: appid,
    network: 'fast'
    // Catatan: SogniClient tidak mendukung opsi proxy, sehingga hanya mengonfigurasi akun saja
  };

  const client = await SogniClient.createInstance(options);
  await client.account.login(username, password);
  console.log(`[${username}] Login berhasil!`);

  // Pengecekan IP dilakukan menggunakan library proxy terpisah
  await checkIP(proxy, username);

  return client;
};

// Daftar style prompt dan elemen lainnya
const styles = [
  'anime',
  'cyberpunk',
  'realistic',
  'pixel art',
  'watercolor painting'
];

const subjects = [
  'dragon',
  'cyborg',
  'pirate queen',
  'ghostly samurai',
  'dark angel'
];

const actions = [
  'casting ancient magic',
  'riding a futuristic motorcycle',
  'fighting with dual swords',
  'playing a mystical flute',
  'hacking a security system'
];

const environments = [
  'in a neon-lit cyber city',
  'deep in an enchanted forest',
  'on a stormy ocean',
  'inside a forgotten temple',
  'on a floating sky island'
];

const moods = [
  'with surreal dream-like aesthetics',
  'with vibrant, glowing colors',
  'in a dark, eerie atmosphere',
  'with hyper-realistic details',
  'in a psychedelic art style'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomPrompt = () => {
  const subject = getRandomElement(subjects);
  const action = getRandomElement(actions);
  const environment = getRandomElement(environments);
  const mood = getRandomElement(moods);
  return `${subject} ${action} ${environment} ${mood}`;
};

const modelIds = [
  'coreml-sogni_artist_v1_768',
  'coreml-sogniXL_alpha2_ws',
  'coreml-animagineXLV31',
  'coreml-cyberrealisticPony_v7',
  'coreml-albedobaseXL_v31Large',
  'coreml-animaPencilXL_v500',
  'coreml-anythingXL',
  'coreml-analogMadnessSDXL_sdxlV11',
  'coreml-albedobaseXL_v21',
  'coreml-DreamShaper-XL1-Alpha2',
  'coreml-newrealityxlAllInOne_30Experimental',
  'coreml-absolutereality_v181_768',
  'coreml-stable-diffusion-xl-base-with-refiner',
  'coreml-bluePencilXL_v700',
  'coreml-artUniverse_sdxlV60',
  'coreml-lcm_cyberrealistic42_768'
];

const getRandomModelId = () =>
  modelIds[Math.floor(Math.random() * modelIds.length)];

// Fungsi untuk menghasilkan delay acak antara 1 hingga 5 detik
const delay = () => {
  const delayMs = Math.floor(Math.random() * 2000) + 1000;
  return new Promise(resolve => setTimeout(resolve, delayMs));
};

// Fungsi untuk menghasilkan gambar untuk masing-masing akun
const generateImagesForAccount = async (account) => {
  try {
    const client = await connectProxy(account);

    // Tunggu hingga model tersedia (jika diperlukan)
    await client.projects.waitForModels();
    let i = 1;

    const generateImage = async () => {
      const randomPrompt = getRandomPrompt();
      const randomStyle = getRandomElement(styles);
      const randomModelId = getRandomModelId();

      console.log(
        `[${account.username}] Generating image ${i}: "${randomPrompt}" dengan style "${randomStyle}" dan model "${randomModelId}"`
      );

      const project = await client.projects.create({
        modelId: randomModelId,
        disableNSFWFilter: true, // NSFW Filter Off
        positivePrompt: randomPrompt,
        negativePrompt: 'malformation, bad anatomy, low quality, jpeg artifacts, watermark',
        stylePrompt: randomStyle,
        steps: 20,
        guidance: 7.5,
        numberOfImages: 1
      });

      project.on('progress', (progress) => {
        console.log(`[${account.username}] Progres ${i}:`, progress);
      });

      const imageUrls = await project.waitForCompletion();
      console.log(`[${account.username}] Gambar ${i} selesai! URL:`, imageUrls);

      i++;
      // Menambahkan delay acak sebelum menghasilkan gambar berikutnya
      await delay();
      generateImage();
    };

    generateImage();
  } catch (error) {
    console.error(`[${account.username}] Terjadi kesalahan:`, error);
  }
};

// Jalankan proses untuk setiap akun secara bersamaan
accounts.forEach(account => {
  generateImagesForAccount(account);
});
