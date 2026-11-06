import { test, expect } from '@playwright/test';

// Estes testes executam o Expo Web real no Edge. Somente as respostas HTTP da
// API são simuladas com page.route: nenhum MySQL ou JWT real é necessário aqui.
// A segurança do Express, bcrypt e JWT deve ser verificada nos testes da API.
const SENHA_FICTICIA = 'Senha-apenas-de-teste-123!';
const TOKEN_USUARIO = 'token-ficticio-usuario-sem-validade';
const TOKEN_ADMIN = 'token-ficticio-admin-sem-validade';
const aluno = { id: 2, nome: 'Aluno Teste', email: 'aluno.teste@example.com', nivel: 'adotante' };
const administrador = { id: 1, nome: 'Admin Teste', email: 'admin.teste@example.com', nivel: 'admin' };
const animalInicial = {
  id: 1,
  nome: 'Luna', usuario_id: 1, especie: 'Gato', raca: 'SRD', idade: 2, unidade_idade: 'anos', porte: 'Pequeno', sexo: 'Fêmea', cidade: 'Porto Alegre', descricao: 'Gata à espera de uma família.', saude: 'Vacinada', foto: '', status: 'disponivel',
};

async function simularApi(page) {
  const api = {
    requisicoes: [],
    usuarios: [{ ...administrador }, { ...aluno }],
    animais: [{ ...animalInicial }],
    sessao: 'normal',
    animaisSemSessao: false,
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
        api.usuarios.push({ id: 3, nome: body.nome, email: body.email, nivel: 'adotante' });
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

    if (caminho === '/animais' && metodo === 'GET') {
      if (api.animaisSemSessao) {
        await responder(401, { mensagem: 'Token inválido ou expirado.' });
      } else {
        await responder(200, api.animais);
      }
      return;
    }

    if (caminho === '/animais' && metodo === 'POST') {
      const animal = { id: 2, ...body };
      api.animais.push(animal);
      await responder(201, { mensagem: 'Animal cadastrado com sucesso.', animal });
      return;
    }

    if (/^\/animais\/\d+$/.test(caminho)) {
      const id = Number(caminho.split('/')[2]);
      const indice = api.animais.findIndex(function (animal) { return animal.id === id; });
      if (indice < 0) {
        await responder(404, { mensagem: 'Animal não encontrado.' });
      } else if (metodo === 'GET') {
        await responder(200, api.animais[indice]);
      } else if (metodo === 'PUT') {
        api.animais[indice] = { id, ...body };
        await responder(200, { mensagem: 'Animal atualizado com sucesso.', animal: api.animais[indice] });
      } else if (metodo === 'DELETE') {
        api.animais.splice(indice, 1);
        await responder(200, { mensagem: 'Animal excluído com sucesso.' });
      } else {
        await responder(405, { mensagem: 'Método inesperado no teste.' });
      }
      return;
    }

    if (caminho === '/favoritos' && metodo === 'GET') {
      await responder(200, []);
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
  return page.getByPlaceholder(rotulo, { exact: true }).filter({ visible: true });
}

async function entrar(page, usuario = aluno) {
  await page.goto('/');
  await campo(page, 'seuemail@exemplo.com').fill(usuario.email);
  await campo(page, 'Digite sua senha').fill(SENHA_FICTICIA);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Ver todos os animais', { exact: true })).toBeVisible();
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

test('cadastro envia apenas dados públicos e entra como adotante', async function ({ page }) {
  const api = await simularApi(page);
  await page.goto('/');
  await page.getByText('Criar minha conta', { exact: true }).click();
  await campo(page, 'Digite seu nome').fill('Nova Adotante');
  await campo(page, 'seuemail@exemplo.com').fill('nova@example.test');
  await campo(page, 'Pelo menos 8 caracteres').fill(SENHA_FICTICIA);
  await campo(page, 'Digite sua senha novamente').fill(SENHA_FICTICIA);
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await expect(page.getByText('Ver todos os animais', { exact: true })).toBeVisible();
  expect(api.requisicoes.find((item) => item.caminho === '/auth/cadastro').body).toEqual({ nome: 'Nova Adotante', email: 'nova@example.test', senha: SENHA_FICTICIA });
  await conferirAusenciaDeSenhaSalva(page);
});

test('adotante consulta animais e detalhes usando Bearer', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  await page.getByText('Ver todos os animais', { exact: true }).click();
  await expect(page.getByText('Luna', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cadastrar animal', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Conhecer este pet', exact: true }).click();
  await expect(page.getByText(animalInicial.descricao, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Quero adotar', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar informações', exact: true })).toHaveCount(0);
  const consultas = api.requisicoes.filter((item) => item.caminho.startsWith('/animais'));
  expect(consultas.some((item) => item.caminho === '/animais/1')).toBe(true);
  for (const consulta of consultas) expect(consulta.authorization).toBe('Bearer ' + TOKEN_USUARIO);
  await conferirAusenciaDeSenhaSalva(page);
});

test('recarregar restaura sessão e sair remove o token', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  await page.reload();
  await expect(page.getByText('Ver todos os animais', { exact: true })).toBeVisible();
  expect(api.requisicoes.some((item) => item.caminho === '/auth/me')).toBe(true);
  await page.getByText('Sair', { exact: true }).click();
  await expect(page.getByText('Você saiu da sua conta.', { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBeNull();
});

test('401 na restauração encerra sessão', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.sessao = 'invalida';
  await page.reload();
  await expect(page.getByText('Sua sessão expirou. Entre novamente.', { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBeNull();
});

test('falha de rede permite restaurar sessão sem perder token', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.sessao = 'offline';
  await page.reload();
  await expect(page.getByText('Vamos reconectar?', { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBe(TOKEN_USUARIO);
  api.sessao = 'normal';
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText('Ver todos os animais', { exact: true })).toBeVisible();
});

test('401 durante consulta de animais encerra sessão ativa', async function ({ page }) {
  const api = await simularApi(page);
  await entrar(page);
  api.animaisSemSessao = true;
  await page.getByText('Ver todos os animais', { exact: true }).click();
  await expect(page.getByText('Sua sessão expirou. Entre novamente.', { exact: true })).toBeVisible();
  expect(await tokenSalvo(page)).toBeNull();
});

test('administrador acessa gerenciamento de animais e usuários', async function ({ page }) {
  await simularApi(page);
  await entrar(page, administrador);
  await expect(page.getByText('Cadastrar animal', { exact: true })).toBeVisible();
  await page.getByText('Gerenciar usuários', { exact: true }).click();
  await expect(page.getByText(administrador.nome + ' (você)', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ONG', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Protetor independente', exact: true })).toBeVisible();
});
