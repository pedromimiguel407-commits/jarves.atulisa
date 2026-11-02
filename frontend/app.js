const modelSelect = document.querySelector('#model-select');
const messageInput = document.querySelector('#message-input');
const taskModeSelect = document.querySelector('#task-mode');
const fastModeToggle = document.querySelector('#fast-mode');
const form = document.querySelector('#chat-form');
const sendButton = document.querySelector('#send-button');
const messages = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const historyList = document.querySelector('#history-list');
const toast = document.querySelector('#toast');
const settingsDialog = document.querySelector('#settings-dialog');
const settingsForm = document.querySelector('#settings-form');
const filePreviewDialog = document.querySelector('#file-preview-dialog');
const videoPreview = document.querySelector('#video-preview');
const meshPreview = document.querySelector('#mesh-preview');
const SETTINGS_KEY = 'jarves-ai-settings';
const PROFILE_KEY = 'jarves-local-profile';
const HTML_SOURCE_KEY = 'jarves-html-source';
const WALLPAPER_DB = 'jarves-local-media';
const DEFAULT_PROFILE = { username: 'usuario', displayName: 'Usuário', avatarPreset: 'initial' };
const AVATAR_PRESETS = {
  initial: '',
  star: '⭐',
  fox: '🦊',
  robot: '🤖',
  wizard: '🧙',
  moon: '🌙',
};
const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: '#a78bfa',
  temperature: 0.7,
  maxTokens: 4096,
  systemPrompt: '',
  model: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  voice: '',
  speechRate: 1,
  accessToken: '',
};
let settingsStorageWarning = '';
const DEFAULT_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meu teste</title>
  <style>
    body { font: 16px system-ui; padding: 2rem; color: #24213a; }
    button { padding: .7rem 1rem; border: 0; border-radius: .6rem; color: white; background: #8065d6; }
  </style>
</head>
<body>
  <h1>Olá, Jarves!</h1>
  <p>Edite este arquivo e pressione Executar.</p>
  <button onclick="this.textContent = 'Funcionou!'">Testar JavaScript</button>
</body>
</html>`;
const DEFAULT_GAME_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chuva de estrelas</title>
  <style>
    * { box-sizing: border-box; }
    body { display: grid; min-height: 100vh; place-items: center; margin: 0; padding: 20px; color: #f7f2ff; background: radial-gradient(circle at top, #29204b, #10111a 65%); font: 16px system-ui, sans-serif; }
    main { width: min(100%, 520px); text-align: center; }
    h1 { margin: 0 0 6px; font-size: clamp(24px, 6vw, 36px); }
    p { margin: 6px 0 14px; color: #c7bddb; }
    .score { display: flex; justify-content: center; gap: 20px; margin: 12px 0; font-weight: 700; }
    canvas { display: block; width: 100%; max-height: 58vh; border: 1px solid #62538e; border-radius: 14px; background: #111322; touch-action: none; }
    button { min-width: 90px; margin: 5px; padding: 10px 16px; border: 0; border-radius: 10px; color: #181323; background: #c5a6ff; font: inherit; font-weight: 700; cursor: pointer; touch-action: manipulation; }
    .controls { display: flex; justify-content: center; gap: 18px; margin-top: 8px; }
    .controls button { min-width: 74px; font-size: 22px; }
    #message { min-height: 24px; }
  </style>
</head>
<body>
  <main>
    <h1>Chuva de estrelas</h1>
    <p>Apanhe as estrelas e desvie dos meteoros. Use ← → ou A/D.</p>
    <div class="score"><span>Pontos: <output id="score">0</output></span><span>Vidas: <output id="lives">3</output></span></div>
    <canvas id="game" width="480" height="360" aria-label="Área do jogo"></canvas>
    <p id="message" aria-live="polite">Toque em Começar para jogar.</p>
    <button id="start" type="button">Começar / reiniciar</button>
    <div class="controls" aria-label="Controles para celular">
      <button id="left" type="button" aria-label="Mover para a esquerda">←</button>
      <button id="right" type="button" aria-label="Mover para a direita">→</button>
    </div>
  </main>
  <script>
    const canvas = document.querySelector('#game');
    const ctx = canvas.getContext('2d');
    const scoreOutput = document.querySelector('#score');
    const livesOutput = document.querySelector('#lives');
    const message = document.querySelector('#message');
    const player = { x: 225, y: 318, width: 30, height: 18, speed: 5 };
    const keys = new Set();
    let items = [];
    let score = 0;
    let lives = 3;
    let running = false;
    let frame = 0;
    let animation;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#171a30';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff4a8';
      for (let i = 0; i < 28; i++) {
        const x = (i * 83) % canvas.width;
        const y = (i * 47 + frame * 0.4) % canvas.height;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = '#c5a6ff';
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillStyle = '#f5dc70';
      for (const item of items) {
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = item.kind === 'star' ? '#ffe783' : '#ff647c';
        ctx.fill();
      }
    }
    function endGame() {
      running = false;
      message.textContent = 'Fim de jogo! Pontuação: ' + score + '. Toque em Começar para tentar de novo.';
    }
    function tick() {
      if (!running) return;
      frame++;
      if (keys.has('ArrowLeft') || keys.has('a')) player.x -= player.speed;
      if (keys.has('ArrowRight') || keys.has('d')) player.x += player.speed;
      player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
      if (frame % 38 === 0) {
        const star = Math.random() > 0.28;
        items.push({ x: 12 + Math.random() * (canvas.width - 24), y: -12, radius: star ? 8 : 10, speed: 2 + Math.random() * 2, kind: star ? 'star' : 'meteor' });
      }
      for (const item of items) {
        item.y += item.speed;
        if (item.y + item.radius >= player.y && item.y - item.radius <= player.y + player.height && item.x >= player.x && item.x <= player.x + player.width) {
          item.hit = true;
          if (item.kind === 'star') {
            score++;
            scoreOutput.value = score;
          } else {
            lives--;
            livesOutput.value = lives;
            if (lives === 0) endGame();
          }
        } else if (item.y > canvas.height + item.radius) {
          item.hit = true;
        }
      }
      items = items.filter((item) => !item.hit);
      draw();
      if (running) animation = requestAnimationFrame(tick);
    }
    document.querySelector('#start').addEventListener('click', () => {
      cancelAnimationFrame(animation);
      score = 0;
      lives = 3;
      frame = 0;
      items = [];
      player.x = (canvas.width - player.width) / 2;
      scoreOutput.value = score;
      livesOutput.value = lives;
      message.textContent = 'Em jogo! Apanhe as estrelas douradas.';
      running = true;
      tick();
    });
    document.querySelector('#html-editor').addEventListener('input', (event) => {
      window.jarvesAutoSave?.schedule('html-editor', event.currentTarget.value);
    });
    document.addEventListener('keydown', (event) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
      keys.add(event.key.toLowerCase() === 'arrowleft' ? 'ArrowLeft' : event.key.toLowerCase() === 'arrowright' ? 'ArrowRight' : event.key.toLowerCase());
    });
    document.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase() === 'arrowleft' ? 'ArrowLeft' : event.key.toLowerCase() === 'arrowright' ? 'ArrowRight' : event.key.toLowerCase()));
    function hold(button, key) {
      const down = (event) => { event.preventDefault(); keys.add(key); };
      const up = () => keys.delete(key);
      button.addEventListener('pointerdown', down);
      button.addEventListener('pointerup', up);
      button.addEventListener('pointercancel', up);
      button.addEventListener('pointerleave', up);
    }
    hold(document.querySelector('#left'), 'ArrowLeft');
    hold(document.querySelector('#right'), 'ArrowRight');
    draw();
  </script>
</body>
</html>`;
let conversationId = null;
let conversationGeneration = 0;
let isSending = false;
let apiConnectionState = 'checking';
let availableModelCount = 0;
let isLoadingConversation = false;
let selectedFiles = new Map();
let activePreviewFile = null;
let speechRecognition = null;
let currentVideoUrl = null;
let narrationUtterance = null;
let videoNarrationActive = false;
let generatedSvg = '';
let generatedObj = '';
let generatedMesh = null;
let imagePreviewUrl = null;
let meshRotationX = -0.45;
let meshRotationY = 0.65;
let meshZoom = 1;
let meshDragPoint = null;
let installPrompt = null;
let htmlEditorLoaded = false;
let historySearchTimer;
let memorySearchTimer;
let openAIConsentAccepted = false;
let toastTimer;
let settingsSaveTimer;
let settings = readSettings();
let profile = readProfile();
let profileAvatarImage = null;
let profileDraftAvatarImage = null;
let profileAvatarChanged = false;
let wallpaperImage = null;
window.jarvesConnectionManager?.setHeadersProvider(() => {
  const headers = new Headers();
  if (settings.accessToken) headers.set('Authorization', 'Bearer ' + settings.accessToken);
  return headers;
});

function syncComposer() {
  const busy = isSending || isLoadingConversation;
  messageInput.disabled = busy;
  taskModeSelect.disabled = busy;
  fastModeToggle.disabled = busy;
  sendButton.disabled = busy;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4200);
}

function readSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    let timezone = DEFAULT_SETTINGS.timezone;
    try {
      timezone = new Intl.DateTimeFormat('pt-BR', { timeZone: stored.timezone }).resolvedOptions().timeZone;
    } catch {
      timezone = DEFAULT_SETTINGS.timezone;
    }
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      theme: ['auto', 'dark', 'light', 'rgb'].includes(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
      accent: /^#[0-9a-f]{6}$/i.test(stored.accent || '') ? stored.accent : DEFAULT_SETTINGS.accent,
      temperature: Number.isFinite(stored.temperature) ? Math.min(2, Math.max(0, stored.temperature)) : DEFAULT_SETTINGS.temperature,
      maxTokens: Number.isFinite(stored.maxTokens) ? Math.min(8192, Math.max(128, stored.maxTokens)) : DEFAULT_SETTINGS.maxTokens,
      systemPrompt: typeof stored.systemPrompt === 'string' ? stored.systemPrompt.slice(0, 4000) : '',
      model: typeof stored.model === 'string' ? stored.model : '',
      timezone,
      voice: typeof stored.voice === 'string' ? stored.voice : '',
      speechRate: Number.isFinite(stored.speechRate) ? Math.min(1.3, Math.max(0.7, stored.speechRate)) : DEFAULT_SETTINGS.speechRate,
      accessToken: typeof stored.accessToken === 'string' ? stored.accessToken.slice(0, 256) : '',
    };
  } catch (error) {
    settingsStorageWarning = `Configurações salvas inválidas ou indisponíveis: ${error.message}`;
    return { ...DEFAULT_SETTINGS };
  }
}

function readProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return {
      username: typeof stored.username === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(stored.username)
        ? stored.username
        : DEFAULT_PROFILE.username,
      displayName: typeof stored.displayName === 'string' && stored.displayName.trim()
        ? stored.displayName.trim().slice(0, 60)
        : DEFAULT_PROFILE.displayName,
      avatarPreset: Object.hasOwn(AVATAR_PRESETS, stored.avatarPreset)
        ? stored.avatarPreset
        : DEFAULT_PROFILE.avatarPreset,
    };
  } catch (error) {
    settingsStorageWarning = `Perfil local inválido ou indisponível: ${error.message}`;
    return { ...DEFAULT_PROFILE };
  }
}

function applySettings(value) {
  const automaticLight = value.theme === 'auto'
    && window.matchMedia?.('(prefers-color-scheme: light)').matches;
  document.body.classList.toggle('light', value.theme === 'light' || automaticLight);
  document.body.classList.toggle('rgb', value.theme === 'rgb');
  document.documentElement.style.setProperty('--accent', value.accent);
  document.documentElement.style.setProperty('--accent-strong', value.accent);
  document.documentElement.style.setProperty(
    '--wallpaper-image',
    wallpaperImage ? `url("${wallpaperImage}")` : 'none',
  );
  updateClock();
}

function renderProfileAvatar(container, fallback, image, profileData, imageData) {
  fallback.textContent = imageData
    ? ''
    : AVATAR_PRESETS[profileData.avatarPreset] || profileData.displayName.trim().charAt(0).toUpperCase();
  image.hidden = !imageData;
  if (imageData) image.src = imageData;
  else image.removeAttribute('src');
  container.title = `${profileData.displayName} (@${profileData.username})`;
}

function updateProfilePresentation() {
  const headerAvatar = document.querySelector('#profile-avatar');
  const headerFallback = document.querySelector('#profile-avatar-fallback');
  const headerImage = document.querySelector('#profile-avatar-image');
  renderProfileAvatar(headerAvatar, headerFallback, headerImage, profile, profileAvatarImage);
  document.querySelector('#profile-button-name').textContent = profile.displayName;
  document.querySelector('#profile-preview-name').textContent = profile.displayName;
  renderProfileAvatar(
    document.querySelector('#profile-preview-avatar'),
    document.querySelector('#profile-preview-fallback'),
    document.querySelector('#profile-preview-image'),
    profile,
    profileAvatarImage,
  );
  for (const avatar of document.querySelectorAll('.message.user .avatar')) {
    avatar.replaceChildren();
    avatar.classList.toggle('has-profile-photo', Boolean(profileAvatarImage));
    if (profileAvatarImage) {
      const image = document.createElement('img');
      image.src = profileAvatarImage;
      image.alt = '';
      avatar.append(image);
    } else {
      avatar.textContent =
        AVATAR_PRESETS[profile.avatarPreset] || profile.displayName.trim().charAt(0).toUpperCase();
    }
  }
}

function renderProfileDraft() {
  const draftProfile = {
    username: document.querySelector('#profile-username').value || profile.username,
    displayName: document.querySelector('#profile-display-name').value || profile.displayName,
    avatarPreset: document.querySelector('#profile-avatar-preset').value,
  };
  renderProfileAvatar(
    document.querySelector('#profile-preview-avatar'),
    document.querySelector('#profile-preview-fallback'),
    document.querySelector('#profile-preview-image'),
    draftProfile,
    profileDraftAvatarImage,
  );
  document.querySelector('#profile-preview-name').textContent = draftProfile.displayName;
}

function populateProfileForm() {
  document.querySelector('#profile-display-name').value = profile.displayName;
  document.querySelector('#profile-username').value = profile.username;
  document.querySelector('#profile-avatar-preset').value = profile.avatarPreset;
  document.querySelector('#profile-accent').value = settings.accent;
  profileDraftAvatarImage = profileAvatarImage;
  profileAvatarChanged = false;
  document.querySelector('#profile-photo').value = '';
  document.querySelector('#profile-status').textContent = '';
  document.querySelector('#profile-status').classList.remove('profile-status-error');
  renderProfileDraft();
}

async function compressProfileImage(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Este navegador não oferece processamento de imagens local.');
  }
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = (bitmap.width - side) / 2;
    const sourceY = (bitmap.height - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível preparar a foto no navegador.');
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, 256, 256);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Não foi possível comprimir a foto de perfil.'));
      }, 'image/webp', 0.82);
    });
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a foto de perfil.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap.close();
  }
}

async function saveProfileChanges() {
  const nextProfile = {
    username: document.querySelector('#profile-username').value.trim(),
    displayName: document.querySelector('#profile-display-name').value.trim(),
    avatarPreset: document.querySelector('#profile-avatar-preset').value,
  };
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,29}$/.test(nextProfile.username)) {
    throw new Error('O nome de usuário deve ter de 3 a 30 caracteres e começar com letra ou número.');
  }
  if (!nextProfile.displayName || nextProfile.displayName.length > 60) {
    throw new Error('Informe um nome de exibição com até 60 caracteres.');
  }
  if (!Object.hasOwn(AVATAR_PRESETS, nextProfile.avatarPreset)) {
    throw new Error('Selecione um avatar disponível.');
  }

  const previousProfile = profile;
  const previousImage = profileAvatarImage;
  const previousSettings = settings;
  let imageWritten = false;
  let profileWritten = false;
  try {
    if (profileAvatarChanged) {
      await mediaOperation('readwrite', (store) => (
        profileDraftAvatarImage
          ? store.put(profileDraftAvatarImage, 'profile-avatar')
          : store.delete('profile-avatar')
      ));
      imageWritten = true;
    }
    localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
    profileWritten = true;
    saveSettings({ ...settings, accent: document.querySelector('#profile-accent').value });
  } catch (error) {
    const restoreErrors = [];
    if (profileWritten) {
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(previousProfile));
      } catch (restoreError) {
        restoreErrors.push(`perfil: ${restoreError.message}`);
      }
    }
    if (imageWritten) {
      try {
        await mediaOperation('readwrite', (store) => (
          previousImage ? store.put(previousImage, 'profile-avatar') : store.delete('profile-avatar')
        ));
      } catch (restoreError) {
        restoreErrors.push(`foto: ${restoreError.message}`);
      }
    }
    if (settings !== previousSettings) {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(previousSettings));
        settings = previousSettings;
        applySettings(settings);
      } catch (restoreError) {
        restoreErrors.push(`configurações: ${restoreError.message}`);
      }
    }
    if (restoreErrors.length) {
      throw new Error(`Falha ao salvar (${error.message}); rollback incompleto (${restoreErrors.join('; ')}).`);
    }
    throw new Error(`Não foi possível salvar o perfil neste navegador: ${error.message}`);
  }
  profile = nextProfile;
  profileAvatarImage = profileDraftAvatarImage;
  profileAvatarChanged = false;
  updateProfilePresentation();
}

function saveSettings(value) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  settings = value;
  applySettings(settings);
  window.jarvesAutoSave?.markSaved('Configurações salvas');
}

function saveLastConversation(id) {
  try {
    if (id) localStorage.setItem('jarves-last-conversation', id);
    else localStorage.removeItem('jarves-last-conversation');
  } catch (error) {
    showToast(`Não foi possível lembrar a última conversa neste navegador: ${error.message}`);
  }
}

function saveUiPreferences() {
  window.jarvesAutoSave?.schedule('ui-preferences', {
    taskMode: taskModeSelect.value,
    fastMode: fastModeToggle.checked,
    useMemory: document.querySelector('#use-memory').checked,
  });
}

function populateSettingsForm() {
  document.querySelector('#setting-theme').value = settings.theme;
  document.querySelector('#setting-accent').value = settings.accent;
  document.querySelector('#setting-temperature').value = settings.temperature;
  document.querySelector('#setting-max-tokens').value = settings.maxTokens;
  document.querySelector('#setting-system-prompt').value = settings.systemPrompt;
  document.querySelector('#setting-access-token').value = settings.accessToken;
  document.querySelector('#setting-timezone').value = settings.timezone;
  document.querySelector('#temperature-value').value = settings.temperature.toFixed(1);
  document.querySelector('#temperature-value').textContent = settings.temperature.toFixed(1);
  document.querySelector('#tokens-value').value = `${settings.maxTokens} tokens`;
  document.querySelector('#tokens-value').textContent = `${settings.maxTokens} tokens`;
  document.querySelector('#setting-speech-rate').value = settings.speechRate;
  document.querySelector('#speech-rate-value').textContent = `${settings.speechRate.toFixed(1)}×`;
  populateSpeechVoices();
}

function readSettingsForm() {
  return {
    ...settings,
    theme: document.querySelector('#setting-theme').value,
    accent: document.querySelector('#setting-accent').value,
    temperature: Number(document.querySelector('#setting-temperature').value),
    maxTokens: Number(document.querySelector('#setting-max-tokens').value),
    systemPrompt: document.querySelector('#setting-system-prompt').value.trim(),
    timezone: document.querySelector('#setting-timezone').value,
    voice: document.querySelector('#setting-voice').value,
    speechRate: Number(document.querySelector('#setting-speech-rate').value),
    accessToken: document.querySelector('#setting-access-token').value.trim(),
  };
}

function openMediaDatabase() {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(WALLPAPER_DB, 2);
    opening.onupgradeneeded = () => {
      const database = opening.result;
      if (!database.objectStoreNames.contains('images')) database.createObjectStore('images');
      if (!database.objectStoreNames.contains('drafts')) database.createObjectStore('drafts');
      if (!database.objectStoreNames.contains('backups')) database.createObjectStore('backups');
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error || new Error('Não foi possível abrir o armazenamento local.'));
  });
}

