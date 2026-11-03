import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(root, 'tests');
const nodeTests = (await readdir(testsDir))
  .filter((name) => name.endsWith('.mjs'))
  .sort()
  .map((name) => path.join('tests', name));

function run(command, args, label) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32' && command.endsWith('.cmd'),
    });
    child.on('error', (error) => {
      console.error(`[${label}] Não foi possível iniciar ${command}: ${error.message}`);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

if (nodeTests.length) {
  console.log('\n=== Testes JavaScript ===');
  const code = await run(process.execPath, ['--test', ...nodeTests], 'Node');
  if (code !== 0) process.exit(code);
}

console.log('\n=== Testes Python ===');
const candidates = process.env.JARVES_PYTHON
  ? [process.env.JARVES_PYTHON]
  : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
let pythonCode = 1;
for (const python of candidates) {
  const args = python === 'py' ? ['-3', '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'] : ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'];
  pythonCode = await run(python, args, 'Python');
  if (pythonCode !== 1) break;
}
if (pythonCode !== 0) process.exit(pythonCode);
console.log('\nTodos os conjuntos de testes terminaram com sucesso.');
