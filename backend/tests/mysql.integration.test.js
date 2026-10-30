import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// OPT-IN: este teste inicia outro mysqld e cria seus próprios dados descartáveis.
// Não utiliza backend/.env, credenciais reais, porta 3306 ou o serviço MySQL instalado.
// PowerShell: $env:MYSQL_INTEGRATION='1'; $env:MYSQLD_PATH='C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe'
// Em seguida: node --test backend/tests/mysql.integration.test.js
const habilitado = process.env.MYSQL_INTEGRATION === '1';
const raiz = fileURLToPath(new URL('../../', import.meta.url));

function esperar(ms) {
  return new Promise(function agendar(resolve) { setTimeout(resolve, ms); });
}

async function portaDisponivel(preferida = 0) {
  return new Promise(function verificar(resolve, reject) {
    const servidor = net.createServer();
    servidor.on('error', reject);
    servidor.listen(preferida, '127.0.0.1', function lerPorta() {
      const porta = servidor.address().port;
      servidor.close(function liberar() { resolve(porta); });
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
  filho.stdout.on('data', function capturar(dados) { saida += dados.toString(); });
  filho.stderr.on('data', function capturar(dados) { erro += dados.toString(); });
  const terminou = new Promise(function acompanhar(resolve, reject) {
    filho.once('error', reject);
    filho.once('exit', function finalizar(codigo) { resolve({ codigo, saida, erro }); });
  });
  // O chamador aguarda terminou no momento apropriado, inclusive se o processo falhar cedo.
  terminou.catch(function observarFalha() {});
  return { filho, terminou };
}

async function encerrar(processo) {
  if (processo && processo.filho.exitCode === null) {
    processo.filho.kill();
    await processo.terminou.catch(function ignorarFalha() {});
  }
}

test('MySQL real isolado: SQL, administrador, autenticação, permissões e CRUD HTTP', { skip: !habilitado, timeout: 120000 }, async function validarMySQL() {
  assert.ok(process.env.MYSQLD_PATH, 'Defina MYSQLD_PATH com o caminho do binário mysqld.');
  const binario = resolve(process.env.MYSQLD_PATH);
  const pastaValidacao = resolve(raiz, '..', '.mysql-validation');
  await mkdir(pastaValidacao, { recursive: true });
  const execucao = await mkdtemp(join(pastaValidacao, 'run-'));
  const dados = join(execucao, 'data');
  const log = join(execucao, 'mysql.log');
  await mkdir(dados);
  const basedir = dirname(dirname(binario));
  let banco;
  let api;
  let conexao;
  let sucesso = false;
  const resultados = [];

  try {
    // --no-defaults deve ser o primeiro argumento: nenhum my.ini do serviço será lido.
    const inicializacao = iniciar(binario, ['--no-defaults', '--initialize-insecure', '--basedir=' + basedir, '--datadir=' + dados, '--log-error=' + log]);
    const inicializado = await inicializacao.terminou;
    await writeFile(join(execucao, 'inicializacao.log'), inicializado.saida + inicializado.erro);
    assert.equal(inicializado.codigo, 0, 'A inicialização isolada falhou; confira os logs em .mysql-validation.');

    let portaBanco;
    try { portaBanco = await portaDisponivel(33307); } catch { portaBanco = await portaDisponivel(); }
    assert.notEqual(portaBanco, 3306);
    const argumentosBanco = [
      '--no-defaults', '--basedir=' + basedir, '--datadir=' + dados,
      '--log-error=' + log, '--bind-address=127.0.0.1', '--port=' + portaBanco,
      '--mysqlx=OFF', '--skip-log-bin',
    ];
    // MySQL no Windows cria um monitor por padrão. Sem monitor, kill também encerra
    // o servidor real se a conexão falhar antes de conseguirmos executar SHUTDOWN.
    if (process.platform === 'win32') argumentosBanco.push('--no-monitor');
    banco = iniciar(binario, argumentosBanco);

    let codigoConexao;
    for (let tentativa = 0; tentativa < 100; tentativa += 1) {
      if (banco.filho.exitCode !== null) assert.fail('O mysqld isolado encerrou antes de aceitar conexões.');
      try {
        conexao = await mysql.createConnection({ host: '127.0.0.1', port: portaBanco, user: 'root', password: '', multipleStatements: true, connectTimeout: 500 });
        break;
      } catch (erro) {
        codigoConexao = erro.code;
        await esperar(200);
      }
    }
    assert.ok(conexao, 'O mysqld isolado não ficou pronto no prazo esperado. Código: ' + codigoConexao);
    const sqlInicial = await readFile(join(raiz, 'database', 'loja_jwt.sql'), 'utf8');
    await conexao.query(sqlInicial);
    const [contagem] = await conexao.query('SELECT COUNT(*) AS quantidade FROM loja_jwt.produtos');
    assert.equal(contagem[0].quantidade, 6);
    const demonstracao = [
      { email: 'usuario@loja.com', senha: 'Usuario@123', nivel: 'usuario' },
      { email: 'admin@loja.com', senha: 'Admin@123', nivel: 'admin' },
    ];
    const [contasIniciais] = await conexao.query('SELECT id, nome, email, senha, nivel FROM loja_jwt.usuarios');
    assert.equal(contasIniciais.length, 2);
    for (const contaDemo of demonstracao) {
      const encontrada = contasIniciais.find(function buscar(usuario) { return usuario.email === contaDemo.email; });
      assert.ok(encontrada);
      assert.equal(encontrada.nivel, contaDemo.nivel);
      assert.equal(bcrypt.getRounds(encontrada.senha), 10);
      assert.equal(await bcrypt.compare(contaDemo.senha, encontrada.senha), true);
    }
    // Uma conta já usada mantém nome, senha e nível mesmo se o SQL for reimportado.
    const adminInicial = contasIniciais.find(function buscar(usuario) { return usuario.email === 'admin@loja.com'; });
    const senhaAlterada = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
    await conexao.execute('UPDATE loja_jwt.usuarios SET nome = ?, senha = ?, nivel = ? WHERE id = ?', ['Conta existente preservada', senhaAlterada, 'usuario', adminInicial.id]);
    await conexao.query(sqlInicial);
    const [recontagem] = await conexao.query('SELECT COUNT(*) AS quantidade FROM loja_jwt.produtos');
    assert.equal(recontagem[0].quantidade, 6);
    const [contasReimportadas] = await conexao.query('SELECT id, nome, email, senha, nivel FROM loja_jwt.usuarios');
    assert.equal(contasReimportadas.length, 2);
    for (const original of contasIniciais) {
      const encontrada = contasReimportadas.find(function buscar(usuario) { return usuario.email === original.email; });
      assert.ok(encontrada);
      assert.equal(encontrada.id, original.id);
      assert.equal(encontrada.nome, original.id === adminInicial.id ? 'Conta existente preservada' : original.nome);
      assert.equal(encontrada.senha, original.id === adminInicial.id ? senhaAlterada : original.senha);
      assert.equal(encontrada.nivel, original.id === adminInicial.id ? 'usuario' : original.nivel);
    }
    // Restaurar apenas nesta instância descartável para testar os dois logins demonstrativos.
    await conexao.execute('UPDATE loja_jwt.usuarios SET nome = ?, senha = ?, nivel = ? WHERE id = ?', [adminInicial.nome, adminInicial.senha, adminInicial.nivel, adminInicial.id]);
    resultados.push('SQL real importado duas vezes: 6 produtos e 2 usuários demonstrativos, sem duplicidade; hashes bcrypt custo 10 válidos.');
    resultados.push('Reimportação preservou ID, nome, senha e nível das contas existentes, incluindo uma conta alterada.');

    const portaApi = await portaDisponivel();
    const ambiente = {
      ...process.env,
      DB_HOST: '127.0.0.1', DB_PORT: String(portaBanco), DB_USER: 'root', DB_PASSWORD: '', DB_NAME: 'loja_jwt',
      PORT: String(portaApi), JWT_SECRET: randomBytes(48).toString('hex'),
      ADMIN_NOME: 'Administrador de integração', ADMIN_EMAIL: 'admin.integration@example.test', ADMIN_SENHA: randomBytes(16).toString('hex'),
    };
    const adminCriado = await iniciar(process.execPath, ['backend/scripts/criarAdmin.js'], ambiente).terminou;
    assert.equal(adminCriado.codigo, 0);
    assert.equal(adminCriado.saida.includes('Administrador criado com sucesso'), true);
    const adminRepetido = await iniciar(process.execPath, ['backend/scripts/criarAdmin.js'], ambiente).terminou;
    assert.equal(adminRepetido.codigo, 0);
    assert.equal(adminRepetido.saida.includes('Administrador já cadastrado'), true);
    resultados.push('Script criarAdmin executado duas vezes: criado, depois já cadastrado.');

    api = iniciar(process.execPath, ['backend/server.js'], ambiente);
    const endereco = 'http://127.0.0.1:' + portaApi;
    let apiPronta = false;
    for (let tentativa = 0; tentativa < 100; tentativa += 1) {
      if (api.filho.exitCode !== null) assert.fail('A API isolada encerrou antes de aceitar conexões.');
      try {
        const resposta = await fetch(endereco);
        if (resposta.status === 200) { apiPronta = true; break; }
      } catch {}
      await esperar(100);
    }
    assert.equal(apiPronta, true, 'A API isolada não ficou pronta.');

    async function requisitar(caminho, metodo = 'GET', token, corpo) {
      const headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      if (corpo !== undefined) headers['Content-Type'] = 'application/json';
      const resposta = await fetch(endereco + caminho, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
      return { status: resposta.status, dados: await resposta.json() };
    }

    assert.equal((await requisitar('/produtos')).status, 401);
    for (const contaDemo of demonstracao) {
      const loginDemo = await requisitar('/auth/login', 'POST', undefined, { email: contaDemo.email, senha: contaDemo.senha });
      assert.equal(loginDemo.status, 200);
      assert.equal(loginDemo.dados.usuario.nivel, contaDemo.nivel);
      assert.equal('senha' in loginDemo.dados.usuario, false);
      const tokenDemo = loginDemo.dados.token;
      const perfilDemo = await requisitar('/auth/me', 'GET', tokenDemo);
      assert.equal(perfilDemo.status, 200);
      assert.equal(perfilDemo.dados.nivel, contaDemo.nivel);
      assert.equal((await requisitar('/produtos', 'GET', tokenDemo)).status, 200);
      if (contaDemo.nivel === 'usuario') {
        assert.equal((await requisitar('/produtos', 'POST', tokenDemo, {})).status, 403);
        assert.equal((await requisitar('/usuarios', 'GET', tokenDemo)).status, 403);
      } else {
        const produtoDemo = await requisitar('/produtos', 'POST', tokenDemo, { nome: 'Produto do administrador demonstrativo', descricao: 'Validação do INSERT de usuários', categoria: 'Testes', preco: 10, estoque: 1 });
        assert.equal(produtoDemo.status, 201);
        assert.equal((await requisitar('/produtos/' + produtoDemo.dados.produto.id, 'DELETE', tokenDemo)).status, 200);
        assert.equal((await requisitar('/usuarios', 'GET', tokenDemo)).status, 200);
      }
    }
    resultados.push('Contas do SQL: ambos os logins e /auth/me válidos; usuário consulta e recebe 403 na administração; admin cria/exclui produto e lista usuários.');
    const senhaUsuario = randomBytes(16).toString('hex');
    const conta = { nome: 'Estudante de integração', email: 'estudante.integration@example.test', senha: senhaUsuario, nivel: 'admin' };
    const cadastro = await requisitar('/auth/cadastro', 'POST', undefined, conta);
    assert.equal(cadastro.status, 201);
    assert.equal(cadastro.dados.usuario.nivel, 'usuario');
    assert.equal('senha' in cadastro.dados.usuario, false);
    assert.equal((await requisitar('/auth/cadastro', 'POST', undefined, conta)).status, 409);
    assert.equal((await requisitar('/auth/login', 'POST', undefined, { email: conta.email, senha: randomBytes(16).toString('hex') })).status, 401);
    const loginUsuario = await requisitar('/auth/login', 'POST', undefined, { email: conta.email, senha: senhaUsuario });
    assert.equal(loginUsuario.status, 200);
    const tokenUsuario = loginUsuario.dados.token;
    const payload = jwt.verify(tokenUsuario, ambiente.JWT_SECRET);
    assert.equal(payload.exp - payload.iat, 7200);
    assert.equal('senha' in payload, false);
    assert.equal('senha' in loginUsuario.dados.usuario, false);
    assert.equal((await requisitar('/auth/me', 'GET', tokenUsuario)).dados.id, cadastro.dados.usuario.id);
    assert.equal((await requisitar('/produtos', 'GET', tokenUsuario)).status, 200);
    assert.equal((await requisitar('/produtos', 'POST', tokenUsuario, {})).status, 403);
    assert.equal((await requisitar('/usuarios', 'GET', tokenUsuario)).status, 403);
    resultados.push('Cadastro ignora admin, duplicado 409, login inválido 401, JWT 2h sem senha, /me válido.');
    resultados.push('Matriz real: sem token 401; usuário consulta 200 e administração 403.');

    const loginAdmin = await requisitar('/auth/login', 'POST', undefined, { email: ambiente.ADMIN_EMAIL, senha: ambiente.ADMIN_SENHA });
    assert.equal(loginAdmin.status, 200);
    const tokenAdmin = loginAdmin.dados.token;
    const produto = { nome: 'Produto de integração', descricao: 'Teste real de SQL parametrizado', categoria: 'Testes', preco: 199.90, estoque: 3 };
    const criado = await requisitar('/produtos', 'POST', tokenAdmin, produto);
    assert.equal(criado.status, 201);
    const id = criado.dados.produto.id;
    assert.equal((await requisitar('/produtos/' + id, 'GET', tokenAdmin)).dados.nome, produto.nome);
    const alterado = await requisitar('/produtos/' + id, 'PUT', tokenAdmin, { ...produto, preco: 179.90, estoque: 2 });
    assert.equal(alterado.status, 200);
    assert.equal((await requisitar('/produtos/' + id, 'GET', tokenAdmin)).dados.preco, 179.90);
    // Repetir a mesma atualização também deve retornar sucesso.
    assert.equal((await requisitar('/produtos/' + id, 'PUT', tokenAdmin, { ...produto, preco: 179.90, estoque: 2 })).status, 200);
    assert.equal((await requisitar('/produtos/' + id, 'DELETE', tokenAdmin)).status, 200);
    assert.equal((await requisitar('/produtos/' + id, 'GET', tokenAdmin)).status, 404);
    resultados.push('Administrador: POST 201, GET 200, PUT 200 (incluindo sem mudanças), DELETE 200 e depois 404.');

    const lista = await requisitar('/usuarios', 'GET', tokenAdmin);
    assert.equal(lista.status, 200);
    for (const usuario of lista.dados) assert.equal('senha' in usuario, false);
    assert.equal((await requisitar('/usuarios/' + loginAdmin.dados.usuario.id + '/nivel', 'PUT', tokenAdmin, { nivel: 'usuario' })).status, 400);
    const alvo = cadastro.dados.usuario.id;
    assert.equal((await requisitar('/usuarios/' + alvo + '/nivel', 'PUT', tokenAdmin, { nivel: 'invalido' })).status, 400);
    assert.equal((await requisitar('/usuarios/' + alvo + '/nivel', 'PUT', tokenAdmin, { nivel: 'admin' })).status, 200);
    assert.equal((await requisitar('/auth/me', 'GET', tokenUsuario)).dados.nivel, 'admin');
    assert.equal((await requisitar('/usuarios', 'GET', tokenUsuario)).status, 200);
    assert.equal((await requisitar('/usuarios/' + alvo + '/nivel', 'PUT', tokenAdmin, { nivel: 'usuario' })).status, 200);
    assert.equal((await requisitar('/usuarios', 'GET', tokenUsuario)).status, 403);
    const [hashes] = await conexao.execute('SELECT senha FROM loja_jwt.usuarios WHERE id = ?', [alvo]);
    assert.equal(hashes[0].senha.startsWith('$2'), true);
    assert.notEqual(hashes[0].senha, senhaUsuario);
    resultados.push('Usuários: listagem sem senha, próprio nível 400, nível inválido 400, promoção e rebaixamento imediatos.');
    sucesso = true;
  } finally {
    await encerrar(api);
    if (conexao) {
      // SHUTDOWN só atinge a conexão com a instância criada por este teste.
      try { await conexao.query('SHUTDOWN'); } catch {}
      try { await conexao.end(); } catch {}
    }
    if (banco) {
      await Promise.race([banco.terminou.catch(function observar() {}), esperar(5000)]);
      await encerrar(banco);
    }
    await writeFile(join(execucao, 'resultado.txt'), [
      'Validação MySQL real isolada: ' + (sucesso ? 'PASSOU' : 'FALHOU'),
      'Instância com --no-defaults, dados próprios, bind 127.0.0.1 e porta diferente de 3306.',
      'Segredo JWT e credenciais das contas adicionais gerados somente em memória; tokens e hashes não registrados.',
      'As duas contas demonstrativas do SQL usam as credenciais públicas documentadas para a aula.',
      ...resultados,
      'Processos filhos da API e do MySQL encerrados ao final.',
    ].join('\n') + '\n');
    console.log('Evidência da integração isolada: ' + join(execucao, 'resultado.txt'));
  }
});