async function mediaOperation(mode, action) {
  const database = await openMediaDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction('images', mode);
      const result = action(transaction.objectStore('images'));
      transaction.oncomplete = () => resolve(result?.result);
      transaction.onerror = () => reject(transaction.error || new Error('Falha ao salvar a imagem no dispositivo.'));
      transaction.onabort = () => reject(transaction.error || new Error('Operação local cancelada.'));
    });
  } finally {
    database.close();
  }
}

function updateClock(timezone = settings.timezone) {
  const clock = document.querySelector('#clock-display');
  if (!clock) return;
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    });
    clock.textContent = formatter.format(new Date());
    clock.dateTime = new Date().toISOString();
    clock.title = timezone;
  } catch {
    clock.textContent = '--:--';
  }
}

function populateTimezones() {
  const select = document.querySelector('#setting-timezone');
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const zones = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC', localTimezone];
  if (!zones.includes('UTC')) zones.unshift('UTC');
  if (!zones.includes(localTimezone)) zones.push(localTimezone);
  for (const zone of zones.sort()) select.add(new Option(zone.replaceAll('_', ' '), zone));
  select.value = settings.timezone;
}

function populateSpeechVoices() {
  const select = document.querySelector('#setting-voice');
  if (!select) return;
  const voices = window.speechSynthesis?.getVoices() || [];
  select.replaceChildren(new Option(voices.length ? 'Padrão do dispositivo' : 'Sem voz instalada', ''));
  for (const voice of voices) {
    select.add(new Option(`${voice.name} (${voice.lang})${voice.default ? ' · padrão' : ''}`, voice.voiceURI));
  }
  if (voices.some((voice) => voice.voiceURI === settings.voice)) select.value = settings.voice;
}

function updateClockAndVoices() {
  updateClock();
  populateSpeechVoices();
}

function compressImage(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('Este navegador não oferece processamento de imagens local.');
  }
  return createImageBitmap(file).then((bitmap) => {
    const scale = Math.min(1, 1920 / bitmap.width, 1080 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      throw new Error('Não foi possível preparar a imagem no navegador.');
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Não foi possível comprimir a imagem.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(blob);
      }, 'image/webp', 0.82);
    });
  });
}

async function request(path, options) {
  const headers = new Headers(options?.headers);
  if (settings.accessToken) headers.set('Authorization', 'Bearer ' + settings.accessToken);
  let response;
  try {
    response = await window.jarvesConnectionManager.fetch(path, { ...options, headers });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      const detail = window.jarvesErrorEngine?.explain(error.message, 0, 'API');
      throw new Error(`${detail || 'A leitura da API excedeu o tempo limite.'} Verifique se o servidor está respondendo.`);
    }
    const detail = window.jarvesErrorEngine?.explain(error.message, 0, 'API');
    if (error instanceof TypeError || error.name === 'CircuitOpenError') {
      throw new Error(
        `${detail || error.message || 'Não foi possível conectar à API do JARVES.'} Endereço: ${window.location.origin}. Inicie com ./scripts/run.sh (Linux/macOS) ou python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 (Windows).`,
      );
    }
    throw error;
  }
  let responseText;
  try {
    responseText = await response.text();
  } catch (error) {
    const detail = window.jarvesErrorEngine?.explain(error.message, response.status, 'API');
    throw new Error(detail || `A conexão foi interrompida ao ler a resposta (HTTP ${response.status}).`);
  }
  if (!responseText && response.status !== 204) {
    const detail = window.jarvesErrorEngine?.explain('A API retornou uma resposta vazia.', response.status, 'API');
    throw new Error(detail || `A API retornou uma resposta vazia (HTTP ${response.status}).`);
  }
  let data = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      const detail = window.jarvesErrorEngine?.explain('A API retornou JSON inválido.', response.status, 'API');
      throw new Error(detail || `A API retornou JSON inválido (HTTP ${response.status}).`);
    }
  }
  if (!response.ok) {
    const message = data.detail || `Falha na solicitação (${response.status}).`;
    const detail = window.jarvesErrorEngine?.explain(message, response.status, 'API');
    throw new Error(detail || message);
  }
  return data;
}
window.jarvesRequest = request;

async function streamChat(payload, onToken) {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (settings.accessToken) headers.set('Authorization', 'Bearer ' + settings.accessToken);
  let response;
  try {
    response = await window.jarvesConnectionManager.fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      const detail = window.jarvesErrorEngine?.explain(error.message, 0, 'Chat');
      throw new Error(
        `${detail || 'Não foi possível conectar à API do JARVES.'} Endereço: ${window.location.origin}. Inicie com ./scripts/run.sh (Linux/macOS) ou python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 (Windows).`,
      );
    }
    throw error;
  }
  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch {
      const detail = window.jarvesErrorEngine?.explain('A API retornou JSON inválido.', response.status, 'Chat');
      throw new Error(detail || `A API retornou JSON inválido (HTTP ${response.status}).`);
    }
    const message = data.detail || `Falha na solicitação (${response.status}).`;
    const detail = window.jarvesErrorEngine?.explain(message, response.status, 'Chat');
    throw new Error(detail || message);
  }
  if (!response.body) throw new Error('Este navegador não oferece suporte a respostas em streaming.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completed = null;
  const processEvent = (block) => {
    const data = block.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return;
    const event = JSON.parse(data);
    if (event.type === 'token' && typeof event.text === 'string') onToken(event.text);
    else if (event.type === 'error') throw new Error(event.message || 'Falha ao gerar a resposta.');
    else if (event.type === 'done') completed = event;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop();
      for (const block of blocks) processEvent(block);
      if (done) break;
    }
    if (buffer.trim()) processEvent(buffer);
  } catch (error) {
    window.jarvesErrorEngine?.record(error.message, { source: 'Streaming' });
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (!completed) throw new Error('A conexão terminou antes da conclusão da resposta.');
  return completed;
}

function downloadText(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyText(text) {
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('A cópia não está disponível neste navegador ou origem. Abra o JARVES em localhost ou HTTPS.');
    }
    await navigator.clipboard.writeText(text);
    showToast('Resposta copiada para a área de transferência.');
  } catch (error) {
    showToast(`Não foi possível copiar a resposta: ${error.message}`);
  }
}

function exportTheme() {
  const theme = {
    format: 'jarves-theme',
    version: 1,
    theme: settings.theme,
    accent: settings.accent,
  };
  downloadText('jarves-theme.json', JSON.stringify(theme, null, 2));
  showToast('Tema exportado. Nenhuma credencial ou instrução foi incluída.');
}

async function importTheme(file) {
  if (!file) return;
  if (file.size > 32 * 1024) {
    showToast('O arquivo de tema excede o limite de 32 KB.');
    return;
  }
  try {
    const data = JSON.parse(await file.text());
    if (
      !data
      || typeof data !== 'object'
      || Array.isArray(data)
      || data.format !== 'jarves-theme'
      || data.version !== 1
      || !['auto', 'dark', 'light', 'rgb'].includes(data.theme)
      || typeof data.accent !== 'string'
      || !/^#[0-9a-f]{6}$/i.test(data.accent)
    ) {
      throw new Error('Formato inválido. Use um tema JARVES v1 com aparência e cor válidas.');
    }
    saveSettings({ ...settings, theme: data.theme, accent: data.accent });
    document.querySelector('#setting-theme').value = data.theme;
    document.querySelector('#setting-accent').value = data.accent;
    showToast('Tema importado. As outras preferências e credenciais foram preservadas.');
  } catch (error) {
    showToast(`Não foi possível importar o tema: ${error.message}`);
  }
}

async function downloadSvgAsPng(svg) {
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('O navegador não conseguiu preparar a imagem PNG.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('O navegador não conseguiu converter o SVG para PNG.'));
      }, 'image/png');
    });
    const downloadUrl = URL.createObjectURL(png);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'jarves-imagem.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function showView(viewId) {
  for (const view of document.querySelectorAll('.tab-view')) {
    const active = view.id === viewId;
    view.classList.toggle('active', active);
    view.hidden = !active;
  }
  for (const button of document.querySelectorAll('.tool-nav-button')) {
    button.classList.toggle('active', button.dataset.view === viewId);
  }
  document.querySelector('#sidebar').classList.remove('open');
  if (viewId === 'files-view') refreshFiles();
  if (viewId === 'memory-view') refreshMemories();
  if (viewId === 'html-view') {
    if (!htmlEditorLoaded) {
      htmlEditorLoaded = true;
      const editor = document.querySelector('#html-editor');
      window.jarvesAutoSave?.load('html-editor')
        .then((draft) => {
          if (typeof draft === 'string') editor.value = draft;
          else editor.value = localStorage.getItem(HTML_SOURCE_KEY) || DEFAULT_HTML;
          runHtmlPreview();
        })
        .catch((error) => {
          editor.value = localStorage.getItem(HTML_SOURCE_KEY) || DEFAULT_HTML;
          showToast(`Não foi possível recuperar o código HTML salvo: ${error.message}`);
          runHtmlPreview();
        });
    }
  }
  if (viewId === 'image3d-view') requestAnimationFrame(drawGeneratedMesh);
}

function updateConnectionIndicator() {
  const statusLabel = document.querySelector('#connection-label');
  const statusDot = document.querySelector('#status-dot');
  if (!statusLabel || !statusDot) return;
  if (apiConnectionState === 'offline' || apiConnectionState === 'unreachable') {
    statusLabel.textContent = 'API desconectada · reconectando…';
    statusDot.classList.remove('online');
    statusDot.title = 'O servidor JARVES não respondeu à verificação de conexão.';
    return;
  }
  if (apiConnectionState === 'restricted') {
    statusLabel.textContent = 'API conectada · token necessário';
    statusDot.classList.remove('online');
    statusDot.title = 'O servidor respondeu, mas exige autenticação para este dispositivo.';
    return;
  }
  if (apiConnectionState === 'online') {
    statusLabel.textContent = availableModelCount
      ? `API online · ${availableModelCount} modelo(s)`
      : 'API online · nenhum modelo local';
    statusDot.classList.toggle('online', availableModelCount > 0);
    statusDot.title = 'API do JARVES acessível.';
  }
}

window.addEventListener('jarves:connection-state', (event) => {
  apiConnectionState = event.detail.state;
  updateConnectionIndicator();
});

