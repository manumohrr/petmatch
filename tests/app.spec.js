import { test, expect } from '@playwright/test';

// Estes testes executam o Expo Web real no Edge. Somente as respostas HTTP da
// API são simuladas com page.route: nenhum MySQL ou JWT real é necessário aqui.
// A segurança do Express, bcrypt e JWT deve ser verificada nos testes da API.
const SENHA_FICTICIA = 'Senha-apenas-de-teste-123!';
const TOKEN_USUARIO = 'token-ficticio-usuario-sem-validade';
const TOKEN_ADMIN = 'token-ficticio-admin-sem-validade';
const aluno = { id: 2, nome: 'Aluno Teste', email: 'aluno.teste@example.com', nivel: 'usuario' };
const administrador = { id: 1, nome: 'Admin Teste', email: 'admin.teste@example.com', nivel: 'admin' };
const produtoInicial = {
  id: 1,
  nome: 'Notebook de teste',
  descricao: 'Notebook fictício usado na integração do catálogo.',
  categoria: 'Computadores',
  preco: '3999.90',
  estoque: 5,
};

async function simularApi(page) {
  const api = {
    requisicoes: [],
    usuarios: [{ ...administrador }, { ...aluno }],
    produtos: [{ ...produtoInicial }],
    sessao: 'normal',
    produtosSemSessao: false,
  };

  await page.route('http://localhost:3000/**', async function responderRota(route) {
    const requisicao = route.request();
    const metodo = requisicao.method();
    const caminho = new URL(requisicao.url()).pathname;
    const headers = {
      'access-control-allow-origin': 'http://localhost:8081',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    if (metodo === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const body = requisicao.postData() ? requisicao.postDataJSON() : null;
    const authorization = requisicao.headers().authorization || '';
    api.requisicoes.push({ metodo, caminho, body, authorization });

    async function responder(status, json) {
      await route.fulfill({ status, headers, json });
    }

    if (caminho === '/auth/cadastro' && metodo === 'POST') {
      if (api.usuarios.some(function (pessoa) { return pessoa.email === body.email; })) {
        await responder(409, { mensagem: 'E-mail já cadastrado.' });
      } else {
        api.usuarios.push({ id: 3, nome: body.nome, email: body.email, nivel: 'usuario' });
        await responder(201, { mensagem: 'Conta criada! Agora entre com seu e-mail e senha.' });
      }
      return;
    }

    if (caminho === '/auth/login' && metodo === 'POST') {
      const usuario = api.usuarios.find(function (pessoa) { return pessoa.email === body.email; });
      if (!usuario || body.senha !== SENHA_FICTICIA) {
        await responder(401, { mensagem: 'E-mail ou senha inválidos' });
      } else {
        await responder(200, { token: usuario.nivel === 'admin' ? TOKEN_ADMIN : TOKEN_USUARIO, usuario });
      }
      return;
    }

    if (caminho === '/auth/me') {
      if (api.sessao === 'offline') {
        await route.abort('connectionrefused');
      } else if (api.sessao === 'invalida') {
        await responder(401, { mensagem: 'Token inválido ou expirado.' });
      } else {
        await responder(200, authorization === 'Bearer ' + TOKEN_ADMIN ? administrador : aluno);
      }
      return;
    }

    if (caminho === '/produtos' && metodo === 'GET') {
      if (api.produtosSemSessao) {
        await responder(401, { mensagem: 'Token inválido ou expirado.' });
      } else {
        await responder(200, api.produtos);
      }
      return;
    }

    if (caminho === '/produtos' && metodo === 'POST') {
      const produto = { id: 2, ...body };
      api.produtos.push(produto);
      await responder(201, { mensagem: 'Produto cadastrado com sucesso.', produto });
      return;
    }

    if (/^\/produtos\/\d+$/.test(caminho)) {
      const id = Number(caminho.split('/')[2]);
      const indice = api.produtos.findIndex(function (produto) { return produto.id === id; });
      if (indice < 0) {
        await responder(404, { mensagem: 'Produto não encontrado.' });
      } else if (metodo === 'GET') {
        await responder(200, api.produtos[indice]);
      } else if (metodo === 'PUT') {
        api.produtos[indice] = { id, ...body };
        await responder(200, { mensagem: 'Produto atualizado com sucesso.', produto: api.produtos[indice] });
      } else if (metodo === 'DELETE') {
        api.produtos.splice(indice, 1);
        await responder(200, { mensagem: 'Produto excluído com sucesso.' });
      } else {
        await responder(405, { mensagem: 'Método inesperado no teste.' });
      }
      return;
    }

    if (caminho === '/usuarios' && metodo === 'GET') {
      await responder(200, api.usuarios);
      return;
    }

    if (/^\/usuarios\/\d+\/nivel$/.test(caminho) && metodo === 'PUT') {
      const id = Number(caminho.split('/')[2]);
      const usuario = api.usuarios.find(function (pessoa) { return pessoa.id === id; });
      usuario.nivel = body.nivel;
      await responder(200, { mensagem: 'Nível atualizado com sucesso.', usuario });
      return;
    }

    await responder(404, { mensagem: 'Endpoint não previsto neste cenário de integração.' });
  });

  return api;
}

function campo(page, rotulo) {
  // A pilha pode manter a tela anterior montada. Usamos o campo visível com
  // o rótulo acessível que também é apresentado ao aluno.
  return page.locator('[aria-label="' + rotulo + '"]:visible');
}

async function entrar(page, usuario = aluno) {
  await page.goto('/');
  await campo(page, 'E-mail').fill(usuario.email);
  await campo(page, 'Senha').fill(SENHA_FICTICIA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Olá, ' + usuario.nome, { exact: true })).toBeVisible();
}

async function tokenSalvo(page) {
  return page.evaluate(function () { return localStorage.getItem('token'); });
}

async function conferirAusenciaDeSenhaSalva(page) {
  const armazenamento = await page.evaluate(function () {
    return JSON.stringify({ local: { ...localStorage }, sessao: { ...sessionStorage } });
  });
  expect(armazenamento).not.toContain(SENHA_FICTICIA);
  expect(armazenamento).not.toMatch(/"(?:senha|password|confirmacao)"\s*:/i);
}

test('cadastro valida dados, exibe conflito e envia somente os campos públicos', async function ({ page }) {
  const api = await simularApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click();
  await campo(page, 'Nome').fill('Nova Aluna');
  await campo(page, 'E-mail').fill(aluno.email);
  await campo(page, 'Senha').fill('curta');
  await campo(page, 'Confirmar senha').fill('curta');
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('A senha deve ter pelo menos 8 caracteres.');
  expect(api.requisicoes).toHaveLength(0);

  await campo(page, 'Senha').fill(SENHA_FICTICIA);
  await campo(page, 'Confirmar senha').fill('confirmacao-diferente');
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('As senhas não são iguais.');
  expect(api.requisicoes).toHaveLength(0);

  await campo(page, 'Confirmar senha').fill(SENHA_FICTICIA);
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail já cadastrado.');
  await campo(page, 'E-mail').fill('nova.aluna@example.com');
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Conta criada! Agora entre com seu e-mail e senha.');

  const cadastro = api.requisicoes.at(-1);
  expect(cadastro.caminho).toBe('/auth/cadastro');
  expect(cadastro.body).toEqual({ nome: 'Nova Aluna', email: 'nova.aluna@example.com', senha: SENHA_FICTICIA });
  expect(cadastro.authorization).toBe('');
  expect(await tokenSalvo(page)).toBeNull();
  await conferirAusenciaDeSenhaSalva(page);
  await page.getByRole('button', { name: 'Voltar para o login', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
});

test('login comum consulta catálogo e detalhes com Bearer e sem controles administrativos', async function ({ page }) {
  const api = await simularApi(page);
  await page.goto('/');
  await campo(page, 'E-mail').fill(aluno.email);
  await campo(page, 'Senha').fill('senha-ficticia-incorreta');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('E-mail ou senha inválidos');
  expect(await tokenSalvo(page)).toBeNull();

  await campo(page, 'Senha').fill(SENHA_FICTICIA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Olá, ' + aluno.nome, { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBe(TOKEN_USUARIO);
  await conferirAusenciaDeSenhaSalva(page);
  await expect(page.getByRole('button', { name: 'Cadastrar produto', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerenciar usuários', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Ver produtos', exact: true }).click();
  await expect(page.getByText(produtoInicial.nome, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Excluir', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await expect(page.getByText(produtoInicial.descricao, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar produto', exact: true })).toHaveCount(0);

  const consultas = api.requisicoes.filter(function (item) { return item.metodo === 'GET'; });
  expect(consultas.some(function (item) { return item.caminho === '/produtos'; })).toBe(true);
  expect(consultas.some(function (item) { return item.caminho === '/produtos/1'; })).toBe(true);
  for (const consulta of consultas) expect(consulta.authorization).toBe('Bearer ' + TOKEN_USUARIO);
});

test('recarregar restaura a sessão por /me e logout remove o token', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  const consultasAntes = api.requisicoes.filter(function (item) { return item.caminho === '/auth/me'; }).length;
  await page.reload();
  await expect(page.getByText('Olá, ' + aluno.nome, { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBe(TOKEN_USUARIO);
  expect(api.requisicoes.filter(function (item) { return item.caminho === '/auth/me'; }).length).toBeGreaterThan(consultasAntes);
  await conferirAusenciaDeSenhaSalva(page);

  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Você saiu da sua conta.');
  expect(await tokenSalvo(page)).toBeNull();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver produtos', exact: true })).toHaveCount(0);
});

test('token recusado durante a restauração volta ao login com aviso e limpa a sessão', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.sessao = 'invalida';
  await page.reload();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Sua sessão expirou ou é inválida. Entre novamente.');
  expect(await tokenSalvo(page)).toBeNull();
});

test('falha de rede preserva o token e permite tentar restaurar a sessão novamente', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.sessao = 'offline';
  await page.reload();
  await expect(page.getByText('Vamos reconectar?', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Não foi possível verificar a sessão.');
  expect(await tokenSalvo(page)).toBe(TOKEN_USUARIO);
  api.sessao = 'normal';
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Olá, ' + aluno.nome, { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBe(TOKEN_USUARIO);
});

test('resposta 401 em uma rota protegida encerra a sessão ativa', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.produtosSemSessao = true;
  await page.getByRole('button', { name: 'Ver produtos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Sua sessão expirou ou é inválida. Entre novamente.');
  expect(await tokenSalvo(page)).toBeNull();
});

test('admin cadastra, edita e exclui produto após confirmar e a lista reflete o CRUD', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page, administrador);
  await page.getByRole('button', { name: 'Ver produtos', exact: true }).click();
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.getByRole('button', { name: 'Editar produto', exact: true }).click();
  await expect(campo(page, 'Nome *')).toHaveValue(produtoInicial.nome);
  await campo(page, 'Nome *').fill('Notebook revisado');
  await campo(page, 'Preço (R$) *').fill('4299,90');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Produto atualizado com sucesso.');
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByText('Notebook revisado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  await expect(page.getByText('Notebook revisado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cadastrar produto', exact: true }).click();
  await campo(page, 'Nome *').fill('Mouse de teste');
  await campo(page, 'Descrição').fill('Produto criado pelo cenário de integração.');
  await campo(page, 'Categoria').fill('Periféricos');
  await campo(page, 'Preço (R$) *').fill('79,90');
  await campo(page, 'Estoque *').fill('12');
  await page.getByRole('button', { name: 'Cadastrar produto', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Produto cadastrado com sucesso.');
  await page.getByRole('button', { name: 'Ver catálogo', exact: true }).click();
  const cartaoMouse = page.getByText('Mouse de teste', { exact: true }).locator('..');
  await expect(cartaoMouse).toBeVisible();
  await cartaoMouse.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirmar exclusão', exact: true })).toBeVisible();
  expect(api.requisicoes.some(function (item) { return item.metodo === 'DELETE'; })).toBe(false);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(cartaoMouse).toBeVisible();
  await cartaoMouse.getByRole('button', { name: 'Excluir', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Produto excluído com sucesso.');
  await expect(page.getByText('Mouse de teste', { exact: true })).toHaveCount(0);

  const escrita = api.requisicoes.filter(function (item) { return ['POST', 'PUT', 'DELETE'].includes(item.metodo) && item.caminho.startsWith('/produtos'); });
  expect(escrita.map(function (item) { return item.metodo; })).toEqual(['PUT', 'POST', 'DELETE']);
  expect(escrita[0].body.preco).toBe(4299.9);
  expect(escrita[1].body).toEqual({ nome: 'Mouse de teste', descricao: 'Produto criado pelo cenário de integração.', categoria: 'Periféricos', preco: 79.9, estoque: 12 });
  for (const requisicao of escrita) expect(requisicao.authorization).toBe('Bearer ' + TOKEN_ADMIN);
});

test('admin lista usuários e altera outro nível sem oferecer alteração do próprio', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page, administrador);
  await page.getByRole('button', { name: 'Gerenciar usuários', exact: true }).click();
  await expect(page.getByText(administrador.nome + ' (você)', { exact: true })).toBeVisible();
  await expect(page.getByText('Seu próprio nível não pode ser alterado.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tornar usuário', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tornar administrador', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Nível atualizado com sucesso.');
  await expect(page.getByRole('button', { name: 'Tornar usuário', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tornar usuário', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tornar administrador', exact: true })).toBeVisible();

  const alteracoes = api.requisicoes.filter(function (item) { return item.metodo === 'PUT' && item.caminho.startsWith('/usuarios'); });
  expect(alteracoes.map(function (item) { return item.body.nivel; })).toEqual(['admin', 'usuario']);
  for (const requisicao of alteracoes) {
    expect(requisicao.caminho).toBe('/usuarios/2/nivel');
    expect(requisicao.authorization).toBe('Bearer ' + TOKEN_ADMIN);
  }
  expect(api.requisicoes.filter(function (item) { return item.caminho === '/usuarios' && item.metodo === 'GET'; }).length).toBeGreaterThanOrEqual(3);
  await conferirAusenciaDeSenhaSalva(page);
});
