(() => {
  const canvas = document.querySelector('#anime-canvas');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const elements = {
    story: document.querySelector('#anime-story'),
    plan: document.querySelector('#anime-plan'),
    character: document.querySelector('#anime-character'),
    setting: document.querySelector('#anime-setting'),
    scene: document.querySelector('#anime-scene'),
    motion: document.querySelector('#anime-motion'),
    dialogue: document.querySelector('#anime-dialogue'),
    duration: document.querySelector('#anime-duration'),
    durationValue: document.querySelector('#anime-duration-value'),
    planStatus: document.querySelector('#anime-plan-status'),
    renderStatus: document.querySelector('#anime-render-status'),
    planButton: document.querySelector('#anime-generate-plan'),
    previewButton: document.querySelector('#anime-generate-preview'),
    playButton: document.querySelector('#anime-play'),
    htmlExportButton: document.querySelector('#anime-export-html'),
    exportButton: document.querySelector('#anime-export'),
  };
  const PROJECT_KEY = 'anime-project-v1';
  let animationFrame = 0;
  let recording = false;

  function projectData() {
    return {
      format: 'jarves-anime-project',
      version: 1,
      story: elements.story.value,
      plan: elements.plan.value,
      character: elements.character.value,
      setting: elements.setting.value,
      scene: elements.scene.value,
      motion: elements.motion.value,
      dialogue: elements.dialogue.value,
      duration: Number(elements.duration.value),
    };
  }

  function saveDraft() {
    const project = projectData();
    window.jarvesAutoSave?.schedule(PROJECT_KEY, project);
    try {
      localStorage.setItem(`jarves-${PROJECT_KEY}`, JSON.stringify(project));
    } catch (error) {
      elements.renderStatus.textContent =
        `Não foi possível criar a cópia auxiliar local; o salvamento principal continua em IndexedDB: ${error.message}`;
    }
  }

  async function restoreDraft() {
    let project = await window.jarvesAutoSave?.load(PROJECT_KEY);
    if (!project) {
      const saved = localStorage.getItem(`jarves-${PROJECT_KEY}`);
      if (saved) {
        try {
          project = JSON.parse(saved);
          await window.jarvesAutoSave?.save(PROJECT_KEY, project);
        } catch (error) {
          elements.renderStatus.textContent = `Não foi possível migrar o rascunho anterior: ${error.message}`;
        }
      }
    }
    if (!project) return;
    try {
      if (project.format !== 'jarves-anime-project' || project.version !== 1) return;
      for (const key of ['story', 'plan', 'character', 'setting', 'scene', 'motion', 'dialogue']) {
        if (typeof project[key] === 'string') elements[key].value = project[key];
      }
      if (Number.isInteger(project.duration) && project.duration >= 5 && project.duration <= 30) {
        elements.duration.value = String(project.duration);
      }
    } catch (error) {
      elements.renderStatus.textContent = `Rascunho local inválido; crie ou salve um novo projeto. (${error.message})`;
    }
  }

  const SCENES = {
    forest: { name: 'Floresta estrelada', palette: ['#111936', '#514477', '#e58d92'], kind: 'forest' },
    magic: { name: 'Fantasia mágica', palette: ['#20143f', '#69428c', '#f0a8c6'], kind: 'magic' },
    space: { name: 'Espaço', palette: ['#080f2b', '#243e73', '#9d84d5'], kind: 'space' },
    ocean: { name: 'Oceano', palette: ['#06364b', '#16829a', '#76c9bc'], kind: 'ocean' },
    city: { name: 'Cidade', palette: ['#151c38', '#45476d', '#d17ca4'], kind: 'city' },
    desert: { name: 'Deserto', palette: ['#462c42', '#c8756b', '#f0c27b'], kind: 'desert' },
  };
  const MOTION_LABELS = {
    walk: 'caminhada',
    run: 'corrida',
    jump: 'salto',
    fly: 'voo',
    wave: 'aceno',
    dance: 'dança',
    magic: 'magia',
    fall: 'queda',
  };

  function inferScene() {
    if (elements.scene.value !== 'auto') return SCENES[elements.scene.value] || SCENES.forest;
    const text = elements.story.value.toLocaleLowerCase();
    const environments = [
      [SCENES.space, /espaço|espacial|planeta|astronaut|galáx|estrela cadente/],
      [SCENES.ocean, /oceano|mar\b|maré|submar|mergulh|águ|agu|praia/],
      [SCENES.city, /cidade|rua|prédio|predio|arranha|neon/],
      [SCENES.desert, /deserto|areia|duna|oásis|oasis/],
      [SCENES.forest, /floresta|bosque|árvore|arvore/],
    ];
    let latestEnvironment = null;
    for (const [scene, pattern] of environments) {
      const match = pattern.exec(text);
      if (match && (!latestEnvironment || match.index > latestEnvironment.index)) {
        latestEnvironment = { scene, index: match.index };
      }
    }
    if (latestEnvironment) return latestEnvironment.scene;
    if (/magia|mágic|feitic|brux|encant|spell|energia|raio/.test(text)) return SCENES.magic;
    return SCENES.forest;
  }

  function inferMotion() {
    if (elements.motion.value !== 'auto' && MOTION_LABELS[elements.motion.value]) {
      return elements.motion.value;
    }
    const text = elements.story.value.toLocaleLowerCase();
    const actions = [
      ['dance', /danç|danc|dance/],
      ['fly', /voa|voando|voar|voo/],
      ['jump', /pula|pulando|salta|saltando|jump/],
      ['run', /corre|correndo|fug|dispar|run/],
      ['wave', /acen|tchau|cumpriment|wave/],
      ['fall', /cai|caindo|queda|tropeça|tropeca|fall/],
      ['magic', /(?:lança|lanca|conjura|faz|cria|dispara).{0,32}(?:feitiç|feitic|magia|energia|raio)|spellcast/],
    ];
    let latestAction = null;
    for (const [motion, pattern] of actions) {
      const match = pattern.exec(text);
      if (match && (!latestAction || match.index > latestAction.index)) {
        latestAction = { motion, index: match.index };
      }
    }
    if (latestAction) return latestAction.motion;
    if (/magia|mágic|feitic|brux|encant|spell|energia|raio/.test(text)) return 'magic';
    return 'walk';
  }

  function applyPromptInterpretation() {
    const scene = inferScene();
    const motion = inferMotion();
    elements.planStatus.textContent =
      `Interpretação local do texto: ${scene.name} · ${MOTION_LABELS[motion]}. Ajuste ambiente e movimento antes de reproduzir.`;
    saveDraft();
    return { scene, motion };
  }

  function generatePreviewFromPrompt() {
    if (!elements.story.value.trim()) {
      elements.planStatus.textContent = 'Escreva uma descrição antes de gerar a animação.';
      elements.story.focus();
      return;
    }
    const { scene, motion } = applyPromptInterpretation();
    elements.renderStatus.textContent =
      `Prévia local: ${scene.name} · ${MOTION_LABELS[motion]} · regras de texto, sem modelo de vídeo.`;
    playScene(() => {
      elements.renderStatus.textContent =
        `Prévia concluída · ${scene.name} · ${MOTION_LABELS[motion]}. Ajuste os controles ou exporte WebM.`;
    });
  }

  function drawScene(seconds) {
    const { width, height } = canvas;
    const duration = Number(elements.duration.value);
    const progress = Math.min(1, seconds / duration);
    const easedProgress = progress * progress * (3 - 2 * progress);
    const scene = inferScene();
    const motion = inferMotion();
    const phase = seconds * Math.PI * (motion === 'run' || motion === 'dance' ? 8 : 4);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, scene.palette[0]);
    sky.addColorStop(0.7, scene.palette[1]);
    sky.addColorStop(1, scene.palette[2]);
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#fff2bd';
    context.beginPath();
    context.arc(scene.kind === 'space' ? 505 : 510, 86, scene.kind === 'space' ? 34 : 28, 0, Math.PI * 2);
    context.fill();
    for (let index = 0; index < 38; index += 1) {
      const x = (index * 97 + 23) % width;
      const y = (index * 53 + 18) % 205;
      const twinkle = 0.45 + (Math.sin(seconds * 2 + index) + 1) * 0.25;
      context.globalAlpha = twinkle;
      context.fillStyle = '#ffffff';
      context.fillRect(x, y, 2, 2);
    }
    context.globalAlpha = 1;

    const cameraDrift = Math.sin(easedProgress * Math.PI) * 22;
    if (scene.kind === 'ocean') {
      context.fillStyle = 'rgba(7, 45, 70, .72)';
      context.fillRect(0, 220, width, height - 220);
      for (let index = 0; index < 12; index += 1) {
        const x = (index * 71 + Math.sin(seconds + index) * 14 + width) % width;
        const y = 235 + ((index * 37 + seconds * (12 + index % 4)) % 120);
        context.strokeStyle = 'rgba(194, 245, 239, .62)';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(x, y, 3 + index % 4, 0, Math.PI * 2);
        context.stroke();
      }
    } else if (scene.kind === 'city') {
      context.fillStyle = '#20233d';
      context.fillRect(0, 220, width, height - 220);
      for (let index = 0; index < 9; index += 1) {
        const x = index * 76;
        const buildingHeight = 45 + (index * 31) % 80;
        context.fillRect(x, 300 - buildingHeight, 58, buildingHeight + 60);
        context.fillStyle = 'rgba(255, 220, 151, .7)';
        for (let windowIndex = 0; windowIndex < 4; windowIndex += 1) {
          context.fillRect(x + 9 + (windowIndex % 2) * 24, 237 + Math.floor(windowIndex / 2) * 22, 5, 8);
        }
        context.fillStyle = '#20233d';
      }
    } else {
      const ground = scene.kind === 'space' ? '#1d234a' : scene.kind === 'desert' ? '#8b594f' : '#292a4d';
      context.fillStyle = ground;
      context.beginPath();
      context.moveTo(0, 245);
      context.quadraticCurveTo(120 + cameraDrift, 166, 255, 242);
      context.quadraticCurveTo(425 - cameraDrift, 170, width, 231);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.fill();
      context.fillStyle = scene.kind === 'desert' ? '#b9795e' : '#192c37';
      context.beginPath();
      context.moveTo(0, 290);
      context.quadraticCurveTo(190 - cameraDrift, 216, 370, 291);
      context.quadraticCurveTo(540 + cameraDrift, 236, width, 278);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.fill();

      if (scene.kind === 'forest' || scene.kind === 'magic') {
        for (let index = 0; index < 7; index += 1) {
          const x = 35 + index * 92;
          const treeHeight = 38 + (index * 17) % 22;
          context.fillStyle = scene.kind === 'magic' ? '#302649' : '#15252e';
          context.fillRect(x - 3, 304 - treeHeight, 6, treeHeight + 20);
          context.beginPath();
          context.moveTo(x, 267 - treeHeight);
          context.lineTo(x - 22, 305 - treeHeight);
          context.lineTo(x + 22, 305 - treeHeight);
          context.closePath();
          context.fill();
        }
      }
      if (scene.kind === 'space') {
        context.strokeStyle = 'rgba(230, 219, 255, .7)';
        context.lineWidth = 2;
        context.beginPath();
        context.ellipse(505, 86, 47, 13, -0.3, 0, Math.PI * 2);
        context.stroke();
      }
    }

    const characterX = motion === 'wave' || motion === 'magic' || motion === 'dance' ? 320
      : motion === 'jump' ? 260 + easedProgress * 120
        : 120 + easedProgress * (motion === 'run' ? 400 : 350);
    const jump = motion === 'jump' ? Math.abs(Math.sin(progress * Math.PI * 3)) * 74 : 0;
    const falling = motion === 'fall' ? Math.max(0, Math.min(1, (progress - 0.18) / 0.82)) : 0;
    const bob = motion === 'walk' || motion === 'run' || motion === 'dance'
      ? Math.sin(phase) * (motion === 'dance' ? 7 : 4)
      : Math.sin(phase) * 2;
    const legSwing = motion === 'walk' || motion === 'run' || motion === 'dance'
      ? Math.sin(phase) * (motion === 'run' ? 15 : motion === 'dance' ? 18 : 11)
      : 0;
    const centerY = 252 + bob - jump + falling * 40 - (motion === 'fly' ? 52 + Math.sin(phase) * 10 : 0);
    if (motion === 'magic') {
      const orbX = characterX + 42 + Math.cos(seconds * 1.4) * 10;
      const orbY = centerY - 5 + Math.sin(seconds * 1.8) * 14;
      const glow = context.createRadialGradient(orbX, orbY, 2, orbX, orbY, 24);
      glow.addColorStop(0, 'rgba(255, 250, 208, .95)');
      glow.addColorStop(0.35, 'rgba(255, 225, 141, .7)');
      glow.addColorStop(1, 'rgba(237, 163, 255, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(orbX, orbY, 24, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff6c2';
      context.beginPath();
      context.arc(orbX, orbY, 5 + Math.sin(seconds * 4) * 1.2, 0, Math.PI * 2);
      context.fill();
      for (let index = 0; index < 16; index += 1) {
        const angle = seconds * 2 + index * Math.PI / 8;
        const radius = 30 + (index % 4) * 12 + Math.sin(seconds * 3 + index) * 5;
        context.globalAlpha = 0.45 + 0.4 * Math.sin(seconds * 4 + index);
        context.fillStyle = index % 2 ? '#f5bcff' : '#ffe992';
        context.beginPath();
        context.arc(320 + Math.cos(angle) * radius, 250 + Math.sin(angle) * radius, 2 + index % 3, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
    }
    context.save();
    context.translate(characterX, centerY);
    if (motion === 'fall') context.rotate(falling * Math.PI / 2);
    if (motion === 'dance') context.rotate(Math.sin(phase / 2) * 0.14);
    context.lineCap = 'round';
    context.strokeStyle = '#25223a';
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(-5, 47);
    context.lineTo(-8 + legSwing, 71);
    context.moveTo(5, 47);
    context.lineTo(8 - legSwing, 71);
    context.stroke();
    context.fillStyle = '#9876cf';
    context.beginPath();
    context.moveTo(-19, 13);
    context.lineTo(18, 13);
    context.lineTo(23, 53);
    context.lineTo(-24, 53);
    context.closePath();
    context.fill();
    context.strokeStyle = '#f3bd9f';
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(-17, 22);
    context.lineTo(-29, 39 + Math.sin(phase + 1) * 4);
    context.moveTo(17, 22);
    if (motion === 'wave') {
      context.lineTo(28, -10 + Math.sin(phase * 2) * 7);
    } else if (motion === 'magic') {
      context.lineTo(38, -7);
    } else if (motion === 'fly') {
      context.lineTo(37, 16 + Math.sin(phase) * 5);
    } else if (motion === 'dance') {
      context.lineTo(34, 3 + Math.sin(phase) * 9);
    } else {
      context.lineTo(28, 36 - Math.sin(phase + 1) * 4);
    }
    context.stroke();
    context.fillStyle = '#f3bd9f';
    context.beginPath();
    context.ellipse(0, 0, 17, 21, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#392743';
    context.beginPath();
    context.moveTo(-18, -3);
    context.quadraticCurveTo(-17, -31, 4, -25);
    context.quadraticCurveTo(25, -19, 18, 3);
    context.lineTo(9, -8);
    context.lineTo(-10, -5);
    context.closePath();
    context.fill();
    context.fillStyle = '#43315e';
    context.beginPath();
    context.moveTo(-15, -12);
    context.lineTo(-32, 13);
    context.lineTo(-20, 10);
    context.lineTo(-13, 1);
    context.moveTo(3, -20);
    context.lineTo(25, 4);
    context.lineTo(14, 0);
    context.closePath();
    context.fill();
    context.fillStyle = '#38273e';
    context.beginPath();
    context.ellipse(-6, 2, 2, 3, 0, 0, Math.PI * 2);
    context.ellipse(6, 2, 2, 3, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.fillStyle = 'rgba(13, 15, 29, .72)';
    context.fillRect(0, 0, width, 40);
    context.fillStyle = '#fff4dc';
    context.font = 'bold 16px system-ui, sans-serif';
    context.fillText(elements.character.value.trim() || 'Personagem principal', 18, 26, width - 36);
    context.globalAlpha = 0.8;
    context.font = '12px system-ui, sans-serif';
    context.fillText(elements.setting.value.trim() || scene.name, 18, 54, width - 36);
    context.textAlign = 'right';
    context.fillText(`Movimento: ${MOTION_LABELS[motion]}`, width - 18, 26, width - 36);
    context.textAlign = 'left';
    context.globalAlpha = 1;
    context.fillStyle = 'rgba(13, 15, 29, .82)';
    context.fillRect(18, height - 58, width - 36, 42);
    context.fillStyle = '#fff4dc';
    context.font = '13px system-ui, sans-serif';
    const caption = elements.dialogue.value.trim() || elements.story.value.trim() || elements.setting.value.trim();
    const words = caption.split(/\s+/);
    let line = '';
    let lineNumber = 0;
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > width - 62) {
        context.fillText(line, 31, height - 38 + lineNumber * 15, width - 62);
        line = word;
        lineNumber += 1;
        if (lineNumber === 2) break;
      } else {
        line = candidate;
      }
    }
    if (lineNumber < 2 && line) context.fillText(line, 31, height - 38 + lineNumber * 15, width - 62);
  }

  function stopPlayback() {
    cancelAnimationFrame(animationFrame);
    recording = false;
  }

  function playScene(onComplete = () => {}) {
    stopPlayback();
    const startedAt = performance.now();
    const duration = Number(elements.duration.value);
    recording = true;
    const tick = (now) => {
      const elapsed = (now - startedAt) / 1_000;
      drawScene(elapsed);
      if (elapsed < duration && recording) {
        animationFrame = requestAnimationFrame(tick);
      } else {
        stopPlayback();
        drawScene(duration);
        onComplete();
      }
    };
    animationFrame = requestAnimationFrame(tick);
  }

  async function createPlan() {
    const story = elements.story.value.trim();
    if (!story) {
      elements.planStatus.textContent = 'Descreva uma ideia original antes de pedir o storyboard.';
      return;
    }
    if (!document.querySelector('#model-select').value) {
      elements.planStatus.textContent = 'Instale e selecione um modelo local no Ollama.';
      return;
    }
    elements.planButton.disabled = true;
    elements.planStatus.textContent = 'O modelo local está escrevendo o storyboard…';
    try {
      if (!window.jarvesRequest) throw new Error('O cliente de API ainda não foi inicializado.');
      const result = await window.jarvesRequest('/api/anime/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story, model: document.querySelector('#model-select').value }),
      });
      elements.plan.value = result.plan;
      const { scene, motion } = applyPromptInterpretation();
      elements.planStatus.textContent =
        `Storyboard criado por ${result.model} em ${result.generation_seconds} s. Revise o texto; a cena abaixo será animada localmente.`;
      saveDraft();
      const motionLabel = MOTION_LABELS[motion];
      elements.renderStatus.textContent =
        `Cena derivada do texto: ${scene.name} · movimento: ${motionLabel} · animação procedural Canvas 2D.`;
      playScene(() => {
        elements.renderStatus.textContent =
          `Prévia concluída · ${scene.name} · ${motionLabel}. Edite o roteiro ou a descrição para ajustar a cena.`;
      });
    } catch (error) {
      elements.planStatus.textContent = `Falha ao criar storyboard: ${error.message}`;
    } finally {
      elements.planButton.disabled = false;
    }
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]);
  }

  function exportHtmlAnimation() {
    const scene = inferScene();
    const motion = inferMotion();
    const character = elements.character.value.trim() || 'Personagem';
    const caption = elements.dialogue.value.trim() || elements.story.value.trim() || elements.plan.value.trim();
    const setting = elements.setting.value.trim() || scene.name;
    const duration = Math.max(5, Math.min(30, Number(elements.duration.value) || 10));
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Animação: ${escapeHtml(character)}</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { display: grid; min-height: 100vh; margin: 0; place-items: center; padding: 24px; color: #fff; background: #101116; }
    main { width: min(900px, 100%); text-align: center; }
    h1 { margin: 0 0 6px; font-size: clamp(1.3rem, 4vw, 2rem); }
    .setting { margin: 0 0 18px; color: #d3cae5; }
    .stage { --duration: ${duration}s; position: relative; display: grid; min-height: min(58vw, 440px); overflow: hidden; place-items: center; border: 1px solid #ffffff36; border-radius: 20px; background: linear-gradient(180deg, ${scene.palette[0]}, ${scene.palette[1]} 72%, ${scene.palette[2]}); isolation: isolate; }
    .stage::before { position: absolute; z-index: -1; inset: 0; background-image: radial-gradient(#fff 1px, transparent 1.5px); background-size: 41px 37px; opacity: .55; content: ""; animation: twinkle 2s ease-in-out infinite alternate; }
    .ground { position: absolute; right: 0; bottom: 0; left: 0; height: 22%; border-radius: 50% 50% 0 0 / 25% 25% 0 0; background: #10152588; }
    .character { position: relative; display: grid; justify-items: center; gap: 8px; transform-origin: 50% 90%; }
    .person { position: relative; width: 70px; height: 112px; }
    .head { position: absolute; top: 0; left: 20px; width: 30px; height: 30px; border: 2px solid #251b36; border-radius: 50%; background: #ffd6b0; }
    .body { position: absolute; top: 32px; left: 19px; width: 32px; height: 42px; border: 2px solid #251b36; border-radius: 12px 12px 8px 8px; background: #c9a4ff; }
    .arm, .leg { position: absolute; width: 10px; height: 39px; border: 2px solid #251b36; border-radius: 9px; background: #ffd6b0; transform-origin: 50% 8px; }
    .arm { top: 36px; }
    .arm-left { left: 10px; }
    .arm-right { right: 10px; }
    .leg { top: 69px; height: 37px; background: #7261ab; }
    .leg-left { left: 22px; }
    .leg-right { right: 22px; }
    .name { max-width: min(80vw, 420px); padding: 5px 12px; border-radius: 999px; background: #111827aa; font-weight: 700; }
    .caption { min-height: 1.5em; margin: 18px 0 0; color: #fff; }
    .controls { display: flex; justify-content: center; gap: 10px; margin-top: 16px; }
    button { padding: 10px 16px; border: 1px solid #ffffff55; border-radius: 10px; color: #fff; background: #ffffff18; font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #f0a8c6; outline-offset: 3px; }
    .play .character { animation: ${motion} var(--duration) ease-in-out infinite; }
    .play[data-motion="wave"] .character { animation-name: bob; }
    .play[data-motion="walk"] .leg-left, .play[data-motion="walk"] .leg-right, .play[data-motion="run"] .leg-left, .play[data-motion="run"] .leg-right { animation: step .32s ease-in-out infinite alternate; }
    .play[data-motion="run"] .leg-left, .play[data-motion="run"] .leg-right { animation-duration: .16s; }
    .play .leg-right { animation-delay: .16s; }
    .play[data-motion="wave"] .arm-left { animation: wave 1s ease-in-out infinite alternate; }
    .play[data-motion="magic"] .arm { animation: cast .8s ease-in-out infinite alternate; }
    .play[data-motion="dance"] .arm { animation: groove .45s ease-in-out infinite alternate; }
    @keyframes twinkle { to { opacity: .18; transform: scale(1.06); } }
    @keyframes walk { 0%, 100% { transform: translateX(-90px) translateY(0); } 50% { transform: translateX(90px) translateY(-5px); } }
    @keyframes run { 0%, 100% { transform: translateX(-150px) translateY(0); } 50% { transform: translateX(150px) translateY(-12px); } }
    @keyframes jump { 0%, 100% { transform: translateY(20px); } 45%, 60% { transform: translateY(-95px); } }
    @keyframes fly { 0%, 100% { transform: translate(-90px, 35px) rotate(-5deg); } 50% { transform: translate(90px, -65px) rotate(5deg); } }
    @keyframes wave { to { transform: rotate(-120deg); } }
    @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes cast { to { transform: rotate(-55deg); } }
    @keyframes groove { to { transform: rotate(65deg); } }
    @keyframes dance { 0%, 100% { transform: rotate(-12deg) translateY(0); } 50% { transform: rotate(12deg) translateY(-28px); } }
    @keyframes magic { 0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 0 #fff); } 50% { transform: translateY(-30px) scale(1.08); filter: drop-shadow(0 0 22px #fff); } }
    @keyframes fall { 0%, 65%, 100% { transform: rotate(0); } 82% { transform: rotate(75deg) translateX(30px); } }
    @keyframes step { to { transform: rotate(28deg); } }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(character)}</h1>
    <p class="setting">${escapeHtml(setting)}</p>
    <section class="stage play" id="stage" data-motion="${motion}" aria-label="Cena animada: ${escapeHtml(character)}">
      <div class="ground" aria-hidden="true"></div>
      <div class="character" aria-hidden="true">
        <div class="person"><span class="head"></span><span class="body"></span><span class="arm arm-left"></span><span class="arm arm-right"></span><span class="leg leg-left"></span><span class="leg leg-right"></span></div>
        <span class="name">${escapeHtml(character)}</span>
      </div>
    </section>
    <p class="caption">${escapeHtml(caption)}</p>
    <div class="controls"><button type="button" id="replay">Reiniciar animação</button></div>
  </main>
  <script>
    document.querySelector('#replay').addEventListener('click', () => {
      const stage = document.querySelector('#stage');
      stage.classList.remove('play');
      void stage.offsetWidth;
      stage.classList.add('play');
    });
  </script>
</body>
</html>`;
    downloadBlob('jarves-animacao.html', new Blob([html], { type: 'text/html;charset=utf-8' }));
    elements.renderStatus.textContent =
      `Animação HTML exportada · ${scene.name} · ${MOTION_LABELS[motion]} · arquivo independente, sem modelo ou API.`;
  }

  function exportProject() {
    downloadBlob(
      'mine-anime-project.json',
      new Blob([JSON.stringify(projectData(), null, 2)], { type: 'application/json' }),
    );
    elements.renderStatus.textContent = 'Projeto JSON exportado; contém o roteiro editável, não mídia renderizada.';
  }

  async function exportVideo() {
    if (!canvas.captureStream || !window.MediaRecorder) {
      elements.renderStatus.textContent = 'Este navegador não oferece captura de canvas com MediaRecorder.';
      return;
    }
    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      elements.renderStatus.textContent = 'Este navegador não oferece um codec WebM compatível.';
      return;
    }
    elements.exportButton.disabled = true;
    elements.renderStatus.textContent = 'Renderizando a cena animada localmente…';
    const stream = canvas.captureStream(24);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType });
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      elements.renderStatus.textContent = `Não foi possível iniciar a gravação: ${error.message}`;
      elements.exportButton.disabled = false;
      return;
    }
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    recorder.addEventListener('error', (event) => {
      elements.renderStatus.textContent = `Falha durante a renderização: ${event.error?.message || 'erro do gravador'}`;
    });
    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      elements.exportButton.disabled = false;
      if (!chunks.length) {
        elements.renderStatus.textContent = 'Renderização terminou sem dados WebM; nenhum arquivo foi exportado.';
        return;
      }
      const blob = new Blob(chunks, { type: mimeType });
      downloadBlob('mine-anime-scene.webm', blob);
      elements.renderStatus.textContent =
        `WebM renderizado e baixado · ${canvas.width}×${canvas.height} · 24 FPS · ${Math.round(blob.size / 1024)} KB · sem áudio.`;
    }, { once: true });

    recorder.start(250);
    playScene(() => {
      if (recorder.state === 'recording') recorder.stop();
    });
  }

  restoreDraft()
    .catch((error) => {
      elements.renderStatus.textContent = `Não foi possível recuperar o projeto de anime: ${error.message}`;
    })
    .finally(() => {
      elements.durationValue.value = `${elements.duration.value} s`;
      drawScene(0);
    });
  for (const element of [
    elements.story,
    elements.plan,
    elements.character,
    elements.setting,
    elements.scene,
    elements.motion,
    elements.dialogue,
    elements.duration,
  ]) {
    element.addEventListener('input', () => {
      if (element === elements.story) {
        elements.scene.value = 'auto';
        elements.motion.value = 'auto';
      }
      elements.durationValue.value = `${elements.duration.value} s`;
      saveDraft();
      if (!recording) drawScene(0);
    });
  }
  for (const element of [elements.scene, elements.motion]) {
    element.addEventListener('change', () => {
      saveDraft();
      if (!recording) drawScene(0);
    });
  }
  elements.previewButton.addEventListener('click', generatePreviewFromPrompt);
  elements.planButton.addEventListener('click', createPlan);
  elements.playButton.addEventListener('click', () => {
    elements.renderStatus.textContent = `Pré-visualizando cena · ${elements.duration.value} s.`;
    playScene(() => {
      elements.renderStatus.textContent = 'Prévia concluída. Altere os campos para editar e reproduza novamente.';
    });
  });
  elements.htmlExportButton.addEventListener('click', exportHtmlAnimation);
  document.querySelector('#anime-save-project').addEventListener('click', exportProject);
  document.querySelector('#anime-restore-backup').addEventListener('click', async () => {
    try {
      const project = await window.jarvesAutoSave?.restorePrevious(PROJECT_KEY);
      if (!project || project.format !== 'jarves-anime-project' || project.version !== 1) {
        elements.renderStatus.textContent = 'Nenhuma versão anterior válida foi encontrada.';
        return;
      }
      for (const key of ['story', 'plan', 'character', 'setting', 'scene', 'motion', 'dialogue']) {
        if (typeof project[key] === 'string' && elements[key]) elements[key].value = project[key];
      }
      if (Number.isInteger(project.duration) && project.duration >= 5 && project.duration <= 30) {
        elements.duration.value = String(project.duration);
      }
      elements.durationValue.value = `${elements.duration.value} s`;
      drawScene(0);
      elements.renderStatus.textContent = 'Versão anterior restaurada e salva como a versão atual.';
    } catch (error) {
      elements.renderStatus.textContent = `Não foi possível restaurar a versão anterior: ${error.message}`;
    }
  });
  elements.exportButton.addEventListener('click', exportVideo);
})();