function sandboxHtml(source) {
  const policy = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; frame-src \'none\';">';
  if (/<head(?:\s[^>]*)?>/i.test(source)) {
    return source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${policy}`);
  }
  return `<!doctype html><html><head>${policy}</head><body>${source}</body></html>`;
}

function runHtmlPreview() {
  const source = document.querySelector('#html-editor').value;
  document.querySelector('#html-preview').srcdoc = sandboxHtml(source);
  window.jarvesAutoSave?.schedule('html-editor', source);
  try {
    localStorage.setItem(HTML_SOURCE_KEY, source);
  } catch {
    showToast('Não foi possível guardar o código HTML neste navegador.');
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAttachmentChips() {
  const container = document.querySelector('#attachment-chips');
  container.replaceChildren();
  for (const [id, file] of selectedFiles) {
    const chip = document.createElement('span');
    chip.className = 'attachment-chip';
    const label = document.createElement('span');
    label.textContent = file.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remover ${file.name} do chat`);
    remove.addEventListener('click', () => {
      selectedFiles.delete(id);
      renderAttachmentChips();
    });
    chip.append(label, remove);
    container.append(chip);
  }
}

function attachFile(file) {
  if (!selectedFiles.has(file.id) && selectedFiles.size >= 5) {
    showToast('O chat aceita até cinco arquivos por mensagem.');
    return;
  }
  selectedFiles.set(file.id, file);
  renderAttachmentChips();
  showView('chat-view');
  messageInput.focus();
}

async function uploadFiles(files, attachToChat = false) {
  for (const file of files) {
    const body = new FormData();
    body.append('upload', file);
    try {
      const saved = await request('/api/files', { method: 'POST', body });
      if (attachToChat) attachFile(saved);
      showToast(`${saved.name} salvo neste dispositivo.`);
    } catch (error) {
      showToast(`${file.name}: ${error.message}`);
    }
  }
  await refreshFiles();
}

async function openFilePreview(id) {
  try {
    activePreviewFile = await request(`/api/files/${encodeURIComponent(id)}`);
    document.querySelector('#file-preview-title').textContent = activePreviewFile.name;
    document.querySelector('#file-preview-content').textContent = activePreviewFile.content;
    filePreviewDialog.showModal();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteFile(id, name) {
  try {
    await request(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' });
    selectedFiles.delete(id);
    renderAttachmentChips();
    showToast(`${name} removido.`);
    await refreshFiles();
  } catch (error) {
    showToast(error.message);
  }
}

async function refreshFiles() {
  const list = document.querySelector('#file-list');
  const empty = document.querySelector('#empty-files');
  try {
    const data = await request('/api/files');
    list.replaceChildren();
    empty.classList.toggle('visible', data.files.length === 0);
    for (const file of data.files) {
      const row = document.createElement('article');
      row.className = 'file-item';
      const info = document.createElement('div');
      info.className = 'file-info';
      const name = document.createElement('strong');
      name.textContent = file.name;
      const meta = document.createElement('small');
      meta.textContent = `${file.file_type.toUpperCase()} · ${formatBytes(file.size_bytes)} · ${file.characters.toLocaleString('pt-BR')} caracteres`;
      info.append(name, meta);
      const actions = document.createElement('div');
      actions.className = 'file-actions';
      const addAction = (label, callback, extraClass = '') => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `file-action ${extraClass}`.trim();
        button.textContent = label;
        button.addEventListener('click', callback);
        actions.append(button);
      };
      addAction('Abrir', () => openFilePreview(file.id));
      addAction('Anexar ao chat', () => attachFile(file));
      if (file.file_type === 'txt') addAction('Corrigir com IA', () => correctTextFile(file));
      addAction('Excluir', () => deleteFile(file.id, file.name), 'danger');
      row.append(info, actions);
      list.append(row);
    }
  } catch (error) {
    empty.classList.add('visible');
    empty.textContent = `Não foi possível carregar os arquivos: ${error.message}`;
  }
}

async function correctTextFile(file) {
  const prompt = `Corrija a ortografia, a gramática e a pontuação do arquivo anexado. Preserve o sentido e a organização. Retorne somente o texto corrigido.`;
  showView('chat-view');
  selectedFiles.clear();
  selectedFiles.set(file.id, file);
  renderAttachmentChips();
  await sendMessage(prompt, { mode: 'chat', fast: false });
}

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    showToast('Leitura em voz alta não é suportada neste navegador.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = settings.speechRate;
  const voice = window.speechSynthesis.getVoices().find((item) => item.voiceURI === settings.voice);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function updateNarrationControls() {
  const hasText = Boolean(document.querySelector('#narration-text').value.trim());
  const speechAvailable = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  document.querySelector('#play-narration').disabled = !hasText || !speechAvailable;
  document.querySelector('#play-video-narration').disabled =
    !hasText || !currentVideoUrl || !speechAvailable;
  const canControl = Boolean(narrationUtterance) && speechAvailable;
  document.querySelector('#pause-narration').disabled = !canControl;
  document.querySelector('#stop-narration').disabled = !canControl && !videoPreview.currentSrc;
  document.querySelector('#narration-length').textContent =
    `${document.querySelector('#narration-text').value.length.toLocaleString('pt-BR')} / 10000`;
}

function populateNarrationVoices() {
  const select = document.querySelector('#narration-voice');
  if (!select) return;
  const currentValue = select.value;
  const voices = window.speechSynthesis?.getVoices() || [];
  const defaultLabel = !('speechSynthesis' in window)
    ? 'Voz não suportada'
    : voices.length
      ? 'Preferência do dispositivo'
      : 'Usar voz padrão do dispositivo';
  select.replaceChildren(new Option(defaultLabel, ''));
  for (const voice of voices) {
    select.add(new Option(`${voice.name} (${voice.lang})${voice.default ? ' · padrão' : ''}`, voice.voiceURI));
  }
  if (voices.some((voice) => voice.voiceURI === currentValue)) {
    select.value = currentValue;
  } else if (voices.some((voice) => voice.voiceURI === settings.voice)) {
    select.value = settings.voice;
  }
}

function startNarration(withVideo) {
  const text = document.querySelector('#narration-text').value.trim();
  const status = document.querySelector('#narration-status');
  if (!text) {
    showToast('Escreva o roteiro antes de iniciar a narração.');
    return;
  }
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    status.textContent = 'A síntese de voz não é suportada neste navegador.';
    showToast('A síntese de voz não é suportada neste navegador.');
    return;
  }

  window.speechSynthesis.cancel();
  narrationUtterance = null;
  videoNarrationActive = withVideo;
  if (withVideo) {
    if (!currentVideoUrl) {
      showToast('Escolha um vídeo antes de iniciar a narração sincronizada.');
      return;
    }
    videoPreview.currentTime = 0;
    videoPreview.play().catch((error) => {
      status.textContent = `Não foi possível reproduzir o vídeo: ${error.message}`;
    });
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = window.speechSynthesis.getVoices().find(
    (voice) => voice.voiceURI === document.querySelector('#narration-voice').value,
  );
  const configuredVoice = window.speechSynthesis.getVoices().find(
    (voice) => voice.voiceURI === settings.voice,
  );
  const voice = selectedVoice || configuredVoice;
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'pt-BR';
  }
  utterance.rate = Number(document.querySelector('#narration-rate').value);
  utterance.volume = Number(document.querySelector('#narration-volume').value);
  narrationUtterance = utterance;
  utterance.onstart = () => {
    status.textContent = withVideo ? 'Vídeo e narração em reprodução.' : 'Narração em reprodução.';
    updateNarrationControls();
  };
  utterance.onend = () => {
    narrationUtterance = null;
    videoNarrationActive = false;
    status.textContent = 'Narração concluída.';
    updateNarrationControls();
  };
  utterance.onerror = (event) => {
    narrationUtterance = null;
    videoNarrationActive = false;
    if (event.error !== 'canceled' && event.error !== 'interrupted') {
      status.textContent = `Erro na síntese de voz: ${event.error}.`;
      showToast(`Não foi possível gerar a voz: ${event.error}.`);
    }
    updateNarrationControls();
  };
  status.textContent = 'Preparando a voz…';
  window.speechSynthesis.speak(utterance);
  updateNarrationControls();
}

function stopNarration() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  narrationUtterance = null;
  videoNarrationActive = false;
  videoPreview.pause();
  if (videoPreview.currentSrc) videoPreview.currentTime = 0;
  document.querySelector('#narration-status').textContent = 'Reprodução parada.';
  updateNarrationControls();
}

function selectVideo(file) {
  if (!file) return;
  const looksLikeVideo = file.type.startsWith('video/')
    || /\.(mp4|m4v|webm|mov|ogv|ogg)$/i.test(file.name);
  if (!looksLikeVideo) {
    showToast('Escolha um arquivo de vídeo compatível.');
    return;
  }
  if (file.size > 250 * 1024 * 1024) {
    showToast('O vídeo deve ter no máximo 250 MB.');
    return;
  }
  if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
  currentVideoUrl = URL.createObjectURL(file);
  videoPreview.src = currentVideoUrl;
  document.querySelector('#video-file-name').textContent =
    `${file.name} · ${formatBytes(file.size)} · arquivo local`;
  document.querySelector('#video-empty').hidden = true;
  document.querySelector('#narration-status').textContent =
    'Vídeo pronto. Escreva o roteiro para iniciar.';
  updateNarrationControls();
}

async function generateArtifact(kind) {
  const prompt = document.querySelector('#artifact-prompt').value.trim();
  const status = document.querySelector('#artifact-status');
  if (!prompt) {
    showToast('Descreva a imagem ou o modelo 3D antes de gerar.');
    return;
  }
  if (!modelSelect.value) {
    showToast('Instale e selecione um modelo no Ollama antes de gerar.');
    return;
  }
  const buttons = [
    document.querySelector('#generate-image'),
    document.querySelector('#generate-3d'),
  ];
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = kind === 'image' ? 'Gerando ilustração SVG…' : 'Gerando malha 3D…';
  try {
    const result = await request(`/api/generate/${kind === 'image' ? 'image' : '3d'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model: modelSelect.value }),
    });
    if (kind === 'image') {
      generatedSvg = result.content;
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      imagePreviewUrl = URL.createObjectURL(
        new Blob([generatedSvg], { type: 'image/svg+xml;charset=utf-8' }),
      );
      const image = document.querySelector('#image-preview');
      image.src = imagePreviewUrl;
      image.hidden = false;
      document.querySelector('#image-empty').hidden = true;
      document.querySelector('#download-svg').hidden = false;
      document.querySelector('#download-png').hidden = false;
      const duration = Number.isFinite(result.generation_seconds)
        ? ` em ${result.generation_seconds.toFixed(1)} s`
        : '';
      const retries = result.attempts > 1 ? ` após ${result.attempts} tentativas` : '';
      status.textContent = `SVG criado localmente com ${result.model}${duration}${retries}.`;
    } else {
      generatedObj = result.content;
      generatedMesh = { vertices: result.vertices, faces: result.faces };
      meshRotationX = -0.45;
      meshRotationY = 0.65;
      meshZoom = 1;
      meshPreview.hidden = false;
      document.querySelector('#mesh-empty').hidden = true;
      document.querySelector('#download-obj').hidden = false;
      requestAnimationFrame(drawGeneratedMesh);
      status.textContent =
        `Modelo OBJ criado com ${result.vertices.length} vértices e ${result.faces.length} faces (${result.model}).`;
    }
  } catch (error) {
    status.textContent = `Falha ao gerar ${kind === 'image' ? 'a imagem' : 'o modelo 3D'}: ${error.message}`;
    showToast(error.message);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function drawGeneratedMesh() {
  if (!generatedMesh || meshPreview.hidden) return;
  const bounds = meshPreview.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  meshPreview.width = Math.round(bounds.width * pixelRatio);
  meshPreview.height = Math.round(bounds.height * pixelRatio);
  const context = meshPreview.getContext('2d');
  if (!context) {
    showToast('O navegador não conseguiu abrir o pré-visualizador 3D.');
    return;
  }
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, bounds.width, bounds.height);
  const vertices = generatedMesh.vertices;
  const center = [0, 1, 2].map((axis) => (
    (Math.min(...vertices.map((vertex) => vertex[axis]))
      + Math.max(...vertices.map((vertex) => vertex[axis]))) / 2
  ));
  const radius = Math.max(
    ...[0, 1, 2].map((axis) => (
      Math.max(...vertices.map((vertex) => vertex[axis]))
      - Math.min(...vertices.map((vertex) => vertex[axis]))
    ) / 2),
    0.001,
  );
  const scale = Math.min(bounds.width, bounds.height) * 0.38 * meshZoom / radius;
  const cosineX = Math.cos(meshRotationX);
  const sineX = Math.sin(meshRotationX);
  const cosineY = Math.cos(meshRotationY);
  const sineY = Math.sin(meshRotationY);
  const projected = vertices.map((vertex) => {
    const x = (vertex[0] - center[0]) / radius;
    const y = (vertex[1] - center[1]) / radius;
    const z = (vertex[2] - center[2]) / radius;
    const rotatedX = x * cosineY - z * sineY;
    const rotatedZ = x * sineY + z * cosineY;
    const rotatedY = y * cosineX - rotatedZ * sineX;
    const depth = y * sineX + rotatedZ * cosineX;
    return {
      x: bounds.width / 2 + rotatedX * scale,
      y: bounds.height / 2 - rotatedY * scale,
      z: depth,
    };
  });
  const orderedFaces = generatedMesh.faces.map((face) => ({
    points: face.map((index) => projected[index]),
  })).filter((face) => face.points.every(Boolean)).map((face) => ({
    ...face,
    depth: face.points.reduce((sum, point) => sum + point.z, 0) / face.points.length,
  })).sort((left, right) => left.depth - right.depth);
  for (const face of orderedFaces) {
    const [a, b, c] = face.points;
    const normal = [
      (b.y - a.y) * (c.z - a.z) - (b.z - a.z) * (c.y - a.y),
      (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z),
      (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x),
    ];
    const normalLength = Math.hypot(...normal) || 1;
    const light = Math.abs((normal[0] - normal[1] + normal[2]) / normalLength);
    const lightness = Math.round(32 + light * 35);
    context.beginPath();
    context.moveTo(face.points[0].x, face.points[0].y);
    for (const point of face.points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.fillStyle = `hsl(258 45% ${lightness}%)`;
    context.strokeStyle = '#d6c9ff';
    context.lineWidth = 0.7;
    context.fill();
    context.stroke();
  }
}

function addMessageTools(item, text, { report = false } = {}) {
  const tools = document.createElement('div');
  tools.className = 'message-tools';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'message-tool';
  copy.textContent = 'Copiar texto';
  copy.addEventListener('click', () => copyText(text));
  const speak = document.createElement('button');
  speak.type = 'button';
  speak.className = 'message-tool';
  speak.textContent = '🔊 Ouvir';
  speak.addEventListener('click', () => speakText(text));
  const download = document.createElement('button');
  download.type = 'button';
  download.className = 'message-tool';
  download.textContent = report ? 'Baixar relatório' : 'Baixar TXT';
  download.addEventListener('click', () => {
    if (report) {
      const generatedAt = new Date().toLocaleString('pt-BR');
      downloadText(
        'jarves-relatorio-bug.md',
        `# Relatório de diagnóstico — JARVES AI\n\nGerado em: ${generatedAt}\n\n${text}\n`,
      );
      return;
    }
    downloadText('jarves-resposta.txt', text);
  });
  tools.append(copy, speak, download);
  item.append(tools);
}

