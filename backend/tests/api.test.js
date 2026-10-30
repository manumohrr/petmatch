import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Estes testes usam HTTP, Express, JWT e bcrypt reais. SOMENTE o pool MySQL é substituído.
// Eles verificam o contrato e a segurança da API, mas não executam SQL em um MySQL real.
process.env.JWT_SECRET = randomBytes(48).toString('hex');
const { default: app } = await import('../app.js');
const { default: pool } = await import('../database/conexao.js');

let servidor;
let base;
let usuarios;
let produtos;
let senhaTeste;
let senhaHash;
let executarOriginal;
let chamadas;

before(async function prepararServidor() {
  senhaTeste = randomBytes(16).toString('hex');
  senhaHash = await bcrypt.hash(senhaTeste, 10);
  executarOriginal = pool.execute;
  pool.execute = executarEmMemoria;
  await new Promise(function iniciar(resolve) {
    servidor = app.listen(0, '127.0.0.1', resolve);
  });
  base = 'http://127.0.0.1:' + servidor.address().port;
});

beforeEach(function reiniciarDados() {
  usuarios = [
    { id: 1, nome: 'Estudante', email: 'estudante@example.test', senha: senhaHash, nivel: 'usuario' },
    { id: 2, nome: 'Administrador', email: 'admin@example.test', senha: senhaHash, nivel: 'admin' },
    { id: 3, nome: 'Outra administradora', email: 'outra@example.test', senha: senhaHash, nivel: 'admin' },
  ];
  produtos = [{ id: 1, nome: 'Mouse', descricao: 'Mouse USB', categoria: 'Periféricos', preco: 49.90, estoque: 8 }];
  chamadas = [];
});

after(async function encerrarServidor() {
  pool.execute = executarOriginal;
  await new Promise(function encerrar(resolve) {
    servidor.close(resolve);
    servidor.closeAllConnections();
  });
  await pool.end();
});

