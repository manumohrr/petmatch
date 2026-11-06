
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

// Execute somente quando quiser testar a integração com um MySQL descartável.
// PowerShell:
// $env:MYSQL_INTEGRATION='1'
// $env:MYSQLD_PATH='C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
// node --test backend/tests/mysql.integration.test.js
const habilitado = process.env.MYSQL_INTEGRATION === '1';
const raiz = fileURLToPath(new URL('../../', import.meta.url));
const nomeBanco = 'petmatch_db';

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portaDisponivel() {
  return new Promise((resolve, reject) => {
    const servidor = net.createServer();
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => {
      const porta = servidor.address().port;
      servidor.close(() => resolve(porta));
    });
  });
}

function iniciar(comando, argumentos, ambiente = process.env) {
  const filho = spawn(comando, argumentos, {
    cwd: raiz,
    env: ambiente,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let saida = '';
  let erro = '';
  filho.stdout.on('data', (dados) => { saida += dados.toString(); });
  filho.stderr.on('data', (dados) => { erro += dados.toString(); });

  const terminou = new Promise((resolve, reject) => {
    filho.once('error', reject);
    filho.once('exit', (codigo) => resolve({ codigo, saida, erro }));
  });
  terminou.catch(() => {});
  return { filho, terminou };
}

async function encerrar(processo) {
  if (processo?.filho && processo.filho.exitCode === null) {
    processo.filho.kill();
    await Promise.race([processo.terminou.catch(() => {}), esperar(5000)]);
  }
}

test('PetMatch: autenticação, permissões, animais, favoritos e adoções', {
  skip: !habilitado,
  timeout: 120000,
}, async () => {
  assert.ok(process.env.MYSQLD_PATH, 'Informe MYSQLD_PATH com o caminho do mysqld.exe.');

  const binario = resolve(process.env.MYSQLD_PATH);
  const basedir = dirname(dirname(binario));
  const pastaValidacao = resolve(raiz, '..', '.mysql-validation');
  await mkdir(pastaValidacao, { recursive: true });
  const execucao = await mkdtemp(join(pastaValidacao, 'petmatch-'));
  const dados = join(execucao, 'data');
  const log = join(execucao, 'mysql.log');
  await mkdir(dados);

  let banco;
  let api;
  let conexao;
  let passou = false;
  const resultados = [];

  try {
    const inicializacao = await iniciar(binario, [
      '--no-defaults', '--initialize-insecure',
      '--basedir=' + basedir,
      '--datadir=' + dados,
      '--log-error=' + log,
    ]).terminou;
    assert.equal(inicializacao.codigo, 0, 'Falha ao inicializar o MySQL temporário.');

    const portaBanco = await portaDisponivel();
    assert.notEqual(portaBanco, 3306);

    const argumentosBanco = [
      '--no-defaults',
      '--basedir=' + basedir,
      '--datadir=' + dados,
      '--log-error=' + log,
      '--bind-address=127.0.0.1',
      '--port=' + portaBanco,
      '--mysqlx=OFF',
      '--skip-log-bin',
    ];
    if (process.platform === 'win32') argumentosBanco.push('--no-monitor');
    banco = iniciar(binario, argumentosBanco);

    for (let tentativa = 0; tentativa < 100; tentativa += 1) {
      if (banco.filho.exitCode !== null) {
        assert.fail('O MySQL temporário encerrou antes de iniciar.');
      }
      try {
        conexao = await mysql.createConnection({
          host: '127.0.0.1', port: portaBanco,
          user: 'root', password: '',
          multipleStatements: true, connectTimeout: 500,
        });
        break;
      } catch {
        await esperar(200);
      }
    }
    assert.ok(conexao, 'O MySQL temporário não iniciou a tempo.');

    // Usar o SQL entregue somente na instância descartável.
    await conexao.query(await readFile(join(raiz, 'database', 'petmatch.sql'), 'utf8'));
    resultados.push('Banco temporário PetMatch criado com quatro tabelas.');

    const senhaAdmin = randomBytes(16).toString('hex');
    const senhaOng = randomBytes(16).toString('hex');
    const senhaProtetor = randomBytes(16).toString('hex');

    async function inserirUsuario(nome, email, senha, nivel) {
      const hash = await bcrypt.hash(senha, 10);
      const [resultado] = await conexao.execute(
        'INSERT INTO petmatch_db.usuarios (nome, email, senha, nivel) VALUES (?, ?, ?, ?)',
        [nome, email, hash, nivel]
      );
      return resultado.insertId;
    }

    const adminId = await inserirUsuario('Admin PetMatch', 'admin@example.test', senhaAdmin, 'admin');
    await inserirUsuario('ONG PetMatch', 'ong@example.test', senhaOng, 'ong');
    await inserirUsuario('Protetor PetMatch', 'protetor@example.test', senhaProtetor, 'protetor');

    const portaApi = await portaDisponivel();
    const ambiente = {
      ...process.env,
      DB_HOST: '127.0.0.1',
      DB_PORT: String(portaBanco),
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_NAME: nomeBanco,
      PORT: String(portaApi),
      JWT_SECRET: randomBytes(48).toString('hex'),
    };

    api = iniciar(process.execPath, ['backend/server.js'], ambiente);
    const endereco = 'http://127.0.0.1:' + portaApi;

    let apiPronta = false;
    for (let tentativa = 0; tentativa < 100; tentativa += 1) {
      if (api.filho.exitCode !== null) {
        assert.fail('A API encerrou antes de iniciar.');
      }
      try {
        const resposta = await fetch(endereco);
        if (resposta.status === 200) {
          apiPronta = true;
          break;
        }
      } catch {}
      await esperar(100);
    }
    assert.ok(apiPronta, 'A API não iniciou a tempo.');

    async function requisitar(caminho, metodo = 'GET', token, corpo) {
      const headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      if (corpo !== undefined) headers['Content-Type'] = 'application/json';
      const resposta = await fetch(endereco + caminho, {
        method: metodo,
        headers,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      const texto = await resposta.text();
      let dados;
      try { dados = JSON.parse(texto); } catch { dados = texto; }
      return { status: resposta.status, dados };
    }

    async function autenticar(email, senha, nivel) {
      const resposta = await requisitar('/auth/login', 'POST', undefined, { email, senha });
      assert.equal(resposta.status, 200, `Login de ${nivel}: ${JSON.stringify(resposta.dados)}`);
      assert.equal(resposta.dados.usuario.nivel, nivel);
      assert.equal('senha' in resposta.dados.usuario, false);
      assert.ok(resposta.dados.token);
      return resposta.dados.token;
    }

    const tokenAdmin = await autenticar('admin@example.test', senhaAdmin, 'admin');
    const tokenOng = await autenticar('ong@example.test', senhaOng, 'ong');
    const tokenProtetor = await autenticar('protetor@example.test', senhaProtetor, 'protetor');

    const senhaAdotante = randomBytes(16).toString('hex');
    const cadastro = await requisitar('/auth/cadastro', 'POST', undefined, {
      nome: 'Adotante de teste',
      email: 'adotante@example.test',
      senha: senhaAdotante,
      nivel: 'admin',
    });
    assert.equal(cadastro.status, 201, JSON.stringify(cadastro.dados));
    assert.equal(cadastro.dados.usuario.nivel, 'adotante');
    assert.equal('senha' in cadastro.dados.usuario, false);
    assert.equal((await requisitar('/auth/cadastro', 'POST', undefined, {
      nome: 'Adotante de teste', email: 'adotante@example.test', senha: senhaAdotante,
    })).status, 409);

    const tokenAdotante = await autenticar('adotante@example.test', senhaAdotante, 'adotante');
    const perfil = await requisitar('/auth/me', 'GET', tokenAdotante);
    assert.equal(perfil.status, 200);
    assert.equal(perfil.dados.nivel, 'adotante');
    assert.equal((await requisitar('/usuarios', 'GET', tokenAdotante)).status, 403);
    assert.equal((await requisitar('/usuarios', 'GET', tokenAdmin)).status, 200);
    assert.equal((await requisitar('/usuarios/' + adminId + '/nivel', 'PUT', tokenAdmin, {
      nivel: 'adotante',
    })).status, 400);
    resultados.push('Cadastro, login, JWT, perfil e permissões de administrador validados.');

    const animal = {
      nome: 'Luna', especie: 'Cachorro', raca: 'Sem raça definida',
      idade: 2, unidade_idade: 'anos', porte: 'Médio', sexo: 'Fêmea',
      cidade: 'Santa Cruz do Sul', descricao: 'Animal para teste de adoção.',
      saude: 'Vacinada', foto: 'https://example.test/luna.jpg',
    };

    assert.equal((await requisitar('/animais', 'POST', tokenAdotante, animal)).status, 403);
    const criado = await requisitar('/animais', 'POST', tokenOng, animal);
    assert.equal(criado.status, 201, JSON.stringify(criado.dados));
    const animalId = criado.dados.animal?.id ?? criado.dados.id;
    assert.ok(Number.isSafeInteger(Number(animalId)), 'O cadastro deve retornar o ID do animal.');

    const consulta = await requisitar('/animais/' + animalId, 'GET', tokenAdotante);
    assert.equal(consulta.status, 200);
    assert.equal(consulta.dados.animal?.nome ?? consulta.dados.nome, 'Luna');
    assert.equal((await requisitar('/animais', 'POST', tokenAdotante, animal)).status, 403);

    const alterado = await requisitar('/animais/' + animalId, 'PUT', tokenOng, {
      ...animal, nome: 'Luna atualizada',
    });
    assert.equal(alterado.status, 200, JSON.stringify(alterado.dados));
    assert.equal((await requisitar('/animais/' + animalId, 'PUT', tokenProtetor, animal)).status, 403);
    assert.equal((await requisitar('/animais/' + animalId, 'DELETE', tokenProtetor)).status, 403);
    const outroAnimal = await requisitar('/animais', 'POST', tokenProtetor, { ...animal, nome: 'Pet do protetor' });
    assert.equal(outroAnimal.status, 201);
    const outroId = outroAnimal.dados.animal.id;
    assert.equal((await requisitar('/animais/' + outroId, 'DELETE', tokenProtetor)).status, 200);
    assert.equal((await requisitar('/animais/' + outroId, 'GET', tokenAdotante)).status, 404);
    resultados.push('CRUD e propriedade de animais por ONG e protetor validados.');

    const favorito = await requisitar('/favoritos', 'POST', tokenAdotante, { animal_id: animalId });
    assert.equal(favorito.status, 201, JSON.stringify(favorito.dados));
    assert.equal((await requisitar('/favoritos', 'POST', tokenAdotante, {
      animal_id: animalId,
    })).status, 409);
    const favoritos = await requisitar('/favoritos', 'GET', tokenAdotante);
    assert.equal(favoritos.status, 200);
    assert.ok(Array.isArray(favoritos.dados));
    assert.ok(favoritos.dados.some((item) => Number(item.animal_id) === Number(animalId)));
    assert.equal((await requisitar('/favoritos/' + animalId, 'DELETE', tokenAdotante)).status, 200);
    resultados.push('Favoritos: adicionar, impedir duplicidade, listar e remover.');

    assert.equal((await requisitar('/adocoes', 'POST', tokenOng, {
      animal_id: animalId, mensagem: 'Quero adotar.',
    })).status, 403);
    const pedido = await requisitar('/adocoes', 'POST', tokenAdotante, {
      animal_id: animalId, mensagem: 'Gostaria de conhecer a Luna.',
    });
    assert.equal(pedido.status, 201, JSON.stringify(pedido.dados));
    const adocaoId = pedido.dados.adocao?.id ?? pedido.dados.id;
    assert.ok(Number.isSafeInteger(Number(adocaoId)));
    assert.equal((await requisitar('/adocoes', 'POST', tokenAdotante, {
      animal_id: animalId,
    })).status, 409);
    assert.equal((await requisitar('/adocoes', 'GET', tokenAdotante)).status, 200);
    assert.equal((await requisitar('/adocoes/' + adocaoId + '/status', 'PUT', tokenProtetor, {
      status: 'aprovada',
    })).status, 403);
    assert.equal((await requisitar('/adocoes/' + adocaoId + '/status', 'PUT', tokenOng, {
      status: 'aprovada',
    })).status, 200);

    const [situacao] = await conexao.execute(
      'SELECT status FROM petmatch_db.animais WHERE id = ?', [animalId]
    );
    assert.equal(situacao[0].status, 'adotado');
    resultados.push('Adoção: solicitar, impedir duplicidade, verificar responsável e aprovar.');

    passou = true;
  } finally {
    await encerrar(api);
    if (conexao) {
      try { await conexao.query('SHUTDOWN'); } catch {}
      try { await conexao.end(); } catch {}
    }
    if (banco) {
      await Promise.race([banco.terminou.catch(() => {}), esperar(5000)]);
      await encerrar(banco);
    }
    await writeFile(join(execucao, 'resultado.txt'), [
      'Teste de integração PetMatch: ' + (passou ? 'PASSOU' : 'FALHOU'),
      'Banco temporário isolado, sem acessar o MySQL principal.',
      ...resultados,
    ].join('\n') + '\n');
    console.log('Resultado salvo em: ' + join(execucao, 'resultado.txt'));
  }
});
