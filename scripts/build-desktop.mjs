import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (!args.length || !['--win', '--linux'].includes(args[0])) {
  console.error('Uso: node scripts/build-desktop.mjs --win nsis | --linux AppImage');
  process.exit(2);
}
if ((args[0] === '--win') !== (process.platform === 'win32')) {
  console.error('O empacotamento deve ser executado no sistema operacional de destino.');
  process.exit(2);
}
const binary = path.join(root, 'build', 'backend', process.platform === 'win32' ? 'JARVESBackend.exe' : 'JARVESBackend');
try {
  await access(binary);
} catch {
  console.error('Backend empacotado não encontrado:', path.relative(root, binary));
  console.error('Gere-o com PyInstaller antes de empacotar o Electron. O workflow oficial faz essa etapa.');
  process.exit(2);
}
const command = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder';
const child = spawn(command, [...args, '--x64', '--publish', 'never'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