// Mock pequeno dos resultados usados pelos controllers. Não tenta implementar um servidor SQL.
async function executarEmMemoria(sql, parametros = []) {
  chamadas.push({ sql, parametros });
  if (sql.startsWith('SELECT') && sql.includes('FROM usuarios')) {
    let encontrados = usuarios;
    if (sql.includes('WHERE email = ?')) encontrados = usuarios.filter(function porEmail(usuario) { return usuario.email === parametros[0]; });
    if (sql.includes('WHERE id = ?')) encontrados = usuarios.filter(function porId(usuario) { return usuario.id === parametros[0]; });
    const colunas = sql.slice(7, sql.indexOf(' FROM')).split(',').map(function aparar(coluna) { return coluna.trim(); });
    return [encontrados.map(function projetar(usuario) {
      const dados = {};
      for (const coluna of colunas) dados[coluna] = usuario[coluna];
      return dados;
    })];
  }
  if (sql.startsWith('INSERT INTO usuarios')) {
    const [nome, email, senha, nivel] = parametros;
    const id = Math.max(0, ...usuarios.map(function obterId(usuario) { return usuario.id; })) + 1;
    usuarios.push({ id, nome, email, senha, nivel });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (sql.startsWith('UPDATE usuarios')) {
    const usuario = usuarios.find(function porId(item) { return item.id === parametros[1]; });
    if (usuario) usuario.nivel = parametros[0];
    return [{ affectedRows: usuario ? 1 : 0 }];
  }
  if (sql.startsWith('SELECT') && sql.includes('FROM produtos')) {
    const encontrados = sql.includes('WHERE id = ?') ? produtos.filter(function porId(produto) { return produto.id === parametros[0]; }) : produtos;
    return [encontrados.map(function copiar(produto) { return { ...produto }; })];
  }
  if (sql.startsWith('INSERT INTO produtos')) {
    const [nome, descricao, categoria, preco, estoque] = parametros;
    const id = Math.max(0, ...produtos.map(function obterId(produto) { return produto.id; })) + 1;
    produtos.push({ id, nome, descricao, categoria, preco, estoque });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (sql.startsWith('UPDATE produtos')) {
    const [nome, descricao, categoria, preco, estoque, id] = parametros;
    const produto = produtos.find(function porId(item) { return item.id === id; });
    if (produto) Object.assign(produto, { nome, descricao, categoria, preco, estoque });
    return [{ affectedRows: produto ? 1 : 0 }];
  }
  if (sql.startsWith('DELETE FROM produtos')) {
    const indice = produtos.findIndex(function porId(produto) { return produto.id === parametros[0]; });
    if (indice >= 0) produtos.splice(indice, 1);
    return [{ affectedRows: indice >= 0 ? 1 : 0 }];
  }
  throw new Error('Consulta não prevista no mock.');
}

function criarToken(id, opcoes = {}) {
  const usuario = usuarios.find(function porId(item) { return item.id === id; });
  return jwt.sign({ id, email: usuario?.email, nivel: usuario?.nivel }, process.env.JWT_SECRET, { expiresIn: '2h', ...opcoes });
}

async function requisitar(caminho, { metodo = 'GET', token, dados } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (dados !== undefined) headers['Content-Type'] = 'application/json';
  const resposta = await fetch(base + caminho, {
    method: metodo,
    headers,
    body: dados === undefined ? undefined : JSON.stringify(dados),
  });
  return { status: resposta.status, dados: await resposta.json(), headers: resposta.headers };
}

test('sem token, produtos e usuários retornam 401 antes de consultar o banco', async function verificarSemToken() {
  for (const caminho of ['/produtos', '/produtos/1', '/usuarios', '/auth/me']) {
    assert.equal((await requisitar(caminho)).status, 401);
  }
  assert.equal(chamadas.length, 0);
});

test('JWT inválido, expirado ou com outro algoritmo retorna 401', async function verificarJwt() {
  const tokens = ['token-invalido', criarToken(1, { expiresIn: -1 }), criarToken(1, { algorithm: 'HS384' })];
  for (const token of tokens) {
    assert.equal((await requisitar('/produtos', { token })).status, 401);
  }
  assert.equal(chamadas.length, 0);
});

test('Bearer malformado não autentica e usuário removido não mantém a sessão', async function verificarBearer() {
  const resposta = await fetch(base + '/produtos', { headers: { Authorization: 'Basic ' + criarToken(1) } });
  assert.equal(resposta.status, 401);
  assert.equal((await requisitar('/auth/me', { token: criarToken(999) })).status, 401);
});

test('cadastro ignora nivel admin e armazena somente um hash bcrypt de custo 10', async function verificarCadastro() {
  const resultado = await requisitar('/auth/cadastro', { metodo: 'POST', dados: { nome: ' Nova conta ', email: ' NOVA@EXAMPLE.TEST ', senha: senhaTeste, nivel: 'admin' } });
  assert.equal(resultado.status, 201);
  assert.equal(resultado.dados.usuario.nivel, 'usuario');
  assert.equal(resultado.dados.usuario.email, 'nova@example.test');
  assert.equal('senha' in resultado.dados.usuario, false);
  const salva = usuarios.at(-1);
  assert.notEqual(salva.senha, senhaTeste);
  assert.equal(bcrypt.getRounds(salva.senha), 10);
  assert.equal(await bcrypt.compare(senhaTeste, salva.senha), true);
  const insercao = chamadas.find(function encontrar(chamada) { return chamada.sql.startsWith('INSERT'); });
  assert.equal(insercao.parametros[3], 'usuario');
  assert.equal(insercao.sql.includes('nova@example.test'), false);
});

test('cadastro valida senha, e-mail e duplicidade', async function verificarValidacaoCadastro() {
  const casos = [
    { nome: '', email: 'valido@example.test', senha: senhaTeste },
    { nome: 'Pessoa', email: 'invalido', senha: senhaTeste },
    { nome: 'Pessoa', email: 'valido@example.test', senha: 'curta' },
    { nome: 'Pessoa', email: 'valido@example.test', senha: 'á'.repeat(37) },
  ];
  for (const dados of casos) assert.equal((await requisitar('/auth/cadastro', { metodo: 'POST', dados })).status, 400);
  assert.equal((await requisitar('/auth/cadastro', { metodo: 'POST', dados: { nome: 'Pessoa', email: usuarios[0].email, senha: senhaTeste } })).status, 409);
});

test('login correto devolve JWT com validade de 2 horas sem senha ou hash', async function verificarLogin() {
  const resultado = await requisitar('/auth/login', { metodo: 'POST', dados: { email: usuarios[0].email, senha: senhaTeste } });
  assert.equal(resultado.status, 200);
  const payload = jwt.verify(resultado.dados.token, process.env.JWT_SECRET);
  assert.equal(payload.exp - payload.iat, 7200);
  assert.deepEqual(Object.keys(payload).sort(), ['email', 'exp', 'iat', 'id', 'nivel']);
  assert.deepEqual(Object.keys(resultado.dados.usuario).sort(), ['email', 'id', 'nivel', 'nome']);
  assert.equal(resultado.headers.get('cache-control'), 'no-store');
});

test('login com conta ausente e senha errada usa a mesma resposta genérica', async function verificarLoginInvalido() {
  const incorreta = await requisitar('/auth/login', { metodo: 'POST', dados: { email: usuarios[0].email, senha: randomBytes(12).toString('hex') } });
  const ausente = await requisitar('/auth/login', { metodo: 'POST', dados: { email: 'ausente@example.test', senha: senhaTeste } });
  assert.equal(incorreta.status, 401);
  assert.equal(ausente.status, 401);
  assert.deepEqual(incorreta.dados, ausente.dados);
  assert.equal(incorreta.dados.mensagem, 'E-mail ou senha inválidos');
});

test('usuário consulta produtos, detalhes e /me; não modifica produtos nem gerencia usuários', async function verificarUsuario() {
  const token = criarToken(1);
  assert.equal((await requisitar('/produtos', { token })).status, 200);
  assert.equal((await requisitar('/produtos/1', { token })).dados.nome, 'Mouse');
  const atual = await requisitar('/auth/me', { token });
  assert.deepEqual(atual.dados, { id: 1, nome: usuarios[0].nome, email: usuarios[0].email, nivel: 'usuario' });
  for (const metodo of ['POST', 'PUT', 'DELETE']) {
    const caminho = metodo === 'POST' ? '/produtos' : '/produtos/1';
    assert.equal((await requisitar(caminho, { metodo, token, dados: {} })).status, 403);
  }
  assert.equal((await requisitar('/usuarios', { token })).status, 403);
  assert.equal((await requisitar('/usuarios/3/nivel', { metodo: 'PUT', token, dados: { nivel: 'admin' } })).status, 403);
});

test('administrador executa CRUD completo e recebe 404 após exclusão', async function verificarCrud() {
  const token = criarToken(2);
  const dados = { nome: 'Teclado', descricao: 'Teclado USB', categoria: 'Periféricos', preco: 89.90, estoque: 5 };
  const criada = await requisitar('/produtos', { metodo: 'POST', token, dados });
  assert.equal(criada.status, 201);
  const id = criada.dados.produto.id;
  assert.equal((await requisitar('/produtos/' + id, { token })).dados.nome, 'Teclado');
  assert.equal((await requisitar('/produtos', { token })).dados.length, 2);
  const alterada = await requisitar('/produtos/' + id, { metodo: 'PUT', token, dados: { ...dados, preco: 79.90, estoque: 4 } });
  assert.equal(alterada.status, 200);
  assert.equal(alterada.dados.produto.preco, 79.90);
  assert.equal((await requisitar('/produtos/' + id, { metodo: 'DELETE', token })).status, 200);
  assert.equal((await requisitar('/produtos/' + id, { token })).status, 404);
  assert.equal((await requisitar('/produtos/' + id, { metodo: 'DELETE', token })).status, 404);
});

test('preço e estoque inválidos são rejeitados, incluindo coerções perigosas', async function verificarProdutoInvalido() {
  const token = criarToken(2);
  const baseProduto = { nome: 'Produto', preco: 10, estoque: 1 };
  for (const alteracoes of [{ preco: -1 }, { preco: '' }, { preco: true }, { preco: 1.234 }, { preco: 100000000 }, { estoque: -1 }, { estoque: 1.5 }, { estoque: '' }, { estoque: true }, { nome: ' '.repeat(3) }, { descricao: 'x'.repeat(501) }]) {
    assert.equal((await requisitar('/produtos', { metodo: 'POST', token, dados: { ...baseProduto, ...alteracoes } })).status, 400);
  }
  assert.equal((await requisitar('/produtos/1abc', { token })).status, 400);
  assert.equal((await requisitar('/produtos/999', { metodo: 'PUT', token, dados: baseProduto })).status, 404);
});

test('admin lista usuários sem hash e altera somente níveis válidos de outras contas', async function verificarAdministracao() {
  const token = criarToken(2);
  const lista = await requisitar('/usuarios', { token });
  assert.equal(lista.status, 200);
  for (const usuario of lista.dados) assert.equal('senha' in usuario, false);
  assert.equal((await requisitar('/usuarios/2/nivel', { metodo: 'PUT', token, dados: { nivel: 'usuario' } })).status, 400);
  assert.equal((await requisitar('/usuarios/1/nivel', { metodo: 'PUT', token, dados: { nivel: 'superadmin' } })).status, 400);
  assert.equal((await requisitar('/usuarios/999/nivel', { metodo: 'PUT', token, dados: { nivel: 'admin' } })).status, 404);
  const promocao = await requisitar('/usuarios/1/nivel', { metodo: 'PUT', token, dados: { nivel: 'admin' } });
  assert.equal(promocao.status, 200);
  assert.equal(promocao.dados.usuario.nivel, 'admin');
  assert.equal('senha' in promocao.dados.usuario, false);
});

test('rebaixamento revoga administração imediatamente, mesmo com JWT admin ainda válido', async function verificarRebaixamento() {
  const tokenAntigo = criarToken(3);
  assert.equal((await requisitar('/usuarios', { token: tokenAntigo })).status, 200);
  const alteracao = await requisitar('/usuarios/3/nivel', { metodo: 'PUT', token: criarToken(2), dados: { nivel: 'usuario' } });
  assert.equal(alteracao.status, 200);
  assert.equal(jwt.verify(tokenAntigo, process.env.JWT_SECRET).nivel, 'admin');
  assert.equal((await requisitar('/usuarios', { token: tokenAntigo })).status, 403);
  assert.equal((await requisitar('/produtos', { metodo: 'POST', token: tokenAntigo, dados: {} })).status, 403);
  assert.equal((await requisitar('/auth/me', { token: tokenAntigo })).dados.nivel, 'usuario');
});

test('JSON malformado e corpo ausente produzem erro JSON compreensível', async function verificarCorpo() {
  const malformada = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
  assert.equal(malformada.status, 400);
  assert.equal((await malformada.json()).mensagem, 'JSON inválido no corpo da requisição.');
  assert.equal((await requisitar('/auth/cadastro', { metodo: 'POST' })).status, 400);
  assert.equal((await requisitar('/rota-inexistente')).status, 404);
});

test('falha do banco vira 500 sem vazar detalhes, SQL ou senha', async function verificarFalhaBanco() {
  pool.execute = async function falhar() { throw new Error('Detalhe interno de conexão que não pode sair pela API'); };
  try {
    const resultado = await requisitar('/auth/login', { metodo: 'POST', dados: { email: usuarios[0].email, senha: senhaTeste } });
    assert.equal(resultado.status, 500);
    assert.equal(JSON.stringify(resultado.dados).includes('Detalhe interno'), false);
    assert.equal((await requisitar('/produtos', { token: criarToken(1) })).status, 500);
  } finally {
    pool.execute = executarEmMemoria;
  }
});