function addSources(item, sources) {
  if (!Array.isArray(sources) || sources.length === 0) return;
  const list = document.createElement('div');
  list.className = 'message-sources';
  const heading = document.createElement('strong');
  heading.textContent = 'Fontes consultadas';
  list.append(heading);
  for (const [index, source] of sources.entries()) {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = `[${index + 1}] ${source.title}`;
    list.append(link);
  }
  item.append(list);
}

function addMessage(role, text, isError = false) {
  const item = document.createElement('article');
  item.className = `message ${role}${isError ? ' error' : ''}`;
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  if (role === 'user' && profileAvatarImage) {
    const image = document.createElement('img');
    image.src = profileAvatarImage;
    image.alt = '';
    avatar.classList.add('has-profile-photo');
    avatar.append(image);
  } else {
    avatar.textContent = role === 'user'
      ? AVATAR_PRESETS[profile.avatarPreset] || profile.displayName.trim().charAt(0).toUpperCase()
      : 'J';
  }
  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = text;
  item.append(avatar, content);
  if (role === 'assistant' && text !== 'Pensando…' && !isError) addMessageTools(item, text);
  messages.append(item);
  welcome.hidden = true;
  messages.classList.add('active');
  messages.scrollIntoView({ block: 'end', behavior: 'smooth' });
  return content;
}

function showWelcome() {
  messages.replaceChildren();
  messages.classList.remove('active');
  welcome.hidden = false;
}

async function refreshMemories() {
  const list = document.querySelector('#memory-list');
  if (!list) return;
  try {
    const search = document.querySelector('#memory-search').value.trim();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request(`/api/memory${query}`);
    list.replaceChildren();
    if (!data.memories.length) {
      const empty = document.createElement('p');
      empty.className = 'error-empty';
      empty.textContent = search ? 'Nenhuma memória corresponde à busca.' : 'Nenhuma memória salva.';
      list.append(empty);
      return;
    }
    for (const memory of data.memories) {
      const row = document.createElement('article');
      row.className = 'error-entry';
      const title = document.createElement('strong');
      title.textContent = memory.label;
      const content = document.createElement('p');
      content.textContent = memory.content;
      const created = document.createElement('time');
      created.dateTime = memory.created_at;
      created.textContent = new Date(memory.created_at).toLocaleString();
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'reset-button';
      remove.textContent = 'Excluir';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Excluir a memória “${memory.label}”?`)) return;
        try {
          await request(`/api/memory/${encodeURIComponent(memory.id)}`, { method: 'DELETE' });
          await refreshMemories();
          document.querySelector('#memory-status').textContent = 'Memória excluída.';
        } catch (error) {
          showToast(error.message);
        }
      });
      row.append(title, content, created, remove);
      list.append(row);
    }
  } catch (error) {
    list.replaceChildren();
    const failure = document.createElement('p');
    failure.className = 'diagnostic-result error';
    failure.textContent = `Não foi possível carregar as memórias: ${error.message}`;
    list.append(failure);
  }
}

async function refreshHistory() {
  try {
    const search = document.querySelector('#history-search').value.trim();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await request(`/api/conversations${query}`);
    historyList.replaceChildren();
    for (const conversation of data.conversations) {
      const row = document.createElement('div');
      row.className = 'history-item';
      const title = document.createElement('span');
      title.className = 'history-title';
      title.textContent = conversation.title;
      title.title = conversation.title;
      title.addEventListener('click', () => loadConversation(conversation.id));
      const rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'rename-chat';
      rename.textContent = '✎';
      rename.setAttribute('aria-label', `Renomear conversa ${conversation.title}`);
      rename.addEventListener('click', async () => {
        const newTitle = window.prompt('Novo nome da conversa:', conversation.title)?.trim();
        if (!newTitle || newTitle === conversation.title) return;
        try {
          await request(`/api/conversations/${encodeURIComponent(conversation.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTitle }),
          });
          await refreshHistory();
        } catch (error) {
          showToast(error.message);
        }
      });
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-chat';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Excluir conversa ${conversation.title}`);
      remove.addEventListener('click', async () => {
        try {
          await request(`/api/conversations/${encodeURIComponent(conversation.id)}`, { method: 'DELETE' });
          if (conversationId === conversation.id) {
            conversationId = null;
            showWelcome();
          }
          await refreshHistory();
        } catch (error) {
          showToast(error.message);
        }
      });
      row.append(title, rename, remove);
      historyList.append(row);
    }
  } catch (error) {
    showToast(error.message);
  }
}

async function loadConversation(id) {
  const generation = ++conversationGeneration;
  isLoadingConversation = true;
  syncComposer();
  try {
    const data = await request(`/api/conversations/${encodeURIComponent(id)}`);
    if (generation !== conversationGeneration) return;
    conversationId = data.conversation.id;
    saveLastConversation(conversationId);
    messages.replaceChildren();
    for (const message of data.messages) addMessage(message.role, message.content);
    welcome.hidden = true;
    messages.classList.add('active');
    document.querySelector('#sidebar').classList.remove('open');
  } catch (error) {
    if (generation === conversationGeneration) showToast(error.message);
  } finally {
    if (generation === conversationGeneration) {
      isLoadingConversation = false;
      syncComposer();
    }
  }
}

