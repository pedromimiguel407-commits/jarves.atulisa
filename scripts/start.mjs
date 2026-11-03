import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.env.JARVES_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
const host = process.env.JARVES_HOST || '127.0.0.1';
const port = process.env.JARVES_PORT || '8000';

console.log(`Iniciando JARVES AI em http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
console.log('Backend: FastAPI + Uvicorn. Ollama é um serviço separado.');

const child = spawn(python, [
  '-m', 'uvicorn', 'backend.app.main:app',
  '--host', host,
  '--port', port,
], {
  cwd: root,
  env: { ...process.env, PYTHONPATH: [root, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter) },
  stdio: 'inherit',
});

let shuttingDown = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    child.kill(signal);
  });
}
child.on('error', (error) => {
  console.error(`Não foi possível iniciar Python (${python}): ${error.message}`);
  console.error('Instale Python 3.10+ e as dependências: python -m pip install -r requirements.txt');
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
