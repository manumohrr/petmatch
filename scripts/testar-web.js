// Inicia somente o servidor necessário aos testes e encerra apenas o processo
// que este script criou. Um Expo já aberto pelo professor é preservado.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as aguardar } from 'node:timers/promises';

const pastaProjeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pastaWorkspace = path.resolve(pastaProjeto, '..');
const endereco = 'http://localhost:8081';
const ambiente = {
  ...process.env,
  CI: '1',
  __UNSAFE_EXPO_HOME_DIRECTORY: process.env.__UNSAFE_EXPO_HOME_DIRECTORY || path.join(pastaWorkspace, '.expo-home'),
  npm_config_cache: process.env.npm_config_cache || path.join(pastaWorkspace, '.npm-cache'),
};

async function servidorPronto() {
  try {
    const resposta = await fetch(endereco, { signal: AbortSignal.timeout(1000) });
    await resposta.body?.cancel();
    return resposta.ok;
  } catch {
    return false;
  }
}

function iniciarNode(argumentos) {
  // Sem cmd.exe/npx: podemos encerrar nosso ChildProcess diretamente no Windows.
  return spawn(process.execPath, argumentos, {
    cwd: pastaProjeto,
    env: ambiente,
    stdio: 'inherit',
    windowsHide: true,
  });
}

function esperarSaida(processo) {
  return new Promise(function (resolve, reject) {
    processo.once('error', reject);
    processo.once('exit', function (codigo) { resolve(codigo ?? 1); });
  });
}

let servidor = null;
let testes = null;
try {
  if (!(await servidorPronto())) {
    servidor = iniciarNode(['node_modules/expo/bin/cli', 'start', '--web', '--port', '8081', '--localhost']);
    // Registrar o erro antes de aguardar evita deixar uma falha de spawn sem handler.
    let erroServidor = null;
    servidor.once('error', function (erro) { erroServidor = erro; });
    const limite = Date.now() + 120000;
    while (!(await servidorPronto())) {
      if (erroServidor) throw erroServidor;
      if (servidor.exitCode !== null) throw new Error('O Expo encerrou antes de iniciar os testes.');
      if (Date.now() > limite) throw new Error('O Expo não respondeu em 120 segundos.');
      await aguardar(250);
    }
  }

  testes = iniciarNode(['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)]);
  process.exitCode = await esperarSaida(testes);
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  // O webServer do Playwright reutiliza o Expo aberto acima. Este finally
  // evita depender de taskkill /T, que pode ser bloqueado em ambientes restritos.
  if (testes && testes.exitCode === null) testes.kill();
  if (servidor && servidor.exitCode === null) {
    const encerramento = esperarSaida(servidor);
    servidor.kill();
    await encerramento;
  }
}