async function loadModels() {
  const statusLabel = document.querySelector('#connection-label');
  const statusDot = document.querySelector('#status-dot');
  try {
    const [data, health] = await Promise.all([request('/api/models'), request('/api/status')]);
    availableModelCount = data.models.length;
    modelSelect.replaceChildren();
    if (!data.models.length) {
      modelSelect.add(new Option('Nenhum modelo disponível', ''));
      statusLabel.textContent = 'Ollama desconectado · configure um modelo';
    } else {
      modelSelect.add(new Option('Selecione um modelo local gratuito', ''));
      for (const model of data.models) {
        const remote = model.name.startsWith('openai:');
        const providerLabel = remote ? ' · online (pode cobrar)' : ' · local grátis';
        modelSelect.add(new Option(`${model.display_name || model.name}${providerLabel}`, model.name));
      }
      const localModels = data.models.filter((model) => !model.name.startsWith('openai:'));
      const savedModel = data.models.find((model) => model.name === settings.model);
      const configuredLocalModel = localModels.find((model) => model.name === health.default_model);
      const defaultLocalModel = configuredLocalModel
        || localModels.find((model) => model.name === 'qwen3.5:4b')
        || localModels[0];
      const preferredModel = savedModel?.name || defaultLocalModel?.name || '';
      if (preferredModel && data.models.some((model) => model.name === preferredModel)) {
        modelSelect.value = preferredModel;
        settings.model = preferredModel;
      } else {
        modelSelect.value = '';
        settings.model = '';
      }
      statusLabel.textContent = localModels.length
        ? `${localModels.length} modelo(s) local(is) disponível(is)`
        : 'Instale um modelo local gratuito no Ollama';
      statusDot.classList.add('online');
    }
    if (apiConnectionState === 'checking') apiConnectionState = 'online';
    updateConnectionIndicator();
    updateModelPrivacy();
  } catch (error) {
    const remoteDenied = error.message.includes('Acesso remoto bloqueado');
    modelSelect.replaceChildren(new Option(remoteDenied ? 'Token remoto necessário' : 'Ollama desconectado', ''));
    statusLabel.textContent = remoteDenied ? 'Token necessário para este dispositivo' : 'Ollama desconectado';
    availableModelCount = 0;
    if (remoteDenied) apiConnectionState = 'restricted';
    else if (window.navigator.onLine === false) apiConnectionState = 'offline';
    updateConnectionIndicator();
    statusDot.classList.remove('online');
    if (remoteDenied) showToast(error.message);
  }
}

