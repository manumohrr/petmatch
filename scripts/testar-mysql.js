import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// O wrapper funciona no Windows sem depender da sintaxe de variáveis do shell Unix.
const padraoWindows = join(process.env.ProgramFiles || 'C:\\Program Files', 'MySQL', 'MySQL Server 8.0', 'bin', 'mysqld.exe');
const binario = process.env.MYSQLD_PATH || (process.platform === 'win32' && existsSync(padraoWindows) ? padraoWindows : '');

if (!binario) {
  console.error('Defina MYSQLD_PATH com o caminho completo do binário mysqld e execute npm run test:mysql novamente.');
  process.exitCode = 1;
} else {
  // O teste inicializa uma instância isolada e a encerra ao final. Não usa o serviço MySQL80.
  const teste = spawn(process.execPath, ['--test', 'backend/tests/mysql.integration.test.js'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    env: { ...process.env, MYSQL_INTEGRATION: '1', MYSQLD_PATH: binario },
    stdio: 'inherit',
    windowsHide: true,
  });

  teste.on('error', function informarErro() {
    console.error('Não foi possível iniciar o teste isolado do MySQL.');
    process.exitCode = 1;
  });
  teste.on('exit', function propagarResultado(codigo) {
    process.exitCode = codigo ?? 1;
  });
}
