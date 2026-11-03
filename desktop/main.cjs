const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

let backend = null;
let mainWindow = null;
let shuttingDown = false;
let backendUrl = null;

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 8000;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function backendCommand(port) {
  const executable = path.join(
    process.resourcesPath,
    'backend',
    process.platform === 'win32' ? 'JARVESBackend.exe' : 'JARVESBackend',
  );
  const env = {
    ...process.env,
    JARVES_HOST: '127.0.0.1',
    JARVES_PORT: String(port),
    JARVES_DATABASE: path.join(app.getPath('userData'), 'jarves.db'),
  };

  if (app.isPackaged) {
    if (!fs.existsSync(executable)) {
      throw new Error('O backend JARVES não foi incluído no instalador. Recompile pelo workflow Desktop.');
    }
    return { command: executable, args: [], env };
  }

  const python = process.env.JARVES_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  return {
    command: python,
    args: ['-m', 'uvicorn', 'backend.app.main:app', '--host', '127.0.0.1', '--port', String(port)],
    env: { ...env, PYTHONPATH: app.getAppPath() },
  };
}

async function waitForBackend(url, timeoutMs = 45000) {
  const started = Date.now();
  let lastError = 'servidor ainda iniciando';
  while (Date.now() - started < timeoutMs) {
    if (shuttingDown || !backend || backend.exitCode !== null) {
      throw new Error('O processo do backend encerrou antes de ficar pronto.');
    }
    try {
      const response = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
      const data = await response.json();
      if (response.ok && data.status === 'ok' && data.version) return;
      lastError = 'resposta de saúde inválida';
    } catch (error) {
      lastError = error.message;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`O backend não iniciou em tempo hábil: ${lastError}`);
}

function createWindow(url) {
  backendUrl = url;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 360,
    minHeight: 600,
    show: false,
    backgroundColor: '#080d1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith(url)) event.preventDefault();
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function start() {
  try {
    const envDirectory = app.isPackaged ? app.getPath('userData') : app.getAppPath();
    dotenv.config({ path: path.join(envDirectory, '.env') });
    const port = await reservePort();
    const url = `http://127.0.0.1:${port}`;
    const command = backendCommand(port);
    backend = spawn(command.command, command.args, {
      cwd: app.getAppPath(),
      env: command.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    backend.stdout.on('data', (chunk) => console.log(String(chunk).trimEnd()));
    backend.stderr.on('data', (chunk) => console.error(String(chunk).trimEnd()));
    backend.on('error', (error) => console.error('Falha ao iniciar backend:', error.message));
    await waitForBackend(url);
    createWindow(url);
  } catch (error) {
    await dialog.showMessageBox({
      type: 'error',
      title: 'JARVES AI — não foi possível iniciar',
      message: error.message,
      detail: app.isPackaged
        ? 'Verifique se o instalador contém o backend correspondente ao sistema.'
        : 'No modo de desenvolvimento, instale Python 3.10+ e execute: python -m pip install -r requirements.txt',
    });
    app.quit();
  }
}

app.whenReady().then(start);
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendUrl) createWindow(backendUrl);
});
app.on('before-quit', () => {
  shuttingDown = true;
  if (backend && backend.exitCode === null) backend.kill();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