async function sendMessage(text, { mode = taskModeSelect.value, fast = fastModeToggle.checked } = {}) {
  if (!text.trim() || isSending || isLoadingConversation) return;
  if (!modelSelect.value) {
    showToast('Configure um modelo local ou a API OpenAI no servidor antes de conversar.');
    return;
  }
  if (modelSelect.value.startsWith('openai:') && !openAIConsentAccepted) {
    const accepted = window.confirm(
      'Esta conversa e os arquivos anexados serão enviados à OpenAI. O uso da API pode gerar cobranças na conta. Deseja continuar?',
    );
    if (!accepted) return;
    openAIConsentAccepted = true;
  }
  const taskMode = mode;
  if (
    taskMode === 'research'
    && !window.confirm('Sua pergunta será enviada à Wikipédia em português para buscar fontes. Deseja continuar?')
  ) return;
  const fastMode = fast;
  const pendingTurn = {
    text,
    conversationId,
    mode: taskMode,
    fastMode,
    savedAt: new Date().toISOString(),
  };
  try {
    await window.jarvesAutoSave?.save('chat-pending-turn', pendingTurn);
  } catch (error) {
    showToast(`Não foi possível salvar o rascunho antes do envio: ${error.message}`);
  }
  addMessage('user', text);
  messageInput.value = '';
  messageInput.style.height = 'auto';
  try {
    await window.jarvesAutoSave?.save('chat-composer', {
      text: '',
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    showToast(`Não foi possível atualizar o rascunho local: ${error.message}`);
  }
  const generation = conversationGeneration;
  const fileIds = Array.from(selectedFiles.keys());
  const fileNames = Array.from(selectedFiles.values(), (file) => file.name);
  isSending = true;
  syncComposer();
  const userMessage = fileNames.length ? `${text}\n\n📎 ${fileNames.join(', ')}` : text;
  messages.lastElementChild.querySelector('.message-content').textContent = userMessage;
  const answer = addMessage('assistant', 'Pensando…');
  let streamedText = '';
  try {
    const result = await streamChat({
      message: text,
      conversation_id: conversationId,
      model: modelSelect.value,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
      system_prompt: settings.systemPrompt,
      file_ids: fileIds,
      task_mode: taskMode,
      fast_mode: fastMode,
      use_memory: document.querySelector('#use-memory').checked,
      stream: true,
    }, (token) => {
      streamedText += token;
      answer.textContent = streamedText;
    });
    if (generation === conversationGeneration) {
      conversationId = result.conversation_id;
      saveLastConversation(conversationId);
      addMessageTools(answer.parentElement, streamedText, { report: taskMode === 'bug' });
      addSources(answer.parentElement, result.sources);
      selectedFiles.clear();
      renderAttachmentChips();
    }
    try {
      await window.jarvesAutoSave?.remove('chat-pending-turn');
    } catch (error) {
      showToast(`Resposta salva, mas o rascunho não foi limpo: ${error.message}`);
    }
    await refreshHistory();
  } catch (error) {
    if (generation === conversationGeneration) {
      answer.textContent = streamedText
        ? `${streamedText}\n\n[Erro: ${error.message}]`
        : error.message;
      answer.parentElement.classList.add('error');
      showToast(error.message);
    }
  } finally {
    isSending = false;
    syncComposer();
    messageInput.focus();
  }
}

function updateModelPrivacy() {
  const notice = document.querySelector('#model-privacy');
  if (!modelSelect.value) {
    notice.textContent = 'Instale e selecione um modelo local para usar a IA sem custo de API';
  } else if (modelSelect.value.startsWith('openai:')) {
    notice.textContent = 'OpenAI online · mensagens enviadas ao provedor · pode haver cobrança';
  } else {
    notice.textContent = 'Modelo local grátis · sem assinatura ou cobrança de API';
  }
}

function updateTaskModeHint() {
  const hint = document.querySelector('#task-mode-hint');
  const hints = {
    chat: 'Conversa local com o modelo selecionado.',
    research: 'Pesquisa na Wikipédia em português; a pergunta será enviada à internet.',
    plan: 'Organiza o pedido em objetivo, etapas e checklist.',
    request: 'Entrega o que você pediu, com exemplos ou código quando adequado.',
    bug: 'Gera um relatório de diagnóstico e permite baixá-lo em Markdown.',
  };
  hint.textContent = hints[taskModeSelect.value] || hints.chat;
}

function startVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showToast('Ditado não suportado. Use o teclado ou atualize o navegador.');
    return;
  }
  if (speechRecognition) {
    speechRecognition.stop();
    return;
  }
  const accepted = window.confirm(
    'O ditado usa o serviço de reconhecimento de voz disponibilizado pelo navegador. O áudio pode ser processado pelo fornecedor do navegador. Deseja continuar?',
  );
  if (!accepted) return;
  const recognition = new Recognition();
  speechRecognition = recognition;
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  const button = document.querySelector('#voice-input');
  button.classList.add('listening');
  button.setAttribute('aria-label', 'Parar ditado');
  recognition.addEventListener('result', (event) => {
    const transcript = Array.from(event.results)
      .slice(event.resultIndex)
      .map((result) => result[0].transcript)
      .join(' ')
      .trim();
    if (transcript) {
      messageInput.value = [messageInput.value.trim(), transcript].filter(Boolean).join(' ');
      messageInput.dispatchEvent(new Event('input'));
      messageInput.focus();
    }
  });
  recognition.addEventListener('error', (event) => {
    showToast(`Falha no ditado: ${event.error}.`);
  });
  recognition.addEventListener('end', () => {
    speechRecognition = null;
    button.classList.remove('listening');
    button.setAttribute('aria-label', 'Ditado por voz');
  });
  try {
    recognition.start();
  } catch (error) {
    speechRecognition = null;
    button.classList.remove('listening');
    showToast(`Não foi possível iniciar o ditado: ${error.message}`);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(messageInput.value);
});
document.querySelector('#logic-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#logic-analyze');
  const output = document.querySelector('#logic-report');
  button.disabled = true;
  output.textContent = 'Analisando regras e estrutura do pedido…';
  try {
    const result = await request('/api/logic/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: document.querySelector('#logic-request').value,
        task_mode: document.querySelector('#logic-task-mode').value,
      }),
    });
    output.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    output.textContent = `Análise falhou: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});
taskModeSelect.addEventListener('change', updateTaskModeHint);
taskModeSelect.addEventListener('change', saveUiPreferences);
fastModeToggle.addEventListener('change', saveUiPreferences);
document.querySelector('#use-memory').addEventListener('change', saveUiPreferences);
messageInput.addEventListener('input', () => {
  messageInput.style.height = 'auto';
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 180)}px`;
  window.jarvesAutoSave?.schedule('chat-composer', {
    text: messageInput.value,
    savedAt: new Date().toISOString(),
  });
});
messageInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
document.querySelector('#new-chat').addEventListener('click', () => {
  conversationGeneration += 1;
  isLoadingConversation = false;
  conversationId = null;
  saveLastConversation(null);
  syncComposer();
  showWelcome();
  showView('chat-view');
  document.querySelector('#sidebar').classList.remove('open');
  messageInput.focus();
});
document.querySelector('#history-search').addEventListener('input', () => {
  clearTimeout(historySearchTimer);
  historySearchTimer = setTimeout(refreshHistory, 180);
});
document.querySelector('#theme-toggle').addEventListener('click', () => {
  try {
    saveSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' });
  } catch {
    showToast('Não foi possível salvar as preferências neste navegador.');
  }
});
const profileDialog = document.querySelector('#profile-dialog');
document.querySelector('#open-profile').addEventListener('click', () => {
  populateProfileForm();
  profileDialog.showModal();
});
document.querySelector('#close-profile').addEventListener('click', () => profileDialog.close());
document.querySelector('#cancel-profile').addEventListener('click', () => profileDialog.close());
profileDialog.addEventListener('close', () => {
  profileDraftAvatarImage = profileAvatarImage;
  profileAvatarChanged = false;
  applySettings(settings);
  renderProfileDraft();
});
document.querySelector('#profile-display-name').addEventListener('input', renderProfileDraft);
document.querySelector('#profile-username').addEventListener('input', renderProfileDraft);
document.querySelector('#profile-avatar-preset').addEventListener('change', renderProfileDraft);
document.querySelector('#profile-accent').addEventListener('input', (event) => {
  document.documentElement.style.setProperty('--accent', event.currentTarget.value);
  document.documentElement.style.setProperty('--accent-strong', event.currentTarget.value);
});
document.querySelector('#profile-photo').addEventListener('change', async (event) => {
  const [file] = event.currentTarget.files || [];
  event.currentTarget.value = '';
  if (!file) return;
  const status = document.querySelector('#profile-status');
  try {
    if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) throw new Error('A foto excede o limite de 5 MB.');
    profileDraftAvatarImage = await compressProfileImage(file);
    profileAvatarChanged = true;
    status.textContent = 'Foto preparada localmente; salve o perfil para mantê-la.';
    status.classList.remove('profile-status-error');
    renderProfileDraft();
  } catch (error) {
    status.textContent = `Não foi possível preparar a foto: ${error.message}`;
    status.classList.add('profile-status-error');
  }
});
document.querySelector('#remove-profile-photo').addEventListener('click', () => {
  profileDraftAvatarImage = null;
  profileAvatarChanged = true;
  document.querySelector('#profile-status').textContent = 'A foto será removida quando você salvar.';
  document.querySelector('#profile-status').classList.remove('profile-status-error');
  renderProfileDraft();
});
document.querySelector('#profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const status = document.querySelector('#profile-status');
  if (!formElement.reportValidity()) return;
  const saveButton = formElement.querySelector('[type="submit"]');
  saveButton.disabled = true;
  try {
    await saveProfileChanges();
    status.textContent = 'Perfil salvo somente neste navegador.';
    status.classList.remove('profile-status-error');
    profileDialog.close();
    showToast('Perfil local atualizado.');
  } catch (error) {
    status.textContent = `Não foi possível salvar o perfil: ${error.message}`;
    status.classList.add('profile-status-error');
  } finally {
    saveButton.disabled = false;
  }
});
document.querySelector('#reset-profile').addEventListener('click', async () => {
  if (!window.confirm('Restaurar nome, avatar e cor padrão? A foto salva localmente será removida.')) return;
  document.querySelector('#profile-display-name').value = DEFAULT_PROFILE.displayName;
  document.querySelector('#profile-username').value = DEFAULT_PROFILE.username;
  document.querySelector('#profile-avatar-preset').value = DEFAULT_PROFILE.avatarPreset;
  document.querySelector('#profile-accent').value = DEFAULT_SETTINGS.accent;
  profileDraftAvatarImage = null;
  profileAvatarChanged = true;
  renderProfileDraft();
  try {
    await saveProfileChanges();
    profileDialog.close();
    showToast('Perfil local padrão restaurado.');
  } catch (error) {
    const status = document.querySelector('#profile-status');
    status.textContent = `Não foi possível restaurar o perfil: ${error.message}`;
    status.classList.add('profile-status-error');
  }
});
document.querySelector('#open-settings').addEventListener('click', () => {
  populateSettingsForm();
  settingsDialog.showModal();
});
document.querySelector('#close-settings').addEventListener('click', () => settingsDialog.close());
settingsDialog.addEventListener('close', () => applySettings(settings));
settingsForm.addEventListener('input', () => {
  clearTimeout(settingsSaveTimer);
  window.jarvesAutoSave?.setStatus('Configurações alteradas; salvando…', 'pending');
  settingsSaveTimer = setTimeout(() => {
    try {
      saveSettings(readSettingsForm());
    } catch (error) {
      window.jarvesAutoSave?.setStatus(`Erro ao salvar configurações: ${error.message}`, 'error');
    }
  }, 500);
});
settingsForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearTimeout(settingsSaveTimer);
  try {
    saveSettings(readSettingsForm());
    settingsDialog.close();
    showToast('Preferências do Jarves salvas neste navegador.');
    loadModels();
    refreshHistory();
  } catch {
    showToast('Não foi possível salvar as preferências neste navegador.');
  }
});
document.querySelector('#reset-settings').addEventListener('click', () => {
  document.querySelector('#setting-theme').value = DEFAULT_SETTINGS.theme;
  document.querySelector('#setting-accent').value = DEFAULT_SETTINGS.accent;
  document.querySelector('#setting-temperature').value = DEFAULT_SETTINGS.temperature;
  document.querySelector('#setting-max-tokens').value = DEFAULT_SETTINGS.maxTokens;
  document.querySelector('#setting-system-prompt').value = DEFAULT_SETTINGS.systemPrompt;
  document.querySelector('#setting-access-token').value = DEFAULT_SETTINGS.accessToken;
  document.querySelector('#setting-timezone').value = DEFAULT_SETTINGS.timezone;
  document.querySelector('#setting-voice').value = DEFAULT_SETTINGS.voice;
  document.querySelector('#setting-speech-rate').value = DEFAULT_SETTINGS.speechRate;
  document.querySelector('#temperature-value').textContent = DEFAULT_SETTINGS.temperature.toFixed(1);
  document.querySelector('#tokens-value').textContent = `${DEFAULT_SETTINGS.maxTokens} tokens`;
});
document.querySelector('#setting-temperature').addEventListener('input', (event) => {
  document.querySelector('#temperature-value').textContent = Number(event.target.value).toFixed(1);
});
document.querySelector('#setting-max-tokens').addEventListener('input', (event) => {
  document.querySelector('#tokens-value').textContent = `${event.target.value} tokens`;
});
document.querySelector('#export-theme').addEventListener('click', exportTheme);
document.querySelector('#import-theme').addEventListener('click', () => {
  document.querySelector('#theme-file-input').click();
});
document.querySelector('#theme-file-input').addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  event.target.value = '';
  await importTheme(file);
});
document.querySelector('#memory-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const label = document.querySelector('#memory-label');
  const content = document.querySelector('#memory-content');
  const status = document.querySelector('#memory-status');
  try {
    await request('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: label.value, content: content.value }),
    });
    label.value = '';
    content.value = '';
    status.textContent = 'Memória salva neste computador.';
    await refreshMemories();
  } catch (error) {
    status.textContent = `Não foi possível salvar: ${error.message}`;
  }
});
document.querySelector('#memory-search').addEventListener('input', () => {
  clearTimeout(memorySearchTimer);
  memorySearchTimer = setTimeout(refreshMemories, 180);
});
document.querySelector('#export-memory').addEventListener('click', async () => {
  try {
    const data = await request('/api/memory/export');
    downloadText('jarves-memory.json', JSON.stringify(data, null, 2));
    document.querySelector('#memory-status').textContent = 'Memórias exportadas para JSON.';
  } catch (error) {
    showToast(`Falha ao exportar memórias: ${error.message}`);
  }
});
document.querySelector('#import-memory').addEventListener('click', () => {
  document.querySelector('#memory-file-input').click();
});
document.querySelector('#memory-file-input').addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;
  const status = document.querySelector('#memory-status');
  try {
    if (file.size > 256 * 1024) throw new Error('O arquivo excede o limite de 256 KB.');
    const data = JSON.parse(await file.text());
    if (
      !data
      || data.format !== 'jarves-memory'
      || data.version !== 1
      || !Array.isArray(data.items)
      || data.items.length > 100
      || data.items.some((item) => (
        !item
        || typeof item.label !== 'string'
        || item.label.length > 80
        || typeof item.content !== 'string'
        || item.content.length > 4_000
      ))
    ) {
      throw new Error('O arquivo não é uma exportação JARVES Memory v1 válida.');
    }
    if (!window.confirm(`Importar ${data.items.length} memória(s) neste computador?`)) return;
    const result = await request('/api/memory/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: data.items }),
    });
    status.textContent = `${result.imported} memória(s) importada(s).`;
    await refreshMemories();
  } catch (error) {
    status.textContent = `Falha ao importar: ${error.message}`;
  }
});
document.querySelector('#setting-speech-rate').addEventListener('input', (event) => {
  document.querySelector('#speech-rate-value').textContent = `${Number(event.target.value).toFixed(1)}×`;
});
document.querySelector('#setting-wallpaper').addEventListener('change', async (event) => {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;
  if (file.type && !file.type.startsWith('image/')) {
    showToast('Escolha um arquivo de imagem.');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('A foto deve ter no máximo 5 MB.');
    return;
  }
  try {
    const dataUrl = await compressImage(file);
    await mediaOperation('readwrite', (store) => store.put(dataUrl, 'wallpaper'));
    wallpaperImage = dataUrl;
    applySettings(settings);
    showToast('Foto de fundo salva somente neste navegador.');
  } catch (error) {
    showToast(`Não foi possível salvar a foto: ${error.message}`);
  }
});
document.querySelector('#create-custom-model').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const nameInput = document.querySelector('#custom-model-name');
  const promptInput = document.querySelector('#custom-model-prompt');
  const status = document.querySelector('#custom-model-status');
  const name = nameInput.value.trim();
  const systemPrompt = promptInput.value.trim();
  if (!name || !systemPrompt || !modelSelect.value) {
    status.textContent = !modelSelect.value
      ? 'Instale e selecione um modelo-base no Ollama primeiro.'
      : 'Preencha o nome e as instruções do novo modelo.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Criando modelo local no Ollama. Isso pode levar alguns minutos…';
  try {
    const result = await request('/api/models/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        base_model: modelSelect.value,
        system_prompt: systemPrompt,
      }),
    });
    await loadModels();
    modelSelect.value = result.name;
    saveSettings({ ...settings, model: result.name });
    nameInput.value = '';
    status.textContent = `Modelo ${result.name} criado e selecionado.`;
  } catch (error) {
    status.textContent = `Não foi possível criar o modelo: ${error.message}`;
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
});
document.querySelector('#remove-wallpaper').addEventListener('click', async () => {
  try {
    await mediaOperation('readwrite', (store) => store.delete('wallpaper'));
    wallpaperImage = null;
    applySettings(settings);
    showToast('Foto de fundo removida.');
  } catch (error) {
    showToast(`Não foi possível remover a foto: ${error.message}`);
  }
});
document.querySelector('#setting-timezone').addEventListener('change', (event) => updateClock(event.target.value));
modelSelect.addEventListener('change', () => {
  try {
    saveSettings({ ...settings, model: modelSelect.value });
    updateModelPrivacy();
  } catch {
    showToast('Não foi possível salvar o modelo selecionado.');
  }
});
document.querySelector('#mobile-menu').addEventListener('click', () => {
  document.querySelector('#sidebar').classList.toggle('open');
});
document.querySelectorAll('.tool-nav-button').forEach((button) => {
  button.addEventListener('click', () => showView(button.dataset.view));
});
document.querySelector('#attach-file').addEventListener('click', () => document.querySelector('#chat-file-input').click());
document.querySelector('#chat-file-input').addEventListener('change', async (event) => {
  await uploadFiles(Array.from(event.target.files || []), true);
  event.target.value = '';
});
document.querySelector('#library-file-input').addEventListener('change', async (event) => {
  await uploadFiles(Array.from(event.target.files || []));
  event.target.value = '';
});
document.querySelector('#run-html').addEventListener('click', runHtmlPreview);
document.querySelector('#load-html-game').addEventListener('click', () => {
  document.querySelector('#html-editor').value = DEFAULT_GAME_HTML;
  runHtmlPreview();
});
document.querySelector('#html-editor').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    runHtmlPreview();
  }
});
document.querySelector('#download-html').addEventListener('click', () => {
  downloadText('jarves-teste.html', document.querySelector('#html-editor').value);
});
document.querySelector('#video-file-input').addEventListener('change', (event) => {
  const [file] = event.target.files || [];
  event.target.value = '';
  selectVideo(file);
});
document.querySelector('#generate-image').addEventListener('click', () => generateArtifact('image'));
document.querySelector('#generate-3d').addEventListener('click', () => generateArtifact('3d'));
document.querySelector('#download-svg').addEventListener('click', () => {
  if (generatedSvg) downloadText('jarves-imagem.svg', generatedSvg);
});
document.querySelector('#download-png').addEventListener('click', async () => {
  if (!generatedSvg) return;
  const status = document.querySelector('#artifact-status');
  try {
    await downloadSvgAsPng(generatedSvg);
    status.textContent = 'Imagem PNG convertida localmente e baixada.';
  } catch (error) {
    status.textContent = `Falha ao criar PNG: ${error.message}`;
    showToast(error.message);
  }
});
document.querySelector('#download-obj').addEventListener('click', () => {
  if (generatedObj) downloadText('jarves-modelo-3d.obj', generatedObj);
});
meshPreview.addEventListener('pointerdown', (event) => {
  if (!generatedMesh) return;
  meshDragPoint = { x: event.clientX, y: event.clientY };
  meshPreview.setPointerCapture(event.pointerId);
});
meshPreview.addEventListener('pointermove', (event) => {
  if (!meshDragPoint) return;
  meshRotationY += (event.clientX - meshDragPoint.x) * 0.01;
  meshRotationX = Math.max(
    -Math.PI / 2,
    Math.min(Math.PI / 2, meshRotationX + (event.clientY - meshDragPoint.y) * 0.01),
  );
  meshDragPoint = { x: event.clientX, y: event.clientY };
  drawGeneratedMesh();
});
meshPreview.addEventListener('pointerup', () => { meshDragPoint = null; });
meshPreview.addEventListener('pointercancel', () => { meshDragPoint = null; });
meshPreview.addEventListener('wheel', (event) => {
  event.preventDefault();
  meshZoom = Math.max(0.5, Math.min(3, meshZoom * (event.deltaY < 0 ? 1.1 : 0.9)));
  drawGeneratedMesh();
}, { passive: false });
document.querySelector('#narration-text').addEventListener('input', updateNarrationControls);
document.querySelector('#play-narration').addEventListener('click', () => startNarration(false));
document.querySelector('#play-video-narration').addEventListener('click', () => startNarration(true));
document.querySelector('#pause-narration').addEventListener('click', () => {
  const pauseButton = document.querySelector('#pause-narration');
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    if (videoNarrationActive) {
      videoPreview.play().catch((error) => {
        document.querySelector('#narration-status').textContent =
          `A narração retomou, mas o vídeo não: ${error.message}`;
      });
    }
    pauseButton.textContent = '⏸ Pausar';
    document.querySelector('#narration-status').textContent = 'Narração retomada.';
  } else {
    window.speechSynthesis.pause();
    if (videoNarrationActive) videoPreview.pause();
    pauseButton.textContent = '▶ Continuar';
    document.querySelector('#narration-status').textContent = 'Narração pausada.';
  }
});
document.querySelector('#stop-narration').addEventListener('click', stopNarration);
document.querySelector('#narration-rate').addEventListener('input', (event) => {
  document.querySelector('#narration-rate-value').textContent =
    `${Number(event.target.value).toFixed(1)}×`;
});
document.querySelector('#narration-volume').addEventListener('input', (event) => {
  document.querySelector('#narration-volume-value').textContent =
    `${Math.round(Number(event.target.value) * 100)}%`;
});
videoPreview.addEventListener('error', () => {
  const mediaError = videoPreview.error;
  const reason = mediaError ? `código ${mediaError.code}` : 'formato ou codec não suportado';
  document.querySelector('#narration-status').textContent = `Não foi possível abrir o vídeo (${reason}).`;
  showToast(`Este navegador não conseguiu abrir o vídeo (${reason}).`);
});
document.querySelector('#voice-input').addEventListener('click', startVoiceInput);
document.querySelector('#close-file-preview').addEventListener('click', () => filePreviewDialog.close());
document.querySelector('#attach-preview-file').addEventListener('click', () => {
  if (!activePreviewFile) return;
  attachFile(activePreviewFile);
  filePreviewDialog.close();
});
document.querySelector('#download-preview-file').addEventListener('click', () => {
  if (activePreviewFile) downloadText(`${activePreviewFile.name}.txt`, activePreviewFile.content);
});
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = event;
  document.querySelector('#install-app').hidden = false;
});
document.querySelector('#install-app').addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  document.querySelector('#install-app').hidden = true;
});
window.speechSynthesis?.addEventListener('voiceschanged', () => {
  updateClockAndVoices();
  populateNarrationVoices();
});
window.addEventListener('beforeunload', () => {
  if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
});
window.addEventListener('resize', drawGeneratedMesh);
window.matchMedia?.('(prefers-color-scheme: light)').addEventListener('change', () => {
  if (settings.theme === 'auto') applySettings(settings);
});
document.querySelectorAll('.suggestion').forEach((button) => {
  button.addEventListener('click', () => sendMessage(button.dataset.prompt));
});
applySettings(settings);
updateProfilePresentation();
if (settingsStorageWarning) {
  window.jarvesAutoSave?.setStatus(settingsStorageWarning, 'error');
} else {
  window.jarvesAutoSave?.markSaved('Configurações locais carregadas');
}
updateTaskModeHint();
populateTimezones();
populateSettingsForm();
populateNarrationVoices();
updateNarrationControls();
setInterval(updateClock, 1000);
mediaOperation('readonly', (store) => store.get('wallpaper'))
  .then((image) => {
    wallpaperImage = typeof image === 'string' ? image : null;
    applySettings(settings);
  })
  .catch((error) => showToast(`Armazenamento de fotos indisponível: ${error.message}`));
