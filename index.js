import { SogniClient } from '@sogni-ai/sogni-client';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Daftar akun dengan proxy masing-masing
const accounts = [
  {
    username: 'akun1',
    password: 'password1',
    appid: 'appid1',
    proxy: 'http://username:pass@hostname:port'
  },
  {
    username: 'akun2',
    password: 'password2',
    appid: 'appid2',
    proxy: 'http://username:pass@hostname:port'
  }
  // Tambahkan akun lainnya jika diperlukan
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

// Fungsi untuk memilih elemen acak dari array
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Fungsi untuk membuat prompt acak
const getRandomPrompt = () => {
  return `${getRandomElement(subjects)} ${getRandomElement(actions)} ${getRandomElement(environments)} ${getRandomElement(moods)}`;
};

// Fungsi untuk delay acak antara 1 hingga 3 detik
const delay = () => new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));

// Fungsi untuk login ke SogniClient dengan proxy
const connectProxy = async ({ username, password, appid, proxy }) => {
  try {
    const agent = new HttpsProxyAgent(proxy);
    const options = { appId: appid, network: 'fast', fetchOptions: { agent } };

    const client = await SogniClient.createInstance(options);
    await client.account.login(username, password);
    console.log(`✅ [${username}] Login berhasil melalui proxy ${proxy}`);

    return client;
  } catch (error) {
    console.error(`❌ [${username}] Gagal login:`, error);
    return null;
  }
};

// Fungsi untuk menghasilkan gambar
const generateImage = async (client, username) => {
  let i = 1;
  const loopGenerate = async () => {
    try {
      const randomPrompt = getRandomPrompt();
      const randomStyle = getRandomElement(styles);
      const randomModelId = getRandomElement(modelIds);

      console.log(`🎨 [${username}] Generating image ${i}: "${randomPrompt}" dengan style "${randomStyle}" dan model "${randomModelId}"`);

      const project = await client.projects.create({
        modelId: randomModelId,
        disableNSFWFilter: true, // Matikan filter NSFW
        positivePrompt: randomPrompt,
        negativePrompt: 'malformation, bad anatomy, low quality, jpeg artifacts, watermark',
        stylePrompt: randomStyle,
        steps: 20,
        guidance: 7.5,
        numberOfImages: 1
      });

      project.on('progress', (progress) => {
        console.log(`⏳ [${username}] Progress ${i}:`, progress);
      });

      const imageUrls = await project.waitForCompletion();
      console.log(`✅ [${username}] Gambar ${i} selesai! URL:`, imageUrls);

      i++;
      await delay();
      loopGenerate();
    } catch (error) {
      console.error(`❌ [${username}] Gagal generate gambar:`, error);
    }
  };

  loopGenerate();
};

// Jalankan login untuk setiap akun dengan proxy masing-masing dan mulai generate gambar
(async () => {
  for (const account of accounts) {
    const client = await connectProxy(account);
    if (client) {
      generateImage(client, account.username);
    }
  }
})();
