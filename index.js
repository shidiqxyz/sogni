import { SogniClient } from '@sogni-ai/sogni-client';
import { setGlobalDispatcher, ProxyAgent } from 'undici';
import fetch from 'node-fetch';

// Daftar akun & proxy
const accounts = [
  {
    username: 'akun1',
    password: 'password1',
    appid: 'appid1',
    proxy: 'http://username1:password1@hostname1:port'
  },
  {
    username: 'akun2',
    password: 'password2',
    appid: 'appid2',
    proxy: 'http://username2:password2@hostname2:port'
  }
];

// Daftar style prompt dan daftar prompt lainnya
const styles = ['anime', 'cyberpunk', 'realistic', 'pixel art', 'watercolor painting'];
const subjects = ['dragon', 'cyborg', 'pirate queen', 'ghostly samurai', 'dark angel'];
const actions = ['casting ancient magic', 'riding a futuristic motorcycle', 'fighting with dual swords', 'playing a mystical flute', 'hacking a security system'];
const environments = ['in a neon-lit cyber city', 'deep in an enchanted forest', 'on a stormy ocean', 'inside a forgotten temple', 'on a floating sky island'];
const moods = ['with surreal dream-like aesthetics', 'with vibrant, glowing colors', 'in a dark, eerie atmosphere', 'with hyper-realistic details', 'in a psychedelic art style'];

const modelIds = [
  'coreml-sogni_artist_v1_768', 'coreml-sogniXL_alpha2_ws', 'coreml-animagineXLV31',
  'coreml-cyberrealisticPony_v7', 'coreml-albedobaseXL_v31Large', 'coreml-animaPencilXL_v500',
  'coreml-anythingXL', 'coreml-analogMadnessSDXL_sdxlV11', 'coreml-albedobaseXL_v21',
  'coreml-DreamShaper-XL1-Alpha2', 'coreml-newrealityxlAllInOne_30Experimental',
  'coreml-absolutereality_v181_768', 'coreml-stable-diffusion-xl-base-with-refiner',
  'coreml-bluePencilXL_v700', 'coreml-artUniverse_sdxlV60', 'coreml-lcm_cyberrealistic42_768'
];

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomPrompt = () => `${getRandomElement(subjects)} ${getRandomElement(actions)} ${getRandomElement(environments)} ${getRandomElement(moods)}`;
const getRandomModelId = () => getRandomElement(modelIds);

// Fungsi delay acak antara 1 - 5 detik
const delay = () => new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 2000) + 1000));

// Fungsi untuk mengecek IP melalui proxy
const checkIP = async (proxy) => {
  try {
    const agent = new ProxyAgent(proxy);
    const response = await fetch('https://api64.ipify.org?format=json', { dispatcher: agent });
    const data = await response.json();
    console.log(`🌍 IP melalui proxy ${proxy}:`, data.ip);
  } catch (error) {
    console.error(`❌ Gagal cek IP melalui proxy ${proxy}:`, error);
  }
};

// Fungsi untuk login dengan SogniClient melalui proxy
const connectProxy = async (account) => {
  console.log(`🔄 Menggunakan proxy: ${account.proxy}`);

  // Set proxy untuk semua request
  setGlobalDispatcher(new ProxyAgent(account.proxy));

  // Cek IP sebelum login
  await checkIP(account.proxy);

  // Koneksi ke SogniClient
  const client = await SogniClient.createInstance({ appId: account.appid, network: 'fast' });
  await client.account.login(account.username, account.password);
  console.log(`✅ [${account.username}] Login berhasil melalui proxy!`);

  return client;
};

// Fungsi untuk menghasilkan gambar AI
const generateImage = async (client, username) => {
  let i = 1;
  while (true) {
    const randomPrompt = getRandomPrompt();
    const randomStyle = getRandomElement(styles);
    const randomModelId = getRandomModelId();

    console.log(`🎨 Generating image ${i} for ${username}: "${randomPrompt}" with style "${randomStyle}" using model "${randomModelId}"`);

    try {
      const project = await client.projects.create({
        modelId: randomModelId,
        disableNSFWFilter: true,
        positivePrompt: randomPrompt,
        negativePrompt: 'malformation, bad anatomy, low quality, jpeg artifacts, watermark',
        stylePrompt: randomStyle,
        steps: 20,
        guidance: 7.5,
        numberOfImages: 1
      });

      project.on('progress', (progress) => {
        console.log(`⏳ [${username}] Progres ${i}:`, progress);
      });

      const imageUrls = await project.waitForCompletion();
      console.log(`✅ [${username}] Gambar ${i} selesai! URL:`, imageUrls);

      i++;
    } catch (error) {
      console.error(`❌ [${username}] Gagal generate gambar:`, error);
    }

    await delay(); // Tunggu sebelum generate gambar berikutnya
  }
};

// Fungsi utama untuk menjalankan banyak akun
const main = async () => {
  for (const account of accounts) {
    try {
      const client = await connectProxy(account);
      generateImage(client, account.username);
    } catch (error) {
      console.error(`❌ Gagal login untuk ${account.username}:`, error);
    }
  }
};

main();