mediaOperation('readonly', (store) => store.get('profile-avatar'))
  .then((image) => {
    if (image !== undefined && image !== null && (
      typeof image !== 'string' || !image.startsWith('data:image/webp;base64,')
    )) {
      throw new Error('A foto salva não está em um formato de imagem reconhecido.');
    }
    profileAvatarImage = typeof image === 'string' ? image : null;
    updateProfilePresentation();
  })
  .catch((error) => {
    document.querySelector('#profile-status').textContent =
      `Não foi possível carregar a foto local: ${error.message}`;
    document.querySelector('#profile-status').classList.add('profile-status-error');
  });
Promise.all([
  window.jarvesAutoSave?.load('chat-composer'),
  window.jarvesAutoSave?.load('chat-pending-turn'),
  window.jarvesAutoSave?.load('html-editor'),
  window.jarvesAutoSave?.load('ui-preferences'),
]).then(([composerDraft, pendingTurn, htmlDraft, uiPreferences]) => {
  if (typeof htmlDraft === 'string') {
    document.querySelector('#html-editor').value = htmlDraft;
    htmlEditorLoaded = true;
  }
  if (composerDraft?.text && !messageInput.value) {
    messageInput.value = composerDraft.text;
    messageInput.dispatchEvent(new Event('input'));
  } else if (pendingTurn?.text && !messageInput.value) {
    messageInput.value = pendingTurn.text;
    messageInput.dispatchEvent(new Event('input'));
    showToast('Um envio interrompido foi recuperado como rascunho. Revise antes de reenviar.');
  }
  if (pendingTurn) {
    window.jarvesAutoSave?.setStatus(
      'Rascunho de mensagem recuperado · revise antes de reenviar',
      'pending',
    );
  }
  if (uiPreferences && typeof uiPreferences === 'object') {
    if (['chat', 'request', 'plan', 'research', 'bug'].includes(uiPreferences.taskMode)) {
      taskModeSelect.value = uiPreferences.taskMode;
      updateTaskModeHint();
    }
    if (typeof uiPreferences.fastMode === 'boolean') fastModeToggle.checked = uiPreferences.fastMode;
    if (typeof uiPreferences.useMemory === 'boolean') {
      document.querySelector('#use-memory').checked = uiPreferences.useMemory;
    }
  }
}).catch((error) => {
  window.jarvesAutoSave?.setStatus(`Não foi possível recuperar os rascunhos: ${error.message}`, 'error');
});
loadModels();
refreshHistory().then(async () => {
  try {
    const lastConversation = localStorage.getItem('jarves-last-conversation');
    if (lastConversation) await loadConversation(lastConversation);
  } catch (error) {
    showToast(`Não foi possível recuperar a última conversa: ${error.message}`);
  }
});
