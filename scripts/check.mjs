import { spawn } from 'node:child_process';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json',
  'desktop/main.cjs',
  'backend/app/main.py',
  'frontend/index.html',
  'frontend/app.js',
  'frontend/styles.css',
  'frontend/manifest.webmanifest',
  'android/settings.gradle',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'tests/test_app.py',
];
const failures = [];
for (const relative of required) {
  try {
    if (!(await stat(path.join(root, relative))).isFile()) failures.push(`Arquivo obrigatório inválido: ${relative}`);
  } catch {
    failures.push(`Arquivo obrigatório ausente: ${relative}`);
  }
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
for (const script of ['start', 'desktop', 'check', 'test', 'build:windows', 'build:linux']) {
  if (!pkg.scripts?.[script]) failures.push(`Script npm ausente: ${script}`);
}
if (pkg.main !== 'desktop/main.cjs') failures.push('package.json main deve apontar para desktop/main.cjs');

const html = await readFile(path.join(root, 'frontend/index.html'), 'utf8');
for (const id of ['chat-form', 'message-input', 'model-select', 'messages', 'history-list', 'settings-dialog']) {
  if (!html.includes(`id="${id}"`)) failures.push(`Elemento essencial ausente na interface: #${id}`);
}
const appJs = await readFile(path.join(root, 'frontend/app.js'), 'utf8');
for (const selector of ["'#chat-form'", "'#message-input'", "'#model-select'"]) {
  if (!appJs.includes(selector)) failures.push(`Seletor esperado não encontrado em frontend/app.js: ${selector}`);
}

async function collect(directory, extensions, result = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name === '.git') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(full, extensions, result);
    else if (extensions.some((extension) => entry.name.endsWith(extension))) result.push(full);
  }
  return result;
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', env: process.env });
    child.on('error', (error) => { console.error(error.message); resolve(1); });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

const jsFiles = await collect(root, ['.js', '.mjs', '.cjs']);
for (const file of jsFiles) {
  const code = await run(process.execPath, ['--check', file]);
  if (code !== 0) failures.push(`Sintaxe JavaScript inválida: ${path.relative(root, file)}`);
}

const python = process.env.JARVES_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const pythonCheck = "import ast,pathlib; files=list(pathlib.Path('backend').rglob('*.py'))+list(pathlib.Path('scripts').glob('*.py')); [ast.parse(p.read_text(encoding='utf-8'), filename=str(p)) for p in files]; print(f'{len(files)} arquivos Python: sintaxe OK')";
const pyCode = await run(python, ['-c', pythonCheck]);
if (pyCode !== 0) failures.push('Não foi possível validar a sintaxe Python; confirme Python instalado.');

if (failures.length) {
  console.error('\nFalhas encontradas:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nVerificação estática concluída: ${jsFiles.length} arquivos JavaScript e interface/estrutura verificadas.`);
}
