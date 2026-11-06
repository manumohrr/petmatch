# PetMatch — entrega completa

## 1. Estrutura completa de pastas e arquivos

```text
petmatch/
├── assets/
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── backend/
│   ├── config/
│   │   └── ambiente.js
│   ├── controllers/
│   │   ├── adocoesController.js
│   │   ├── animaisController.js
│   │   ├── authController.js
│   │   ├── favoritosController.js
│   │   └── usuariosController.js
│   ├── database/
│   │   └── conexao.js
│   ├── middlewares/
│   │   ├── autenticarToken.js
│   │   └── somenteAdmin.js
│   ├── routes/
│   │   ├── adocoesRoutes.js
│   │   ├── animaisRoutes.js
│   │   ├── authRoutes.js
│   │   ├── favoritosRoutes.js
│   │   └── usuariosRoutes.js
│   ├── scripts/
│   │   └── criarAdmin.js
│   ├── tests/
│   │   ├── api.test.js
│   │   └── mysql.integration.test.js
│   ├── utils/
│   │   └── validacoes.js
│   ├── app.js
│   └── server.js
├── components/
│   ├── FormularioAnimal.js
│   └── ui.js
├── database/
│   └── petmatch.sql
├── screens/
│   ├── Animais.js
│   ├── CadastrarAnimal.js
│   ├── CadastroUsuario.js
│   ├── DetalhesAnimal.js
│   ├── EditarAnimal.js
│   ├── Favoritos.js
│   ├── Home.js
│   ├── Login.js
│   ├── MinhasSolicitacoes.js
│   ├── Perfil.js
│   ├── SolicitarAdocao.js
│   └── Usuarios.js
├── scripts/
│   ├── gerar-entrega.js
│   ├── testar-mysql.js
│   └── testar-web.js
├── services/
│   └── api.js
├── tests/
│   └── app.spec.js
├── .gitignore
├── AGENTS.md
├── App.js
├── app.json
├── eslint.config.js
├── index.js
├── jsconfig.json
├── LICENSE
├── package-lock.json
├── package.json
├── playwright.config.js
├── README.md
└── VALIDACAO.md
```

A árvore lista os fontes e os assets originais. Imagens são entregues nos arquivos de `assets/` e não são convertidas em texto neste documento. Dependências instaladas, caches, resultados gerados e credenciais locais ficam fora da consolidação.

## 2. Comandos de criação, instalação e execução

Para criar um projeto novo durante a construção em aula:

```bash
npx create-expo-app@latest petmatch --template blank
cd petmatch
npm install @react-navigation/native
npm install @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo install @react-native-async-storage/async-storage
npm install express mysql2 cors jsonwebtoken bcryptjs dotenv
```

Para executar os arquivos já entregues, entre na pasta e instale as versões do lock:

```bash
cd petmatch
npm ci
```

Para um banco novo, use `database/petmatch.sql`. CREATE TABLE IF NOT EXISTS não migra tabelas existentes; revise uma migração antes de usar em banco com dados.

A API lê a configuração local de `backend/.env`: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=petmatch_db, PORT e JWT_SECRET (pelo menos 32 caracteres). Não sobrescreva um arquivo existente. Nenhum `.env` acompanha esta entrega; não há `.env.example` nesta versão.

O SQL define as quatro tabelas do PetMatch e não insere contas ou senhas demonstrativas.

Opcionalmente, configure `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env` para criar um administrador próprio com outro e-mail. O script não altera a senha nem o nível de uma conta existente:

```bash
node backend/scripts/criarAdmin.js
```

No primeiro terminal, inicie a API:

```bash
node backend/server.js
```

Em outro terminal na mesma raiz, inicie o Expo e pressione `w` para web:

```bash
npx expo start
```

Verificações disponíveis depois da instalação:

```bash
npm test
npm run lint
npm run typecheck
npx expo install --check
npm run export:web
npm run test:web
npm run test:mysql
```

Os detalhes de ambiente, dispositivos, testes e conceitos estão no README reproduzido integralmente adiante.

## 3. Conteúdo integral dos arquivos de texto

### petmatch/backend/config/ambiente.js

```js
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// O caminho parte deste arquivo. Assim, executar Node em outra pasta não muda o .env lido.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export function validarBanco() {
  const obrigatorias = ['DB_HOST', 'DB_USER', 'DB_NAME'];

  for (const nome of obrigatorias) {
    if (!process.env[nome]?.trim()) {
      throw new Error('Preencha ' + nome + ' em backend/.env.');
    }
  }

  // Uma senha vazia pode ser válida no MySQL local; a variável ainda precisa existir.
  if (process.env.DB_PASSWORD === undefined) {
    throw new Error('Defina DB_PASSWORD em backend/.env, mesmo que fique vazia.');
  }

  const porta = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('DB_PORT deve ser uma porta válida.');
  }
}

export default function validarAmbiente() {
  validarBanco();

  // Sem segredo válido, a API não inicia. Nunca existe uma chave alternativa no código.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    throw new Error('Defina JWT_SECRET com pelo menos 32 caracteres aleatórios em backend/.env.');
  }

  const porta = Number(process.env.PORT || 3000);
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('PORT deve ser uma porta válida.');
  }
}
```


### petmatch/backend/controllers/adocoesController.js

```js

import pool from '../database/conexao.js';
import { idValido } from '../utils/validacoes.js';

const responsavel = (usuario) =>
  ['ong', 'protetor', 'admin'].includes(usuario?.nivel);

// CREATE - SOLICITAR ADOÇÃO
export async function solicitarAdocao(req, res) {
  const animalId = Number(req.body.animal_id);
  const usuarioId = req.usuario.id;
  const mensagem =
    typeof req.body.mensagem === 'string'
      ? req.body.mensagem.trim()
      : '';

  if (req.usuario.nivel !== 'adotante') {
    return res.status(403).json({
      mensagem: 'Somente adotantes podem solicitar uma adoção.',
    });
  }

  if (!Number.isSafeInteger(animalId) || animalId < 1) {
    return res.status(400).json({
      mensagem: 'Animal inválido.',
    });
  }

  if (mensagem.length > 1000) {
    return res.status(400).json({
      mensagem: 'A mensagem deve ter até 1000 caracteres.',
    });
  }

  try {
    const [animais] = await pool.execute(
      'SELECT id, status FROM animais WHERE id = ?',
      [animalId]
    );

    if (animais.length === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado.',
      });
    }

    if (animais[0].status !== 'disponivel') {
      return res.status(400).json({
        mensagem: 'Este animal não está disponível para adoção.',
      });
    }

    const [existentes] = await pool.execute(
      `SELECT id FROM adocoes
       WHERE animal_id = ?
       AND usuario_id = ?
       AND status = 'pendente'`,
      [animalId, usuarioId]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        mensagem: 'Você já possui uma solicitação pendente para este animal.',
      });
    }

    const [resultado] = await pool.execute(
      `INSERT INTO adocoes
       (animal_id, usuario_id, mensagem, status)
       VALUES (?, ?, ?, 'pendente')`,
      [animalId, usuarioId, mensagem]
    );

    return res.status(201).json({
      mensagem: 'Solicitação de adoção enviada com sucesso!',
      adocao: {
        id: resultado.insertId,
        animal_id: animalId,
        usuario_id: usuarioId,
        mensagem,
        status: 'pendente',
      },
    });
  } catch (erro) {
    console.error('Erro ao solicitar adoção:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível enviar a solicitação.',
    });
  }
}

// READ - LISTAR SOLICITAÇÕES
export async function listarAdocoes(req, res) {
  try {
    const parametros = [];
    let filtro = '';

    if (req.usuario.nivel === 'adotante') {
      filtro = 'WHERE a.usuario_id = ?';
      parametros.push(req.usuario.id);
    } else if (req.usuario.nivel !== 'admin') {
      if (!responsavel(req.usuario)) {
        return res.status(403).json({
          mensagem: 'Acesso não permitido.',
        });
      }

      filtro = 'WHERE an.usuario_id = ?';
      parametros.push(req.usuario.id);
    }

    const [adocoes] = await pool.execute(
      `SELECT
         a.id,
         a.animal_id,
         a.usuario_id,
         a.mensagem,
         a.status,
         a.criado_em,
         an.nome AS nome_animal,
         an.foto AS foto_animal,
         u.nome AS nome_adotante
       FROM adocoes a
       INNER JOIN animais an ON an.id = a.animal_id
       INNER JOIN usuarios u ON u.id = a.usuario_id
       ${filtro}
       ORDER BY a.criado_em DESC, a.id DESC`,
      parametros
    );

    return res.status(200).json(adocoes);
  } catch (erro) {
    console.error('Erro ao listar adoções:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível listar as solicitações.',
    });
  }
}

// UPDATE - APROVAR OU RECUSAR SOLICITAÇÃO
export async function atualizarStatusAdocao(req, res) {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensagem: 'ID da solicitação inválido.',
    });
  }

  const status = req.body.status;

  if (!['aprovada', 'recusada'].includes(status)) {
    return res.status(400).json({
      mensagem: 'O status deve ser aprovada ou recusada.',
    });
  }

  if (!responsavel(req.usuario)) {
    return res.status(403).json({
      mensagem: 'Você não tem permissão para avaliar solicitações.',
    });
  }

  let conexao;

  try {
    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    const [adocoes] = await conexao.execute(
      `SELECT a.id, a.animal_id, a.status,
              an.usuario_id AS responsavel_id,
              an.status AS status_animal
       FROM adocoes a
       INNER JOIN animais an ON an.id = a.animal_id
       WHERE a.id = ?
       FOR UPDATE`,
      [Number(req.params.id)]
    );

    const adocao = adocoes[0];

    if (!adocao) {
      await conexao.rollback();
      return res.status(404).json({
        mensagem: 'Solicitação não encontrada.',
      });
    }

    if (
      req.usuario.nivel !== 'admin' &&
      Number(adocao.responsavel_id) !== Number(req.usuario.id)
    ) {
      await conexao.rollback();
      return res.status(403).json({
        mensagem: 'Você não é responsável por este animal.',
      });
    }

    if (adocao.status !== 'pendente') {
      await conexao.rollback();
      return res.status(400).json({
        mensagem: 'Esta solicitação já foi finalizada.',
      });
    }

    if (status === 'aprovada' && adocao.status_animal !== 'disponivel') {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Este animal não está mais disponível.',
      });
    }

    await conexao.execute(
      'UPDATE adocoes SET status = ? WHERE id = ?',
      [status, adocao.id]
    );

    if (status === 'aprovada') {
      await conexao.execute(
        `UPDATE animais SET status = 'adotado' WHERE id = ?`,
        [adocao.animal_id]
      );

      await conexao.execute(
        `UPDATE adocoes
         SET status = 'recusada'
         WHERE animal_id = ?
         AND id <> ?
         AND status = 'pendente'`,
        [adocao.animal_id, adocao.id]
      );
    }

    await conexao.commit();

    return res.status(200).json({
      mensagem:
        status === 'aprovada'
          ? 'Adoção aprovada com sucesso!'
          : 'Solicitação recusada.',
    });
  } catch (erro) {
    if (conexao) await conexao.rollback();

    console.error('Erro ao atualizar adoção:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível atualizar a solicitação.',
    });
  } finally {
    if (conexao) conexao.release();
  }
}

// DELETE - CANCELAR SOLICITAÇÃO
export async function cancelarAdocao(req, res) {
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensagem: 'ID da solicitação inválido.',
    });
  }

  try {
    const [resultado] = await pool.execute(
      `UPDATE adocoes
       SET status = 'cancelada'
       WHERE id = ?
       AND usuario_id = ?
       AND status = 'pendente'`,
      [Number(req.params.id), req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: 'Solicitação pendente não encontrada.',
      });
    }

    return res.status(200).json({
      mensagem: 'Solicitação cancelada com sucesso.',
    });
  } catch (erro) {
    console.error('Erro ao cancelar adoção:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível cancelar a solicitação.',
    });
  }
}
```


### petmatch/backend/controllers/animaisController.js

```js

import pool from '../database/conexao.js';

// VALIDAR O ID RECEBIDO NA URL
function validarId(valor) {
  const id = Number(valor);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// VALIDAR E PREPARAR OS DADOS DO ANIMAL
function prepararDadosAnimal(body) {
  const nome = String(body.nome || '').trim();
  const especie = String(body.especie || '').trim();
  const raca = String(body.raca || '').trim();
  const idade = Number(body.idade);
  const unidade_idade = String(body.unidade_idade || '').trim();
  const porte = String(body.porte || '').trim();
  const sexo = String(body.sexo || '').trim();
  const cidade = String(body.cidade || '').trim();
  const descricao = String(body.descricao || '').trim();
  const saude = String(body.saude || '').trim();
  const foto = String(body.foto || '').trim();
  const status = String(body.status || 'disponivel').trim();

  if (!nome || nome.length > 120) {
    throw new Error('Informe um nome com até 120 caracteres.');
  }

  if (!['Cachorro', 'Gato'].includes(especie)) {
    throw new Error('A espécie deve ser Cachorro ou Gato.');
  }

  if (raca.length > 100) {
    throw new Error('A raça deve ter até 100 caracteres.');
  }

  if (
    !Number.isInteger(idade) ||
    idade < 0 ||
    idade > 300
  ) {
    throw new Error('Informe uma idade válida.');
  }

  if (!['anos', 'meses'].includes(unidade_idade)) {
    throw new Error('A unidade da idade deve ser anos ou meses.');
  }

  if (!['Pequeno', 'Médio', 'Grande'].includes(porte)) {
    throw new Error('Informe um porte válido.');
  }

  if (!['Macho', 'Fêmea'].includes(sexo)) {
    throw new Error('Informe um sexo válido.');
  }

  if (!cidade || cidade.length > 120) {
    throw new Error('Informe uma cidade válida.');
  }

  if (descricao.length > 1000) {
    throw new Error('A descrição deve ter até 1000 caracteres.');
  }

  if (saude.length > 500) {
    throw new Error('As informações de saúde devem ter até 500 caracteres.');
  }

  if (foto.length > 1000) {
    throw new Error('O link da foto deve ter até 1000 caracteres.');
  }

  if (foto && !/^https?:\/\/\S+$/i.test(foto)) {
    throw new Error('Informe um link válido para a foto.');
  }

  if (!['disponivel', 'em_processo', 'adotado'].includes(status)) {
    throw new Error('Informe um status válido.');
  }

  return {
    nome,
    especie,
    raca,
    idade,
    unidade_idade,
    porte,
    sexo,
    cidade,
    descricao,
    saude,
    foto,
    status,
  };
}

// VERIFICAR SE O USUÁRIO PODE ALTERAR O ANIMAL
function podeAlterarAnimal(usuario, animal) {
  if (usuario.nivel === 'admin') {
    return true;
  }

  return (
    ['ong', 'protetor'].includes(usuario.nivel) &&
    Number(animal.usuario_id) === Number(usuario.id)
  );
}

// READ - LISTAR ANIMAIS
export async function listarAnimais(req, res) {
  try {
    const [animais] = await pool.execute(
      `SELECT
        id,
        usuario_id,
        nome,
        especie,
        raca,
        idade,
        unidade_idade,
        porte,
        sexo,
        cidade,
        descricao,
        saude,
        foto,
        status
       FROM animais
       ORDER BY id DESC`
    );

    return res.status(200).json(animais);
  } catch (erro) {
    console.error('Erro ao listar animais:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível carregar os animais.',
    });
  }
}

// READ - BUSCAR ANIMAL POR ID
export async function buscarAnimalPorId(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      mensagem: 'ID do animal inválido.',
    });
  }

  try {
    const [animais] = await pool.execute(
      'SELECT * FROM animais WHERE id = ?',
      [id]
    );

    if (animais.length === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado.',
      });
    }

    return res.status(200).json(animais[0]);
  } catch (erro) {
    console.error('Erro ao buscar animal:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível carregar o animal.',
    });
  }
}

// CREATE - CADASTRAR ANIMAL
export async function cadastrarAnimal(req, res) {
  let animal;

  try {
    animal = prepararDadosAnimal(req.body);
  } catch (erro) {
    return res.status(400).json({
      mensagem: erro.message,
    });
  }

  try {
    // O RESPONSÁVEL É DEFINIDO PELO TOKEN JWT
    // NUNCA PELO ID ENVIADO NO FORMULÁRIO
    const usuarioId = req.usuario.id;

    const [resultado] = await pool.execute(
      `INSERT INTO animais (
        usuario_id,
        nome,
        especie,
        raca,
        idade,
        unidade_idade,
        porte,
        sexo,
        cidade,
        descricao,
        saude,
        foto,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        animal.nome,
        animal.especie,
        animal.raca,
        animal.idade,
        animal.unidade_idade,
        animal.porte,
        animal.sexo,
        animal.cidade,
        animal.descricao,
        animal.saude,
        animal.foto,
        animal.status,
      ]
    );

    return res.status(201).json({
      mensagem: 'Animal cadastrado com sucesso!',
      animal: {
        id: resultado.insertId,
        usuario_id: usuarioId,
        ...animal,
      },
    });
  } catch (erro) {
    console.error('Erro ao cadastrar animal:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível cadastrar o animal.',
    });
  }
}

// UPDATE - ATUALIZAR ANIMAL
export async function atualizarAnimal(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      mensagem: 'ID do animal inválido.',
    });
  }

  let dados;

  try {
    dados = prepararDadosAnimal(req.body);
  } catch (erro) {
    return res.status(400).json({
      mensagem: erro.message,
    });
  }

  try {
    const [animais] = await pool.execute(
      'SELECT id, usuario_id FROM animais WHERE id = ?',
      [id]
    );

    if (animais.length === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado.',
      });
    }

    if (!podeAlterarAnimal(req.usuario, animais[0])) {
      return res.status(403).json({
        mensagem: 'Você não tem permissão para editar este animal.',
      });
    }

    await pool.execute(
      `UPDATE animais SET
        nome = ?,
        especie = ?,
        raca = ?,
        idade = ?,
        unidade_idade = ?,
        porte = ?,
        sexo = ?,
        cidade = ?,
        descricao = ?,
        saude = ?,
        foto = ?,
        status = ?
       WHERE id = ?`,
      [
        dados.nome,
        dados.especie,
        dados.raca,
        dados.idade,
        dados.unidade_idade,
        dados.porte,
        dados.sexo,
        dados.cidade,
        dados.descricao,
        dados.saude,
        dados.foto,
        dados.status,
        id,
      ]
    );

    return res.status(200).json({
      mensagem: 'Animal atualizado com sucesso!',
    });
  } catch (erro) {
    console.error('Erro ao atualizar animal:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível atualizar o animal.',
    });
  }
}

// DELETE - EXCLUIR ANIMAL
export async function excluirAnimal(req, res) {
  const id = validarId(req.params.id);

  if (!id) {
    return res.status(400).json({
      mensagem: 'ID do animal inválido.',
    });
  }

  try {
    const [animais] = await pool.execute(
      'SELECT id, usuario_id FROM animais WHERE id = ?',
      [id]
    );

    if (animais.length === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado.',
      });
    }

    if (!podeAlterarAnimal(req.usuario, animais[0])) {
      return res.status(403).json({
        mensagem: 'Você não tem permissão para excluir este animal.',
      });
    }

    await pool.execute(
      'DELETE FROM animais WHERE id = ?',
      [id]
    );

    return res.status(200).json({
      mensagem: 'Animal excluído com sucesso!',
    });
  } catch (erro) {
    console.error('Erro ao excluir animal:', erro);

    if (erro.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        mensagem:
          'Este animal possui registros vinculados e não pode ser excluído.',
      });
    }

    return res.status(500).json({
      mensagem: 'Não foi possível excluir o animal.',
    });
  }
}
```


### petmatch/backend/controllers/authController.js

```js

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../database/conexao.js';
import { emailValido, senhaValida } from '../utils/validacoes.js';

// CADASTRAR NOVO USUÁRIO
export async function cadastrar(req, res) {
  const nome =
    typeof req.body.nome === 'string'
      ? req.body.nome.trim()
      : '';

  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  const senha = req.body.senha;

  // VALIDAR OS DADOS
  if (
    !nome ||
    nome.length > 100 ||
    !emailValido(email) ||
    !senhaValida(senha)
  ) {
    return res.status(400).json({
      mensagem:
        'Informe nome (até 100 caracteres), e-mail válido e senha com pelo menos 8 caracteres e até 72 bytes.',
    });
  }

  try {
    // VERIFICAR SE O E-MAIL JÁ ESTÁ CADASTRADO
    const [existentes] = await pool.execute(
      'SELECT id FROM usuarios WHERE email = ?',
      [email]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        mensagem: 'E-mail já cadastrado.',
      });
    }

    // CRIPTOGRAFAR A SENHA
    const senhaHash = await bcrypt.hash(senha, 10);

    // CADASTRO PÚBLICO SEMPRE CRIA UM ADOTANTE
    const nivel = 'adotante';

    // SALVAR NO BANCO DE DADOS
    const [resultado] = await pool.execute(
      `INSERT INTO usuarios
       (nome, email, senha, nivel)
       VALUES (?, ?, ?, ?)`,
      [nome, email, senhaHash, nivel]
    );

    return res.status(201).json({
      mensagem: 'Conta criada com sucesso no PetMatch!',
      usuario: {
        id: resultado.insertId,
        nome,
        email,
        nivel,
      },
    });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'E-mail já cadastrado.',
      });
    }

    console.error('Erro ao cadastrar:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível cadastrar o usuário.',
    });
  }
}

// REALIZAR LOGIN
export async function login(req, res) {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  const senha = req.body.senha;

  // VALIDAR LOGIN
  if (
    !emailValido(email) ||
    typeof senha !== 'string' ||
    !senha ||
    Buffer.byteLength(senha, 'utf8') > 72
  ) {
    return res.status(400).json({
      mensagem: 'Informe e-mail válido e senha.',
    });
  }

  try {
    // BUSCAR USUÁRIO NO MYSQL
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, senha, nivel
       FROM usuarios
       WHERE email = ?`,
      [email]
    );

    const usuario = usuarios[0];

    // VERIFICAR A SENHA
    if (
      !usuario ||
      !(await bcrypt.compare(senha, usuario.senha))
    ) {
      return res.status(401).json({
        mensagem: 'E-mail ou senha inválidos.',
      });
    }

    // GERAR TOKEN JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        nivel: usuario.nivel,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '2h',
        algorithm: 'HS256',
      }
    );

    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel: usuario.nivel,
      },
    });
  } catch (erro) {
    console.error('Erro no login:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível realizar o login.',
    });
  }
}

// CONSULTAR USUÁRIO AUTENTICADO
export function usuarioAtual(req, res) {
  // O MIDDLEWARE JÁ VALIDOU O TOKEN JWT
  const { id, nome, email, nivel } = req.usuario;

  return res.status(200).json({
    id,
    nome,
    email,
    nivel,
  });
}
```


### petmatch/backend/controllers/favoritosController.js

```js

import pool from '../database/conexao.js';
import { idValido } from '../utils/validacoes.js';

// READ - LISTAR OS ANIMAIS FAVORITOS DO USUÁRIO
export async function listarFavoritos(req, res) {
  const usuarioId = req.usuario.id;

  try {
    const [favoritos] = await pool.execute(
      `SELECT
        f.id,
        f.animal_id,
        f.criado_em,
        a.nome,
        a.especie,
        a.raca,
        a.idade,
        a.unidade_idade,
        a.porte,
        a.sexo,
        a.cidade,
        a.descricao,
        a.foto,
        a.status
       FROM favoritos f
       INNER JOIN animais a ON a.id = f.animal_id
       WHERE f.usuario_id = ?
       ORDER BY f.criado_em DESC, f.id DESC`,
      [usuarioId]
    );

    return res.status(200).json(favoritos);
  } catch (erro) {
    console.error('Erro ao listar favoritos:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível carregar seus favoritos.',
    });
  }
}

// CREATE - ADICIONAR UM ANIMAL AOS FAVORITOS
export async function adicionarFavorito(req, res) {
  const usuarioId = req.usuario.id;
  const animalId = req.body.animal_id;

  if (!idValido(animalId)) {
    return res.status(400).json({
      mensagem: 'ID do animal inválido.',
    });
  }

  try {
    // VERIFICAR SE O ANIMAL EXISTE
    const [animais] = await pool.execute(
      'SELECT id FROM animais WHERE id = ?',
      [Number(animalId)]
    );

    if (animais.length === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado.',
      });
    }

    // VERIFICAR SE O ANIMAL JÁ ESTÁ NOS FAVORITOS
    const [existentes] = await pool.execute(
      `SELECT id FROM favoritos
       WHERE usuario_id = ? AND animal_id = ?`,
      [usuarioId, Number(animalId)]
    );

    if (existentes.length > 0) {
      return res.status(409).json({
        mensagem: 'Este animal já está nos seus favoritos.',
      });
    }

    // SALVAR O FAVORITO NO MYSQL
    const [resultado] = await pool.execute(
      `INSERT INTO favoritos (usuario_id, animal_id)
       VALUES (?, ?)`,
      [usuarioId, Number(animalId)]
    );

    return res.status(201).json({
      mensagem: 'Animal adicionado aos favoritos!',
      favorito: {
        id: resultado.insertId,
        usuario_id: usuarioId,
        animal_id: Number(animalId),
      },
    });
  } catch (erro) {
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensagem: 'Este animal já está nos seus favoritos.',
      });
    }

    console.error('Erro ao adicionar favorito:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível adicionar o favorito.',
    });
  }
}

// DELETE - REMOVER UM ANIMAL DOS FAVORITOS
export async function removerFavorito(req, res) {
  const usuarioId = req.usuario.id;
  const animalId = req.params.animalId;

  if (!idValido(animalId)) {
    return res.status(400).json({
      mensagem: 'ID do animal inválido.',
    });
  }

  try {
    // REMOVER APENAS O FAVORITO DO USUÁRIO LOGADO
    const [resultado] = await pool.execute(
      `DELETE FROM favoritos
       WHERE usuario_id = ? AND animal_id = ?`,
      [usuarioId, Number(animalId)]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        mensagem: 'Animal não encontrado nos seus favoritos.',
      });
    }

    return res.status(200).json({
      mensagem: 'Animal removido dos favoritos.',
    });
  } catch (erro) {
    console.error('Erro ao remover favorito:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível remover o favorito.',
    });
  }
}
```


### petmatch/backend/controllers/usuariosController.js

```js

import pool from '../database/conexao.js';
import { idValido } from '../utils/validacoes.js';

// READ - LISTAR USUÁRIOS CADASTRADOS
export async function listarUsuarios(req, res) {
  // SOMENTE ADMINISTRADORES PODEM CONSULTAR A LISTA
  if (req.usuario?.nivel !== 'admin') {
    return res.status(403).json({
      mensagem: 'Acesso permitido apenas para administradores.',
    });
  }

  try {
    // BUSCAR USUÁRIOS SEM EXPOR SENHAS OU HASHES
    const [usuarios] = await pool.execute(
      `SELECT
        id,
        nome,
        email,
        nivel,
        criado_em
       FROM usuarios
       ORDER BY id`
    );

    return res.status(200).json(usuarios);
  } catch (erro) {
    console.error('Erro ao listar usuários:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível listar os usuários.',
    });
  }
}

// UPDATE - ALTERAR NÍVEL DE ACESSO
export async function alterarNivelUsuario(req, res) {
  // VERIFICAR PERMISSÃO DO ADMINISTRADOR
  if (req.usuario?.nivel !== 'admin') {
    return res.status(403).json({
      mensagem: 'Acesso permitido apenas para administradores.',
    });
  }

  // VALIDAR ID DO USUÁRIO
  if (!idValido(req.params.id)) {
    return res.status(400).json({
      mensagem: 'ID do usuário inválido.',
    });
  }

  const id = Number(req.params.id);
  const nivel = req.body.nivel;

  // IMPEDIR ALTERAÇÃO DO PRÓPRIO NÍVEL
  if (id === Number(req.usuario.id)) {
    return res.status(400).json({
      mensagem: 'Você não pode alterar seu próprio nível de acesso.',
    });
  }

  // VALIDAR OS NÍVEIS PERMITIDOS
  const niveisPermitidos = [
    'adotante',
    'ong',
    'protetor',
    'admin',
  ];

  if (!niveisPermitidos.includes(nivel)) {
    return res.status(400).json({
      mensagem:
        'O nível deve ser adotante, ong, protetor ou admin.',
    });
  }

  try {
    // VERIFICAR SE O USUÁRIO EXISTE
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, nivel
       FROM usuarios
       WHERE id = ?`,
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        mensagem: 'Usuário não encontrado.',
      });
    }

    // ATUALIZAR O NÍVEL NO MYSQL
    await pool.execute(
      'UPDATE usuarios SET nivel = ? WHERE id = ?',
      [nivel, id]
    );

    return res.status(200).json({
      mensagem: 'Nível de acesso atualizado com sucesso.',
      usuario: {
        ...usuarios[0],
        nivel,
      },
    });
  } catch (erro) {
    console.error('Erro ao alterar nível:', erro);

    return res.status(500).json({
      mensagem: 'Não foi possível alterar o nível do usuário.',
    });
  }
}
```


### petmatch/backend/database/conexao.js

```js
import '../config/ambiente.js';
import mysql from 'mysql2/promise';

// Conexão do PetMatch com o banco de dados MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
  charset: 'utf8mb4',
});

export default pool;
```


### petmatch/backend/middlewares/autenticarToken.js

```js

import jwt from 'jsonwebtoken';
import pool from '../database/conexao.js';

export default async function autenticarToken(req, res, next) {
  // RECEBER O TOKEN JWT DO APLICATIVO
  const authorization = req.headers.authorization;

  const partes =
    typeof authorization === 'string'
      ? authorization.trim().split(/\s+/)
      : [];

  // VERIFICAR SE O TOKEN FOI INFORMADO
  if (
    partes.length !== 2 ||
    partes[0].toLowerCase() !== 'bearer' ||
    !partes[1]
  ) {
    return res.status(401).json({
      mensagem:
        'Token não informado. Utilize Authorization: Bearer TOKEN.',
    });
  }

  let payload;

  try {
    // VERIFICAR ASSINATURA E VALIDADE DO JWT
    payload = jwt.verify(
      partes[1],
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
      }
    );

    if (
      typeof payload !== 'object' ||
      !Number.isInteger(payload.id) ||
      payload.id < 1
    ) {
      return res.status(401).json({
        mensagem:
          'Token inválido ou expirado. Faça login novamente.',
      });
    }
  } catch {
    return res.status(401).json({
      mensagem:
        'Token inválido ou expirado. Faça login novamente.',
    });
  }

  try {
    // BUSCAR DADOS ATUAIS DO USUÁRIO NO MYSQL
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, nivel
       FROM usuarios
       WHERE id = ?`,
      [payload.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        mensagem:
          'Usuário não encontrado. Faça login novamente.',
      });
    }

    // UTILIZAR O NÍVEL ATUAL DO BANCO DE DADOS
    req.usuario = {
      ...payload,
      ...usuarios[0],
    };

    // PERMITIR CONTINUAR PARA A ROTA
    next();
  } catch (erro) {
    console.error('Erro ao verificar sessão:', erro);

    return res.status(500).json({
      mensagem:
        'Não foi possível verificar a sessão. Tente novamente.',
    });
  }
}
```


### petmatch/backend/middlewares/somenteAdmin.js

```js
export default function somenteAdmin(req, res, next) {
  // autenticarToken precisa executar antes: ele preenche req.usuario com o nível atual.
  if (req.usuario?.nivel !== 'admin') {
    return res.status(403).json({ mensagem: 'Acesso permitido apenas para administradores' });
  }

  next();
}
```


### petmatch/backend/routes/adocoesRoutes.js

```js

import { Router } from 'express';

import {
  solicitarAdocao,
  listarAdocoes,
  atualizarStatusAdocao,
  cancelarAdocao,
} from '../controllers/adocoesController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM LOGIN
router.use(autenticarToken);

// CREATE - SOLICITAR A ADOÇÃO DE UM ANIMAL
router.post('/', solicitarAdocao);

// READ - LISTAR SOLICITAÇÕES DE ADOÇÃO
router.get('/', listarAdocoes);

// UPDATE - APROVAR OU RECUSAR UMA SOLICITAÇÃO
router.put('/:id/status', atualizarStatusAdocao);

// UPDATE - CANCELAR UMA SOLICITAÇÃO PENDENTE
router.put('/:id/cancelar', cancelarAdocao);

export default router;
```


### petmatch/backend/routes/animaisRoutes.js

```js

import { Router } from 'express';

import {
  listarAnimais,
  buscarAnimalPorId,
  cadastrarAnimal,
  atualizarAnimal,
  excluirAnimal,
} from '../controllers/animaisController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM AUTENTICAÇÃO JWT
router.use(autenticarToken);

// VERIFICAR SE O USUÁRIO PODE GERENCIAR ANIMAIS
function permitirGerenciamento(req, res, next) {
  const nivel = req.usuario?.nivel;

  if (
    nivel !== 'ong' &&
    nivel !== 'protetor' &&
    nivel !== 'admin'
  ) {
    return res.status(403).json({
      mensagem:
        'Apenas ONGs, protetores e administradores podem gerenciar animais.',
    });
  }

  next();
}

// READ - LISTAR TODOS OS ANIMAIS
router.get('/', listarAnimais);

// READ - BUSCAR UM ANIMAL PELO ID
router.get('/:id', buscarAnimalPorId);

// CREATE - CADASTRAR UM NOVO ANIMAL
router.post(
  '/',
  permitirGerenciamento,
  cadastrarAnimal
);

// UPDATE - ATUALIZAR UM ANIMAL
router.put(
  '/:id',
  permitirGerenciamento,
  atualizarAnimal
);

// DELETE - EXCLUIR UM ANIMAL
router.delete(
  '/:id',
  permitirGerenciamento,
  excluirAnimal
);

export default router;
```


### petmatch/backend/routes/authRoutes.js

```js
import { Router } from 'express';
import { cadastrar, login, usuarioAtual } from '../controllers/authController.js';
import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// Cadastro e login são públicos. /me precisa de um token válido.
router.post('/cadastro', cadastrar);
router.post('/login', login);
router.get('/me', autenticarToken, usuarioAtual);

export default router;
```


### petmatch/backend/routes/favoritosRoutes.js

```js

import { Router } from 'express';

import {
  listarFavoritos,
  adicionarFavorito,
  removerFavorito,
} from '../controllers/favoritosController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM LOGIN
router.use(autenticarToken);

// READ - LISTAR OS ANIMAIS FAVORITOS
router.get('/', listarFavoritos);

// CREATE - ADICIONAR UM ANIMAL AOS FAVORITOS
router.post('/', adicionarFavorito);

// DELETE - REMOVER UM ANIMAL DOS FAVORITOS
router.delete('/:animalId', removerFavorito);

export default router;
```


### petmatch/backend/routes/usuariosRoutes.js

```js
import { Router } from 'express';
import { listarUsuarios, alterarNivelUsuario } from '../controllers/usuariosController.js';
import autenticarToken from '../middlewares/autenticarToken.js';
import somenteAdmin from '../middlewares/somenteAdmin.js';

const router = Router();

// A ordem importa: autenticar primeiro (401), conferir a permissão depois (403).
router.use(autenticarToken, somenteAdmin);
router.get('/', listarUsuarios);
router.put('/:id/nivel', alterarNivelUsuario);

export default router;
```


### petmatch/backend/scripts/criarAdmin.js

```js
import bcrypt from 'bcryptjs';
import pool from '../database/conexao.js';
import { validarBanco } from '../config/ambiente.js';
import { emailValido, senhaValida } from '../utils/validacoes.js';

async function criarAdministrador() {
  try {
    validarBanco();
    const nome = process.env.ADMIN_NOME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const senha = process.env.ADMIN_SENHA;

    if (!nome || nome.length > 100 || !emailValido(email) || !senhaValida(senha) || senha === 'DEFINA_UMA_SENHA_FORTE') {
      console.error('Preencha ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA em backend/.env. A senha deve ter pelo menos 8 caracteres e até 72 bytes.');
      process.exitCode = 1;
      return;
    }

    const [existentes] = await pool.execute('SELECT id, nivel FROM usuarios WHERE email = ?', [email]);
    if (existentes.length > 0) {
      // Não promover silenciosamente uma conta comum que já usa este endereço.
      console.log(existentes[0].nivel === 'admin' ? 'Administrador já cadastrado' : 'E-mail já cadastrado como usuário. Use outro ADMIN_EMAIL ou peça a um administrador para alterar o nível.');
      return;
    }

    // A senha original não é salva nem impressa. Apenas seu hash é enviado ao MySQL.
    const senhaHash = await bcrypt.hash(senha, 10);
    await pool.execute('INSERT INTO usuarios (nome, email, senha, nivel) VALUES (?, ?, ?, ?)', [nome, email, senhaHash, 'admin']);
    console.log('Administrador criado com sucesso');
  } catch (erro) {
    console.error(erro.code === 'ER_DUP_ENTRY' ? 'E-mail já cadastrado. Nenhum administrador foi duplicado.' : 'Não foi possível criar o administrador. Confira backend/.env, a execução do MySQL e a importação do SQL.');
    process.exitCode = 1;
  } finally {
    // Fechar o pool permite que o script termine normalmente.
    await pool.end();
  }
}

criarAdministrador();
```


### petmatch/backend/tests/api.test.js

```js
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

const dadosAnimal = { nome: 'Luna', especie: 'Gato', raca: 'SRD', idade: 2, unidade_idade: 'anos', porte: 'Pequeno', sexo: 'Fêmea', cidade: 'Porto Alegre', descricao: 'Animal para adoção', saude: 'Vacinada', foto: '', status: 'disponivel' };

let servidor;
let base;
let usuarios;
let animais;
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
    { id: 1, nome: 'Estudante', email: 'estudante@example.test', senha: senhaHash, nivel: 'adotante' },
    { id: 2, nome: 'Administrador', email: 'admin@example.test', senha: senhaHash, nivel: 'admin' },
    { id: 3, nome: 'Outra administradora', email: 'outra@example.test', senha: senhaHash, nivel: 'admin' },
  ];
  animais = [{ id: 1, usuario_id: 2, ...dadosAnimal, nome: 'Luna' }];
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
  sql = sql.replace(/\s+/g, ' ').trim();
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
  if (sql.startsWith('SELECT') && sql.includes('FROM animais')) {
    const encontrados = sql.includes('WHERE id = ?') ? animais.filter(function porId(animal) { return animal.id === parametros[0]; }) : animais;
    return [encontrados.map(function copiar(animal) { return { ...animal }; })];
  }
  if (sql.startsWith('INSERT INTO animais')) {
    const [usuario_id, nome, especie, raca, idade, unidade_idade, porte, sexo, cidade, descricao, saude, foto, status] = parametros;
    const id = Math.max(0, ...animais.map(function obterId(animal) { return animal.id; })) + 1;
    animais.push({ id, usuario_id, nome, especie, raca, idade, unidade_idade, porte, sexo, cidade, descricao, saude, foto, status });
    return [{ insertId: id, affectedRows: 1 }];
  }
  if (sql.startsWith('UPDATE animais')) {
    const [nome, especie, raca, idade, unidade_idade, porte, sexo, cidade, descricao, saude, foto, status, id] = parametros;
    const animal = animais.find(function porId(item) { return item.id === id; });
    if (animal) Object.assign(animal, { nome, especie, raca, idade, unidade_idade, porte, sexo, cidade, descricao, saude, foto, status });
    return [{ affectedRows: animal ? 1 : 0 }];
  }
  if (sql.startsWith('DELETE FROM animais')) {
    const indice = animais.findIndex(function porId(animal) { return animal.id === parametros[0]; });
    if (indice >= 0) animais.splice(indice, 1);
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

test('sem token, animais e usuários retornam 401 antes de consultar o banco', async function verificarSemToken() {
  for (const caminho of ['/animais', '/animais/1', '/usuarios', '/auth/me']) {
    assert.equal((await requisitar(caminho)).status, 401);
  }
  assert.equal(chamadas.length, 0);
});

test('JWT inválido, expirado ou com outro algoritmo retorna 401', async function verificarJwt() {
  const tokens = ['token-invalido', criarToken(1, { expiresIn: -1 }), criarToken(1, { algorithm: 'HS384' })];
  for (const token of tokens) {
    assert.equal((await requisitar('/animais', { token })).status, 401);
  }
  assert.equal(chamadas.length, 0);
});

test('Bearer malformado não autentica e usuário removido não mantém a sessão', async function verificarBearer() {
  const resposta = await fetch(base + '/animais', { headers: { Authorization: 'Basic ' + criarToken(1) } });
  assert.equal(resposta.status, 401);
  assert.equal((await requisitar('/auth/me', { token: criarToken(999) })).status, 401);
});

test('cadastro ignora nivel admin e armazena somente um hash bcrypt de custo 10', async function verificarCadastro() {
  const resultado = await requisitar('/auth/cadastro', { metodo: 'POST', dados: { nome: ' Nova conta ', email: ' NOVA@EXAMPLE.TEST ', senha: senhaTeste, nivel: 'admin' } });
  assert.equal(resultado.status, 201);
  assert.equal(resultado.dados.usuario.nivel, 'adotante');
  assert.equal(resultado.dados.usuario.email, 'nova@example.test');
  assert.equal('senha' in resultado.dados.usuario, false);
  const salva = usuarios.at(-1);
  assert.notEqual(salva.senha, senhaTeste);
  assert.equal(bcrypt.getRounds(salva.senha), 10);
  assert.equal(await bcrypt.compare(senhaTeste, salva.senha), true);
  const insercao = chamadas.find(function encontrar(chamada) { return chamada.sql.startsWith('INSERT'); });
  assert.equal(insercao.parametros[3], 'adotante');
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
  assert.equal(incorreta.dados.mensagem, 'E-mail ou senha inválidos.');
});

test('usuário consulta animais, detalhes e /me; não modifica animais nem gerencia usuários', async function verificarUsuario() {
  const token = criarToken(1);
  assert.equal((await requisitar('/animais', { token })).status, 200);
  assert.equal((await requisitar('/animais/1', { token })).dados.nome, 'Luna');
  const atual = await requisitar('/auth/me', { token });
  assert.deepEqual(atual.dados, { id: 1, nome: usuarios[0].nome, email: usuarios[0].email, nivel: 'adotante' });
  for (const metodo of ['POST', 'PUT', 'DELETE']) {
    const caminho = metodo === 'POST' ? '/animais' : '/animais/1';
    assert.equal((await requisitar(caminho, { metodo, token, dados: {} })).status, 403);
  }
  assert.equal((await requisitar('/usuarios', { token })).status, 403);
  assert.equal((await requisitar('/usuarios/3/nivel', { metodo: 'PUT', token, dados: { nivel: 'admin' } })).status, 403);
});

test('administrador executa CRUD completo e recebe 404 após exclusão', async function verificarCrud() {
  const token = criarToken(2);
  const dados = { ...dadosAnimal, nome: 'Mia' };
  const criada = await requisitar('/animais', { metodo: 'POST', token, dados });
  assert.equal(criada.status, 201);
  const id = criada.dados.animal.id;
  assert.equal((await requisitar('/animais/' + id, { token })).dados.nome, 'Mia');
  assert.equal((await requisitar('/animais', { token })).dados.length, 2);
  const alterada = await requisitar('/animais/' + id, { metodo: 'PUT', token, dados: { ...dados, nome: 'Mia atualizada' } });
  assert.equal(alterada.status, 200);
  assert.equal((await requisitar('/animais/' + id, { token })).dados.nome, 'Mia atualizada');
  assert.equal((await requisitar('/animais/' + id, { metodo: 'DELETE', token })).status, 200);
  assert.equal((await requisitar('/animais/' + id, { token })).status, 404);
  assert.equal((await requisitar('/animais/' + id, { metodo: 'DELETE', token })).status, 404);
});

test('dados inválidos do animal são rejeitados', async function verificarAnimalInvalido() {
  const token = criarToken(2);
  for (const alteracoes of [{ nome: ' ' }, { especie: 'Ave' }, { idade: -1 }, { idade: 1.5 }, { unidade_idade: 'dias' }, { porte: 'Inválido' }, { sexo: 'Inválido' }, { cidade: '' }, { foto: 'arquivo-local' }, { descricao: 'x'.repeat(1001) }]) {
    assert.equal((await requisitar('/animais', { metodo: 'POST', token, dados: { ...dadosAnimal, ...alteracoes } })).status, 400);
  }
  assert.equal((await requisitar('/animais/1abc', { token })).status, 400);
  assert.equal((await requisitar('/animais/999', { metodo: 'PUT', token, dados: dadosAnimal })).status, 404);
});

test('admin lista usuários sem hash e altera somente níveis válidos de outras contas', async function verificarAdministracao() {
  const token = criarToken(2);
  const lista = await requisitar('/usuarios', { token });
  assert.equal(lista.status, 200);
  for (const usuario of lista.dados) assert.equal('senha' in usuario, false);
  assert.equal((await requisitar('/usuarios/2/nivel', { metodo: 'PUT', token, dados: { nivel: 'adotante' } })).status, 400);
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
  const alteracao = await requisitar('/usuarios/3/nivel', { metodo: 'PUT', token: criarToken(2), dados: { nivel: 'adotante' } });
  assert.equal(alteracao.status, 200);
  assert.equal(jwt.verify(tokenAntigo, process.env.JWT_SECRET).nivel, 'admin');
  assert.equal((await requisitar('/usuarios', { token: tokenAntigo })).status, 403);
  assert.equal((await requisitar('/animais', { metodo: 'POST', token: tokenAntigo, dados: {} })).status, 403);
  assert.equal((await requisitar('/auth/me', { token: tokenAntigo })).dados.nivel, 'adotante');
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
    assert.equal((await requisitar('/animais', { token: criarToken(1) })).status, 500);
  } finally {
    pool.execute = executarEmMemoria;
  }
});
```


### petmatch/backend/tests/mysql.integration.test.js

```js

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
```


### petmatch/backend/utils/validacoes.js

```js
// Front-end e back-end validam os dados: qualquer pessoa pode chamar a API diretamente.
export function emailValido(email) {
  return typeof email === 'string' && email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function senhaValida(senha) {
  // bcrypt considera no máximo 72 bytes. Rejeitar senhas maiores evita truncamento silencioso.
  return typeof senha === 'string' && senha.length >= 8 && senha.trim().length > 0 && Buffer.byteLength(senha, 'utf8') <= 72;
}

export function idValido(id) {
  return /^\d+$/.test(String(id)) && Number.isSafeInteger(Number(id)) && Number(id) > 0 && Number(id) <= 2147483647;
}
```


### petmatch/backend/app.js

```js

import './config/ambiente.js';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import animaisRoutes from './routes/animaisRoutes.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import adocoesRoutes from './routes/adocoesRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

app.disable('x-powered-by');

// PERMITIR REQUISIÇÕES DO APLICATIVO
// CORS É NECESSÁRIO PRINCIPALMENTE PARA O EXPO WEB
app.use(cors());

// RECEBER DADOS EM FORMATO JSON
app.use(express.json({ limit: '10kb' }));

// IMPEDIR CACHE DE INFORMAÇÕES SENSÍVEIS
app.use(function impedirCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');

  // GARANTIR UM OBJETO SEGURO PARA VALIDAÇÃO
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body)
  ) {
    req.body = {};
  }

  next();
});

// ROTA INICIAL DA API
app.get('/', function apresentarApi(req, res) {
  res.json({
    mensagem: 'API PETMATCH',
    descricao: 'Sistema de adoção responsável de animais',
    rotas: [
      '/auth',
      '/animais',
      '/usuarios',
      '/adocoes',
      '/favoritos',
    ],
  });
});

// ROTAS DE AUTENTICAÇÃO
app.use('/auth', authRoutes);

// ROTAS DOS ANIMAIS
// CADASTRAR, LISTAR, EDITAR E EXCLUIR
app.use('/animais', animaisRoutes);

// ROTAS DE USUÁRIOS
// GERENCIAMENTO DE CONTAS E PERMISSÕES
app.use('/usuarios', usuariosRoutes);

// ROTAS DE ADOÇÃO
// ENVIAR E ACOMPANHAR SOLICITAÇÕES
app.use('/adocoes', adocoesRoutes);

// ROTAS DE FAVORITOS
// SALVAR ANIMAIS DE INTERESSE
app.use('/favoritos', favoritosRoutes);

// ROTA NÃO ENCONTRADA
app.use(function rotaNaoEncontrada(req, res) {
  res.status(404).json({
    mensagem: 'Rota não encontrada.',
  });
});

// TRATAMENTO DE ERROS DA API
app.use(function tratarErro(erro, req, res, next) {
  // JSON INVÁLIDO
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      mensagem: 'JSON inválido no corpo da requisição.',
    });
  }

  // REQUISIÇÃO MUITO GRANDE
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({
      mensagem: 'Corpo da requisição muito grande.',
    });
  }

  // NÃO EXPOR INFORMAÇÕES INTERNAS DO SERVIDOR
  console.error('Erro na API:', erro);

  return res.status(500).json({
    mensagem: 'Erro interno do servidor. Tente novamente.',
  });
});

export default app;
```


### petmatch/backend/server.js

```js
import app from './app.js';
import validarAmbiente from './config/ambiente.js';

try {
  // Configuração ausente é detectada antes de aceitar qualquer requisição.
  validarAmbiente();
  const porta = Number(process.env.PORT || 3000);
  const servidor = app.listen(porta, '0.0.0.0', function iniciarServidor() {
    console.log('API executando em http://localhost:' + porta);
  });

  servidor.on('error', function informarErroServidor(erro) {
    console.error(erro.code === 'EADDRINUSE' ? 'A porta da API já está em uso.' : 'Não foi possível iniciar a API.');
    process.exitCode = 1;
  });
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
}
```


### petmatch/components/FormularioAnimal.js

```js

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Botao, Campo, cores } from './ui.js';

// VALIDAR E PREPARAR OS DADOS DO ANIMAL
export function prepararAnimal(campos) {
  const nome = String(campos.nome || '').trim();
  const especie = String(campos.especie || '').trim();
  const raca = String(campos.raca || '').trim();
  const textoIdade = String(campos.idade || '').trim();
  const unidade_idade = String(campos.unidade_idade || 'anos').trim();
  const porte = String(campos.porte || '').trim();
  const sexo = String(campos.sexo || '').trim();
  const cidade = String(campos.cidade || '').trim();
  const descricao = String(campos.descricao || '').trim();
  const saude = String(campos.saude || '').trim();
  const foto = String(campos.foto || '').trim();
  const status = String(campos.status || 'disponivel').trim();

  // VALIDAR NOME
  if (!nome || nome.length > 120) {
    throw new Error(
      'Informe o nome do animal com até 120 caracteres.'
    );
  }

  // VALIDAR ESPÉCIE
  if (!['Cachorro', 'Gato'].includes(especie)) {
    throw new Error(
      'Informe a espécie: Cachorro ou Gato.'
    );
  }

  // VALIDAR RAÇA
  if (raca.length > 100) {
    throw new Error(
      'A raça deve ter no máximo 100 caracteres.'
    );
  }

  // VALIDAR IDADE
  if (!/^\d+$/.test(textoIdade)) {
    throw new Error(
      'Informe a idade do animal em números inteiros.'
    );
  }

  const idade = Number(textoIdade);

  if (!Number.isInteger(idade) || idade < 0 || idade > 300) {
    throw new Error(
      'Informe uma idade válida para o animal.'
    );
  }

  if (!['anos', 'meses'].includes(unidade_idade)) {
    throw new Error(
      'A unidade da idade deve ser anos ou meses.'
    );
  }

  // VALIDAR PORTE
  if (!['Pequeno', 'Médio', 'Grande'].includes(porte)) {
    throw new Error(
      'Informe o porte: Pequeno, Médio ou Grande.'
    );
  }

  // VALIDAR SEXO
  if (!['Macho', 'Fêmea'].includes(sexo)) {
    throw new Error(
      'Informe o sexo: Macho ou Fêmea.'
    );
  }

  // VALIDAR CIDADE
  if (!cidade || cidade.length > 120) {
    throw new Error(
      'Informe a cidade com até 120 caracteres.'
    );
  }

  // VALIDAR DESCRIÇÃO
  if (descricao.length > 1000) {
    throw new Error(
      'A descrição deve ter no máximo 1000 caracteres.'
    );
  }

  // VALIDAR SAÚDE
  if (saude.length > 500) {
    throw new Error(
      'As informações de saúde devem ter até 500 caracteres.'
    );
  }

  // VALIDAR FOTO
  if (foto && !/^https?:\/\/\S+$/i.test(foto)) {
    throw new Error(
      'Informe um link válido para a foto, começando com http:// ou https://.'
    );
  }

  // VALIDAR STATUS
  if (
    !['disponivel', 'em_processo', 'adotado'].includes(status)
  ) {
    throw new Error(
      'Informe um status de adoção válido.'
    );
  }

  return {
    nome,
    especie,
    raca,
    idade,
    unidade_idade,
    porte,
    sexo,
    cidade,
    descricao,
    saude,
    foto,
    status,
  };
}

// FORMULÁRIO DE CADASTRO E EDIÇÃO
export default function FormularioAnimal({
  campos,
  onAlterar,
  onSalvar,
  salvando,
  tituloBotao,
}) {
  return (
    <View style={estilos.formulario}>

      {/* NOME */}
      <Campo
        rotulo="Nome do animal *"
        value={campos.nome}
        onChangeText={(texto) => onAlterar('nome', texto)}
        maxLength={120}
        placeholder="Ex.: Nina"
        editable={!salvando}
      />

      {/* ESPÉCIE */}
      <Campo
        rotulo="Espécie *"
        value={campos.especie}
        onChangeText={(texto) => onAlterar('especie', texto)}
        maxLength={20}
        placeholder="Cachorro ou Gato"
        editable={!salvando}
      />

      {/* RAÇA */}
      <Campo
        rotulo="Raça"
        value={campos.raca}
        onChangeText={(texto) => onAlterar('raca', texto)}
        maxLength={100}
        placeholder="Ex.: Sem raça definida"
        editable={!salvando}
      />

      {/* IDADE */}
      <Campo
        rotulo="Idade *"
        value={String(campos.idade ?? '')}
        onChangeText={(texto) => onAlterar('idade', texto)}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={3}
        placeholder="Ex.: 2"
        editable={!salvando}
      />

      {/* UNIDADE DA IDADE */}
      <Campo
        rotulo="Unidade da idade *"
        value={campos.unidade_idade}
        onChangeText={(texto) =>
          onAlterar('unidade_idade', texto)
        }
        maxLength={5}
        placeholder="anos ou meses"
        editable={!salvando}
      />

      {/* PORTE */}
      <Campo
        rotulo="Porte *"
        value={campos.porte}
        onChangeText={(texto) => onAlterar('porte', texto)}
        maxLength={20}
        placeholder="Pequeno, Médio ou Grande"
        editable={!salvando}
      />

      {/* SEXO */}
      <Campo
        rotulo="Sexo *"
        value={campos.sexo}
        onChangeText={(texto) => onAlterar('sexo', texto)}
        maxLength={20}
        placeholder="Macho ou Fêmea"
        editable={!salvando}
      />

      {/* CIDADE */}
      <Campo
        rotulo="Cidade *"
        value={campos.cidade}
        onChangeText={(texto) => onAlterar('cidade', texto)}
        maxLength={120}
        placeholder="Ex.: Santa Cruz do Sul"
        editable={!salvando}
      />

      {/* DESCRIÇÃO */}
      <Campo
        rotulo="Descrição do animal"
        value={campos.descricao}
        onChangeText={(texto) =>
          onAlterar('descricao', texto)
        }
        maxLength={1000}
        multiline
        numberOfLines={4}
        placeholder="Conte sobre a personalidade, os hábitos e a história do animal."
        editable={!salvando}
        style={estilos.descricao}
      />

      {/* SAÚDE */}
      <Campo
        rotulo="Saúde e cuidados"
        value={campos.saude}
        onChangeText={(texto) => onAlterar('saude', texto)}
        maxLength={500}
        multiline
        numberOfLines={3}
        placeholder="Ex.: Vacinado, castrado e vermifugado."
        editable={!salvando}
        style={estilos.descricao}
      />

      {/* FOTO */}
      <Campo
        rotulo="Link da foto"
        value={campos.foto}
        onChangeText={(texto) => onAlterar('foto', texto)}
        maxLength={1000}
        placeholder="https://exemplo.com/foto.jpg"
        autoCapitalize="none"
        editable={!salvando}
      />

      {/* STATUS */}
      <Campo
        rotulo="Status de adoção *"
        value={campos.status}
        onChangeText={(texto) => onAlterar('status', texto)}
        maxLength={20}
        placeholder="disponivel, em_processo ou adotado"
        editable={!salvando}
      />

      <Text style={estilos.ajuda}>
        * Campos obrigatórios. Preencha as informações
        corretamente para facilitar a adoção responsável.
      </Text>

      <Botao
        titulo={tituloBotao}
        onPress={onSalvar}
        carregando={salvando}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: {
    gap: 12,
  },

  descricao: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  ajuda: {
    color: cores.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
```


### petmatch/components/ui.js

```js
// Componentes visuais reutilizam Props; não escondem regras da aplicação.
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const cores = {
  fundo: '#F4F6F2', papel: '#FFFFFF', texto: '#152B24', muted: '#5C6C63',
  verde: '#245C46', borda: '#DCE4DA', vermelho: '#AA352D',
};

export function Pagina({ children, incluirTopo = false }) {
  return (
    <SafeAreaView style={ui.tela} edges={incluirTopo ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={ui.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.conteudo} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Painel({ children, style = undefined }) {
  return <View style={[ui.painel, style]}>{children}</View>;
}

export function Botao({ titulo, onPress, disabled = false, variante = 'primario', carregando = false }) {
  const bloqueado = disabled || carregando;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado} onPress={onPress}
      style={function estiloBotao({ pressed }) {
        return [ui.botao, variante === 'secundario' && ui.secundario, variante === 'perigo' && ui.perigo,
          (pressed || bloqueado) && { opacity: 0.55 }];
      }}>
      {carregando && <ActivityIndicator size="small" color={variante === 'primario' ? '#FFFFFF' : cores.verde} />}
      <Text style={[ui.textoBotao, variante === 'secundario' && { color: cores.verde }, variante === 'perigo' && { color: cores.vermelho }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({ rotulo, style = undefined, ...propriedades }) {
  return <View style={ui.campo}>
    <Text style={ui.rotulo}>{rotulo}</Text>
    <TextInput accessibilityLabel={rotulo} placeholderTextColor="#7B877F" style={[ui.input, style]} {...propriedades} />
  </View>;
}

export function Aviso({ mensagem, tipo = 'erro' }) {
  if (!mensagem) { return null; }
  return <View style={[ui.aviso, tipo === 'sucesso' && { backgroundColor: '#E9F3E8' }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: tipo === 'sucesso' ? cores.verde : cores.vermelho, lineHeight: 22 }}>{mensagem}</Text>
  </View>;
}

export function Carregamento({ mensagem = 'Carregando…' }) {
  return <View style={ui.carregamento}><ActivityIndicator color={cores.verde} size="large" /><Text style={estilos.texto}>{mensagem}</Text></View>;
}

export function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  subtitulo: { color: cores.muted, fontSize: 16, lineHeight: 25 },
  texto: { color: cores.texto, fontSize: 15, lineHeight: 24 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  separador: { height: 1, backgroundColor: cores.borda, marginVertical: 12 },
  etiqueta: { color: cores.verde, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

const ui = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 20, flexGrow: 1 },
  painel: { backgroundColor: cores.papel, borderWidth: 1, borderColor: cores.borda, borderRadius: 20, padding: 24, gap: 16 },
  botao: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, backgroundColor: cores.verde, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secundario: { backgroundColor: '#EDF2EB', borderWidth: 1, borderColor: cores.borda },
  perigo: { backgroundColor: '#FCEEEB', borderWidth: 1, borderColor: '#EBD3CC' },
  textoBotao: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  campo: { gap: 8 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  input: { color: cores.texto, backgroundColor: '#FAFCF9', borderWidth: 1, borderColor: cores.borda, borderRadius: 12, padding: 14, minHeight: 48, fontSize: 16 },
  aviso: { padding: 14, backgroundColor: '#FCEEEB', borderRadius: 12 },
  carregamento: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: cores.fundo },
});
```


### petmatch/database/petmatch.sql

```sql

-- Banco de dados do PetMatch
-- Plataforma de adoção responsável de animais

CREATE DATABASE IF NOT EXISTS petmatch_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petmatch_db;

-- Usuários do aplicativo
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  nivel ENUM('adotante', 'ong', 'protetor', 'admin')
    NOT NULL DEFAULT 'adotante',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Animais disponíveis para adoção
CREATE TABLE IF NOT EXISTS animais (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  especie ENUM('Cachorro', 'Gato') NOT NULL,
  raca VARCHAR(100),
  idade INT NOT NULL,
  unidade_idade ENUM('anos', 'meses') NOT NULL,
  sexo ENUM('Macho', 'Fêmea') NOT NULL,
  porte ENUM('Pequeno', 'Médio', 'Grande') NOT NULL,
  descricao TEXT,
  cidade VARCHAR(120) NOT NULL,
  foto VARCHAR(1000),
  saude VARCHAR(500),
  status ENUM('disponivel', 'em_processo', 'adotado')
    NOT NULL DEFAULT 'disponivel',
  usuario_id INT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Animais favoritos dos usuários
CREATE TABLE IF NOT EXISTS favoritos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  animal_id INT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorito (usuario_id, animal_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animais(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Solicitações de adoção
CREATE TABLE IF NOT EXISTS adocoes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  animal_id INT NOT NULL,
  mensagem VARCHAR(1000) NOT NULL DEFAULT '',
  tipo_moradia VARCHAR(50),
  possui_outros_animais BOOLEAN,
  observacoes TEXT,
  status ENUM('pendente', 'aprovada', 'recusada', 'cancelada')
    NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animais(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
```


### petmatch/screens/Animais.js

```js

import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Botao,
  Carregamento,
  Painel,
  cores,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function Animais({ navigation, usuario }) {
  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [animalExcluir, setAnimalExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR ANIMAIS NA API
  async function carregarAnimais(signal) {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetchAutenticado('/animais', {
        signal,
      });

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setAnimais(Array.isArray(dados) ? dados : []);
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setErro(falha.message);
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR LISTA AO VOLTAR PARA A TELA
  useFocusEffect(
    useCallback(function atualizarLista() {
      const controle = new AbortController();

      carregarAnimais(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [])
  );

  // SOLICITAR EXCLUSÃO
  function solicitarExclusao(animal) {
    setErroExclusao('');
    setSucesso('');
    setAnimalExcluir(animal);
  }

  function cancelarExclusao() {
    if (!excluindo) {
      setAnimalExcluir(null);
    }
  }

  // EXCLUIR ANIMAL
  async function excluirAnimal() {
    if (!animalExcluir || excluindo) return;

    setExcluindo(true);
    setErroExclusao('');

    try {
      const resposta = await fetchAutenticado(
        '/animais/' + animalExcluir.id,
        { method: 'DELETE' }
      );

      const dados = await lerResposta(resposta);

      setAnimais(function (atuais) {
        return atuais.filter(
          (animal) => animal.id !== animalExcluir.id
        );
      });

      setAnimalExcluir(null);

      setSucesso(
        dados.mensagem || 'Cadastro removido com sucesso.'
      );

      await carregarAnimais();
    } catch (falha) {
      setErroExclusao(falha.message);
    } finally {
      setExcluindo(false);
    }
  }

  // FORMATAR INFORMAÇÕES
  function formatarIdade(animal) {
    if (animal.idade === null || animal.idade === undefined) {
      return 'Idade não informada';
    }

    const idade = Number(animal.idade);
    if (!Number.isFinite(idade)) return String(animal.idade);

    const unidade = animal.unidade_idade || 'anos';

    if (unidade === 'meses') {
      return idade + (idade === 1 ? ' mês' : ' meses');
    }

    return idade + (idade === 1 ? ' ano' : ' anos');
  }

  // CARTÃO DO ANIMAL
  function renderizarAnimal({ item }) {
    const status = item.status || 'disponivel';

    const statusTexto =
      status === 'disponivel'
        ? 'Disponível para adoção'
        : status === 'em_processo'
        ? 'Em processo de adoção'
        : status === 'adotado'
        ? 'Adotado'
        : status;

    return (
      <Painel style={locais.cartao}>
        {item.foto ? (
          <Image
            source={{ uri: item.foto }}
            style={locais.foto}
            resizeMode="cover"
          />
        ) : (
          <View style={locais.semFoto}>
            <Text style={locais.textoSemFoto}>
              Foto do pet
            </Text>
          </View>
        )}

        <View style={locais.informacoes}>
          <Text style={locais.especie}>
            {item.especie || 'Animal para adoção'}
          </Text>

          <Text style={locais.nome}>
            {item.nome}
          </Text>

          <Text style={locais.detalhe}>
            Raça: {item.raca || 'Não informada'}
          </Text>

          <Text style={locais.detalhe}>
            Idade: {formatarIdade(item)}
          </Text>

          <Text style={locais.detalhe}>
            Porte: {item.porte || 'Não informado'}
          </Text>

          <Text style={locais.detalhe}>
            Localização: {item.cidade || 'Não informada'}
          </Text>

          <View style={locais.statusContainer}>
            <Text style={locais.status}>
              {statusTexto}
            </Text>
          </View>

          <View style={locais.acoes}>
            <Botao
              titulo="Conhecer este pet"
              onPress={() =>
                navigation.navigate('DetalhesAnimal', {
                  id: item.id,
                })
              }
            />

            {podeGerenciar && (
              <>
                <Botao
                  titulo="Editar cadastro"
                  variante="secundario"
                  onPress={() =>
                    navigation.navigate('EditarAnimal', {
                      id: item.id,
                    })
                  }
                />

                <Botao
                  titulo="Excluir cadastro"
                  variante="perigo"
                  disabled={excluindo}
                  onPress={() => solicitarExclusao(item)}
                />
              </>
            )}
          </View>
        </View>
      </Painel>
    );
  }

  return (
    <SafeAreaView
      style={locais.tela}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={animais}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarAnimal}
        contentContainerStyle={locais.conteudo}
        refreshing={carregando}
        onRefresh={() => carregarAnimais()}
        ListHeaderComponent={
          <View style={locais.cabecalho}>
            <Text style={estilos.etiqueta}>
              PETMATCH / ADOÇÃO RESPONSÁVEL
            </Text>

            <Text style={estilos.titulo}>
              Encontre seu novo amigo!
            </Text>

            <Text style={estilos.subtitulo}>
              Conheça os animais que estão esperando
              por uma família e descubra quem pode
              fazer parte da sua vida.
            </Text>

            <View style={locais.acoes}>
              {podeGerenciar && (
                <Botao
                  titulo="Cadastrar animal"
                  onPress={() =>
                    navigation.navigate('CadastrarAnimal')
                  }
                />
              )}

              <Botao
                titulo="Atualizar lista"
                variante="secundario"
                disabled={carregando || excluindo}
                onPress={() => carregarAnimais()}
              />
            </View>

            <Text style={locais.contagem}>
              {animais.length} animal(is) cadastrado(s)
            </Text>

            <Aviso mensagem={erro} />
            <Aviso mensagem={sucesso} tipo="sucesso" />
          </View>
        }
        ListEmptyComponent={
          carregando ? (
            <Carregamento mensagem="Buscando animais..." />
          ) : (
            <Painel>
              <Text style={estilos.texto}>
                {erro
                  ? 'Não foi possível carregar os animais. Tente atualizar a lista.'
                  : 'Nenhum animal cadastrado no momento.'}
              </Text>
            </Painel>
          )
        }
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        visible={animalExcluir !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelarExclusao}
      >
        <View style={locais.fundoModal}>
          <View
            style={locais.modal}
            accessibilityViewIsModal
          >
            <Text
              style={estilos.titulo}
              accessibilityRole="header"
            >
              Excluir cadastro?
            </Text>

            <Text style={estilos.texto}>
              O animal "{animalExcluir?.nome}" será
              removido dos anúncios de adoção.
            </Text>

            <Aviso mensagem={erroExclusao} />

            <View style={locais.acoes}>
              <Botao
                titulo="Confirmar exclusão"
                variante="perigo"
                carregando={excluindo}
                onPress={excluirAnimal}
              />

              <Botao
                titulo="Cancelar"
                variante="secundario"
                disabled={excluindo}
                onPress={cancelarExclusao}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const locais = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 48,
    flexGrow: 1,
  },

  cabecalho: {
    marginBottom: 18,
  },

  cartao: {
    marginBottom: 16,
    overflow: 'hidden',
  },

  foto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },

  semFoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E8EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  textoSemFoto: {
    color: cores.muted,
    fontSize: 15,
  },

  informacoes: {
    gap: 7,
  },

  especie: {
    color: cores.verde,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  nome: {
    color: cores.texto,
    fontSize: 25,
    fontWeight: '700',
  },

  detalhe: {
    color: cores.muted,
    fontSize: 14,
  },

  statusContainer: {
    backgroundColor: '#E8EFE4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 10,
  },

  status: {
    color: cores.verde,
    fontSize: 13,
    fontWeight: '700',
  },

  acoes: {
    gap: 10,
    marginTop: 10,
  },

  contagem: {
    color: cores.muted,
    fontSize: 13,
    marginTop: 20,
  },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 27, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: cores.papel,
    borderRadius: 18,
    padding: 24,
    gap: 18,
  },
});
```


### petmatch/screens/CadastrarAnimal.js

```js

import React, { useState } from 'react';
import { Text, View } from 'react-native';

import FormularioAnimal, {
  prepararAnimal,
} from '../components/FormularioAnimal.js';

import {
  Aviso,
  Botao,
  Pagina,
  Painel,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

// CAMPOS INICIAIS DO FORMULÁRIO
const camposIniciais = {
  nome: '',
  especie: '',
  raca: '',
  idade: '',
  unidade_idade: 'anos',
  porte: '',
  sexo: '',
  cidade: '',
  descricao: '',
  saude: '',
  foto: '',
  status: 'disponivel',
};

export default function CadastrarAnimal({
  navigation,
  usuario,
}) {
  const [campos, setCampos] = useState({
    ...camposIniciais,
  });

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // ALTERAR OS CAMPOS DO FORMULÁRIO
  function alterarCampo(campo, texto) {
    setCampos(function (anteriores) {
      return {
        ...anteriores,
        [campo]: texto,
      };
    });

    setErro('');
    setSucesso('');
  }

  // CADASTRAR ANIMAL NA API
  async function cadastrarAnimal() {
    if (salvando) return;

    setErro('');
    setSucesso('');

    try {
      // VALIDAR E PREPARAR OS DADOS
      const animal = prepararAnimal(campos);

      setSalvando(true);

      // ENVIO DO TOKEN JWT PELO FETCH AUTENTICADO
      const resposta = await fetchAutenticado('/animais', {
        method: 'POST',
        body: JSON.stringify(animal),
      });

      const dados = await lerResposta(resposta);

      setSucesso(
        dados.mensagem || 'Animal cadastrado com sucesso!'
      );

      // LIMPAR FORMULÁRIO APÓS O CADASTRO
      setCampos({
        ...camposIniciais,
      });
    } catch (falha) {
      setErro(
        falha.message || 'Não foi possível cadastrar o animal.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // VERIFICAR PERMISSÕES
  const podeCadastrar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  if (!podeCadastrar) {
    return (
      <Pagina>
        <Aviso
          mensagem="Apenas ONGs, protetores e administradores podem cadastrar animais."
        />
      </Pagina>
    );
  }

  return (
    <Pagina>
      {/* CABEÇALHO */}
      <Text style={estilos.etiqueta}>
        PETMATCH / GERENCIAMENTO
      </Text>

      <Text style={estilos.titulo}>
        Cadastrar animal
      </Text>

      <Text style={estilos.subtitulo}>
        Preencha as informações do animal para
        disponibilizá-lo para adoção no PetMatch.
      </Text>

      {/* MENSAGENS */}
      <Aviso mensagem={erro} />

      <Aviso
        mensagem={sucesso}
        tipo="sucesso"
      />

      {/* FORMULÁRIO */}
      <Painel>
        <FormularioAnimal
          campos={campos}
          onAlterar={alterarCampo}
          onSalvar={cadastrarAnimal}
          salvando={salvando}
          tituloBotao="Cadastrar animal"
        />
      </Painel>

      {/* VOLTAR PARA A LISTA */}
      <View style={{ marginTop: 16 }}>
        <Botao
          titulo="Ver animais cadastrados"
          variante="secundario"
          disabled={salvando}
          onPress={() => navigation.navigate('Animais')}
        />
      </View>
    </Pagina>
  );
}
```


### petmatch/screens/CadastroUsuario.js

```js

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API, lerResposta } from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E5',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E7E4DE',
  erro: '#B42318',
};

export default function CadastroUsuario({
  navigation,
  aoEntrar,
}) {
  const { width } = useWindowDimensions();
  const telaGrande = width >= 850;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cadastrarUsuario() {
    if (enviando) return;

    setErro('');

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (
      !nomeLimpo ||
      !emailLimpo ||
      !senha ||
      !confirmacao
    ) {
      setErro('Preencha todos os campos para continuar.');
      return;
    }

    if (nomeLimpo.length > 100) {
      setErro('O nome deve ter no máximo 100 caracteres.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro('Informe um e-mail válido.');
      return;
    }

    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (new TextEncoder().encode(senha).length > 72) {
      setErro('A senha deve ter no máximo 72 bytes.');
      return;
    }

    if (senha !== confirmacao) {
      setErro('As senhas não são iguais.');
      return;
    }

    setEnviando(true);

    let cadastroConcluido = false;

    try {
      // 1. CADASTRAR NO BANCO DE DADOS
      const respostaCadastro = await fetch(
        API + '/auth/cadastro',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: nomeLimpo,
            email: emailLimpo,
            senha,
          }),
        }
      );

      await lerResposta(respostaCadastro);
      cadastroConcluido = true;

      // 2. FAZER LOGIN AUTOMATICAMENTE
      const respostaLogin = await fetch(
        API + '/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailLimpo,
            senha,
          }),
        }
      );

      const dadosLogin = await lerResposta(respostaLogin);

      if (!dadosLogin.token || !dadosLogin.usuario) {
        throw new Error('Resposta de login inválida.');
      }

      // 3. SALVAR TOKEN JWT
      await AsyncStorage.setItem(
        'token',
        dadosLogin.token
      );

      setSenha('');
      setConfirmacao('');

      // 4. ABRIR A HOME PELO APP.JS
      aoEntrar(dadosLogin.usuario);

    } catch (falha) {
      if (cadastroConcluido) {
        setErro(
          'Sua conta foi criada, mas não foi possível entrar automaticamente. Volte ao login e entre com seu e-mail e senha.'
        );
      } else {
        setErro(
          falha.status
            ? falha.message
            : 'Não foi possível criar sua conta. Confira se a API está funcionando.'
        );
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={css.tela}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={css.container}>

          {/* LOGO */}
          <View style={css.cabecalho}>
            <View style={css.logoIcone}>
              <Ionicons
                name="paw"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={css.logoNome}>
                Pet
                <Text style={css.logoDestaque}>
                  Match
                </Text>
              </Text>

              <Text style={css.logoSubtitulo}>
                Conectando pets a novos lares
              </Text>
            </View>
          </View>

          {/* CONTEÚDO */}
          <View
            style={[
              css.conteudo,
              telaGrande && css.conteudoDesktop,
            ]}
          >

            {/* APRESENTAÇÃO */}
            <View style={css.apresentacao}>
              <View style={css.etiqueta}>
                <View style={css.pontoVerde} />

                <Text style={css.etiquetaTexto}>
                  FAÇA PARTE DO PETMATCH
                </Text>
              </View>

              <Text
                style={[
                  css.tituloPrincipal,
                  !telaGrande && css.tituloMobile,
                ]}
              >
                Seu próximo{'\n'}
                melhor amigo{'\n'}
                <Text style={css.tituloDestaque}>
                  espera por você.
                </Text>
              </Text>

              <Text style={css.descricao}>
                Crie sua conta e conheça cães e gatos
                que estão esperando por uma família.
                O primeiro passo para uma nova história
                começa aqui.
              </Text>

              <View style={css.informacao}>
                <View style={css.barraVerde} />

                <Text style={css.informacaoTexto}>
                  A adoção responsável transforma
                  a vida dos animais e de quem os acolhe.
                </Text>
              </View>
            </View>

            {/* FORMULÁRIO */}
            <View style={css.cartao}>

              <Text style={css.tituloFormulario}>
                Crie sua conta
              </Text>

              <Text style={css.subtituloFormulario}>
                Preencha seus dados para começar.
              </Text>

              {!!erro && (
                <View style={css.avisoErro}>
                  <Text style={css.erroTexto}>
                    {erro}
                  </Text>
                </View>
              )}

              {/* NOME */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Nome completo
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="Digite seu nome"
                  placeholderTextColor="#A1A5AD"
                  value={nome}
                  onChangeText={setNome}
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={100}
                  editable={!enviando}
                />
              </View>

              {/* E-MAIL */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  E-mail
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor="#A1A5AD"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  maxLength={150}
                  editable={!enviando}
                />
              </View>

              {/* SENHA */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Senha
                </Text>

                <View style={css.campoSenha}>
                  <TextInput
                    style={css.inputSenha}
                    placeholder="Pelo menos 8 caracteres"
                    placeholderTextColor="#A1A5AD"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!enviando}
                  />

                  <Pressable
                    style={css.botaoMostrar}
                    onPress={() =>
                      setMostrarSenha(!mostrarSenha)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarSenha
                        ? 'Ocultar senhas'
                        : 'Mostrar senhas'
                    }
                  >
                    <Text style={css.mostrarTexto}>
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* CONFIRMAR SENHA */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Confirmar senha
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="Digite sua senha novamente"
                  placeholderTextColor="#A1A5AD"
                  value={confirmacao}
                  onChangeText={setConfirmacao}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!enviando}
                  onSubmitEditing={cadastrarUsuario}
                />
              </View>

              {/* CRIAR CONTA */}
              <Pressable
                style={[
                  css.botaoPrincipal,
                  enviando && css.botaoDesativado,
                ]}
                onPress={cadastrarUsuario}
                disabled={enviando}
                accessibilityRole="button"
              >
                {enviando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={css.botaoPrincipalTexto}>
                    Criar minha conta
                  </Text>
                )}
              </Pressable>

              {/* DIVISOR */}
              <View style={css.divisor}>
                <View style={css.linha} />

                <Text style={css.divisorTexto}>
                  OU
                </Text>

                <View style={css.linha} />
              </View>

              <Text style={css.textoLogin}>
                Já tem uma conta?
              </Text>

              <Pressable
                style={css.botaoSecundario}
                onPress={() => navigation.goBack()}
                disabled={enviando}
                accessibilityRole="button"
              >
                <Text style={css.botaoSecundarioTexto}>
                  Voltar para o login
                </Text>
              </Pressable>

            </View>
          </View>

          {/* RODAPÉ */}
          <View style={css.rodape}>
            <Text style={css.rodapeTexto}>
              PetMatch • Adoção responsável
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const css = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: C.fundo,
  },

  scroll: {
    flexGrow: 1,
  },

  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    gap: 10,
  },

  logoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoNome: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  logoDestaque: {
    color: C.laranja,
  },

  logoSubtitulo: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 1,
  },

  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 25,
  },

  conteudoDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },

  apresentacao: {
    flex: 1,
    maxWidth: 500,
  },

  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF4DF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },

  pontoVerde: {
    width: 7,
    height: 7,
    backgroundColor: C.verde,
    borderRadius: 4,
  },

  etiquetaTexto: {
    color: C.verde,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  tituloPrincipal: {
    color: C.texto,
    fontSize: 43,
    lineHeight: 51,
    fontWeight: '900',
    letterSpacing: -1.5,
  },

  tituloMobile: {
    fontSize: 32,
    lineHeight: 39,
  },

  tituloDestaque: {
    color: C.laranja,
  },

  descricao: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 17,
    maxWidth: 420,
  },

  informacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
    maxWidth: 390,
  },

  barraVerde: {
    width: 4,
    height: 42,
    borderRadius: 3,
    backgroundColor: C.verde,
  },

  informacaoTexto: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  cartao: {
    width: '100%',
    maxWidth: 405,
    alignSelf: 'center',
    backgroundColor: C.branco,
    borderRadius: 22,
    padding: 25,
    borderWidth: 1,
    borderColor: '#EEEAE3',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 25px rgba(60, 50, 35, 0.06)',
      },
      default: {
        elevation: 3,
      },
    }),
  },

  tituloFormulario: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  subtituloFormulario: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 23,
  },

  avisoErro: {
    backgroundColor: '#FFF0EF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  erroTexto: {
    color: C.erro,
    fontSize: 12,
  },

  campoGrupo: {
    marginBottom: 15,
  },

  rotulo: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  campo: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FEFDFC',
    color: C.texto,
    fontSize: 13,
  },

  campoSenha: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFDFC',
  },

  inputSenha: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 13,
    color: C.texto,
  },

  botaoMostrar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  mostrarTexto: {
    color: C.laranja,
    fontSize: 11,
    fontWeight: '700',
  },

  botaoPrincipal: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  botaoDesativado: {
    opacity: 0.65,
  },

  botaoPrincipalTexto: {
    color: C.branco,
    fontSize: 14,
    fontWeight: '800',
  },

  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 17,
  },

  linha: {
    flex: 1,
    height: 1,
    backgroundColor: C.borda,
  },

  divisorTexto: {
    color: C.secundario,
    fontSize: 10,
    fontWeight: '700',
  },

  textoLogin: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 12,
    marginBottom: 12,
  },

  botaoSecundario: {
    height: 46,
    borderWidth: 1,
    borderColor: C.laranja,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoSecundarioTexto: {
    color: C.laranja,
    fontSize: 13,
    fontWeight: '800',
  },

  rodape: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  rodapeTexto: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
  },
});
```


### petmatch/screens/DetalhesAnimal.js

```js

import React, { useCallback, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  cores,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function DetalhesAnimal({
  route,
  navigation,
  usuario,
}) {
  const id = route.params?.id;

  const [animal, setAnimal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // VERIFICAR PERMISSÕES
  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR INFORMAÇÕES DO ANIMAL NA API
  async function carregarAnimal(signal) {
    setCarregando(true);
    setErro('');

    try {
      if (!id) {
        throw new Error(
          'Animal não informado. Volte para a lista de adoção.'
        );
      }

      const resposta = await fetchAutenticado(
        '/animais/' + id,
        { signal }
      );

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setAnimal(dados);
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setAnimal(null);
        setErro(falha.message);
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR DADOS AO VOLTAR PARA A TELA
  useFocusEffect(
    useCallback(function atualizarAnimal() {
      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [id])
  );

  // FORMATAR IDADE
  function formatarIdade() {
    if (
      animal?.idade === null ||
      animal?.idade === undefined
    ) {
      return 'Não informada';
    }

    const idade = Number(animal.idade);

    if (!Number.isFinite(idade)) {
      return String(animal.idade);
    }

    if (animal.unidade_idade === 'meses') {
      return idade + (idade === 1 ? ' mês' : ' meses');
    }

    return idade + (idade === 1 ? ' ano' : ' anos');
  }

  // FORMATAR STATUS
  function formatarStatus(status) {
    switch (status) {
      case 'disponivel':
        return 'Disponível para adoção';

      case 'em_processo':
        return 'Em processo de adoção';

      case 'adotado':
        return 'Adotado';

      default:
        return status || 'Não informado';
    }
  }

  // SOLICITAR ADOÇÃO
  function solicitarAdocao() {
    navigation.navigate('SolicitarAdocao', {
      id: animal.id,
    });
  }

  // EDITAR ANIMAL
  function editarAnimal() {
    navigation.navigate('EditarAnimal', {
      id: animal.id,
    });
  }

  return (
    <Pagina>
      <Text style={estilos.etiqueta}>
        PETMATCH / PERFIL DO ANIMAL
      </Text>

      <Aviso mensagem={erro} />

      {carregando ? (
        <Carregamento mensagem="Carregando informações do pet..." />
      ) : animal ? (
        <>
          <Painel>
            {/* FOTO DO ANIMAL */}
            {animal.foto ? (
              <Image
                source={{ uri: animal.foto }}
                style={locais.foto}
                resizeMode="cover"
              />
            ) : (
              <View style={locais.semFoto}>
                <Text style={locais.textoSemFoto}>
                  Foto não disponível
                </Text>
              </View>
            )}

            {/* INFORMAÇÕES PRINCIPAIS */}
            <Text style={estilos.etiqueta}>
              {animal.especie || 'ANIMAL PARA ADOÇÃO'}
            </Text>

            <Text style={locais.nome}>
              {animal.nome}
            </Text>

            <Text style={estilos.subtitulo}>
              Conheça um pouco mais sobre este pet!
            </Text>

            {/* STATUS DE ADOÇÃO */}
            <View style={locais.statusContainer}>
              <Text style={locais.status}>
                {formatarStatus(animal.status)}
              </Text>
            </View>

            <View style={estilos.separador} />

            {/* CARACTERÍSTICAS */}
            <Text style={estilos.etiqueta}>
              INFORMAÇÕES DO PET
            </Text>

            <View style={locais.informacoes}>
              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Espécie: </Text>
                {animal.especie || 'Não informada'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Raça: </Text>
                {animal.raca || 'Não informada'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Idade: </Text>
                {formatarIdade()}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Porte: </Text>
                {animal.porte || 'Não informado'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Sexo: </Text>
                {animal.sexo || 'Não informado'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Localização: </Text>
                {animal.cidade || 'Não informada'}
              </Text>
            </View>

            <View style={estilos.separador} />

            {/* DESCRIÇÃO */}
            <Text style={estilos.etiqueta}>
              SOBRE MIM
            </Text>

            <Text style={estilos.texto}>
              {animal.descricao ||
                'Ainda não temos uma descrição cadastrada para este animal.'}
            </Text>

            {/* INFORMAÇÕES DE SAÚDE */}
            {animal.saude ? (
              <>
                <View style={estilos.separador} />

                <Text style={estilos.etiqueta}>
                  SAÚDE E CUIDADOS
                </Text>

                <Text style={estilos.texto}>
                  {animal.saude}
                </Text>
              </>
            ) : null}

            {/* SOLICITAÇÃO DE ADOÇÃO */}
            {animal.status === 'disponivel' &&
              usuario?.nivel !== 'admin' &&
              usuario?.nivel !== 'ong' &&
              usuario?.nivel !== 'protetor' && (
                <View style={locais.areaBotoes}>
                  <Botao
                    titulo="Quero adotar"
                    onPress={solicitarAdocao}
                  />
                </View>
              )}

            {/* GERENCIAMENTO */}
            {podeGerenciar && (
              <View style={locais.areaBotoes}>
                <Botao
                  titulo="Editar informações"
                  onPress={editarAnimal}
                  variante="secundario"
                />
              </View>
            )}
          </Painel>
        </>
      ) : (
        <Botao
          titulo="Tentar novamente"
          onPress={() => carregarAnimal()}
        />
      )}

      <View style={locais.voltar}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          onPress={() => navigation.goBack()}
        />
      </View>
    </Pagina>
  );
}

const locais = StyleSheet.create({
  foto: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    marginBottom: 20,
  },

  semFoto: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E8EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  textoSemFoto: {
    color: cores.muted,
    fontSize: 15,
  },

  nome: {
    color: cores.texto,
    fontSize: 30,
    fontWeight: '700',
    marginVertical: 8,
  },

  statusContainer: {
    backgroundColor: '#E8EFE4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginVertical: 16,
  },

  status: {
    color: cores.verde,
    fontSize: 14,
    fontWeight: '700',
  },

  informacoes: {
    gap: 12,
    marginVertical: 16,
  },

  detalhe: {
    color: cores.texto,
    fontSize: 15,
    lineHeight: 23,
  },

  rotulo: {
    fontWeight: '700',
  },

  areaBotoes: {
    marginTop: 24,
    gap: 12,
  },

  voltar: {
    marginTop: 16,
  },
});
```


### petmatch/screens/EditarAnimal.js

```js

import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import FormularioAnimal, {
  prepararAnimal,
} from '../components/FormularioAnimal.js';

import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function EditarAnimal({
  route,
  navigation,
  usuario,
}) {
  // ID DO ANIMAL ENVIADO PELA NAVEGAÇÃO
  const id = route.params?.id;

  const [campos, setCampos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // VERIFICAR PERMISSÕES
  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR DADOS DO ANIMAL
  async function carregarAnimal(signal) {
    setCarregando(true);
    setErro('');
    setSucesso('');

    try {
      if (!id) {
        throw new Error(
          'Animal não informado. Volte para a lista de adoção.'
        );
      }

      const resposta = await fetchAutenticado(
        '/animais/' + id,
        { signal }
      );

      const animal = await lerResposta(resposta);

      if (signal?.aborted) return;

      // PREENCHER O FORMULÁRIO COM OS DADOS DO ANIMAL
      setCampos({
        nome: animal.nome || '',
        especie: animal.especie || '',
        raca: animal.raca || '',
        idade:
          animal.idade === null ||
          animal.idade === undefined
            ? ''
            : String(animal.idade),
        unidade_idade: animal.unidade_idade || 'anos',
        porte: animal.porte || '',
        sexo: animal.sexo || '',
        cidade: animal.cidade || '',
        descricao: animal.descricao || '',
        saude: animal.saude || '',
        foto: animal.foto || '',
        status: animal.status || 'disponivel',
      });
    } catch (falha) {
      if (!signal?.aborted) {
        setCampos(null);
        setErro(
          falha.message ||
          'Não foi possível carregar o animal.'
        );
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR DADOS AO ABRIR A TELA
  useFocusEffect(
    useCallback(function atualizarDados() {
      if (!podeGerenciar) {
        return undefined;
      }

      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [id, podeGerenciar])
  );

  // ALTERAR CAMPOS DO FORMULÁRIO
  function alterarCampo(campo, texto) {
    setCampos(function (anteriores) {
      return {
        ...anteriores,
        [campo]: texto,
      };
    });

    setErro('');
    setSucesso('');
  }

  // ATUALIZAR ANIMAL NA API
  async function atualizarAnimal() {
    if (salvando || !campos) return;

    setErro('');
    setSucesso('');

    try {
      // VALIDAR OS DADOS ANTES DO ENVIO
      const animal = prepararAnimal(campos);

      setSalvando(true);

      // PUT ATUALIZA O ANIMAL PELO ID
      // O JWT É ENVIADO PELO FETCH AUTENTICADO
      const resposta = await fetchAutenticado(
        '/animais/' + id,
        {
          method: 'PUT',
          body: JSON.stringify(animal),
        }
      );

      const dados = await lerResposta(resposta);

      setSucesso(
        dados.mensagem ||
        'Informações do animal atualizadas com sucesso!'
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível atualizar o animal.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // BLOQUEAR ACESSO NÃO AUTORIZADO
  if (!podeGerenciar) {
    return (
      <Pagina>
        <Aviso
          mensagem="Apenas ONGs, protetores e administradores podem editar animais."
        />
      </Pagina>
    );
  }

  return (
    <Pagina>
      {/* CABEÇALHO */}
      <Text style={estilos.etiqueta}>
        PETMATCH / GERENCIAMENTO
      </Text>

      <Text style={estilos.titulo}>
        Editar animal
      </Text>

      <Text style={estilos.subtitulo}>
        Atualize as informações do animal para
        manter seu perfil sempre completo.
      </Text>

      {/* MENSAGENS */}
      <Aviso mensagem={erro} />

      <Aviso
        mensagem={sucesso}
        tipo="sucesso"
      />

      {/* FORMULÁRIO */}
      {carregando ? (
        <Carregamento
          mensagem="Carregando informações do animal..."
        />
      ) : campos ? (
        <Painel>
          <FormularioAnimal
            campos={campos}
            onAlterar={alterarCampo}
            onSalvar={atualizarAnimal}
            salvando={salvando}
            tituloBotao="Salvar alterações"
          />
        </Painel>
      ) : (
        <Botao
          titulo="Tentar novamente"
          onPress={() => carregarAnimal()}
        />
      )}

      {/* BOTÃO VOLTAR */}
      <View style={{ marginTop: 16 }}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          disabled={salvando}
          onPress={() => navigation.goBack()}
        />
      </View>
    </Pagina>
  );
}
```


### petmatch/screens/Favoritos.js

```js

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function Favoritos({ navigation }) {
  const [favoritos, setFavoritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [erro, setErro] = useState('');

  function avisar(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  function confirmarRemocao(animalId, nome) {
    const mensagem = `Deseja remover ${nome} dos seus favoritos?`;

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) {
        removerFavorito(animalId);
      }
      return;
    }

    Alert.alert(
      'Remover favorito',
      mensagem,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => removerFavorito(animalId),
        },
      ]
    );
  }

  // READ - CARREGAR OS ANIMAIS FAVORITOS
  const carregarFavoritos = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
        const resposta = await fetchAutenticado('/favoritos');
        const dados = await lerResposta(resposta);

        setFavoritos(Array.isArray(dados) ? dados : []);
      } catch (erroRequisicao) {
        setErro(
          erroRequisicao.message ||
            'Não foi possível carregar seus favoritos.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    []
  );

  // ATUALIZAR SEMPRE QUE ABRIR A TELA
  useFocusEffect(
    useCallback(() => {
      carregarFavoritos();
    }, [carregarFavoritos])
  );

  // DELETE - REMOVER ANIMAL DOS FAVORITOS
  async function removerFavorito(animalId) {
    try {
      setRemovendoId(animalId);

      const resposta = await fetchAutenticado(
        `/favoritos/${animalId}`,
        {
          method: 'DELETE',
        }
      );

      await lerResposta(resposta);

      // ATUALIZAR A LISTA SEM PRECISAR REABRIR A TELA
      setFavoritos((listaAtual) =>
        listaAtual.filter(
          (favorito) =>
            Number(favorito.animal_id) !== Number(animalId)
        )
      );

      avisar(
        'Favorito removido',
        'O animal foi removido dos seus favoritos.'
      );
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível remover o favorito.'
      );
    } finally {
      setRemovendoId(null);
    }
  }

  function formatarIdade(idade, unidade) {
    if (idade === null || idade === undefined) {
      return 'Idade não informada';
    }

    const numero = Number(idade);
    const tipo = unidade || 'anos';

    if (tipo === 'meses' || tipo === 'mes') {
      return `${numero} ${numero === 1 ? 'mês' : 'meses'}`;
    }

    return `${numero} ${numero === 1 ? 'ano' : 'anos'}`;
  }

  function nomeStatus(status) {
    switch (status) {
      case 'disponivel':
        return 'Disponível para adoção';

      case 'em_processo':
        return 'Em processo de adoção';

      case 'adotado':
        return 'Adotado';

      default:
        return 'Status não informado';
    }
  }

  function corStatus(status) {
    switch (status) {
      case 'disponivel':
        return '#25805A';

      case 'em_processo':
        return '#B7791F';

      case 'adotado':
        return '#607D8B';

      default:
        return '#607D8B';
    }
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
        />

        <Text style={estilos.textoAuxiliar}>
          Carregando seus favoritos...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => carregarFavoritos(false)}
        />
      }
    >
      <Text style={estilos.titulo}>
        Meus favoritos
      </Text>

      <Text style={estilos.subtitulo}>
        Aqui ficam os animais que chamaram sua atenção.
        Você pode voltar para conhecer melhor cada um deles.
      </Text>

      {erro ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.textoErro}>
            {erro}
          </Text>

          <Botao
            titulo="Tentar novamente"
            onPress={() => carregarFavoritos()}
          />
        </View>
      ) : favoritos.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.tituloVazio}>
            Você ainda não tem favoritos
          </Text>

          <Text style={estilos.textoAuxiliar}>
            Explore os animais disponíveis e salve aqueles
            que você gostaria de conhecer melhor.
          </Text>

          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Conhecer animais"
              onPress={() => navigation.navigate('Animais')}
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={estilos.quantidade}>
            {favoritos.length}{' '}
            {favoritos.length === 1
              ? 'animal salvo'
              : 'animais salvos'}
          </Text>

          {favoritos.map((animal) => {
            const removendo = removendoId === animal.animal_id;

            return (
              <View
                key={animal.id}
                style={estilos.cartao}
              >
                {animal.foto ? (
                  <Image
                    source={{ uri: animal.foto }}
                    style={estilos.foto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={estilos.semFoto}>
                    <Text style={estilos.textoSemFoto}>
                      Foto não disponível
                    </Text>
                  </View>
                )}

                <View style={estilos.informacoes}>
                  <View style={estilos.cabecalho}>
                    <Text style={estilos.nomeAnimal}>
                      {animal.nome}
                    </Text>

                    <View
                      style={[
                        estilos.etiqueta,
                        {
                          backgroundColor:
                            corStatus(animal.status) + '18',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoEtiqueta,
                          {
                            color: corStatus(animal.status),
                          },
                        ]}
                      >
                        {nomeStatus(animal.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={estilos.detalhes}>
                    {animal.especie}
                    {animal.raca ? ` • ${animal.raca}` : ''}
                  </Text>

                  <Text style={estilos.detalhes}>
                    {formatarIdade(
                      animal.idade,
                      animal.unidade_idade
                    )}
                    {animal.porte ? ` • Porte ${animal.porte}` : ''}
                  </Text>

                  {animal.cidade ? (
                    <Text style={estilos.detalhes}>
                      Localização: {animal.cidade}
                    </Text>
                  ) : null}

                  {animal.descricao ? (
                    <Text
                      style={estilos.descricao}
                      numberOfLines={3}
                    >
                      {animal.descricao}
                    </Text>
                  ) : null}

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Ver detalhes"
                      onPress={() =>
                        navigation.navigate(
                          'DetalhesAnimal',
                          {
                            id: animal.animal_id,
                          }
                        )
                      }
                    />
                  </View>

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo={
                        removendo
                          ? 'Removendo...'
                          : 'Remover dos favoritos'
                      }
                      variante="secundario"
                      disabled={removendoId !== null}
                      carregando={removendo}
                      onPress={() =>
                        confirmarRemocao(
                          animal.animal_id,
                          animal.nome
                        )
                      }
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#F8F9FA',
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 24,
  },

  quantidade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#607D8B',
    marginBottom: 16,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  foto: {
    width: '100%',
    height: 220,
  },

  semFoto: {
    height: 180,
    backgroundColor: '#EAF4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoSemFoto: {
    fontSize: 14,
    color: '#607D8B',
  },

  informacoes: {
    padding: 18,
  },

  cabecalho: {
    marginBottom: 12,
  },

  nomeAnimal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  etiqueta: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  detalhes: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 7,
  },

  descricao: {
    fontSize: 14,
    color: '#455A64',
    lineHeight: 21,
    marginTop: 10,
  },

  espacoBotao: {
    marginTop: 12,
  },

  cartaoVazio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  tituloVazio: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 12,
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 21,
  },

  textoErro: {
    fontSize: 14,
    color: '#B54747',
    textAlign: 'center',
    marginBottom: 16,
  },

});
```


### petmatch/screens/Home.js

```js

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E9E5DE',
  verdeClaro: '#EDF5E5',
};

const FOTO_CAPA =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop&q=85';

function listaAnimais(dados) {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.animais)) return dados.animais;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
}

function fotoAnimal(animal) {
  const foto =
    animal?.imagem ||
    animal?.foto ||
    animal?.foto_url ||
    animal?.imagem_url;

  if (typeof foto !== 'string' || !foto.trim()) {
    return null;
  }

  return foto.trim();
}

function nomeEspecie(animal) {
  const especie = String(
    animal?.especie || animal?.tipo || ''
  ).toLowerCase();

  if (especie.includes('cach') || especie.includes('canin')) {
    return 'Cachorro';
  }

  if (especie.includes('gat') || especie.includes('felin')) {
    return 'Gato';
  }

  return animal?.especie || animal?.tipo || 'Pet';
}

function informacaoAnimal(animal) {
  return [
    nomeEspecie(animal),
    animal?.idade ? String(animal.idade) : null,
    animal?.cidade ? String(animal.cidade) : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

function BotaoMenu({ titulo, ativo, onPress, icone }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        css.menuBotao,
        ativo && css.menuBotaoAtivo,
      ]}
      accessibilityRole="button"
    >
      {icone ? (
        <Ionicons
          name={icone}
          size={17}
          color={ativo ? C.laranja : C.texto}
        />
      ) : null}

      <Text
        style={[
          css.menuTexto,
          ativo && css.menuTextoAtivo,
        ]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export default function Home({
  navigation,
  usuario,
  sair,
  atualizarUsuario,
  aviso,
}) {
  const { width } = useWindowDimensions();

  const desktop = width >= 900;
  const tablet = width >= 620;
  const colunas = desktop ? 3 : tablet ? 2 : 1;

  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [aba, setAba] = useState('Inicio');
  const [favoritos, setFavoritos] = useState([]);

  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  const admin = usuario?.nivel === 'admin';

  const nomeUsuario =
    usuario?.nome?.trim()?.split(' ')[0] || 'Usuário';

  const carregarDados = useCallback(async () => {
    try {
      const resposta = await fetchAutenticado('/animais');
      const dados = await lerResposta(resposta);

      setAnimais(listaAnimais(dados));
      setErro('');
    } catch (falha) {
      if (falha.status !== 401) {
        setErro('Não foi possível carregar os animais.');
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarFavoritos = useCallback(async () => {
    try {
      const resposta = await fetchAutenticado('/favoritos');
      const dados = await lerResposta(resposta);

      const lista = Array.isArray(dados)
        ? dados
        : Array.isArray(dados?.favoritos)
          ? dados.favoritos
          : [];

      setFavoritos(
        lista.map((item) =>
          String(item.animal_id ?? item.animal?.id ?? item.id)
        )
      );
    } catch {
      // Os animais continuam visíveis mesmo se
      // a lista de favoritos não carregar.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function atualizar() {
        await Promise.all([
          carregarDados(),
          carregarFavoritos(),
        ]);

        try {
          const resposta = await fetchAutenticado('/auth/me');
          const dados = await lerResposta(resposta);

          if (ativo && atualizarUsuario) {
            atualizarUsuario(dados.usuario || dados);
          }
        } catch {
          // A autenticação é tratada pelo serviço.
        }
      }

      atualizar();

      return () => {
        ativo = false;
      };
    }, [carregarDados, carregarFavoritos, atualizarUsuario])
  );

  function abrirAnimais() {
    navigation.navigate('Animais');
  }

  function abrirPerfil() {
    navigation.navigate('Perfil');
  }

  function abrirDetalhes(animal) {
    navigation.navigate('DetalhesAnimal', {
      animalId: animal.id,
      id: animal.id,
      animal,
    });
  }

  async function alternarFavorito(animal) {
    const id = String(animal.id);
    const jaFavorito = favoritos.includes(id);

    try {
      const resposta = await fetchAutenticado(
        jaFavorito ? `/favoritos/${animal.id}` : '/favoritos',
        {
          method: jaFavorito ? 'DELETE' : 'POST',
          ...(!jaFavorito
            ? {
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  animal_id: animal.id,
                }),
              }
            : {}),
        }
      );

      await lerResposta(resposta);

      setFavoritos((anteriores) =>
        jaFavorito
          ? anteriores.filter((item) => item !== id)
          : [...anteriores, id]
      );
    } catch (falha) {
      setErro(
        falha.message || 'Não foi possível atualizar o favorito.'
      );
    }
  }

  const animaisFiltrados = animais.filter((animal) => {
    const especie = nomeEspecie(animal);
    const correspondeTipo =
      tipo === 'Todos' || especie === tipo;

    const texto = [
      animal.nome,
      animal.raca,
      animal.cidade,
      especie,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      correspondeTipo &&
      texto.includes(busca.trim().toLowerCase())
    );
  });

  const destaques = animaisFiltrados.slice(0, 6);

  return (
    <View style={css.tela}>
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABEÇALHO */}
        <View style={css.cabecalho}>
          <View style={css.largura}>
            <View
              style={[
                css.cabecalhoInterno,
                !desktop && css.cabecalhoMobile,
              ]}
            >
              <Pressable
                style={css.marca}
                onPress={() => setAba('Inicio')}
              >
                <View style={css.logoIcone}>
                  <Ionicons
                    name="paw"
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View>
                  <Text style={css.logoNome}>
                    Pet
                    <Text style={css.logoLaranja}>
                      Match
                    </Text>
                  </Text>
                  <Text style={css.logoDescricao}>
                    Conectando pets a novos lares
                  </Text>
                </View>
              </Pressable>

              <View style={css.menu}>
                <BotaoMenu
                  titulo="Início"
                  ativo={aba === 'Inicio'}
                  onPress={() => setAba('Inicio')}
                />

                <BotaoMenu
                  titulo="Animais"
                  onPress={abrirAnimais}
                />

                <BotaoMenu
                  titulo="Sobre"
                  ativo={aba === 'Sobre'}
                  onPress={() => setAba('Sobre')}
                />

                <BotaoMenu
                  titulo="Contato"
                  ativo={aba === 'Contato'}
                  onPress={() => setAba('Contato')}
                />
              </View>

              <View style={css.menuConta}>
                <BotaoMenu
                  titulo={desktop ? 'Perfil' : nomeUsuario}
                  icone="person-outline"
                  onPress={abrirPerfil}
                />

                <Pressable
                  onPress={sair}
                  style={css.botaoSair}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={17}
                    color={C.secundario}
                  />
                  <Text style={css.botaoSairTexto}>
                    Sair
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {!!(erro || aviso) && (
          <View style={css.largura}>
            <View style={css.aviso}>
              <Text style={css.avisoTexto}>
                {erro || aviso}
              </Text>
            </View>
          </View>
        )}

        {aba === 'Inicio' && (
          <>
            {/* HERO */}
            <View style={css.largura}>
              <View
                style={[
                  css.hero,
                  !desktop && css.heroMobile,
                ]}
              >
                <View style={css.heroConteudo}>
                  <View style={css.etiqueta}>
                    <Ionicons
                      name="paw-outline"
                      size={14}
                      color={C.verde}
                    />
                    <Text style={css.etiquetaTexto}>
                      ADOÇÃO RESPONSÁVEL
                    </Text>
                  </View>

                  <Text
                    style={[
                      css.heroTitulo,
                      !desktop && css.heroTituloMobile,
                    ]}
                  >
                    Conectando pets a{' '}
                    <Text style={css.textoLaranja}>
                      novos lares.
                    </Text>
                  </Text>

                  <Text style={css.heroDescricao}>
                    Encontre seu novo melhor amigo e
                    transforme duas vidas para sempre.
                  </Text>

                  <Text style={css.heroComplemento}>
                    Conheça animais que esperam por uma
                    família e dê o primeiro passo para
                    uma adoção responsável.
                  </Text>

                  <Pressable
                    style={css.botaoVerde}
                    onPress={abrirAnimais}
                  >
                    <Text style={css.botaoVerdeTexto}>
                      Ver todos os animais
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>

                <View style={css.heroImagemContainer}>
                  <Image
                    source={{ uri: FOTO_CAPA }}
                    style={css.heroImagem}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            {/* BUSCA */}
            <View style={css.largura}>
              <View style={css.buscaCartao}>
                <View style={css.buscaTituloLinha}>
                  <View>
                    <Text style={css.buscaTitulo}>
                      Encontre seu novo amigo
                    </Text>
                    <Text style={css.buscaDescricao}>
                      Pesquise pelo nome, raça ou cidade.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    css.buscaLinha,
                    !tablet && css.buscaLinhaMobile,
                  ]}
                >
                  <View style={css.campoBusca}>
                    <Ionicons
                      name="search-outline"
                      size={19}
                      color={C.secundario}
                    />
                    <TextInput
                      value={busca}
                      onChangeText={setBusca}
                      placeholder="Nome, raça ou cidade..."
                      placeholderTextColor="#9DA2AA"
                      style={css.inputBusca}
                    />
                  </View>

                  <View style={css.filtros}>
                    {['Todos', 'Cachorro', 'Gato'].map(
                      (opcao) => (
                        <Pressable
                          key={opcao}
                          onPress={() => setTipo(opcao)}
                          style={[
                            css.filtro,
                            tipo === opcao &&
                              css.filtroAtivo,
                          ]}
                        >
                          <Text
                            style={[
                              css.filtroTexto,
                              tipo === opcao &&
                                css.filtroTextoAtivo,
                            ]}
                          >
                            {opcao}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ANIMAIS EM DESTAQUE */}
            <View style={css.largura}>
              <View style={css.secao}>
                <View style={css.secaoCabecalho}>
                  <View style={css.secaoTexto}>
                    <Text style={css.secaoEtiqueta}>
                      CONHEÇA QUEM ESTÁ ESPERANDO
                    </Text>
                    <Text style={css.secaoTitulo}>
                      Animais para adoção
                    </Text>
                    <Text style={css.secaoDescricao}>
                      Talvez seu próximo companheiro
                      esteja aqui.
                    </Text>
                  </View>

                  <Pressable
                    style={css.linkVerTodos}
                    onPress={abrirAnimais}
                  >
                    <Text style={css.linkVerTodosTexto}>
                      Ver todos
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={C.laranja}
                    />
                  </Pressable>
                </View>

                {carregando ? (
                  <View style={css.estadoVazio}>
                    <ActivityIndicator
                      color={C.laranja}
                      size="large"
                    />
                    <Text style={css.estadoTexto}>
                      Carregando animais...
                    </Text>
                  </View>
                ) : destaques.length === 0 ? (
                  <View style={css.estadoVazio}>
                    <Ionicons
                      name="paw-outline"
                      size={35}
                      color={C.verde}
                    />
                    <Text style={css.estadoTitulo}>
                      Nenhum animal encontrado
                    </Text>
                    <Text style={css.estadoTexto}>
                      {busca || tipo !== 'Todos'
                        ? 'Tente mudar os filtros da pesquisa.'
                        : 'Ainda não há animais cadastrados.'}
                    </Text>
                  </View>
                ) : (
                  <View style={css.grade}>
                    {destaques.map((animal) => {
                      const imagem = fotoAnimal(animal);
                      const favorito = favoritos.includes(
                        String(animal.id)
                      );

                      return (
                        <View
                          key={String(animal.id)}
                          style={[
                            css.cartaoAnimal,
                            {
                              width: tablet
                                ? `${100 / colunas - 2}%`
                                : '100%',
                            },
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              abrirDetalhes(animal)
                            }
                          >
                            <View style={css.imagemAnimal}>
                              {imagem ? (
                                <Image
                                  source={{ uri: imagem }}
                                  style={css.fotoAnimal}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={css.semFoto}
                                >
                                  <Ionicons
                                    name="paw-outline"
                                    size={42}
                                    color="#B9C7AC"
                                  />
                                  <Text
                                    style={css.semFotoTexto}
                                  >
                                    Sem foto
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              alternarFavorito(animal)
                            }
                            style={css.favoritar}
                            accessibilityRole="button"
                            accessibilityLabel={
                              favorito
                                ? 'Remover dos favoritos'
                                : 'Adicionar aos favoritos'
                            }
                          >
                            <Ionicons
                              name={
                                favorito
                                  ? 'heart'
                                  : 'heart-outline'
                              }
                              size={20}
                              color={
                                favorito
                                  ? C.laranja
                                  : C.texto
                              }
                            />
                          </Pressable>

                          <View style={css.animalConteudo}>
                            <Text style={css.animalNome}>
                              {animal.nome || 'Sem nome'}
                            </Text>

                            <Text
                              style={css.animalDescricao}
                              numberOfLines={2}
                            >
                              {informacaoAnimal(animal)}
                            </Text>

                            <Pressable
                              style={css.botaoDetalhes}
                              onPress={() =>
                                abrirDetalhes(animal)
                              }
                            >
                              <Text
                                style={css.botaoDetalhesTexto}
                              >
                                Conhecer
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={C.laranja}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* SOBRE O PROJETO */}
            <View style={css.secaoSobre}>
              <View style={css.largura}>
                <View style={css.sobreInterno}>
                  <Text style={css.secaoEtiqueta}>
                    SOBRE O PETMATCH
                  </Text>
                  <Text style={css.secaoTitulo}>
                    Uma conexão que muda vidas
                  </Text>
                  <Text style={css.sobreDescricao}>
                    O PetMatch foi criado para facilitar
                    o encontro entre pessoas interessadas
                    em adotar e animais divulgados por
                    ONGs e protetores independentes.
                  </Text>

                  <View style={css.passos}>
                    {[
                      {
                        icone: 'search-outline',
                        titulo: 'Encontre',
                        texto: 'Conheça os animais disponíveis para adoção.',
                      },
                      {
                        icone: 'bookmark-outline',
                        titulo: 'Favorite',
                        texto: 'Salve os animais que chamaram sua atenção.',
                      },
                      {
                        icone: 'home-outline',
                        titulo: 'Adote',
                        texto: 'Entre com uma solicitação de adoção.',
                      },
                    ].map((passo) => (
                      <View
                        key={passo.titulo}
                        style={css.passo}
                      >
                        <View style={css.passoIcone}>
                          <Ionicons
                            name={passo.icone}
                            size={23}
                            color={C.verde}
                          />
                        </View>
                        <Text style={css.passoTitulo}>
                          {passo.titulo}
                        </Text>
                        <Text style={css.passoTexto}>
                          {passo.texto}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* GERENCIAMENTO */}
            {podeGerenciar && (
              <View style={css.largura}>
                <View style={css.gerenciamento}>
                  <View style={css.gerenciamentoTexto}>
                    <Text style={css.secaoEtiqueta}>
                      ÁREA DE GERENCIAMENTO
                    </Text>
                    <Text style={css.gerenciamentoTitulo}>
                      Gerencie os animais cadastrados
                    </Text>
                    <Text style={css.gerenciamentoDescricao}>
                      Adicione novos animais e mantenha
                      os anúncios atualizados.
                    </Text>
                  </View>

                  <View style={css.gerenciamentoBotoes}>
                    <Pressable
                      style={css.botaoLaranja}
                      onPress={() =>
                        navigation.navigate(
                          'CadastrarAnimal'
                        )
                      }
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={css.botaoLaranjaTexto}>
                        Cadastrar animal
                      </Text>
                    </Pressable>

                    {admin && (
                      <Pressable
                        style={css.botaoContorno}
                        onPress={() =>
                          navigation.navigate('Usuarios')
                        }
                      >
                        <Ionicons
                          name="people-outline"
                          size={17}
                          color={C.laranja}
                        />
                        <Text
                          style={css.botaoContornoTexto}
                        >
                          Gerenciar usuários
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {aba === 'Sobre' && (
          <View style={css.largura}>
            <View style={css.paginaInterna}>
              <Text style={css.secaoEtiqueta}>
                CONHEÇA O PETMATCH
              </Text>
              <Text style={css.secaoTitulo}>
                Sobre o projeto
              </Text>
              <Text style={css.sobreDescricao}>
                O PetMatch busca facilitar a adoção
                responsável de cães e gatos, aproximando
                pessoas interessadas em adotar de ONGs e
                protetores independentes.
              </Text>

              <View style={css.passos}>
                {[
                  {
                    icone: 'search-outline',
                    titulo: 'Encontre',
                    texto: 'Explore os animais cadastrados na plataforma.',
                  },
                  {
                    icone: 'bookmark-outline',
                    titulo: 'Favorite',
                    texto: 'Guarde seus animais preferidos para consultar depois.',
                  },
                  {
                    icone: 'home-outline',
                    titulo: 'Solicite a adoção',
                    texto: 'Preencha uma solicitação para iniciar o processo.',
                  },
                ].map((item) => (
                  <View
                    key={item.titulo}
                    style={css.passo}
                  >
                    <View style={css.passoIcone}>
                      <Ionicons
                        name={item.icone}
                        size={24}
                        color={C.verde}
                      />
                    </View>
                    <Text style={css.passoTitulo}>
                      {item.titulo}
                    </Text>
                    <Text style={css.passoTexto}>
                      {item.texto}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  css.botaoVerde,
                  { alignSelf: 'flex-start', marginTop: 28 },
                ]}
                onPress={abrirAnimais}
              >
                <Text style={css.botaoVerdeTexto}>
                  Conhecer os animais
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {aba === 'Contato' && (
          <View style={css.largura}>
            <View style={css.paginaInterna}>
              <Text style={css.secaoEtiqueta}>
                ENTRE EM CONTATO
              </Text>
              <Text style={css.secaoTitulo}>
                Fale com o PetMatch
              </Text>
              <Text style={css.sobreDescricao}>
                Precisa de informações sobre um animal
                ou sobre o processo de adoção? Acesse o
                perfil do animal para consultar os dados
                disponíveis e iniciar uma solicitação.
              </Text>

              <Pressable
                style={[
                  css.botaoVerde,
                  { alignSelf: 'flex-start', marginTop: 25 },
                ]}
                onPress={abrirAnimais}
              >
                <Text style={css.botaoVerdeTexto}>
                  Ver animais disponíveis
                </Text>
              </Pressable>

              <Text style={css.contatoNota}>
                O formulário de contato será conectado
                quando configurarmos o serviço de
                recebimento de mensagens.
              </Text>
            </View>
          </View>
        )}

        {/* RODAPÉ */}
        <View style={css.rodape}>
          <View style={css.largura}>
            <View style={css.rodapeInterno}>
              <Text style={css.rodapeMarca}>
                Pet<Text style={css.logoLaranja}>Match</Text>
              </Text>
              <Text style={css.rodapeTexto}>
                Conectando pets a novos lares.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const css = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: C.fundo,
  },
  scroll: {
    flexGrow: 1,
  },
  largura: {
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },

  cabecalho: {
    backgroundColor: C.branco,
    borderBottomWidth: 1,
    borderBottomColor: C.borda,
  },
  cabecalhoInterno: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  cabecalhoMobile: {
    flexWrap: 'wrap',
    paddingVertical: 14,
    gap: 12,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcone: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoNome: {
    fontSize: 23,
    fontWeight: '900',
    color: C.texto,
    letterSpacing: -0.7,
  },
  logoLaranja: {
    color: C.laranja,
  },
  logoDescricao: {
    fontSize: 10,
    color: C.secundario,
  },
  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  menuConta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBotao: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBotaoAtivo: {
    backgroundColor: '#FFF2E9',
  },
  menuTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: C.texto,
  },
  menuTextoAtivo: {
    color: C.laranja,
  },
  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },
  botaoSairTexto: {
    fontSize: 12,
    color: C.secundario,
  },

  aviso: {
    backgroundColor: '#FFF1EA',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  avisoTexto: {
    color: '#A14D20',
    fontSize: 12,
  },

  hero: {
    flexDirection: 'row',
    backgroundColor: '#FFF1E7',
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 30,
    minHeight: 340,
  },
  heroMobile: {
    flexDirection: 'column',
  },
  heroConteudo: {
    flex: 1,
    padding: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EAF3DE',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 30,
    marginBottom: 18,
  },
  etiquetaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: C.verde,
    letterSpacing: 0.4,
  },
  heroTitulo: {
    color: C.texto,
    fontSize: 39,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: -1.1,
    maxWidth: 510,
  },
  heroTituloMobile: {
    fontSize: 31,
    lineHeight: 38,
  },
  textoLaranja: {
    color: C.laranja,
  },
  heroDescricao: {
    color: C.texto,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 15,
    maxWidth: 430,
  },
  heroComplemento: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 410,
  },
  botaoVerde: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: C.verde,
    paddingHorizontal: 21,
    height: 45,
    borderRadius: 11,
    marginTop: 22,
  },
  botaoVerdeTexto: {
    color: C.branco,
    fontWeight: '800',
    fontSize: 13,
  },
  heroImagemContainer: {
    flex: 0.85,
    minHeight: 245,
    backgroundColor: '#E8E3D9',
  },
  heroImagem: {
    width: '100%',
    height: '100%',
    minHeight: 245,
  },

  buscaCartao: {
    backgroundColor: C.branco,
    borderRadius: 18,
    padding: 24,
    marginTop: 25,
    borderWidth: 1,
    borderColor: C.borda,
  },
  buscaTituloLinha: {
    marginBottom: 17,
  },
  buscaTitulo: {
    fontSize: 19,
    fontWeight: '800',
    color: C.texto,
  },
  buscaDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 5,
  },
  buscaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  buscaLinhaMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  campoBusca: {
    flex: 1,
    minHeight: 45,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 9,
  },
  inputBusca: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: C.texto,
    paddingVertical: 10,
  },
  filtros: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  filtro: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F7F7F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borda,
  },
  filtroAtivo: {
    backgroundColor: C.laranja,
    borderColor: C.laranja,
  },
  filtroTexto: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  filtroTextoAtivo: {
    color: C.branco,
  },

  secao: {
    paddingVertical: 45,
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 23,
  },
  secaoTexto: {
    flex: 1,
  },
  secaoEtiqueta: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.verde,
    marginBottom: 10,
  },
  secaoTitulo: {
    color: C.texto,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  secaoDescricao: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 8,
  },
  linkVerTodos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  linkVerTodosTexto: {
    color: C.laranja,
    fontWeight: '800',
    fontSize: 13,
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  cartaoAnimal: {
    backgroundColor: C.branco,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borda,
    position: 'relative',
    marginBottom: 8,
  },
  imagemAnimal: {
    height: 190,
    backgroundColor: '#EEF0E9',
  },
  fotoAnimal: {
    width: '100%',
    height: '100%',
  },
  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  semFotoTexto: {
    color: C.secundario,
    fontSize: 12,
  },
  favoritar: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.branco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalConteudo: {
    padding: 16,
  },
  animalNome: {
    fontSize: 18,
    fontWeight: '800',
    color: C.texto,
  },
  animalDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 7,
    lineHeight: 19,
    minHeight: 20,
  },
  botaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borda,
  },
  botaoDetalhesTexto: {
    color: C.laranja,
    fontSize: 13,
    fontWeight: '800',
  },

  estadoVazio: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.branco,
    borderRadius: 17,
    gap: 10,
    borderWidth: 1,
    borderColor: C.borda,
  },
  estadoTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
  },
  estadoTexto: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  secaoSobre: {
    backgroundColor: '#F0F4EA',
    paddingVertical: 45,
  },
  sobreInterno: {
    alignItems: 'center',
  },
  sobreDescricao: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 23,
    maxWidth: 650,
    textAlign: 'center',
    marginTop: 13,
  },
  passos: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 28,
  },
  passo: {
    flexGrow: 1,
    flexBasis: 210,
    maxWidth: 340,
    padding: 23,
    backgroundColor: C.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E9DE',
    alignItems: 'center',
  },
  passoIcone: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  passoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },
  passoTexto: {
    fontSize: 12,
    lineHeight: 19,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 8,
  },

  gerenciamento: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 17,
    padding: 25,
    marginVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 18,
  },
  gerenciamentoTexto: {
    flex: 1,
    minWidth: 220,
  },
  gerenciamentoTitulo: {
    fontSize: 19,
    fontWeight: '800',
    color: C.texto,
  },
  gerenciamentoDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 8,
  },
  gerenciamentoBotoes: {
    gap: 9,
  },
  botaoLaranja: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 10,
    backgroundColor: C.laranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoLaranjaTexto: {
    color: C.branco,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoContorno: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.laranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoContornoTexto: {
    color: C.laranja,
    fontSize: 12,
    fontWeight: '800',
  },

  paginaInterna: {
    backgroundColor: C.branco,
    borderRadius: 20,
    padding: 35,
    marginVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borda,
    minHeight: 300,
  },
  contatoNota: {
    fontSize: 12,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 25,
  },

  rodape: {
    backgroundColor: C.branco,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    marginTop: 20,
  },
  rodapeInterno: {
    paddingVertical: 25,
    alignItems: 'center',
    gap: 5,
  },
  rodapeMarca: {
    fontSize: 18,
    fontWeight: '900',
    color: C.texto,
  },
  rodapeTexto: {
    fontSize: 11,
    color: C.secundario,
  },
});
```


### petmatch/screens/Login.js

```js

import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, lerResposta } from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E5',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E7E4DE',
  erro: '#B42318',
};

export default function Login({
  navigation,
  aoEntrar,
  avisoSessao,
}) {
  const { width } = useWindowDimensions();
  const telaGrande = width >= 850;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function realizarLogin() {
    if (enviando) return;

    setErro('');

    if (!email.trim() || !senha) {
      setErro('Preencha seu e-mail e sua senha.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha,
        }),
      });

      const dados = await lerResposta(resposta);

      if (!dados.token || !dados.usuario) {
        throw new Error('Resposta de login inválida.');
      }

      await AsyncStorage.setItem('token', dados.token);

      setSenha('');
      aoEntrar(dados.usuario);
    } catch (falha) {
      setErro(
        falha.status
          ? falha.message
          : falha.message === 'Resposta de login inválida.'
            ? falha.message
            : 'Não foi possível entrar. Confira se a API está funcionando.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function abrirCadastro() {
    navigation.navigate('CadastroUsuario');
  }

  return (
    <KeyboardAvoidingView
      style={css.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={css.container}>

          {/* LOGO */}
          <View style={css.cabecalho}>
            <View style={css.logoIcone}>
              <Ionicons name="paw" size={25} color="#FFFFFF" />
            </View>

            <View>
              <Text style={css.logoNome}>
                Pet<Text style={css.logoDestaque}>Match</Text>
              </Text>

              <Text style={css.logoSubtitulo}>
                Conectando pets a novos lares
              </Text>
            </View>
          </View>

          {/* CONTEÚDO PRINCIPAL */}
          <View
            style={[
              css.conteudo,
              telaGrande && css.conteudoDesktop,
            ]}
          >

            {/* APRESENTAÇÃO */}
            <View style={css.apresentacao}>
              <View style={css.etiqueta}>
                <View style={css.pontoVerde} />

                <Text style={css.etiquetaTexto}>
                  ADOÇÃO RESPONSÁVEL
                </Text>
              </View>

              <Text
                style={[
                  css.tituloPrincipal,
                  !telaGrande && css.tituloMobile,
                ]}
              >
                Um novo amigo{'\n'}
                está esperando{'\n'}
                <Text style={css.tituloDestaque}>
                  por você.
                </Text>
              </Text>

              <Text style={css.descricao}>
                Cada animal merece uma nova oportunidade.
                O PetMatch aproxima pessoas que desejam
                adotar de cães e gatos que estão esperando
                por um lar.
              </Text>

              <View style={css.informacao}>
                <View style={css.barraVerde} />

                <Text style={css.informacaoTexto}>
                  Encontre seu novo melhor amigo e
                  transforme duas vidas para sempre.
                </Text>
              </View>
            </View>

            {/* FORMULÁRIO */}
            <View style={css.cartao}>

              <Text style={css.tituloFormulario}>
                Bem-vindo ao PetMatch!
              </Text>

              <Text style={css.subtituloFormulario}>
                Entre na sua conta para continuar.
              </Text>

              {/* AVISO DE SESSÃO */}
              {!!avisoSessao && (
                <View style={css.aviso}>
                  <Text style={css.avisoTexto}>
                    {avisoSessao}
                  </Text>
                </View>
              )}

              {/* ERRO */}
              {!!erro && (
                <View style={css.avisoErro}>
                  <Text style={css.erroTexto}>
                    {erro}
                  </Text>
                </View>
              )}

              {/* E-MAIL */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  E-mail
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor="#A1A5AD"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!enviando}
                  maxLength={150}
                />
              </View>

              {/* SENHA */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Senha
                </Text>

                <View style={css.campoSenha}>
                  <TextInput
                    style={css.inputSenha}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#A1A5AD"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    editable={!enviando}
                    onSubmitEditing={realizarLogin}
                  />

                  <Pressable
                    style={css.botaoMostrar}
                    onPress={() => setMostrarSenha(!mostrarSenha)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarSenha
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    <Text style={css.mostrarTexto}>
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ENTRAR */}
              <Pressable
                style={[
                  css.botaoEntrar,
                  enviando && css.botaoDesativado,
                ]}
                onPress={realizarLogin}
                disabled={enviando}
                accessibilityRole="button"
              >
                {enviando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={css.botaoEntrarTexto}>
                    Entrar
                  </Text>
                )}
              </Pressable>

              {/* DIVISOR */}
              <View style={css.divisor}>
                <View style={css.linha} />

                <Text style={css.divisorTexto}>
                  OU
                </Text>

                <View style={css.linha} />
              </View>

              {/* CADASTRO */}
              <Text style={css.textoCadastro}>
                Ainda não tem uma conta?
              </Text>

              <Pressable
                style={css.botaoCadastro}
                onPress={abrirCadastro}
                disabled={enviando}
                accessibilityRole="button"
              >
                <Text style={css.botaoCadastroTexto}>
                  Criar minha conta
                </Text>
              </Pressable>

            </View>
          </View>

          {/* RODAPÉ */}
          <View style={css.rodape}>
            <Text style={css.rodapeTexto}>
              PetMatch • Adoção responsável
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const css = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: C.fundo,
  },

  scroll: {
    flexGrow: 1,
  },

  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    gap: 10,
  },

  logoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
  },

  patinha: {
    width: 25,
    height: 25,
  },

  logoNome: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  logoDestaque: {
    color: C.laranja,
  },

  logoSubtitulo: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 1,
  },

  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 25,
  },

  conteudoDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },

  apresentacao: {
    flex: 1,
    maxWidth: 500,
  },

  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF4DF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },

  pontoVerde: {
    width: 7,
    height: 7,
    backgroundColor: C.verde,
    borderRadius: 4,
  },

  etiquetaTexto: {
    color: C.verde,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  tituloPrincipal: {
    color: C.texto,
    fontSize: 43,
    lineHeight: 51,
    fontWeight: '900',
    letterSpacing: -1.5,
  },

  tituloMobile: {
    fontSize: 32,
    lineHeight: 39,
  },

  tituloDestaque: {
    color: C.laranja,
  },

  descricao: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 17,
    maxWidth: 420,
  },

  informacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
    maxWidth: 390,
  },

  barraVerde: {
    width: 4,
    height: 42,
    borderRadius: 3,
    backgroundColor: C.verde,
  },

  informacaoTexto: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  cartao: {
    width: '100%',
    maxWidth: 405,
    alignSelf: 'center',
    backgroundColor: C.branco,
    borderRadius: 22,
    padding: 25,
    borderWidth: 1,
    borderColor: '#EEEAE3',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 25px rgba(60, 50, 35, 0.06)',
      },
      default: {
        elevation: 3,
      },
    }),
  },

  tituloFormulario: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  subtituloFormulario: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 26,
  },

  aviso: {
    backgroundColor: '#EFF7E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  avisoTexto: {
    color: C.verde,
    fontSize: 12,
  },

  avisoErro: {
    backgroundColor: '#FFF0EF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  erroTexto: {
    color: C.erro,
    fontSize: 12,
  },

  campoGrupo: {
    marginBottom: 17,
  },

  rotulo: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  campo: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FEFDFC',
    color: C.texto,
    fontSize: 13,
  },

  campoSenha: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFDFC',
  },

  inputSenha: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 13,
    color: C.texto,
  },

  botaoMostrar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  mostrarTexto: {
    color: C.laranja,
    fontSize: 11,
    fontWeight: '700',
  },

  botaoEntrar: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  botaoDesativado: {
    opacity: 0.65,
  },

  botaoEntrarTexto: {
    color: C.branco,
    fontSize: 14,
    fontWeight: '800',
  },

  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 19,
  },

  linha: {
    flex: 1,
    height: 1,
    backgroundColor: C.borda,
  },

  divisorTexto: {
    color: C.secundario,
    fontSize: 10,
    fontWeight: '700',
  },

  textoCadastro: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 12,
    marginBottom: 12,
  },

  botaoCadastro: {
    height: 46,
    borderWidth: 1,
    borderColor: C.laranja,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoCadastroTexto: {
    color: C.laranja,
    fontSize: 13,
    fontWeight: '800',
  },

  rodape: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  rodapeTexto: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
  },
});
```


### petmatch/screens/MinhasSolicitacoes.js

```js

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function MinhasSolicitacoes({ navigation }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');

  const ehResponsavel = ['ong', 'protetor', 'admin'].includes(
    usuario?.nivel
  );

  function avisar(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  function confirmar(titulo, mensagem, acao) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${titulo}\n\n${mensagem}`)) {
        acao();
      }
      return;
    }

    Alert.alert(titulo, mensagem, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: acao,
      },
    ]);
  }

  const carregarSolicitacoes = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
        // IDENTIFICAR O USUÁRIO LOGADO
        const respostaUsuario = await fetchAutenticado(
          '/auth/me'
        );

        const dadosUsuario = await lerResposta(
          respostaUsuario
        );

        setUsuario(dadosUsuario);

        // BUSCAR AS SOLICITAÇÕES PERMITIDAS PARA A CONTA
        const resposta = await fetchAutenticado(
          '/adocoes'
        );

        const dados = await lerResposta(resposta);

        setSolicitacoes(
          Array.isArray(dados) ? dados : []
        );
      } catch (erroRequisicao) {
        setErro(
          erroRequisicao.message ||
            'Não foi possível carregar as solicitações.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    []
  );

  // ATUALIZAR QUANDO A TELA FOR ABERTA NOVAMENTE
  useFocusEffect(
    useCallback(() => {
      carregarSolicitacoes();
    }, [carregarSolicitacoes])
  );

  function nomeStatus(status) {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aprovada':
        return 'Aprovada';
      case 'recusada':
        return 'Recusada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status || 'Não informado';
    }
  }

  function corStatus(status) {
    switch (status) {
      case 'pendente':
        return '#B7791F';
      case 'aprovada':
        return '#25805A';
      case 'recusada':
        return '#B54747';
      case 'cancelada':
        return '#607D8B';
      default:
        return '#607D8B';
    }
  }

  function formatarData(data) {
    if (!data) return '';

    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) {
      return '';
    }

    return valor.toLocaleDateString('pt-BR');
  }

  // ADOTANTE CANCELA UMA SOLICITAÇÃO PENDENTE
  async function cancelarSolicitacao(id) {
    try {
      setProcessandoId(id);

      const resposta = await fetchAutenticado(
        `/adocoes/${id}/cancelar`,
        {
          method: 'PUT',
        }
      );

      const dados = await lerResposta(resposta);

      avisar(
        'Solicitação cancelada',
        dados.mensagem || 'Seu pedido foi cancelado.'
      );

      await carregarSolicitacoes(false);
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível cancelar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  // ONG, PROTETOR OU ADMIN AVALIA UMA SOLICITAÇÃO
  async function atualizarStatus(id, novoStatus) {
    try {
      setProcessandoId(id);

      const resposta = await fetchAutenticado(
        `/adocoes/${id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: novoStatus,
          }),
        }
      );

      const dados = await lerResposta(resposta);

      avisar(
        'Solicitação atualizada',
        dados.mensagem || 'Status atualizado.'
      );

      await carregarSolicitacoes(false);
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível atualizar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
        />
        <Text style={estilos.textoAuxiliar}>
          Carregando solicitações...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => carregarSolicitacoes(false)}
        />
      }
    >
      <Text style={estilos.titulo}>
        {ehResponsavel
          ? 'Solicitações recebidas'
          : 'Minhas solicitações'}
      </Text>

      <Text style={estilos.subtitulo}>
        {ehResponsavel
          ? 'Acompanhe e avalie os pedidos de adoção dos animais sob sua responsabilidade.'
          : 'Acompanhe aqui o andamento dos seus pedidos de adoção.'}
      </Text>

      {erro ? (
        <View style={estilos.cartao}>
          <Text style={estilos.textoErro}>
            {erro}
          </Text>

          <Botao
            titulo="Tentar novamente"
            onPress={() => carregarSolicitacoes()}
          />
        </View>
      ) : solicitacoes.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.tituloVazio}>
            Nenhuma solicitação encontrada
          </Text>

          <Text style={estilos.textoAuxiliar}>
            {ehResponsavel
              ? 'Quando alguém solicitar a adoção de um dos seus animais, o pedido aparecerá aqui.'
              : 'Você ainda não fez nenhuma solicitação de adoção.'}
          </Text>

          {!ehResponsavel && (
            <View style={estilos.espacoBotao}>
              <Botao
                titulo="Conhecer animais"
                onPress={() => navigation.navigate('Animais')}
              />
            </View>
          )}
        </View>
      ) : (
        solicitacoes.map((solicitacao) => {
          const processando =
            processandoId !== null;

          const pendente =
            solicitacao.status === 'pendente';

          return (
            <View
              key={solicitacao.id}
              style={estilos.cartao}
            >
              {solicitacao.foto_animal ? (
                <Image
                  source={{
                    uri: solicitacao.foto_animal,
                  }}
                  style={estilos.foto}
                  resizeMode="cover"
                />
              ) : null}

              <View style={estilos.linhaCabecalho}>
                <Text style={estilos.nomeAnimal}>
                  {solicitacao.nome_animal ||
                    'Animal'}
                </Text>

                <View
                  style={[
                    estilos.etiqueta,
                    {
                      backgroundColor:
                        corStatus(solicitacao.status) +
                        '18',
                    },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoEtiqueta,
                      {
                        color: corStatus(
                          solicitacao.status
                        ),
                      },
                    ]}
                  >
                    {nomeStatus(
                      solicitacao.status
                    )}
                  </Text>
                </View>
              </View>

              {ehResponsavel && (
                <Text style={estilos.informacao}>
                  <Text style={estilos.negrito}>
                    Interessado:{' '}
                  </Text>
                  {solicitacao.nome_adotante}
                </Text>
              )}

              {solicitacao.criado_em && (
                <Text style={estilos.informacao}>
                  <Text style={estilos.negrito}>
                    Data:{' '}
                  </Text>
                  {formatarData(
                    solicitacao.criado_em
                  )}
                </Text>
              )}

              {solicitacao.mensagem ? (
                <View style={estilos.areaMensagem}>
                  <Text style={estilos.rotuloMensagem}>
                    Mensagem do adotante
                  </Text>

                  <Text style={estilos.mensagem}>
                    {solicitacao.mensagem}
                  </Text>
                </View>
              ) : null}

              <View style={estilos.espacoBotao}>
                <Botao
                  titulo="Ver animal"
                  variante="secundario"
                  onPress={() =>
                    navigation.navigate(
                      'DetalhesAnimal',
                      {
                        id: solicitacao.animal_id,
                      }
                    )
                  }
                />
              </View>

              {pendente && !ehResponsavel && (
                <View style={estilos.espacoBotao}>
                  <Botao
                    titulo="Cancelar solicitação"
                    variante="secundario"
                    disabled={processando}
                    onPress={() =>
                      confirmar(
                        'Cancelar solicitação',
                        'Deseja cancelar este pedido de adoção?',
                        () =>
                          cancelarSolicitacao(
                            solicitacao.id
                          )
                      )
                    }
                  />
                </View>
              )}

              {pendente && ehResponsavel && (
                <>
                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Aprovar adoção"
                      disabled={processando}
                      onPress={() =>
                        confirmar(
                          'Aprovar adoção',
                          'Deseja aprovar esta solicitação? O animal será marcado como adotado e os outros pedidos pendentes serão recusados.',
                          () =>
                            atualizarStatus(
                              solicitacao.id,
                              'aprovada'
                            )
                        )
                      }
                    />
                  </View>

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Recusar solicitação"
                      variante="secundario"
                      disabled={processando}
                      onPress={() =>
                        confirmar(
                          'Recusar solicitação',
                          'Deseja recusar este pedido de adoção?',
                          () =>
                            atualizarStatus(
                              solicitacao.id,
                              'recusada'
                            )
                        )
                      }
                    />
                  </View>
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 24,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cartaoVazio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  tituloVazio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
    textAlign: 'center',
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 21,
  },

  textoErro: {
    color: '#B54747',
    marginBottom: 15,
  },

  foto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 16,
  },

  linhaCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  nomeAnimal: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },

  etiqueta: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  informacao: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 8,
  },

  negrito: {
    fontWeight: 'bold',
    color: '#455A64',
  },

  areaMensagem: {
    backgroundColor: '#F5F7F8',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },

  rotuloMensagem: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#455A64',
    marginBottom: 8,
  },

  mensagem: {
    fontSize: 14,
    color: '#607D8B',
    lineHeight: 21,
  },

  espacoBotao: {
    marginTop: 12,
  },
});
```


### petmatch/screens/Perfil.js

```js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function Perfil({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    try {
      setCarregando(true);

      const resposta = await fetchAutenticado('/auth/me');
      const dados = await lerResposta(resposta);

      setUsuario(dados);
    } catch (erro) {
      const mensagem =
        erro.message ||
        'Não foi possível carregar seu perfil.';

      if (Platform.OS === 'web') {
        window.alert(mensagem);
      } else {
        Alert.alert('Erro', mensagem);
      }
    } finally {
      setCarregando(false);
    }
  }

  function nomeNivel(nivel) {
    switch (nivel) {
      case 'adotante':
        return 'Adotante';

      case 'ong':
        return 'ONG';

      case 'protetor':
        return 'Protetor independente';

      case 'admin':
        return 'Administrador';

      default:
        return 'Usuário';
    }
  }

  async function sairDaConta() {
    try {
      setSaindo(true);

      await AsyncStorage.removeItem('token');

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (erro) {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível sair da conta.');
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível sair da conta.'
        );
      }
    } finally {
      setSaindo(false);
    }
  }

  function confirmarSaida() {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Deseja realmente sair da sua conta?'
        )
      ) {
        sairDaConta();
      }
      return;
    }

    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: sairDaConta,
        },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
        />

        <Text style={estilos.textoAuxiliar}>
          Carregando seu perfil...
        </Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.titulo}>
          Meu perfil
        </Text>

        <Text style={estilos.textoAuxiliar}>
          Não foi possível carregar suas informações.
        </Text>

        <Botao
          titulo="Tentar novamente"
          onPress={carregarPerfil}
        />
      </View>
    );
  }

  const inicial =
    usuario.nome?.charAt(0)?.toUpperCase() || 'U';

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
    >
      <Text style={estilos.titulo}>
        Meu perfil
      </Text>

      <View style={estilos.cartaoPerfil}>
        <View style={estilos.avatar}>
          <Text style={estilos.letraAvatar}>
            {inicial}
          </Text>
        </View>

        <Text style={estilos.nome}>
          {usuario.nome}
        </Text>

        <Text style={estilos.email}>
          {usuario.email}
        </Text>

        <View style={estilos.etiqueta}>
          <Text style={estilos.textoEtiqueta}>
            {nomeNivel(usuario.nivel)}
          </Text>
        </View>
      </View>

      <Text style={estilos.tituloSecao}>
        Minhas informações
      </Text>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>
          Nome completo
        </Text>

        <Text style={estilos.valor}>
          {usuario.nome}
        </Text>

        <View style={estilos.divisor} />

        <Text style={estilos.rotulo}>
          E-mail
        </Text>

        <Text style={estilos.valor}>
          {usuario.email}
        </Text>

        <View style={estilos.divisor} />

        <Text style={estilos.rotulo}>
          Tipo de conta
        </Text>

        <Text style={estilos.valor}>
          {nomeNivel(usuario.nivel)}
        </Text>
      </View>

      <Text style={estilos.tituloSecao}>
        Minha conta
      </Text>

      <View style={estilos.cartao}>
        <Botao
          titulo="Meus favoritos"
          onPress={() =>
            navigation.navigate('Favoritos')
          }
        />

        <View style={estilos.espacoBotao}>
          <Botao
            titulo="Minhas solicitações"
            variante="secundario"
            onPress={() =>
              navigation.navigate('MinhasSolicitacoes')
            }
          />
        </View>

        {['ong', 'protetor', 'admin'].includes(
          usuario.nivel
        ) && (
          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Cadastrar animal"
              variante="secundario"
              onPress={() =>
                navigation.navigate('CadastrarAnimal')
              }
            />
          </View>
        )}

        {usuario.nivel === 'admin' && (
          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Gerenciar usuários"
              variante="secundario"
              onPress={() =>
                navigation.navigate('Usuarios')
              }
            />
          </View>
        )}
      </View>

      <View style={estilos.areaSair}>
        <Botao
          titulo="Sair da conta"
          variante="secundario"
          onPress={confirmarSaida}
          disabled={saindo}
          carregando={saindo}
        />
      </View>

      <Text style={estilos.rodape}>
        PetMatch — Conectando animais a novos lares.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#F8F9FA',
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 24,
  },

  cartaoPerfil: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DCEFE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  letraAvatar: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#42685C',
  },

  nome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 6,
  },

  email: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    marginBottom: 14,
  },

  etiqueta: {
    backgroundColor: '#EAF4F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  textoEtiqueta: {
    color: '#42685C',
    fontSize: 13,
    fontWeight: '600',
  },

  tituloSecao: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 14,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  rotulo: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 5,
  },

  valor: {
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
  },

  divisor: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 16,
  },

  espacoBotao: {
    marginTop: 12,
  },

  areaSair: {
    marginBottom: 25,
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
  },

  rodape: {
    fontSize: 12,
    color: '#90A4AE',
    textAlign: 'center',
    marginTop: 10,
  },
});
```


### petmatch/screens/SolicitarAdocao.js

```js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function SolicitarAdocao({ route, navigation }) {
  const animalId = route.params?.animalId ?? route.params?.id;

  const [animal, setAnimal] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  function avisar(titulo, texto, aoConfirmar) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${texto}`);
      if (aoConfirmar) aoConfirmar();
    } else {
      Alert.alert(titulo, texto, [
        { text: 'OK', onPress: aoConfirmar },
      ]);
    }
  }

  useEffect(() => {
    async function carregarAnimal() {
      if (!animalId) {
        setCarregando(false);
        return;
      }

      try {
        const resposta = await fetchAutenticado(
          `/animais/${animalId}`
        );

        const dados = await lerResposta(resposta);
        setAnimal(dados);
      } catch (erro) {
        avisar(
          'Erro',
          erro.message ||
            'Não foi possível carregar as informações do animal.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarAnimal();
  }, [animalId]);

  async function enviarSolicitacao() {
    if (!animalId || !animal) {
      avisar('Atenção', 'Animal não encontrado.');
      return;
    }

    if (animal.status !== 'disponivel') {
      avisar(
        'Atenção',
        'Este animal não está disponível para adoção.'
      );
      return;
    }

    if (!mensagem.trim()) {
      avisar(
        'Atenção',
        'Escreva uma mensagem contando por que deseja adotar.'
      );
      return;
    }

    if (mensagem.trim().length > 1000) {
      avisar(
        'Atenção',
        'A mensagem deve ter até 1000 caracteres.'
      );
      return;
    }

    try {
      setEnviando(true);

      const resposta = await fetchAutenticado('/adocoes', {
        method: 'POST',
        body: JSON.stringify({
          animal_id: Number(animalId),
          mensagem: mensagem.trim(),
        }),
      });

      await lerResposta(resposta);

      avisar(
        'Solicitação enviada!',
        'Seu pedido de adoção foi enviado com sucesso. Acompanhe a resposta em Minhas Solicitações.',
        () => navigation.navigate('MinhasSolicitacoes')
      );
    } catch (erro) {
      avisar(
        'Erro',
        erro.message ||
          'Não foi possível enviar a solicitação.'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
        />
        <Text style={estilos.textoAuxiliar}>
          Carregando informações...
        </Text>
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.titulo}>
          Animal não encontrado
        </Text>

        <Botao
          titulo="Voltar"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.titulo}>
        Solicitar adoção
      </Text>

      <Text style={estilos.subtitulo}>
        Que bom que você quer dar uma nova oportunidade
        a um animal!
      </Text>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>
          Você deseja adotar:
        </Text>

        <Text style={estilos.nomeAnimal}>
          {animal.nome}
        </Text>

        <Text style={estilos.detalhes}>
          {animal.especie}
          {animal.raca ? ` • ${animal.raca}` : ''}
        </Text>

        {animal.cidade ? (
          <Text style={estilos.detalhes}>
            Localização: {animal.cidade}
          </Text>
        ) : null}
      </View>

      <Text style={estilos.secaoTitulo}>
        Conte um pouquinho sobre você
      </Text>

      <Text style={estilos.descricao}>
        Escreva por que você gostaria de adotar{' '}
        {animal.nome}. Sua mensagem será enviada para
        o responsável pelo animal.
      </Text>

      <Text style={estilos.rotulo}>
        Sua mensagem
      </Text>

      <TextInput
        style={estilos.campoMensagem}
        placeholder="Olá! Tenho interesse em adotar..."
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        value={mensagem}
        onChangeText={setMensagem}
        maxLength={1000}
        editable={!enviando}
      />

      <Text style={estilos.contador}>
        {mensagem.length}/1000 caracteres
      </Text>

      <View style={estilos.aviso}>
        <Text style={estilos.textoAviso}>
          Enviar a solicitação não significa que a
          adoção foi aprovada. O responsável vai analisar
          seu pedido antes de confirmar.
        </Text>
      </View>

      <Botao
        titulo="Enviar solicitação"
        onPress={enviarSolicitacao}
        disabled={
          enviando ||
          animal.status !== 'disponivel'
        }
        carregando={enviando}
      />

      <View style={estilos.espacoBotao}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          onPress={() => navigation.goBack()}
          disabled={enviando}
        />
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 24,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  rotulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 10,
  },

  nomeAnimal: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 8,
  },

  detalhes: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 5,
  },

  secaoTitulo: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
  },

  descricao: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 20,
  },

  campoMensagem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E5',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#263238',
    minHeight: 150,
  },

  contador: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 22,
  },

  aviso: {
    backgroundColor: '#EAF4F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
  },

  textoAviso: {
    fontSize: 13,
    color: '#42685C',
    lineHeight: 20,
  },

  textoAuxiliar: {
    color: '#607D8B',
  },

  espacoBotao: {
    marginTop: 12,
  },
});
```


### petmatch/screens/Usuarios.js

```js

import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  cores,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

// NÍVEIS DE ACESSO DO PETMATCH
const niveis = [
  'adotante',
  'ong',
  'protetor',
  'admin',
];

// EXIBIR NOMES MAIS AMIGÁVEIS
function nomeNivel(nivel) {
  const nomes = {
    adotante: 'Adotante',
    ong: 'ONG',
    protetor: 'Protetor independente',
    admin: 'Administrador',
  };

  return nomes[nivel] || nivel;
}

export default function Usuarios({ usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alterandoId, setAlterandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // BUSCAR USUÁRIOS CADASTRADOS
  async function carregarUsuarios(signal) {
    setCarregando(true);
    setErro('');

    try {
      // ROTA PROTEGIDA PARA ADMINISTRADORES
      const resposta = await fetchAutenticado(
        '/usuarios',
        { signal }
      );

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setUsuarios(
          Array.isArray(dados) ? dados : []
        );
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setErro(
          falha.message ||
          'Não foi possível carregar os usuários.'
        );
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // CARREGAR AO ABRIR A TELA
  useFocusEffect(
    useCallback(function () {
      if (usuario?.nivel !== 'admin') {
        return undefined;
      }

      const controle = new AbortController();

      carregarUsuarios(controle.signal);

      return function () {
        controle.abort();
      };
    }, [usuario?.nivel])
  );

  // ATUALIZAR NÍVEL DO USUÁRIO
  async function alterarNivel(pessoa, novoNivel) {
    if (alterandoId !== null) return;

    setErro('');
    setSucesso('');

    // IMPEDIR ALTERAÇÃO DO PRÓPRIO NÍVEL
    if (Number(pessoa.id) === Number(usuario.id)) {
      setErro('Você não pode alterar seu próprio nível.');
      return;
    }

    if (!niveis.includes(novoNivel)) {
      setErro('Nível de acesso inválido.');
      return;
    }

    if (pessoa.nivel === novoNivel) {
      return;
    }

    setAlterandoId(pessoa.id);

    try {
      // PUT ATUALIZA O NÍVEL NO BANCO DE DADOS
      const resposta = await fetchAutenticado(
        '/usuarios/' + pessoa.id + '/nivel',
        {
          method: 'PUT',
          body: JSON.stringify({
            nivel: novoNivel,
          }),
        }
      );

      const dados = await lerResposta(resposta);

      // ATUALIZAR LISTA LOCAL
      setUsuarios(function (atuais) {
        return atuais.map(function (item) {
          return Number(item.id) === Number(pessoa.id)
            ? { ...item, nivel: novoNivel }
            : item;
        });
      });

      setSucesso(
        dados.mensagem ||
        'Nível de acesso atualizado com sucesso.'
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível alterar o nível.'
      );
    } finally {
      setAlterandoId(null);
    }
  }

  // CONFIRMAR ANTES DE ALTERAR
  function confirmarAlteracao(pessoa, novoNivel) {
    Alert.alert(
      'Alterar nível de acesso',
      'Deseja alterar o nível de ' +
        pessoa.nome +
        ' para ' +
        nomeNivel(novoNivel) +
        '?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: function () {
            alterarNivel(pessoa, novoNivel);
          },
        },
      ]
    );
  }

  // RENDERIZAR CADA USUÁRIO
  function renderizarUsuario({ item }) {
    const proprioUsuario =
      Number(item.id) === Number(usuario.id);

    const alterandoEste =
      alterandoId === item.id;

    return (
      <Painel style={locais.cartao}>

        <Text style={locais.nome}>
          {item.nome}
          {proprioUsuario ? ' (você)' : ''}
        </Text>

        <Text style={locais.email}>
          {item.email}
        </Text>

        <View style={locais.areaNivel}>
          <Text style={locais.rotuloNivel}>
            NÍVEL DE ACESSO
          </Text>

          <Text style={locais.nivel}>
            {nomeNivel(item.nivel)}
          </Text>
        </View>

        {proprioUsuario ? (
          <Text style={locais.observacao}>
            Seu próprio nível de acesso não pode
            ser alterado.
          </Text>
        ) : (
          <View style={locais.acoes}>
            <Text style={locais.tituloAcoes}>
              Alterar para:
            </Text>

            {niveis
              .filter(function (nivel) {
                return nivel !== item.nivel;
              })
              .map(function (nivel) {
                return (
                  <Botao
                    key={nivel}
                    titulo={nomeNivel(nivel)}
                    variante="secundario"
                    disabled={alterandoId !== null}
                    carregando={alterandoEste}
                    onPress={function () {
                      confirmarAlteracao(item, nivel);
                    }}
                  />
                );
              })}
          </View>
        )}

      </Painel>
    );
  }

  // BLOQUEAR ACESSO NÃO AUTORIZADO
  if (usuario?.nivel !== 'admin') {
    return (
      <Pagina>
        <Aviso
          mensagem="Acesso permitido apenas para administradores."
        />
      </Pagina>
    );
  }

  return (
    <SafeAreaView
      style={locais.tela}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={usuarios}
        extraData={alterandoId}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarUsuario}
        contentContainerStyle={locais.conteudo}
        refreshing={carregando}
        onRefresh={() => carregarUsuarios()}

        ListHeaderComponent={
          <View style={locais.cabecalho}>

            <Text style={estilos.etiqueta}>
              PETMATCH / ADMINISTRAÇÃO
            </Text>

            <Text style={estilos.titulo}>
              Gerenciar usuários
            </Text>

            <Text style={estilos.subtitulo}>
              Visualize as contas cadastradas
              e gerencie as permissões de
              adotantes, ONGs e protetores.
            </Text>

            <Aviso mensagem={erro} />

            <Aviso
              mensagem={sucesso}
              tipo="sucesso"
            />

            <Botao
              titulo="Atualizar lista"
              variante="secundario"
              disabled={
                carregando ||
                alterandoId !== null
              }
              onPress={() => carregarUsuarios()}
            />

            <Text style={locais.contagem}>
              {usuarios.length} usuário(s) cadastrado(s)
            </Text>

          </View>
        }

        ListEmptyComponent={
          carregando ? (
            <Carregamento
              mensagem="Carregando usuários..."
            />
          ) : (
            <Painel>
              <Text style={estilos.texto}>
                {erro
                  ? 'Não foi possível carregar os usuários.'
                  : 'Nenhum usuário encontrado.'}
              </Text>
            </Painel>
          )
        }
      />
    </SafeAreaView>
  );
}

const locais = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 48,
    flexGrow: 1,
  },

  cabecalho: {
    marginBottom: 18,
    gap: 12,
  },

  cartao: {
    marginBottom: 16,
  },

  nome: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },

  email: {
    color: cores.muted,
    fontSize: 15,
    marginBottom: 14,
  },

  areaNivel: {
    backgroundColor: '#E8EFE4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  rotuloNivel: {
    color: cores.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },

  nivel: {
    color: cores.verde,
    fontSize: 16,
    fontWeight: '700',
  },

  acoes: {
    gap: 10,
  },

  tituloAcoes: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  observacao: {
    color: cores.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  contagem: {
    color: cores.muted,
    fontSize: 13,
    marginTop: 12,
  },
});
```


### petmatch/scripts/gerar-entrega.js

```js
// Consolida os fontes reais em um único material, mantendo a ordem pedida:
// estrutura, comandos e conteúdo integral de cada arquivo de texto.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = fileURLToPath(new URL('../', import.meta.url));
const nomeSaida = 'ENTREGA_COMPLETA.md';

// Nenhum diretório gerado, de ferramentas ou de credenciais entra na entrega.
const pastasIgnoradas = new Set([
  'node_modules', '.git', '.expo', 'dist', 'web-build', '.claude', '.codex',
  '.agents', '.aws', '.ssh', '.azure', 'credentials', 'secrets',
  '.npm-cache', '.expo-home', '.mysql-validation', '.cache', '.caches',
  '.parcel-cache', '.turbo', '.next', '.kotlin', 'temp', 'tmp', 'cache',
  'caches', 'test-results', 'playwright-report', 'coverage', 'android', 'ios',
]);

const extensoesTexto = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.sql', '.http', '.txt',
  '.html', '.css', '.yaml', '.yml', '.xml', '.toml', '.ps1', '.sh',
]);

const extensoesImagem = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg']);

function deveIgnorarArquivo(nome) {
  const minusculo = nome.toLowerCase();
  if (minusculo === nomeSaida.toLowerCase()) return true;
  // Somente o exemplo público pode ser lido. .env e suas variantes são locais.
  if (minusculo === '.env.example') return false;
  if (minusculo === '.env' || minusculo.startsWith('.env.')) return true;
  if (minusculo.startsWith('.npmrc') || minusculo.startsWith('.netrc')) return true;
  if (/^(?:credentials?|secrets?|tokens?)(?:\.|$)/i.test(nome)) return true;
  if (/^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/i.test(nome)) return true;
  if (minusculo === '.ds_store' || minusculo === 'thumbs.db') return true;
  if (/\.(?:log|pem|key|p8|p12|pfx|jks|mobileprovision|tsbuildinfo|zip|gz|7z|tar)$/i.test(nome)) return true;
  return false;
}

function ehArquivoTexto(nome) {
  return nome === '.gitignore' || nome === '.env.example' || nome === 'LICENSE'
    || extensoesTexto.has(path.extname(nome).toLowerCase());
}

function compararEntradas(primeira, segunda) {
  if (primeira.tipo !== segunda.tipo) return primeira.tipo === 'pasta' ? -1 : 1;
  return primeira.nome.localeCompare(segunda.nome, 'pt-BR', { numeric: true });
}

async function lerEstrutura(pasta, relativo = '') {
  const entradas = await readdir(pasta, { withFileTypes: true });
  const estrutura = [];

  for (const entrada of entradas) {
    const caminhoRelativo = relativo ? relativo + '/' + entrada.name : entrada.name;
    const caminhoAbsoluto = path.join(pasta, entrada.name);

    if (entrada.isDirectory()) {
      if (pastasIgnoradas.has(entrada.name.toLowerCase())) continue;
      const filhos = await lerEstrutura(caminhoAbsoluto, caminhoRelativo);
      if (filhos.length > 0) estrutura.push({ nome: entrada.name, relativo: caminhoRelativo, tipo: 'pasta', filhos });
      continue;
    }

    // Links simbólicos não são seguidos: a leitura permanece dentro do projeto.
    if (!entrada.isFile() || deveIgnorarArquivo(entrada.name)) continue;
    const texto = ehArquivoTexto(entrada.name);
    const imagem = caminhoRelativo.startsWith('assets/') && extensoesImagem.has(path.extname(entrada.name).toLowerCase());
    if (texto || imagem) estrutura.push({ nome: entrada.name, relativo: caminhoRelativo, tipo: 'arquivo', texto });
  }

  return estrutura.sort(compararEntradas);
}

function desenharArvore(estrutura, prefixo = '') {
  const linhas = [];

  for (let indice = 0; indice < estrutura.length; indice += 1) {
    const entrada = estrutura[indice];
    const ultima = indice === estrutura.length - 1;
    linhas.push(prefixo + (ultima ? '└── ' : '├── ') + entrada.nome + (entrada.tipo === 'pasta' ? '/' : ''));

    if (entrada.tipo === 'pasta') {
      linhas.push(...desenharArvore(entrada.filhos, prefixo + (ultima ? '    ' : '│   ')));
    }
  }

  return linhas;
}

function listarArquivos(estrutura) {
  const arquivos = [];
  for (const entrada of estrutura) {
    if (entrada.tipo === 'pasta') arquivos.push(...listarArquivos(entrada.filhos));
    else arquivos.push(entrada);
  }
  return arquivos;
}

function linguagemArquivo(nome) {
  if (nome === '.env.example') return 'dotenv';
  const linguagens = {
    '.js': 'js', '.jsx': 'jsx', '.mjs': 'js', '.cjs': 'js', '.json': 'json',
    '.md': 'markdown', '.sql': 'sql', '.http': 'http', '.html': 'html',
    '.css': 'css', '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml',
    '.toml': 'toml', '.ps1': 'powershell', '.sh': 'bash',
  };
  return linguagens[path.extname(nome).toLowerCase()] || 'text';
}

function cercarCodigo(conteudo, linguagem) {
  // O README e este script também contêm fences. O delimitador externo deve ser
  // maior que qualquer sequência interna para preservar o Markdown completo.
  let tamanho = 3;
  const sequencias = conteudo.match(/`+/g) || [];
  for (const sequencia of sequencias) tamanho = Math.max(tamanho, sequencia.length + 1);
  const cerca = '`'.repeat(tamanho);
  return cerca + linguagem + '\n' + conteudo + (conteudo.endsWith('\n') ? '' : '\n') + cerca + '\n';
}

function comandosDaEntrega() {
  return [
    '## 2. Comandos de criação, instalação e execução',
    '',
    'Para criar um projeto novo durante a construção em aula:',
    '',
    cercarCodigo([
      'npx create-expo-app@latest petmatch --template blank',
      'cd petmatch',
      'npm install @react-navigation/native',
      'npm install @react-navigation/native-stack',
      'npx expo install react-native-screens react-native-safe-area-context',
      'npx expo install react-dom react-native-web @expo/metro-runtime',
      'npx expo install @react-native-async-storage/async-storage',
      'npm install express mysql2 cors jsonwebtoken bcryptjs dotenv',
    ].join('\n'), 'bash'),
    'Para executar os arquivos já entregues, entre na pasta e instale as versões do lock:',
    '',
    cercarCodigo('cd petmatch\nnpm ci', 'bash'),
    'Para um banco novo, use `database/petmatch.sql`. CREATE TABLE IF NOT EXISTS não migra tabelas existentes; revise uma migração antes de usar em banco com dados.',
    '',
    'A API lê a configuração local de `backend/.env`: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=petmatch_db, PORT e JWT_SECRET (pelo menos 32 caracteres). Não sobrescreva um arquivo existente. Nenhum `.env` acompanha esta entrega; não há `.env.example` nesta versão.',
    '',
    'O SQL define as quatro tabelas do PetMatch e não insere contas ou senhas demonstrativas.',
    '',
    'Opcionalmente, configure `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env` para criar um administrador próprio com outro e-mail. O script não altera a senha nem o nível de uma conta existente:',
    '',
    cercarCodigo('node backend/scripts/criarAdmin.js', 'bash'),
    'No primeiro terminal, inicie a API:',
    '',
    cercarCodigo('node backend/server.js', 'bash'),
    'Em outro terminal na mesma raiz, inicie o Expo e pressione `w` para web:',
    '',
    cercarCodigo('npx expo start', 'bash'),
    'Verificações disponíveis depois da instalação:',
    '',
    cercarCodigo([
      'npm test',
      'npm run lint',
      'npm run typecheck',
      'npx expo install --check',
      'npm run export:web',
      'npm run test:web',
      'npm run test:mysql',
    ].join('\n'), 'bash'),
    'Os detalhes de ambiente, dispositivos, testes e conceitos estão no README reproduzido integralmente adiante.',
    '',
  ].join('\n');
}

async function gerarEntrega() {
  const estrutura = await lerEstrutura(pastaProjeto);
  const arquivos = listarArquivos(estrutura);
  const partes = [
    '# PetMatch — entrega completa',
    '',
    '## 1. Estrutura completa de pastas e arquivos',
    '',
    cercarCodigo('petmatch/\n' + desenharArvore(estrutura).join('\n'), 'text'),
    'A árvore lista os fontes e os assets originais. Imagens são entregues nos arquivos de `assets/` e não são convertidas em texto neste documento. Dependências instaladas, caches, resultados gerados e credenciais locais ficam fora da consolidação.',
    '',
    comandosDaEntrega(),
    '## 3. Conteúdo integral dos arquivos de texto',
    '',
  ];
  let quantidadeTexto = 0;

  for (const arquivo of arquivos) {
    if (!arquivo.texto) continue;
    const conteudo = await readFile(path.join(pastaProjeto, arquivo.relativo), 'utf8');
    if (conteudo.includes('\u0000')) throw new Error('Arquivo classificado como texto contém bytes nulos: ' + arquivo.relativo);
    partes.push('### petmatch/' + arquivo.relativo, '', cercarCodigo(conteudo, linguagemArquivo(arquivo.nome)), '');
    quantidadeTexto += 1;
  }

  // A saída é gravada somente após todas as leituras concluírem com sucesso.
  await writeFile(path.join(pastaProjeto, nomeSaida), partes.join('\n'), 'utf8');
  console.log(nomeSaida + ' gerado com ' + quantidadeTexto + ' arquivos de texto completos.');
}

gerarEntrega().catch(function informarErro(erro) {
  console.error('Não foi possível gerar a entrega: ' + erro.message);
  process.exitCode = 1;
});
```


### petmatch/scripts/testar-mysql.js

```js
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
```


### petmatch/scripts/testar-web.js

```js
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
```


### petmatch/services/api.js

```js
// fetch é nativo: não precisamos de Axios para conversar com a API REST.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web no mesmo computador: localhost. No celular, substitua pelo IP do computador.
// Exemplo ilustrativo: http://192.168.0.20:3000 (confira seu IP antes de usar).
export const API = 'http://localhost:3000';

let avisarSessaoExpirada = null;

export function configurarSessaoExpirada(callback) {
  avisarSessaoExpirada = callback;
  return function cancelarAviso() { avisarSessaoExpirada = null; };
}

export async function fetchAutenticado(caminho, opcoes = {}) {
  const token = await AsyncStorage.getItem('token');
  // Bearer significa que apresentamos o token como comprovante de autenticação.
  const resposta = await fetch(API + caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...opcoes.headers,
      Authorization: 'Bearer ' + (token || ''),
    },
  });
  if (resposta.status === 401) {
    await AsyncStorage.removeItem('token');
    if (avisarSessaoExpirada) { avisarSessaoExpirada(); }
  }
  // Mantemos o Response para a tela enxergar a requisição e a resposta.
  return resposta;
}

export async function lerResposta(resposta) {
  let dados;
  try {
    dados = await resposta.json();
  } catch {
    const erro = Object.assign(new Error('Resposta inesperada da API. Confira o endereço em services/api.js.'), { status: resposta.status });
    throw erro;
  }
  if (!resposta.ok) {
    const erro = Object.assign(new Error(dados.mensagem || 'Não foi possível concluir a requisição.'), { status: resposta.status });
    throw erro;
  }
  return dados;
}
```


### petmatch/tests/app.spec.js

```js
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
```


### petmatch/.gitignore

```text
# Learn more https://docs.github.com/en/get-started/getting-started-with-git/ignoring-files

# dependencies
node_modules/

# Expo
.expo/
dist/
web-build/
expo-env.d.ts

# Native
.kotlin/
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# Metro
.metro-health-check*

# debug
npm-debug.*
yarn-debug.*
yarn-error.*

# macOS
.DS_Store
*.pem

# local env files
.env*.local
backend/.env
.env
.env.*
!.env.example
.npm-cache/
.expo-home/
test-results/
playwright-report/
.mysql-validation/

# typescript
*.tsbuildinfo

# generated native folders
/ios
/android
```


### petmatch/AGENTS.md

````markdown
# PetMatch

Projeto didático para alunos do 3º ano do Ensino Médio Técnico. Priorize código
simples, funções tradicionais, comentários explicativos em português e
compatibilidade com Expo Web, Android e iOS.

## Requisitos deste projeto

- Use JavaScript, template Blank, `App.js` e React Navigation com Native Stack.
- Não introduza Expo Router, pasta `app/`, `_layout.js`, fontes TypeScript ou Redux.
- O verificador `tsc` é apenas uma ferramenta de análise dos arquivos JavaScript
  via `jsconfig.json`; não converta a aplicação para TypeScript.
- Mantenha aplicativo, backend e SQL nesta mesma raiz. Não altere projetos antigos.
- Preserve as versões de React e React Native geradas pelo template oficial.
- Todo código Node usa ES Modules e extensão `.js` nos imports locais.
- Use `fetch`, Express, mysql2/promise, bcryptjs e jsonwebtoken, sem ORM.
- Nunca versione `backend/.env`, salve senhas no aplicativo ou retorne hashes.
- Cadastro público define `adotante` no servidor. Rotas administrativas exigem
  `autenticarToken` e `somenteAdmin`; o nível atual vem do banco.
- Não acrescente pagamento, carrinho, frete, checkout ou funcionalidades de comércio.

As instruções específicas acima substituem as recomendações genéricas de
navegação do template do Expo que originou este projeto.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # Use for Expo/native dependencies to resolve SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npm run typecheck          # Check JavaScript through jsconfig.json
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done. This is a JavaScript-only
project: use `npm run lint` and `npm run typecheck` (configured through jsconfig).
Run `npm test` for the Express/JWT tests, `npm run test:web` for browser flows,
and `npm run test:mysql` for the optional isolated MySQL integration test.

## Navigation & Routing

- Use Native Stack in `App.js`, as required by the teaching plan.
- Keep screens in `screens/` and shared visual components in `components/`.
- Pass the animal ID through `route.params.id` and session data through Props.
- Docs: https://reactnavigation.org/docs/getting-started/

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
````


### petmatch/App.js

```js

import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// TELAS DE AUTENTICAÇÃO
import Login from './screens/Login.js';
import CadastroUsuario from './screens/CadastroUsuario.js';

// TELAS PRINCIPAIS
import Home from './screens/Home.js';
import Animais from './screens/Animais.js';
import DetalhesAnimal from './screens/DetalhesAnimal.js';
import Perfil from './screens/Perfil.js';
import Favoritos from './screens/Favoritos.js';
import MinhasSolicitacoes from './screens/MinhasSolicitacoes.js';
import SolicitarAdocao from './screens/SolicitarAdocao.js';

// TELAS DE GERENCIAMENTO
import CadastrarAnimal from './screens/CadastrarAnimal.js';
import EditarAnimal from './screens/EditarAnimal.js';
import Usuarios from './screens/Usuarios.js';

// API
import {
  configurarSessaoExpirada,
  fetchAutenticado,
  lerResposta,
} from './services/api.js';

// COMPONENTES
import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  cores,
  estilos,
} from './components/ui.js';

const Stack = createNativeStackNavigator();

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erroInicial, setErroInicial] = useState('');

  const atualizarUsuario = useCallback((dados) => {
    setUsuario(dados);
  }, []);

  async function restaurarSessao() {
    setCarregando(true);
    setErroInicial('');

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setUsuario(null);
        return;
      }

      const resposta = await fetchAutenticado('/auth/me');
      const dados = await lerResposta(resposta);

      setUsuario(dados);
    } catch (erro) {
      if (erro.status === 401) {
        await AsyncStorage.removeItem('token');
        setUsuario(null);
      } else {
        setErroInicial(
          'Não foi possível verificar sua sessão. Confira a API e sua conexão.'
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const cancelar = configurarSessaoExpirada(() => {
      setUsuario(null);
      setAviso('Sua sessão expirou. Entre novamente.');
    });

    restaurarSessao();

    return cancelar;
  }, []);

  function entrar(dadosUsuario) {
    setAviso('');
    setUsuario(dadosUsuario);
  }

  async function sair() {
    try {
      await AsyncStorage.removeItem('token');
      setUsuario(null);
      setAviso('Você saiu da sua conta.');
    } catch {
      setAviso('Não foi possível sair. Tente novamente.');
    }
  }

  function renderizarConteudo() {
    if (carregando) {
      return <Carregamento mensagem="Carregando PetMatch..." />;
    }

    if (erroInicial) {
      return (
        <Pagina>
          <Painel>
            <Text style={estilos.titulo}>
              Vamos reconectar?
            </Text>

            <Aviso mensagem={erroInicial} />

            <Botao
              titulo="Tentar novamente"
              onPress={restaurarSessao}
            />
          </Painel>
        </Pagina>
      );
    }

    const podeGerenciar =
      usuario?.nivel === 'ong' ||
      usuario?.nivel === 'protetor' ||
      usuario?.nivel === 'admin';

    const ehAdmin = usuario?.nivel === 'admin';

    return (
      <NavigationContainer>
        <Stack.Navigator
          id="PetMatch"
          screenOptions={{
            headerStyle: {
              backgroundColor: cores.papel,
            },
            headerTintColor: cores.texto,
            headerTitleStyle: {
              fontWeight: '700',
            },
            contentStyle: {
              backgroundColor: cores.fundo,
            },
            headerShadowVisible: false,
          }}
        >
          {usuario === null ? (
            <Stack.Group navigationKey="publico">
              <Stack.Screen
                name="Login"
                options={{ headerShown: false }}
              >
                {(props) => (
                  <Login
                    {...props}
                    aoEntrar={entrar}
                    avisoSessao={aviso}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="CadastroUsuario"
                options={{
                  headerShown: false,
                }}
              >
                {(props) => (
                  <CadastroUsuario
                    {...props}
                    aoEntrar={entrar}
                  />
                )}
              </Stack.Screen>
            </Stack.Group>
          ) : (
            <Stack.Group navigationKey={'sessao-' + usuario.id}>
              <Stack.Screen
                name="Home"
                options={{
                  title: 'PetMatch',
                  headerShown: false,
                }}
              >
                {(props) => (
                  <Home
                    {...props}
                    usuario={usuario}
                    sair={sair}
                    atualizarUsuario={atualizarUsuario}
                    aviso={aviso}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="Animais"
                options={{
                  title: 'Animais para adoção',
                }}
              >
                {(props) => (
                  <Animais
                    {...props}
                    usuario={usuario}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="DetalhesAnimal"
                options={{
                  title: 'Conheça este pet',
                }}
              >
                {(props) => (
                  <DetalhesAnimal
                    {...props}
                    usuario={usuario}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="Perfil"
                options={{
                  title: 'Meu perfil',
                }}
              >
                {(props) => (
                  <Perfil
                    {...props}
                    usuario={usuario}
                    sair={sair}
                    atualizarUsuario={atualizarUsuario}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="Favoritos"
                options={{
                  title: 'Meus favoritos',
                }}
                component={Favoritos}
              />

              <Stack.Screen
                name="MinhasSolicitacoes"
                options={{
                  title: 'Solicitações de adoção',
                }}
                component={MinhasSolicitacoes}
              />

              <Stack.Screen
                name="SolicitarAdocao"
                options={{
                  title: 'Solicitar adoção',
                }}
                component={SolicitarAdocao}
              />

              {podeGerenciar && (
                <Stack.Group>
                  <Stack.Screen
                    name="CadastrarAnimal"
                    options={{
                      title: 'Cadastrar animal',
                    }}
                  >
                    {(props) => (
                      <CadastrarAnimal
                        {...props}
                        usuario={usuario}
                      />
                    )}
                  </Stack.Screen>

                  <Stack.Screen
                    name="EditarAnimal"
                    options={{
                      title: 'Editar animal',
                    }}
                  >
                    {(props) => (
                      <EditarAnimal
                        {...props}
                        usuario={usuario}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Group>
              )}

              {ehAdmin && (
                <Stack.Screen
                  name="Usuarios"
                  options={{
                    title: 'Gerenciar usuários',
                  }}
                >
                  {(props) => (
                    <Usuarios
                      {...props}
                      usuario={usuario}
                    />
                  )}
                </Stack.Screen>
              )}
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {renderizarConteudo()}
    </SafeAreaProvider>
  );
}
```


### petmatch/app.json

```json

{
  "expo": {
    "name": "PetMatch",
    "slug": "petmatch",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#FAF8F3",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      }
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```


### petmatch/eslint.config.js

```js
// Configuração ESM: todo o código da aplicação continua em JavaScript.
import expo from 'eslint-config-expo/flat.js';

export default [
  ...expo,
  { ignores: ['dist/**', '.expo/**', 'node_modules/**'] },
  { files: ['backend/**/*.js', 'tests/**/*.js', 'scripts/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { process: 'readonly', Buffer: 'readonly' } } },
];
```


### petmatch/index.js

```js
import { registerRootComponent } from 'expo';

import App from './App.js';

// Registra o mesmo App no Expo Web e nas plataformas nativas.
registerRootComponent(App);
```


### petmatch/jsconfig.json

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "strict": false,
    "types": ["react"]
  },
  "include": ["App.js", "index.js", "screens/**/*.js", "components/**/*.js", "services/**/*.js"],
  "exclude": ["node_modules", "dist", "backend", "tests"]
}
```


### petmatch/LICENSE

```text
The MIT License (MIT)

Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```


### petmatch/package-lock.json

```json
{
  "name": "petmatch",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "petmatch",
      "version": "1.0.0",
      "dependencies": {
        "@expo/metro-runtime": "~58.0.15",
        "@expo/vector-icons": "^15.0.2",
        "@react-native-async-storage/async-storage": "2.2.0",
        "@react-navigation/native": "^7.5.1",
        "@react-navigation/native-stack": "^7.21.0",
        "bcryptjs": "^3.0.3",
        "cors": "^2.8.6",
        "dotenv": "^18.0.9",
        "expo": "~58.0.19",
        "expo-status-bar": "~58.0.4",
        "express": "^5.3.0",
        "jsonwebtoken": "^9.0.3",
        "mysql2": "^3.24.6",
        "react": "19.3.0",
        "react-dom": "19.3.0",
        "react-native": "0.88.0",
        "react-native-safe-area-context": "~5.10.1",
        "react-native-screens": "~4.30.0",
        "react-native-web": "^0.21.4"
      },
      "devDependencies": {
        "@playwright/test": "^1.64.1",
        "@types/react": "~19.3.0",
        "eslint": "^9.39.5",
        "eslint-config-expo": "~58.0.4",
        "typescript": "~6.0.3"
      }
    },
    "node_modules/@babel/code-frame": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz",
      "integrity": "sha512-Aup7aUOfpbAUg2ROOJN6Iw5f9DMBlzu0mIkm/malLQFN/YQgO48wCj0Kxa3sEHJvPVFg7siR+qRInwXd2qhQKw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-validator-identifier": "^7.29.7",
        "js-tokens": "^4.0.0",
        "picocolors": "^1.1.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/compat-data": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/compat-data/-/compat-data-7.29.7.tgz",
      "integrity": "sha512-locTkQyKvwIEgBzVrn8693ebc97F2U8ZHjbXwDXJ5Fn2TCpNwTlKcaKLkdHop5c/icOFE7qt7Q9JC5hnKNa6Gg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/core": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/core/-/core-7.29.7.tgz",
      "integrity": "sha512-RgHBCvtjbOK2gXSNBNIkNoEc9qoVEtau3hj8gEqKQuL3HZAibKarWFEI3Lfm6EYKkLalOh8eSrj9b+ch9H/VBA==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.7",
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helpers": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/template": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7",
        "@jridgewell/remapping": "^2.3.5",
        "convert-source-map": "^2.0.0",
        "debug": "^4.1.0",
        "gensync": "^1.0.0-beta.2",
        "json5": "^2.2.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/babel"
      }
    },
    "node_modules/@babel/core/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/generator": {
      "version": "7.29.8",
      "resolved": "https://registry.npmjs.org/@babel/generator/-/generator-7.29.8.tgz",
      "integrity": "sha512-gZbepsdh3WDtgZKWL+vTPh71LSBrm/Y4/QDZBVCcYfmeTEEuoOYwlSy+G1StfJg+/Zy550u/3TATbm7qDbbMtg==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.29.8",
        "@babel/types": "^7.29.8",
        "@jridgewell/gen-mapping": "^0.3.12",
        "@jridgewell/trace-mapping": "^0.3.28",
        "jsesc": "^3.0.2"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-annotate-as-pure": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-annotate-as-pure/-/helper-annotate-as-pure-7.29.7.tgz",
      "integrity": "sha512-OoK6239jHPuSQOoS0kfTVKn0b/rVTk0seKq4Gd2UMLtmOVLjDC0ki3e+c90Trqv2gMfvJFqkiljrr568+qddiw==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-compilation-targets/-/helper-compilation-targets-7.29.7.tgz",
      "integrity": "sha512-wem6WaBj4NaVYVdNhLPPVacES6ZJ+KBBfSkTMD3YZxbP3rm3Di85tJU5ljaUNhaOynt+Aj0xruhYuzQBt8n71g==",
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "browserslist": "^4.24.0",
        "lru-cache": "^5.1.1",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-compilation-targets/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/helper-create-class-features-plugin": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-create-class-features-plugin/-/helper-create-class-features-plugin-7.29.7.tgz",
      "integrity": "sha512-IY3ZD9Tmooqr3TUhc3DUWxiuo8xx1DWLhd5M7hQ+ZWJamqM2BbalrBJb2MisSLoYorOj75U03qULCxQTY9r3hg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-member-expression-to-functions": "^7.29.7",
        "@babel/helper-optimise-call-expression": "^7.29.7",
        "@babel/helper-replace-supers": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-create-class-features-plugin/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/helper-create-regexp-features-plugin": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/helper-create-regexp-features-plugin/-/helper-create-regexp-features-plugin-7.29.10.tgz",
      "integrity": "sha512-/YY9soQuWa8TURtHXHT+GbklpbAA+dZErxFGHIr6qgDg96xuGWrTAs1+MfjgVJPF0YLQsOVsOYs8lhgsPbOinQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "regexpu-core": "^6.5.3",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-create-regexp-features-plugin/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/helper-define-polyfill-provider": {
      "version": "0.6.8",
      "resolved": "https://registry.npmjs.org/@babel/helper-define-polyfill-provider/-/helper-define-polyfill-provider-0.6.8.tgz",
      "integrity": "sha512-47UwBLPpQi1NoWzLuHNjRoHlYXMwIJoBf7MFou6viC/sIHWYygpvr0B6IAyh5sBdA2nr2LPIRww8lfaUVQINBA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-compilation-targets": "^7.28.6",
        "@babel/helper-plugin-utils": "^7.28.6",
        "debug": "^4.4.3",
        "lodash.debounce": "^4.0.8",
        "resolve": "^1.22.11"
      },
      "peerDependencies": {
        "@babel/core": "^7.4.0 || ^8.0.0-0 <8.0.0"
      }
    },
    "node_modules/@babel/helper-globals": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-globals/-/helper-globals-7.29.7.tgz",
      "integrity": "sha512-3nQVUAtvkKH9zahfWgw96Jc/uFOmjACE1kQz82E2lqWmHBgjzbNlsC22nuQTfahmWeQtTq5nQ/4Nnd2A1wj4zA==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-member-expression-to-functions": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-member-expression-to-functions/-/helper-member-expression-to-functions-7.29.7.tgz",
      "integrity": "sha512-j+7JYmk1JYDtACIGj0QJqqWZjoUpMoEikQGADMaHgCMCSDqd2+P32rfcibUNrGOMWrlzK1WJBdxrB3JJQZwWtg==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-imports": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-imports/-/helper-module-imports-7.29.7.tgz",
      "integrity": "sha512-ejHwrQQYcm9xnTivShn2IDOlIzInN34AXskvq9QicvCtEzq1Vzclu/tKF8Jq1Cg8JG2GL6/EmjgsCT7lXepE3g==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-module-transforms": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-module-transforms/-/helper-module-transforms-7.29.7.tgz",
      "integrity": "sha512-UPUVSyXbOh627KiCIGQSgwWzGeBKLkaJ9PJEdrngIwMSzxLR4jS4+f1f1jb7VzBbg8nFLaYotvVPFCTqdrmTAg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-validator-identifier": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-optimise-call-expression": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-optimise-call-expression/-/helper-optimise-call-expression-7.29.7.tgz",
      "integrity": "sha512-+kmGVjcT9RGYzoDwdwEqEvGgKe3BYq+O1iGzjFubaNgZHwYHP6lsF2Yghf4kEuv9BV7tYDZ913aBW9am6YKong==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-plugin-utils": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-plugin-utils/-/helper-plugin-utils-7.29.7.tgz",
      "integrity": "sha512-G7sHYigPY17oO5SYWnfD/0MTBwVR781S/JI643e/JhUYgVgWE/61SoW3NH9KWUKyKq5LVh3npif99Wkt6j86Jw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-remap-async-to-generator": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-remap-async-to-generator/-/helper-remap-async-to-generator-7.29.7.tgz",
      "integrity": "sha512-16AMiW26DbXWBbr3B8wNozKM0ydMLB892vaOaJW/fPJdnT8vJk5sdkQcU/isqUxyCE0cEoa8wZOcbgDuC4b6Og==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-wrap-function": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-replace-supers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-replace-supers/-/helper-replace-supers-7.29.7.tgz",
      "integrity": "sha512-atfGXWSeCiF4DnKZIfmJfQRkSw9b9gNNXR1kqKjbhG4pGYCOnkp8OcTB8E3NXjBu8NpheSnOeNKz8KT7UNFTmQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-member-expression-to-functions": "^7.29.7",
        "@babel/helper-optimise-call-expression": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/helper-skip-transparent-expression-wrappers": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-skip-transparent-expression-wrappers/-/helper-skip-transparent-expression-wrappers-7.29.7.tgz",
      "integrity": "sha512-brcMGQaVzIeUb+6/bs1Av0f8YuNNjKY2JyvfRCsFuFsdKccEQ5Ges2y74D74NZ1Rz8lKJ9ksJkfqwQFJ/iNEyQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-string-parser": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/helper-string-parser/-/helper-string-parser-7.29.11.tgz",
      "integrity": "sha512-snZbO7MEDOof+hvNa97EjEY7qD7h2kwvQr5AJC3ZhQudKW5dnej6k3kP9NQV88hJwaS8vDqRLFo9rivLEhle2g==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-identifier": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-identifier/-/helper-validator-identifier-7.29.7.tgz",
      "integrity": "sha512-qehxGkRj55h/ff8EMaJ+cYhyaKlHIxqYDn682wQD7RNp9UujOQsHog2uS0r2vzr4pW+sXf90NeeayjcNaX3fFg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-validator-option": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-validator-option/-/helper-validator-option-7.29.7.tgz",
      "integrity": "sha512-N9ZErrD+yW5geCDtBqnOoxmR8+tNKiGuxKlDpuJxfsqpa2dFcexaziGAE/qoHLiDDreVNMupxGmSoNlyvsA3gw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helper-wrap-function": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/helper-wrap-function/-/helper-wrap-function-7.29.7.tgz",
      "integrity": "sha512-iES0Skag9ERIF68aXadpO6dbXa03mNWK3sEqJaMnLNs/eC3l0lkImdfoy6Y09/SfkpawdAB4RjQ7PVA7TcVGdw==",
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.29.7",
        "@babel/traverse": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/helpers": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/helpers/-/helpers-7.29.10.tgz",
      "integrity": "sha512-EMCx3AGZ3WfAl6ht7AyQoPm2Lh+BGYEMdc4Q6Hf7uSCDOZFuLq44qNwL+iaim8VlyYhRAo4X43+weadK8ZB4Yg==",
      "license": "MIT",
      "dependencies": {
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.8"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/parser": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/parser/-/parser-7.29.11.tgz",
      "integrity": "sha512-OZ6+oaK7GMyg3IfCpj8JOmn8n+w2rJbDT0LLfVDTLb1ZFeKDh3AiNELgCMUw175IJHSkLl74hG0M0VLsvx+gag==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.29.11"
      },
      "bin": {
        "parser": "bin/babel-parser.js"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@babel/plugin-proposal-decorators": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-proposal-decorators/-/plugin-proposal-decorators-7.29.7.tgz",
      "integrity": "sha512-EtU0Hi3GvrTqD56xKmZvV/uCXK2ZbwVNPNLAquVItcAZpUhkXwWlo3Fmj0c2LxgSf2I8IDULeAepwNP1OefLXg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/plugin-syntax-decorators": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-proposal-export-default-from": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-proposal-export-default-from/-/plugin-proposal-export-default-from-7.29.7.tgz",
      "integrity": "sha512-p+G5BNXDcy3bOXplhY4HybQ1GxH3i2Tppmdm/3epyRu2VgJJZuUlZ61MqRTg582Q7ZLBdP7fePYvsumSEkMxcQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-decorators": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-decorators/-/plugin-syntax-decorators-7.29.7.tgz",
      "integrity": "sha512-9MTTLbF39X6sqM92JPEsoI7++26hjZvzkxKZy64aMhWLH2mPkJ/Q3AV4QLmls3R14FpSpkOwQQfUh962JGQxxg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-dynamic-import": {
      "version": "7.8.3",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-dynamic-import/-/plugin-syntax-dynamic-import-7.8.3.tgz",
      "integrity": "sha512-5gdGbFon+PszYzqs83S3E5mpi7/y/8M9eC90MRTZfduQOYW76ig6SOSPNe41IG5LoP3FGBn2N0RjVDSQiS94kQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.8.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-export-default-from": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-export-default-from/-/plugin-syntax-export-default-from-7.29.7.tgz",
      "integrity": "sha512-foag0BB37ROhdeIX9O8G0jX7hw0UekJc04cHMrYLOnrErsnBKqJGHJ8eDRpoCFZBvEPPygmmtw4qyU97qa4oOw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-flow": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-flow/-/plugin-syntax-flow-7.29.7.tgz",
      "integrity": "sha512-ajMX6QPcyomotqwpzhkYGxcK2i/us0rs1Qo9QvUpa+Fca0FTmqrzKrctoIYLMxcOhGZldGT/BAVkRGTWBiR8gQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-jsx": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-jsx/-/plugin-syntax-jsx-7.29.7.tgz",
      "integrity": "sha512-TSu8+mHCoEaaCDEZ0I3+6mvTBYR4PCxQwf2z9/r5Tbztv6NaLR3B9thGTTxX2WGuGHJqRiAbKPeGTJ5XWXVg6A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-nullish-coalescing-operator": {
      "version": "7.8.3",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-nullish-coalescing-operator/-/plugin-syntax-nullish-coalescing-operator-7.8.3.tgz",
      "integrity": "sha512-aSff4zPII1u2QD7y+F8oDsz19ew4IGEJg9SVW+bqwpwtfFleiQDMdzA/R+UlWDzfnHFCxxleFT0PMIrR36XLNQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.8.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-optional-chaining": {
      "version": "7.8.3",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-optional-chaining/-/plugin-syntax-optional-chaining-7.8.3.tgz",
      "integrity": "sha512-KoK9ErH1MBlCPxV0VANkXW2/dw4vlbGDrFgz8bmUsBGYkFRcbRwMh6cIJubdPrkxRwuGdtCk0v/wPTKbQgBjkg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.8.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-syntax-typescript": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-syntax-typescript/-/plugin-syntax-typescript-7.29.7.tgz",
      "integrity": "sha512-ngr+82Sh0xMz25TPCZi+nC2iTzjfCdWS2ONXTp/PtSCHCgaCNBpdMqgvJ2ccdLlClVZ7sisIgB914j/JFe+RZA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-async-generator-functions": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-async-generator-functions/-/plugin-transform-async-generator-functions-7.29.7.tgz",
      "integrity": "sha512-d98gXZkgswvkyohMBABkhm3GeXhYj8psWfwQ2C7gtfrKGTykQa/iOIi+JJhwMjPlZ6Vm2XN+DCf3Es1EoG4ZLA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-remap-async-to-generator": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-async-to-generator": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-async-to-generator/-/plugin-transform-async-to-generator-7.29.7.tgz",
      "integrity": "sha512-pcUb2SS+RMo9TWVBwKGI5ShtoG7R+zBsFmCKDa6fe8c+hPr3XJlZgoE5j6i8W7gDjhyvy+85vmYexanvXh3d1w==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-remap-async-to-generator": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-block-scoping": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-block-scoping/-/plugin-transform-block-scoping-7.29.11.tgz",
      "integrity": "sha512-iARF4jjHSM0v8DImCACPXrwEltBP3DgqDpXTvjAMBAVpyEY0LiGss78wvI+KtmW+IJNEvZ5sOhPDCsOsXsIybA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-class-properties": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-class-properties/-/plugin-transform-class-properties-7.29.7.tgz",
      "integrity": "sha512-GtcpjFvanPfzNQi3eTitsCqtRRmmqzpy/A+yhTR1HaZo1Ly3EA8ZXxlPyHdR8/IuRMYc3E4wdGBewB2QKQjAaA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-class-static-block": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-class-static-block/-/plugin-transform-class-static-block-7.29.7.tgz",
      "integrity": "sha512-kibJgmEdX2iMwsHY2tSZNDgj8PwIlCQz7FK9KuGKO8zsuoUwSEhoNnNVp/emKWrbY4HeO6kkXfdMqRKKKXBm2A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.12.0"
      }
    },
    "node_modules/@babel/plugin-transform-classes": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-classes/-/plugin-transform-classes-7.29.11.tgz",
      "integrity": "sha512-f8kTDM/nTvpLeafb+TJ4jboFr/Y3BbC+QzgPpPGzSKJqWLnj9LW0WLqv4XKA11LX5sr+EgvLE6Ix3YsCEusodw==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-globals": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-replace-supers": "^7.29.7",
        "@babel/traverse": "^7.29.10"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-destructuring": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-destructuring/-/plugin-transform-destructuring-7.29.7.tgz",
      "integrity": "sha512-iPX8aD6H9zV5s7ZsqTdNocPN/MGQ5sSMnElKrktxjJRMnB2jN/1p2+R7GkfD6CAYoVFqy5A4XnSIUeGgJzIWpg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-export-namespace-from": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-export-namespace-from/-/plugin-transform-export-namespace-from-7.29.7.tgz",
      "integrity": "sha512-24B2nOy2TeJSMheqwPD4DDQOV/elLSIlKxjZt4i05H5AgdPdWR3n18HnNrcJ+j76WJd9gbwb9jPjNYUy6RautA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-flow-strip-types": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-flow-strip-types/-/plugin-transform-flow-strip-types-7.29.7.tgz",
      "integrity": "sha512-wRHeUjUjCZnMHmiO5bRgjFLcoEh7JyTdByOW11ahhwNa4V0bmeGEaIvt51yq0zQp2yWIpqfxXXPyUP6GFJZHOQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/plugin-syntax-flow": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-for-of": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-for-of/-/plugin-transform-for-of-7.29.7.tgz",
      "integrity": "sha512-zeSIHh0+E1Um1WJRXCFlHQYu2ieJNdivLLjlBEp+dIBu3S51n+SZZmIXjxnItw6pz56Cn+KvK68BIBVsxq2JiQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-logical-assignment-operators": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-logical-assignment-operators/-/plugin-transform-logical-assignment-operators-7.29.7.tgz",
      "integrity": "sha512-A0H91hh6W8MFRkp5TqJmMr39jzGD1A1E1Ysiv2O06Sfbhkapm+XyIzxWCEh5kqwOZ1/8QZ0dY3SeQ7XBqfJd5Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-modules-commonjs": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-modules-commonjs/-/plugin-transform-modules-commonjs-7.29.7.tgz",
      "integrity": "sha512-j0vCldybPC5b5dwCQOJ21uKtHzt7hxLygJTg9eF1ScfaikEDNfzn94XoW5Fi+seBR0nCyL23xaBFFkq7dTM8XQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-transforms": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-named-capturing-groups-regex": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-named-capturing-groups-regex/-/plugin-transform-named-capturing-groups-regex-7.29.7.tgz",
      "integrity": "sha512-vuFoLwr4qnv2xbZ16SQd6uPcH5FNrLHhk/Jzo++0XJFcaDsr4gjJVg6j398oMHiC+83k/GiBzviwF5KBJkPUtQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-regexp-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0"
      }
    },
    "node_modules/@babel/plugin-transform-nullish-coalescing-operator": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-nullish-coalescing-operator/-/plugin-transform-nullish-coalescing-operator-7.29.7.tgz",
      "integrity": "sha512-idmp1dFaekP9GbcMvG24Kvw2BfhFZjHnNJCkV4WuIY4PskJzwI3f1N5OdgYke38T7rftO6ERulFRn2cFeZwRkg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-object-rest-spread": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-object-rest-spread/-/plugin-transform-object-rest-spread-7.29.7.tgz",
      "integrity": "sha512-Ld98jn4c0smUywL57m7SgsHq3OpThOa6LqZJif3G6jYOovPleoFhVrBJ1WegRApSFB2wu4+RelAj9AC9G08Z4A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-compilation-targets": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/plugin-transform-destructuring": "^7.29.7",
        "@babel/plugin-transform-parameters": "^7.29.7",
        "@babel/traverse": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-optional-catch-binding": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-optional-catch-binding/-/plugin-transform-optional-catch-binding-7.29.7.tgz",
      "integrity": "sha512-sLsyndxK2VwX6yNUOakMb7Sh553ZTe/vVM1XJ+9Z5aW1ytsc8xOIwmyk05NNjN60vkc5/KqoTH6hB4V41LJhng==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-optional-chaining": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-optional-chaining/-/plugin-transform-optional-chaining-7.29.7.tgz",
      "integrity": "sha512-6GM1dhvK3gNODkXcEcMCOLEDCLSoZ/sBbro2Ax8HURyasQ4NshagQixkRFdh5niI6E4gmA/jYI/4aT7rRos3ZQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-parameters": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-parameters/-/plugin-transform-parameters-7.29.7.tgz",
      "integrity": "sha512-ZDOBqV/qLYJI0YElr8DcENEyARsFQeESqWXH6gZlghYXuPPjvweuDhP4VyEi4BlUBlLRFZVjxoZDMjxhLW766g==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-private-methods": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-private-methods/-/plugin-transform-private-methods-7.29.7.tgz",
      "integrity": "sha512-/6Rz4DK1ETDEM/bWHsPHcaEe7ZaT1EqSXjtSP/L0DijOYuaUhiRiOKcwpZ8P7zR4xXEHc2ITdiCgBm9Tpyv9ug==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-private-property-in-object": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-private-property-in-object/-/plugin-transform-private-property-in-object-7.29.7.tgz",
      "integrity": "sha512-+BNo06dnrzdNNqCm1X6YUaVv0DKk8Q+JYcoZfOkLhYWNCXzlwTSRq8zGWayT1csjcpNXV9CQTBRRbmTLZac5cA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-display-name": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-display-name/-/plugin-transform-react-display-name-7.29.7.tgz",
      "integrity": "sha512-+1wdDMGNb4UPeY3Q4L5yLiYe6TXPXubs4NjrgRFw13hPRLJfEMw2Q5OXkee6/IfdqePIeW4Jjwe3aBh7SdKz4Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx/-/plugin-transform-react-jsx-7.29.7.tgz",
      "integrity": "sha512-WsZulLVBUHXVj2cUcPVx6UE21TpalB6bHbSFErKT0Ib++ax24jjXe73FqlWvdylFOjiuPHYi6VCcgRad1ItN+A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/plugin-syntax-jsx": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-jsx-development": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-jsx-development/-/plugin-transform-react-jsx-development-7.29.7.tgz",
      "integrity": "sha512-Xfy3UVMF04+ypnFbkhvfqtmvwfe92qwQdbGZVonhE+6v35GzlofmOnA1szaZqzb9xYWr0nl1e5EMmzi0DNON1g==",
      "license": "MIT",
      "dependencies": {
        "@babel/plugin-transform-react-jsx": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-react-pure-annotations": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-react-pure-annotations/-/plugin-transform-react-pure-annotations-7.29.7.tgz",
      "integrity": "sha512-H5E+HBgDpr6Q5t+Aj11tL7XkIui1jhbIoArVQnqjgXo5/3YxkN7ZEBcWF4RQlB0T4rrxJQbXS6kiFV6B7XTqUA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-runtime": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-runtime/-/plugin-transform-runtime-7.29.7.tgz",
      "integrity": "sha512-xmAscdE/AsqRW7vutbPNoUmu/nF5SrLKPs7aoJgEjo35lLKA/Bc0i2rMv/hr1+Y0o1bQCiVtith3u2vdgRL39Q==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-module-imports": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "babel-plugin-polyfill-corejs2": "^0.4.14",
        "babel-plugin-polyfill-corejs3": "^0.13.0",
        "babel-plugin-polyfill-regenerator": "^0.6.5",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-runtime/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/@babel/plugin-transform-typescript": {
      "version": "7.29.9",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-typescript/-/plugin-transform-typescript-7.29.9.tgz",
      "integrity": "sha512-FFwIwzU+7SCOuxxV4YtJql6T9981ZVTm+FHO5GhVsRqCTdy0WwrEZh3l42ARpXruJUDGOptdduHW6Zr7pNPLNg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-annotate-as-pure": "^7.29.7",
        "@babel/helper-create-class-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-skip-transparent-expression-wrappers": "^7.29.7",
        "@babel/plugin-syntax-typescript": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/plugin-transform-unicode-regex": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/plugin-transform-unicode-regex/-/plugin-transform-unicode-regex-7.29.7.tgz",
      "integrity": "sha512-7D/x/23/d/3VqZ0QA+LGbZMlGwZjztBygSWWWsfTPoQ1oQ6Q1P6Mr3d0kk42XabyUVw+fha3LqdRsFqeKqvCyA==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-create-regexp-features-plugin": "^7.29.7",
        "@babel/helper-plugin-utils": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/preset-typescript": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/preset-typescript/-/preset-typescript-7.29.7.tgz",
      "integrity": "sha512-/Foi8vKY2EVbed/1eZx0gJEEwHAIxogrySI7rULcRIvhZzbvoE/b5qG5Ghc0WKAFKOHA9SD1x7RsFlOYdutIiQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-plugin-utils": "^7.29.7",
        "@babel/helper-validator-option": "^7.29.7",
        "@babel/plugin-syntax-jsx": "^7.29.7",
        "@babel/plugin-transform-modules-commonjs": "^7.29.7",
        "@babel/plugin-transform-typescript": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.0.0-0"
      }
    },
    "node_modules/@babel/runtime": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/runtime/-/runtime-7.29.10.tgz",
      "integrity": "sha512-NpugTzbKgGrNe45Ui32cN8vCFFMxVtP/9rtfwv0nP5FRDAjvYBxJcLVpYA9mr1jxP6cnIT7x9LUzuDTbWYYNRA==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/template": {
      "version": "7.29.7",
      "resolved": "https://registry.npmjs.org/@babel/template/-/template-7.29.7.tgz",
      "integrity": "sha512-puq+Gf35oI24FeN11LkoUQFqv9uwNeWpxXZi/Ji3rRIoKAzKnxRaZ+Gkj0vKS9ZCiTESfng1N9LyOyXvo+m+Gg==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/parser": "^7.29.7",
        "@babel/types": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/traverse": {
      "version": "7.29.10",
      "resolved": "https://registry.npmjs.org/@babel/traverse/-/traverse-7.29.10.tgz",
      "integrity": "sha512-B3lYAs2nkKskbgQ1nfy8Ma9ao9Q1rntTAQHrzzyDuj+TSO+X3le6PfWwqDvodsb+OumE10eMFfuMCTQSQ5iuIQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.7",
        "@babel/generator": "^7.29.8",
        "@babel/helper-globals": "^7.29.7",
        "@babel/parser": "^7.29.9",
        "@babel/template": "^7.29.7",
        "@babel/types": "^7.29.8",
        "debug": "^4.3.1"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@babel/types": {
      "version": "7.29.11",
      "resolved": "https://registry.npmjs.org/@babel/types/-/types-7.29.11.tgz",
      "integrity": "sha512-WCsemW40Cpc6gouC1SrY6PBaZ+oLRlEVY9XBvZBI7il/HyUrb2nJ505wE1MHEFyDZNnrWDEuy4jL50WVHfTTSQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-string-parser": "^7.29.11",
        "@babel/helper-validator-identifier": "^7.29.7"
      },
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/@emnapi/core": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@emnapi/core/-/core-1.10.0.tgz",
      "integrity": "sha512-yq6OkJ4p82CAfPl0u9mQebQHKPJkY7WrIuk205cTYnYe+k2Z8YBh11FrbRG/H6ihirqcacOgl2BIO8oyMQLeXw==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/wasi-threads": "1.2.1",
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@emnapi/runtime": {
      "version": "1.10.0",
      "resolved": "https://registry.npmjs.org/@emnapi/runtime/-/runtime-1.10.0.tgz",
      "integrity": "sha512-ewvYlk86xUoGI0zQRNq/mC+16R1QeDlKQy21Ki3oSYXNgLb45GV1P6A0M+/s6nyCuNDqe5VpaY84BzXGwVbwFA==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@emnapi/wasi-threads": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/@emnapi/wasi-threads/-/wasi-threads-1.2.1.tgz",
      "integrity": "sha512-uTII7OYF+/Mes/MrcIOYp5yOtSMLBWSIoLPpcgwipoiKbli6k322tcoFsxoIIxPDqW01SQGAgko4EzZi2BNv2w==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils": {
      "version": "4.10.1",
      "resolved": "https://registry.npmjs.org/@eslint-community/eslint-utils/-/eslint-utils-4.10.1.tgz",
      "integrity": "sha512-cuadcxVFE8sDK6iWJbs8Sn0av2Nrh2QSGQhVlBW9AaAHqHwjWsZHT8LJ4hFGPh7ASBV2deFdM7H/DPjulmh8rg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "eslint-visitor-keys": "^3.4.3"
      },
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      },
      "peerDependencies": {
        "eslint": "^6.0.0 || ^7.0.0 || >=8.0.0"
      }
    },
    "node_modules/@eslint-community/eslint-utils/node_modules/eslint-visitor-keys": {
      "version": "3.4.3",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-3.4.3.tgz",
      "integrity": "sha512-wpc+LXeiyiisxPlEkUzU6svyS1frIO3Mgxj1fdy7Pm8Ygzguax2N3Fa/D/ag1WqbOprdI+uY6wMUl8/a2G+iag==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^12.22.0 || ^14.17.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint-community/regexpp": {
      "version": "4.12.2",
      "resolved": "https://registry.npmjs.org/@eslint-community/regexpp/-/regexpp-4.12.2.tgz",
      "integrity": "sha512-EriSTlt5OC9/7SXkRSCAhfSxxoSUgBm33OH+IkwbdpgoqsSsUg7y3uh+IICI/Qg4BBWr3U2i39RpmycbxMq4ew==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^12.0.0 || ^14.0.0 || >=16.0.0"
      }
    },
    "node_modules/@eslint/config-array": {
      "version": "0.21.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-array/-/config-array-0.21.2.tgz",
      "integrity": "sha512-nJl2KGTlrf9GjLimgIru+V/mzgSK0ABCDQRvxw5BjURL7WfH5uoWmizbH7QB6MmnMBd8cIC9uceWnezL1VZWWw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/object-schema": "^2.1.7",
        "debug": "^4.3.1",
        "minimatch": "^3.1.5"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/config-array/node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@eslint/config-array/node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/@eslint/config-array/node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/@eslint/config-helpers": {
      "version": "0.4.2",
      "resolved": "https://registry.npmjs.org/@eslint/config-helpers/-/config-helpers-0.4.2.tgz",
      "integrity": "sha512-gBrxN88gOIf3R7ja5K9slwNayVcZgK6SOUORm2uBzTeIEfeVaIhOpCtTox3P6R7o2jLFwLFTLnC7kU/RGcYEgw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/core": {
      "version": "0.17.0",
      "resolved": "https://registry.npmjs.org/@eslint/core/-/core-0.17.0.tgz",
      "integrity": "sha512-yL/sLrpmtDaFEiUj1osRP4TI2MDz1AddJL+jZ7KSqvBuliN4xqYY54IfdN8qD8Toa6g1iloph1fxQNkjOxrrpQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@types/json-schema": "^7.0.15"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/eslintrc": {
      "version": "3.3.7",
      "resolved": "https://registry.npmjs.org/@eslint/eslintrc/-/eslintrc-3.3.7.tgz",
      "integrity": "sha512-F42g89Qd5oAWtp0k0nnSrjziAKza7w8SVT4mStc18LZMaRb4J1HQAHLCalEtDCxrTuksx7NU9qsmeLwpOfPqWw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ajv": "^6.14.0",
        "debug": "^4.3.2",
        "espree": "^10.0.1",
        "globals": "^14.0.0",
        "ignore": "^5.2.0",
        "import-fresh": "^3.2.1",
        "js-yaml": "^4.3.2",
        "minimatch": "^3.1.5",
        "strip-json-comments": "^3.1.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@eslint/eslintrc/node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/globals": {
      "version": "14.0.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-14.0.0.tgz",
      "integrity": "sha512-oahGvuMGQlPw/ivIYBjVSrWAfWLBeku5tpPE2fOPLi+WHffIWbuh2tCjhyQhTBPMf5E9jDEH4FOmTYgYwbKwtQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@eslint/eslintrc/node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/@eslint/js": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/@eslint/js/-/js-9.39.5.tgz",
      "integrity": "sha512-QywQuszQh77pIXCsq998c8hbhSTI/azTty1Z6N53dmAudKHhy573j3yvRLsX2BSp8YpLtoCEG8E9DJe+8zUh4A==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      }
    },
    "node_modules/@eslint/object-schema": {
      "version": "2.1.7",
      "resolved": "https://registry.npmjs.org/@eslint/object-schema/-/object-schema-2.1.7.tgz",
      "integrity": "sha512-VtAOaymWVfZcmZbp6E2mympDIHvyjXs/12LqWYjVw6qjrfF+VK+fyG33kChz3nnK+SU5/NeHOqrTEHS8sXO3OA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@eslint/plugin-kit": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/@eslint/plugin-kit/-/plugin-kit-0.4.1.tgz",
      "integrity": "sha512-43/qtrDUokr7LJqoF2c3+RInu/t4zfrpYdoSDfYyhg52rwLV6TnOvdG4fXm7IkSB3wErkcmJS9iEhjVtOSEjjA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@eslint/core": "^0.17.0",
        "levn": "^0.4.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      }
    },
    "node_modules/@expo/code-signing-certificates": {
      "version": "0.0.7",
      "resolved": "https://registry.npmjs.org/@expo/code-signing-certificates/-/code-signing-certificates-0.0.7.tgz",
      "integrity": "sha512-zP0tnfqrFFRL8INtOaQ6XwEYfdIpIH9vrEo7y0bHQGQa50z4/QWXE5CI4nRUHxqFW4MVWOwXFg1hom1aAZHNkQ==",
      "license": "MIT",
      "dependencies": {
        "node-forge": "^1.4.0"
      },
      "engines": {
        "node": ">=22.13.0"
      }
    },
    "node_modules/@expo/config": {
      "version": "58.0.8",
      "resolved": "https://registry.npmjs.org/@expo/config/-/config-58.0.8.tgz",
      "integrity": "sha512-jbel1j208xyWFzy2XUUEo/sSnu+7hMunbw//rNyGrjM73rBQouWl3IRKo/p6p4BhRUgoUDJTqmm+AY9LSzfp2A==",
      "license": "MIT",
      "dependencies": {
        "@expo/config-plugins": "~58.0.10",
        "@expo/config-types": "^58.0.3",
        "@expo/json-file": "^11.2.1",
        "@expo/platforms": "^58.0.1",
        "@expo/require-utils": "^58.0.4",
        "deepmerge": "^4.3.1",
        "getenv": "^2.0.0",
        "glob": "^13.0.0",
        "resolve-workspace-root": "^2.0.0",
        "semver": "^7.7.4",
        "slugify": "^1.3.4"
      }
    },
    "node_modules/@expo/config-plugins": {
      "version": "58.0.10",
      "resolved": "https://registry.npmjs.org/@expo/config-plugins/-/config-plugins-58.0.10.tgz",
      "integrity": "sha512-oW0geRREubSsqV2d0EwkK0rRcAoB7a68CnJx7s8Al33HoTtEg7KLTQNcKlSTmmwoUESQQvAmzNqAZy4ajuCBKA==",
      "license": "MIT",
      "dependencies": {
        "@expo/config-types": "^58.0.3",
        "@expo/json-file": "~11.2.1",
        "@expo/plist": "^0.10.1",
        "@expo/require-utils": "^58.0.4",
        "@expo/sdk-runtime-versions": "^1.0.1",
        "chalk": "^4.1.2",
        "debug": "^4.3.5",
        "getenv": "^2.0.0",
        "glob": "^13.0.0",
        "semver": "^7.7.4",
        "slugify": "^1.6.6",
        "xcode": "^4.0.0",
        "xml2js": "0.6.0"
      }
    },
    "node_modules/@expo/config-types": {
      "version": "58.0.3",
      "resolved": "https://registry.npmjs.org/@expo/config-types/-/config-types-58.0.3.tgz",
      "integrity": "sha512-wyfrwkTT/hQHzwyqkXkngKxoOa8L6ovsTP4h/UukS1mTmssee5et6HOPoN5RtawdJPnm5JO28f//C/wXlpka8Q==",
      "license": "MIT"
    },
    "node_modules/@expo/devcert": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/@expo/devcert/-/devcert-1.2.2.tgz",
      "integrity": "sha512-wz1YedXwdNbYqk/PRr34vixnuw1+l6uSwmPXUj649cot5iYNccb2zIOnK7Nonb1Pfd/dxAY6CvU6KM3uSdxC7A==",
      "license": "MIT",
      "dependencies": {
        "@expo/sudo-prompt": "^9.3.1",
        "debug": "^3.1.0"
      }
    },
    "node_modules/@expo/devcert/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/@expo/dom-webview": {
      "version": "58.0.2",
      "resolved": "https://registry.npmjs.org/@expo/dom-webview/-/dom-webview-58.0.2.tgz",
      "integrity": "sha512-bLkREoP7qL3rEuzxP60xG+TjdPoGjbnZfxkvYo5imJxGWfKMOf7x962W06Pu+WWAr4gcDRk16iA+Clg8D0zjCg==",
      "license": "MIT",
      "peerDependencies": {
        "expo": "*",
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/@expo/env": {
      "version": "2.5.3",
      "resolved": "https://registry.npmjs.org/@expo/env/-/env-2.5.3.tgz",
      "integrity": "sha512-dBGu8BAfvUcXvG4HvYth+EhcHEsdC+/fT6HTH/zFvvwfp50LG6uzpzT8TXObwEq/t2B/rvAMV5OolxQ46LWXHg==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^4.0.0",
        "debug": "^4.3.4",
        "getenv": "^2.0.0"
      },
      "engines": {
        "node": ">=20.12.0"
      }
    },
    "node_modules/@expo/fingerprint": {
      "version": "0.21.6",
      "resolved": "https://registry.npmjs.org/@expo/fingerprint/-/fingerprint-0.21.6.tgz",
      "integrity": "sha512-EKh7ak+SYwXjvX/4P7BcyeLxip2z9KAsnN/55VP10g8H1Ua4Dm/BgLAhgBcbzbsYretYmNEynAcf9oKCK9pjxA==",
      "license": "MIT",
      "dependencies": {
        "@expo/env": "^2.5.3",
        "@expo/spawn-async": "^1.8.0",
        "arg": "^5.0.2",
        "chalk": "^4.1.2",
        "debug": "^4.3.4",
        "getenv": "^2.0.0",
        "glob": "^13.0.0",
        "ignore": "^5.3.1",
        "minimatch": "^10.2.2",
        "resolve-from": "^5.0.0",
        "semver": "^7.7.4"
      },
      "bin": {
        "fingerprint": "bin/cli.js"
      }
    },
    "node_modules/@expo/image-utils": {
      "version": "0.12.5",
      "resolved": "https://registry.npmjs.org/@expo/image-utils/-/image-utils-0.12.5.tgz",
      "integrity": "sha512-nsFYd7GfDdwZa+S+p+EkVCkh7UKKNf0kfUXDQ53HbyMmNFD3psb5JYwU/2N+uZG5wOEfKGfQ5u7pk/wn2gMlBA==",
      "license": "MIT",
      "dependencies": {
        "@expo/require-utils": "^58.0.4",
        "@expo/spawn-async": "^1.8.0",
        "chalk": "^4.0.0",
        "getenv": "^2.0.0",
        "jimp-compact": "0.16.1",
        "parse-png": "^2.1.0",
        "semver": "^7.7.4"
      }
    },
    "node_modules/@expo/inline-modules": {
      "version": "0.2.7",
      "resolved": "https://registry.npmjs.org/@expo/inline-modules/-/inline-modules-0.2.7.tgz",
      "integrity": "sha512-jjVtmz1LDhohT19U1fwMSL1kVUVZ9ewHdlEoDwSoZd3QELpyUR54nL677nHUbz0nNA5eh/zk38nByi03T06rLg==",
      "license": "MIT",
      "dependencies": {
        "@expo/config-plugins": "~58.0.10"
      }
    },
    "node_modules/@expo/json-file": {
      "version": "11.2.1",
      "resolved": "https://registry.npmjs.org/@expo/json-file/-/json-file-11.2.1.tgz",
      "integrity": "sha512-UPhKoFCj8BcwgLB1rKQ1CuR/REITnZLiqxHEHOeH1tPsdXcHGtUDh0P5bLbr7oU0nKVdtJ5rzyKx8jniMQdESQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.20.0",
        "json5": "^2.2.3"
      }
    },
    "node_modules/@expo/local-build-cache-provider": {
      "version": "58.0.8",
      "resolved": "https://registry.npmjs.org/@expo/local-build-cache-provider/-/local-build-cache-provider-58.0.8.tgz",
      "integrity": "sha512-vM2YZgQ7XSWuVZmPQgK764lj2PiP9+Y3m/tOpVTI0mHHpCoImBu7R+4KQNPqW87r44rhevduggi8kZ0kaoNNxQ==",
      "license": "MIT",
      "dependencies": {
        "@expo/config": "~58.0.8",
        "chalk": "^4.1.2"
      }
    },
    "node_modules/@expo/log-box": {
      "version": "58.0.13",
      "resolved": "https://registry.npmjs.org/@expo/log-box/-/log-box-58.0.13.tgz",
      "integrity": "sha512-Cl9qc77nWjQVivUI5/OCPSEP8s20EtbK3Ivy5ayy+uHO0Cf+XatatWfTvKiHO38VOpT2ywlROzZb4XZyxZUZ1Q==",
      "license": "MIT",
      "dependencies": {
        "@expo/dom-webview": "^58.0.2",
        "@expo/log-box-utils": "^58.0.2",
        "anser": "^1.4.9",
        "stacktrace-parser": "^0.1.10"
      },
      "peerDependencies": {
        "@expo/dom-webview": "^58.0.2",
        "expo": "*",
        "react": "*",
        "react-native": "*"
      },
      "peerDependenciesMeta": {
        "expo": {
          "optional": true
        }
      }
    },
    "node_modules/@expo/log-box-utils": {
      "version": "58.0.2",
      "resolved": "https://registry.npmjs.org/@expo/log-box-utils/-/log-box-utils-58.0.2.tgz",
      "integrity": "sha512-My8Lwe9FU/yDwwzqwi5LN2rzzDcJqIAZKrD9f0XHZEKz/FQnWJYdt1rsV7+RwqMGeGq2XsxTCVT1ggTCOvumxw==",
      "license": "MIT"
    },
    "node_modules/@expo/metro": {
      "version": "58.0.0",
      "resolved": "https://registry.npmjs.org/@expo/metro/-/metro-58.0.0.tgz",
      "integrity": "sha512-PMD640ihB0C3Oqm0AnDVJ/8qF2cKbRUEqGuSOr4tM/OTb9ktxsQqsiSSSeaOEgdCZBq20AxRS0d6WHNhhH2P+g==",
      "license": "MIT",
      "dependencies": {
        "metro": "0.87.1",
        "metro-babel-transformer": "0.87.1",
        "metro-cache": "0.87.1",
        "metro-cache-key": "0.87.1",
        "metro-config": "0.87.1",
        "metro-core": "0.87.1",
        "metro-file-map": "0.87.1",
        "metro-minify-terser": "0.87.1",
        "metro-resolver": "0.87.1",
        "metro-runtime": "0.87.1",
        "metro-source-map": "0.87.1",
        "metro-symbolicate": "0.87.1",
        "metro-transform-plugins": "0.87.1",
        "metro-transform-worker": "0.87.1"
      }
    },
    "node_modules/@expo/metro-file-map": {
      "version": "58.0.5",
      "resolved": "https://registry.npmjs.org/@expo/metro-file-map/-/metro-file-map-58.0.5.tgz",
      "integrity": "sha512-Y2w8qKklLffZie28In4WF6f6e8nIJOhU0mZ5UaQdCiITVQm2a5teNdIDudEPkBsh8ItlvyHZt9n42PN2onRbkQ==",
      "license": "MIT",
      "dependencies": {
        "2g": "^1.0.1",
        "debug": "^4.3.4",
        "fb-watchman": "^2.0.2",
        "invariant": "^2.2.4",
        "jest-worker": "^29.7.0",
        "walker": "^1.0.8"
      }
    },
    "node_modules/@expo/metro-runtime": {
      "version": "58.0.15",
      "resolved": "https://registry.npmjs.org/@expo/metro-runtime/-/metro-runtime-58.0.15.tgz",
      "integrity": "sha512-csALn54hZUkHFM3FofWlU5MQcJB62deCt+JtHOhQogRT+k/VTtTuhLQCrCUOtO2MAUsyhrcRRa6Nh79e1bkvfg==",
      "license": "MIT",
      "dependencies": {
        "@expo/log-box": "^58.0.13",
        "anser": "^1.4.9",
        "pretty-format": "^29.7.0",
        "stacktrace-parser": "^0.1.10",
        "whatwg-fetch": "^3.0.0"
      },
      "peerDependencies": {
        "@expo/log-box": "^58.0.13",
        "expo": "*",
        "react": "*",
        "react-dom": "*",
        "react-native": "*"
      },
      "peerDependenciesMeta": {
        "react-dom": {
          "optional": true
        }
      }
    },
    "node_modules/@expo/modules-macros-linux-arm64": {
      "version": "0.22.0",
      "resolved": "https://registry.npmjs.org/@expo/modules-macros-linux-arm64/-/modules-macros-linux-arm64-0.22.0.tgz",
      "integrity": "sha512-FGXyxpZMEJ4pDPCeCBjfBjftCbk03P/1Rf6UkFoL22joqu4XXt+XUsjfTzyKBzP9pAXL39FVdbNClwk529CEEQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@expo/modules-macros-linux-x64": {
      "version": "0.22.0",
      "resolved": "https://registry.npmjs.org/@expo/modules-macros-linux-x64/-/modules-macros-linux-x64-0.22.0.tgz",
      "integrity": "sha512-4yN4cZTCUWkq1Olr0/lA57gFan8+MEo7K3K0cx0bB3TUEqHgL/hyJN79vQKXlp9NWTnOxO7J5uwqMQkQwfh6aw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@expo/modules-macros-win32-arm64": {
      "version": "0.22.0",
      "resolved": "https://registry.npmjs.org/@expo/modules-macros-win32-arm64/-/modules-macros-win32-arm64-0.22.0.tgz",
      "integrity": "sha512-nLDXRGZWKNERzP4zH9LdfdZ3jvPBQcQE7LX5UnWW4cnDE/GoiVyUKdXQFK+KRnMD6We5gxqhIOU6SLj74h6fHA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@expo/modules-macros-win32-x64": {
      "version": "0.22.0",
      "resolved": "https://registry.npmjs.org/@expo/modules-macros-win32-x64/-/modules-macros-win32-x64-0.22.0.tgz",
      "integrity": "sha512-IT5/YsBTj2gnfNlxDfv3sC51rBudiSHbPFBKoPBbpwmTCMcQg1rmWVdUoiy7LLC48NNzm86wyMxHpSI5lkW1Gg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@expo/osascript": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/@expo/osascript/-/osascript-2.8.1.tgz",
      "integrity": "sha512-SCi+6q6uOkGhiAn6AIP/OPFgaIq/iKD2oYpnAOg2rShHStJ8ey7wyT127RbOaZXmlcY/62rHOX1WiiMnD8u/BA==",
      "license": "MIT",
      "dependencies": {
        "@expo/spawn-async": "^1.8.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@expo/package-manager": {
      "version": "1.14.2",
      "resolved": "https://registry.npmjs.org/@expo/package-manager/-/package-manager-1.14.2.tgz",
      "integrity": "sha512-sftl0eRVVCarI6grMdjAB3jX2pX1Mt3cdSnajlXS4QyeDkaKRM/ntBy6dcagj1VL0+cEfEqctlyvinmlZdNubg==",
      "license": "MIT",
      "dependencies": {
        "@expo/json-file": "^11.2.1",
        "@expo/spawn-async": "^1.8.0",
        "chalk": "^4.0.0",
        "npm-package-arg": "^11.0.0",
        "ora": "^3.4.0",
        "resolve-workspace-root": "^2.0.0"
      }
    },
    "node_modules/@expo/platforms": {
      "version": "58.0.1",
      "resolved": "https://registry.npmjs.org/@expo/platforms/-/platforms-58.0.1.tgz",
      "integrity": "sha512-KtLrtAvpShq16l9lTxd2fZSjULxcGxXrJTHA31iUVqrc+Af7aTAJW4ZB3yQBgi/w+kSb6BB/CG9RXI0ohbMm6g==",
      "license": "MIT"
    },
    "node_modules/@expo/plist": {
      "version": "0.10.1",
      "resolved": "https://registry.npmjs.org/@expo/plist/-/plist-0.10.1.tgz",
      "integrity": "sha512-nuNOqj+r/hGJbZ1Ax3jUpZaOB8UAMHUrISALJEUKaCieTflYj7224EqFWmMpriCGk9wXS1gH+9GGVnSj0tWzuQ==",
      "license": "MIT",
      "dependencies": {
        "@xmldom/xmldom": "^0.8.8",
        "base64-js": "^1.5.1",
        "xmlbuilder": "^15.1.1"
      }
    },
    "node_modules/@expo/prebuild-config": {
      "version": "58.0.16",
      "resolved": "https://registry.npmjs.org/@expo/prebuild-config/-/prebuild-config-58.0.16.tgz",
      "integrity": "sha512-Yhr+1wy4YzLZjbi+F4ss+kUdPN5WnnJ8lwVwOC2wQOsnjnfnyrDImGoEhbnTvzLHRCN8+gEtqKhW9ZSosYYUxQ==",
      "license": "MIT",
      "dependencies": {
        "@expo/config": "~58.0.8",
        "@expo/config-plugins": "~58.0.10",
        "@expo/config-types": "^58.0.3",
        "@expo/image-utils": "^0.12.5",
        "@expo/json-file": "^11.2.1",
        "@react-native/normalize-colors": "0.88.0",
        "debug": "^4.3.1",
        "expo-modules-autolinking": "~58.0.15",
        "resolve-from": "^5.0.0",
        "semver": "^7.7.4"
      }
    },
    "node_modules/@expo/require-utils": {
      "version": "58.0.4",
      "resolved": "https://registry.npmjs.org/@expo/require-utils/-/require-utils-58.0.4.tgz",
      "integrity": "sha512-DvjS5NCitXYcad2Woe1EMHJKcbhTbE77HX0BgOQGL2LFHE3q2H0n8kCWDPBOCVJ63Drap3c35nwoJwF5TQL7Tw==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.20.0",
        "@babel/core": "^7.25.2",
        "@babel/plugin-transform-modules-commonjs": "^7.24.8"
      },
      "peerDependencies": {
        "typescript": "^5.0.0 || ^5.0.0-0 || ^6.0.0 || ^7.0.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/@expo/schema-utils": {
      "version": "58.0.2",
      "resolved": "https://registry.npmjs.org/@expo/schema-utils/-/schema-utils-58.0.2.tgz",
      "integrity": "sha512-w28y8SG+5ZTdDdmH2ZnCQk9wHVwGzI9NqX5V4urJUFEnxbm7I129fJRkb8RIAJmMA1WKU5h3ONmranV473uaXQ==",
      "license": "MIT"
    },
    "node_modules/@expo/sdk-runtime-versions": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@expo/sdk-runtime-versions/-/sdk-runtime-versions-1.0.1.tgz",
      "integrity": "sha512-kvisefkhxu8Fm/4M8G6DEqUaigrXfrSOm2lFw7hsk/nq0zchcp6B4wSk8rlheHY8FRi5iHxKtoVMGY/3M6h04A==",
      "license": "MIT"
    },
    "node_modules/@expo/spawn-async": {
      "version": "1.8.0",
      "resolved": "https://registry.npmjs.org/@expo/spawn-async/-/spawn-async-1.8.0.tgz",
      "integrity": "sha512-eb9xxd/LbuEGSdua4NumCu/McVB9EM+F/JxB9pWgnERw4HQ9XyTNH1KapG6oqLWR8TuRK2LQfzJlmNi94CVobw==",
      "license": "MIT",
      "dependencies": {
        "cross-spawn": "^7.0.6"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@expo/sudo-prompt": {
      "version": "9.3.2",
      "resolved": "https://registry.npmjs.org/@expo/sudo-prompt/-/sudo-prompt-9.3.2.tgz",
      "integrity": "sha512-HHQigo3rQWKMDzYDLkubN5WQOYXJJE2eNqIQC2axC2iO3mHdwnIR7FgZVvHWtBwAdzBgAP0ECp8KqS8TiMKvgw==",
      "license": "MIT"
    },
    "node_modules/@expo/vector-icons": {
      "version": "15.1.1",
      "resolved": "https://registry.npmjs.org/@expo/vector-icons/-/vector-icons-15.1.1.tgz",
      "integrity": "sha512-Iu2VkcoI5vygbtYngm7jb4ifxElNVXQYdDrYkT7UCEIiKLeWnQY0wf2ZhHZ+Wro6Sc5TaumpKUOqDRpLi5rkvw==",
      "license": "MIT",
      "peerDependencies": {
        "expo-font": ">=14.0.4",
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/@expo/xcpretty": {
      "version": "4.4.7",
      "resolved": "https://registry.npmjs.org/@expo/xcpretty/-/xcpretty-4.4.7.tgz",
      "integrity": "sha512-EbxYllZ7/ozONVZd425cm4XnolfW+AmSFT5aP7Jdno6oc3WrYQcHz2CO20z/2rwWwYgztmV2PXvYH+BQ8YFjqg==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.20.0",
        "chalk": "^4.1.0",
        "js-yaml": "^4.1.0"
      },
      "bin": {
        "excpretty": "build/cli.js"
      }
    },
    "node_modules/@humanfs/core": {
      "version": "0.19.2",
      "resolved": "https://registry.npmjs.org/@humanfs/core/-/core-0.19.2.tgz",
      "integrity": "sha512-UhXNm+CFMWcbChXywFwkmhqjs3PRCmcSa/hfBgLIb7oQ5HNb1wS0icWsGtSAUNgefHeI+eBrA8I1fxmbHsGdvA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/types": "^0.15.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/node": {
      "version": "0.16.8",
      "resolved": "https://registry.npmjs.org/@humanfs/node/-/node-0.16.8.tgz",
      "integrity": "sha512-gE1eQNZ3R++kTzFUpdGlpmy8kDZD/MLyHqDwqjkVQI0JMdI1D51sy1H958PNXYkM2rAac7e5/CnIKZrHtPh3BQ==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "@humanfs/core": "^0.19.2",
        "@humanfs/types": "^0.15.0",
        "@humanwhocodes/retry": "^0.4.0"
      },
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanfs/types": {
      "version": "0.15.0",
      "resolved": "https://registry.npmjs.org/@humanfs/types/-/types-0.15.0.tgz",
      "integrity": "sha512-ZZ1w0aoQkwuUuC7Yf+7sdeaNfqQiiLcSRbfI08oAxqLtpXQr9AIVX7Ay7HLDuiLYAaFPu8oBYNq/QIi9URHJ3Q==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18.0"
      }
    },
    "node_modules/@humanwhocodes/module-importer": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/module-importer/-/module-importer-1.0.1.tgz",
      "integrity": "sha512-bxveV4V8v5Yb4ncFTT3rPSgZBOpCkjfK0y4oVVVJwIuDVBRMDXrPyXRL988i5ap9m9bnyEEjWfm5WkBmtffLfA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=12.22"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@humanwhocodes/retry": {
      "version": "0.4.3",
      "resolved": "https://registry.npmjs.org/@humanwhocodes/retry/-/retry-0.4.3.tgz",
      "integrity": "sha512-bV0Tgo9K4hfPCek+aMAn81RppFKv2ySDQeMoSZuvTASywNTnVJCArCZE2FWqpvIatKu7VMRLWlR1EazvVhDyhQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": ">=18.18"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/nzakas"
      }
    },
    "node_modules/@isaacs/ttlcache": {
      "version": "1.4.1",
      "resolved": "https://registry.npmjs.org/@isaacs/ttlcache/-/ttlcache-1.4.1.tgz",
      "integrity": "sha512-RQgQ4uQ+pLbqXfOmieB91ejmLwvSgv9nLx6sT6sD83s7umBypgg+OIBOBbEUiJXrfpnp9j0mRhYYdzp9uqq3lA==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/@jest/schemas": {
      "version": "29.6.3",
      "resolved": "https://registry.npmjs.org/@jest/schemas/-/schemas-29.6.3.tgz",
      "integrity": "sha512-mo5j5X+jIZmJQveBKeS/clAueipV7KgiX1vMgCxam1RNYiqE1w62n0/tJJnHtjW8ZHcQco5gY85jA3mi0L+nSA==",
      "license": "MIT",
      "dependencies": {
        "@sinclair/typebox": "^0.27.8"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/@jest/types": {
      "version": "29.6.3",
      "resolved": "https://registry.npmjs.org/@jest/types/-/types-29.6.3.tgz",
      "integrity": "sha512-u3UPsIilWKOM3F9CXtrG8LEJmNxwoCQC/XVj4IKYXvvpx7QIi/Kg1LI5uDmDpKlac62NUtX7eLjRh+jVZcLOzw==",
      "license": "MIT",
      "dependencies": {
        "@jest/schemas": "^29.6.3",
        "@types/istanbul-lib-coverage": "^2.0.0",
        "@types/istanbul-reports": "^3.0.0",
        "@types/node": "*",
        "@types/yargs": "^17.0.8",
        "chalk": "^4.0.0"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/@jridgewell/gen-mapping": {
      "version": "0.3.13",
      "resolved": "https://registry.npmjs.org/@jridgewell/gen-mapping/-/gen-mapping-0.3.13.tgz",
      "integrity": "sha512-2kkt/7niJ6MgEPxF0bYdQ6etZaA+fQvDcLKckhy1yIQOzaoKjBBjSj63/aLVjYE3qhRt5dvM+uUyfCg6UKCBbA==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/sourcemap-codec": "^1.5.0",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/remapping": {
      "version": "2.3.5",
      "resolved": "https://registry.npmjs.org/@jridgewell/remapping/-/remapping-2.3.5.tgz",
      "integrity": "sha512-LI9u/+laYG4Ds1TDKSJW2YPrIlcVYOwi2fUC6xB43lueCjgxV4lffOCZCtYFiH6TNOX+tQKXx97T4IKHbhyHEQ==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.24"
      }
    },
    "node_modules/@jridgewell/resolve-uri": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/@jridgewell/resolve-uri/-/resolve-uri-3.1.2.tgz",
      "integrity": "sha512-bRISgCIjP20/tbWSPWMEi54QVPRZExkuD9lJL+UIxUKtwVJA8wW1Trb1jMs1RFXo1CBTNZ/5hpC9QvmKWdopKw==",
      "license": "MIT",
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/@jridgewell/source-map": {
      "version": "0.3.11",
      "resolved": "https://registry.npmjs.org/@jridgewell/source-map/-/source-map-0.3.11.tgz",
      "integrity": "sha512-ZMp1V8ZFcPG5dIWnQLr3NSI1MiCU7UETdS/A0G8V/XWHvJv3ZsFqutJn1Y5RPmAPX6F3BiE397OqveU/9NCuIA==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/gen-mapping": "^0.3.5",
        "@jridgewell/trace-mapping": "^0.3.25"
      }
    },
    "node_modules/@jridgewell/sourcemap-codec": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/@jridgewell/sourcemap-codec/-/sourcemap-codec-1.6.0.tgz",
      "integrity": "sha512-T7jf+5zgsZHwNJ4lvQ7/aezbyk0nNX+zJVWpmHA7VYsEx7a7qr5Rg5IbtJFqkgze5Y2sruq1RUY8Q837Od7iFw==",
      "license": "MIT"
    },
    "node_modules/@jridgewell/trace-mapping": {
      "version": "0.3.31",
      "resolved": "https://registry.npmjs.org/@jridgewell/trace-mapping/-/trace-mapping-0.3.31.tgz",
      "integrity": "sha512-zzNR+SdQSDJzc8joaeP8QQoCQr8NuYx2dIIytl1QeBEZHJ9uW6hebsrYgbz8hJwUQao3TWCMtmfV8Nu1twOLAw==",
      "license": "MIT",
      "dependencies": {
        "@jridgewell/resolve-uri": "^3.1.0",
        "@jridgewell/sourcemap-codec": "^1.4.14"
      }
    },
    "node_modules/@napi-rs/wasm-runtime": {
      "version": "1.2.6",
      "resolved": "https://registry.npmjs.org/@napi-rs/wasm-runtime/-/wasm-runtime-1.2.6.tgz",
      "integrity": "sha512-mRyDmEw9/fCDXCGfL1sbgIw/GUK0PVxRW4YwgPN61F3LQ+fSyoBFarJVzgGyhF6kRzEQZ0FejDqm4WLXSeqQmw==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@tybys/wasm-util": "^0.10.3"
      },
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=23.5.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/Brooooooklyn"
      },
      "peerDependencies": {
        "@emnapi/core": "^1.7.1 || 2.0.0-beta.2",
        "@emnapi/runtime": "^1.7.1 || 2.0.0-beta.2"
      }
    },
    "node_modules/@nolyfill/is-core-module": {
      "version": "1.0.39",
      "resolved": "https://registry.npmjs.org/@nolyfill/is-core-module/-/is-core-module-1.0.39.tgz",
      "integrity": "sha512-nn5ozdjYQpUCZlWGuxcJY/KpxkWQs4DcbMCmKojjyrYDEAGy4Ce19NN4v5MduafTwJlbKc99UA8YhSVqq9yPZA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=12.4.0"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-darwin-arm64": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-darwin-arm64/-/noxcturnal-darwin-arm64-0.1.9.tgz",
      "integrity": "sha512-CJWyUWfp+/vnLTdaFoYHXV7abCA1qO0VClPgFRjv2FbMFQ81XhWZcG9hPdt4FzSZ1oqqiQqlvpk7hA/Nh8ML9g==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-darwin-x64": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-darwin-x64/-/noxcturnal-darwin-x64-0.1.9.tgz",
      "integrity": "sha512-53D55Ai3rAUf8USjnCjgSzegtuc4nkvcR9EIiTXd4QgRLUtK2IY0q4IRdWU8Yrnlq/O5/GdGmmD6+t3ymQMjqg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-linux-arm64-gnu": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-linux-arm64-gnu/-/noxcturnal-linux-arm64-gnu-0.1.9.tgz",
      "integrity": "sha512-ingSEdcjdZBiGfjpnTNSlEE6db247fUsdRF3NJI/0anYuJa4WlNnm+z8as2m9dFATr+qmZLjBXgUFfnc6ZRQAg==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-linux-arm64-musl": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-linux-arm64-musl/-/noxcturnal-linux-arm64-musl-0.1.9.tgz",
      "integrity": "sha512-i45wjmtleHdQYCshqCiAIxdD57gaApdUTgu5M99FBsddpYHXIEHvdwA78aZiqMwjLNz723tFdGB52DwbhzgzEA==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-linux-x64-gnu": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-linux-x64-gnu/-/noxcturnal-linux-x64-gnu-0.1.9.tgz",
      "integrity": "sha512-IRV8YsMCT3QqbYEE5dFGGBe58Ivkz5bEUpdXC110uTfzdeRSYbv3Iq/PbdVcfyoXp1HXtBwV6bdIofDQTEPlTg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-linux-x64-musl": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-linux-x64-musl/-/noxcturnal-linux-x64-musl-0.1.9.tgz",
      "integrity": "sha512-M7FT6J5R2XDWFioyFlxXb+RvnjNBpK2p1rtrtHHh6m/g1nHcNqvvTYjMQzrTHbMyOdQGlaV3zyALhURtX4kgQw==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-win32-arm64-msvc": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-win32-arm64-msvc/-/noxcturnal-win32-arm64-msvc-0.1.9.tgz",
      "integrity": "sha512-EAaydqx5mgJfQn+V7LHyhpsdFkAYSwVMqz8AD3Hs/1slMvkwJgPjZv2KvZbgiJPGBaYhRg4X+CaOFW75LVx9iw==",
      "cpu": [
        "arm64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@noxcturnal/noxcturnal-win32-x64-msvc": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/@noxcturnal/noxcturnal-win32-x64-msvc/-/noxcturnal-win32-x64-msvc-0.1.9.tgz",
      "integrity": "sha512-Vj1SNQ+ECsih/RSj+KSC3bXcrkGgETl6GOIIWIg6p5x6KXdLYPID9vyOjwlJa8B0Dmo6uK/ZNlIJX76bxc0WLg==",
      "cpu": [
        "x64"
      ],
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@oxc-project/types": {
      "version": "0.154.0",
      "resolved": "https://registry.npmjs.org/@oxc-project/types/-/types-0.154.0.tgz",
      "integrity": "sha512-KYOUGQFlLWR+s4QMV2Q9ko38TZm7EdO87Qm7rvZLqk/webse/cDjtyxKhg/47l0byCbs/k46LT8qc4PKjAikzA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/oxc-project"
      }
    },
    "node_modules/@playwright/test": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/@playwright/test/-/test-1.64.1.tgz",
      "integrity": "sha512-IaYGml/nSOiZWROfPtuIL7neuu9qDOZ3TNvNljUIrhDMxiGTgPjzj/g9p9RxpS2tSepPDRY+UwAaEeiKtUvIAg==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright": "1.64.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/@react-native-async-storage/async-storage": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/@react-native-async-storage/async-storage/-/async-storage-2.2.0.tgz",
      "integrity": "sha512-gvRvjR5JAaUZF8tv2Kcq/Gbt3JHwbKFYfmb445rhOj6NUMx3qPLixmDx5pZAyb9at1bYvJ4/eTUipU5aki45xw==",
      "license": "MIT",
      "dependencies": {
        "merge-options": "^3.0.4"
      },
      "peerDependencies": {
        "react-native": "^0.0.0-0 || >=0.65 <1.0"
      }
    },
    "node_modules/@react-native/asset-utils": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/asset-utils/-/asset-utils-0.88.0.tgz",
      "integrity": "sha512-Bj1DxQt5f4OrjdlgSVkZT37Z3hx5hUIN5AUDSqL/e99vgtTcqj5vnm067epZL1EF/QiqsniZO8Q1GSkItOakDg==",
      "license": "MIT",
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/babel-plugin-codegen": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/babel-plugin-codegen/-/babel-plugin-codegen-0.88.0.tgz",
      "integrity": "sha512-leGEnCcS7Q0hTxvzvhNtr8zGQpI1gfWqXjzC4UedsFmNMv6kIo4s70o0XbtM30ZXbpfWe4BcSC8NKWuak5sI4A==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.0",
        "@react-native/codegen": "0.88.0"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/codegen": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/codegen/-/codegen-0.88.0.tgz",
      "integrity": "sha512-SAGg+XfzsrPiYTscbKa9bo2/H2ei2TjyxW8RTMq2Ps661kRK3AnmpMGVfrEFshEMr3FGEbuQIvj86X98kaXlRA==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.25.2",
        "@babel/parser": "^7.29.0",
        "flow-parser": "0.327.0",
        "invariant": "^2.2.4",
        "nullthrows": "^1.1.1",
        "tinyglobby": "^0.2.15",
        "yargs": "^17.6.2"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      },
      "peerDependencies": {
        "@babel/core": "*"
      }
    },
    "node_modules/@react-native/codegen/node_modules/flow-estree": {
      "version": "0.327.0",
      "resolved": "https://registry.npmjs.org/flow-estree/-/flow-estree-0.327.0.tgz",
      "integrity": "sha512-f9vK751YUzD0qaHSpKc5/qQM6gqOlgGS+4ZRqTNcZOpVqn3mC55yEQ6dUG2K1eaVm5FbKkz9CFWe6XNvrkQFQg==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@react-native/codegen/node_modules/flow-parser": {
      "version": "0.327.0",
      "resolved": "https://registry.npmjs.org/flow-parser/-/flow-parser-0.327.0.tgz",
      "integrity": "sha512-/MYZ5hXWf5ozpbdfUDmazMgQXviLxWEiRLH3MppEGDdW0itRVqmB5UaU7QX+SBCDNiq+gEesSVn8nlxmPDyDkw==",
      "license": "MIT",
      "dependencies": {
        "flow-estree": "0.327.0"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/@react-native/community-cli-plugin": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/community-cli-plugin/-/community-cli-plugin-0.88.0.tgz",
      "integrity": "sha512-WrQdXbjVt1gwAay8ZzYtpOi9ly99ksJ0VMYFdVcMe6nq3vtiRgqKRpHgCdN6ySIbtr5o+aJ+Vr7OTDY98ec/Ow==",
      "license": "MIT",
      "dependencies": {
        "@react-native/asset-utils": "0.88.0",
        "@react-native/dev-middleware": "0.88.0",
        "commander": "^12.0.0",
        "debug": "^4.4.0",
        "invariant": "^2.2.4",
        "metro": "^0.87.1",
        "semver": "^7.1.3"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      },
      "peerDependencies": {
        "@react-native-community/cli": "*",
        "@react-native/metro-config": "0.88.0"
      },
      "peerDependenciesMeta": {
        "@react-native-community/cli": {
          "optional": true
        },
        "@react-native/metro-config": {
          "optional": true
        }
      }
    },
    "node_modules/@react-native/community-cli-plugin/node_modules/commander": {
      "version": "12.1.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-12.1.0.tgz",
      "integrity": "sha512-Vw8qHK3bZM9y/P10u3Vib8o/DdkvA2OtPtZvD871QKjy74Wj1WSKFILMPRPSdUSx5RFK1arlJzEtA4PkFgnbuA==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/@react-native/debugger-frontend": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/debugger-frontend/-/debugger-frontend-0.88.0.tgz",
      "integrity": "sha512-v5cnBaaWhDRPcQv8EC20zj53jOAKH7u2wnzzXS4JTNu+diPC+cA2+kC7rq3eKI5vGhlAcG2kDPoViRuC0AY0oA==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/debugger-shell": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/debugger-shell/-/debugger-shell-0.88.0.tgz",
      "integrity": "sha512-p82zT8ZKNx7nIm/8zf8pi55sxm5KQBm8td47kzoJysTdqHLyPsRMUvDXtvCJIWadHSv7RJ6t/yiCc+IoImLBtw==",
      "license": "MIT",
      "dependencies": {
        "cross-spawn": "^7.0.6",
        "debug": "^4.4.0",
        "fb-dotslash": "0.5.8"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/dev-middleware": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/dev-middleware/-/dev-middleware-0.88.0.tgz",
      "integrity": "sha512-sHLxVHOwfkF672ZzMepNh4d3IKbrZy3qXDKWSwN5LC5VJkzzZ5FdmSPP4N/CCn2pcKJ4oSqvojXwN4De3Xk92A==",
      "license": "MIT",
      "dependencies": {
        "@isaacs/ttlcache": "^1.4.1",
        "@react-native/debugger-frontend": "0.88.0",
        "@react-native/debugger-shell": "0.88.0",
        "connect": "^3.6.5",
        "debug": "^4.4.0",
        "invariant": "^2.2.4",
        "nullthrows": "^1.1.1",
        "open": "^8.4.2",
        "serve-static": "^1.16.2",
        "ws": "^7.5.10"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/gradle-plugin": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/gradle-plugin/-/gradle-plugin-0.88.0.tgz",
      "integrity": "sha512-4jPSKslOfJj8NKY/jv9qmWkxZYmqPyamoS3Vs0JOFxw9t4PM6L/ea0fUsjNV0LxC9zJlvWilPJOCTOf7h8wlyw==",
      "license": "MIT",
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/js-polyfills": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/js-polyfills/-/js-polyfills-0.88.0.tgz",
      "integrity": "sha512-Iq6v4+EWdOLv0M1+BpADQJBVfInl6FkABXCIBSi0FbvHahEYT+Y4UJ7Cm96p18gbEN1VKzqz3nbBbwLA6bx0rQ==",
      "license": "MIT",
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/@react-native/normalize-colors": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/normalize-colors/-/normalize-colors-0.88.0.tgz",
      "integrity": "sha512-eZCu3tGAQCfvMCPQJVY4dmoMX8ZZYBvqIGHX7lwOYyzNK+Dl8e5ky7ZoXub1Rq75oSrQXNNmSP2CDjNNXXZpFQ==",
      "license": "MIT"
    },
    "node_modules/@react-native/virtualized-lists": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/@react-native/virtualized-lists/-/virtualized-lists-0.88.0.tgz",
      "integrity": "sha512-zpZIOAbobdS93edwHkNUdGDzvElNeQJqukRERRPns3/ucPvuMd2G4fYpmVJSVjhxtGCcLLB1PFndLYYfwaYoBQ==",
      "license": "MIT",
      "dependencies": {
        "invariant": "^2.2.4",
        "nullthrows": "^1.1.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      },
      "peerDependencies": {
        "@types/react": "^19.2.0",
        "react": "*",
        "react-native": "0.88.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/@react-navigation/core": {
      "version": "7.24.0",
      "resolved": "https://registry.npmjs.org/@react-navigation/core/-/core-7.24.0.tgz",
      "integrity": "sha512-PPMHGSgLB65eqWOBHeD/nGyzGJV3rcZ5sZbsCXlaC37HnLmwTEjB4CaOQn8CBVVv/Sc0Kl/W5dpPLls9Stk2WA==",
      "license": "MIT",
      "dependencies": {
        "@react-navigation/routers": "^7.6.5",
        "escape-string-regexp": "^4.0.0",
        "fast-deep-equal": "^3.1.3",
        "react-is": "^19.1.0",
        "use-latest-callback": "^0.2.4",
        "use-sync-external-store": "^1.5.0"
      },
      "peerDependencies": {
        "react": ">= 18.2.0"
      }
    },
    "node_modules/@react-navigation/core/node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@react-navigation/core/node_modules/react-is": {
      "version": "19.3.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-19.3.1.tgz",
      "integrity": "sha512-RRieF6IyxQBkcK6pP8xOHprLTPW6QjRkbGdImtqNme+/hYVwCZkLQLdlZGOhUqXwkS9IEynaGvPJtv6XB/cz0Q==",
      "license": "MIT"
    },
    "node_modules/@react-navigation/elements": {
      "version": "2.9.45",
      "resolved": "https://registry.npmjs.org/@react-navigation/elements/-/elements-2.9.45.tgz",
      "integrity": "sha512-r64qCgjA6asQo4Zlv2lAl68ARkfPbV+BNRm3n9JlMoFr4Ma2A+92Z+sWT1coJRoSXkAwVNb70+LjpM6fo6/D4A==",
      "license": "MIT",
      "dependencies": {
        "color": "^4.2.3",
        "use-latest-callback": "^0.2.4",
        "use-sync-external-store": "^1.5.0"
      },
      "peerDependencies": {
        "@react-native-masked-view/masked-view": ">= 0.2.0",
        "@react-navigation/native": "^7.5.1",
        "react": ">= 18.2.0",
        "react-native": "*",
        "react-native-safe-area-context": ">= 4.0.0"
      },
      "peerDependenciesMeta": {
        "@react-native-masked-view/masked-view": {
          "optional": true
        }
      }
    },
    "node_modules/@react-navigation/native": {
      "version": "7.5.1",
      "resolved": "https://registry.npmjs.org/@react-navigation/native/-/native-7.5.1.tgz",
      "integrity": "sha512-p9xOvhG8q8rq0FPAoh0JC22ALbyRZt7U2uH8XrHRDjvqOEFrumME7szM6LaWW2WctolAVeZAfOTV+pUKULI/kQ==",
      "license": "MIT",
      "dependencies": {
        "@react-navigation/core": "^7.24.0",
        "escape-string-regexp": "^4.0.0",
        "fast-deep-equal": "^3.1.3",
        "nanoid": "^3.3.11",
        "standard-navigation": "^0.0.8",
        "use-latest-callback": "^0.2.4"
      },
      "peerDependencies": {
        "react": ">= 18.2.0",
        "react-native": "*"
      }
    },
    "node_modules/@react-navigation/native-stack": {
      "version": "7.21.0",
      "resolved": "https://registry.npmjs.org/@react-navigation/native-stack/-/native-stack-7.21.0.tgz",
      "integrity": "sha512-bYrNW87nDtbMXAJsosYwu59xwTqeuaurfCDA+62MQ6hY4+2Iv71+Sik3ulW92fOqg8s2SZinOJosHEWoi9Ayqw==",
      "license": "MIT",
      "dependencies": {
        "@react-navigation/elements": "^2.9.45",
        "color": "^4.2.3",
        "sf-symbols-typescript": "^2.1.0",
        "warn-once": "^0.1.1"
      },
      "peerDependencies": {
        "@react-navigation/native": "^7.5.1",
        "react": ">= 18.2.0",
        "react-native": "*",
        "react-native-safe-area-context": ">= 4.0.0",
        "react-native-screens": ">= 4.0.0"
      }
    },
    "node_modules/@react-navigation/native/node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/@react-navigation/routers": {
      "version": "7.6.5",
      "resolved": "https://registry.npmjs.org/@react-navigation/routers/-/routers-7.6.5.tgz",
      "integrity": "sha512-hpvpVFt6wu3U014F/0Qy45VZCErlUvIV8kN1L6HovN5P9OpbXAzFTaRQmG7VW6czg2tSkUL5S3dZA0HIu5QirQ==",
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.11"
      }
    },
    "node_modules/@rtsao/scc": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/@rtsao/scc/-/scc-1.1.0.tgz",
      "integrity": "sha512-zt6OdqaDoOnJ1ZYsCYGt9YmWzDXl4vQdKTyJev62gFhRGKdx7mcT54V9KIjg+d2wi9EXsPvAPKe7i7WjfVWB8g==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@sinclair/typebox": {
      "version": "0.27.12",
      "resolved": "https://registry.npmjs.org/@sinclair/typebox/-/typebox-0.27.12.tgz",
      "integrity": "sha512-hhyNJ+nbR6ZR7pToHvllEFun9TL0sbL+tk/ON75lo+Xas054uez98qRbsuNt7MBCyZKK4+8Yli/OAGZhmfBZ/g==",
      "license": "MIT"
    },
    "node_modules/@tybys/wasm-util": {
      "version": "0.10.4",
      "resolved": "https://registry.npmjs.org/@tybys/wasm-util/-/wasm-util-0.10.4.tgz",
      "integrity": "sha512-W3c4gRigFS0T/Ma4qIYF3GDAc5AQdHb1yL5znJT1Zv1YaD9Kitx656wBjvr19qbiosmZT8lWDM5BEMynUqX65A==",
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "tslib": "^2.4.0"
      }
    },
    "node_modules/@types/estree": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/@types/estree/-/estree-1.0.9.tgz",
      "integrity": "sha512-GhdPgy1el4/ImP05X05Uw4cw2/M93BCUmnEvWZNStlCzEKME4Fkk+YpoA5OiHNQmoS7Cafb8Xa3Pya8m1Qrzeg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/istanbul-lib-coverage": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/@types/istanbul-lib-coverage/-/istanbul-lib-coverage-2.0.6.tgz",
      "integrity": "sha512-2QF/t/auWm0lsy8XtKVPG19v3sSOQlJe/YHZgfjb/KBBHOGSV+J2q/S671rcq9uTBrLAXmZpqJiaQbMT+zNU1w==",
      "license": "MIT"
    },
    "node_modules/@types/istanbul-lib-report": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/@types/istanbul-lib-report/-/istanbul-lib-report-3.0.3.tgz",
      "integrity": "sha512-NQn7AHQnk/RSLOxrBbGyJM/aVQ+pjj5HCgasFxc0K/KhoATfQ/47AyUl15I2yBUpihjmas+a+VJBOqecrFH+uA==",
      "license": "MIT",
      "dependencies": {
        "@types/istanbul-lib-coverage": "*"
      }
    },
    "node_modules/@types/istanbul-reports": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/@types/istanbul-reports/-/istanbul-reports-3.0.4.tgz",
      "integrity": "sha512-pk2B1NWalF9toCRu6gjBzR69syFjP4Od8WRAX+0mmf9lAjCRicLOWc+ZrxZHx/0XRjotgkF9t6iaMJ+aXcOdZQ==",
      "license": "MIT",
      "dependencies": {
        "@types/istanbul-lib-report": "*"
      }
    },
    "node_modules/@types/json-schema": {
      "version": "7.0.15",
      "resolved": "https://registry.npmjs.org/@types/json-schema/-/json-schema-7.0.15.tgz",
      "integrity": "sha512-5+fP8P8MFNC+AyZCDxrB2pkZFPGzqQWUzpSeuuVLvm8VMcorNYavBqoFcxK8bQz4Qsbn4oUEEem4wDLfcysGHA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/json5": {
      "version": "0.0.29",
      "resolved": "https://registry.npmjs.org/@types/json5/-/json5-0.0.29.tgz",
      "integrity": "sha512-dRLjCWHYg4oaA77cxO64oO+7JwCwnIzkZPdrrC71jQmQtlhM556pwKo5bUzqvZndkVbeFLIIi+9TC40JNF5hNQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/@types/node": {
      "version": "26.6.5",
      "resolved": "https://registry.npmjs.org/@types/node/-/node-26.6.5.tgz",
      "integrity": "sha512-uMzsv9stDdofIZBx4UGh4Z9ZgXnGC9seRDscilBcTHAeOFk67MZg/k9bWVfO+bk4qZmG+l52hRnLwUiH2LnJTg==",
      "license": "MIT",
      "dependencies": {
        "undici-types": "~8.9.0"
      }
    },
    "node_modules/@types/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/@types/react/-/react-19.3.0.tgz",
      "integrity": "sha512-N0rFCuH9YoxG9/m61l9MfpJKfmLOVU0em7ipIz6TRgSSkvReLB9vL85GB+yr8Bs5leqpvg96JSwF4ZS1s4viQg==",
      "devOptional": true,
      "license": "MIT",
      "dependencies": {
        "csstype": "^3.2.2"
      }
    },
    "node_modules/@types/yargs": {
      "version": "17.0.35",
      "resolved": "https://registry.npmjs.org/@types/yargs/-/yargs-17.0.35.tgz",
      "integrity": "sha512-qUHkeCyQFxMXg79wQfTtfndEC+N9ZZg76HJftDJp+qH2tV7Gj4OJi7l+PiWwJ+pWtW8GwSmqsDj/oymhrTWXjg==",
      "license": "MIT",
      "dependencies": {
        "@types/yargs-parser": "*"
      }
    },
    "node_modules/@types/yargs-parser": {
      "version": "21.0.3",
      "resolved": "https://registry.npmjs.org/@types/yargs-parser/-/yargs-parser-21.0.3.tgz",
      "integrity": "sha512-I4q9QU9MQv4oEOz4tAHJtNz1cwuLxn2F3xcc2iV5WdqLPpUnj30aUuxt1mAxYTG+oe8CZMV/+6rU4S4gRDzqtQ==",
      "license": "MIT"
    },
    "node_modules/@typescript-eslint/eslint-plugin": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/eslint-plugin/-/eslint-plugin-8.72.0.tgz",
      "integrity": "sha512-aysKgysPX9XOv/dk95UkvUDe++Q3n3dJPG9CEWT3RUccxfkPJ+Qn6nhKPDhZXU6Ofo9kgwGWwKyQCnZIXTgngg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/regexpp": "^4.12.2",
        "@typescript-eslint/scope-manager": "8.72.0",
        "@typescript-eslint/type-utils": "8.72.0",
        "@typescript-eslint/utils": "8.72.0",
        "@typescript-eslint/visitor-keys": "8.72.0",
        "ignore": "^7.0.5",
        "natural-compare": "^1.4.0",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "@typescript-eslint/parser": "^8.72.0",
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/eslint-plugin/node_modules/ignore": {
      "version": "7.0.14",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-7.0.14.tgz",
      "integrity": "sha512-wCBiZ77u1tuWde6G/nfOtLaCTYcFDU5yCzARzK10y+rLhzYoL7a7yEemcopcc2Mzow7gZOIjnV2ym1NYmdiJOQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/@typescript-eslint/parser": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/parser/-/parser-8.72.0.tgz",
      "integrity": "sha512-0O+x3ynciD6zuXb1CKSu165haQV6ey53DKhHHUnujP7U+XlltJG+/keT0Xhd1HXCze+IHf7Tvt39ovyepX/LNw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/scope-manager": "8.72.0",
        "@typescript-eslint/types": "8.72.0",
        "@typescript-eslint/typescript-estree": "8.72.0",
        "@typescript-eslint/visitor-keys": "8.72.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/project-service": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/project-service/-/project-service-8.72.0.tgz",
      "integrity": "sha512-bzHngBbmIgzj6TsTjVUCntGx6FFLgE7mPjpO0PzHycOaZHXqS43XnrkFIHRS16LLr/xO6FHSXG3GJFo/F4bSBQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/tsconfig-utils": "^8.72.0",
        "@typescript-eslint/types": "^8.72.0",
        "debug": "^4.4.3"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/scope-manager": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/scope-manager/-/scope-manager-8.72.0.tgz",
      "integrity": "sha512-JewPyJOYcXBSAS7PIgufscHOwZqhTGyBRiQJhhuDln66tMchxvvt7nJ90JKKIoOelmdHA3kAQbm9cEUHc4JSEA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.0",
        "@typescript-eslint/visitor-keys": "8.72.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/tsconfig-utils": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/tsconfig-utils/-/tsconfig-utils-8.72.0.tgz",
      "integrity": "sha512-0vbxCf7xLVPSjcOdm6eQbgViH8EDJ8xnl1laLT9yoqSz2YmcSfSg5Vdl0JUvZf6rcuJ0ZivJIuMD4edTg8obaA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/type-utils": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/type-utils/-/type-utils-8.72.0.tgz",
      "integrity": "sha512-gEXxmmbSTSOVTC37IYYvremOM31v+UN2W772bJxmVYPhAOPSUxtacyb7wkm1EhkYKU6KzFJsdU44DCV4to0LWw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.0",
        "@typescript-eslint/typescript-estree": "8.72.0",
        "@typescript-eslint/utils": "8.72.0",
        "debug": "^4.4.3",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/types": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/types/-/types-8.72.0.tgz",
      "integrity": "sha512-Adfoy59kxNEjT5E5fnyrp7GpHYuWs8ONbdohu4ez6IU46qDq8LltG90tLmkucZB2uhYL8mqBjtXqGd8yhfjXqQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@typescript-eslint/typescript-estree": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/typescript-estree/-/typescript-estree-8.72.0.tgz",
      "integrity": "sha512-gwLfFgWcw15tN2KXDCJvxEOQjPn+P3j/n3eSqkZ5sX4VpW9Cosodr+tWwBZRvJT3TcKx6HnPRGZMCNAiP1Xhug==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/project-service": "8.72.0",
        "@typescript-eslint/tsconfig-utils": "8.72.0",
        "@typescript-eslint/types": "8.72.0",
        "@typescript-eslint/visitor-keys": "8.72.0",
        "debug": "^4.4.3",
        "minimatch": "^10.2.2",
        "semver": "^7.7.3",
        "tinyglobby": "^0.2.15",
        "ts-api-utils": "^2.5.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/utils": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/utils/-/utils-8.72.0.tgz",
      "integrity": "sha512-0up3oArJZBYnzOaEXKo8DmI43QvMZyPoFEt9LWzRJcyl/RcJjfKKPebknN1VbTgXBf3M/KggUh5uUMdURLnseg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.9.1",
        "@typescript-eslint/scope-manager": "8.72.0",
        "@typescript-eslint/types": "8.72.0",
        "@typescript-eslint/typescript-estree": "8.72.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      },
      "peerDependencies": {
        "eslint": "^8.57.0 || ^9.0.0 || ^10.0.0",
        "typescript": ">=4.8.4 <6.1.0"
      }
    },
    "node_modules/@typescript-eslint/visitor-keys": {
      "version": "8.72.0",
      "resolved": "https://registry.npmjs.org/@typescript-eslint/visitor-keys/-/visitor-keys-8.72.0.tgz",
      "integrity": "sha512-E2mroviasaWecDzTGiGMtuEguuLVOeRggnrIn93CJuxYJzQBHbyymlT08aVQydbBal5538o+JkBKXh2sRuCyIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "8.72.0",
        "eslint-visitor-keys": "^5.0.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/typescript-eslint"
      }
    },
    "node_modules/@ungap/structured-clone": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/@ungap/structured-clone/-/structured-clone-1.4.0.tgz",
      "integrity": "sha512-1mEZtMKPM09vDmQt5y7YvmN2+DFTP7Tg0EWXdic8/C6VRnpb33e4ghisCIE3WZjsE2N8mf+QV1Zqh7ZFYLWInQ==",
      "license": "ISC"
    },
    "node_modules/@unrs/resolver-binding-android-arm-eabi": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-android-arm-eabi/-/resolver-binding-android-arm-eabi-1.12.2.tgz",
      "integrity": "sha512-g5T90pqg1bo/7mytQx6F4iBNC0Wsh9cu+z9veDbFjc7HjpesJFWD7QMS0NGStXM075+7dJPPVvBbpZlnrdpi/w==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@unrs/resolver-binding-android-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-android-arm64/-/resolver-binding-android-arm64-1.12.2.tgz",
      "integrity": "sha512-YGCRZv/9GLhwmz6mYDeTsm/92BAyR28l6c2ReweVW5pWgfsitWLY8upvfRlGdoyD8HjeTHSYJWyZGD4KJA/nFQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "android"
      ]
    },
    "node_modules/@unrs/resolver-binding-darwin-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-darwin-arm64/-/resolver-binding-darwin-arm64-1.12.2.tgz",
      "integrity": "sha512-u9DiNT1auQMO20A9SyTuG3wUgQWB9Z7KjAg0uFuCDR1FsAY8A0CG2S6JpHS1xwm/w1G08bjXZDcyOCjv1WAm2w==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@unrs/resolver-binding-darwin-x64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-darwin-x64/-/resolver-binding-darwin-x64-1.12.2.tgz",
      "integrity": "sha512-f7rPLi/T1HVKZu/u6t87lroib16n8vrSzcyxI7lg4BGO9UF26KhQL44sd9eOUgrTYhvRXtWOIZT5PejdPyJfUA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "darwin"
      ]
    },
    "node_modules/@unrs/resolver-binding-freebsd-x64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-freebsd-x64/-/resolver-binding-freebsd-x64-1.12.2.tgz",
      "integrity": "sha512-BpcOjWCJub6nRZUS2zA20pmLvjtqAtGejETaIyRLiZiQf++cbrjltLA5NN/xaXfqeOBOSlMFbemIl5/S5tljmg==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "freebsd"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm-gnueabihf": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm-gnueabihf/-/resolver-binding-linux-arm-gnueabihf-1.12.2.tgz",
      "integrity": "sha512-vZTDvdSISZjJx66OzJqtsOhzifbqRjbmI1Mnu49fQDwog5GtDI4QidRiEAYbZCRj9C8YZEW+3ZjqsyS9GR4k2A==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm-musleabihf": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm-musleabihf/-/resolver-binding-linux-arm-musleabihf-1.12.2.tgz",
      "integrity": "sha512-BiPI+IrIlwcW4nLLMM21+B1dFPzd55yAVgVGrdgDjNef+ch03GdxrcyaIz8X9SsQirh/kCQ7mviyWlMxdh2D7g==",
      "cpu": [
        "arm"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm64-gnu/-/resolver-binding-linux-arm64-gnu-1.12.2.tgz",
      "integrity": "sha512-zJc0H99FEPoFfSrNpa91HYfxzfAJCr502oxNK1cfdC9hlaFI43RT+JFCann9JUgZmLzzntChHyn13Sgn9ljHNg==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-arm64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-arm64-musl/-/resolver-binding-linux-arm64-musl-1.12.2.tgz",
      "integrity": "sha512-KQ3Lki6l+Pz1k/eBipN41ES+YUK30beLGb9YqcB1O542cyLCNE6GaxrfcY3T6EezmGGk84wb5XyO9loTM9tkcA==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-loong64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-loong64-gnu/-/resolver-binding-linux-loong64-gnu-1.12.2.tgz",
      "integrity": "sha512-3SJGEh1DborhG6pyxvhPzCT4bbSIVihsvgJc13P1bHG7KLdNDaF9T3gsTwFc7Jw/5Y5/iWOjkEx7Zy0NvCGX3Q==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-loong64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-loong64-musl/-/resolver-binding-linux-loong64-musl-1.12.2.tgz",
      "integrity": "sha512-jiuG/Obbel7uw1PwHNFfrkiKhLAF6mnyZ6aWlOAVN9WqKm8v0OFGnciJIHu8+CMvXLQ8AD51LPzAoUfT21D5Ew==",
      "cpu": [
        "loong64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-ppc64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-ppc64-gnu/-/resolver-binding-linux-ppc64-gnu-1.12.2.tgz",
      "integrity": "sha512-q7xRvVpmcfeL+LlZg8Pbbo6QaTZwDU5BaGZbwfhkEsXJn3Was8xYfE0RBH266xZt0rM6B7i8xAYIvjthuUIWHg==",
      "cpu": [
        "ppc64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-riscv64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-riscv64-gnu/-/resolver-binding-linux-riscv64-gnu-1.12.2.tgz",
      "integrity": "sha512-0CVdx6lcnT3Q9inOH8tsMIOJ6ImndllMjqJHg8RLVdB7Vq4SfkEXl9mCSsVNuNA4MCYycRicCUxPCabVHJRr6A==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-riscv64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-riscv64-musl/-/resolver-binding-linux-riscv64-musl-1.12.2.tgz",
      "integrity": "sha512-iOwlRo9vnp6R6ohHQS11n0NnfdXx/omhkocmIfaPRpQhKZ+3BDMkkdRVh53qjkFkpPddf+FETA28NwGN7l5l+w==",
      "cpu": [
        "riscv64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-s390x-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-s390x-gnu/-/resolver-binding-linux-s390x-gnu-1.12.2.tgz",
      "integrity": "sha512-HYJtLfXq94q8iZNFT1lknx258wlkkWhZeUXJRqzKBBUJ00CvZ+N33zgbCqimLjsyw5Va6uUxhVa12mI+kaveEw==",
      "cpu": [
        "s390x"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-x64-gnu": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-x64-gnu/-/resolver-binding-linux-x64-gnu-1.12.2.tgz",
      "integrity": "sha512-mPsUhunKKDih5O96Y6enDQyHc1SqBPlY1E/SfMWDM3EdJ95Z9CArPeCVwCCqbP45ljvivdEk8Fxn+SIb1rDAJQ==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-linux-x64-musl": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-linux-x64-musl/-/resolver-binding-linux-x64-musl-1.12.2.tgz",
      "integrity": "sha512-azrt6+5ydLd8Vt210AAFis/lZevSfPw93EJRIJG+xPu4WCJ8K0kppCTpMyLPcKT7H15M4Jnt2tMp5bOvCkRC6A==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "linux"
      ]
    },
    "node_modules/@unrs/resolver-binding-openharmony-arm64": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-openharmony-arm64/-/resolver-binding-openharmony-arm64-1.12.2.tgz",
      "integrity": "sha512-YZ9hP4O0X9PQb8eO980qmLNGH4zT3I9+SZTdt0Pr0YyuGQhYKoOZkV02VzrzyOZJ5xIJ3UFIenKkUkGg8GjgWQ==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "openharmony"
      ]
    },
    "node_modules/@unrs/resolver-binding-wasm32-wasi": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-wasm32-wasi/-/resolver-binding-wasm32-wasi-1.12.2.tgz",
      "integrity": "sha512-tYFDIkMxSflfEc/h92ZWNsZlHSwgimbNHSO3PL2JWQHfCuC2q316jMyYU9TIWZsFK2bQwyK5VAdYgn8ygPj69A==",
      "cpu": [
        "wasm32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "dependencies": {
        "@emnapi/core": "1.10.0",
        "@emnapi/runtime": "1.10.0",
        "@napi-rs/wasm-runtime": "^1.1.4"
      },
      "engines": {
        "node": ">=14.0.0"
      }
    },
    "node_modules/@unrs/resolver-binding-win32-arm64-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-arm64-msvc/-/resolver-binding-win32-arm64-msvc-1.12.2.tgz",
      "integrity": "sha512-qzNyg3xL0VPQmCaUh+N5jSitce6k+uCBfMDesWRnlULOZaqUkaJ0ybdT+UqlAWJoQjuqfIU/0Ptx9bteN4D82g==",
      "cpu": [
        "arm64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@unrs/resolver-binding-win32-ia32-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-ia32-msvc/-/resolver-binding-win32-ia32-msvc-1.12.2.tgz",
      "integrity": "sha512-WD9sY00OfpHVGfsnHZoA8jVT+esS/Bg8z8jzxp5BnDCjjwsuKsPQrzswwpFy4J1AUJbXPRfkpcX0mXrzeXW79g==",
      "cpu": [
        "ia32"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@unrs/resolver-binding-win32-x64-msvc": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/@unrs/resolver-binding-win32-x64-msvc/-/resolver-binding-win32-x64-msvc-1.12.2.tgz",
      "integrity": "sha512-nAB74NfSNKknqQ1RrYj6uz8FcXEomu/MATJZxh/x+BArzN2U3JbOYC0APYzUIGhVY3m5hRxA8VPNdPBoG8txlA==",
      "cpu": [
        "x64"
      ],
      "dev": true,
      "license": "MIT",
      "optional": true,
      "os": [
        "win32"
      ]
    },
    "node_modules/@xmldom/xmldom": {
      "version": "0.8.15",
      "resolved": "https://registry.npmjs.org/@xmldom/xmldom/-/xmldom-0.8.15.tgz",
      "integrity": "sha512-/5NV/vDALVFDXgLmfsy9TRCBlKwO2LNBFzpzvb9iIj+jR+eSc6DLYYvVOdivT/jm7MtU6TebYuRmzEOI7w40UA==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      }
    },
    "node_modules/2g": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/2g/-/2g-1.0.1.tgz",
      "integrity": "sha512-+uViadKOS/wwR4pFu5g8TPn3QHpKqoX19JHCnp8k/3cLpImdcXozwvZA6Q/5PeW3AcU8neL8faaMidBcv7o8CA==",
      "license": "MIT",
      "bin": {
        "2g": "bin/cli.js"
      },
      "peerDependencies": {
        "typescript": ">=5.8.0"
      },
      "peerDependenciesMeta": {
        "typescript": {
          "optional": true
        }
      }
    },
    "node_modules/accepts": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-2.0.0.tgz",
      "integrity": "sha512-5cvg6CtKwfgdmVqY1WIiXKc3Q1bkRqGLi+2W/6ao+6Y7gu/RCwRuAhGEzh5B4KlszSuTLgZYuqFqo5bImjNKng==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "^3.0.0",
        "negotiator": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/acorn": {
      "version": "8.19.0",
      "resolved": "https://registry.npmjs.org/acorn/-/acorn-8.19.0.tgz",
      "integrity": "sha512-oJlA3XiRm7Cyk6qFD2Jn8ak9B7jSy0qy00ADO3+8dpT0LSjFihQYv4C02LFCSYJV3Q37xYwwRy5m+IpIiUzqWw==",
      "license": "MIT",
      "bin": {
        "acorn": "bin/acorn"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/acorn-jsx": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/acorn-jsx/-/acorn-jsx-5.3.2.tgz",
      "integrity": "sha512-rq9s+JNhf0IChjtDXxllJ7g41oZk5SlXtp0LHwyA5cejwn7vKmKp4pPri6YEePv2PU65sAsegbXtIinmDFDXgQ==",
      "dev": true,
      "license": "MIT",
      "peerDependencies": {
        "acorn": "^6.0.0 || ^7.0.0 || ^8.0.0"
      }
    },
    "node_modules/agent-base": {
      "version": "7.1.4",
      "resolved": "https://registry.npmjs.org/agent-base/-/agent-base-7.1.4.tgz",
      "integrity": "sha512-MnA+YT8fwfJPgBx3m60MNqakm30XOkyIoH1y6huTQvC0PwZG7ki8NacLBcrPbNoo8vEZy7Jpuk7+jMO+CUovTQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/agent-cli-detector": {
      "version": "0.1.7",
      "resolved": "https://registry.npmjs.org/agent-cli-detector/-/agent-cli-detector-0.1.7.tgz",
      "integrity": "sha512-d8OWDVdZMgjhLUT9ZPgSv/BdFFF9pVuscC0JdUSz3bjwE15gcp6u/o0/JooM2yyAWC49KThFhXlgTXRa9B7yng==",
      "license": "MIT",
      "bin": {
        "agent-cli-detector": "dist/cli.js"
      },
      "engines": {
        "node": ">=18.18"
      }
    },
    "node_modules/ajv": {
      "version": "6.15.0",
      "resolved": "https://registry.npmjs.org/ajv/-/ajv-6.15.0.tgz",
      "integrity": "sha512-fgFx7Hfoq60ytK2c7DhnF8jIvzYgOMxfugjLOSMHjLIPgenqa7S7oaagATUq99mV6IYvN2tRmC0wnTYX6iPbMw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "fast-deep-equal": "^3.1.1",
        "fast-json-stable-stringify": "^2.0.0",
        "json-schema-traverse": "^0.4.1",
        "uri-js": "^4.2.2"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/epoberezkin"
      }
    },
    "node_modules/anser": {
      "version": "1.4.10",
      "resolved": "https://registry.npmjs.org/anser/-/anser-1.4.10.tgz",
      "integrity": "sha512-hCv9AqTQ8ycjpSd3upOJd7vFwW1JaoYQ7tpham03GJ1ca8/65rqn0RpaWpItOAd6ylW9wAw6luXYPJIyPFVOww==",
      "license": "MIT"
    },
    "node_modules/ansi-escapes": {
      "version": "4.3.2",
      "resolved": "https://registry.npmjs.org/ansi-escapes/-/ansi-escapes-4.3.2.tgz",
      "integrity": "sha512-gKXj5ALrKWQLsYG9jlTRmR/xKluxHV+Z9QEwNIgCfM1/uwPMCuzVVnh5mwTd+OuBZcwSIMbqssNWRm1lE51QaQ==",
      "license": "MIT",
      "dependencies": {
        "type-fest": "^0.21.3"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ansi-escapes/node_modules/type-fest": {
      "version": "0.21.3",
      "resolved": "https://registry.npmjs.org/type-fest/-/type-fest-0.21.3.tgz",
      "integrity": "sha512-t0rzBq87m3fVcduHDUFhKmyyX+9eo6WQjZvf51Ea/M0Q7+T374Jp1aUiyUl0GKxp8M/OETVHSDvmkyPgvX+X2w==",
      "license": "(MIT OR CC0-1.0)",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/ansi-regex": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-5.0.1.tgz",
      "integrity": "sha512-quJQXlTSUGL2LH9SUXo8VwsY4soanhgo6LNSm84E1LBcE8s3O0wpdiRzyR9z/ZZJMlMWv37qOOb9pdJlMUEKFQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/ansi-styles": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-4.3.0.tgz",
      "integrity": "sha512-zbB9rCJAT1rbjiVDb2hqKFHNYLxgtk8NURxZ3IZwD3F6NtxbXZQCnnSi1Lkx+IDohdPlFp222wVALIheZJQSEg==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/arg": {
      "version": "5.0.2",
      "resolved": "https://registry.npmjs.org/arg/-/arg-5.0.2.tgz",
      "integrity": "sha512-PYjyFOLKQ9y57JvQ6QLo8dAgNqswh8M1RMJYdQduT6xbWSgK36P/Z/v+p888pM69jMMfS8Xd8F6I1kQ/I9HUGg==",
      "license": "MIT"
    },
    "node_modules/argparse": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/argparse/-/argparse-2.0.1.tgz",
      "integrity": "sha512-8+9WqebbFzpX9OR+Wa6O29asIogeRMzcGtAINdpMHHyAg10f05aSFVBbcEqGf/PXw1EjAZ+q2/bEBg3DvurK3Q==",
      "license": "Python-2.0"
    },
    "node_modules/array-buffer-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/array-buffer-byte-length/-/array-buffer-byte-length-1.0.2.tgz",
      "integrity": "sha512-LHE+8BuR7RYGDKvnrmcuSq3tDcKv9OFEXQt/HpbZhY7V6h0zlUXutnAD82GiFx9rdieCMjkvtcsPqBwgUl1Iiw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "is-array-buffer": "^3.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array-includes": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/array-includes/-/array-includes-3.2.0.tgz",
      "integrity": "sha512-VXY5eFRarnXcYxwBjJzPmEhH55+rmP79/+ueDhi0F+TuqfHCItagIHqxeUZrmgrOPa31QTh9H85DjX3FfJ0FTg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-object-atoms": "^1.1.2",
        "es-shim-unscopables": "^1.1.0",
        "is-string": "^1.1.1",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlast": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/array.prototype.findlast/-/array.prototype.findlast-1.2.5.tgz",
      "integrity": "sha512-CVvd6FHg1Z3POpBLxO6E6zr+rSKEQ9L6rZHAaY7lLfhKsWYUBBOuMs0e9o24oopj6H+geRCX0YJ+TJLBK2eHyQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.findlastindex": {
      "version": "1.2.6",
      "resolved": "https://registry.npmjs.org/array.prototype.findlastindex/-/array.prototype.findlastindex-1.2.6.tgz",
      "integrity": "sha512-F/TKATkzseUExPlfvmwQKGITM3DGTK+vkAsCZoDc5daVygbJBnjEUCbgkAvVFsgfXfX4YIqZ/27G3k3tdXrTxQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-shim-unscopables": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flat": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flat/-/array.prototype.flat-1.3.3.tgz",
      "integrity": "sha512-rwG/ja1neyLqCuGZ5YYrznA62D4mZXg0i1cIskIUKSiqF3Cje9/wXAls9B9s1Wa2fomMsIv8czB8jZcPmxCXFg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.flatmap": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/array.prototype.flatmap/-/array.prototype.flatmap-1.3.3.tgz",
      "integrity": "sha512-Y7Wt51eKJSyi80hFrJCePGGNo5ktJCslFuboqJsbf57CCPcm5zztluPlc4/aD8sWsKvlwatezpV4U1efk8kpjg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/array.prototype.tosorted": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/array.prototype.tosorted/-/array.prototype.tosorted-1.1.4.tgz",
      "integrity": "sha512-p6Fx8B7b7ZhL/gmUsAy0D15WhvDccw3mnGNbZpi3pmeJdxtWsj2jEaI4Y6oo3XiHfzuSgPwKc04MYt6KgvC/wA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.3",
        "es-errors": "^1.3.0",
        "es-shim-unscopables": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/arraybuffer.prototype.slice": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/arraybuffer.prototype.slice/-/arraybuffer.prototype.slice-1.0.4.tgz",
      "integrity": "sha512-BNoCY6SXXPQ7gF2opIP4GBE+Xw7U+pHMYKuzjgCN3GwiaIR09UUeKfheyIry77QtrCBlC0KK0q5/TER/tYh3PQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.1",
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.5",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "is-array-buffer": "^3.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/asap": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/asap/-/asap-2.0.6.tgz",
      "integrity": "sha512-BSHWgDSAiKs50o2Re8ppvp3seVHXSRM44cdSsT9FfNEUUZLOGWVCsiWaRPWM1Znn+mqZ1OfVZ3z3DWEzSp7hRA==",
      "license": "MIT"
    },
    "node_modules/async-function": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/async-function/-/async-function-1.0.0.tgz",
      "integrity": "sha512-hsU18Ae8CDTR6Kgu9DYf0EbCr/a5iGL0rytQDobUcdpYOKokk8LEjVphnXkDkgpi0wYVsqrXuP0bZxJaTqdgoA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/available-typed-arrays": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/available-typed-arrays/-/available-typed-arrays-1.0.7.tgz",
      "integrity": "sha512-wvUjBtSGN7+7SjNpq/9M2Tg350UZD3q62IFZLbRAR1bSMlCo1ZaeW+BJ+D090e4hIIZLBcTDWe4Mh4jvUDajzQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "possible-typed-array-names": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/aws-ssl-profiles": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/aws-ssl-profiles/-/aws-ssl-profiles-1.1.2.tgz",
      "integrity": "sha512-NZKeq9AfyQvEeNlN0zSYAaWrmBffJh3IELMZfRpJVWgrpEbtEpnjvzqBPf+mxoI287JohRDoa+/nsfqqiZmF6g==",
      "license": "MIT",
      "engines": {
        "node": ">= 6.0.0"
      }
    },
    "node_modules/babel-plugin-polyfill-corejs2": {
      "version": "0.4.17",
      "resolved": "https://registry.npmjs.org/babel-plugin-polyfill-corejs2/-/babel-plugin-polyfill-corejs2-0.4.17.tgz",
      "integrity": "sha512-aTyf30K/rqAsNwN76zYrdtx8obu0E4KoUME29B1xj+B3WxgvWkp943vYQ+z8Mv3lw9xHXMHpvSPOBxzAkIa94w==",
      "license": "MIT",
      "dependencies": {
        "@babel/compat-data": "^7.28.6",
        "@babel/helper-define-polyfill-provider": "^0.6.8",
        "semver": "^6.3.1"
      },
      "peerDependencies": {
        "@babel/core": "^7.4.0 || ^8.0.0-0 <8.0.0"
      }
    },
    "node_modules/babel-plugin-polyfill-corejs2/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/babel-plugin-polyfill-corejs3": {
      "version": "0.13.0",
      "resolved": "https://registry.npmjs.org/babel-plugin-polyfill-corejs3/-/babel-plugin-polyfill-corejs3-0.13.0.tgz",
      "integrity": "sha512-U+GNwMdSFgzVmfhNm8GJUX88AadB3uo9KpJqS3FaqNIPKgySuvMb+bHPsOmmuWyIcuqZj/pzt1RUIUZns4y2+A==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-define-polyfill-provider": "^0.6.5",
        "core-js-compat": "^3.43.0"
      },
      "peerDependencies": {
        "@babel/core": "^7.4.0 || ^8.0.0-0 <8.0.0"
      }
    },
    "node_modules/babel-plugin-polyfill-regenerator": {
      "version": "0.6.8",
      "resolved": "https://registry.npmjs.org/babel-plugin-polyfill-regenerator/-/babel-plugin-polyfill-regenerator-0.6.8.tgz",
      "integrity": "sha512-M762rNHfSF1EV3SLtnCJXFoQbbIIz0OyRwnCmV0KPC7qosSfCO0QLTSuJX3ayAebubhE6oYBAYPrBA5ljowaZg==",
      "license": "MIT",
      "dependencies": {
        "@babel/helper-define-polyfill-provider": "^0.6.8"
      },
      "peerDependencies": {
        "@babel/core": "^7.4.0 || ^8.0.0-0 <8.0.0"
      }
    },
    "node_modules/babel-plugin-react-compiler": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/babel-plugin-react-compiler/-/babel-plugin-react-compiler-1.0.0.tgz",
      "integrity": "sha512-Ixm8tFfoKKIPYdCCKYTsqv+Fd4IJ0DQqMyEimo+pxUOMUR9cVPlwTrFt9Avu+3cb6Zp3mAzl+t1MrG2fxxKsxw==",
      "license": "MIT",
      "dependencies": {
        "@babel/types": "^7.26.0"
      }
    },
    "node_modules/babel-plugin-react-native-web": {
      "version": "0.21.4",
      "resolved": "https://registry.npmjs.org/babel-plugin-react-native-web/-/babel-plugin-react-native-web-0.21.4.tgz",
      "integrity": "sha512-FSclsDTGi5EcvpbW3TM7s8GLWwQqo5wI9zQqJr2m0IoJRenSkp1+bVvdeZXTNznI5Ms9Bry7DLBR+C5Shb9gtw==",
      "license": "MIT"
    },
    "node_modules/babel-plugin-syntax-hermes-parser": {
      "version": "0.36.1",
      "resolved": "https://registry.npmjs.org/babel-plugin-syntax-hermes-parser/-/babel-plugin-syntax-hermes-parser-0.36.1.tgz",
      "integrity": "sha512-ycduwJbvdvIMmVvlAZqGggS+pm5Eu4Bk9pcV9Sm2Z4PJNRVsKkv0g7vHj+LeuC1gHTeF67sJXFOq61IlqCa2hA==",
      "license": "MIT",
      "dependencies": {
        "hermes-parser": "0.36.1"
      }
    },
    "node_modules/babel-plugin-transform-flow-enums": {
      "version": "0.0.2",
      "resolved": "https://registry.npmjs.org/babel-plugin-transform-flow-enums/-/babel-plugin-transform-flow-enums-0.0.2.tgz",
      "integrity": "sha512-g4aaCrDDOsWjbm0PUUeVnkcVd6AKJsVc/MbnPhEotEpkeJQP6b8nzewohQi7+QS8UyPehOhGWn0nOwjvWpmMvQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/plugin-syntax-flow": "^7.12.1"
      }
    },
    "node_modules/balanced-match": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-4.0.4.tgz",
      "integrity": "sha512-BLrgEcRTwX2o6gGxGOCNyMvGSp35YofuYzw9h1IMTRmKqttAZZVU67bdb9Pr2vUHA8+j3i2tJfjO6C6+4myGTA==",
      "license": "MIT",
      "engines": {
        "node": "18 || 20 || >=22"
      }
    },
    "node_modules/base64-js": {
      "version": "1.5.1",
      "resolved": "https://registry.npmjs.org/base64-js/-/base64-js-1.5.1.tgz",
      "integrity": "sha512-AKpaYlHn8t4SVbOHCy+b5+KKgvR4vrsD8vbvrbiQJps7fKDTkjkDry6ji0rUJjC0kzbNePLwzxq8iypo41qeWA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/baseline-browser-mapping": {
      "version": "2.11.33",
      "resolved": "https://registry.npmjs.org/baseline-browser-mapping/-/baseline-browser-mapping-2.11.33.tgz",
      "integrity": "sha512-yiVKDX+qCMRKBE084lXvq9EcwFUhKZ2nU8TK1EQQuOgPNR/lmbGxXOeDdlGUqC2Zz11Cs9rk1d/8NfgBmlkt0w==",
      "license": "Apache-2.0",
      "bin": {
        "baseline-browser-mapping": "dist/cli.cjs"
      },
      "engines": {
        "node": ">=6.0.0"
      }
    },
    "node_modules/bcryptjs": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/bcryptjs/-/bcryptjs-3.0.3.tgz",
      "integrity": "sha512-GlF5wPWnSa/X5LKM1o0wz0suXIINz1iHRLvTS+sLyi7XPbe5ycmYI3DlZqVGZZtDgl4DmasFg7gOB3JYbphV5g==",
      "license": "BSD-3-Clause",
      "bin": {
        "bcrypt": "bin/bcrypt"
      }
    },
    "node_modules/big-integer": {
      "version": "1.6.52",
      "resolved": "https://registry.npmjs.org/big-integer/-/big-integer-1.6.52.tgz",
      "integrity": "sha512-QxD8cf2eVqJOOz63z6JIN9BzvVs/dlySa5HGSBH5xtR8dPteIRQnBxxKqkNTiT6jbDTF6jAfrd4oMcND9RGbQg==",
      "license": "Unlicense",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/body-parser": {
      "version": "2.4.0",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.4.0.tgz",
      "integrity": "sha512-Ifk1KcLrxaGt1occQagQNFNNOqRt1LFuehEnHHzB8Z6cRgIxRU1TBaiIsUiCdA+gy5PL7Y1IX31DNKkRmxtXjQ==",
      "license": "MIT",
      "dependencies": {
        "bytes": "^3.1.2",
        "content-type": "^2.1.0",
        "debug": "^4.4.3",
        "http-errors": "^2.0.1",
        "iconv-lite": "^0.7.3",
        "on-finished": "^2.4.1",
        "qs": "^6.16.1",
        "raw-body": "^3.0.2",
        "type-is": "^2.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/body-parser/node_modules/on-finished": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.2.tgz",
      "integrity": "sha512-ATWUv387i+nLD49EiDoOft5scf32Vsdz3ktrQJG9bi7jRFmaXTssvyvj1EmeKVVgvesbqUtvQQvaS2TpTukAZQ==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/bplist-creator": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/bplist-creator/-/bplist-creator-0.1.0.tgz",
      "integrity": "sha512-sXaHZicyEEmY86WyueLTQesbeoH/mquvarJaQNbjuOQO+7gbFcDEWqKmcWA4cOTLzFlfgvkiVxolk1k5bBIpmg==",
      "license": "MIT",
      "dependencies": {
        "stream-buffers": "2.2.x"
      }
    },
    "node_modules/bplist-parser": {
      "version": "0.3.1",
      "resolved": "https://registry.npmjs.org/bplist-parser/-/bplist-parser-0.3.1.tgz",
      "integrity": "sha512-PyJxiNtA5T2PlLIeBot4lbp7rj4OadzjnMZD/G5zuBNt8ei/yCU7+wW0h2bag9vr8c+/WuRWmSxbqAl9hL1rBA==",
      "license": "MIT",
      "dependencies": {
        "big-integer": "1.6.x"
      },
      "engines": {
        "node": ">= 5.10.0"
      }
    },
    "node_modules/brace-expansion": {
      "version": "5.0.12",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-5.0.12.tgz",
      "integrity": "sha512-YovQ3rzhaLMIrDjNDMkNS01tea93qhEhG5xy8f6+R0l+dw3Ki+5sCoIoI942iuLZTHWogWktgwVDhU09iNEimQ==",
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^4.0.2"
      },
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/braces": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/braces/-/braces-3.0.3.tgz",
      "integrity": "sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==",
      "license": "MIT",
      "dependencies": {
        "fill-range": "^7.1.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/browserslist": {
      "version": "4.29.4",
      "resolved": "https://registry.npmjs.org/browserslist/-/browserslist-4.29.4.tgz",
      "integrity": "sha512-2TcbbiwXEq+N0kD36tykpCfyyQigUXmuwNQbnPp4Xk4PX9JOqVIKjJlIDjpH7uY6tmRGoAd+apeT1p60T8wsdA==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "baseline-browser-mapping": "^2.11.29",
        "caniuse-lite": "^1.0.30001816",
        "electron-to-chromium": "^1.5.459",
        "node-releases": "^2.0.59",
        "update-browserslist-db": "^1.3.4"
      },
      "bin": {
        "browserslist": "cli.js"
      },
      "engines": {
        "node": "^6 || ^7 || ^8 || ^9 || ^10 || ^11 || ^12 || >=13.7"
      }
    },
    "node_modules/bser": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/bser/-/bser-2.1.2.tgz",
      "integrity": "sha512-V2o8YS2EhrKMO9AumnkK0ynynfFlsajpYupwq7S46H5mhcanwxDkNTw3K67wPIcKTH1ffkA4vhMOtAc7gRmPZw==",
      "license": "MIT",
      "dependencies": {
        "node-int64": "^0.4.0"
      }
    },
    "node_modules/buffer-equal-constant-time": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/buffer-equal-constant-time/-/buffer-equal-constant-time-1.0.1.tgz",
      "integrity": "sha512-zRpUiDwd/xk6ADqPMATG8vc9VPrkck7T07OIx0gnjmJAnHnTVXNQG3vfvWNuiZIkwu9KrKdA1iJKfsfTVxE6NA==",
      "license": "BSD-3-Clause"
    },
    "node_modules/buffer-from": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/buffer-from/-/buffer-from-1.1.2.tgz",
      "integrity": "sha512-E+XQCRwSbaaiChtv6k6Dwgc+bx+Bs6vuKJHHl5kox/BaKbhiXzqQOwK4cO22yElGp2OCmjwVhT3HmxgyPGnJfQ==",
      "license": "MIT"
    },
    "node_modules/bytes": {
      "version": "3.1.2",
      "resolved": "https://registry.npmjs.org/bytes/-/bytes-3.1.2.tgz",
      "integrity": "sha512-/Nf7TyzTx6S3yRJObOAV7956r8cr2+Oj8AC5dt8wSP3BQAoeX58NoHyCU8P8zGkNXStjTSi6fzO6F0pBdcYbEg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/call-bind": {
      "version": "1.0.9",
      "resolved": "https://registry.npmjs.org/call-bind/-/call-bind-1.0.9.tgz",
      "integrity": "sha512-a/hy+pNsFUTR+Iz8TCJvXudKVLAnz/DyeSUo10I5yvFDQJBFU2s9uqQpoSrJlroHUKoKqzg+epxyP9lqFdzfBQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "get-intrinsic": "^1.3.0",
        "set-function-length": "^1.2.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/call-bind-apply-helpers": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/call-bind-apply-helpers/-/call-bind-apply-helpers-1.0.2.tgz",
      "integrity": "sha512-Sp1ablJ0ivDkSzjcaJdxEunN5/XvksFJ2sMBFfq6x0ryhQV/2b/KwFe21cMpmHtPOSij8K99/wSfoEuTObmuMQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/call-bound": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/call-bound/-/call-bound-1.0.4.tgz",
      "integrity": "sha512-+ys997U96po4Kx/ABpBCqhA9EuxJaQWDQg7295H4hBphv3IZg0boBKuwYpt4YXp6MZ5AmZQnU/tyMTlRpaSejg==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "get-intrinsic": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/callsites": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/callsites/-/callsites-3.1.0.tgz",
      "integrity": "sha512-P8BjAsXvZS+VIDUI11hHCQEv74YT67YUi5JJFNWIqL235sBmjX4+qx9Muvls5ivyNENctx46xQLQ3aTuE7ssaQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/camelcase": {
      "version": "6.3.0",
      "resolved": "https://registry.npmjs.org/camelcase/-/camelcase-6.3.0.tgz",
      "integrity": "sha512-Gmy6FhYlCY7uOElZUSbxo2UCDH8owEk996gkbrpsgGtrJLM3J7jGxl9Ic7Qwwj4ivOE5AWZWRMecDdF7hqGjFA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/caniuse-lite": {
      "version": "1.0.30001819",
      "resolved": "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001819.tgz",
      "integrity": "sha512-LFUqIIAwpzsIuevnKnsR9qnStBcgzPShTX61lBwN9uFkkf8o8zLiebEjbW8AYtZiF+1YKDWfdt/pWDtMuG8Xwg==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/caniuse-lite"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "CC-BY-4.0"
    },
    "node_modules/chalk": {
      "version": "4.1.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-4.1.2.tgz",
      "integrity": "sha512-oKnbhFyRIXpUuez8iBMmyEa4nbj4IOQyuhc/wy9kY7/WVPcwIO9VA668Pu8RkO7+0G76SLROeyw9CpQ061i4mA==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.1.0",
        "supports-color": "^7.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/chalk?sponsor=1"
      }
    },
    "node_modules/ci-info": {
      "version": "3.9.0",
      "resolved": "https://registry.npmjs.org/ci-info/-/ci-info-3.9.0.tgz",
      "integrity": "sha512-NIxF55hv4nSqQswkAeiOi1r83xy8JldOFDTWiug55KBu9Jnblncd2U6ViHmYgHf01TPZS77NJBhBMKdWj9HQMQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/sibiraj-s"
        }
      ],
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/cli-cursor": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/cli-cursor/-/cli-cursor-2.1.0.tgz",
      "integrity": "sha512-8lgKz8LmCRYZZQDpRyT2m5rKJ08TnU4tR9FFFW2rxpxR1FzWi4PQ/NfyODchAatHaUgnSPVcx/R5w6NuTBzFiw==",
      "license": "MIT",
      "dependencies": {
        "restore-cursor": "^2.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/cli-spinners": {
      "version": "2.9.2",
      "resolved": "https://registry.npmjs.org/cli-spinners/-/cli-spinners-2.9.2.tgz",
      "integrity": "sha512-ywqV+5MmyL4E7ybXgKys4DugZbX0FC6LnwrhjuykIjnK9k8OQacQ7axGKnjDXWNhns0xot3bZI5h55H8yo9cJg==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/cliui": {
      "version": "8.0.1",
      "resolved": "https://registry.npmjs.org/cliui/-/cliui-8.0.1.tgz",
      "integrity": "sha512-BSeNnyus75C4//NQ9gQt1/csTXyo/8Sb+afLAkzAptFuMsod9HFokGNudZpi/oQV73hnVK+sR+5PVRMd+Dr7YQ==",
      "license": "ISC",
      "dependencies": {
        "string-width": "^4.2.0",
        "strip-ansi": "^6.0.1",
        "wrap-ansi": "^7.0.0"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/clone": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/clone/-/clone-1.0.4.tgz",
      "integrity": "sha512-JQHZ2QMW6l3aH/j6xCqQThY/9OH4D/9ls34cgkUBiEeocRTU04tHfKPBsUK1PqZCUQM7GiA0IIXJSuXHI64Kbg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.8"
      }
    },
    "node_modules/color": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/color/-/color-4.2.3.tgz",
      "integrity": "sha512-1rXeuUUiGGrykh+CeBdu5Ie7OJwinCgQY0bc7GCRxy5xVHy+moaqkpL/jqQq0MtQOeYcrqEz4abc5f0KtU7W4A==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^2.0.1",
        "color-string": "^1.9.0"
      },
      "engines": {
        "node": ">=12.5.0"
      }
    },
    "node_modules/color-convert": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-2.0.1.tgz",
      "integrity": "sha512-RRECPsj7iu/xb5oKYcsFHSppFNnsj/52OVTRKb4zP5onXwVF3zVmmToNcOfGC+CRDpfK/U584fMg38ZHCaElKQ==",
      "license": "MIT",
      "dependencies": {
        "color-name": "~1.1.4"
      },
      "engines": {
        "node": ">=7.0.0"
      }
    },
    "node_modules/color-name": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.4.tgz",
      "integrity": "sha512-dOy+3AuW3a2wNbZHIuMZpTcgjGuLU/uBL/ubcZF9OXbDo8ff4O8yVp5Bf0efS8uEoYo5q4Fx7dY9OgQGXgAsQA==",
      "license": "MIT"
    },
    "node_modules/color-string": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/color-string/-/color-string-1.9.1.tgz",
      "integrity": "sha512-shrVawQFojnZv6xM40anx4CkoDP+fZsw/ZerEMsW/pyzsRbElpsL/DBVW7q3ExxwusdNXI3lXpuhEZkzs8p5Eg==",
      "license": "MIT",
      "dependencies": {
        "color-name": "^1.0.0",
        "simple-swizzle": "^0.2.2"
      }
    },
    "node_modules/commander": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/commander/-/commander-7.2.0.tgz",
      "integrity": "sha512-QrWXB+ZQSVPmIWIhtEO9H+gwHaMGYiF5ChvoJ+K9ZGHG/sVsa6yiesAD1GC/x46sET00Xlwo1u49RVVVzvcSkw==",
      "license": "MIT",
      "engines": {
        "node": ">= 10"
      }
    },
    "node_modules/compressible": {
      "version": "2.0.18",
      "resolved": "https://registry.npmjs.org/compressible/-/compressible-2.0.18.tgz",
      "integrity": "sha512-AF3r7P5dWxL8MxyITRMlORQNaOA2IkAFaTr4k7BUumjPtRpGDTZpl0Pb1XCO6JeDCBdp126Cgs9sMxqSjgYyRg==",
      "license": "MIT",
      "dependencies": {
        "mime-db": ">= 1.43.0 < 2"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/compression": {
      "version": "1.8.2",
      "resolved": "https://registry.npmjs.org/compression/-/compression-1.8.2.tgz",
      "integrity": "sha512-o8vI5RE5A6EVVOd9o41jKp41aJom+QTEO/Bx8MYNjexMo/Bv2WOjUfZr+aL0WnYSgymUy6zeguqLTsIhV0gMvQ==",
      "license": "MIT",
      "dependencies": {
        "bytes": "3.1.2",
        "compressible": "~2.0.18",
        "debug": "2.6.9",
        "destroy": "1.2.0",
        "negotiator": "~0.6.4",
        "on-headers": "~1.1.0",
        "safe-buffer": "5.2.1",
        "vary": "~1.1.2"
      },
      "engines": {
        "node": ">= 0.8.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/compression/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/compression/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/compression/node_modules/negotiator": {
      "version": "0.6.4",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.4.tgz",
      "integrity": "sha512-myRT3DiWPHqho5PrJaIRyaMv2kgYf0mUVgBNOYMuCH5Ki1yEiQaf/ZJuQ62nvpc44wL5WDbTX7yGJi1Neevw8w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/concat-map": {
      "version": "0.0.1",
      "resolved": "https://registry.npmjs.org/concat-map/-/concat-map-0.0.1.tgz",
      "integrity": "sha512-/Srv4dswyQNBfohGpz9o6Yb3Gz3SrUDqBH5rTuhGR7ahtlbYKnVxw2bCFMRljaA7EXHaXZ8wsHdodFvbkhKmqg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/connect": {
      "version": "3.7.0",
      "resolved": "https://registry.npmjs.org/connect/-/connect-3.7.0.tgz",
      "integrity": "sha512-ZqRXc+tZukToSNmh5C2iWMSoV3X1YUcPbqEM4DkEG5tNQXrQUZCNVGGv3IuicnkMtPfGf3Xtp8WCXs295iQ1pQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "finalhandler": "1.1.2",
        "parseurl": "~1.3.3",
        "utils-merge": "1.0.1"
      },
      "engines": {
        "node": ">= 0.10.0"
      }
    },
    "node_modules/connect/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/connect/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/content-disposition": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/content-disposition/-/content-disposition-2.0.1.tgz",
      "integrity": "sha512-e+H0ZXHSWYrENhQzw1LPuP4oF5MzVKmDU6d3hxlvaPEYLLg62MxtQNPRx4SYSuYJSBUgnQIG4HIN2tEtNv7Dog==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/content-type": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/content-type/-/content-type-2.1.0.tgz",
      "integrity": "sha512-mj7UPXE0jaqaOsukNZRUEfEi2AcL7C/vwmwcHV0O97eO1E1pxBZuyjlZrx5seTaNBg1U6+o35wpa35Qfcc+7ag==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/convert-source-map": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/convert-source-map/-/convert-source-map-2.0.0.tgz",
      "integrity": "sha512-Kvp459HrV2FEJ1CAsi1Ku+MY3kasH19TFykTz2xWmMeq6bk2NU3XXvfJ+Q61m0xktWwt+1HSYf3JZsTms3aRJg==",
      "license": "MIT"
    },
    "node_modules/cookie": {
      "version": "0.7.2",
      "resolved": "https://registry.npmjs.org/cookie/-/cookie-0.7.2.tgz",
      "integrity": "sha512-yki5XnKuf750l50uGTllt6kKILY4nQ1eNIQatoXEByZ5dWgnKqbnqmTrBE5B4N7lrMJKQ2ytWMiTO2o0v6Ew/w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/cookie-signature": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/cookie-signature/-/cookie-signature-1.2.2.tgz",
      "integrity": "sha512-D76uU73ulSXrD1UXF4KE2TMxVVwhsnCgfAyTg9k8P6KGZjlXKrOLe4dJQKI3Bxi5wjesZoFXJWElNWBjPZMbhg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.6.0"
      }
    },
    "node_modules/core-js-compat": {
      "version": "3.51.0",
      "resolved": "https://registry.npmjs.org/core-js-compat/-/core-js-compat-3.51.0.tgz",
      "integrity": "sha512-52r6fkXgxv4GLMjmFcMWRx7X9bw071xTTdrDcdyPGRqU2oE+9pCG0bAOMifSBdLw0JRBZKEF0q3B55qPlLuE8g==",
      "license": "MIT",
      "dependencies": {
        "browserslist": "^4.29.3"
      },
      "engines": {
        "node": ">=6.4.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/core-js"
      }
    },
    "node_modules/cors": {
      "version": "2.8.6",
      "resolved": "https://registry.npmjs.org/cors/-/cors-2.8.6.tgz",
      "integrity": "sha512-tJtZBBHA6vjIAaF6EnIaq6laBBP9aq/Y3ouVJjEfoHbRBcHBAHYcMh/w8LDrk2PvIMMq8gmopa5D4V8RmbrxGw==",
      "license": "MIT",
      "dependencies": {
        "object-assign": "^4",
        "vary": "^1"
      },
      "engines": {
        "node": ">= 0.10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/cross-fetch": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/cross-fetch/-/cross-fetch-3.2.0.tgz",
      "integrity": "sha512-Q+xVJLoGOeIMXZmbUK4HYk+69cQH6LudR0Vu/pRm2YlU/hDV9CiS0gKUMaWY5f2NeUH9C1nV3bsTlCo0FsTV1Q==",
      "license": "MIT",
      "dependencies": {
        "node-fetch": "^2.7.0"
      }
    },
    "node_modules/cross-spawn": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/cross-spawn/-/cross-spawn-7.0.6.tgz",
      "integrity": "sha512-uV2QOWP2nWzsy2aMp8aRibhi9dlzF5Hgh5SHaB9OiTGEyDTiJJyx0uy51QXdyWbtAHNua4XJzUKca3OzKUd3vA==",
      "license": "MIT",
      "dependencies": {
        "path-key": "^3.1.0",
        "shebang-command": "^2.0.0",
        "which": "^2.0.1"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/css-in-js-utils": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/css-in-js-utils/-/css-in-js-utils-3.1.0.tgz",
      "integrity": "sha512-fJAcud6B3rRu+KHYk+Bwf+WFL2MDCJJ1XG9x137tJQ0xYxor7XziQtuGFbWNdqrvF4Tk26O3H73nfVqXt/fW1A==",
      "license": "MIT",
      "dependencies": {
        "hyphenate-style-name": "^1.0.3"
      }
    },
    "node_modules/csstype": {
      "version": "3.2.3",
      "resolved": "https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz",
      "integrity": "sha512-z1HGKcYy2xA8AGQfwrn0PAy+PB7X/GSj3UVJW9qKyn43xWa+gl5nXmU4qqLMRzWVLFC8KusUX8T/0kCiOYpAIQ==",
      "devOptional": true,
      "license": "MIT"
    },
    "node_modules/data-view-buffer": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-buffer/-/data-view-buffer-1.0.2.tgz",
      "integrity": "sha512-EmKO5V3OLXh1rtK2wgXRansaK1/mtVdTUEiEI0W8RkvgT05kfxaH29PliLnpLP73yYO6142Q72QNa8Wx/A5CqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/data-view-byte-length": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/data-view-byte-length/-/data-view-byte-length-1.0.2.tgz",
      "integrity": "sha512-tuhGbE6CfTM9+5ANGf+oQb72Ky/0+s3xKUpHvShfiz2RxMFgFPjsXuRLBVMtvMs15awe45SRb83D6wH4ew6wlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/inspect-js"
      }
    },
    "node_modules/data-view-byte-offset": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/data-view-byte-offset/-/data-view-byte-offset-1.0.1.tgz",
      "integrity": "sha512-BS8PfmtDGnrgYdOonGZQdLZslWIeCGFP9tpan0hi1Co2Zr2NKADsvGYA8XxuG/4UWgJ6Cjtv+YJnB6MM69QGlQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-data-view": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/debug": {
      "version": "4.4.3",
      "resolved": "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
      "integrity": "sha512-RGwwWnwQvkVfavKVt22FGLw+xYSdzARwm0ru6DhTVA3umU5hZc28V3kO4stgYryrTlLpuvgI9GiijltAjNbcqA==",
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.3"
      },
      "engines": {
        "node": ">=6.0"
      },
      "peerDependenciesMeta": {
        "supports-color": {
          "optional": true
        }
      }
    },
    "node_modules/deep-is": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/deep-is/-/deep-is-0.1.4.tgz",
      "integrity": "sha512-oIPzksmTg4/MriiaYGO+okXDT7ztn/w3Eptv/+gSIdMdKsJo0u4CfYNFJPy+4SKMuCqGw2wxnA+URMg3t8a/bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/deepmerge": {
      "version": "4.3.1",
      "resolved": "https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz",
      "integrity": "sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/defaults": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/defaults/-/defaults-1.0.4.tgz",
      "integrity": "sha512-eFuaLoy/Rxalv2kr+lqMlUnrDWV+3j4pljOIJgLIhI058IQfWJ7vXhyEIHu+HtC738klGALYxOKDO0bQP3tg8A==",
      "license": "MIT",
      "dependencies": {
        "clone": "^1.0.2"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/define-data-property": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/define-data-property/-/define-data-property-1.1.4.tgz",
      "integrity": "sha512-rBMvIzlpA8v6E+SJZoo++HAYqsLrkg7MSfIinMPFhmkorw7X+dOXVJQs+QT69zGkzMyfDnIMN2Wid1+NbL3T+A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0",
        "es-errors": "^1.3.0",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/define-lazy-prop": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/define-lazy-prop/-/define-lazy-prop-2.0.0.tgz",
      "integrity": "sha512-Ds09qNh8yw3khSjiJjiUInaGX9xlqZDY7JVryGxdxV7NPeuqQfplOpQ66yJFZut3jLa5zOwkXw1g9EI2uKh4Og==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/define-properties": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/define-properties/-/define-properties-1.2.1.tgz",
      "integrity": "sha512-8QmQKqEASLd5nx0U1B1okLElbUuuttJ/AnYmRXbbbGDWh6uS208EjD4Xqq/I9wK7u0v6O08XhTWnt5XtEbR6Dg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.0.1",
        "has-property-descriptors": "^1.0.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/depd": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/depd/-/depd-2.0.0.tgz",
      "integrity": "sha512-g7nH6P6dyDioJogAAGprGpCtVImJhpPk/roCzdb3fIh61/s/nPsfR6onyMwkCAR/OlC3yBC0lESvUoQEAssIrw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/destroy": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/destroy/-/destroy-1.2.0.tgz",
      "integrity": "sha512-2sJGJTaXIIaR1w4iJSNoN0hnMY7Gpc/n8D4qSCJw8QqFWXf7cuAgnEHxBpweaVcPevC2l3KpjYCx3NypQQgaJg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8",
        "npm": "1.2.8000 || >= 1.4.16"
      }
    },
    "node_modules/detect-libc": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/detect-libc/-/detect-libc-2.1.2.tgz",
      "integrity": "sha512-Btj2BOOO83o3WyH59e8MgXsxEQVcarkUOpEYrubB0urwnN10yQ364rsiByU11nZlqWYZm05i/of7io4mzihBtQ==",
      "license": "Apache-2.0",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/dnssd-advertise": {
      "version": "1.1.6",
      "resolved": "https://registry.npmjs.org/dnssd-advertise/-/dnssd-advertise-1.1.6.tgz",
      "integrity": "sha512-Ndrrf6BMPalkQPd/zubL+4YghH2J9NspapQ09uDXwYbvOPkP0oaqf5CkcwJ0b50kS2O3ul6yVu+jz+RY62Cejg==",
      "license": "MIT"
    },
    "node_modules/doctrine": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/doctrine/-/doctrine-2.1.0.tgz",
      "integrity": "sha512-35mSku4ZXK0vfCuHEDAwt55dg2jNajHZ1odvF+8SSr82EsZY4QmXfuWso8oEd8zRhVObSN18aM0CjSdoBX7zIw==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "esutils": "^2.0.2"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/dotenv": {
      "version": "18.0.9",
      "resolved": "https://registry.npmjs.org/dotenv/-/dotenv-18.0.9.tgz",
      "integrity": "sha512-3fVOW4cB02R066PUSwn8O4TJyz9NckQl7F81blIbaq9jKBm2tSmOKky7ZHIXzGvkVPXCSn6jkpziBPZdGFs8Tw==",
      "license": "BSD-2-Clause",
      "bin": {
        "dotenv": "dist/index.cjs"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://dotenvx.com"
      }
    },
    "node_modules/dunder-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/dunder-proto/-/dunder-proto-1.0.1.tgz",
      "integrity": "sha512-KIN/nDJBQRcXw0MLVhZE9iQHmG68qAVIBg9CqmUYjmQIhgij9U5MFvrqkUL5FbtyyzZuOeOt0zdeRe4UY7ct+A==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.1",
        "es-errors": "^1.3.0",
        "gopd": "^1.2.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/ecdsa-sig-formatter": {
      "version": "1.0.11",
      "resolved": "https://registry.npmjs.org/ecdsa-sig-formatter/-/ecdsa-sig-formatter-1.0.11.tgz",
      "integrity": "sha512-nagl3RYrbNv6kQkeJIpt6NJZy8twLB/2vtz6yN9Z4vRKHN4/QZJIEbqohALSgwKdnksuY3k5Addp5lg8sVoVcQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/ee-first": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/ee-first/-/ee-first-1.1.1.tgz",
      "integrity": "sha512-WMwm9LhRUo+WUaRN+vRuETqG89IgZphVSNkdFgeb6sS/E4OrDIN7t48CAewSHXc6C8lefD8KKfr5vY61brQlow==",
      "license": "MIT"
    },
    "node_modules/electron-to-chromium": {
      "version": "1.5.464",
      "resolved": "https://registry.npmjs.org/electron-to-chromium/-/electron-to-chromium-1.5.464.tgz",
      "integrity": "sha512-nRa65aFge40viPAKxMKULIY8tcXKwKboJWNn4RoKwyWXJ6SP7BnrDGKUTzc64818jIciH0PK7LSF8QzZes19GA==",
      "license": "ISC"
    },
    "node_modules/emoji-regex": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/emoji-regex/-/emoji-regex-8.0.0.tgz",
      "integrity": "sha512-MSjYzcWNOA0ewAHpz0MxpYFvwg6yjy1NG3xteoqz644VCo/RPgnr1/GGt+ic3iJTzQ8Eu3TdM14SawnVUmGE6A==",
      "license": "MIT"
    },
    "node_modules/encodeurl": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-1.0.2.tgz",
      "integrity": "sha512-TPJXq8JqFaVYm2CWmPvnP2Iyo4ZSM7/QKcSmuMLDObfpH5fi7RUGmd/rTDf+rut/saiDiQEeVTNgAmJEdAOx0w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/error-stack-parser": {
      "version": "2.1.4",
      "resolved": "https://registry.npmjs.org/error-stack-parser/-/error-stack-parser-2.1.4.tgz",
      "integrity": "sha512-Sk5V6wVazPhq5MhpO+AUxJn5x7XSXGl1R93Vn7i+zS15KDVxQijejNCrz8340/2bgLBjR9GtEG8ZVKONDjcqGQ==",
      "license": "MIT",
      "dependencies": {
        "stackframe": "^1.3.4"
      }
    },
    "node_modules/es-abstract": {
      "version": "1.24.2",
      "resolved": "https://registry.npmjs.org/es-abstract/-/es-abstract-1.24.2.tgz",
      "integrity": "sha512-2FpH9Q5i2RRwyEP1AylXe6nYLR5OhaJTZwmlcP0dL/+JCbgg7yyEo/sEK6HeGZRf3dFpWwThaRHVApXSkW3xeg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-buffer-byte-length": "^1.0.2",
        "arraybuffer.prototype.slice": "^1.0.4",
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "data-view-buffer": "^1.0.2",
        "data-view-byte-length": "^1.0.2",
        "data-view-byte-offset": "^1.0.1",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "es-set-tostringtag": "^2.1.0",
        "es-to-primitive": "^1.3.0",
        "function.prototype.name": "^1.1.8",
        "get-intrinsic": "^1.3.0",
        "get-proto": "^1.0.1",
        "get-symbol-description": "^1.1.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "internal-slot": "^1.1.0",
        "is-array-buffer": "^3.0.5",
        "is-callable": "^1.2.7",
        "is-data-view": "^1.0.2",
        "is-negative-zero": "^2.0.3",
        "is-regex": "^1.2.1",
        "is-set": "^2.0.3",
        "is-shared-array-buffer": "^1.0.4",
        "is-string": "^1.1.1",
        "is-typed-array": "^1.1.15",
        "is-weakref": "^1.1.1",
        "math-intrinsics": "^1.1.0",
        "object-inspect": "^1.13.4",
        "object-keys": "^1.1.1",
        "object.assign": "^4.1.7",
        "own-keys": "^1.0.1",
        "regexp.prototype.flags": "^1.5.4",
        "safe-array-concat": "^1.1.3",
        "safe-push-apply": "^1.0.0",
        "safe-regex-test": "^1.1.0",
        "set-proto": "^1.0.0",
        "stop-iteration-iterator": "^1.1.0",
        "string.prototype.trim": "^1.2.10",
        "string.prototype.trimend": "^1.0.9",
        "string.prototype.trimstart": "^1.0.8",
        "typed-array-buffer": "^1.0.3",
        "typed-array-byte-length": "^1.0.3",
        "typed-array-byte-offset": "^1.0.4",
        "typed-array-length": "^1.0.7",
        "unbox-primitive": "^1.1.0",
        "which-typed-array": "^1.1.19"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/es-abstract-get": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/es-abstract-get/-/es-abstract-get-1.0.0.tgz",
      "integrity": "sha512-6PMWXpdhshVvFp+FoWYs1EvG1Nj0tvk0dZM+XcK0xMEM1czRVcP6ohqPWHy6qPagSpC8j4+p89WXlT+xXJs/fg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.2",
        "is-callable": "^1.2.7",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/es-define-property": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/es-define-property/-/es-define-property-1.0.1.tgz",
      "integrity": "sha512-e3nRfgfUZ4rNGL232gUgX06QNyyez04KdjFrF+LTRoOXmrOgFKDg4BCdsjW8EnT69eqdYGmRpJwiPVYNrCaW3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-errors": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/es-errors/-/es-errors-1.3.0.tgz",
      "integrity": "sha512-Zf5H2Kxt2xjTvbJvP2ZWLEICxA6j+hAmMzIlypy4xcBg1vKVnx89Wy0GbS+kf5cwCVFFzdCFh2XSCFNULS6csw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-iterator-helpers": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/es-iterator-helpers/-/es-iterator-helpers-1.4.0.tgz",
      "integrity": "sha512-c/A0P0oxkACDc+cKWw8evLXK83oBKgn0qPOqCYT4x9uolpCIJAcYvJC9QYKNDRPsTeGyCrQ326jrvgZWdCdK5Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-errors": "^1.3.0",
        "es-set-tostringtag": "^2.1.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.3.0",
        "globalthis": "^1.0.4",
        "gopd": "^1.2.0",
        "has-property-descriptors": "^1.0.2",
        "has-proto": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "iterator.prototype": "^1.1.5",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-object-atoms": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/es-object-atoms/-/es-object-atoms-1.1.2.tgz",
      "integrity": "sha512-HWcBoN6NileqtSydK2FqHbS/LoDd2pqrnQHLyJzBj4kOp/ky2MWMN694xOfkK8/SnUsW2DH7EfyVlydKCsm1Zw==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-set-tostringtag": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/es-set-tostringtag/-/es-set-tostringtag-2.1.0.tgz",
      "integrity": "sha512-j6vWzfrGVfyXxge+O0x5sh6cvxAog0a/4Rdd2K36zCMV5eJ+/+tOAngRO8cODMNWbVRdVlmGZQL2YS3yR8bIUA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-shim-unscopables": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/es-shim-unscopables/-/es-shim-unscopables-1.1.0.tgz",
      "integrity": "sha512-d9T8ucsEhh8Bi1woXCf+TIKDIROLG5WCkxg8geBCbvk22kzwC5G2OnXVMO6FUsvQlgUUXQ2itephWDLqDzbeCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/es-to-primitive": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/es-to-primitive/-/es-to-primitive-1.3.4.tgz",
      "integrity": "sha512-yPDz7wqpg1/mmHLmS3tcfTfbw5f1eryXvyghYBffGdERwe+mV7ZcWzTR8LR17Kvqt3qfPurjlonmnq3MKXIOXw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-abstract-get": "^1.0.0",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "is-callable": "^1.2.7",
        "is-date-object": "^1.1.0",
        "is-symbol": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/escalade": {
      "version": "3.2.0",
      "resolved": "https://registry.npmjs.org/escalade/-/escalade-3.2.0.tgz",
      "integrity": "sha512-WUj2qlxaQtO4g6Pq5c29GTcWGDyd8itL8zTlipgECz3JesAiiOKotd8JU6otB3PACgG6xkJUyVhboMS+bje/jA==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/escape-html": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/escape-html/-/escape-html-1.0.3.tgz",
      "integrity": "sha512-NiSupZ4OeuGwr68lGIeym/ksIZMJodUGOSCZ/FSnTxcrekbvqrgdUxlJOMpijaKZVjAJrWrGs/6Jy8OMuyj9ow==",
      "license": "MIT"
    },
    "node_modules/escape-string-regexp": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-1.0.5.tgz",
      "integrity": "sha512-vbRorB5FUQWvla16U8R/qgaFIya2qGzwDrNmCZuYKrbdSUMG6I1ZCGQRefkRVhuOkIGVne7BQ35DSfo1qvJqFg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.8.0"
      }
    },
    "node_modules/eslint": {
      "version": "9.39.5",
      "resolved": "https://registry.npmjs.org/eslint/-/eslint-9.39.5.tgz",
      "integrity": "sha512-DgZS62aPLXKlnxILS/AYCoRvHaZeXceIzlXPkkGGzJWSow1aEk0lbTlxUSlyjC8jcaKxAdOnTDz+o1JFSBsyjw==",
      "deprecated": "This version is no longer supported. Please see https://eslint.org/version-support for other options.",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@eslint-community/eslint-utils": "^4.8.0",
        "@eslint-community/regexpp": "^4.12.1",
        "@eslint/config-array": "^0.21.2",
        "@eslint/config-helpers": "^0.4.2",
        "@eslint/core": "^0.17.0",
        "@eslint/eslintrc": "^3.3.6",
        "@eslint/js": "9.39.5",
        "@eslint/plugin-kit": "^0.4.1",
        "@humanfs/node": "^0.16.6",
        "@humanwhocodes/module-importer": "^1.0.1",
        "@humanwhocodes/retry": "^0.4.2",
        "@types/estree": "^1.0.6",
        "ajv": "^6.14.0",
        "chalk": "^4.0.0",
        "cross-spawn": "^7.0.6",
        "debug": "^4.3.2",
        "escape-string-regexp": "^4.0.0",
        "eslint-scope": "^8.4.0",
        "eslint-visitor-keys": "^4.2.1",
        "espree": "^10.4.0",
        "esquery": "^1.5.0",
        "esutils": "^2.0.2",
        "fast-deep-equal": "^3.1.3",
        "file-entry-cache": "^8.0.0",
        "find-up": "^5.0.0",
        "glob-parent": "^6.0.2",
        "ignore": "^5.2.0",
        "imurmurhash": "^0.1.4",
        "is-glob": "^4.0.0",
        "json-stable-stringify-without-jsonify": "^1.0.1",
        "lodash.merge": "^4.6.2",
        "minimatch": "^3.1.5",
        "natural-compare": "^1.4.0",
        "optionator": "^0.9.3"
      },
      "bin": {
        "eslint": "bin/eslint.js"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://eslint.org/donate"
      },
      "peerDependencies": {
        "jiti": "*"
      },
      "peerDependenciesMeta": {
        "jiti": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-config-expo": {
      "version": "58.0.4",
      "resolved": "https://registry.npmjs.org/eslint-config-expo/-/eslint-config-expo-58.0.4.tgz",
      "integrity": "sha512-IcgZtJVN7bJdMMPeEw8PtrbFie96+vqSZPzw/dhhRF+cKc1LaPksIhO3aA6boiMIFZuCrQyOl6lPaqI1579wqw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/eslint-plugin": "^8.59.0",
        "@typescript-eslint/parser": "^8.59.0",
        "eslint-import-resolver-typescript": "^3.6.3",
        "eslint-plugin-expo": "^1.2.1",
        "eslint-plugin-import": "^2.30.0",
        "eslint-plugin-react": "^7.37.3",
        "eslint-plugin-react-hooks": "^7.0.0",
        "globals": "^16.0.0"
      },
      "peerDependencies": {
        "eslint": ">=8.10"
      }
    },
    "node_modules/eslint-import-resolver-node": {
      "version": "0.3.10",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-node/-/eslint-import-resolver-node-0.3.10.tgz",
      "integrity": "sha512-tRrKqFyCaKict5hOd244sL6EQFNycnMQnBe+j8uqGNXYzsImGbGUU4ibtoaBmv5FLwJwcFJNeg1GeVjQfbMrDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7",
        "is-core-module": "^2.16.1",
        "resolve": "^2.0.0-next.6"
      }
    },
    "node_modules/eslint-import-resolver-node/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-import-resolver-node/node_modules/resolve": {
      "version": "2.0.0-next.7",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-2.0.0-next.7.tgz",
      "integrity": "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.16.2",
        "node-exports-info": "^1.6.0",
        "object-keys": "^1.1.1",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/eslint-import-resolver-typescript": {
      "version": "3.10.1",
      "resolved": "https://registry.npmjs.org/eslint-import-resolver-typescript/-/eslint-import-resolver-typescript-3.10.1.tgz",
      "integrity": "sha512-A1rHYb06zjMGAxdLSkN2fXPBwuSaQ0iO5M/hdyS0Ajj1VBaRp0sPD3dn1FhME3c/JluGFbwSxyCfqdSbtQLAHQ==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "@nolyfill/is-core-module": "1.0.39",
        "debug": "^4.4.0",
        "get-tsconfig": "^4.10.0",
        "is-bun-module": "^2.0.0",
        "stable-hash": "^0.0.5",
        "tinyglobby": "^0.2.13",
        "unrs-resolver": "^1.6.2"
      },
      "engines": {
        "node": "^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint-import-resolver-typescript"
      },
      "peerDependencies": {
        "eslint": "*",
        "eslint-plugin-import": "*",
        "eslint-plugin-import-x": "*"
      },
      "peerDependenciesMeta": {
        "eslint-plugin-import": {
          "optional": true
        },
        "eslint-plugin-import-x": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils": {
      "version": "2.14.0",
      "resolved": "https://registry.npmjs.org/eslint-module-utils/-/eslint-module-utils-2.14.0.tgz",
      "integrity": "sha512-W2WCRZ9Dqntd+2u8jJcVMV2PKulc6RdLgUUoh/yQr3uB6lo/ZOeGx11sv60/8S4QFFKNslAlWhr9u0Ef7ZW6Ig==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "debug": "^3.2.7"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependenciesMeta": {
        "eslint": {
          "optional": true
        }
      }
    },
    "node_modules/eslint-module-utils/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-expo": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/eslint-plugin-expo/-/eslint-plugin-expo-1.2.1.tgz",
      "integrity": "sha512-6eIogfGM7tIq169MbqJTA0iaI9h/VGujSUAy85hA3OHvYecEYM8XE9fMLd7ywnQClnVkT3JgbW8NWyhEP8g5yw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@typescript-eslint/types": "^8.59.0",
        "@typescript-eslint/utils": "^8.59.0",
        "eslint": "^9.24.0"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0"
      },
      "peerDependencies": {
        "eslint": ">=8.10"
      }
    },
    "node_modules/eslint-plugin-import": {
      "version": "2.32.0",
      "resolved": "https://registry.npmjs.org/eslint-plugin-import/-/eslint-plugin-import-2.32.0.tgz",
      "integrity": "sha512-whOE1HFo/qJDyX4SnXzP4N6zOWn79WhnCUY/iDR0mPfQZO8wcYE4JClzI2oZrhBnnMUCBCHZhO6VQyoBU95mZA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@rtsao/scc": "^1.1.0",
        "array-includes": "^3.1.9",
        "array.prototype.findlastindex": "^1.2.6",
        "array.prototype.flat": "^1.3.3",
        "array.prototype.flatmap": "^1.3.3",
        "debug": "^3.2.7",
        "doctrine": "^2.1.0",
        "eslint-import-resolver-node": "^0.3.9",
        "eslint-module-utils": "^2.12.1",
        "hasown": "^2.0.2",
        "is-core-module": "^2.16.1",
        "is-glob": "^4.0.3",
        "minimatch": "^3.1.2",
        "object.fromentries": "^2.0.8",
        "object.groupby": "^1.0.3",
        "object.values": "^1.2.1",
        "semver": "^6.3.1",
        "string.prototype.trimend": "^1.0.9",
        "tsconfig-paths": "^3.15.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^2 || ^3 || ^4 || ^5 || ^6 || ^7.2.0 || ^8 || ^9"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/eslint-plugin-import/node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/debug": {
      "version": "3.2.7",
      "resolved": "https://registry.npmjs.org/debug/-/debug-3.2.7.tgz",
      "integrity": "sha512-CFjzYYAi4ThfiQvizrFQevTTXHtnCqWfe7x1AhgEscTz6ZbLbfoLRLPugTQyBth6f8ZERVUSyWHFD/7Wu4t1XQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "ms": "^2.1.1"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/eslint-plugin-import/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/eslint-plugin-react": {
      "version": "7.37.5",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react/-/eslint-plugin-react-7.37.5.tgz",
      "integrity": "sha512-Qteup0SqU15kdocexFNAJMvCJEfa2xUKNV4CC1xsVMrIIqEy3SQ/rqyxCWNzfrd3/ldy6HMlD2e0JDVpDg2qIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.8",
        "array.prototype.findlast": "^1.2.5",
        "array.prototype.flatmap": "^1.3.3",
        "array.prototype.tosorted": "^1.1.4",
        "doctrine": "^2.1.0",
        "es-iterator-helpers": "^1.2.1",
        "estraverse": "^5.3.0",
        "hasown": "^2.0.2",
        "jsx-ast-utils": "^2.4.1 || ^3.0.0",
        "minimatch": "^3.1.2",
        "object.entries": "^1.1.9",
        "object.fromentries": "^2.0.8",
        "object.values": "^1.2.1",
        "prop-types": "^15.8.1",
        "resolve": "^2.0.0-next.5",
        "semver": "^6.3.1",
        "string.prototype.matchall": "^4.0.12",
        "string.prototype.repeat": "^1.0.0"
      },
      "engines": {
        "node": ">=4"
      },
      "peerDependencies": {
        "eslint": "^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7"
      }
    },
    "node_modules/eslint-plugin-react-hooks": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/eslint-plugin-react-hooks/-/eslint-plugin-react-hooks-7.1.1.tgz",
      "integrity": "sha512-f2I7Gw6JbvCexzIInuSbZpfdQ44D7iqdWX01FKLvrPgqxoE7oMj8clOfto8U6vYiz4yd5oKu39rRSVOe1zRu0g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.24.4",
        "@babel/parser": "^7.24.4",
        "hermes-parser": "^0.25.1",
        "zod": "^3.25.0 || ^4.0.0",
        "zod-validation-error": "^3.5.0 || ^4.0.0"
      },
      "engines": {
        "node": ">=18"
      },
      "peerDependencies": {
        "eslint": "^3.0.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0-0 || ^9.0.0 || ^10.0.0"
      }
    },
    "node_modules/eslint-plugin-react-hooks/node_modules/hermes-estree": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-estree/-/hermes-estree-0.25.1.tgz",
      "integrity": "sha512-0wUoCcLp+5Ev5pDW2OriHC2MJCbwLwuRx+gAqMTOkGKJJiBCLjtrvy4PWUGn6MIVefecRpzoOZ/UV6iGdOr+Cw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/eslint-plugin-react-hooks/node_modules/hermes-parser": {
      "version": "0.25.1",
      "resolved": "https://registry.npmjs.org/hermes-parser/-/hermes-parser-0.25.1.tgz",
      "integrity": "sha512-6pEjquH3rqaI6cYAXYPcz9MS4rY6R4ngRgrgfDshRptUZIc3lw0MCIJIGDj9++mfySOuPTHB4nrSW99BCvOPIA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "hermes-estree": "0.25.1"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/eslint-plugin-react/node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/resolve": {
      "version": "2.0.0-next.7",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-2.0.0-next.7.tgz",
      "integrity": "sha512-tqt+NBWwyaMgw3zDsnygx4CByWjQEJHOPMdslYhppaQSJUtL/D4JO9CcBBlhPoI8lz9oJIDXkwXfhF4aWqP8xQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.16.2",
        "node-exports-info": "^1.6.0",
        "object-keys": "^1.1.1",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/eslint-plugin-react/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/eslint-scope": {
      "version": "8.4.0",
      "resolved": "https://registry.npmjs.org/eslint-scope/-/eslint-scope-8.4.0.tgz",
      "integrity": "sha512-sNXOfKCn74rt8RICKMvJS7XKV/Xk9kA7DyJr8mJik3S7Cwgy3qlkkmyS2uQB3jiJg6VNdZd/pDBJu0nvG2NlTg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "esrecurse": "^4.3.0",
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint-visitor-keys": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-5.0.1.tgz",
      "integrity": "sha512-tD40eHxA35h0PEIZNeIjkHoDR4YjjJp34biM0mDvplBe//mB+IHCqHDGV7pxF+7MklTvighcCPPZC7ynWyjdTA==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^20.19.0 || ^22.13.0 || >=24"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint/node_modules/balanced-match": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/balanced-match/-/balanced-match-1.0.2.tgz",
      "integrity": "sha512-3oSeUO0TMV67hN1AmbXsK4yaqU7tjiHlbxRDZOpH0KW9+CeX4bRAaX0Anxt0tx2MrpRpWwQaPwIlISEJhYU5Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/eslint/node_modules/brace-expansion": {
      "version": "1.1.21",
      "resolved": "https://registry.npmjs.org/brace-expansion/-/brace-expansion-1.1.21.tgz",
      "integrity": "sha512-9zeA+KLZNNzglF2TPKRQEDyx6Yby7daAkuy8MiPzpXPsYDWi/DRM8jmwUDxokQjYqBpv5DgPiwD4h4ZZSy1Ujw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "balanced-match": "^1.0.0",
        "concat-map": "0.0.1"
      }
    },
    "node_modules/eslint/node_modules/escape-string-regexp": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/escape-string-regexp/-/escape-string-regexp-4.0.0.tgz",
      "integrity": "sha512-TtpcNJ3XAzx3Gq8sWRzJaVajRs0uVxA2YAkdb1jm2YkPz4G6egUFAyA3n5vtEIZefPk5Wa4UXbKuS5fKkJWdgA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/eslint/node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/eslint/node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "brace-expansion": "^1.1.7"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/espree": {
      "version": "10.4.0",
      "resolved": "https://registry.npmjs.org/espree/-/espree-10.4.0.tgz",
      "integrity": "sha512-j6PAQ2uUr79PZhBjP5C5fhl8e39FmRnOjsD5lGnWrFU8i2G776tBK7+nP8KuQUTTyAZUwfQqXAgrVH5MbH9CYQ==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "acorn": "^8.15.0",
        "acorn-jsx": "^5.3.2",
        "eslint-visitor-keys": "^4.2.1"
      },
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/espree/node_modules/eslint-visitor-keys": {
      "version": "4.2.1",
      "resolved": "https://registry.npmjs.org/eslint-visitor-keys/-/eslint-visitor-keys-4.2.1.tgz",
      "integrity": "sha512-Uhdk5sfqcee/9H/rCOJikYz67o0a2Tw2hGRPOG2Y1R2dg7brRe1uG0yaNQDHu+TO/uQPF/5eCapvYSmHUjt7JQ==",
      "dev": true,
      "license": "Apache-2.0",
      "engines": {
        "node": "^18.18.0 || ^20.9.0 || >=21.1.0"
      },
      "funding": {
        "url": "https://opencollective.com/eslint"
      }
    },
    "node_modules/esquery": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/esquery/-/esquery-1.7.0.tgz",
      "integrity": "sha512-Ap6G0WQwcU/LHsvLwON1fAQX9Zp0A2Y6Y/cJBl9r/JbW90Zyg4/zbG6zzKa2OTALELarYHmKu0GhpM5EO+7T0g==",
      "dev": true,
      "license": "BSD-3-Clause",
      "dependencies": {
        "estraverse": "^5.1.0"
      },
      "engines": {
        "node": ">=0.10"
      }
    },
    "node_modules/esrecurse": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/esrecurse/-/esrecurse-4.3.0.tgz",
      "integrity": "sha512-KmfKL3b6G+RXvP8N1vr3Tq1kL/oCFgn2NYXEtqP8/L3pKapUA4G8cFVaoF3SU323CD4XypR/ffioHmkti6/Tag==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "estraverse": "^5.2.0"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/estraverse": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/estraverse/-/estraverse-5.3.0.tgz",
      "integrity": "sha512-MMdARuVEQziNTeJD8DgMqmhwR11BRQ/cBP+pLtYdSTnf3MIO8fFeiINEbX36ZdNlfU/7A9f3gUw49B3oQsvwBA==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/esutils": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/esutils/-/esutils-2.0.3.tgz",
      "integrity": "sha512-kVscqXk4OCp68SZ0dkgEKVi6/8ij300KBWTJq32P/dYeWTSwK41WyTxalN1eRmA5Z9UU/LX9D7FWSmV9SAYx6g==",
      "dev": true,
      "license": "BSD-2-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/etag": {
      "version": "1.8.1",
      "resolved": "https://registry.npmjs.org/etag/-/etag-1.8.1.tgz",
      "integrity": "sha512-aIL5Fx7mawVa300al2BnEE4iNvo1qETxLrPI/o05L7z6go7fCw1J6EQmbK4FmJ2AS7kgVF/KEZWufBfdClMcPg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expo": {
      "version": "58.0.19",
      "resolved": "https://registry.npmjs.org/expo/-/expo-58.0.19.tgz",
      "integrity": "sha512-+MHH9Bu7OFWsAl8Ox44KgqbVIe72xbxzAi3vLPtVf14o5zHE39iCD//uw/4nyBlqZii6cFUZsvtJDbeRo5OhMA==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.20.0",
        "@expo/cli": "^58.1.15",
        "@expo/config": "~58.0.8",
        "@expo/config-plugins": "~58.0.10",
        "@expo/devtools": "~58.0.2",
        "@expo/dom-webview": "~58.0.2",
        "@expo/fingerprint": "^0.21.6",
        "@expo/local-build-cache-provider": "^58.0.8",
        "@expo/log-box": "^58.0.13",
        "@expo/log-box-utils": "^58.0.2",
        "@expo/metro": "~58.0.0",
        "@expo/metro-config": "~58.0.17",
        "@ungap/structured-clone": "^1.3.0",
        "babel-preset-expo": "~58.0.20",
        "expo-asset": "~58.0.18",
        "expo-constants": "~58.0.13",
        "expo-file-system": "~58.0.11",
        "expo-font": "~58.0.10",
        "expo-keep-awake": "~58.0.3",
        "expo-modules-autolinking": "~58.0.15",
        "expo-modules-cli": "~0.3.2",
        "expo-modules-core": "~58.0.26",
        "pretty-format": "^29.7.0",
        "react-refresh": "^0.14.2",
        "whatwg-url-minimum": "^0.2.0"
      },
      "bin": {
        "expo": "bin/cli",
        "expo-modules": "bin/modules",
        "expo-modules-autolinking": "bin/autolinking",
        "fingerprint": "bin/fingerprint"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0"
      },
      "peerDependencies": {
        "@expo/dom-webview": "*",
        "@expo/metro-runtime": "*",
        "react": "*",
        "react-dom": "*",
        "react-native": "*",
        "react-native-web": "*",
        "react-native-webview": "*"
      },
      "peerDependenciesMeta": {
        "@expo/dom-webview": {
          "optional": true
        },
        "@expo/metro-runtime": {
          "optional": true
        },
        "react-dom": {
          "optional": true
        },
        "react-native-web": {
          "optional": true
        },
        "react-native-webview": {
          "optional": true
        }
      }
    },
    "node_modules/expo-font": {
      "version": "58.0.11",
      "resolved": "https://registry.npmjs.org/expo-font/-/expo-font-58.0.11.tgz",
      "integrity": "sha512-6r7s6xk2L2orvum+x+TY1fzEcMtuCBRQTLgC/Su2uLzNPpT4L+E+S4IAGy8ZIjeVvwk2j2pj+HiZ23O7eh1PGQ==",
      "license": "MIT",
      "peerDependencies": {
        "expo": "*",
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/expo-modules-autolinking": {
      "version": "58.0.15",
      "resolved": "https://registry.npmjs.org/expo-modules-autolinking/-/expo-modules-autolinking-58.0.15.tgz",
      "integrity": "sha512-eTeWBS2RWdp2V/LlhjI5JI/5ACMfrdOax9iBpOshDOAZHsncbAKN2fkpmvyAtvVbj1DUJ04ejINUTyDDLgo2yg==",
      "license": "MIT",
      "dependencies": {
        "@expo/platforms": "^58.0.1",
        "@expo/require-utils": "^58.0.4",
        "@expo/spawn-async": "^1.8.0",
        "chalk": "^4.1.0",
        "commander": "^7.2.0"
      },
      "bin": {
        "expo-modules-autolinking": "bin/expo-modules-autolinking.js"
      }
    },
    "node_modules/expo-modules-cli": {
      "version": "0.3.2",
      "resolved": "https://registry.npmjs.org/expo-modules-cli/-/expo-modules-cli-0.3.2.tgz",
      "integrity": "sha512-iSIZeNaqi5ku0H3pk2fAyIlM25TWveRr9Xcc+bIZSokhZ0ERLtT5Xc1qVZwszSo0GbXXEoA8zwiGnvaw1DydCQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/parser": "^7.20.0",
        "arg": "^5.0.2"
      },
      "bin": {
        "expo-modules": "bin/expo-modules.js"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0"
      }
    },
    "node_modules/expo-modules-core": {
      "version": "58.0.26",
      "resolved": "https://registry.npmjs.org/expo-modules-core/-/expo-modules-core-58.0.26.tgz",
      "integrity": "sha512-HOuHt0nCBVv3E8+yMGeR6N6xa4WH+81CLqU/pWjDykt2NUBYGfXVMaWPsjwuBfeYOB/DcJTJR40yq+y9Ku/YcQ==",
      "license": "MIT",
      "dependencies": {
        "expo-modules-jsi": "~58.0.19",
        "expo-modules-macros": "0.22.0",
        "invariant": "^2.2.4"
      },
      "peerDependencies": {
        "react": "*",
        "react-native": "*",
        "react-native-worklets": ">=0.13.0"
      },
      "peerDependenciesMeta": {
        "react-native-worklets": {
          "optional": true
        }
      }
    },
    "node_modules/expo-modules-jsi": {
      "version": "58.0.19",
      "resolved": "https://registry.npmjs.org/expo-modules-jsi/-/expo-modules-jsi-58.0.19.tgz",
      "integrity": "sha512-dmYjRQnkSUdul6jZN3+yq6ZPKwiatUzLJW/pcXYx16q7QJW3i3+4RZ+MnxNeLNgg1rLrCR9F+dIgeh01+FxaFQ==",
      "license": "MIT",
      "peerDependencies": {
        "react-native": "*"
      }
    },
    "node_modules/expo-modules-macros": {
      "version": "0.22.0",
      "resolved": "https://registry.npmjs.org/expo-modules-macros/-/expo-modules-macros-0.22.0.tgz",
      "integrity": "sha512-IHY+FkILfG19qsyf9G/z7dcWVgsyqdkWsvvob3n5nWKa2meCCAGeEjp42N68fG8Ta6dn/bsceuma7uh2i6ho9g==",
      "license": "MIT",
      "optionalDependencies": {
        "@expo/modules-macros-linux-arm64": "0.22.0",
        "@expo/modules-macros-linux-x64": "0.22.0",
        "@expo/modules-macros-win32-arm64": "0.22.0",
        "@expo/modules-macros-win32-x64": "0.22.0"
      }
    },
    "node_modules/expo-server": {
      "version": "58.0.6",
      "resolved": "https://registry.npmjs.org/expo-server/-/expo-server-58.0.6.tgz",
      "integrity": "sha512-6DBlSZwxk3J0y1j2s4XebAWNiwGaMp32NcWX7b2kJC2+EFf1g+pCcVmx8ylawt2tyLmbDHswm4MHOfrd4bqfvA==",
      "license": "MIT",
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0"
      }
    },
    "node_modules/expo-status-bar": {
      "version": "58.0.4",
      "resolved": "https://registry.npmjs.org/expo-status-bar/-/expo-status-bar-58.0.4.tgz",
      "integrity": "sha512-e6JJHziSSNb1v1VSzmDrAPf6GFoPRdVOIDrTCcK3bHfbJEAZGZ3YZXfqlorZtUFDT0z6NcjaZf0mPWifJZcqew==",
      "license": "MIT",
      "peerDependencies": {
        "expo": "*",
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/expo/node_modules/@expo/cli": {
      "version": "58.1.15",
      "resolved": "https://registry.npmjs.org/@expo/cli/-/cli-58.1.15.tgz",
      "integrity": "sha512-+gBvfvmttvNqs8ceJe1SdiWBa6reocb/ZC8jMxsF8qFlCijAUQNqFMGCPkT/6zasFkQLUL8ZOFhf/9DKj2XaLg==",
      "license": "MIT",
      "dependencies": {
        "@expo/code-signing-certificates": "^0.0.7",
        "@expo/config": "~58.0.8",
        "@expo/config-plugins": "~58.0.10",
        "@expo/devcert": "^1.2.2",
        "@expo/env": "~2.5.3",
        "@expo/image-utils": "^0.12.5",
        "@expo/inline-modules": "^0.2.7",
        "@expo/json-file": "^11.2.1",
        "@expo/log-box": "^58.0.13",
        "@expo/log-box-utils": "^58.0.2",
        "@expo/metro": "~58.0.0",
        "@expo/metro-config": "58.0.17",
        "@expo/metro-file-map": "^58.0.5",
        "@expo/osascript": "^2.8.1",
        "@expo/package-manager": "^1.14.2",
        "@expo/platforms": "^58.0.1",
        "@expo/plist": "^0.10.1",
        "@expo/prebuild-config": "^58.0.16",
        "@expo/require-utils": "^58.0.4",
        "@expo/router-server": "^58.0.17",
        "@expo/schema-utils": "^58.0.2",
        "@expo/spawn-async": "^1.8.0",
        "@expo/ws-tunnel": "^2.0.1",
        "@expo/xcpretty": "^4.4.6",
        "@react-native/asset-utils": "0.88.0",
        "@react-native/dev-middleware": "0.88.0",
        "@react-native/js-polyfills": "0.88.0",
        "2g": "^1.0.1",
        "accepts": "^1.3.8",
        "agent-cli-detector": "0.1.7",
        "arg": "^5.0.2",
        "bplist-creator": "0.1.0",
        "bplist-parser": "^0.3.1",
        "chalk": "^4.0.0",
        "ci-info": "^3.3.0",
        "compression": "^1.7.4",
        "connect": "^3.7.0",
        "dnssd-advertise": "^1.1.6",
        "expo-server": "^58.0.6",
        "fetch-nodeshim": "^0.4.10",
        "getenv": "^2.0.0",
        "glob": "^13.0.0",
        "lan-network": "^0.2.1",
        "multitars": "^1.0.2",
        "node-forge": "^1.4.0",
        "npm-package-arg": "^11.0.0",
        "ora": "^3.4.0",
        "picomatch": "^4.0.4",
        "pretty-format": "^29.7.0",
        "progress": "^2.0.3",
        "prompts": "^2.3.2",
        "resolve-from": "^5.0.0",
        "sandbox-cli-detector": "^0.2.0",
        "semver": "^7.7.4",
        "send": "^0.19.0",
        "slugify": "^1.3.4",
        "stacktrace-parser": "^0.1.10",
        "structured-headers": "^0.4.1",
        "terminal-link": "^2.1.1",
        "toqr": "^0.1.1",
        "wrap-ansi": "^7.0.0",
        "ws": "^8.12.1",
        "zod": "^3.25.76"
      },
      "bin": {
        "expo-internal": "bin/cli.js"
      },
      "peerDependencies": {
        "expo": "*",
        "expo-router": "*",
        "react-native": "*"
      },
      "peerDependenciesMeta": {
        "expo-router": {
          "optional": true
        },
        "react-native": {
          "optional": true
        }
      }
    },
    "node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server": {
      "version": "58.0.17",
      "resolved": "https://registry.npmjs.org/@expo/router-server/-/router-server-58.0.17.tgz",
      "integrity": "sha512-9xZqpWIvb9/2ZH038WrWAtXQJsVep1ZG9FYh7cpoz6RGRo9SkmG97kMkQW7slKzL85Ppx8iW+68EHK9SQf/Zog==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.3.4"
      },
      "peerDependencies": {
        "@expo/metro-runtime": "^58.0.15",
        "expo": "*",
        "expo-constants": "^58.0.13",
        "expo-font": "^58.0.10",
        "expo-router": "*",
        "expo-server": "^58.0.6",
        "react": "*",
        "react-dom": "*",
        "react-server-dom-webpack": "~19.0.1 || ~19.1.2 || ~19.2.1 || ~19.3.0"
      },
      "peerDependenciesMeta": {
        "@expo/metro-runtime": {
          "optional": true
        },
        "expo-router": {
          "optional": true
        },
        "react-dom": {
          "optional": true
        },
        "react-server-dom-webpack": {
          "optional": true
        }
      }
    },
    "node_modules/expo/node_modules/@expo/devtools": {
      "version": "58.0.2",
      "resolved": "https://registry.npmjs.org/@expo/devtools/-/devtools-58.0.2.tgz",
      "integrity": "sha512-WBj/K+vv8JPSmY70ennL04YYOHkpEsGGkfuVY9lfv4XO7Qhbt5qz4q6W7maME194I5oGcimRMigUFfWNkBe90w==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^4.1.2"
      },
      "peerDependencies": {
        "expo": "*",
        "react": "*",
        "react-native": "*"
      },
      "peerDependenciesMeta": {
        "expo": {
          "optional": true
        },
        "react": {
          "optional": true
        },
        "react-native": {
          "optional": true
        }
      }
    },
    "node_modules/expo/node_modules/@expo/metro-config": {
      "version": "58.0.17",
      "resolved": "https://registry.npmjs.org/@expo/metro-config/-/metro-config-58.0.17.tgz",
      "integrity": "sha512-T2i8chQ5PsF6zgS10AixIteBlPu8oMAcqoD9MPk6CBQvcAdM4bE/x9VuDxuqKcAvFg+bRZMq1JfGAjJcRSmKkQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.20.0",
        "@babel/core": "^7.20.0",
        "@babel/generator": "^7.20.5",
        "@expo/config": "~58.0.8",
        "@expo/env": "~2.5.3",
        "@expo/json-file": "~11.2.1",
        "@expo/metro": "~58.0.0",
        "@expo/platforms": "^58.0.1",
        "@expo/require-utils": "^58.0.4",
        "@expo/spawn-async": "^1.8.0",
        "@jridgewell/gen-mapping": "^0.3.13",
        "@jridgewell/remapping": "^2.3.5",
        "@jridgewell/sourcemap-codec": "^1.5.5",
        "@jridgewell/trace-mapping": "^0.3.31",
        "@react-native/js-polyfills": "0.88.0",
        "2g": "^1.0.1",
        "browserslist": "^4.25.0",
        "chalk": "^4.1.0",
        "debug": "^4.3.2",
        "getenv": "^2.0.0",
        "glob": "^13.0.0",
        "hermes-parser": "^0.36.0",
        "jsc-safe-url": "^0.2.4",
        "lightningcss": "^1.30.1",
        "noxcturnal": "^0.1.8",
        "picomatch": "^4.0.4",
        "postcss": "^8.5.23",
        "resolve-from": "^5.0.0"
      },
      "peerDependencies": {
        "expo": "*"
      },
      "peerDependenciesMeta": {
        "expo": {
          "optional": true
        }
      }
    },
    "node_modules/expo/node_modules/@expo/ws-tunnel": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/@expo/ws-tunnel/-/ws-tunnel-2.0.1.tgz",
      "integrity": "sha512-mljsRffbOHzmSimYQbQu9h9NR3alwCCwEEouRGFL4QRTt8dNvsNtKEPa/5jHmtDLDtsh4xXsWKwzjN9BTpeXHQ==",
      "license": "MIT",
      "peerDependencies": {
        "ws": "^8.0.0"
      }
    },
    "node_modules/expo/node_modules/accepts": {
      "version": "1.3.8",
      "resolved": "https://registry.npmjs.org/accepts/-/accepts-1.3.8.tgz",
      "integrity": "sha512-PYAthTa2m2VKxuvSD3DPC/Gy+U+sOA1LAuT8mkmRuvw+NACSaeXEQ+NHcVF7rONl6qcaxV3Uuemwawk+7+SJLw==",
      "license": "MIT",
      "dependencies": {
        "mime-types": "~2.1.34",
        "negotiator": "0.6.3"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expo/node_modules/babel-preset-expo": {
      "version": "58.0.20",
      "resolved": "https://registry.npmjs.org/babel-preset-expo/-/babel-preset-expo-58.0.20.tgz",
      "integrity": "sha512-pdOe2B3pR41uYvfMIWUxwz8YMqXuszMEBKTCCLnf2nvypybMEZ30z38J0IcwUCQ2H+hrWAXpueQzWQsdooXWOA==",
      "license": "MIT",
      "dependencies": {
        "@babel/generator": "^7.20.5",
        "@babel/helper-module-imports": "^7.25.9",
        "@babel/plugin-proposal-decorators": "^7.12.9",
        "@babel/plugin-proposal-export-default-from": "^7.24.7",
        "@babel/plugin-syntax-dynamic-import": "^7.8.3",
        "@babel/plugin-syntax-export-default-from": "^7.24.7",
        "@babel/plugin-syntax-nullish-coalescing-operator": "^7.8.3",
        "@babel/plugin-syntax-optional-chaining": "^7.8.3",
        "@babel/plugin-transform-async-generator-functions": "^7.25.4",
        "@babel/plugin-transform-async-to-generator": "^7.24.7",
        "@babel/plugin-transform-block-scoping": "^7.25.0",
        "@babel/plugin-transform-class-properties": "^7.25.4",
        "@babel/plugin-transform-class-static-block": "^7.27.1",
        "@babel/plugin-transform-classes": "^7.25.4",
        "@babel/plugin-transform-destructuring": "^7.24.8",
        "@babel/plugin-transform-export-namespace-from": "^7.25.9",
        "@babel/plugin-transform-flow-strip-types": "^7.25.2",
        "@babel/plugin-transform-for-of": "^7.24.7",
        "@babel/plugin-transform-logical-assignment-operators": "^7.24.7",
        "@babel/plugin-transform-modules-commonjs": "^7.24.8",
        "@babel/plugin-transform-named-capturing-groups-regex": "^7.24.7",
        "@babel/plugin-transform-nullish-coalescing-operator": "^7.24.7",
        "@babel/plugin-transform-object-rest-spread": "^7.24.7",
        "@babel/plugin-transform-optional-catch-binding": "^7.24.7",
        "@babel/plugin-transform-optional-chaining": "^7.24.8",
        "@babel/plugin-transform-parameters": "^7.24.7",
        "@babel/plugin-transform-private-methods": "^7.24.7",
        "@babel/plugin-transform-private-property-in-object": "^7.24.7",
        "@babel/plugin-transform-react-display-name": "^7.24.7",
        "@babel/plugin-transform-react-jsx": "^7.28.6",
        "@babel/plugin-transform-react-jsx-development": "^7.27.1",
        "@babel/plugin-transform-react-pure-annotations": "^7.27.1",
        "@babel/plugin-transform-runtime": "^7.24.7",
        "@babel/plugin-transform-typescript": "^7.25.2",
        "@babel/plugin-transform-unicode-regex": "^7.24.7",
        "@babel/preset-typescript": "^7.23.0",
        "@react-native/babel-plugin-codegen": "0.88.0",
        "babel-plugin-react-compiler": "^1.0.0",
        "babel-plugin-react-native-web": "~0.21.4",
        "babel-plugin-syntax-hermes-parser": "^0.36.0",
        "babel-plugin-transform-flow-enums": "^0.0.2",
        "debug": "^4.3.4"
      },
      "peerDependencies": {
        "@babel/runtime": "^7.20.0",
        "expo": "*",
        "expo-widgets": "^58.0.23",
        "react-refresh": ">=0.14.0 <1.0.0"
      },
      "peerDependenciesMeta": {
        "@babel/runtime": {
          "optional": true
        },
        "expo": {
          "optional": true
        },
        "expo-widgets": {
          "optional": true
        }
      }
    },
    "node_modules/expo/node_modules/expo-asset": {
      "version": "58.0.18",
      "resolved": "https://registry.npmjs.org/expo-asset/-/expo-asset-58.0.18.tgz",
      "integrity": "sha512-Cc49mpDd81hIIKw1DVDkL52a/S6MJlHLA+LirUHNR7qJJfopoHrSypg9rRuqvCUVW7/JKvXKqbFX43NynpVzmg==",
      "license": "MIT",
      "dependencies": {
        "@expo/image-utils": "^0.12.5",
        "expo-constants": "~58.0.13"
      },
      "peerDependencies": {
        "expo": "*",
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/expo/node_modules/expo-constants": {
      "version": "58.0.13",
      "resolved": "https://registry.npmjs.org/expo-constants/-/expo-constants-58.0.13.tgz",
      "integrity": "sha512-zUj1rcnYg0O2wKF9L32ToEtFujc5OkslZJ4lWeg+fEwoPMLVwldn6kdEkX8zx31KgSwF94Ey1mIFdFX8Brp73Q==",
      "license": "MIT",
      "dependencies": {
        "@expo/env": "~2.5.3",
        "@expo/require-utils": "^58.0.4"
      },
      "peerDependencies": {
        "expo": "*",
        "react-native": "*"
      }
    },
    "node_modules/expo/node_modules/expo-file-system": {
      "version": "58.0.11",
      "resolved": "https://registry.npmjs.org/expo-file-system/-/expo-file-system-58.0.11.tgz",
      "integrity": "sha512-accVZyXeA8RYUNk52ydkcHPnQaYMVJWlWvdF8pU0xLvt7ZPbaOgGzbgbeyTswjlsKSTmrAsKos4prx0PVM4ERA==",
      "license": "MIT",
      "peerDependencies": {
        "expo": "*",
        "react-native": "*"
      }
    },
    "node_modules/expo/node_modules/expo-keep-awake": {
      "version": "58.0.3",
      "resolved": "https://registry.npmjs.org/expo-keep-awake/-/expo-keep-awake-58.0.3.tgz",
      "integrity": "sha512-wLRF+XeVsD/Rt/ZyX+A0mk1brdf8vefWizNAPzqV5eOCgkj23LCRZdN8gUi5X8UwyR8UJ7Y7Dzdz4YDGB/4c9Q==",
      "license": "MIT",
      "peerDependencies": {
        "expo": "*",
        "react": "*"
      }
    },
    "node_modules/expo/node_modules/mime-db": {
      "version": "1.52.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.52.0.tgz",
      "integrity": "sha512-sPU4uV7dYlvtWJxwwxHD0PuihVNiE7TyAbQ5SWxDCB9mUYvOgroQOwYQQOKPJ8CIbE+1ETVlOoK1UC2nU3gYvg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expo/node_modules/mime-types": {
      "version": "2.1.35",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-2.1.35.tgz",
      "integrity": "sha512-ZDY+bPm5zTTF+YpCrAU9nK0UgICYPT0QtT1NZWFv4s++TNkcgVaT0g6+4R2uI4MjQjzysHB1zxuWL50hzaeXiw==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "1.52.0"
      },
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expo/node_modules/negotiator": {
      "version": "0.6.3",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-0.6.3.tgz",
      "integrity": "sha512-+EUsqGPLsM+j/zdChZjsnX51g4XrHFOIXwfnCVPGlQk/k5giakcKsuxCObBRu6DSm9opw/O6slWbJdghQM4bBg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/expo/node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/expo/node_modules/ws": {
      "version": "8.22.0",
      "resolved": "https://registry.npmjs.org/ws/-/ws-8.22.0.tgz",
      "integrity": "sha512-Ydggc987+RO0AnWtZ/7Wq9FtNvcrL1b/RO0ud9mWjUPgDrsAAwQSF51sm2hm1XofbU/4jkpGEsLFsZZxU+1DOg==",
      "license": "MIT",
      "engines": {
        "node": ">=10.0.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": ">=5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    },
    "node_modules/exponential-backoff": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/exponential-backoff/-/exponential-backoff-3.1.3.tgz",
      "integrity": "sha512-ZgEeZXj30q+I0EN+CbSSpIyPaJ5HVQD18Z1m+u1FXbAeT94mr1zw50q4q6jiiC447Nl/YTcIYSAftiGqetwXCA==",
      "license": "Apache-2.0"
    },
    "node_modules/express": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/express/-/express-5.3.0.tgz",
      "integrity": "sha512-qCqy1xSoaugxOD4IVHb1ZWdkvCF2W3aE2okKouWj8VwJ+ztskSiXoBnCSJqfKT+cVPJhuJqe9YLbY425+Zh00g==",
      "license": "MIT",
      "dependencies": {
        "accepts": "^2.0.0",
        "body-parser": "^2.3.0",
        "content-disposition": "^2.0.1",
        "content-type": "^2.0.0",
        "cookie": "^0.7.1",
        "cookie-signature": "^1.2.1",
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "finalhandler": "^2.1.0",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.0",
        "merge-descriptors": "^2.0.0",
        "mime-types": "^3.0.0",
        "on-finished": "^2.4.1",
        "once": "^1.4.0",
        "parseurl": "^1.3.3",
        "proxy-addr": "^2.0.8",
        "qs": "^6.16.0",
        "range-parser": "^1.2.1",
        "router": "^2.2.0",
        "send": "^1.1.0",
        "serve-static": "^2.2.0",
        "statuses": "^2.0.1",
        "type-is": "^2.1.0",
        "vary": "^1.1.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/express/node_modules/finalhandler": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-2.1.1.tgz",
      "integrity": "sha512-S8KoZgRZN+a5rNwqTxlZZePjT/4cnm0ROV70LedRHZ0p8u9fRID0hJUZQpkKLzro8LfmC8sx23bY6tVNxv8pQA==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "on-finished": "^2.4.1",
        "parseurl": "^1.3.3",
        "statuses": "^2.0.1"
      },
      "engines": {
        "node": ">= 18.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/fresh": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-2.0.0.tgz",
      "integrity": "sha512-Rx/WycZ60HOaqLKAi6cHRKKI7zxWbJ31MhntmtwMoaTeF7XFH9hhBp8vITaMidfljRQ6eYWCKkaTK+ykVJHP2A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/express/node_modules/on-finished": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.2.tgz",
      "integrity": "sha512-ATWUv387i+nLD49EiDoOft5scf32Vsdz3ktrQJG9bi7jRFmaXTssvyvj1EmeKVVgvesbqUtvQQvaS2TpTukAZQ==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/send": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/send/-/send-1.2.1.tgz",
      "integrity": "sha512-1gnZf7DFcoIcajTjTwjwuDjzuz4PPcY2StKPlsGAQ1+YH20IRVrBaXSWmdjowTJ6u8Rc01PoYOGHXfP1mYcZNQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.3",
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "etag": "^1.8.1",
        "fresh": "^2.0.0",
        "http-errors": "^2.0.1",
        "mime-types": "^3.0.2",
        "ms": "^2.1.3",
        "on-finished": "^2.4.1",
        "range-parser": "^1.2.1",
        "statuses": "^2.0.2"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/serve-static": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-2.2.1.tgz",
      "integrity": "sha512-xRXBn0pPqQTVQiC8wyQrKs2MOlX24zQ0POGaj0kultvoOCstBQM5yvOhAVSUwOMjQtTvsPWoNCHfPGwaaQJhTw==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "^2.0.0",
        "escape-html": "^1.0.3",
        "parseurl": "^1.3.3",
        "send": "^1.2.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/express/node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/fast-deep-equal": {
      "version": "3.1.3",
      "resolved": "https://registry.npmjs.org/fast-deep-equal/-/fast-deep-equal-3.1.3.tgz",
      "integrity": "sha512-f3qQ9oQy9j2AhBe/H9VC91wLmKBCCU/gDOnKNAYG5hswO7BLKj09Hc5HYNz9cGI++xlpDCIgDaitVs03ATR84Q==",
      "license": "MIT"
    },
    "node_modules/fast-json-stable-stringify": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/fast-json-stable-stringify/-/fast-json-stable-stringify-2.1.0.tgz",
      "integrity": "sha512-lhd/wF+Lk98HZoTCtlVraHtfh5XYijIjalXck7saUtuanSDyLMxnHhSXEDJqHxD7msR8D0uCmqlkwjCV8xvwHw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fast-levenshtein": {
      "version": "2.0.6",
      "resolved": "https://registry.npmjs.org/fast-levenshtein/-/fast-levenshtein-2.0.6.tgz",
      "integrity": "sha512-DCXu6Ifhqcks7TZKY3Hxp3y6qphY5SJZmrWMDrKcERSOXWQdMhU9Ig/PYrzyw/ul9jOIyh0N4M0tbC5hodg8dw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/fb-dotslash": {
      "version": "0.5.8",
      "resolved": "https://registry.npmjs.org/fb-dotslash/-/fb-dotslash-0.5.8.tgz",
      "integrity": "sha512-XHYLKk9J4BupDxi9bSEhkfss0m+Vr9ChTrjhf9l2iw3jB5C7BnY4GVPoMcqbrTutsKJso6yj2nAB6BI/F2oZaA==",
      "license": "(MIT OR Apache-2.0)",
      "bin": {
        "dotslash": "bin/dotslash"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/fb-watchman": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/fb-watchman/-/fb-watchman-2.0.4.tgz",
      "integrity": "sha512-tGQtaoYisPDriJBN0mT5yZSyNETnJGA1gTYxaVRAE5KUO3LI9kPUc9WIu8JXcxaIci+faIKlzXqXyPgrmubtBQ==",
      "license": "MIT",
      "dependencies": {
        "bser": "2.1.2"
      }
    },
    "node_modules/fbjs": {
      "version": "3.0.5",
      "resolved": "https://registry.npmjs.org/fbjs/-/fbjs-3.0.5.tgz",
      "integrity": "sha512-ztsSx77JBtkuMrEypfhgc3cI0+0h+svqeie7xHbh1k/IKdcydnvadp/mUaGgjAOXQmQSxsqgaRhS3q9fy+1kxg==",
      "license": "MIT",
      "dependencies": {
        "cross-fetch": "^3.1.5",
        "fbjs-css-vars": "^1.0.0",
        "loose-envify": "^1.0.0",
        "object-assign": "^4.1.0",
        "promise": "^7.1.1",
        "setimmediate": "^1.0.5",
        "ua-parser-js": "^1.0.35"
      }
    },
    "node_modules/fbjs-css-vars": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/fbjs-css-vars/-/fbjs-css-vars-1.0.2.tgz",
      "integrity": "sha512-b2XGFAFdWZWg0phtAWLHCk836A1Xann+I+Dgd3Gk64MHKZO44FfoD1KxyvbSh0qZsIoXQGGlVztIY+oitJPpRQ==",
      "license": "MIT"
    },
    "node_modules/fbjs/node_modules/promise": {
      "version": "7.3.1",
      "resolved": "https://registry.npmjs.org/promise/-/promise-7.3.1.tgz",
      "integrity": "sha512-nolQXZ/4L+bP/UGlkfaIujX9BKxGwmQ9OT4mOt5yvy8iK1h3wqTEJCijzGANTCCl9nWjY41juyAn2K3Q1hLLTg==",
      "license": "MIT",
      "dependencies": {
        "asap": "~2.0.3"
      }
    },
    "node_modules/fetch-nodeshim": {
      "version": "0.4.10",
      "resolved": "https://registry.npmjs.org/fetch-nodeshim/-/fetch-nodeshim-0.4.10.tgz",
      "integrity": "sha512-m6I8ALe4L4XpdETy7MJZWs6L1IVMbjs99bwbpIKphxX+0CTns4IKDWJY0LWfr4YsFjfg+z1TjzTMU8lKl8rG0w==",
      "license": "MIT"
    },
    "node_modules/file-entry-cache": {
      "version": "8.0.0",
      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
      "integrity": "sha512-XXTUwCvisa5oacNGRP9SfNtYBNAMi+RPwBFmblZEF7N7swHYQS6/Zfk7SRwx4D5j3CH211YNRco1DEMNVfZCnQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flat-cache": "^4.0.0"
      },
      "engines": {
        "node": ">=16.0.0"
      }
    },
    "node_modules/fill-range": {
      "version": "7.1.1",
      "resolved": "https://registry.npmjs.org/fill-range/-/fill-range-7.1.1.tgz",
      "integrity": "sha512-YsGpe3WHLK8ZYi4tWDg2Jy3ebRz2rXowDxnld4bkQB00cc/1Zw9AWnC0i9ztDJitivtQvaI9KaLyKrc+hBW0yg==",
      "license": "MIT",
      "dependencies": {
        "to-regex-range": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/finalhandler": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/finalhandler/-/finalhandler-1.1.2.tgz",
      "integrity": "sha512-aAWcW57uxVNrQZqFXjITpW3sIUQmHGG3qSb9mUah9MgMC4NeWhNOlNjXEYq3HjRAvL6arUviZGGJsBg6z0zsWA==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "encodeurl": "~1.0.2",
        "escape-html": "~1.0.3",
        "on-finished": "~2.3.0",
        "parseurl": "~1.3.3",
        "statuses": "~1.5.0",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/finalhandler/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/finalhandler/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/find-up": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/find-up/-/find-up-5.0.0.tgz",
      "integrity": "sha512-78/PXT1wlLLDgTzDs7sjq9hzz0vXD+zn+7wypEe4fXQxCmdmqfGsEPQxmiCSQI3ajFV91bVSsvNtrJRiW6nGng==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "locate-path": "^6.0.0",
        "path-exists": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/flat-cache": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/flat-cache/-/flat-cache-4.0.1.tgz",
      "integrity": "sha512-f7ccFPK3SXFHpx15UIGyRJ/FJQctuKZ0zVuN3frBo4HnK3cay9VEW0R6yPYFHC0AgqhukPzKjq22t5DmAyqGyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "flatted": "^3.2.9",
        "keyv": "^4.5.4"
      },
      "engines": {
        "node": ">=16"
      }
    },
    "node_modules/flatted": {
      "version": "3.4.4",
      "resolved": "https://registry.npmjs.org/flatted/-/flatted-3.4.4.tgz",
      "integrity": "sha512-5+ybhBZANEJxaH3X5evAFatUxLfEHSr7n6kYJ+1Qd0mUqr4eu9gIf6GDbWHf8RJijHrjjO8G+la14SlL2SeS1Q==",
      "dev": true,
      "license": "ISC"
    },
    "node_modules/flow-enums-runtime": {
      "version": "0.0.6",
      "resolved": "https://registry.npmjs.org/flow-enums-runtime/-/flow-enums-runtime-0.0.6.tgz",
      "integrity": "sha512-3PYnM29RFXwvAN6Pc/scUfkI7RwhQ/xqyLUyPNlXUp9S40zI8nup9tUSrTLSVnWGBN38FNiGWbwZOB6uR4OGdw==",
      "license": "MIT"
    },
    "node_modules/flow-estree": {
      "version": "0.331.0",
      "resolved": "https://registry.npmjs.org/flow-estree/-/flow-estree-0.331.0.tgz",
      "integrity": "sha512-FVLYkSL/ITb/QXBEQvNWPjPooRGswuUtGOwrH+puSlMDneNkxy640+FZsk/TfKL+b7Wbw/Fg9FTUv2bMQDpj2w==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/flow-parser": {
      "version": "0.331.0",
      "resolved": "https://registry.npmjs.org/flow-parser/-/flow-parser-0.331.0.tgz",
      "integrity": "sha512-vEZcHIlnKeN8JSVtYFczj8sWJfHIJOkz+YG00O/oul/Bete+t1ZhTi+O6JRRLFYvGW+yJkZ0YgL16iStnbkUqQ==",
      "license": "MIT",
      "dependencies": {
        "flow-estree": "0.331.0"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/for-each": {
      "version": "0.3.5",
      "resolved": "https://registry.npmjs.org/for-each/-/for-each-0.3.5.tgz",
      "integrity": "sha512-dKx12eRCVIzqCxFGplyFKJMPvLEWgmNtUrpTiJIR5u97zEhRG8ySrtboPHZXx7daLxQVrl643cTzbab2tkQjxg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-callable": "^1.2.7"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/forwarded": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/forwarded/-/forwarded-0.2.0.tgz",
      "integrity": "sha512-buRG0fpBtRHSTCOASe6hD258tEubFoRLb4ZNA6NxMVHNw2gOcwHo9wyablzMzOA5z9xA9L1KNjk/Nt6MT9aYow==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/fresh": {
      "version": "0.5.2",
      "resolved": "https://registry.npmjs.org/fresh/-/fresh-0.5.2.tgz",
      "integrity": "sha512-zJ2mQYM18rEFOudeV4GShTGIQ7RbzA7ozbU9I/XBpm7kqgMywgmylMwXHxZJmkVoYkna9d2pVXVXPdYTP9ej8Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/function-bind": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/function-bind/-/function-bind-1.1.2.tgz",
      "integrity": "sha512-7XHNxH7qX9xG5mIwxkhumTox/MIRNcOgDrxWsMt2pAr23WHp6MrRlN7FBSFpCpr+oVO0F744iUgR82nJMfG2SA==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/function.prototype.name": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/function.prototype.name/-/function.prototype.name-1.2.0.tgz",
      "integrity": "sha512-jObKIik1P2QjPHP5nz5BaOtUlfgS0fWo8IUByNXkM+o+02sJOi94em77GwJKQSJ3gfPHdgzLNrHc1uokV4P/ew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "functions-have-names": "^1.2.3",
        "has-property-descriptors": "^1.0.2",
        "hasown": "^2.0.4",
        "is-callable": "^1.2.7",
        "is-document.all": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/functions-have-names": {
      "version": "1.2.3",
      "resolved": "https://registry.npmjs.org/functions-have-names/-/functions-have-names-1.2.3.tgz",
      "integrity": "sha512-xckBUXyTIqT97tq2x2AMb+g163b5JFysYk0x4qxNFwbfQkmNZoiRHb6sPzI9/QV33WeuvVYBUIiD4NzNIyqaRQ==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/generate-function": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/generate-function/-/generate-function-2.3.1.tgz",
      "integrity": "sha512-eeB5GfMNeevm/GRYq20ShmsaGcmI81kIX2K9XQx5miC8KdHaC6Jm0qQ8ZNeGOi7wYB8OsdxKs+Y2oVuTFuVwKQ==",
      "license": "MIT",
      "dependencies": {
        "is-property": "^1.0.2"
      }
    },
    "node_modules/generator-function": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/generator-function/-/generator-function-2.0.1.tgz",
      "integrity": "sha512-SFdFmIJi+ybC0vjlHN0ZGVGHc3lgE0DxPAT0djjVg+kjOnSqclqmj0KQ7ykTOLP6YxoqOvuAODGdcHJn+43q3g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/gensync": {
      "version": "1.0.0-beta.2",
      "resolved": "https://registry.npmjs.org/gensync/-/gensync-1.0.0-beta.2.tgz",
      "integrity": "sha512-3hN7NaskYvMDLQY55gnW3NQ+mesEAepTqlg+VEbj7zzqEMBVNhzcGYYeqFo/TlYz6eQiFcp1HcsCZO+nGgS8zg==",
      "license": "MIT",
      "engines": {
        "node": ">=6.9.0"
      }
    },
    "node_modules/get-caller-file": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/get-caller-file/-/get-caller-file-2.0.5.tgz",
      "integrity": "sha512-DyFP3BM/3YHTQOCUL/w0OZHR0lpKeGrxotcHWcqNEdnltqFwXVfhEBQ94eIo34AfQpo0rGki4cyIiftY06h2Fg==",
      "license": "ISC",
      "engines": {
        "node": "6.* || 8.* || >= 10.*"
      }
    },
    "node_modules/get-intrinsic": {
      "version": "1.3.0",
      "resolved": "https://registry.npmjs.org/get-intrinsic/-/get-intrinsic-1.3.0.tgz",
      "integrity": "sha512-9fSjSaos/fRIVIp+xSJlE6lfwhES7LNtKaCBIamHsjr2na1BiABJPo0mOjjz8GJDURarmCPGqaiVg5mfjb98CQ==",
      "license": "MIT",
      "dependencies": {
        "call-bind-apply-helpers": "^1.0.2",
        "es-define-property": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.1",
        "function-bind": "^1.1.2",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "hasown": "^2.0.2",
        "math-intrinsics": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-proto": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/get-proto/-/get-proto-1.0.1.tgz",
      "integrity": "sha512-sTSfBjoXBp89JvIKIefqw7U2CCebsc74kiY6awiGogKtoSGbgjYE/G/+l9sF3MWFPNc9IcoOC4ODfKHfxFmp0g==",
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/get-symbol-description": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/get-symbol-description/-/get-symbol-description-1.1.0.tgz",
      "integrity": "sha512-w9UMqWwJxHNOvoNzSJ2oPF5wvYcvP7jUvYzhp67yEhTi17ZDBBC1z9pTdGuzjD+EFIqLSYRweZjqfiPzQ06Ebg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/get-tsconfig": {
      "version": "4.14.3",
      "resolved": "https://registry.npmjs.org/get-tsconfig/-/get-tsconfig-4.14.3.tgz",
      "integrity": "sha512-++QEw4DIY7WGoukz+/+A/8dGYPT9l9yIadnmSgZ8Rjr3YVSVDipQSO9CdnJo9ePqFqUUqh+wk9uIaoiAwsiPkA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "resolve-pkg-maps": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/privatenumber/get-tsconfig?sponsor=1"
      }
    },
    "node_modules/getenv": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/getenv/-/getenv-2.0.0.tgz",
      "integrity": "sha512-VilgtJj/ALgGY77fiLam5iD336eSWi96Q15JSAG1zi8NRBysm3LXKdGnHb4m5cuyxvOLQQKWpBZAT6ni4FI2iQ==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/glob": {
      "version": "13.0.6",
      "resolved": "https://registry.npmjs.org/glob/-/glob-13.0.6.tgz",
      "integrity": "sha512-Wjlyrolmm8uDpm/ogGyXZXb1Z+Ca2B8NbJwqBVg0axK9GbBeoS7yGV6vjXnYdGm6X53iehEuxxbyiKp8QmN4Vw==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "minimatch": "^10.2.2",
        "minipass": "^7.1.3",
        "path-scurry": "^2.0.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/glob-parent": {
      "version": "6.0.2",
      "resolved": "https://registry.npmjs.org/glob-parent/-/glob-parent-6.0.2.tgz",
      "integrity": "sha512-XxwI8EOhVQgWp6iDL+3b0r86f4d6AX6zSU55HfB4ydCEuXLXc5FcYeOu+nnGftS4TEju/11rt4KJPTMgbfmv4A==",
      "dev": true,
      "license": "ISC",
      "dependencies": {
        "is-glob": "^4.0.3"
      },
      "engines": {
        "node": ">=10.13.0"
      }
    },
    "node_modules/globals": {
      "version": "16.5.0",
      "resolved": "https://registry.npmjs.org/globals/-/globals-16.5.0.tgz",
      "integrity": "sha512-c/c15i26VrJ4IRt5Z89DnIzCGDn9EcebibhAOjw5ibqEHsE1wLUgkPn9RDmNcUKyU87GeaL633nyJ+pplFR2ZQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/globalthis": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/globalthis/-/globalthis-1.0.4.tgz",
      "integrity": "sha512-DpLKbNU4WylpxJykQujfCcwYWiV/Jhm50Goo0wrVILAv5jOr9d+H+UR3PhSCD2rCCEIg0uc+G+muBTwD54JhDQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.2.1",
        "gopd": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/gopd": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/gopd/-/gopd-1.2.0.tgz",
      "integrity": "sha512-ZUKRh6/kUFoAiTAtTYPZJ3hw9wNxx+BIBOijnlG9PnrJsCcSjs1wyyD6vJpaYtgnzDrKYRSqf3OO6Rfa93xsRg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/graceful-fs": {
      "version": "4.2.11",
      "resolved": "https://registry.npmjs.org/graceful-fs/-/graceful-fs-4.2.11.tgz",
      "integrity": "sha512-RbJ5/jmFcNNCcDV5o9eTnBLJ/HszWV0P73bc+Ff4nS/rJj+YaS6IGyiOL0VoBYX+l1Wrl3k63h/KrH+nhJ0XvQ==",
      "license": "ISC"
    },
    "node_modules/has-bigints": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-bigints/-/has-bigints-1.1.0.tgz",
      "integrity": "sha512-R3pbpkcIqv2Pm3dUwgjclDRVmWpTJW2DcMzcIhEXEx1oh/CEMObMm3KLmRJOdvhM7o4uQBnwr8pzRK2sJWIqfg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-flag": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-4.0.0.tgz",
      "integrity": "sha512-EykJT/Q1KjTWctppgIAgfSO0tKVuZUjhgMr17kqTumMl6Afv3EISleU7qZUzoXDFTAHTDC4NOoG/ZxU3EvlMPQ==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/has-property-descriptors": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-property-descriptors/-/has-property-descriptors-1.0.2.tgz",
      "integrity": "sha512-55JNKuIW+vq4Ke1BjOTjM2YctQIvCT7GFzHwmfZPGo5wnrgkid0YQtnAleFSqumZm4az3n2BS+erby5ipJdgrg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-define-property": "^1.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-proto": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/has-proto/-/has-proto-1.2.0.tgz",
      "integrity": "sha512-KIL7eQPfHQRC8+XluaIw7BHUwwqL19bQn4hzNgdr+1wXoU0KKj6rufu47lhY7KbJR2C6T6+PfyN0Ea7wkSS+qQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-symbols": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/has-symbols/-/has-symbols-1.1.0.tgz",
      "integrity": "sha512-1cDNdwJ2Jaohmb3sg4OmKaMBwuC48sYni5HUw2DvsC8LjGTLK9h+eb1X6RyuOHe4hT0ULCW68iomhjUoKUqlPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/has-tostringtag": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/has-tostringtag/-/has-tostringtag-1.0.2.tgz",
      "integrity": "sha512-NqADB8VjPFLM2V0VvHUewwwsw0ZWBaIdgo+ieHtK3hasLz4qeCRjYcqfB6AQrBggRKppKF8L52/VqdVsO47Dlw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-symbols": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/hasown": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/hasown/-/hasown-2.0.4.tgz",
      "integrity": "sha512-T2UbfbBEF32wiepXIsMlTW9+dDYC6wMh/t/vYA4tuOMKqWz/n3vr1NFSxQiyP+zk2mXsoMA/i/7qV6LKut1t1A==",
      "license": "MIT",
      "dependencies": {
        "function-bind": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/hermes-compiler": {
      "version": "260318099.0.4",
      "resolved": "https://registry.npmjs.org/hermes-compiler/-/hermes-compiler-260318099.0.4.tgz",
      "integrity": "sha512-8odcPFkPC82HlqCl0C5QI9mBN4rEAT+IAo55sJhzwKw//K3qZloiv3ex6J2O8CuBbhdmkJozfidNsset2KH25w==",
      "license": "MIT"
    },
    "node_modules/hermes-estree": {
      "version": "0.36.1",
      "resolved": "https://registry.npmjs.org/hermes-estree/-/hermes-estree-0.36.1.tgz",
      "integrity": "sha512-guv1nQ6IJ7S83NRFPWc3SA7IBZrdNC9kapwOq6uXvF4wP+sDCgjzQbKPCoyYmoyZRzztF/n/c36l/rccCZSiCw==",
      "license": "MIT"
    },
    "node_modules/hermes-parser": {
      "version": "0.36.1",
      "resolved": "https://registry.npmjs.org/hermes-parser/-/hermes-parser-0.36.1.tgz",
      "integrity": "sha512-GApNk4zLHi2UWoWZZkx7LNCOSzLSc5lB55pZ/PhK7ycFeg7u5LcF88p/WbpIi1XUDtE0MpHE3uRR3u3KB7TjSQ==",
      "license": "MIT",
      "dependencies": {
        "hermes-estree": "0.36.1"
      }
    },
    "node_modules/hosted-git-info": {
      "version": "7.0.2",
      "resolved": "https://registry.npmjs.org/hosted-git-info/-/hosted-git-info-7.0.2.tgz",
      "integrity": "sha512-puUZAUKT5m8Zzvs72XWy3HtvVbTWljRE66cP60bxJzAqf2DgICo7lYTY2IHUmLnNpjYvw5bvmoHvPc0QO2a62w==",
      "license": "ISC",
      "dependencies": {
        "lru-cache": "^10.0.1"
      },
      "engines": {
        "node": "^16.14.0 || >=18.0.0"
      }
    },
    "node_modules/hosted-git-info/node_modules/lru-cache": {
      "version": "10.4.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-10.4.3.tgz",
      "integrity": "sha512-JNAzZcXrCt42VGLuYz0zfAzDfAvJWW6AfYlDBQyDV5DClI2m5sAmK+OIO7s59XfsRsWHp02jAJrRadPRGTt6SQ==",
      "license": "ISC"
    },
    "node_modules/http-errors": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/http-errors/-/http-errors-2.0.1.tgz",
      "integrity": "sha512-4FbRdAX+bSdmo4AUFuS0WNiPz8NgFt+r8ThgNWmlrjQjt1Q7ZR9+zTlce2859x4KSXrwIsaeTqDoKQmtP8pLmQ==",
      "license": "MIT",
      "dependencies": {
        "depd": "~2.0.0",
        "inherits": "~2.0.4",
        "setprototypeof": "~1.2.0",
        "statuses": "~2.0.2",
        "toidentifier": "~1.0.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/http-errors/node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/https-proxy-agent": {
      "version": "7.0.6",
      "resolved": "https://registry.npmjs.org/https-proxy-agent/-/https-proxy-agent-7.0.6.tgz",
      "integrity": "sha512-vK9P5/iUfdl95AI+JVyUuIcVtd4ofvtrOr3HNtM2yxC9bnMbEdp3x01OhQNnjb8IJYi38VlTE3mBXwcfvywuSw==",
      "license": "MIT",
      "dependencies": {
        "agent-base": "^7.1.2",
        "debug": "4"
      },
      "engines": {
        "node": ">= 14"
      }
    },
    "node_modules/hyphenate-style-name": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/hyphenate-style-name/-/hyphenate-style-name-1.1.0.tgz",
      "integrity": "sha512-WDC/ui2VVRrz3jOVi+XtjqkDjiVjTtFaAGiW37k6b+ohyQ5wYDOGkvCZa8+H0nx3gyvv0+BST9xuOgIyGQ00gw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/iconv-lite": {
      "version": "0.7.3",
      "resolved": "https://registry.npmjs.org/iconv-lite/-/iconv-lite-0.7.3.tgz",
      "integrity": "sha512-IKXpvIzjnC9XTAUbVBcMfGS0EPaIXtW6v+zr+RRp+hqULEpo0owZax6wyRwPOJbWbzjYspQwusTsfVr0ifh4uQ==",
      "license": "MIT",
      "dependencies": {
        "safer-buffer": ">= 2.1.2 < 3.0.0"
      },
      "engines": {
        "node": ">=0.10.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/ignore": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/ignore/-/ignore-5.3.2.tgz",
      "integrity": "sha512-hsBTNUqQTDwkWtcdYI2i06Y/nUBEsNEDJKjWdigLvegy8kDuJAS8uRlpkkcQpyEXL0Z/pjDy5HBmMjRCJ2gq+g==",
      "license": "MIT",
      "engines": {
        "node": ">= 4"
      }
    },
    "node_modules/import-fresh": {
      "version": "3.3.1",
      "resolved": "https://registry.npmjs.org/import-fresh/-/import-fresh-3.3.1.tgz",
      "integrity": "sha512-TR3KfrTZTYLPB6jUjfx6MF9WcWrHL9su5TObK4ZkYgBdWKPOFoSoQIdEuTuR82pmtxH2spWG9h6etwfr1pLBqQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "parent-module": "^1.0.0",
        "resolve-from": "^4.0.0"
      },
      "engines": {
        "node": ">=6"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/import-fresh/node_modules/resolve-from": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-4.0.0.tgz",
      "integrity": "sha512-pb/MYmXstAkysRFx8piNI1tGFNQIFA3vkE3Gq4EuA1dF6gHp/+vgZqsCGJapvy8N3Q+4o7FwvquPJcnZ7RYy4g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/imurmurhash": {
      "version": "0.1.4",
      "resolved": "https://registry.npmjs.org/imurmurhash/-/imurmurhash-0.1.4.tgz",
      "integrity": "sha512-JmXMZ6wuvDmLiHEml9ykzqO6lwFbof0GG4IkcGaENdCRDDmMVnny7s5HsIgHCbaq0w2MyPhDqkhTUgS2LU2PHA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.8.19"
      }
    },
    "node_modules/inherits": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/inherits/-/inherits-2.0.4.tgz",
      "integrity": "sha512-k/vGaX4/Yla3WzyMCvTQOXYeIHvqOKtnqBduzTHpzpQZzAskKMhZ2K+EnBiSM9zGSoIFeMpXKxa4dYeZIQqewQ==",
      "license": "ISC"
    },
    "node_modules/inline-style-prefixer": {
      "version": "7.0.1",
      "resolved": "https://registry.npmjs.org/inline-style-prefixer/-/inline-style-prefixer-7.0.1.tgz",
      "integrity": "sha512-lhYo5qNTQp3EvSSp3sRvXMbVQTLrvGV6DycRMJ5dm2BLMiJ30wpXKdDdgX+GmJZ5uQMucwRKHamXSst3Sj/Giw==",
      "license": "MIT",
      "dependencies": {
        "css-in-js-utils": "^3.1.0"
      }
    },
    "node_modules/internal-slot": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/internal-slot/-/internal-slot-1.1.0.tgz",
      "integrity": "sha512-4gd7VpWNQNB4UKKCFFVcp1AVv+FMOgs9NKzjHKusc8jTMhd5eL1NqQqOpE0KzMds804/yHlglp3uxgluOqAPLw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "hasown": "^2.0.2",
        "side-channel": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/invariant": {
      "version": "2.2.4",
      "resolved": "https://registry.npmjs.org/invariant/-/invariant-2.2.4.tgz",
      "integrity": "sha512-phJfQVBuaJM5raOpJjSfkiD6BpbCE4Ns//LaXl6wGYtUBY83nWS6Rf9tXm2e8VaK60JEjYldbPif/A2B1C2gNA==",
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.0.0"
      }
    },
    "node_modules/ipaddr.js": {
      "version": "1.9.1",
      "resolved": "https://registry.npmjs.org/ipaddr.js/-/ipaddr.js-1.9.1.tgz",
      "integrity": "sha512-0KI/607xoxSToH7GjN1FfSbLoU0+btTicjsQSWQlh/hZykN8KpmMf7uYwPW3R+akZ6R/w18ZlXSHBYXiYUPO3g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/is-array-buffer": {
      "version": "3.0.5",
      "resolved": "https://registry.npmjs.org/is-array-buffer/-/is-array-buffer-3.0.5.tgz",
      "integrity": "sha512-DDfANUiiG2wC1qawP66qlTugJeL5HyzMpfr8lLK+jMQirGzNod0B12cFB/9q838Ru27sBwfw78/rdoU7RERz6A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-arrayish": {
      "version": "0.3.4",
      "resolved": "https://registry.npmjs.org/is-arrayish/-/is-arrayish-0.3.4.tgz",
      "integrity": "sha512-m6UrgzFVUYawGBh1dUsWR5M2Clqic9RVXC/9f8ceNlv2IcO9j9J/z8UoCLPqtsPBFNzEpfR3xftohbfqDx8EQA==",
      "license": "MIT"
    },
    "node_modules/is-async-function": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-async-function/-/is-async-function-2.1.1.tgz",
      "integrity": "sha512-9dgM/cZBnNvjzaMYHVoxxfPj2QXt22Ev7SuuPrs+xav0ukGB0S6d4ydZdEiM48kLx5kDV+QBPrpVnFyefL8kkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "async-function": "^1.0.0",
        "call-bound": "^1.0.3",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bigint": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-bigint/-/is-bigint-1.1.0.tgz",
      "integrity": "sha512-n4ZT37wG78iz03xPRKJrHTdZbe3IicyucEtdRsV5yglwc3GyUfbAfpSeD0FJ41NbUNSt5wbhqfp1fS+BgnvDFQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "has-bigints": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-boolean-object": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/is-boolean-object/-/is-boolean-object-1.2.2.tgz",
      "integrity": "sha512-wa56o2/ElJMYqjCjGkXri7it5FbebW5usLw/nPmCMs5DeZ7eziSYZhSmPRn0txqeW4LnAmQQU7FgqLpsEFKM4A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-bun-module": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/is-bun-module/-/is-bun-module-2.0.0.tgz",
      "integrity": "sha512-gNCGbnnnnFAUGKeZ9PdbyeGYJqewpmc2aKHUEMO5nQPWU9lOmv7jcmQIv+qHD8fXW6W7qfuCwX4rY9LNRjXrkQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "semver": "^7.7.1"
      }
    },
    "node_modules/is-callable": {
      "version": "1.2.7",
      "resolved": "https://registry.npmjs.org/is-callable/-/is-callable-1.2.7.tgz",
      "integrity": "sha512-1BC0BVFhS/p0qtw6enp8e+8OD0UrK0oFLztSjNzhcKA3WDuJxxAPXzPuPtKkjEY9UUoEWlX/8fgKeu2S8i9JTA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-core-module": {
      "version": "2.17.0",
      "resolved": "https://registry.npmjs.org/is-core-module/-/is-core-module-2.17.0.tgz",
      "integrity": "sha512-J/vG0zBCbIKOQFfufSwyXdMrsohyJIUNkrnmo6WZGzoM7tr/lsbfW5b2BvisL6zsyMzK9UxV9L6c7AoFbyXHOA==",
      "license": "MIT",
      "dependencies": {
        "hasown": "^2.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-data-view": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/is-data-view/-/is-data-view-1.0.2.tgz",
      "integrity": "sha512-RKtWF8pGmS87i2D6gqQu/l7EYRlVdfzemCJN/P3UOs//x1QE7mfhvzHIApBTRf7axvT6DMGwSwBXYCT0nfB9xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "get-intrinsic": "^1.2.6",
        "is-typed-array": "^1.1.13"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-date-object": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/is-date-object/-/is-date-object-1.1.0.tgz",
      "integrity": "sha512-PwwhEakHVKTdRNVOw+/Gyh0+MzlCl4R6qKvkhuvLtPMggI1WAHt9sOwZxQLSGpUaDnrdyDsomoRgNnCfKNSXXg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-docker": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/is-docker/-/is-docker-2.2.1.tgz",
      "integrity": "sha512-F+i2BKsFrH66iaUFc0woD8sLy8getkwTwtOBjvs56Cx4CgJDeKQeqfz8wAYiSb8JOprWhHH5p77PbmYCvvUuXQ==",
      "license": "MIT",
      "bin": {
        "is-docker": "cli.js"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/is-document.all": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/is-document.all/-/is-document.all-1.0.0.tgz",
      "integrity": "sha512-+XSoyS05OdBbhFuELhgTCpFNHkpBOJqtsZfUFFpe5QTw+9Sjbh8zitxhQkYAo6wV7e1Vb8cAPvpCk9jGam/82g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-extglob": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz",
      "integrity": "sha512-SbKbANkN603Vi4jEZv49LeVJMn4yGwsbzZworEoyEiutsN3nJYdbO36zfhGJ6QEDpOZIFkDtnq5JRxmvl3jsoQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-finalizationregistry": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-finalizationregistry/-/is-finalizationregistry-1.1.1.tgz",
      "integrity": "sha512-1pC6N8qWJbWoPtEjgcL2xyhQOP491EQjeUo3qTKcmV8YSDDJrOepfG8pcC7h/QgnQHYSv0mJ3Z/ZWxmatVrysg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-fullwidth-code-point": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/is-fullwidth-code-point/-/is-fullwidth-code-point-3.0.0.tgz",
      "integrity": "sha512-zymm5+u+sCsSWyD9qNaejV3DFvhCKclKdizYaJUuHA83RLjb7nSuGnddCHGv0hk+KY7BMAlsWeK4Ueg6EV6XQg==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-generator-function": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/is-generator-function/-/is-generator-function-1.1.2.tgz",
      "integrity": "sha512-upqt1SkGkODW9tsGNG5mtXTXtECizwtS2kA161M+gJPc1xdb/Ax629af6YrTwcOeQHbewrPNlE5Dx7kzvXTizA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4",
        "generator-function": "^2.0.0",
        "get-proto": "^1.0.1",
        "has-tostringtag": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-glob": {
      "version": "4.0.3",
      "resolved": "https://registry.npmjs.org/is-glob/-/is-glob-4.0.3.tgz",
      "integrity": "sha512-xelSayHH36ZgE7ZWhli7pW34hNbNl8Ojv5KVmkJD4hBdD3th8Tfk9vYasLM+mXWOZhFkgZfxhLSnrwRr4elSSg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-extglob": "^2.1.1"
      },
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/is-map": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-map/-/is-map-2.0.3.tgz",
      "integrity": "sha512-1Qed0/Hr2m+YqxnM09CjA2d/i6YZNfF6R2oRAOj36eUdS6qIV/huPJNSEpKbupewFs+ZsJlxsjjPbc0/afW6Lw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-negative-zero": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-negative-zero/-/is-negative-zero-2.0.3.tgz",
      "integrity": "sha512-5KoIu2Ngpyek75jXodFvnafB6DJgr3u8uuK0LEZJjrU19DrMD3EVERaR8sjz8CCGgpZvxPl9SuE1GMVPFHx1mw==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-number": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz",
      "integrity": "sha512-41Cifkg6e8TylSpdtTpeLVMqvSBEVzTttHvERD741+pnZ8ANv0004MRL43QKPDlK9cGvNp6NZWZUBlbGXYxxng==",
      "license": "MIT",
      "engines": {
        "node": ">=0.12.0"
      }
    },
    "node_modules/is-number-object": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-number-object/-/is-number-object-1.1.1.tgz",
      "integrity": "sha512-lZhclumE1G6VYD8VHe35wFaIif+CTy5SJIi5+3y4psDgWu4wPDoBhF8NxUOinEc7pHgiTsT6MaBb92rKhhD+Xw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-plain-obj": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/is-plain-obj/-/is-plain-obj-2.1.0.tgz",
      "integrity": "sha512-YWnfyRwxL/+SsrWYfOpUtz5b3YD+nyfkHvjbcanzk8zgyO4ASD67uVMRt8k5bM4lLMDnXfriRhOpemw+NfT1eA==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/is-promise": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/is-promise/-/is-promise-4.0.0.tgz",
      "integrity": "sha512-hvpoI6korhJMnej285dSg6nu1+e6uxs7zG3BYAm5byqDsgJNWwxzM6z6iZiAgQR4TJ30JmBTOwqZUw3WlyH3AQ==",
      "license": "MIT"
    },
    "node_modules/is-property": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/is-property/-/is-property-1.0.2.tgz",
      "integrity": "sha512-Ks/IoX00TtClbGQr4TWXemAnktAQvYB7HzcCxDGqEZU6oCmb2INHuOoKxbtR+HFkmYWBKv/dOZtGRiAjDhj92g==",
      "license": "MIT"
    },
    "node_modules/is-regex": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/is-regex/-/is-regex-1.2.1.tgz",
      "integrity": "sha512-MjYsKHO5O7mCsmRGxWcLWheFqN9DJ/2TmngvjKXihe6efViPqc274+Fx/4fYj/r03+ESvBdTXK0V6tA3rgez1g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2",
        "hasown": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-set": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/is-set/-/is-set-2.0.3.tgz",
      "integrity": "sha512-iPAjerrse27/ygGLxw+EBR9agv9Y6uLeYVJMu+QNCoouJ1/1ri0mGrcWpfCqFZuzzx3WjtwxG098X+n4OuRkPg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-shared-array-buffer": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/is-shared-array-buffer/-/is-shared-array-buffer-1.0.4.tgz",
      "integrity": "sha512-ISWac8drv4ZGfwKl5slpHG9OwPNty4jOWPRIhBpxOoD+hqITiwuipOQ2bNthAzwA3B4fIjO4Nln74N0S9byq8A==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-string": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-string/-/is-string-1.1.1.tgz",
      "integrity": "sha512-BtEeSsoaQjlSPBemMQIrY1MY0uM6vnS1g5fmufYOtnxLGUZM2178PKbhsk7Ffv58IX+ZtcvoGwccYsh0PglkAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-symbol": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-symbol/-/is-symbol-1.1.1.tgz",
      "integrity": "sha512-9gGx6GTtCQM73BgmHQXfDmLtfjjTUDSyoxTCbp5WtoixAhfgsDirWIcVQ/IHpvI5Vgd5i/J5F7B9cN/WlVbC/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "has-symbols": "^1.1.0",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-typed-array": {
      "version": "1.1.15",
      "resolved": "https://registry.npmjs.org/is-typed-array/-/is-typed-array-1.1.15.tgz",
      "integrity": "sha512-p3EcsicXjit7SaskXHs1hA91QxgTw46Fv6EFKKGS5DRFLD8yKnohjF3hxoju94b/OcMZoQukzpPpBE9uLVKzgQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakmap": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/is-weakmap/-/is-weakmap-2.0.2.tgz",
      "integrity": "sha512-K5pXYOm9wqY1RgjpL3YTkF39tni1XajUIkawTLUo9EZEVUFga5gSQJF8nNS7ZwJQ02y+1YCNYcMh+HIf1ZqE+w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakref": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/is-weakref/-/is-weakref-1.1.1.tgz",
      "integrity": "sha512-6i9mGWSlqzNMEqpCp93KwRS1uUOodk2OJ6b+sq7ZPDSy2WuI5NFIxp/254TytR8ftefexkWn5xNiHUNpPOfSew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-weakset": {
      "version": "2.0.4",
      "resolved": "https://registry.npmjs.org/is-weakset/-/is-weakset-2.0.4.tgz",
      "integrity": "sha512-mfcwb6IzQyOKTs84CQMrOwW4gQcaTOAWJ0zzJCl2WSPDrWk/OzDaImWFH3djXhb24g4eudZfLRozAvPGw4d9hQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "get-intrinsic": "^1.2.6"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/is-wsl": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/is-wsl/-/is-wsl-2.2.0.tgz",
      "integrity": "sha512-fKzAra0rGJUUBwGBgNkHZuToZcn+TtXHpeCgmkMJMMYx1sQDYaCSyjJBSCa2nH1DGm7s3n1oBnohoVTBaN7Lww==",
      "license": "MIT",
      "dependencies": {
        "is-docker": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/isarray": {
      "version": "2.0.5",
      "resolved": "https://registry.npmjs.org/isarray/-/isarray-2.0.5.tgz",
      "integrity": "sha512-xHjhDr3cNBK0BzdUJSPXZntQUx/mwMS5Rw4A7lPJ90XGAO6ISP/ePDNuo0vhqOZU+UD5JoodwCAAoZQd3FeAKw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/isexe": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/isexe/-/isexe-2.0.0.tgz",
      "integrity": "sha512-RHxMLp9lnKHGHRng9QFhRCMbYAcVpn69smSGcq3f36xjgVVWThj4qqLbTLlq7Ssj8B+fIQ1EuCEGI2lKsyQeIw==",
      "license": "ISC"
    },
    "node_modules/iterator.prototype": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/iterator.prototype/-/iterator.prototype-1.1.5.tgz",
      "integrity": "sha512-H0dkQoCa3b2VEeKQBOxFph+JAbcrQdE7KC0UkqwpLmv2EC4P41QXP+rqo9wYodACiG5/WM5s9oDApTU8utwj9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.6",
        "get-proto": "^1.0.0",
        "has-symbols": "^1.1.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/jest-get-type": {
      "version": "29.6.3",
      "resolved": "https://registry.npmjs.org/jest-get-type/-/jest-get-type-29.6.3.tgz",
      "integrity": "sha512-zrteXnqYxfQh7l5FHyL38jL39di8H8rHoecLH3JNxH3BwOrBsNeabdap5e0I23lD4HHI8W5VFBZqG4Eaq5LNcw==",
      "license": "MIT",
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/jest-util": {
      "version": "29.7.0",
      "resolved": "https://registry.npmjs.org/jest-util/-/jest-util-29.7.0.tgz",
      "integrity": "sha512-z6EbKajIpqGKU56y5KBUgy1dt1ihhQJgWzUlZHArA/+X2ad7Cb5iF+AK1EWVL/Bo7Rz9uurpqw6SiBCefUbCGA==",
      "license": "MIT",
      "dependencies": {
        "@jest/types": "^29.6.3",
        "@types/node": "*",
        "chalk": "^4.0.0",
        "ci-info": "^3.2.0",
        "graceful-fs": "^4.2.9",
        "picomatch": "^2.2.3"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/jest-validate": {
      "version": "29.7.0",
      "resolved": "https://registry.npmjs.org/jest-validate/-/jest-validate-29.7.0.tgz",
      "integrity": "sha512-ZB7wHqaRGVw/9hST/OuFUReG7M8vKeq0/J2egIGLdvjHCmYqGARhzXmtgi+gVeZ5uXFF219aOc3Ls2yLg27tkw==",
      "license": "MIT",
      "dependencies": {
        "@jest/types": "^29.6.3",
        "camelcase": "^6.2.0",
        "chalk": "^4.0.0",
        "jest-get-type": "^29.6.3",
        "leven": "^3.1.0",
        "pretty-format": "^29.7.0"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/jest-worker": {
      "version": "29.7.0",
      "resolved": "https://registry.npmjs.org/jest-worker/-/jest-worker-29.7.0.tgz",
      "integrity": "sha512-eIz2msL/EzL9UFTFFx7jBTkeZfku0yUAyZZZmJ93H2TYEiroIx2PQjEXcwYtYl8zXCxb+PAmA2hLIt/6ZEkPHw==",
      "license": "MIT",
      "dependencies": {
        "@types/node": "*",
        "jest-util": "^29.7.0",
        "merge-stream": "^2.0.0",
        "supports-color": "^8.0.0"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/jest-worker/node_modules/supports-color": {
      "version": "8.1.1",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-8.1.1.tgz",
      "integrity": "sha512-MpUEN2OodtUzxvKQl72cUF7RQ5EiHsGvSsVG0ia9c5RbWGL2CI4C7EpPS8UTBIplnlzZiNuV56w+FuNxy3ty2Q==",
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/supports-color?sponsor=1"
      }
    },
    "node_modules/jimp-compact": {
      "version": "0.16.1",
      "resolved": "https://registry.npmjs.org/jimp-compact/-/jimp-compact-0.16.1.tgz",
      "integrity": "sha512-dZ6Ra7u1G8c4Letq/B5EzAxj4tLFHL+cGtdpR+PVm4yzPDj+lCk+AbivWt1eOM+ikzkowtyV7qSqX6qr3t71Ww==",
      "license": "MIT"
    },
    "node_modules/js-tokens": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz",
      "integrity": "sha512-RdJUflcE3cUzKiMqQgsCu06FPu9UdIJO0beYbPhHN4k6apgJtifcoCtT9bcxOpYBtpD2kCM6Sbzg4CausW/PKQ==",
      "license": "MIT"
    },
    "node_modules/js-yaml": {
      "version": "4.3.2",
      "resolved": "https://registry.npmjs.org/js-yaml/-/js-yaml-4.3.2.tgz",
      "integrity": "sha512-SFNOvSJ+Dgf/9An904Yx+CgSlIPCkIpao4qo51lpee25TIRejdH3rhR4EZMGoNx3/TP3O+wzWuiTFl4sqbltzA==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/puzrin"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/nodeca"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "argparse": "^2.0.1"
      },
      "bin": {
        "js-yaml": "bin/js-yaml.js"
      }
    },
    "node_modules/jsc-safe-url": {
      "version": "0.2.4",
      "resolved": "https://registry.npmjs.org/jsc-safe-url/-/jsc-safe-url-0.2.4.tgz",
      "integrity": "sha512-0wM3YBWtYePOjfyXQH5MWQ8H7sdk5EXSwZvmSLKk2RboVQ2Bu239jycHDz5J/8Blf3K0Qnoy2b6xD+z10MFB+Q==",
      "license": "0BSD"
    },
    "node_modules/jsesc": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/jsesc/-/jsesc-3.1.0.tgz",
      "integrity": "sha512-/sM3dO2FOzXjKQhJuo0Q173wf2KOo8t4I8vHy6lF9poUp7bKT0/NHE8fPX23PwfhnykfqnC2xRxOnVw5XuGIaA==",
      "license": "MIT",
      "bin": {
        "jsesc": "bin/jsesc"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/json-buffer": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/json-buffer/-/json-buffer-3.0.1.tgz",
      "integrity": "sha512-4bV5BfR2mqfQTJm+V5tPPdf+ZpuhiIvTuAB5g8kcrXOZpTT/QwwVRWBywX1ozr6lEuPdbHxwaJlm9G6mI2sfSQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-schema-traverse": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/json-schema-traverse/-/json-schema-traverse-0.4.1.tgz",
      "integrity": "sha512-xbbCH5dCYU5T8LcEhhuh7HJ88HXuW3qsI3Y0zOZFKfZEHcpWiHU/Jxzk629Brsab/mMiHQti9wMP+845RPe3Vg==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json-stable-stringify-without-jsonify": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/json-stable-stringify-without-jsonify/-/json-stable-stringify-without-jsonify-1.0.1.tgz",
      "integrity": "sha512-Bdboy+l7tA3OGW6FjyFHWkP5LuByj1Tk33Ljyq0axyzdk9//JSi2u3fP1QSmd1KNwq6VOKYGlAu87CisVir6Pw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/json5": {
      "version": "2.2.3",
      "resolved": "https://registry.npmjs.org/json5/-/json5-2.2.3.tgz",
      "integrity": "sha512-XmOWe7eyHYH14cLdVPoyg+GOH3rYX++KpzrylJwSW98t3Nk+U8XOl8FWKOgwtzdb8lXGf6zYwDUzeHMWfxasyg==",
      "license": "MIT",
      "bin": {
        "json5": "lib/cli.js"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/jsonwebtoken": {
      "version": "9.0.3",
      "resolved": "https://registry.npmjs.org/jsonwebtoken/-/jsonwebtoken-9.0.3.tgz",
      "integrity": "sha512-MT/xP0CrubFRNLNKvxJ2BYfy53Zkm++5bX9dtuPbqAeQpTVe0MQTFhao8+Cp//EmJp244xt6Drw/GVEGCUj40g==",
      "license": "MIT",
      "dependencies": {
        "jws": "^4.0.1",
        "lodash.includes": "^4.3.0",
        "lodash.isboolean": "^3.0.3",
        "lodash.isinteger": "^4.0.4",
        "lodash.isnumber": "^3.0.3",
        "lodash.isplainobject": "^4.0.6",
        "lodash.isstring": "^4.0.1",
        "lodash.once": "^4.0.0",
        "ms": "^2.1.1",
        "semver": "^7.5.4"
      },
      "engines": {
        "node": ">=12",
        "npm": ">=6"
      }
    },
    "node_modules/jsx-ast-utils": {
      "version": "3.3.5",
      "resolved": "https://registry.npmjs.org/jsx-ast-utils/-/jsx-ast-utils-3.3.5.tgz",
      "integrity": "sha512-ZZow9HBI5O6EPgSJLUb8n2NKgmVWTwCvHGwFuJlMjvLFqlGG6pjirPhtdsseaLZjSibD8eegzmYpUZwoIlj2cQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array-includes": "^3.1.6",
        "array.prototype.flat": "^1.3.1",
        "object.assign": "^4.1.4",
        "object.values": "^1.1.6"
      },
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/jwa": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/jwa/-/jwa-2.0.1.tgz",
      "integrity": "sha512-hRF04fqJIP8Abbkq5NKGN0Bbr3JxlQ+qhZufXVr0DvujKy93ZCbXZMHDL4EOtodSbCWxOqR8MS1tXA5hwqCXDg==",
      "license": "MIT",
      "dependencies": {
        "buffer-equal-constant-time": "^1.0.1",
        "ecdsa-sig-formatter": "1.0.11",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/jws": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/jws/-/jws-4.0.1.tgz",
      "integrity": "sha512-EKI/M/yqPncGUUh44xz0PxSidXFr/+r0pA70+gIYhjv+et7yxM+s29Y+VGDkovRofQem0fs7Uvf4+YmAdyRduA==",
      "license": "MIT",
      "dependencies": {
        "jwa": "^2.0.1",
        "safe-buffer": "^5.0.1"
      }
    },
    "node_modules/keyv": {
      "version": "4.5.4",
      "resolved": "https://registry.npmjs.org/keyv/-/keyv-4.5.4.tgz",
      "integrity": "sha512-oxVHkHR/EJf2CNXnWxRLW6mg7JyCCUcG0DtEGmL2ctUo1PNTin1PUil+r/+4r5MpVgC/fn1kjsx7mjSujKqIpw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "json-buffer": "3.0.1"
      }
    },
    "node_modules/kleur": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/kleur/-/kleur-3.0.3.tgz",
      "integrity": "sha512-eTIzlVOSUR+JxdDFepEYcBMtZ9Qqdef+rnzWdRZuMbOywu5tO2w2N7rqjoANZ5k9vywhL6Br1VRjUIgTQx4E8w==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/lan-network": {
      "version": "0.2.1",
      "resolved": "https://registry.npmjs.org/lan-network/-/lan-network-0.2.1.tgz",
      "integrity": "sha512-ONPnazC96VKDntab9j9JKwIWhZ4ZUceB4A9Epu4Ssg0hYFmtHZSeQ+n15nIwTFmcBUKtExOer8WTJ4GF9MO64A==",
      "license": "MIT",
      "bin": {
        "lan-network": "dist/lan-network-cli.js"
      }
    },
    "node_modules/leven": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/leven/-/leven-3.1.0.tgz",
      "integrity": "sha512-qsda+H8jTaUaN/x5vzW2rzc+8Rw4TAQ/4KjB46IwK5VH+IlVeeeje/EoZRpiXvIqjFgK84QffqPztGI3VBLG1A==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/levn": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/levn/-/levn-0.4.1.tgz",
      "integrity": "sha512-+bT2uH4E5LGE7h/n3evcS/sQlJXCpIp6ym8OWJ5eV6+67Dsql/LaaT7qJBAt2rzfoa/5QBGBhxDix1dMt2kQKQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1",
        "type-check": "~0.4.0"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/lightningcss": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss/-/lightningcss-1.33.0.tgz",
      "integrity": "sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA==",
      "license": "MPL-2.0",
      "dependencies": {
        "detect-libc": "^2.0.3"
      },
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      },
      "optionalDependencies": {
        "lightningcss-android-arm64": "1.33.0",
        "lightningcss-darwin-arm64": "1.33.0",
        "lightningcss-darwin-x64": "1.33.0",
        "lightningcss-freebsd-x64": "1.33.0",
        "lightningcss-linux-arm-gnueabihf": "1.33.0",
        "lightningcss-linux-arm64-gnu": "1.33.0",
        "lightningcss-linux-arm64-musl": "1.33.0",
        "lightningcss-linux-x64-gnu": "1.33.0",
        "lightningcss-linux-x64-musl": "1.33.0",
        "lightningcss-win32-arm64-msvc": "1.33.0",
        "lightningcss-win32-x64-msvc": "1.33.0"
      }
    },
    "node_modules/lightningcss-android-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-android-arm64/-/lightningcss-android-arm64-1.33.0.tgz",
      "integrity": "sha512-gEpRTalKdosp4Bb8qWtc2iOgE5SeIHlpS1up9bFq2wAyYhl1UdTObYiHe98zEM9SQvSoqQZ1IQD0JNpg3Ml5pg==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "android"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-arm64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-arm64/-/lightningcss-darwin-arm64-1.33.0.tgz",
      "integrity": "sha512-Sciaz8eenNTKn9b3t7+xr0ipTp9YxKQY4npwQ3mrRuL0BAVHBLyZxofhaKBAVtzmtRZ/zTyo0/to4B1uWG/Djg==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-darwin-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-darwin-x64/-/lightningcss-darwin-x64-1.33.0.tgz",
      "integrity": "sha512-Z5UPAxzrjlWNNyGy6i65cJzzvgJ5D3T6wMvs+gWpY9d7qRhANrxqAp6LhxIgZhWEw18RfJTGcRxjuLIBr+m8XQ==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "darwin"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-freebsd-x64": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-freebsd-x64/-/lightningcss-freebsd-x64-1.33.0.tgz",
      "integrity": "sha512-QQM/Ti/hQajJwCY+RiWuCZ9sdtI/XQk7nDK5vC8kkdwixezOlDgvDx7+RT+QjK6FcFT4MpsuoBnHIo/O3StRRg==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "freebsd"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm-gnueabihf": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm-gnueabihf/-/lightningcss-linux-arm-gnueabihf-1.33.0.tgz",
      "integrity": "sha512-N7FVBe6iS24MlM6R/4RBTxGhQheZGs7tiQ9U32UtF75NzP5Q7xWPRqLBCKxlRQRk3rY1jCIPLzx7WzOhuUIRLQ==",
      "cpu": [
        "arm"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-gnu/-/lightningcss-linux-arm64-gnu-1.33.0.tgz",
      "integrity": "sha512-j2v/itmy4HlNxlc6voKXYgBqNi0Ng2LShg4z7GufpEgs05P+2suBVyi9I6YHq5uoVFx9ETin3eCEhLVyXGQnKg==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-arm64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-arm64-musl/-/lightningcss-linux-arm64-musl-1.33.0.tgz",
      "integrity": "sha512-yiO5ROMuYQgXbC60yjZU5CYSFZGKXL0HFATXt9mHJn1+zW55oCtMI9NfcVhYLMFDL7gV7oBPon/EmMMGg2OvtQ==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-gnu": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-gnu/-/lightningcss-linux-x64-gnu-1.33.0.tgz",
      "integrity": "sha512-ar+Ju7LmcN0Jo4FpL4hpFybwNG9/3A/Br5KW2n2jyODg3MEZXaDYADdemoNS+BDNfMgKvylJLj4S5tyRActuAg==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-linux-x64-musl": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-linux-x64-musl/-/lightningcss-linux-x64-musl-1.33.0.tgz",
      "integrity": "sha512-RYiYbkokw0trfKqqzfF55lginwEPrD3OJDfTuJzFs1MK6iFnDenaz1fqLLtX4ITG3OktJQXOeTaw1awrBAlZPw==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "linux"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-arm64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-arm64-msvc/-/lightningcss-win32-arm64-msvc-1.33.0.tgz",
      "integrity": "sha512-1K+MPfLSFVpphzpdbfkhlWk6wBrTObBzS2T6db10PNOZgR9GoVsAWzwNyuhUYYbTp23j+4RrncfujZ4uAzXvwA==",
      "cpu": [
        "arm64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/lightningcss-win32-x64-msvc": {
      "version": "1.33.0",
      "resolved": "https://registry.npmjs.org/lightningcss-win32-x64-msvc/-/lightningcss-win32-x64-msvc-1.33.0.tgz",
      "integrity": "sha512-OlEICDx/Xl0FqSp4bry8zFnCvGpig3Gl4gCquvYwHuqJKEC1+n9NgDniFvqHGmMv1ZkqDJrDqKKSykTDX+ehuA==",
      "cpu": [
        "x64"
      ],
      "license": "MPL-2.0",
      "optional": true,
      "os": [
        "win32"
      ],
      "engines": {
        "node": ">= 12.0.0"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/parcel"
      }
    },
    "node_modules/locate-path": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/locate-path/-/locate-path-6.0.0.tgz",
      "integrity": "sha512-iPZK6eYjbxRu3uB4/WZ3EsEIMJFMqAoopl3R+zuq0UjcAm/MO6KCweDgPfP3elTztoKP3KtnVHxTn2NHBSDVUw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-locate": "^5.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/lodash.debounce": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/lodash.debounce/-/lodash.debounce-4.0.8.tgz",
      "integrity": "sha512-FT1yDzDYEoYWhnSGnpE/4Kj1fLZkDFyqRb7fNt6FdYOSxlUWAtp42Eh6Wb0rGIv/m9Bgo7x4GhQbm5Ys4SG5ow==",
      "license": "MIT"
    },
    "node_modules/lodash.includes": {
      "version": "4.3.0",
      "resolved": "https://registry.npmjs.org/lodash.includes/-/lodash.includes-4.3.0.tgz",
      "integrity": "sha512-W3Bx6mdkRTGtlJISOvVD/lbqjTlPPUDTMnlXZFnVwi9NKJ6tiAk6LVdlhZMm17VZisqhKcgzpO5Wz91PCt5b0w==",
      "license": "MIT"
    },
    "node_modules/lodash.isboolean": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isboolean/-/lodash.isboolean-3.0.3.tgz",
      "integrity": "sha512-Bz5mupy2SVbPHURB98VAcw+aHh4vRV5IPNhILUCsOzRmsTmSQ17jIuqopAentWoehktxGd9e/hbIXq980/1QJg==",
      "license": "MIT"
    },
    "node_modules/lodash.isinteger": {
      "version": "4.0.4",
      "resolved": "https://registry.npmjs.org/lodash.isinteger/-/lodash.isinteger-4.0.4.tgz",
      "integrity": "sha512-DBwtEWN2caHQ9/imiNeEA5ys1JoRtRfY3d7V9wkqtbycnAmTvRRmbHKDV4a0EYc678/dia0jrte4tjYwVBaZUA==",
      "license": "MIT"
    },
    "node_modules/lodash.isnumber": {
      "version": "3.0.3",
      "resolved": "https://registry.npmjs.org/lodash.isnumber/-/lodash.isnumber-3.0.3.tgz",
      "integrity": "sha512-QYqzpfwO3/CWf3XP+Z+tkQsfaLL/EnUlXWVkIk5FUPc4sBdTehEqZONuyRt2P67PXAk+NXmTBcc97zw9t1FQrw==",
      "license": "MIT"
    },
    "node_modules/lodash.isplainobject": {
      "version": "4.0.6",
      "resolved": "https://registry.npmjs.org/lodash.isplainobject/-/lodash.isplainobject-4.0.6.tgz",
      "integrity": "sha512-oSXzaWypCMHkPC3NvBEaPHf0KsA5mvPrOPgQWDsbg8n7orZ290M0BmC/jgRZ4vcJ6DTAhjrsSYgdsW/F+MFOBA==",
      "license": "MIT"
    },
    "node_modules/lodash.isstring": {
      "version": "4.0.1",
      "resolved": "https://registry.npmjs.org/lodash.isstring/-/lodash.isstring-4.0.1.tgz",
      "integrity": "sha512-0wJxfxH1wgO3GrbuP+dTTk7op+6L41QCXbGINEmD+ny/G/eCqGzxyCsh7159S+mgDDcoarnBw6PC1PS5+wUGgw==",
      "license": "MIT"
    },
    "node_modules/lodash.merge": {
      "version": "4.6.2",
      "resolved": "https://registry.npmjs.org/lodash.merge/-/lodash.merge-4.6.2.tgz",
      "integrity": "sha512-0KpjqXRVvrYyCsX1swR/XTK0va6VQkQM6MNo7PqW77ByjAhoARA8EfrP1N4+KlKj8YS0ZUCtRT/YUuhyYDujIQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/lodash.once": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/lodash.once/-/lodash.once-4.1.1.tgz",
      "integrity": "sha512-Sb487aTOCr9drQVL8pIxOzVhafOjZN9UU54hiN8PU3uAiSV7lx1yYNpbNmex2PK6dSJoNTSJUUswT651yww3Mg==",
      "license": "MIT"
    },
    "node_modules/lodash.throttle": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/lodash.throttle/-/lodash.throttle-4.1.1.tgz",
      "integrity": "sha512-wIkUCfVKpVsWo3JSZlc+8MB5it+2AN5W8J7YVMST30UrvcQNZ1Okbj+rbVniijTWE6FGYy4XJq/rHkas8qJMLQ==",
      "license": "MIT"
    },
    "node_modules/log-symbols": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/log-symbols/-/log-symbols-2.2.0.tgz",
      "integrity": "sha512-VeIAFslyIerEJLXHziedo2basKbMKtTw3vfn5IzG0XTjhAVEJyNHnL2p7vc+wBDSdQuUpNw3M2u6xb9QsAY5Eg==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^2.0.1"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/log-symbols/node_modules/ansi-styles": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-3.2.1.tgz",
      "integrity": "sha512-VT0ZI6kZRdTh8YyJw3SMbYm/u+NqfsAxEpWO0Pf9sq8/e94WxxOpPKx9FR1FlyCtOVDNOQ+8ntlqFxiRc+r5qA==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^1.9.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/log-symbols/node_modules/chalk": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-2.4.2.tgz",
      "integrity": "sha512-Mti+f9lpJNcwF4tWV8/OrTTtF1gZi+f8FqlyAdouralcFWFQWF2+NgCHShjkCb+IFBLq9buZwE1xckQU4peSuQ==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^3.2.1",
        "escape-string-regexp": "^1.0.5",
        "supports-color": "^5.3.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/log-symbols/node_modules/color-convert": {
      "version": "1.9.3",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-1.9.3.tgz",
      "integrity": "sha512-QfAUtd+vFdAtFQcC8CCyYt1fYWxSqAiK2cSD6zDB8N3cpsEBAvRxp9zOGg6G/SHHJYAT88/az/IuDGALsNVbGg==",
      "license": "MIT",
      "dependencies": {
        "color-name": "1.1.3"
      }
    },
    "node_modules/log-symbols/node_modules/color-name": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.3.tgz",
      "integrity": "sha512-72fSenhMw2HZMTVHeCA9KCmpEIbzWiQsjN+BHcBbS9vr1mtt+vJjPdksIBNUmKAW8TFUDPJK5SUU3QhE9NEXDw==",
      "license": "MIT"
    },
    "node_modules/log-symbols/node_modules/has-flag": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-3.0.0.tgz",
      "integrity": "sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/log-symbols/node_modules/supports-color": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-5.5.0.tgz",
      "integrity": "sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==",
      "license": "MIT",
      "dependencies": {
        "has-flag": "^3.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/long": {
      "version": "5.3.2",
      "resolved": "https://registry.npmjs.org/long/-/long-5.3.2.tgz",
      "integrity": "sha512-mNAgZ1GmyNhD7AuqnTG3/VQ26o760+ZYBPKjPvugO8+nLbYfX6TVpJPseBvopbdY+qpZ/lKUnmEc1LeZYS3QAA==",
      "license": "Apache-2.0"
    },
    "node_modules/loose-envify": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz",
      "integrity": "sha512-lyuxPGr/Wfhrlem2CL/UcnUc1zcqKAImBDzukY7Y5F/yQiNdko6+fRLevlw1HgMySw7f611UIY408EtxRSoK3Q==",
      "license": "MIT",
      "dependencies": {
        "js-tokens": "^3.0.0 || ^4.0.0"
      },
      "bin": {
        "loose-envify": "cli.js"
      }
    },
    "node_modules/lru-cache": {
      "version": "5.1.1",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-5.1.1.tgz",
      "integrity": "sha512-KpNARQA3Iwv+jTA0utUVVbrh+Jlrr1Fv0e56GGzAFOXN7dk/FviaDW8LHmK52DlcH4WP2n6gI8vN1aesBFgo9w==",
      "license": "ISC",
      "dependencies": {
        "yallist": "^3.0.2"
      }
    },
    "node_modules/lru.min": {
      "version": "1.1.5",
      "resolved": "https://registry.npmjs.org/lru.min/-/lru.min-1.1.5.tgz",
      "integrity": "sha512-5J9ysMYUpYIg9RF2vJpy9SinEmSviFSe0GyPpCQ4L5QSkLAgeLXlTAOu2ZwWUU5m+0SBl6gUU1R1ZQB3aKypfA==",
      "license": "MIT",
      "engines": {
        "bun": ">=1.0.0",
        "deno": ">=1.30.0",
        "node": ">=8.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/sponsors/wellwelwel"
      }
    },
    "node_modules/makeerror": {
      "version": "1.0.12",
      "resolved": "https://registry.npmjs.org/makeerror/-/makeerror-1.0.12.tgz",
      "integrity": "sha512-JmqCvUhmt43madlpFzG4BQzG2Z3m6tvQDNKdClZnO3VbIudJYmxsT0FNJMeiB2+JTSlTQTSbU8QdesVmwJcmLg==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "tmpl": "1.0.5"
      }
    },
    "node_modules/math-intrinsics": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/math-intrinsics/-/math-intrinsics-1.1.0.tgz",
      "integrity": "sha512-/IXtbwEk5HTPyEwyKX6hGkYXxM9nbj64B+ilVJnC/R6B0pH5G4V3b0pVbL7DBj4tkhBAppbQUlf6F6Xl9LHu1g==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/media-typer": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/media-typer/-/media-typer-1.1.1.tgz",
      "integrity": "sha512-yz3xRaG20c6/BOzvYoDaGtPmGscs7YivItZEEqe6GbwNfHuxu9YNmvnEkMzKldAGY4/80pRcQRZSEnhquk9XuQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/memoize-one": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/memoize-one/-/memoize-one-5.2.1.tgz",
      "integrity": "sha512-zYiwtZUcYyXKo/np96AGZAckk+FWWsUdJ3cHGGmld7+AhvcWmQyGCYUh1hc4Q/pkOhb65dQR/pqCyK0cOaHz4Q==",
      "license": "MIT"
    },
    "node_modules/merge-descriptors": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-descriptors/-/merge-descriptors-2.0.0.tgz",
      "integrity": "sha512-Snk314V5ayFLhp3fkUREub6WtjBfPdCPY1Ln8/8munuLuiYhsABgBVWsozAG+MWMbVEvcdcpbi9R7ww22l9Q3g==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/merge-options": {
      "version": "3.0.4",
      "resolved": "https://registry.npmjs.org/merge-options/-/merge-options-3.0.4.tgz",
      "integrity": "sha512-2Sug1+knBjkaMsMgf1ctR1Ujx+Ayku4EdJN4Z+C2+JzoeF7A3OZ9KM2GY0CpQS51NR61LTurMJrRKPhSs3ZRTQ==",
      "license": "MIT",
      "dependencies": {
        "is-plain-obj": "^2.1.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/merge-stream": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/merge-stream/-/merge-stream-2.0.0.tgz",
      "integrity": "sha512-abv/qOcuPfk3URPfDzmZU1LKmuw8kT+0nIHvKrKgFrwifol/doWcdA4ZqsWQ8ENrFKkd67Mfpo/LovbIUsbt3w==",
      "license": "MIT"
    },
    "node_modules/metro": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro/-/metro-0.87.1.tgz",
      "integrity": "sha512-1oyLU9elM7hPAsKIqKooEekwxiuWr27+MZBhUROPhzcbXhMDxK64GPF/hCXwBZVp1F89ODavCrBmJtLx9WtBoQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.29.0",
        "@babel/core": "^7.25.2",
        "@babel/generator": "^7.29.1",
        "@babel/parser": "^7.29.0",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.29.0",
        "@babel/types": "^7.29.0",
        "accepts": "^2.0.0",
        "connect": "^3.6.5",
        "debug": "^4.4.0",
        "error-stack-parser": "^2.0.6",
        "flow-enums-runtime": "^0.0.6",
        "flow-parser": "0.331.0",
        "graceful-fs": "^4.2.4",
        "invariant": "^2.2.4",
        "jest-worker": "^29.7.0",
        "jsc-safe-url": "^0.2.2",
        "lodash.throttle": "^4.1.1",
        "metro-babel-transformer": "0.87.1",
        "metro-cache": "0.87.1",
        "metro-cache-key": "0.87.1",
        "metro-config": "0.87.1",
        "metro-core": "0.87.1",
        "metro-file-map": "0.87.1",
        "metro-resolver": "0.87.1",
        "metro-runtime": "0.87.1",
        "metro-source-map": "0.87.1",
        "metro-symbolicate": "0.87.1",
        "metro-transform-plugins": "0.87.1",
        "metro-transform-worker": "0.87.1",
        "mime-types": "^3.0.1",
        "nullthrows": "^1.1.1",
        "serialize-error": "^2.1.0",
        "source-map": "^0.5.6",
        "throat": "^5.0.0",
        "ws": "^7.5.10",
        "yargs": "^17.6.2"
      },
      "bin": {
        "metro": "src/cli.js"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-babel-transformer": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-babel-transformer/-/metro-babel-transformer-0.87.1.tgz",
      "integrity": "sha512-orvRIGpb0yK1yMbk5YP3dhVKjmoxUkRB9fdltGJxNppEqus/1tFpNuf9KnGFR3Qjg0izoUrJ4z6WgoBvdkXPrA==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.25.2",
        "flow-enums-runtime": "^0.0.6",
        "flow-parser": "0.331.0",
        "metro-cache-key": "0.87.1",
        "nullthrows": "^1.1.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-cache": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-cache/-/metro-cache-0.87.1.tgz",
      "integrity": "sha512-juNPaj0Xi5tkLp8imXqvbSnEIijwKG36m7OiFFVJMqEkiURwAjkMFVek3/xpix1+LVQqO7kjVp3PvuvIM61mKQ==",
      "license": "MIT",
      "dependencies": {
        "exponential-backoff": "^3.1.1",
        "flow-enums-runtime": "^0.0.6",
        "https-proxy-agent": "^7.0.5",
        "metro-core": "0.87.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-cache-key": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-cache-key/-/metro-cache-key-0.87.1.tgz",
      "integrity": "sha512-scqVVPMA2c+RVO12I3wyMDp5xCkRPLsyrcG4Qc3xfU5JR0EW/0sz2tjty+5UjMUtG09uiM1KYQ8HjWg7OQXHtw==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-config": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-config/-/metro-config-0.87.1.tgz",
      "integrity": "sha512-NmkDlc/qZAdo5gTkVTuO2AKE/khemRKRH5IA+SKfqUBJigI5GqZ5TOXhmEokhlkAqzjt8dyzKhzI6FHvXoXaTQ==",
      "license": "MIT",
      "dependencies": {
        "connect": "^3.6.5",
        "flow-enums-runtime": "^0.0.6",
        "jest-validate": "^29.7.0",
        "metro": "0.87.1",
        "metro-cache": "0.87.1",
        "metro-core": "0.87.1",
        "metro-runtime": "0.87.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-core": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-core/-/metro-core-0.87.1.tgz",
      "integrity": "sha512-xizzky/4+c/Mkznege8OW05j7bSdM39VPoEps61Se4+hf32UQujmbvLvIE9+UnP6kNEPVomk0Fw8NsBK9iRQmw==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6",
        "lodash.throttle": "^4.1.1",
        "metro-resolver": "0.87.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-file-map": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-file-map/-/metro-file-map-0.87.1.tgz",
      "integrity": "sha512-9sPuNCojC3pS4vj+ZPY7FXmHGpdJeckXuKXQrDAfJvZc60AF8owRFTkI8XdwlwrmPIB2w++KraK9FMEXvC4wJw==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "fb-watchman": "^2.0.0",
        "flow-enums-runtime": "^0.0.6",
        "graceful-fs": "^4.2.4",
        "invariant": "^2.2.4",
        "jest-worker": "^29.7.0",
        "micromatch": "^4.0.4",
        "nullthrows": "^1.1.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-minify-terser": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-minify-terser/-/metro-minify-terser-0.87.1.tgz",
      "integrity": "sha512-YK4k1oO1wV48hfE+Nbw2rJCnAgeabzrgT/xH5ha5n9gbK4p3HYFC898cERUiyTl9vRh58CNTiXRc88f7y6PfKg==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6",
        "terser": "^5.15.0"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-resolver": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-resolver/-/metro-resolver-0.87.1.tgz",
      "integrity": "sha512-FXH/brY69wT6sPxaSW8BhMmDGD/6irmBr/cL4rUi+VWwqR3pbvdcfUOfyjcHucgQ7pe5IW3xJY21eHKLVKNumQ==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-runtime": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-runtime/-/metro-runtime-0.87.1.tgz",
      "integrity": "sha512-kjeuSvInsM6OzBjkCQsWxnkrKZFMKtnkCl38oXWRI9lDGs2L9hGs9Tak9sQYJ9h3gtDujneB7wZio+irgqJKDw==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.25.0",
        "flow-enums-runtime": "^0.0.6"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-source-map": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-source-map/-/metro-source-map-0.87.1.tgz",
      "integrity": "sha512-Bqpm0PBGdy53pigIJb4HRF7QxD2pUOdgSmVh/4AWbP635kSCv+Y6ltVxUZgSnzS/QbSmzyCGijmRPlXMj2/qHw==",
      "license": "MIT",
      "dependencies": {
        "@babel/traverse": "^7.29.0",
        "@babel/types": "^7.29.0",
        "flow-enums-runtime": "^0.0.6",
        "invariant": "^2.2.4",
        "metro-symbolicate": "0.87.1",
        "nullthrows": "^1.1.1",
        "ob1": "0.87.1",
        "source-map": "^0.5.6",
        "vlq": "^1.0.0"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-symbolicate": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-symbolicate/-/metro-symbolicate-0.87.1.tgz",
      "integrity": "sha512-rcGvwabrg0lbXGRGRKl14PY3My3+dkno2jZYhdJEuH2DmjTtTkV5bYwgto4JtV/Lbe+sXE6GO1UGg654430uow==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6",
        "invariant": "^2.2.4",
        "metro-source-map": "0.87.1",
        "nullthrows": "^1.1.1",
        "source-map": "^0.5.6",
        "vlq": "^1.0.0"
      },
      "bin": {
        "metro-symbolicate": "src/index.js"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-transform-plugins": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-transform-plugins/-/metro-transform-plugins-0.87.1.tgz",
      "integrity": "sha512-qMiJ/x+VfqumFJJSefKS6nj8uojzC29b2/aK8vlMuFABIqGjDucICEOXd2Yt6k/XMFAgAcaJvShUOT0HLyYaPw==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.25.2",
        "@babel/generator": "^7.29.1",
        "@babel/template": "^7.28.6",
        "@babel/traverse": "^7.29.0",
        "flow-enums-runtime": "^0.0.6",
        "nullthrows": "^1.1.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/metro-transform-worker": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/metro-transform-worker/-/metro-transform-worker-0.87.1.tgz",
      "integrity": "sha512-VOzs3OV405FuOLYdAhqA2wsn1F9lvueDVxMDLvCKaQ44U+yknIqphJ9eMjjsGwLDZiJq9sW3DMLhjD27JxQgqQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/core": "^7.25.2",
        "@babel/generator": "^7.29.1",
        "@babel/parser": "^7.29.0",
        "@babel/types": "^7.29.0",
        "flow-enums-runtime": "^0.0.6",
        "metro": "0.87.1",
        "metro-babel-transformer": "0.87.1",
        "metro-cache": "0.87.1",
        "metro-cache-key": "0.87.1",
        "metro-minify-terser": "0.87.1",
        "metro-source-map": "0.87.1",
        "metro-transform-plugins": "0.87.1",
        "nullthrows": "^1.1.1"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/micromatch": {
      "version": "4.0.8",
      "resolved": "https://registry.npmjs.org/micromatch/-/micromatch-4.0.8.tgz",
      "integrity": "sha512-PXwfBhYu0hBCPw8Dn0E+WDYb7af3dSLVWKi3HGv84IdF4TyFoC0ysxFd0Goxw7nSv4T/PzEJQxsYsEiFCKo2BA==",
      "license": "MIT",
      "dependencies": {
        "braces": "^3.0.3",
        "picomatch": "^2.3.1"
      },
      "engines": {
        "node": ">=8.6"
      }
    },
    "node_modules/mime": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/mime/-/mime-1.6.0.tgz",
      "integrity": "sha512-x0Vn8spI+wuJ1O6S7gnbaQg8Pxh4NNHb7KSINmEWKiPE4RKOplvijn+NkmYmmRgP68mc70j2EbeTFRsrswaQeg==",
      "license": "MIT",
      "bin": {
        "mime": "cli.js"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/mime-db": {
      "version": "1.54.0",
      "resolved": "https://registry.npmjs.org/mime-db/-/mime-db-1.54.0.tgz",
      "integrity": "sha512-aU5EJuIN2WDemCcAp2vFBfp/m4EAhWJnUNSSw0ixs7/kXbd6Pg64EmwJkNdFhB8aWt1sH2CTXrLxo/iAGV3oPQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/mime-types": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/mime-types/-/mime-types-3.0.2.tgz",
      "integrity": "sha512-Lbgzdk0h4juoQ9fCKXW4by0UJqj+nOOrI9MJ1sSj4nI8aI2eo1qmvQEie4VD1glsS250n15LsWsYtCugiStS5A==",
      "license": "MIT",
      "dependencies": {
        "mime-db": "^1.54.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/mimic-fn": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/mimic-fn/-/mimic-fn-1.2.0.tgz",
      "integrity": "sha512-jf84uxzwiuiIVKiOLpfYk7N46TSy8ubTonmneY9vrpHNAnp0QBt2BxWV9dO3/j+BoVAb+a5G6YDPW3M5HOdMWQ==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/minimatch": {
      "version": "10.2.6",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-10.2.6.tgz",
      "integrity": "sha512-vpLQEs+VLCr1nU0BXS07maYoFwlDAH0gngQuuttxIwutDFEMHq2blX+8vpgxDdK3J1PwjCJiep77OitTZ4Ll1A==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "brace-expansion": "^5.0.8"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/minimist": {
      "version": "1.2.8",
      "resolved": "https://registry.npmjs.org/minimist/-/minimist-1.2.8.tgz",
      "integrity": "sha512-2yyAR8qBkN3YuheJanUpWC5U3bb5osDywNB8RzDVlDwDHbocAJveqqj1u8+SVD7jkWT4yvsHCpWqqWqAxb0zCA==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/minipass": {
      "version": "7.1.3",
      "resolved": "https://registry.npmjs.org/minipass/-/minipass-7.1.3.tgz",
      "integrity": "sha512-tEBHqDnIoM/1rXME1zgka9g6Q2lcoCkxHLuc7ODJ5BxbP5d4c2Z5cGgtXAku59200Cx7diuHTOYfSBD8n6mm8A==",
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=16 || 14 >=14.17"
      }
    },
    "node_modules/ms": {
      "version": "2.1.3",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.1.3.tgz",
      "integrity": "sha512-6FlzubTLZG3J2a/NVCAleEhjzq5oxgHyaCU9yYXvcLsvoVaHJq/s5xXI6/XXP6tz7R9xAOtHnSO/tXtF3WRTlA==",
      "license": "MIT"
    },
    "node_modules/multitars": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/multitars/-/multitars-1.0.2.tgz",
      "integrity": "sha512-6GwVw5eLi9sThdtlS4PKwC7yRLaf45pYhIEzKBHdKxi+YOXGKFX8acIniH+Uh/+k9mS2lQOupTccjoe5r0/1IQ==",
      "license": "MIT"
    },
    "node_modules/mysql2": {
      "version": "3.24.6",
      "resolved": "https://registry.npmjs.org/mysql2/-/mysql2-3.24.6.tgz",
      "integrity": "sha512-enu73KhbAua2L3dIxjc6qg6ZJ7H3pt1BImZASWNWY5xSsmJ1ZuUPULTDGXgmJbI61vb+nJAG19IZclIq19UidQ==",
      "license": "MIT",
      "dependencies": {
        "aws-ssl-profiles": "^1.1.2",
        "generate-function": "^2.3.1",
        "iconv-lite": "^0.7.3",
        "long": "^5.3.2",
        "lru.min": "^1.1.4",
        "named-placeholders": "^1.1.6",
        "sql-escaper": "^1.5.1"
      },
      "engines": {
        "node": ">= 8.0"
      },
      "peerDependencies": {
        "@types/node": ">= 8"
      }
    },
    "node_modules/named-placeholders": {
      "version": "1.1.6",
      "resolved": "https://registry.npmjs.org/named-placeholders/-/named-placeholders-1.1.6.tgz",
      "integrity": "sha512-Tz09sEL2EEuv5fFowm419c1+a/jSMiBjI9gHxVLrVdbUkkNUUfjsVYs9pVZu5oCon/kmRh9TfLEObFtkVxmY0w==",
      "license": "MIT",
      "dependencies": {
        "lru.min": "^1.1.0"
      },
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/nanoid": {
      "version": "3.3.20",
      "resolved": "https://registry.npmjs.org/nanoid/-/nanoid-3.3.20.tgz",
      "integrity": "sha512-uKdg2G3GNCKQn9byYOpxbGqrT2fGO5KRt5J/8b3pok8rT6qxGWF6hxMyJiEYtAf+FVyYuD9hRaDqX5uPFYJ4ZQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "bin": {
        "nanoid": "bin/nanoid.cjs"
      },
      "engines": {
        "node": "^10 || ^12 || ^13.7 || ^14 || >=15.0.1"
      }
    },
    "node_modules/napi-postinstall": {
      "version": "0.3.7",
      "resolved": "https://registry.npmjs.org/napi-postinstall/-/napi-postinstall-0.3.7.tgz",
      "integrity": "sha512-jyU4cU4kVAmy/3qjP+DcoQTNXfINHc+dFw54gGqWC8nu0mpV0kOnk7kff+J+Q18SbX0k3Np8Rm7yFjd3phatNQ==",
      "dev": true,
      "license": "MIT",
      "bin": {
        "napi-patch": "lib/patch.js",
        "napi-postinstall": "lib/cli.js"
      },
      "engines": {
        "node": "^12.20.0 || ^14.18.0 || >=16.0.0"
      },
      "funding": {
        "url": "https://opencollective.com/napi-postinstall"
      }
    },
    "node_modules/natural-compare": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/natural-compare/-/natural-compare-1.4.0.tgz",
      "integrity": "sha512-OWND8ei3VtNC9h7V60qff3SVobHr996CTwgxubgyQYEpg290h9J0buyECNNJexkFm5sOajh5G116RYA1c8ZMSw==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/negotiator": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/negotiator/-/negotiator-1.1.0.tgz",
      "integrity": "sha512-NMPBRMJgiQHjbd8phG3Vebdx4kZ1H121rbl5IkMqeOsahptB9BKo/d7oJ3zTXqTgagn2bWlNSXkh0QUGM31RYg==",
      "license": "MIT",
      "dependencies": {
        "content-type": "^2.1.0"
      },
      "engines": {
        "node": ">=18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/node-exports-info": {
      "version": "1.6.2",
      "resolved": "https://registry.npmjs.org/node-exports-info/-/node-exports-info-1.6.2.tgz",
      "integrity": "sha512-kXs9Go0cah0qHVV2v389IXQLdLCeE1xfFtjOAF+iobu0OIoG1pje8At2vMHyaPMiPMnG/LWP50twML21eMcAag==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "array.prototype.flatmap": "^1.3.3",
        "es-errors": "^1.3.0",
        "object.entries": "^1.1.9",
        "semver": "^6.3.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/node-exports-info/node_modules/semver": {
      "version": "6.3.1",
      "resolved": "https://registry.npmjs.org/semver/-/semver-6.3.1.tgz",
      "integrity": "sha512-BR7VvDCVHO+q2xBEWskxS6DJE1qRnb7DxzUrogb71CWoSficBxYsiAGd+Kl0mmq/MprG9yArRkyrQxTO6XjMzA==",
      "dev": true,
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      }
    },
    "node_modules/node-fetch": {
      "version": "2.7.0",
      "resolved": "https://registry.npmjs.org/node-fetch/-/node-fetch-2.7.0.tgz",
      "integrity": "sha512-c4FRfUm/dbcWZ7U+1Wq0AwCyFL+3nt2bEw05wfxSz+DWpWsitgmSgYmy2dQdWyKC1694ELPqMs/YzUSNozLt8A==",
      "license": "MIT",
      "dependencies": {
        "whatwg-url": "^5.0.0"
      },
      "engines": {
        "node": "4.x || >=6.0.0"
      },
      "peerDependencies": {
        "encoding": "^0.1.0"
      },
      "peerDependenciesMeta": {
        "encoding": {
          "optional": true
        }
      }
    },
    "node_modules/node-forge": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/node-forge/-/node-forge-1.4.0.tgz",
      "integrity": "sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==",
      "license": "(BSD-3-Clause OR GPL-2.0)",
      "engines": {
        "node": ">= 6.13.0"
      }
    },
    "node_modules/node-int64": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/node-int64/-/node-int64-0.4.0.tgz",
      "integrity": "sha512-O5lz91xSOeoXP6DulyHfllpq+Eg00MWitZIbtPfoSEvqIHdl5gfcY6hYzDWnj0qD5tz52PI08u9qUvSVeUBeHw==",
      "license": "MIT"
    },
    "node_modules/node-releases": {
      "version": "2.0.60",
      "resolved": "https://registry.npmjs.org/node-releases/-/node-releases-2.0.60.tgz",
      "integrity": "sha512-OmO8+GM1JUZqXET720VrJCwkjUCXmCMQm0Z3UDDRbfNLHS4NEAvY60j5jiFv0tkKw2PNNlqOLhahVmwJIOLDIQ==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/noxcturnal": {
      "version": "0.1.9",
      "resolved": "https://registry.npmjs.org/noxcturnal/-/noxcturnal-0.1.9.tgz",
      "integrity": "sha512-TzgJ3xjHpa/WLBNLnyj1eiy2lpNggv73RW0Fo9+xTGPMwdkIk2+G/H4w9uGBDjMZr7FccjS0CWyPq8dFYVnwGQ==",
      "license": "MIT",
      "dependencies": {
        "@babel/code-frame": "^7.20.0",
        "@oxc-project/types": "0.154.0"
      },
      "engines": {
        "node": ">=18"
      },
      "optionalDependencies": {
        "@noxcturnal/noxcturnal-darwin-arm64": "0.1.9",
        "@noxcturnal/noxcturnal-darwin-x64": "0.1.9",
        "@noxcturnal/noxcturnal-linux-arm64-gnu": "0.1.9",
        "@noxcturnal/noxcturnal-linux-arm64-musl": "0.1.9",
        "@noxcturnal/noxcturnal-linux-x64-gnu": "0.1.9",
        "@noxcturnal/noxcturnal-linux-x64-musl": "0.1.9",
        "@noxcturnal/noxcturnal-win32-arm64-msvc": "0.1.9",
        "@noxcturnal/noxcturnal-win32-x64-msvc": "0.1.9"
      }
    },
    "node_modules/npm-package-arg": {
      "version": "11.0.3",
      "resolved": "https://registry.npmjs.org/npm-package-arg/-/npm-package-arg-11.0.3.tgz",
      "integrity": "sha512-sHGJy8sOC1YraBywpzQlIKBE4pBbGbiF95U6Auspzyem956E0+FtDtsx1ZxlOJkQCZ1AFXAY/yuvtFYrOxF+Bw==",
      "license": "ISC",
      "dependencies": {
        "hosted-git-info": "^7.0.0",
        "proc-log": "^4.0.0",
        "semver": "^7.3.5",
        "validate-npm-package-name": "^5.0.0"
      },
      "engines": {
        "node": "^16.14.0 || >=18.0.0"
      }
    },
    "node_modules/nullthrows": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/nullthrows/-/nullthrows-1.1.1.tgz",
      "integrity": "sha512-2vPPEi+Z7WqML2jZYddDIfy5Dqb0r2fze2zTxNNknZaFpVHU3mFB3R+DWeJWGVx0ecvttSGlJTI+WG+8Z4cDWw==",
      "license": "MIT"
    },
    "node_modules/ob1": {
      "version": "0.87.1",
      "resolved": "https://registry.npmjs.org/ob1/-/ob1-0.87.1.tgz",
      "integrity": "sha512-i8iA8uij0g1YQzS8uOJPSRCgwDjO9warIHUAu1Fqj877Wc3wlfxDYBioYWgKTBF2+URVJttyDWSEpmd99nlvtQ==",
      "license": "MIT",
      "dependencies": {
        "flow-enums-runtime": "^0.0.6"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      }
    },
    "node_modules/object-assign": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/object-assign/-/object-assign-4.1.1.tgz",
      "integrity": "sha512-rJgTQnkUnH1sFw8yT6VSU3zD3sWmu6sZhIseY8VX+GRu3P6F7Fu+JNDoXfklElbLJSnc3FUQHVe4cU5hj+BcUg==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/object-inspect": {
      "version": "1.13.4",
      "resolved": "https://registry.npmjs.org/object-inspect/-/object-inspect-1.13.4.tgz",
      "integrity": "sha512-W67iLl4J2EXEGTbfeHCffrjDfitvLANg0UlX3wFUUSTx92KXRFegMHUVgSqE+wvhAbi4WqjGg9czysTV2Epbew==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object-keys": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/object-keys/-/object-keys-1.1.1.tgz",
      "integrity": "sha512-NuAESUOUMrlIXOfHKzD6bpPu3tYt3xvjNdRIQ+FeT0lNb4K8WR70CaDxhuNguS2XG+GjkyMwOzsN5ZktImfhLA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.assign": {
      "version": "4.1.7",
      "resolved": "https://registry.npmjs.org/object.assign/-/object.assign-4.1.7.tgz",
      "integrity": "sha512-nK28WOo+QIjBkDduTINE4JkF/UJJKyf2EJxvJKfblDpyg0Q+pkOHNTL0Qwy6NP6FhE/EnzV73BxxqcJaXY9anw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0",
        "has-symbols": "^1.1.0",
        "object-keys": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.entries": {
      "version": "1.1.9",
      "resolved": "https://registry.npmjs.org/object.entries/-/object.entries-1.1.9.tgz",
      "integrity": "sha512-8u/hfXFRBD1O0hPUjioLhoWFHRmt6tKA4/vZPyckBr18l1KE9uHrFaFaUi8MDRTpi4uak2goyPTSNJLXX2k2Hw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.fromentries": {
      "version": "2.0.8",
      "resolved": "https://registry.npmjs.org/object.fromentries/-/object.fromentries-2.0.8.tgz",
      "integrity": "sha512-k6E21FzySsSK5a21KRADBd/NGneRegFO5pLHfdQLpRDETUNJueLXs3WCzyQ3tFRDYgbq3KHGXfTbi2bs8WQ6rQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/object.groupby": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/object.groupby/-/object.groupby-1.0.3.tgz",
      "integrity": "sha512-+Lhy3TQTuzXI5hevh8sBGqbmurHbbIjAi0Z4S63nthVLmLxfbj4T54a4CfZrXIrt9iP4mVAPYMo/v99taj3wjQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/object.values": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/object.values/-/object.values-1.2.1.tgz",
      "integrity": "sha512-gXah6aZrcUxjWg2zR2MwouP2eHlCBzdV4pygudehaKXSGW4v2AsRQUK+lwwXhii6KFZcunEnmSUoYp5CXibxtA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "call-bound": "^1.0.3",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/on-finished": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.3.0.tgz",
      "integrity": "sha512-ikqdkGAAyf/X/gPhXGvfgAytDZtDbr+bkNUJ0N9h5MI/dmdgCs3l6hoHrcUv41sRKew3jIwrp4qQDXiK99Utww==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/on-headers": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/on-headers/-/on-headers-1.1.0.tgz",
      "integrity": "sha512-737ZY3yNnXy37FHkQxPzt4UZ2UWPWiCZWLvFZ4fu5cueciegX0zGPnrlY6bwRg4FdQOe9YU8MkmJwGhoMybl8A==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/once": {
      "version": "1.4.0",
      "resolved": "https://registry.npmjs.org/once/-/once-1.4.0.tgz",
      "integrity": "sha512-lNaJgI+2Q5URQBkccEKHTQOPaXdUxnZZElQTZY0MFUAuaEqe1E+Nyvgdz/aIyNi6Z9MzO5dv1H8n58/GELp3+w==",
      "license": "ISC",
      "dependencies": {
        "wrappy": "1"
      }
    },
    "node_modules/onetime": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/onetime/-/onetime-2.0.1.tgz",
      "integrity": "sha512-oyyPpiMaKARvvcgip+JV+7zci5L8D1W9RZIz2l1o08AM3pfspitVWnPt3mzHcBPp12oYMTy0pqrFs/C+m3EwsQ==",
      "license": "MIT",
      "dependencies": {
        "mimic-fn": "^1.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/open": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/open/-/open-8.4.2.tgz",
      "integrity": "sha512-7x81NCL719oNbsq/3mh+hVrAWmFuEYUqrq/Iw3kUzH8ReypT9QQ0BLoJS7/G9k6N81XjW4qHWtjWwe/9eLy1EQ==",
      "license": "MIT",
      "dependencies": {
        "define-lazy-prop": "^2.0.0",
        "is-docker": "^2.1.1",
        "is-wsl": "^2.2.0"
      },
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/optionator": {
      "version": "0.9.4",
      "resolved": "https://registry.npmjs.org/optionator/-/optionator-0.9.4.tgz",
      "integrity": "sha512-6IpQ7mKUxRcZNLIObR0hz7lxsapSSIYNZJwXPGeF0mTVqGKFIXj1DQcMoT22S3ROcLyY/rz0PWaWZ9ayWmad9g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "deep-is": "^0.1.3",
        "fast-levenshtein": "^2.0.6",
        "levn": "^0.4.1",
        "prelude-ls": "^1.2.1",
        "type-check": "^0.4.0",
        "word-wrap": "^1.2.5"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/ora": {
      "version": "3.4.0",
      "resolved": "https://registry.npmjs.org/ora/-/ora-3.4.0.tgz",
      "integrity": "sha512-eNwHudNbO1folBP3JsZ19v9azXWtQZjICdr3Q0TDPIaeBQ3mXLrh54wM+er0+hSp+dWKf+Z8KM58CYzEyIYxYg==",
      "license": "MIT",
      "dependencies": {
        "chalk": "^2.4.2",
        "cli-cursor": "^2.1.0",
        "cli-spinners": "^2.0.0",
        "log-symbols": "^2.2.0",
        "strip-ansi": "^5.2.0",
        "wcwidth": "^1.0.1"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/ora/node_modules/ansi-regex": {
      "version": "4.1.1",
      "resolved": "https://registry.npmjs.org/ansi-regex/-/ansi-regex-4.1.1.tgz",
      "integrity": "sha512-ILlv4k/3f6vfQ4OoP2AGvirOktlQ98ZEL1k9FaQjxa3L1abBgbuTDAdPOpvbGncC0BTVQrl+OM8xZGK6tWXt7g==",
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/ora/node_modules/ansi-styles": {
      "version": "3.2.1",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-3.2.1.tgz",
      "integrity": "sha512-VT0ZI6kZRdTh8YyJw3SMbYm/u+NqfsAxEpWO0Pf9sq8/e94WxxOpPKx9FR1FlyCtOVDNOQ+8ntlqFxiRc+r5qA==",
      "license": "MIT",
      "dependencies": {
        "color-convert": "^1.9.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/ora/node_modules/chalk": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-2.4.2.tgz",
      "integrity": "sha512-Mti+f9lpJNcwF4tWV8/OrTTtF1gZi+f8FqlyAdouralcFWFQWF2+NgCHShjkCb+IFBLq9buZwE1xckQU4peSuQ==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^3.2.1",
        "escape-string-regexp": "^1.0.5",
        "supports-color": "^5.3.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/ora/node_modules/color-convert": {
      "version": "1.9.3",
      "resolved": "https://registry.npmjs.org/color-convert/-/color-convert-1.9.3.tgz",
      "integrity": "sha512-QfAUtd+vFdAtFQcC8CCyYt1fYWxSqAiK2cSD6zDB8N3cpsEBAvRxp9zOGg6G/SHHJYAT88/az/IuDGALsNVbGg==",
      "license": "MIT",
      "dependencies": {
        "color-name": "1.1.3"
      }
    },
    "node_modules/ora/node_modules/color-name": {
      "version": "1.1.3",
      "resolved": "https://registry.npmjs.org/color-name/-/color-name-1.1.3.tgz",
      "integrity": "sha512-72fSenhMw2HZMTVHeCA9KCmpEIbzWiQsjN+BHcBbS9vr1mtt+vJjPdksIBNUmKAW8TFUDPJK5SUU3QhE9NEXDw==",
      "license": "MIT"
    },
    "node_modules/ora/node_modules/has-flag": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/has-flag/-/has-flag-3.0.0.tgz",
      "integrity": "sha512-sKJf1+ceQBr4SMkvQnBDNDtf4TXpVhVGateu0t918bl30FnbE2m4vNLX+VWe/dpjlb+HugGYzW7uQXH98HPEYw==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/ora/node_modules/strip-ansi": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-5.2.0.tgz",
      "integrity": "sha512-DuRs1gKbBqsMKIZlrffwlug8MHkcnpjs5VPmL1PAh+mA30U0DTotfDZ0d2UUsXpPmPmMMJ6W773MaA3J+lbiWA==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^4.1.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/ora/node_modules/supports-color": {
      "version": "5.5.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-5.5.0.tgz",
      "integrity": "sha512-QjVjwdXIt408MIiAqCX4oUKsgU2EqAGzs2Ppkm4aQYbjm+ZEWEcW4SfFNTr4uMNZma0ey4f5lgLrkB0aX0QMow==",
      "license": "MIT",
      "dependencies": {
        "has-flag": "^3.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/own-keys": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/own-keys/-/own-keys-1.0.2.tgz",
      "integrity": "sha512-19YVAg7T+WTrxggPukVq7DjTv6+PJ867TmhCvBsYwmbFCsZd344rq2Ld1p0wo8f8Qrrhgp82c6FJRqdXWtSEhg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.4",
        "get-intrinsic": "^1.3.0",
        "object-keys": "^1.1.1",
        "safe-push-apply": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/p-limit": {
      "version": "3.1.0",
      "resolved": "https://registry.npmjs.org/p-limit/-/p-limit-3.1.0.tgz",
      "integrity": "sha512-TYOanM3wGwNGsZN2cVTYPArw454xnXj5qmWF1bEoAc4+cU/ol7GVh7odevjp1FNHduHc3KZMcFduxU5Xc6uJRQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "yocto-queue": "^0.1.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/p-locate": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/p-locate/-/p-locate-5.0.0.tgz",
      "integrity": "sha512-LaNjtRWUBY++zB5nE/NwcaoMylSPk+S+ZHNB1TzdbMJMny6dynpAGt7X/tl/QYq3TIeE6nxHppbo2LGymrG5Pw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "p-limit": "^3.0.2"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/parent-module": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/parent-module/-/parent-module-1.0.1.tgz",
      "integrity": "sha512-GQ2EWRpQV8/o+Aw8YqtfZZPfNRWZYkbidE9k5rpl/hC3vtHHBfGm2Ifi6qWV+coDGkrUKZAxE3Lot5kcsRlh+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "callsites": "^3.0.0"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/parse-png": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/parse-png/-/parse-png-2.1.0.tgz",
      "integrity": "sha512-Nt/a5SfCLiTnQAjx3fHlqp8hRgTL3z7kTQZzvIMS9uCAepnCyjpdEc6M/sz69WqMBdaDBw9sF1F1UaHROYzGkQ==",
      "license": "MIT",
      "dependencies": {
        "pngjs": "^3.3.0"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/parseurl": {
      "version": "1.3.3",
      "resolved": "https://registry.npmjs.org/parseurl/-/parseurl-1.3.3.tgz",
      "integrity": "sha512-CiyeOxFT/JZyN5m0z9PfXw4SCBJ6Sygz1Dpl0wqjlhDEGGBP1GnsUVEL0p63hoG1fcj3fHynXi9NYO4nWOL+qQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/path-exists": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/path-exists/-/path-exists-4.0.0.tgz",
      "integrity": "sha512-ak9Qy5Q7jYb2Wwcey5Fpvg2KoAc/ZIhLSLOSBmRmygPsGwkVVt0fZa0qrtMz+m6tJTAHfZQ8FnmB4MG4LWy7/w==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-key": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/path-key/-/path-key-3.1.1.tgz",
      "integrity": "sha512-ojmeN0qd+y0jszEtoY48r0Peq5dwMEkIlCOu6Q5f41lfkswXuKtYrhgoTpLnyIcHm24Uhqx+5Tqm2InSwLhE6Q==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/path-parse": {
      "version": "1.0.7",
      "resolved": "https://registry.npmjs.org/path-parse/-/path-parse-1.0.7.tgz",
      "integrity": "sha512-LDJzPVEEEPR+y48z93A0Ed0yXb8pAByGWo/k5YYdYgpY2/2EsOsksJrq7lOHxryrVOn1ejG6oAp8ahvOIQD8sw==",
      "license": "MIT"
    },
    "node_modules/path-scurry": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/path-scurry/-/path-scurry-2.0.2.tgz",
      "integrity": "sha512-3O/iVVsJAPsOnpwWIeD+d6z/7PmqApyQePUtCndjatj/9I5LylHvt5qluFaBT3I5h3r1ejfR056c+FCv+NnNXg==",
      "license": "BlueOak-1.0.0",
      "dependencies": {
        "lru-cache": "^11.0.0",
        "minipass": "^7.1.2"
      },
      "engines": {
        "node": "18 || 20 || >=22"
      },
      "funding": {
        "url": "https://github.com/sponsors/isaacs"
      }
    },
    "node_modules/path-scurry/node_modules/lru-cache": {
      "version": "11.5.3",
      "resolved": "https://registry.npmjs.org/lru-cache/-/lru-cache-11.5.3.tgz",
      "integrity": "sha512-U4N8FgzmWxc8k1VH8Kr6lQg18U7Fjvby6wXHVRX/ZZ7IwWbRMgrRbP0Wrb5q5NVinryp4SQampHKdvtecItxUg==",
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": "20 || >=22"
      }
    },
    "node_modules/path-to-regexp": {
      "version": "8.4.2",
      "resolved": "https://registry.npmjs.org/path-to-regexp/-/path-to-regexp-8.4.2.tgz",
      "integrity": "sha512-qRcuIdP69NPm4qbACK+aDogI5CBDMi1jKe0ry5rSQJz8JVLsC7jV8XpiJjGRLLol3N+R5ihGYcrPLTno6pAdBA==",
      "license": "MIT",
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/picocolors": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/picocolors/-/picocolors-1.1.1.tgz",
      "integrity": "sha512-xceH2snhtb5M9liqDsmEw56le376mTZkEX/jEb/RxNFyegNul7eNslCXP9FDj/Lcu0X8KEyMceP2ntpaHrDEVA==",
      "license": "ISC"
    },
    "node_modules/picomatch": {
      "version": "2.3.2",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-2.3.2.tgz",
      "integrity": "sha512-V7+vQEJ06Z+c5tSye8S+nHUfI51xoXIXjHQ99cQtKUkQqqO1kO/KCJUfZXuB47h/YBlDhah2H3hdUGXn8ie0oA==",
      "license": "MIT",
      "engines": {
        "node": ">=8.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/playwright": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/playwright/-/playwright-1.64.1.tgz",
      "integrity": "sha512-HCrVhHr5QQuwYoswEUGTb7gGp522yflbv/ST8nF4sFWGuLjQCt17Q/EubpGGSNKYn1tsTCPZxqHhHCfVURu7UA==",
      "dev": true,
      "license": "Apache-2.0",
      "dependencies": {
        "playwright-core": "1.64.1"
      },
      "bin": {
        "playwright": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/playwright-core": {
      "version": "1.64.1",
      "resolved": "https://registry.npmjs.org/playwright-core/-/playwright-core-1.64.1.tgz",
      "integrity": "sha512-BC4s8y6SEVA6Q1rSxZTto8hI1KUI3xXlHGZgvGqP4IqPdI/a6FX9H29IDNz7vKo9l21b6LfYosScPL6M3xxyDQ==",
      "dev": true,
      "license": "Apache-2.0",
      "bin": {
        "playwright-core": "cli.js"
      },
      "engines": {
        "node": ">=20"
      }
    },
    "node_modules/plist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/plist/-/plist-3.1.1.tgz",
      "integrity": "sha512-ZIfcLJC+7E7FBFnDxm9MPmt7D+DidyQ26lewieO75AdhA2ayMtsJSES0iWzqJQbcVRSrTufQoy0DR94xHue0oA==",
      "license": "MIT",
      "dependencies": {
        "@xmldom/xmldom": "^0.9.10",
        "base64-js": "^1.5.1",
        "xmlbuilder": "^15.1.1"
      },
      "engines": {
        "node": ">=10.4.0"
      }
    },
    "node_modules/plist/node_modules/@xmldom/xmldom": {
      "version": "0.9.12",
      "resolved": "https://registry.npmjs.org/@xmldom/xmldom/-/xmldom-0.9.12.tgz",
      "integrity": "sha512-5AXjrcMClTryPe9LgZrygpB1lj7s0S9E0+W+AHaVKAVyHanafK86iPSvG5xHVSp/jC+VH1UXu0TAEmY279xH7A==",
      "license": "MIT",
      "engines": {
        "node": ">=14.6"
      }
    },
    "node_modules/pngjs": {
      "version": "3.4.0",
      "resolved": "https://registry.npmjs.org/pngjs/-/pngjs-3.4.0.tgz",
      "integrity": "sha512-NCrCHhWmnQklfH4MtJMRjZ2a8c80qXeMlQMv2uVp9ISJMTt562SbGd6n2oq0PaPgKm7Z6pL9E2UlLIhC+SHL3w==",
      "license": "MIT",
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/possible-typed-array-names": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/possible-typed-array-names/-/possible-typed-array-names-1.1.0.tgz",
      "integrity": "sha512-/+5VFTchJDoVj3bhoqi6UeymcD00DAwb1nJwamzPvHEszJ4FpF6SNNbUbOS8yI56qHzdV8eK0qEfOSiodkTdxg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/postcss": {
      "version": "8.5.31",
      "resolved": "https://registry.npmjs.org/postcss/-/postcss-8.5.31.tgz",
      "integrity": "sha512-YUbWYCgErwnMAVkjUnYa+KlMBzGpHwiIt/DE7f0G33AuX2LH9UcTk6KgWxd3zRU+pN3u/C+Xl3EnMLM4Hea7Sg==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/postcss/"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/postcss"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "nanoid": "^3.3.20",
        "picocolors": "^1.1.1",
        "source-map-js": "^1.2.2"
      },
      "engines": {
        "node": "^10 || ^12 || >=14"
      }
    },
    "node_modules/postcss-value-parser": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/postcss-value-parser/-/postcss-value-parser-4.2.0.tgz",
      "integrity": "sha512-1NNCs6uurfkVbeXG4S8JFT9t19m45ICnif8zWLd5oPSZ50QnwMfK+H3jv408d4jw/7Bttv5axS5IiHoLaVNHeQ==",
      "license": "MIT"
    },
    "node_modules/prelude-ls": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/prelude-ls/-/prelude-ls-1.2.1.tgz",
      "integrity": "sha512-vkcDPrRZo1QZLbn5RLGPpg/WmIQ65qoWWhcGKf/b5eplkkarX0m9z8ppCat4mlOqUsWpyNuYgO3VRyrYHSzX5g==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/pretty-format": {
      "version": "29.7.0",
      "resolved": "https://registry.npmjs.org/pretty-format/-/pretty-format-29.7.0.tgz",
      "integrity": "sha512-Pdlw/oPxN+aXdmM9R00JVC9WVFoCLTKJvDVLgmJ+qAffBMxsV85l/Lu7sNx4zSzPyoL2euImuEwHhOXdEgNFZQ==",
      "license": "MIT",
      "dependencies": {
        "@jest/schemas": "^29.6.3",
        "ansi-styles": "^5.0.0",
        "react-is": "^18.0.0"
      },
      "engines": {
        "node": "^14.15.0 || ^16.10.0 || >=18.0.0"
      }
    },
    "node_modules/pretty-format/node_modules/ansi-styles": {
      "version": "5.2.0",
      "resolved": "https://registry.npmjs.org/ansi-styles/-/ansi-styles-5.2.0.tgz",
      "integrity": "sha512-Cxwpt2SfTzTtXcfOlzGEee8O+c+MmUgGrNiBcXnuWxuFJHe6a5Hz7qwhwe5OgaSYI0IJvkLqWX1ASG+cJOkEiA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/ansi-styles?sponsor=1"
      }
    },
    "node_modules/proc-log": {
      "version": "4.2.0",
      "resolved": "https://registry.npmjs.org/proc-log/-/proc-log-4.2.0.tgz",
      "integrity": "sha512-g8+OnU/L2v+wyiVK+D5fA34J7EH8jZ8DDlvwhRCMxmMj7UCBvxiO1mGeN+36JXIKF4zevU4kRBd8lVgG9vLelA==",
      "license": "ISC",
      "engines": {
        "node": "^14.17.0 || ^16.13.0 || >=18.0.0"
      }
    },
    "node_modules/progress": {
      "version": "2.0.3",
      "resolved": "https://registry.npmjs.org/progress/-/progress-2.0.3.tgz",
      "integrity": "sha512-7PiHtLll5LdnKIMw100I+8xJXR5gW2QwWYkT6iJva0bXitZKa/XMrSbdmg3r2Xnaidz9Qumd0VPaMrZlF9V9sA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/promise": {
      "version": "8.3.0",
      "resolved": "https://registry.npmjs.org/promise/-/promise-8.3.0.tgz",
      "integrity": "sha512-rZPNPKTOYVNEEKFaq1HqTgOwZD+4/YHS5ukLzQCypkj+OkYx7iv0mA91lJlpPPZ8vMau3IIGj5Qlwrx+8iiSmg==",
      "license": "MIT",
      "dependencies": {
        "asap": "~2.0.6"
      }
    },
    "node_modules/prompts": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/prompts/-/prompts-2.4.2.tgz",
      "integrity": "sha512-NxNv/kLguCA7p3jE8oL2aEBsrJWgAakBpgmgK6lpPWV+WuOmY6r2/zbAVnP+T8bQlA0nzHXSJSJW0Hq7ylaD2Q==",
      "license": "MIT",
      "dependencies": {
        "kleur": "^3.0.3",
        "sisteransi": "^1.0.5"
      },
      "engines": {
        "node": ">= 6"
      }
    },
    "node_modules/prop-types": {
      "version": "15.8.1",
      "resolved": "https://registry.npmjs.org/prop-types/-/prop-types-15.8.1.tgz",
      "integrity": "sha512-oj87CgZICdulUohogVAR7AjlC0327U4el4L6eAvOqCeudMDVU0NThNaV+b9Df4dXgSP1gXMTnPdhfe/2qDH5cg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "loose-envify": "^1.4.0",
        "object-assign": "^4.1.1",
        "react-is": "^16.13.1"
      }
    },
    "node_modules/prop-types/node_modules/react-is": {
      "version": "16.13.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-16.13.1.tgz",
      "integrity": "sha512-24e6ynE2H+OKt4kqsOvNd8kBpV65zoxbA4BVsEOB3ARVWQki/DHzaUoC5KuON/BiccDaCCTZBuOcfZs70kR8bQ==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/proxy-addr": {
      "version": "2.0.8",
      "resolved": "https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.8.tgz",
      "integrity": "sha512-5nnx0yGyVUcY6t9RnWcARWtwT9F1D8O9rt08htPvnd49W1IgZtmLkhu9WfMzQj1cFxjHIO6connUNVW5k7AVyQ==",
      "license": "MIT",
      "dependencies": {
        "forwarded": "0.2.0",
        "ipaddr.js": "1.9.1"
      },
      "engines": {
        "node": ">= 0.10"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/punycode": {
      "version": "2.3.1",
      "resolved": "https://registry.npmjs.org/punycode/-/punycode-2.3.1.tgz",
      "integrity": "sha512-vYt7UD1U9Wg6138shLtLOvdAu+8DsC/ilFtEVHcH+wydcSpNE20AfSOduf6MkRFahL5FY7X1oU7nKVZFtfq8Fg==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/qs": {
      "version": "6.16.1",
      "resolved": "https://registry.npmjs.org/qs/-/qs-6.16.1.tgz",
      "integrity": "sha512-5Px6J7rfHBAGUhNQ3es4YzcOdBBw0SDcVtThJml4RdnKw4tKs2epA0kPZ+K8X+WiHktT93RHVcQ/3ym5aTCgtg==",
      "license": "BSD-3-Clause",
      "dependencies": {
        "es-define-property": "^1.0.1",
        "side-channel": "^1.1.1"
      },
      "engines": {
        "node": ">=0.6"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/range-parser": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/range-parser/-/range-parser-1.2.1.tgz",
      "integrity": "sha512-Hrgsx+orqoygnmhFbKaHE6c296J+HTAQXoxEF6gNupROmmGJRoyzfG3ccAveqCBrwr/2yxQ5BVd/GTl5agOwSg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/raw-body": {
      "version": "3.0.2",
      "resolved": "https://registry.npmjs.org/raw-body/-/raw-body-3.0.2.tgz",
      "integrity": "sha512-K5zQjDllxWkf7Z5xJdV0/B0WTNqx6vxG70zJE4N0kBs4LovmEYWJzQGxC9bS9RAKu3bgM40lrd5zoLJ12MQ5BA==",
      "license": "MIT",
      "dependencies": {
        "bytes": "~3.1.2",
        "http-errors": "~2.0.1",
        "iconv-lite": "~0.7.0",
        "unpipe": "~1.0.0"
      },
      "engines": {
        "node": ">= 0.10"
      }
    },
    "node_modules/react": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react/-/react-19.3.0.tgz",
      "integrity": "sha512-E8LUcbtBWt20bbl2YoHfx4ZDBdxVTfOKtCZn9cDSJ4l6/nuoApcpIBcj47t2wZoVX8g2ZHuMHbiShgCR1T5Sog==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/react-devtools-core": {
      "version": "6.1.5",
      "resolved": "https://registry.npmjs.org/react-devtools-core/-/react-devtools-core-6.1.5.tgz",
      "integrity": "sha512-ePrwPfxAnB+7hgnEr8vpKxL9cmnp7F322t8oqcPshbIQQhDKgFDW4tjhF2wjVbdXF9O/nyuy3sQWd9JGpiLPvA==",
      "license": "MIT",
      "dependencies": {
        "shell-quote": "^1.6.1",
        "ws": "^7"
      }
    },
    "node_modules/react-dom": {
      "version": "19.3.0",
      "resolved": "https://registry.npmjs.org/react-dom/-/react-dom-19.3.0.tgz",
      "integrity": "sha512-JDk8dgif51OjFoDE70+OT9ICyYr+69HlmihNwp1+Nsfbna3t5sIiCa9ZJktDmQ4/1b/rn26hIAR2uYXDMr5r0Q==",
      "license": "MIT",
      "dependencies": {
        "scheduler": "^0.28.0"
      },
      "peerDependencies": {
        "react": "^19.3.0"
      }
    },
    "node_modules/react-freeze": {
      "version": "1.0.4",
      "resolved": "https://registry.npmjs.org/react-freeze/-/react-freeze-1.0.4.tgz",
      "integrity": "sha512-r4F0Sec0BLxWicc7HEyo2x3/2icUTrRmDjaaRyzzn+7aDyFZliszMDOgLVwSnQnYENOlL1o569Ze2HZefk8clA==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "peerDependencies": {
        "react": ">=17.0.0"
      }
    },
    "node_modules/react-is": {
      "version": "18.3.1",
      "resolved": "https://registry.npmjs.org/react-is/-/react-is-18.3.1.tgz",
      "integrity": "sha512-/LLMVyas0ljjAtoYiPqYiL8VWXzUUdThrmU5+n20DZv+a+ClRoevUzw5JxU+Ieh5/c87ytoTBV9G1FiKfNJdmg==",
      "license": "MIT"
    },
    "node_modules/react-native": {
      "version": "0.88.0",
      "resolved": "https://registry.npmjs.org/react-native/-/react-native-0.88.0.tgz",
      "integrity": "sha512-v/wee0nYWcammMYBnSat/e3WY/5iaf9YQOMcBrfKT/wPApPPlHp94hgZovBtwhMuthR01yc/8cGn0FpFTE/C4A==",
      "license": "MIT",
      "dependencies": {
        "@react-native/asset-utils": "0.88.0",
        "@react-native/codegen": "0.88.0",
        "@react-native/community-cli-plugin": "0.88.0",
        "@react-native/gradle-plugin": "0.88.0",
        "@react-native/normalize-colors": "0.88.0",
        "@react-native/virtualized-lists": "0.88.0",
        "anser": "^1.4.9",
        "ansi-regex": "^5.0.0",
        "base64-js": "^1.5.1",
        "flow-enums-runtime": "^0.0.6",
        "flow-parser": "0.327.0",
        "hermes-compiler": "260318099.0.4",
        "invariant": "^2.2.4",
        "memoize-one": "^5.0.0",
        "metro-runtime": "^0.87.1",
        "metro-source-map": "^0.87.1",
        "nullthrows": "^1.1.1",
        "pretty-format": "^29.7.0",
        "promise": "^8.3.0",
        "react-devtools-core": "^6.1.5",
        "react-refresh": "^0.14.0",
        "regenerator-runtime": "^0.13.2",
        "scheduler": "0.28.0",
        "semver": "^7.1.3",
        "stacktrace-parser": "^0.1.10",
        "tinyglobby": "^0.2.15",
        "whatwg-fetch": "^3.0.0",
        "ws": "^7.5.10",
        "yargs": "^17.6.2"
      },
      "bin": {
        "react-native": "cli.js"
      },
      "engines": {
        "node": "^22.13.0 || ^24.3.0 || >= 26.0.0"
      },
      "peerDependencies": {
        "@types/react": "^19.1.1",
        "react": "^19.3.0"
      },
      "peerDependenciesMeta": {
        "@types/react": {
          "optional": true
        }
      }
    },
    "node_modules/react-native-safe-area-context": {
      "version": "5.10.1",
      "resolved": "https://registry.npmjs.org/react-native-safe-area-context/-/react-native-safe-area-context-5.10.1.tgz",
      "integrity": "sha512-ax0T3cAHQIhuAjDQpJ9C1Le96aRiM9PF+Kmgg7Y8+mD7QJMEIx04cG0eG3EGUTdvymgOkCrkakgZFwuOIuNQGw==",
      "license": "MIT",
      "peerDependencies": {
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/react-native-screens": {
      "version": "4.30.0",
      "resolved": "https://registry.npmjs.org/react-native-screens/-/react-native-screens-4.30.0.tgz",
      "integrity": "sha512-FrZG/Q5gqoDu0SgP4d2Ly0qdio5DR1KdGPEYImhkz7tmrhpML4C39m6RYLGd5TVLHZwcCh8NPvW9rylevjD0uQ==",
      "license": "MIT",
      "dependencies": {
        "react-freeze": "^1.0.0",
        "warn-once": "^0.1.0"
      },
      "peerDependencies": {
        "react": "*",
        "react-native": "*"
      }
    },
    "node_modules/react-native-web": {
      "version": "0.21.4",
      "resolved": "https://registry.npmjs.org/react-native-web/-/react-native-web-0.21.4.tgz",
      "integrity": "sha512-77B6KlalB4osNIck91TNFixPkYPsTbuNEvw8P7IV+4v4/5wZSBRKZnw0Zhx6YjuauDTz71gc8IW+fVhcBMjr5A==",
      "license": "MIT",
      "dependencies": {
        "@babel/runtime": "^7.18.6",
        "@react-native/normalize-colors": "^0.74.1",
        "fbjs": "^3.0.4",
        "inline-style-prefixer": "^7.0.1",
        "memoize-one": "^6.0.0",
        "nullthrows": "^1.1.1",
        "postcss-value-parser": "^4.2.0",
        "styleq": "^0.1.3"
      },
      "peerDependencies": {
        "react": "^18.0.0 || ^19.0.0",
        "react-dom": "^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/react-native-web/node_modules/@react-native/normalize-colors": {
      "version": "0.74.89",
      "resolved": "https://registry.npmjs.org/@react-native/normalize-colors/-/normalize-colors-0.74.89.tgz",
      "integrity": "sha512-qoMMXddVKVhZ8PA1AbUCk83trpd6N+1nF2A6k1i6LsQObyS92fELuk8kU/lQs6M7BsMHwqyLCpQJ1uFgNvIQXg==",
      "license": "MIT"
    },
    "node_modules/react-native-web/node_modules/memoize-one": {
      "version": "6.0.0",
      "resolved": "https://registry.npmjs.org/memoize-one/-/memoize-one-6.0.0.tgz",
      "integrity": "sha512-rkpe71W0N0c0Xz6QD0eJETuWAJGnJ9afsl1srmwPrI+yBCkge5EycXXbYRyvL29zZVUWQCY7InPRCv3GDXuZNw==",
      "license": "MIT"
    },
    "node_modules/react-native/node_modules/flow-estree": {
      "version": "0.327.0",
      "resolved": "https://registry.npmjs.org/flow-estree/-/flow-estree-0.327.0.tgz",
      "integrity": "sha512-f9vK751YUzD0qaHSpKc5/qQM6gqOlgGS+4ZRqTNcZOpVqn3mC55yEQ6dUG2K1eaVm5FbKkz9CFWe6XNvrkQFQg==",
      "license": "MIT",
      "engines": {
        "node": ">=18"
      }
    },
    "node_modules/react-native/node_modules/flow-parser": {
      "version": "0.327.0",
      "resolved": "https://registry.npmjs.org/flow-parser/-/flow-parser-0.327.0.tgz",
      "integrity": "sha512-/MYZ5hXWf5ozpbdfUDmazMgQXviLxWEiRLH3MppEGDdW0itRVqmB5UaU7QX+SBCDNiq+gEesSVn8nlxmPDyDkw==",
      "license": "MIT",
      "dependencies": {
        "flow-estree": "0.327.0"
      },
      "engines": {
        "node": ">=0.4.0"
      }
    },
    "node_modules/react-refresh": {
      "version": "0.14.2",
      "resolved": "https://registry.npmjs.org/react-refresh/-/react-refresh-0.14.2.tgz",
      "integrity": "sha512-jCvmsr+1IUSMUyzOkRcvnVbX3ZYC6g9TDrDbFuFmRDq7PD4yaGbLKNQL6k2jnArV8hjYxh7hVhAZB6s9HDGpZA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/reflect.getprototypeof": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/reflect.getprototypeof/-/reflect.getprototypeof-1.0.10.tgz",
      "integrity": "sha512-00o4I+DVrefhv+nX0ulyi3biSHCPDe+yLv5o/p6d/UVlirijB8E16FtfwSAi4g3tcqrQ4lRAqQSoFEZJehYEcw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.23.9",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0",
        "get-intrinsic": "^1.2.7",
        "get-proto": "^1.0.1",
        "which-builtin-type": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/regenerate": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/regenerate/-/regenerate-1.5.0.tgz",
      "integrity": "sha512-1s+CxXjJ71i7LNVy8nYwg47XV4y6lAnOEhsMtSKq3WpmPfhl9LuKlTqKIn/3yUpE8lBz+W+TT88Bxyhnr0U4yw==",
      "license": "MIT"
    },
    "node_modules/regenerate-unicode-properties": {
      "version": "10.3.0",
      "resolved": "https://registry.npmjs.org/regenerate-unicode-properties/-/regenerate-unicode-properties-10.3.0.tgz",
      "integrity": "sha512-9ns8odR8e9q3otKeHj3DE80jZYKg6zVeZKE+zQmRKXFoVUcuiTGeO6iusDhPRoIQQPVPRvH+SfBhrTud4eczuw==",
      "license": "MIT",
      "dependencies": {
        "regenerate": "^1.4.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/regenerator-runtime": {
      "version": "0.13.11",
      "resolved": "https://registry.npmjs.org/regenerator-runtime/-/regenerator-runtime-0.13.11.tgz",
      "integrity": "sha512-kY1AZVr2Ra+t+piVaJ4gxaFaReZVH40AKNo7UCX6W+dEwBo/2oZJzqfuN1qLq1oL45o56cPaTXELwrTh8Fpggg==",
      "license": "MIT"
    },
    "node_modules/regexp.prototype.flags": {
      "version": "1.5.4",
      "resolved": "https://registry.npmjs.org/regexp.prototype.flags/-/regexp.prototype.flags-1.5.4.tgz",
      "integrity": "sha512-dYqgNSZbDwkaJ2ceRd9ojCGjBq+mOm9LmtXnAnEGyHhN/5R7iDW2TRw3h+o/jCFxus3P2LfWIIiwowAjANm7IA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "define-properties": "^1.2.1",
        "es-errors": "^1.3.0",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "set-function-name": "^2.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/regexpu-core": {
      "version": "6.5.3",
      "resolved": "https://registry.npmjs.org/regexpu-core/-/regexpu-core-6.5.3.tgz",
      "integrity": "sha512-E8VgUoSK+LMQrLboDxavm76MTBGrQhx9RiNuomRmYnZ10Uw12HrI8fkxOOncktb2hBpzIZ9SV/347euQHG5z+g==",
      "license": "MIT",
      "dependencies": {
        "regenerate": "^1.5.0",
        "regenerate-unicode-properties": "^10.3.0",
        "regjsgen": "^0.8.0",
        "regjsparser": "^0.13.0",
        "unicode-match-property-ecmascript": "^2.0.0",
        "unicode-match-property-value-ecmascript": "^2.2.1"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/regjsgen": {
      "version": "0.8.0",
      "resolved": "https://registry.npmjs.org/regjsgen/-/regjsgen-0.8.0.tgz",
      "integrity": "sha512-RvwtGe3d7LvWiDQXeQw8p5asZUmfU1G/l6WbUXeHta7Y2PEIvBTwH6E2EfmYUK8pxcxEdEmaomqyp0vZZ7C+3Q==",
      "license": "MIT"
    },
    "node_modules/regjsparser": {
      "version": "0.13.4",
      "resolved": "https://registry.npmjs.org/regjsparser/-/regjsparser-0.13.4.tgz",
      "integrity": "sha512-EWV80YgFaVgFrjGCAsV7oybp4GOxbls5RzBg8OB0nKEVXsBJR1JlV8Di1JhCROg3MzTfe1RI8yitIm1eOs68iA==",
      "license": "BSD-2-Clause",
      "dependencies": {
        "jsesc": "~3.1.0"
      },
      "bin": {
        "regjsparser": "bin/parser"
      }
    },
    "node_modules/require-directory": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/require-directory/-/require-directory-2.1.1.tgz",
      "integrity": "sha512-fGxEI7+wsG9xrvdjsrlmL22OMTTiHRwAMroiEeMgq8gzoLC/PQr7RsRDSTLUg/bZAZtF+TVIkHc6/4RIKrui+Q==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/resolve": {
      "version": "1.22.13",
      "resolved": "https://registry.npmjs.org/resolve/-/resolve-1.22.13.tgz",
      "integrity": "sha512-Dj/cW9zBV2aRj6XzCxuGIs3ESZKv02jixne3q6jFZYZ3/Tg09gHHviSMDL4kObh9pqSahdRHEnDoaP2gn8YLhA==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "is-core-module": "^2.17.0",
        "path-parse": "^1.0.7",
        "supports-preserve-symlinks-flag": "^1.0.0"
      },
      "bin": {
        "resolve": "bin/resolve"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/resolve-from": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/resolve-from/-/resolve-from-5.0.0.tgz",
      "integrity": "sha512-qYg9KP24dD5qka9J47d0aVky0N+b4fTU89LN9iDnjB5waksiC49rvMB0PrUJQGoTmH50XPiqOvAjDfaijGxYZw==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/resolve-pkg-maps": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/resolve-pkg-maps/-/resolve-pkg-maps-1.0.0.tgz",
      "integrity": "sha512-seS2Tj26TBVOC2NIc2rOe2y2ZO7efxITtLZcGSOnHHNOQ7CkiUBfw0Iw2ck6xkIhPwLhKNLS8BO+hEpngQlqzw==",
      "dev": true,
      "license": "MIT",
      "funding": {
        "url": "https://github.com/privatenumber/resolve-pkg-maps?sponsor=1"
      }
    },
    "node_modules/resolve-workspace-root": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/resolve-workspace-root/-/resolve-workspace-root-2.0.1.tgz",
      "integrity": "sha512-nR23LHAvaI6aHtMg6RWoaHpdR4D881Nydkzi2CixINyg9T00KgaJdJI6Vwty+Ps8WLxZHuxsS0BseWjxSA4C+w==",
      "license": "MIT"
    },
    "node_modules/restore-cursor": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/restore-cursor/-/restore-cursor-2.0.0.tgz",
      "integrity": "sha512-6IzJLuGi4+R14vwagDHX+JrXmPVtPpn4mffDJ1UdR7/Edm87fl6yi8mMBIVvFtJaNTUvjughmW4hwLhRG7gC1Q==",
      "license": "MIT",
      "dependencies": {
        "onetime": "^2.0.0",
        "signal-exit": "^3.0.2"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/router": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/router/-/router-2.2.0.tgz",
      "integrity": "sha512-nLTrUKm2UyiL7rlhapu/Zl45FwNgkZGaCpZbIHajDYgwlJCOzLSk+cIPAnsEqV955GjILJnKbdQC1nVPz+gAYQ==",
      "license": "MIT",
      "dependencies": {
        "debug": "^4.4.0",
        "depd": "^2.0.0",
        "is-promise": "^4.0.0",
        "parseurl": "^1.3.3",
        "path-to-regexp": "^8.0.0"
      },
      "engines": {
        "node": ">= 18"
      }
    },
    "node_modules/safe-array-concat": {
      "version": "1.1.4",
      "resolved": "https://registry.npmjs.org/safe-array-concat/-/safe-array-concat-1.1.4.tgz",
      "integrity": "sha512-wtZlHyOje6OZTGqAoaDKxFkgRtkF9CnHAVnCHKfuj200wAgL+bSJhdsCD2l0Qx/2ekEXjPWcyKkfGb5CPboslg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "get-intrinsic": "^1.3.0",
        "has-symbols": "^1.1.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">=0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-buffer": {
      "version": "5.2.1",
      "resolved": "https://registry.npmjs.org/safe-buffer/-/safe-buffer-5.2.1.tgz",
      "integrity": "sha512-rp3So07KcdmmKbGvgaNxQSJr7bGVSVk5S9Eq1F+ppbRo70+YeaDxkw5Dd8NPN+GD6bjnYm2VuPuCXmpuYvmCXQ==",
      "funding": [
        {
          "type": "github",
          "url": "https://github.com/sponsors/feross"
        },
        {
          "type": "patreon",
          "url": "https://www.patreon.com/feross"
        },
        {
          "type": "consulting",
          "url": "https://feross.org/support"
        }
      ],
      "license": "MIT"
    },
    "node_modules/safe-push-apply": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/safe-push-apply/-/safe-push-apply-1.0.0.tgz",
      "integrity": "sha512-iKE9w/Z7xCzUMIZqdBsp6pEQvwuEebH4vdpjcDWnyzaI6yl6O9FHvVpmGelvEHNsoY6wGblkxR6Zty/h00WiSA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "isarray": "^2.0.5"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safe-regex-test": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/safe-regex-test/-/safe-regex-test-1.1.0.tgz",
      "integrity": "sha512-x/+Cz4YrimQxQccJf5mKEbIa1NzeCRNI5Ecl/ekmlYaampdNLPalVyIcCZNNH3MvmqBugV5TMYZXv0ljslUlaw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "is-regex": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/safer-buffer": {
      "version": "2.1.2",
      "resolved": "https://registry.npmjs.org/safer-buffer/-/safer-buffer-2.1.2.tgz",
      "integrity": "sha512-YZo3K82SD7Riyi0E1EQPojLz7kpepnSQI9IyPbHHg1XXXevb5dJI7tpyN2ADxGcQbHG7vcyRHk0cbwqcQriUtg==",
      "license": "MIT"
    },
    "node_modules/sandbox-cli-detector": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/sandbox-cli-detector/-/sandbox-cli-detector-0.2.0.tgz",
      "integrity": "sha512-4lyHX0ZU0AZKwjgZ1InxZAa3PNpyEb8rOQ+Zss1ReYmhNzW0Q+h1zE5nvniXN0HaAWZaZE1zgVNEirb0R7LmNg==",
      "license": "MIT",
      "bin": {
        "sandbox-cli-detector": "dist/cli.js"
      },
      "engines": {
        "node": ">=18.18"
      }
    },
    "node_modules/sax": {
      "version": "1.6.1",
      "resolved": "https://registry.npmjs.org/sax/-/sax-1.6.1.tgz",
      "integrity": "sha512-42tBVwLWnaQvW5zc4HbZrTuWccECCZfBi92FDuwtqxasH+JbPB3/FOKb1m222K42R4WxuxzzMsTswfzgtSu64Q==",
      "license": "BlueOak-1.0.0",
      "engines": {
        "node": ">=11.0.0"
      }
    },
    "node_modules/scheduler": {
      "version": "0.28.0",
      "resolved": "https://registry.npmjs.org/scheduler/-/scheduler-0.28.0.tgz",
      "integrity": "sha512-juorfCmIkIw8tT+p5BXSm6PJjQF/ycEYmKyzURCIt/RaZIhL+PulbQ9Yu2z1HdOJDdqDTlxA1+xKBmHXJsczAw==",
      "license": "MIT"
    },
    "node_modules/semver": {
      "version": "7.8.5",
      "resolved": "https://registry.npmjs.org/semver/-/semver-7.8.5.tgz",
      "integrity": "sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==",
      "license": "ISC",
      "bin": {
        "semver": "bin/semver.js"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/send": {
      "version": "0.19.2",
      "resolved": "https://registry.npmjs.org/send/-/send-0.19.2.tgz",
      "integrity": "sha512-VMbMxbDeehAxpOtWJXlcUS5E8iXh6QmN+BkRX1GARS3wRaXEEgzCcB10gTQazO42tpNIya8xIyNx8fll1OFPrg==",
      "license": "MIT",
      "dependencies": {
        "debug": "2.6.9",
        "depd": "2.0.0",
        "destroy": "1.2.0",
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "etag": "~1.8.1",
        "fresh": "~0.5.2",
        "http-errors": "~2.0.1",
        "mime": "1.6.0",
        "ms": "2.1.3",
        "on-finished": "~2.4.1",
        "range-parser": "~1.2.1",
        "statuses": "~2.0.2"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/send/node_modules/debug": {
      "version": "2.6.9",
      "resolved": "https://registry.npmjs.org/debug/-/debug-2.6.9.tgz",
      "integrity": "sha512-bC7ElrdJaJnPbAP+1EotYvqZsb3ecl5wi6Bfi6BJTUcNowp6cvspg0jXznRTKDjm/E7AdgFBVeAPVMNcKGsHMA==",
      "license": "MIT",
      "dependencies": {
        "ms": "2.0.0"
      }
    },
    "node_modules/send/node_modules/debug/node_modules/ms": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/ms/-/ms-2.0.0.tgz",
      "integrity": "sha512-Tpp60P6IUJDTuOq/5Z8cdskzJujfwqfOTkrwIwj7IRISpnkJnT6SyJ4PCPnGMoFjC9ddhal5KVIYtAt97ix05A==",
      "license": "MIT"
    },
    "node_modules/send/node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/send/node_modules/on-finished": {
      "version": "2.4.2",
      "resolved": "https://registry.npmjs.org/on-finished/-/on-finished-2.4.2.tgz",
      "integrity": "sha512-ATWUv387i+nLD49EiDoOft5scf32Vsdz3ktrQJG9bi7jRFmaXTssvyvj1EmeKVVgvesbqUtvQQvaS2TpTukAZQ==",
      "license": "MIT",
      "dependencies": {
        "ee-first": "1.1.1"
      },
      "engines": {
        "node": ">= 0.8"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/send/node_modules/statuses": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-2.0.2.tgz",
      "integrity": "sha512-DvEy55V3DB7uknRo+4iOGT5fP1slR8wQohVdknigZPMpMstaKJQWhwiYBACJE3Ul2pTnATihhBYnRhZQHGBiRw==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/serialize-error": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/serialize-error/-/serialize-error-2.1.0.tgz",
      "integrity": "sha512-ghgmKt5o4Tly5yEG/UJp8qTd0AN7Xalw4XBtDEKP655B699qMEtra1WlXeE6WIvdEG481JvRxULKsInq/iNysw==",
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/serve-static": {
      "version": "1.16.3",
      "resolved": "https://registry.npmjs.org/serve-static/-/serve-static-1.16.3.tgz",
      "integrity": "sha512-x0RTqQel6g5SY7Lg6ZreMmsOzncHFU7nhnRWkKgWuMTu5NN0DR5oruckMqRvacAN9d5w6ARnRBXl9xhDCgfMeA==",
      "license": "MIT",
      "dependencies": {
        "encodeurl": "~2.0.0",
        "escape-html": "~1.0.3",
        "parseurl": "~1.3.3",
        "send": "~0.19.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/serve-static/node_modules/encodeurl": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/encodeurl/-/encodeurl-2.0.0.tgz",
      "integrity": "sha512-Q0n9HRi4m6JuGIV1eFlmvJB7ZEVxu93IrMyiMsGC0lrMJMWzRgx6WGquyfQgZVb31vhGgXnfmPNNXmxnOkRBrg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/set-function-length": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/set-function-length/-/set-function-length-1.2.2.tgz",
      "integrity": "sha512-pgRc4hJ4/sNjWCSS9AmnS40x3bNMDTknHgL5UaMBTMyJnU90EgWh1Rz+MC9eFu4BuN/UwZjKQuY/1v3rM7HMfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "function-bind": "^1.1.2",
        "get-intrinsic": "^1.2.4",
        "gopd": "^1.0.1",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-function-name": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/set-function-name/-/set-function-name-2.0.2.tgz",
      "integrity": "sha512-7PGFlmtwsEADb0WYyvCMa1t+yke6daIG4Wirafur5kcf+MhUnPms1UeR0CKQdTZD81yESwMHbtn+TR+dMviakQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-data-property": "^1.1.4",
        "es-errors": "^1.3.0",
        "functions-have-names": "^1.2.3",
        "has-property-descriptors": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/set-proto": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/set-proto/-/set-proto-1.0.0.tgz",
      "integrity": "sha512-RJRdvCo6IAnPdsvP/7m6bsQqNnn1FCBX5ZNtFL98MmFF/4xAIJTIg1YbHW5DC2W5SKZanrC6i4HsJqlajw/dZw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "dunder-proto": "^1.0.1",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/setimmediate": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/setimmediate/-/setimmediate-1.0.5.tgz",
      "integrity": "sha512-MATJdZp8sLqDl/68LfQmbP8zKPLQNV6BIZoIgrscFDQ+RsvK/BxeDQOgyxKKoh0y/8h3BqVFnCqQ/gd+reiIXA==",
      "license": "MIT"
    },
    "node_modules/setprototypeof": {
      "version": "1.2.0",
      "resolved": "https://registry.npmjs.org/setprototypeof/-/setprototypeof-1.2.0.tgz",
      "integrity": "sha512-E5LDX7Wrp85Kil5bhZv46j8jOeboKq5JMmYM3gVGdGH8xFpPWXUMsNrlODCrkoxMEeNi/XZIwuRvY4XNwYMJpw==",
      "license": "ISC"
    },
    "node_modules/sf-symbols-typescript": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/sf-symbols-typescript/-/sf-symbols-typescript-2.2.0.tgz",
      "integrity": "sha512-TPbeg0b7ylrswdGCji8FRGFAKuqbpQlLbL8SOle3j1iHSs5Ob5mhvMAxWN2UItOjgALAB5Zp3fmMfj8mbWvXKw==",
      "license": "MIT",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/shebang-command": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/shebang-command/-/shebang-command-2.0.0.tgz",
      "integrity": "sha512-kHxr2zZpYtdmrN1qDjrrX/Z1rR1kG8Dx+gkpK1G4eXmvXswmcE1hTWBWYUzlraYw1/yZp6YuDY77YtvbN0dmDA==",
      "license": "MIT",
      "dependencies": {
        "shebang-regex": "^3.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shebang-regex": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/shebang-regex/-/shebang-regex-3.0.0.tgz",
      "integrity": "sha512-7++dFhtcx3353uBaq8DDR4NuxBetBzC7ZQOhmTQInHEd6bSrXdiEyzCvG07Z44UYdLShWUyXt5M/yhz8ekcb1A==",
      "license": "MIT",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/shell-quote": {
      "version": "1.12.0",
      "resolved": "https://registry.npmjs.org/shell-quote/-/shell-quote-1.12.0.tgz",
      "integrity": "sha512-PcByqNyT/38F2kDNi006HAMRJaULuBzq/FOsw3qdZvX/GA9W/jamDaRskgHjubHiftXK5sIFxLNkvrXUwcof6Q==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/side-channel/-/side-channel-1.1.1.tgz",
      "integrity": "sha512-6x6dK6zJdpTzF4sQeNYxwtvBzf6Eg4GtlesS94HOvTudUeyK2WXAaIfmDgsyslYrRBeFIlsi54AYsFGUuhmvrQ==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4",
        "side-channel-list": "^1.0.1",
        "side-channel-map": "^1.0.1",
        "side-channel-weakmap": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-list": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-list/-/side-channel-list-1.0.1.tgz",
      "integrity": "sha512-mjn/0bi/oUURjc5Xl7IaWi/OJJJumuoJFQJfDDyO46+hBWsfaVM65TBHq2eoZBhzl9EchxOijpkbRC8SVBQU0w==",
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "object-inspect": "^1.13.4"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-map": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/side-channel-map/-/side-channel-map-1.0.1.tgz",
      "integrity": "sha512-VCjCNfgMsby3tTdo02nbjtM/ewra6jPHmpThenkTYh8pG9ucZ/1P8So4u4FGBek/BjpOVsDCMoLA/iuBKIFXRA==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/side-channel-weakmap": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/side-channel-weakmap/-/side-channel-weakmap-1.0.2.tgz",
      "integrity": "sha512-WPS/HvHQTYnHisLo9McqBHOJk2FkHO/tlpvldyrnem4aeQp4hai3gythswg6p01oSoTl58rcpiFAjF2br2Ak2A==",
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "es-errors": "^1.3.0",
        "get-intrinsic": "^1.2.5",
        "object-inspect": "^1.13.3",
        "side-channel-map": "^1.0.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/signal-exit": {
      "version": "3.0.7",
      "resolved": "https://registry.npmjs.org/signal-exit/-/signal-exit-3.0.7.tgz",
      "integrity": "sha512-wnD2ZE+l+SPC/uoS0vXeE9L1+0wuaMqKlfz9AMUo38JsyLSBWSFcHR1Rri62LZc12vLr1gb3jl7iwQhgwpAbGQ==",
      "license": "ISC"
    },
    "node_modules/simple-plist": {
      "version": "1.3.1",
      "resolved": "https://registry.npmjs.org/simple-plist/-/simple-plist-1.3.1.tgz",
      "integrity": "sha512-iMSw5i0XseMnrhtIzRb7XpQEXepa9xhWxGUojHBL43SIpQuDQkh3Wpy67ZbDzZVr6EKxvwVChnVpdl8hEVLDiw==",
      "license": "MIT",
      "dependencies": {
        "bplist-creator": "0.1.0",
        "bplist-parser": "0.3.1",
        "plist": "^3.0.5"
      }
    },
    "node_modules/simple-swizzle": {
      "version": "0.2.4",
      "resolved": "https://registry.npmjs.org/simple-swizzle/-/simple-swizzle-0.2.4.tgz",
      "integrity": "sha512-nAu1WFPQSMNr2Zn9PGSZK9AGn4t/y97lEm+MXTtUDwfP0ksAIX4nO+6ruD9Jwut4C49SB1Ws+fbXsm/yScWOHw==",
      "license": "MIT",
      "dependencies": {
        "is-arrayish": "^0.3.1"
      }
    },
    "node_modules/sisteransi": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/sisteransi/-/sisteransi-1.0.5.tgz",
      "integrity": "sha512-bLGGlR1QxBcynn2d5YmDX4MGjlZvy2MRBDRNHLJ8VI6l6+9FUiyTFNJ0IveOSP0bcXgVDPRcfGqA0pjaqUpfVg==",
      "license": "MIT"
    },
    "node_modules/slugify": {
      "version": "1.6.9",
      "resolved": "https://registry.npmjs.org/slugify/-/slugify-1.6.9.tgz",
      "integrity": "sha512-vZ7rfeehZui7wQs438JXBckYLkIIdfHOXsaVEUMyS5fHo1483l1bMdo0EDSWYclY0yZKFOipDy4KHuKs6ssvdg==",
      "license": "MIT",
      "engines": {
        "node": ">=8.0.0"
      }
    },
    "node_modules/source-map": {
      "version": "0.5.7",
      "resolved": "https://registry.npmjs.org/source-map/-/source-map-0.5.7.tgz",
      "integrity": "sha512-LbrmJOMUSdEVxIKvdcJzQC+nQhe8FUZQTXQy6+I75skNgn3OoQ0DZA8YnFa7gp8tqtL3KPf1kmo0R5DoApeSGQ==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/source-map-js": {
      "version": "1.2.2",
      "resolved": "https://registry.npmjs.org/source-map-js/-/source-map-js-1.2.2.tgz",
      "integrity": "sha512-KGj/8Y43x35aZVDtt+J4mK1hoLGHULMYfSkODJNQjNDC3oW1PqPoxMwo0pLUsWM/UEGzON/NxeHywEfNXNP3Vw==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/source-map-support": {
      "version": "0.5.21",
      "resolved": "https://registry.npmjs.org/source-map-support/-/source-map-support-0.5.21.tgz",
      "integrity": "sha512-uBHU3L3czsIyYXKX88fdrGovxdSCoTGDRZ6SYXtSRxLZUzHg5P/66Ht6uoUlHu9EZod+inXhKo3qQgwXUT/y1w==",
      "license": "MIT",
      "dependencies": {
        "buffer-from": "^1.0.0",
        "source-map": "^0.6.0"
      }
    },
    "node_modules/source-map-support/node_modules/source-map": {
      "version": "0.6.1",
      "resolved": "https://registry.npmjs.org/source-map/-/source-map-0.6.1.tgz",
      "integrity": "sha512-UjgapumWlbMhkBgzT7Ykc5YXUT46F0iKu8SGXq0bcwP5dz/h0Plj6enJqjz1Zbq2l5WaqYnrVbwWOWMyF3F47g==",
      "license": "BSD-3-Clause",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/sql-escaper": {
      "version": "1.5.2",
      "resolved": "https://registry.npmjs.org/sql-escaper/-/sql-escaper-1.5.2.tgz",
      "integrity": "sha512-6CKD38c31SENivxOADeMNLdukOnUxUcflKtzVWzace7Riv1v7cAEym5Cx9Q7gYZ3ezIJI7ZpqecQq8cqNeSSFg==",
      "license": "MIT",
      "engines": {
        "bun": ">=1.0.0",
        "deno": ">=2.0.0",
        "node": ">=12.0.0"
      },
      "funding": {
        "type": "github",
        "url": "https://github.com/mysqljs/sql-escaper?sponsor=1"
      }
    },
    "node_modules/stable-hash": {
      "version": "0.0.5",
      "resolved": "https://registry.npmjs.org/stable-hash/-/stable-hash-0.0.5.tgz",
      "integrity": "sha512-+L3ccpzibovGXFK+Ap/f8LOS0ahMrHTf3xu7mMLSpEGU0EO9ucaysSylKo9eRDFNhWve/y275iPmIZ4z39a9iA==",
      "dev": true,
      "license": "MIT"
    },
    "node_modules/stackframe": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/stackframe/-/stackframe-1.3.4.tgz",
      "integrity": "sha512-oeVtt7eWQS+Na6F//S4kJ2K2VbRlS9D43mAlMyVpVWovy9o+jfgH8O9agzANzaiLjclA0oYzUXEM4PurhSUChw==",
      "license": "MIT"
    },
    "node_modules/stacktrace-parser": {
      "version": "0.1.11",
      "resolved": "https://registry.npmjs.org/stacktrace-parser/-/stacktrace-parser-0.1.11.tgz",
      "integrity": "sha512-WjlahMgHmCJpqzU8bIBy4qtsZdU9lRlcZE3Lvyej6t4tuOuv1vk57OW3MBrj6hXBFx/nNoC9MPMTcr5YA7NQbg==",
      "license": "MIT",
      "dependencies": {
        "type-fest": "^0.7.1"
      },
      "engines": {
        "node": ">=6"
      }
    },
    "node_modules/standard-navigation": {
      "version": "0.0.8",
      "resolved": "https://registry.npmjs.org/standard-navigation/-/standard-navigation-0.0.8.tgz",
      "integrity": "sha512-TyVbo7INUDWtsUWDFn8RR7kwR87U0S4xHfLfbbnyeC581TmmyqQ+eM+nPw8rQTSD8QitRVcYfPaSHr/QJiUy1g==",
      "license": "MIT",
      "peerDependencies": {
        "react": "*"
      }
    },
    "node_modules/statuses": {
      "version": "1.5.0",
      "resolved": "https://registry.npmjs.org/statuses/-/statuses-1.5.0.tgz",
      "integrity": "sha512-OpZ3zP+jT1PI7I8nemJX4AKmAX070ZkYPVWV/AaKTJl+tXCTGyVdC1a4SL8RUQYEwk/f34ZX8UTykN68FwrqAA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.6"
      }
    },
    "node_modules/stop-iteration-iterator": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/stop-iteration-iterator/-/stop-iteration-iterator-1.1.0.tgz",
      "integrity": "sha512-eLoXW/DHyl62zxY4SCaIgnRhuMr6ri4juEYARS8E6sCEqzKpOiE521Ucofdx+KnDZl5xmvGYaaKCk5FEOxJCoQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "es-errors": "^1.3.0",
        "internal-slot": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/stream-buffers": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/stream-buffers/-/stream-buffers-2.2.0.tgz",
      "integrity": "sha512-uyQK/mx5QjHun80FLJTfaWE7JtwfRMKBLkMne6udYOmvH0CawotVa7TfgYHzAnpphn4+TweIx1QKMnRIbipmUg==",
      "license": "Unlicense",
      "engines": {
        "node": ">= 0.10.0"
      }
    },
    "node_modules/string-width": {
      "version": "4.2.3",
      "resolved": "https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz",
      "integrity": "sha512-wKyQRQpjJ0sIp62ErSZdGsjMJWsap5oRNihHhu6G7JVO/9jIB6UyevL+tXuOqrng8j/cxKTWyWUwvSTriiZz/g==",
      "license": "MIT",
      "dependencies": {
        "emoji-regex": "^8.0.0",
        "is-fullwidth-code-point": "^3.0.0",
        "strip-ansi": "^6.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/string.prototype.matchall": {
      "version": "4.1.0",
      "resolved": "https://registry.npmjs.org/string.prototype.matchall/-/string.prototype.matchall-4.1.0.tgz",
      "integrity": "sha512-tHNHTxInrYLCga9O9YGxWA3G9/nnzQw8UGAyqGx3Ar1pSTTzIuM4woFSq4SowkXCjJIwq5sIiQvEfRI9tCH1qQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-errors": "^1.3.0",
        "es-object-atoms": "^1.1.2",
        "get-intrinsic": "^1.3.0",
        "gopd": "^1.2.0",
        "has-symbols": "^1.1.0",
        "internal-slot": "^1.1.0",
        "regexp.prototype.flags": "^1.5.4",
        "set-function-name": "^2.0.2",
        "side-channel": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.repeat": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/string.prototype.repeat/-/string.prototype.repeat-1.0.0.tgz",
      "integrity": "sha512-0u/TldDbKD8bFCQ/4f5+mNRrXwZ8hg2w7ZR8wa16e8z9XpePWl3eGEcUD0OXpEH/VJH/2G3gjUtR3ZOiBe2S/w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "define-properties": "^1.1.3",
        "es-abstract": "^1.17.5"
      }
    },
    "node_modules/string.prototype.trim": {
      "version": "1.2.11",
      "resolved": "https://registry.npmjs.org/string.prototype.trim/-/string.prototype.trim-1.2.11.tgz",
      "integrity": "sha512-PwvK7BU+CMTJGYQCTZb5RWXIML92lftJLhQz1tBzgKiqGxJaMlBAa48POXaNAC2s4y8jr3EFqrkF9+44neS46w==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-data-property": "^1.1.4",
        "define-properties": "^1.2.1",
        "es-abstract": "^1.24.2",
        "es-object-atoms": "^1.1.2",
        "has-property-descriptors": "^1.0.2",
        "safe-regex-test": "^1.1.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimend": {
      "version": "1.0.10",
      "resolved": "https://registry.npmjs.org/string.prototype.trimend/-/string.prototype.trimend-1.0.10.tgz",
      "integrity": "sha512-2+3aDAOmPTmuFwjDnmJG2ctEkQKVki7vOSqaxkv42Mowj1V6PnvuwFCRrR5lChUux1TBskPjfkeTOhqczDMxTw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.1.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/string.prototype.trimstart": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/string.prototype.trimstart/-/string.prototype.trimstart-1.0.8.tgz",
      "integrity": "sha512-UXSH262CSZY1tfu3G3Secr6uGLCFVPMhIqHjlgCUtCCcgihYc/xKs9djMTMUOb2j1mVSeU8EU6NWc/iQKU6Gfg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.7",
        "define-properties": "^1.2.1",
        "es-object-atoms": "^1.0.0"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/strip-ansi": {
      "version": "6.0.1",
      "resolved": "https://registry.npmjs.org/strip-ansi/-/strip-ansi-6.0.1.tgz",
      "integrity": "sha512-Y38VPSHcqkFrCpFnQ9vuSXmquuv5oXOKpGeT6aGrr3o3Gc9AlVa6JBfUSOCnbxGGZF+/0ooI7KrPuUSztUdU5A==",
      "license": "MIT",
      "dependencies": {
        "ansi-regex": "^5.0.1"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/strip-bom": {
      "version": "3.0.0",
      "resolved": "https://registry.npmjs.org/strip-bom/-/strip-bom-3.0.0.tgz",
      "integrity": "sha512-vavAMRXOgBVNF6nyEEmL3DBK19iRpDcoIwW+swQ+CbGiu7lju6t+JklA1MHweoWtadgt4ISVUsXLyDq34ddcwA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/strip-json-comments": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/strip-json-comments/-/strip-json-comments-3.1.1.tgz",
      "integrity": "sha512-6fPc+R4ihwqP6N/aIv2f1gMH8lOVtWQHoqC4yK6oSDVVocumAsfCqjkXnqiYMhmMwS/mEHLp7Vehlt3ql6lEig==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/structured-headers": {
      "version": "0.4.1",
      "resolved": "https://registry.npmjs.org/structured-headers/-/structured-headers-0.4.1.tgz",
      "integrity": "sha512-0MP/Cxx5SzeeZ10p/bZI0S6MpgD+yxAhi1BOQ34jgnMXsCq3j1t6tQnZu+KdlL7dvJTLT3g9xN8tl10TqgFMcg==",
      "license": "MIT"
    },
    "node_modules/styleq": {
      "version": "0.1.3",
      "resolved": "https://registry.npmjs.org/styleq/-/styleq-0.1.3.tgz",
      "integrity": "sha512-3ZUifmCDCQanjeej1f6kyl/BeP/Vae5EYkQ9iJfUm/QwZvlgnZzyflqAsAWYURdtea8Vkvswu2GrC57h3qffcA==",
      "license": "MIT"
    },
    "node_modules/supports-color": {
      "version": "7.2.0",
      "resolved": "https://registry.npmjs.org/supports-color/-/supports-color-7.2.0.tgz",
      "integrity": "sha512-qpCAvRl9stuOHveKsn7HncJRvv501qIacKzQlO/+Lwxc9+0q2wLyv4Dfvt80/DPn2pqOBsJdDiogXGR9+OvwRw==",
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-hyperlinks": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/supports-hyperlinks/-/supports-hyperlinks-2.3.0.tgz",
      "integrity": "sha512-RpsAZlpWcDwOPQA22aCH4J0t7L8JmAvsCxfOSEwm7cQs3LshN36QaTkwd70DnBOXDWGssw2eUoc8CaRWT0XunA==",
      "license": "MIT",
      "dependencies": {
        "has-flag": "^4.0.0",
        "supports-color": "^7.0.0"
      },
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/supports-preserve-symlinks-flag": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/supports-preserve-symlinks-flag/-/supports-preserve-symlinks-flag-1.0.0.tgz",
      "integrity": "sha512-ot0WnXS9fgdkgIcePe6RHNk1WA8+muPa6cSjeR3V8K27q9BB1rTE3R1p7Hv0z1ZyAc8s6Vvv8DIyWf681MAt0w==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/terminal-link": {
      "version": "2.1.1",
      "resolved": "https://registry.npmjs.org/terminal-link/-/terminal-link-2.1.1.tgz",
      "integrity": "sha512-un0FmiRUQNr5PJqy9kP7c40F5BOfpGlYTrxonDChEZB7pzZxRNp/bt+ymiy9/npwXya9KH99nJ/GXFIiUkYGFQ==",
      "license": "MIT",
      "dependencies": {
        "ansi-escapes": "^4.2.1",
        "supports-hyperlinks": "^2.0.0"
      },
      "engines": {
        "node": ">=8"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/terser": {
      "version": "5.51.2",
      "resolved": "https://registry.npmjs.org/terser/-/terser-5.51.2.tgz",
      "integrity": "sha512-bWnjSNscmuI+GJze6ZupnHP8G/cTcsJF+bXCeQknk2SHQsgbNJnLrqiH9jZ2W4STPVXH2mDKKRX3iwPhc9Cn/Q==",
      "license": "BSD-2-Clause",
      "dependencies": {
        "@jridgewell/source-map": "^0.3.3",
        "acorn": "^8.15.0",
        "commander": "^2.20.0",
        "source-map-support": "~0.5.20"
      },
      "bin": {
        "terser": "bin/terser"
      },
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/terser/node_modules/commander": {
      "version": "2.20.3",
      "resolved": "https://registry.npmjs.org/commander/-/commander-2.20.3.tgz",
      "integrity": "sha512-GpVkmM8vF2vQUkj2LvZmD35JxeJOLCwJ9cUkugyk2nuhbv3+mJvpLYYt+0+USMxE+oj+ey/lJEnhZw75x/OMcQ==",
      "license": "MIT"
    },
    "node_modules/throat": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/throat/-/throat-5.0.0.tgz",
      "integrity": "sha512-fcwX4mndzpLQKBS1DVYhGAcYaYt7vsHNIvQV+WXMvnow5cgjPphq5CaayLaGsjRdSCKZFNGt7/GYAuXaNOiYCA==",
      "license": "MIT"
    },
    "node_modules/tinyglobby": {
      "version": "0.2.17",
      "resolved": "https://registry.npmjs.org/tinyglobby/-/tinyglobby-0.2.17.tgz",
      "integrity": "sha512-wXR/dYpcqKmfWpEdZjiKJOwCNFndD0DMnrW/cYjVGttEkBfVgcLFHoNrlj47mjOVic9yyNu65alsgF4NQyTa2g==",
      "license": "MIT",
      "dependencies": {
        "fdir": "^6.5.0",
        "picomatch": "^4.0.4"
      },
      "engines": {
        "node": ">=12.0.0"
      },
      "funding": {
        "url": "https://github.com/sponsors/SuperchupuDev"
      }
    },
    "node_modules/tinyglobby/node_modules/fdir": {
      "version": "6.5.0",
      "resolved": "https://registry.npmjs.org/fdir/-/fdir-6.5.0.tgz",
      "integrity": "sha512-tIbYtZbucOs0BRGqPJkshJUYdL+SDH7dVM8gjy+ERp3WAUjLEFJE+02kanyHtwjWOnwrKYBiwAmM0p4kLJAnXg==",
      "license": "MIT",
      "engines": {
        "node": ">=12.0.0"
      },
      "peerDependencies": {
        "picomatch": "^3 || ^4"
      },
      "peerDependenciesMeta": {
        "picomatch": {
          "optional": true
        }
      }
    },
    "node_modules/tinyglobby/node_modules/picomatch": {
      "version": "4.0.7",
      "resolved": "https://registry.npmjs.org/picomatch/-/picomatch-4.0.7.tgz",
      "integrity": "sha512-qcJu88Q2IWqJsDD529JKMdwGm/dvInW4HvQnRwiH9JtihJvzGOscDtHE3x1pBKeUOTysQ8kVmLnJ2kJu7yhcGA==",
      "license": "MIT",
      "engines": {
        "node": ">=12"
      },
      "funding": {
        "url": "https://github.com/sponsors/jonschlinkert"
      }
    },
    "node_modules/tmpl": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/tmpl/-/tmpl-1.0.5.tgz",
      "integrity": "sha512-3f0uOEAQwIqGuWW2MVzYg8fV/QNnc/IpuJNG837rLuczAaLVHslWHZQj4IGiEl5Hs3kkbhwL9Ab7Hrsmuj+Smw==",
      "license": "BSD-3-Clause"
    },
    "node_modules/to-regex-range": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/to-regex-range/-/to-regex-range-5.0.1.tgz",
      "integrity": "sha512-65P7iz6X5yEr1cwcgvQxbbIw7Uk3gOy5dIdtZ4rDveLqhrdJP+Li/Hx6tyK0NEb+2GCyneCMJiGqrADCSNk8sQ==",
      "license": "MIT",
      "dependencies": {
        "is-number": "^7.0.0"
      },
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/toidentifier": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/toidentifier/-/toidentifier-1.0.1.tgz",
      "integrity": "sha512-o5sSPKEkg/DIQNmH43V0/uerLrpzVedkUh8tGNvaeXpfpuwjKenlSox/2O/BTlZUtEe+JG7s5YhEz608PlAHRA==",
      "license": "MIT",
      "engines": {
        "node": ">=0.6"
      }
    },
    "node_modules/toqr": {
      "version": "0.1.1",
      "resolved": "https://registry.npmjs.org/toqr/-/toqr-0.1.1.tgz",
      "integrity": "sha512-FWAPzCIHZHnrE/5/w9MPk0kK25hSQSH2IKhYh9PyjS3SG/+IEMvlwIHbhz+oF7xl54I+ueZlVnMjyzdSwLmAwA==",
      "license": "MIT"
    },
    "node_modules/tr46": {
      "version": "0.0.3",
      "resolved": "https://registry.npmjs.org/tr46/-/tr46-0.0.3.tgz",
      "integrity": "sha512-N3WMsuqV66lT30CrXNbEjx4GEwlow3v6rr4mCcv6prnfwhS01rkgyFdjPNBYd9br7LpXV1+Emh01fHnq2Gdgrw==",
      "license": "MIT"
    },
    "node_modules/ts-api-utils": {
      "version": "2.5.0",
      "resolved": "https://registry.npmjs.org/ts-api-utils/-/ts-api-utils-2.5.0.tgz",
      "integrity": "sha512-OJ/ibxhPlqrMM0UiNHJ/0CKQkoKF243/AEmplt3qpRgkW8VG7IfOS41h7V8TjITqdByHzrjcS/2si+y4lIh8NA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.12"
      },
      "peerDependencies": {
        "typescript": ">=4.8.4"
      }
    },
    "node_modules/tsconfig-paths": {
      "version": "3.15.0",
      "resolved": "https://registry.npmjs.org/tsconfig-paths/-/tsconfig-paths-3.15.0.tgz",
      "integrity": "sha512-2Ac2RgzDe/cn48GvOe3M+o82pEFewD3UPbyoUHHdKasHwJKjds4fLXWf/Ux5kATBKN20oaFGu+jbElp1pos0mg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "@types/json5": "^0.0.29",
        "json5": "^1.0.2",
        "minimist": "^1.2.6",
        "strip-bom": "^3.0.0"
      }
    },
    "node_modules/tsconfig-paths/node_modules/json5": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/json5/-/json5-1.0.2.tgz",
      "integrity": "sha512-g1MWMLBiz8FKi1e4w0UyVL3w+iJceWAFBAaBnnGKOpNa5f8TLktkbre1+s6oICydWAm+HRUGTmI+//xv2hvXYA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "minimist": "^1.2.0"
      },
      "bin": {
        "json5": "lib/cli.js"
      }
    },
    "node_modules/tslib": {
      "version": "2.8.1",
      "resolved": "https://registry.npmjs.org/tslib/-/tslib-2.8.1.tgz",
      "integrity": "sha512-oJFu94HQb+KVduSUQL7wnpmqnfmLsOA/nAh6b6EH0wCEoK0/mPeXU6c3wKDV83MkOuHPRHtSXKKU99IBazS/2w==",
      "dev": true,
      "license": "0BSD",
      "optional": true
    },
    "node_modules/type-check": {
      "version": "0.4.0",
      "resolved": "https://registry.npmjs.org/type-check/-/type-check-0.4.0.tgz",
      "integrity": "sha512-XleUoc9uwGXqjWwXaUTZAmzMcFZ5858QA2vvx1Ur5xIcixXIP+8LnFDgRplU30us6teqdlskFfu+ae4K79Ooew==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "prelude-ls": "^1.2.1"
      },
      "engines": {
        "node": ">= 0.8.0"
      }
    },
    "node_modules/type-fest": {
      "version": "0.7.1",
      "resolved": "https://registry.npmjs.org/type-fest/-/type-fest-0.7.1.tgz",
      "integrity": "sha512-Ne2YiiGN8bmrmJJEuTWTLJR32nh/JdL1+PSicowtNb0WFpn59GK8/lfD61bVtzguz7b3PBt74nxpv/Pw5po5Rg==",
      "license": "(MIT OR CC0-1.0)",
      "engines": {
        "node": ">=8"
      }
    },
    "node_modules/type-is": {
      "version": "2.1.0",
      "resolved": "https://registry.npmjs.org/type-is/-/type-is-2.1.0.tgz",
      "integrity": "sha512-faYHw0anBbc/kWF3zFTEnxSFOAGUX9GFbOBthvDdLsIlEoWOFOtS0zgCiQYwIskL9iGXZL3kAXD8OoZ4GmMATA==",
      "license": "MIT",
      "dependencies": {
        "content-type": "^2.0.0",
        "media-typer": "^1.1.0",
        "mime-types": "^3.0.0"
      },
      "engines": {
        "node": ">= 18"
      },
      "funding": {
        "type": "opencollective",
        "url": "https://opencollective.com/express"
      }
    },
    "node_modules/typed-array-buffer": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-buffer/-/typed-array-buffer-1.0.3.tgz",
      "integrity": "sha512-nAYYwfY3qnzX30IkA6AQZjVbtK6duGontcQm1WSG1MD94YLqK0515GNApXkoxKOWMusVssAHWLh9SeaoefYFGw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "es-errors": "^1.3.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      }
    },
    "node_modules/typed-array-byte-length": {
      "version": "1.0.3",
      "resolved": "https://registry.npmjs.org/typed-array-byte-length/-/typed-array-byte-length-1.0.3.tgz",
      "integrity": "sha512-BaXgOuIxz8n8pIq3e7Atg/7s+DpiYrxn4vdot3w9KbnBhcRQq6o3xemQdIfynqSeXeDrF32x+WvfzmOjPiY9lg==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.8",
        "for-each": "^0.3.3",
        "gopd": "^1.2.0",
        "has-proto": "^1.2.0",
        "is-typed-array": "^1.1.14"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-byte-offset": {
      "version": "1.0.5",
      "resolved": "https://registry.npmjs.org/typed-array-byte-offset/-/typed-array-byte-offset-1.0.5.tgz",
      "integrity": "sha512-0FHJvLPqZ7KJzp17O13jfsAjsqazgrxBu2zEK95PmUz8lv2+GjRuxUInCr2Rk9Dms3ihN21zJ929ZO43yJ95QQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.9",
        "for-each": "^0.3.5",
        "gopd": "^1.2.0",
        "is-typed-array": "^1.1.15",
        "reflect.getprototypeof": "^1.0.10"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typed-array-length": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/typed-array-length/-/typed-array-length-1.0.8.tgz",
      "integrity": "sha512-phPGCwqr2+Qo0fwniCE8e4pKnGu/yFb5nD5Y8bf0EEeiI5GklnACYA9GFy/DrAeRrKHXvHn+1SUsOWgJp6RO+g==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bind": "^1.0.9",
        "for-each": "^0.3.5",
        "gopd": "^1.2.0",
        "is-typed-array": "^1.1.15",
        "possible-typed-array-names": "^1.1.0",
        "reflect.getprototypeof": "^1.0.10"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/typescript": {
      "version": "6.0.3",
      "resolved": "https://registry.npmjs.org/typescript/-/typescript-6.0.3.tgz",
      "integrity": "sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==",
      "devOptional": true,
      "license": "Apache-2.0",
      "bin": {
        "tsc": "bin/tsc",
        "tsserver": "bin/tsserver"
      },
      "engines": {
        "node": ">=14.17"
      }
    },
    "node_modules/ua-parser-js": {
      "version": "1.0.41",
      "resolved": "https://registry.npmjs.org/ua-parser-js/-/ua-parser-js-1.0.41.tgz",
      "integrity": "sha512-LbBDqdIC5s8iROCUjMbW1f5dJQTEFB1+KO9ogbvlb3nm9n4YHa5p4KTvFPWvh2Hs8gZMBuiB1/8+pdfe/tDPug==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/ua-parser-js"
        },
        {
          "type": "paypal",
          "url": "https://paypal.me/faisalman"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/faisalman"
        }
      ],
      "license": "MIT",
      "bin": {
        "ua-parser-js": "script/cli.js"
      },
      "engines": {
        "node": "*"
      }
    },
    "node_modules/unbox-primitive": {
      "version": "1.1.0",
      "resolved": "https://registry.npmjs.org/unbox-primitive/-/unbox-primitive-1.1.0.tgz",
      "integrity": "sha512-nWJ91DjeOkej/TA8pXQ3myruKpKEYgqvpw9lz4OPHj/NWFNluYrjbz9j01CJ8yKQd2g4jFoOkINCTW2I5LEEyw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.3",
        "has-bigints": "^1.0.2",
        "has-symbols": "^1.1.0",
        "which-boxed-primitive": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/undici-types": {
      "version": "8.9.0",
      "resolved": "https://registry.npmjs.org/undici-types/-/undici-types-8.9.0.tgz",
      "integrity": "sha512-KTDyRTYX8sWmKXAikPHHSyc63CRPETMctyjKFupcC6OBLXT3xsN0e9aF7m+mIXutFWpUXuedtowG7iLOzp0kQg==",
      "license": "MIT"
    },
    "node_modules/unicode-canonical-property-names-ecmascript": {
      "version": "2.0.1",
      "resolved": "https://registry.npmjs.org/unicode-canonical-property-names-ecmascript/-/unicode-canonical-property-names-ecmascript-2.0.1.tgz",
      "integrity": "sha512-dA8WbNeb2a6oQzAQ55YlT5vQAWGV9WXOsi3SskE3bcCdM0P4SDd+24zS/OCacdRq5BkdsRj9q3Pg6YyQoxIGqg==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/unicode-match-property-ecmascript": {
      "version": "2.0.0",
      "resolved": "https://registry.npmjs.org/unicode-match-property-ecmascript/-/unicode-match-property-ecmascript-2.0.0.tgz",
      "integrity": "sha512-5kaZCrbp5mmbz5ulBkDkbY0SsPOjKqVS35VpL9ulMPfSl0J0Xsm+9Evphv9CoIZFwre7aJoa94AY6seMKGVN5Q==",
      "license": "MIT",
      "dependencies": {
        "unicode-canonical-property-names-ecmascript": "^2.0.0",
        "unicode-property-aliases-ecmascript": "^2.0.0"
      },
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/unicode-match-property-value-ecmascript": {
      "version": "2.2.1",
      "resolved": "https://registry.npmjs.org/unicode-match-property-value-ecmascript/-/unicode-match-property-value-ecmascript-2.2.1.tgz",
      "integrity": "sha512-JQ84qTuMg4nVkx8ga4A16a1epI9H6uTXAknqxkGF/aFfRLw1xC/Bp24HNLaZhHSkWd3+84t8iXnp1J0kYcZHhg==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/unicode-property-aliases-ecmascript": {
      "version": "2.2.0",
      "resolved": "https://registry.npmjs.org/unicode-property-aliases-ecmascript/-/unicode-property-aliases-ecmascript-2.2.0.tgz",
      "integrity": "sha512-hpbDzxUY9BFwX+UeBnxv3Sh1q7HFxj48DTmXchNgRa46lO8uj3/1iEn3MiNUYTg1g9ctIqXCCERn8gYZhHC5lQ==",
      "license": "MIT",
      "engines": {
        "node": ">=4"
      }
    },
    "node_modules/unpipe": {
      "version": "1.0.0",
      "resolved": "https://registry.npmjs.org/unpipe/-/unpipe-1.0.0.tgz",
      "integrity": "sha512-pjy2bYhSsufwWlKwPc+l3cN7+wuJlK6uz0YdJEOlQDbl6jo/YlPi4mb8agUkVC8BF7V8NuzeyPNqRksA3hztKQ==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/unrs-resolver": {
      "version": "1.12.2",
      "resolved": "https://registry.npmjs.org/unrs-resolver/-/unrs-resolver-1.12.2.tgz",
      "integrity": "sha512-dmlRxBJJayXjqTwC+JtF1HhJmgf3ftQ3YejFcZrf4+KKtJv0qDsK1pjqaaVjG7wJ5NJ6UVP1OqRMQ71Z4C3rxQ==",
      "dev": true,
      "hasInstallScript": true,
      "license": "MIT",
      "dependencies": {
        "napi-postinstall": "^0.3.4"
      },
      "funding": {
        "url": "https://opencollective.com/unrs-resolver"
      },
      "optionalDependencies": {
        "@unrs/resolver-binding-android-arm-eabi": "1.12.2",
        "@unrs/resolver-binding-android-arm64": "1.12.2",
        "@unrs/resolver-binding-darwin-arm64": "1.12.2",
        "@unrs/resolver-binding-darwin-x64": "1.12.2",
        "@unrs/resolver-binding-freebsd-x64": "1.12.2",
        "@unrs/resolver-binding-linux-arm-gnueabihf": "1.12.2",
        "@unrs/resolver-binding-linux-arm-musleabihf": "1.12.2",
        "@unrs/resolver-binding-linux-arm64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-arm64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-loong64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-loong64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-ppc64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-riscv64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-riscv64-musl": "1.12.2",
        "@unrs/resolver-binding-linux-s390x-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-x64-gnu": "1.12.2",
        "@unrs/resolver-binding-linux-x64-musl": "1.12.2",
        "@unrs/resolver-binding-openharmony-arm64": "1.12.2",
        "@unrs/resolver-binding-wasm32-wasi": "1.12.2",
        "@unrs/resolver-binding-win32-arm64-msvc": "1.12.2",
        "@unrs/resolver-binding-win32-ia32-msvc": "1.12.2",
        "@unrs/resolver-binding-win32-x64-msvc": "1.12.2"
      }
    },
    "node_modules/update-browserslist-db": {
      "version": "1.3.4",
      "resolved": "https://registry.npmjs.org/update-browserslist-db/-/update-browserslist-db-1.3.4.tgz",
      "integrity": "sha512-t8wonIOdQyOjtPd2VktlBu6QjTVTks6v8bSi7kd0r2Vll8TK1JYDZtRRdbmCHOAMphkZgrzK+L+vXK4pyZ8t4A==",
      "funding": [
        {
          "type": "opencollective",
          "url": "https://opencollective.com/browserslist"
        },
        {
          "type": "tidelift",
          "url": "https://tidelift.com/funding/github/npm/browserslist"
        },
        {
          "type": "github",
          "url": "https://github.com/sponsors/ai"
        }
      ],
      "license": "MIT",
      "dependencies": {
        "escalade": "^3.2.0",
        "picocolors": "^1.1.1"
      },
      "bin": {
        "update-browserslist-db": "cli.js"
      },
      "peerDependencies": {
        "browserslist": ">= 4.21.0"
      }
    },
    "node_modules/uri-js": {
      "version": "4.4.1",
      "resolved": "https://registry.npmjs.org/uri-js/-/uri-js-4.4.1.tgz",
      "integrity": "sha512-7rKUyy33Q1yc98pQ1DAmLtwX109F7TIfWlW1Ydo8Wl1ii1SeHieeh0HHfPeL2fMXK6z0s8ecKs9frCuLJvndBg==",
      "dev": true,
      "license": "BSD-2-Clause",
      "dependencies": {
        "punycode": "^2.1.0"
      }
    },
    "node_modules/use-latest-callback": {
      "version": "0.2.6",
      "resolved": "https://registry.npmjs.org/use-latest-callback/-/use-latest-callback-0.2.6.tgz",
      "integrity": "sha512-FvRG9i1HSo0wagmX63Vrm8SnlUU3LMM3WyZkQ76RnslpBrX694AdG4A0zQBx2B3ZifFA0yv/BaEHGBnEax5rZg==",
      "license": "MIT",
      "peerDependencies": {
        "react": ">=16.8"
      }
    },
    "node_modules/use-sync-external-store": {
      "version": "1.7.0",
      "resolved": "https://registry.npmjs.org/use-sync-external-store/-/use-sync-external-store-1.7.0.tgz",
      "integrity": "sha512-6L+EeigHMQhdaIPNIFUKwfWJSwWFQ8gJbJ2DLOs5sDIegTwR9fRxvnM3uciHKjIZhFz+KAv2emhWMRvDmMcY8A==",
      "license": "MIT",
      "peerDependencies": {
        "react": "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"
      }
    },
    "node_modules/utils-merge": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/utils-merge/-/utils-merge-1.0.1.tgz",
      "integrity": "sha512-pMZTvIkT1d+TFGvDOqodOclx0QWkkgi6Tdoa8gC8ffGAAqz9pzPTZWAybbsHHoED/ztMtkv/VoYTYyShUn81hA==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.4.0"
      }
    },
    "node_modules/validate-npm-package-name": {
      "version": "5.0.1",
      "resolved": "https://registry.npmjs.org/validate-npm-package-name/-/validate-npm-package-name-5.0.1.tgz",
      "integrity": "sha512-OljLrQ9SQdOUqTaQxqL5dEfZWrXExyyWsozYlAWFawPVNuD83igl7uJD2RTkNMbniIYgt8l81eCJGIdQF7avLQ==",
      "license": "ISC",
      "engines": {
        "node": "^14.17.0 || ^16.13.0 || >=18.0.0"
      }
    },
    "node_modules/vary": {
      "version": "1.1.2",
      "resolved": "https://registry.npmjs.org/vary/-/vary-1.1.2.tgz",
      "integrity": "sha512-BNGbWLfd0eUPabhkXUVm0j8uuvREyTh5ovRa/dyow/BqAbZJyC+5fU+IzQOzmAKzYqYRAISoRhdQr3eIZ/PXqg==",
      "license": "MIT",
      "engines": {
        "node": ">= 0.8"
      }
    },
    "node_modules/vlq": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/vlq/-/vlq-1.0.1.tgz",
      "integrity": "sha512-gQpnTgkubC6hQgdIcRdYGDSDc+SaujOdyesZQMv6JlfQee/9Mp0Qhnys6WxDWvQnL5WZdT7o2Ul187aSt0Rq+w==",
      "license": "MIT"
    },
    "node_modules/walker": {
      "version": "1.0.8",
      "resolved": "https://registry.npmjs.org/walker/-/walker-1.0.8.tgz",
      "integrity": "sha512-ts/8E8l5b7kY0vlWLewOkDXMmPdLcVV4GmOQLyxuSswIJsweeFZtAsMF7k1Nszz+TYBQrlYRmzOnr398y1JemQ==",
      "license": "Apache-2.0",
      "dependencies": {
        "makeerror": "1.0.12"
      }
    },
    "node_modules/warn-once": {
      "version": "0.1.1",
      "resolved": "https://registry.npmjs.org/warn-once/-/warn-once-0.1.1.tgz",
      "integrity": "sha512-VkQZJbO8zVImzYFteBXvBOZEl1qL175WH8VmZcxF2fZAoudNhNDvHi+doCaAEdU2l2vtcIwa2zn0QK5+I1HQ3Q==",
      "license": "MIT"
    },
    "node_modules/wcwidth": {
      "version": "1.0.1",
      "resolved": "https://registry.npmjs.org/wcwidth/-/wcwidth-1.0.1.tgz",
      "integrity": "sha512-XHPEwS0q6TaxcvG85+8EYkbiCux2XtWG2mkc47Ng2A77BQu9+DqIOJldST4HgPkuea7dvKSj5VgX3P1d4rW8Tg==",
      "license": "MIT",
      "dependencies": {
        "defaults": "^1.0.3"
      }
    },
    "node_modules/webidl-conversions": {
      "version": "3.0.1",
      "resolved": "https://registry.npmjs.org/webidl-conversions/-/webidl-conversions-3.0.1.tgz",
      "integrity": "sha512-2JAn3z8AR6rjK8Sm8orRC0h/bcl/DqL7tRPdGZ4I1CjdF+EaMLmYxBHyXuKL849eucPFhvBoxMsflfOb8kxaeQ==",
      "license": "BSD-2-Clause"
    },
    "node_modules/whatwg-fetch": {
      "version": "3.6.20",
      "resolved": "https://registry.npmjs.org/whatwg-fetch/-/whatwg-fetch-3.6.20.tgz",
      "integrity": "sha512-EqhiFU6daOA8kpjOWTL0olhVOF3i7OrFzSYiGsEMB8GcXS+RrzauAERX65xMeNWVqxA6HXH2m69Z9LaKKdisfg==",
      "license": "MIT"
    },
    "node_modules/whatwg-url": {
      "version": "5.0.0",
      "resolved": "https://registry.npmjs.org/whatwg-url/-/whatwg-url-5.0.0.tgz",
      "integrity": "sha512-saE57nupxk6v3HY35+jzBwYa0rKSy0XR8JSxZPwgLr7ys0IBzhGviA1/TUGJLmSVqs8pb9AnvICXEuOHLprYTw==",
      "license": "MIT",
      "dependencies": {
        "tr46": "~0.0.3",
        "webidl-conversions": "^3.0.0"
      }
    },
    "node_modules/whatwg-url-minimum": {
      "version": "0.2.0",
      "resolved": "https://registry.npmjs.org/whatwg-url-minimum/-/whatwg-url-minimum-0.2.0.tgz",
      "integrity": "sha512-BtjXU1caNcCFfETP2DhqSeVPfRDl2MTUitI107RE34rJXjR/izfUtR5IoTFOK1WqjNLXbbeqaCH/mQAOLjpc8g==",
      "license": "MIT"
    },
    "node_modules/which": {
      "version": "2.0.2",
      "resolved": "https://registry.npmjs.org/which/-/which-2.0.2.tgz",
      "integrity": "sha512-BLI3Tl1TW3Pvl70l3yq3Y64i+awpwXqsGBYWkkqMtnbXgrMD+yj7rhW0kuEDxzJaYXGjEW5ogapKNMEKNMjibA==",
      "license": "ISC",
      "dependencies": {
        "isexe": "^2.0.0"
      },
      "bin": {
        "node-which": "bin/node-which"
      },
      "engines": {
        "node": ">= 8"
      }
    },
    "node_modules/which-boxed-primitive": {
      "version": "1.1.1",
      "resolved": "https://registry.npmjs.org/which-boxed-primitive/-/which-boxed-primitive-1.1.1.tgz",
      "integrity": "sha512-TbX3mj8n0odCBFVlY8AxkqcHASw3L60jIuF8jFP78az3C2YhmGvqbHBpAjTRH2/xqYunrJ9g1jSyjCjpoWzIAA==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-bigint": "^1.1.0",
        "is-boolean-object": "^1.2.1",
        "is-number-object": "^1.1.1",
        "is-string": "^1.1.1",
        "is-symbol": "^1.1.1"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-builtin-type": {
      "version": "1.2.1",
      "resolved": "https://registry.npmjs.org/which-builtin-type/-/which-builtin-type-1.2.1.tgz",
      "integrity": "sha512-6iBczoX+kDQ7a3+YJBnh3T+KZRxM/iYNPXicqk66/Qfm1b93iu+yOImkg0zHbj5LNOcNv1TEADiZ0xa34B4q6Q==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "call-bound": "^1.0.2",
        "function.prototype.name": "^1.1.6",
        "has-tostringtag": "^1.0.2",
        "is-async-function": "^2.0.0",
        "is-date-object": "^1.1.0",
        "is-finalizationregistry": "^1.1.0",
        "is-generator-function": "^1.0.10",
        "is-regex": "^1.2.1",
        "is-weakref": "^1.0.2",
        "isarray": "^2.0.5",
        "which-boxed-primitive": "^1.1.0",
        "which-collection": "^1.0.2",
        "which-typed-array": "^1.1.16"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-collection": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/which-collection/-/which-collection-1.0.2.tgz",
      "integrity": "sha512-K4jVyjnBdgvc86Y6BkaLZEN933SwYOuBFkdmBu9ZfkcAbdVbpITnDmjvZ/aQjRXQrv5EPkTnD1s39GiiqbngCw==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "is-map": "^2.0.3",
        "is-set": "^2.0.3",
        "is-weakmap": "^2.0.2",
        "is-weakset": "^2.0.3"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/which-typed-array": {
      "version": "1.1.24",
      "resolved": "https://registry.npmjs.org/which-typed-array/-/which-typed-array-1.1.24.tgz",
      "integrity": "sha512-wk4Mf4pR5mRP7eYuuTBCIQ9d0ud2Fv2jRLQpfgnRjbOxAFHmjKFValgTpitVKzJJS8ajnYQV2Du1SZ8j6b/EUQ==",
      "dev": true,
      "license": "MIT",
      "dependencies": {
        "available-typed-arrays": "^1.0.7",
        "call-bind": "^1.0.9",
        "call-bound": "^1.0.4",
        "for-each": "^0.3.5",
        "get-proto": "^1.0.1",
        "gopd": "^1.2.0",
        "has-tostringtag": "^1.0.2"
      },
      "engines": {
        "node": ">= 0.4"
      },
      "funding": {
        "url": "https://github.com/sponsors/ljharb"
      }
    },
    "node_modules/word-wrap": {
      "version": "1.2.5",
      "resolved": "https://registry.npmjs.org/word-wrap/-/word-wrap-1.2.5.tgz",
      "integrity": "sha512-BN22B5eaMMI9UMtjrGd5g5eCYPpCPDUy0FJXbYsaT5zYxjFOckS53SQDE3pWkVoWpHXVb3BrYcEN4Twa55B5cA==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=0.10.0"
      }
    },
    "node_modules/wrap-ansi": {
      "version": "7.0.0",
      "resolved": "https://registry.npmjs.org/wrap-ansi/-/wrap-ansi-7.0.0.tgz",
      "integrity": "sha512-YVGIj2kamLSTxw6NsZjoBxfSwsn0ycdesmc4p+Q21c5zPuZ1pl+NfxVdxPtdHvmNVOQ6XSYG4AUtyt/Fi7D16Q==",
      "license": "MIT",
      "dependencies": {
        "ansi-styles": "^4.0.0",
        "string-width": "^4.1.0",
        "strip-ansi": "^6.0.0"
      },
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/chalk/wrap-ansi?sponsor=1"
      }
    },
    "node_modules/wrappy": {
      "version": "1.0.2",
      "resolved": "https://registry.npmjs.org/wrappy/-/wrappy-1.0.2.tgz",
      "integrity": "sha512-l4Sp/DRseor9wL6EvV2+TuQn63dMkPjZ/sp9XkghTEbV9KlPS1xUsZ3u7/IQO4wxtcFB4bgpQPRcR3QCvezPcQ==",
      "license": "ISC"
    },
    "node_modules/ws": {
      "version": "7.5.13",
      "resolved": "https://registry.npmjs.org/ws/-/ws-7.5.13.tgz",
      "integrity": "sha512-rsKI6xDBFVf4r/x8XyChGK04QR/XHroxs/jUcoWvtEZM8TPU/X/uIY9B1CsSzYws9ZJb/6bbBu7dPhFW00CAoA==",
      "license": "MIT",
      "engines": {
        "node": ">=8.3.0"
      },
      "peerDependencies": {
        "bufferutil": "^4.0.1",
        "utf-8-validate": "^5.0.2"
      },
      "peerDependenciesMeta": {
        "bufferutil": {
          "optional": true
        },
        "utf-8-validate": {
          "optional": true
        }
      }
    },
    "node_modules/xcode": {
      "version": "4.0.0",
      "resolved": "https://registry.npmjs.org/xcode/-/xcode-4.0.0.tgz",
      "integrity": "sha512-dDaoWzc9EP2fp9FS9PVZUkyvFxY4y1TOV9pcKaKLk++Ei/qb97XDFEVP7GnW7Osii/TzVABJ0jq2F+9/lq0TVA==",
      "license": "Apache-2.0",
      "dependencies": {
        "simple-plist": "^1.3.1"
      },
      "engines": {
        "node": ">=14.17.0"
      }
    },
    "node_modules/xml2js": {
      "version": "0.6.0",
      "resolved": "https://registry.npmjs.org/xml2js/-/xml2js-0.6.0.tgz",
      "integrity": "sha512-eLTh0kA8uHceqesPqSE+VvO1CDDJWMwlQfB6LuN6T8w6MaDJ8Txm8P7s5cHD0miF0V+GGTZrDQfxPZQVsur33w==",
      "license": "MIT",
      "dependencies": {
        "sax": ">=0.6.0",
        "xmlbuilder": "~11.0.0"
      },
      "engines": {
        "node": ">=4.0.0"
      }
    },
    "node_modules/xml2js/node_modules/xmlbuilder": {
      "version": "11.0.1",
      "resolved": "https://registry.npmjs.org/xmlbuilder/-/xmlbuilder-11.0.1.tgz",
      "integrity": "sha512-fDlsI/kFEx7gLvbecc0/ohLG50fugQp8ryHzMTuW9vSa1GJ0XYWKnhsUx7oie3G98+r56aTQIUB4kht42R3JvA==",
      "license": "MIT",
      "engines": {
        "node": ">=4.0"
      }
    },
    "node_modules/xmlbuilder": {
      "version": "15.1.1",
      "resolved": "https://registry.npmjs.org/xmlbuilder/-/xmlbuilder-15.1.1.tgz",
      "integrity": "sha512-yMqGBqtXyeN1e3TGYvgNgDVZ3j84W4cwkOXQswghol6APgZWaff9lnbvN7MHYJOiXsvGPXtjTYJEiC9J2wv9Eg==",
      "license": "MIT",
      "engines": {
        "node": ">=8.0"
      }
    },
    "node_modules/y18n": {
      "version": "5.0.8",
      "resolved": "https://registry.npmjs.org/y18n/-/y18n-5.0.8.tgz",
      "integrity": "sha512-0pfFzegeDWJHJIAmTLRP2DwHjdF5s7jo9tuztdQxAhINCdvS+3nGINqPd00AphqJR/0LhANUS6/+7SCb98YOfA==",
      "license": "ISC",
      "engines": {
        "node": ">=10"
      }
    },
    "node_modules/yallist": {
      "version": "3.1.1",
      "resolved": "https://registry.npmjs.org/yallist/-/yallist-3.1.1.tgz",
      "integrity": "sha512-a4UGQaWPH59mOXUYnAG2ewncQS4i4F43Tv3JoAM+s2VDAmS9NsK8GpDMLrCHPksFT7h3K6TOoUNn2pb7RoXx4g==",
      "license": "ISC"
    },
    "node_modules/yargs": {
      "version": "17.7.3",
      "resolved": "https://registry.npmjs.org/yargs/-/yargs-17.7.3.tgz",
      "integrity": "sha512-GZtjxm/J/4TSxuL3FNYjCmLktBTnIw/rVmKSIyKeYAZpmJB2ig9VauCC5xsa82GNKVKDAqpOn3KVzNt0zmrU0g==",
      "license": "MIT",
      "dependencies": {
        "cliui": "^8.0.1",
        "escalade": "^3.1.1",
        "get-caller-file": "^2.0.5",
        "require-directory": "^2.1.1",
        "string-width": "^4.2.3",
        "y18n": "^5.0.5",
        "yargs-parser": "^21.1.1"
      },
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yargs-parser": {
      "version": "21.1.1",
      "resolved": "https://registry.npmjs.org/yargs-parser/-/yargs-parser-21.1.1.tgz",
      "integrity": "sha512-tVpsJW7DdjecAiFpbIB1e3qxIQsE6NoPc5/eTdrbbIC4h0LVsWhnoa3g+m2HclBIujHzsxZ4VJVA+GUuc2/LBw==",
      "license": "ISC",
      "engines": {
        "node": ">=12"
      }
    },
    "node_modules/yocto-queue": {
      "version": "0.1.0",
      "resolved": "https://registry.npmjs.org/yocto-queue/-/yocto-queue-0.1.0.tgz",
      "integrity": "sha512-rVksvsnNCdJ/ohGc6xgPwyN8eheCxsiLM8mxuE/t/mOVqJewPuO1miLpTHQiRgTKCLexL4MeAFVagts7HmNZ2Q==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=10"
      },
      "funding": {
        "url": "https://github.com/sponsors/sindresorhus"
      }
    },
    "node_modules/zod": {
      "version": "3.25.76",
      "resolved": "https://registry.npmjs.org/zod/-/zod-3.25.76.tgz",
      "integrity": "sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==",
      "license": "MIT",
      "funding": {
        "url": "https://github.com/sponsors/colinhacks"
      }
    },
    "node_modules/zod-validation-error": {
      "version": "4.0.2",
      "resolved": "https://registry.npmjs.org/zod-validation-error/-/zod-validation-error-4.0.2.tgz",
      "integrity": "sha512-Q6/nZLe6jxuU80qb/4uJ4t5v2VEZ44lzQjPDhYJNztRQ4wyWc6VF3D3Kb/fAuPetZQnhS3hnajCf9CsWesghLQ==",
      "dev": true,
      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "zod": "^3.25.0 || ^4.0.0"
      }
    }
  }
}
```


### petmatch/package.json

```json

{
  "name": "petmatch",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "dependencies": {
    "@expo/metro-runtime": "~58.0.15",
    "@expo/vector-icons": "^15.0.2",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/native": "^7.5.1",
    "@react-navigation/native-stack": "^7.21.0",
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^18.0.9",
    "expo": "~58.0.19",
    "expo-status-bar": "~58.0.4",
    "express": "^5.3.0",
    "jsonwebtoken": "^9.0.3",
    "mysql2": "^3.24.6",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-native": "0.88.0",
    "react-native-safe-area-context": "~5.10.1",
    "react-native-screens": "~4.30.0",
    "react-native-web": "^0.21.4"
  },
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "api": "node backend/server.js",
    "api:dev": "node --watch backend/server.js",
    "criar-admin": "node backend/scripts/criarAdmin.js",
    "test": "node --test backend/tests/*.test.js",
    "lint": "expo lint",
    "typecheck": "tsc --project jsconfig.json",
    "export:web": "expo export --platform web",
    "test:web": "node scripts/testar-web.js",
    "test:mysql": "node scripts/testar-mysql.js",
    "entrega": "node scripts/gerar-entrega.js"
  },
  "private": true,
  "devDependencies": {
    "@playwright/test": "^1.64.1",
    "@types/react": "~19.3.0",
    "eslint": "^9.39.5",
    "eslint-config-expo": "~58.0.4",
    "typescript": "~6.0.3"
  }
}
```


### petmatch/playwright.config.js

```js
import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = path.dirname(fileURLToPath(import.meta.url));
const pastaWorkspace = path.resolve(pastaProjeto, '..');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
    viewport: { width: 1280, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/expo/bin/cli start --web --port 8081 --localhost',
    url: 'http://localhost:8081',
    timeout: 120000,
    reuseExistingServer: true,
    env: {
      CI: '1',
      __UNSAFE_EXPO_HOME_DIRECTORY: path.join(pastaWorkspace, '.expo-home'),
      npm_config_cache: path.join(pastaWorkspace, '.npm-cache'),
    },
  },
});
```


### petmatch/README.md

```markdown
# PetMatch — Adoção de Animais

##1 ENTREGA

## Apresentação do projeto

O PetMatch é um aplicativo desenvolvido com o objetivo de facilitar a adoção responsável de animais, conectando cães e gatos que precisam de um novo lar a pessoas interessadas em adotar.

A proposta é criar uma plataforma organizada e acessível, onde os usuários possam conhecer os animais disponíveis, visualizar suas informações, salvar favoritos e realizar solicitações de adoção. Além disso, o aplicativo busca auxiliar ONGs e protetores independentes na divulgação dos animais, tornando esse processo mais prático e centralizado.

## Problema identificado

Atualmente, muitos animais aguardam por uma oportunidade de adoção, enquanto pessoas interessadas em adotar nem sempre sabem onde encontrar informações sobre eles.

Grande parte das divulgações acontece por meio de redes sociais, grupos e publicações individuais, o que pode dificultar a organização das informações e o acompanhamento dos animais disponíveis.

Outro problema é a dificuldade que ONGs e protetores independentes podem enfrentar para divulgar os animais e alcançar pessoas realmente interessadas na adoção.

## Contexto e público afetado

O projeto está relacionado à adoção de animais e à necessidade de melhorar a comunicação entre quem procura um pet e quem é responsável por sua divulgação.

O público-alvo do PetMatch é formado por pessoas interessadas em adotar cães ou gatos, ONGs que trabalham com proteção animal e protetores independentes que resgatam, cuidam ou divulgam animais disponíveis para adoção.

## Justificativa

O PetMatch surgiu da ideia de utilizar a tecnologia para contribuir com uma causa importante: a adoção responsável de animais.

A criação de uma plataforma específica para essa finalidade pode facilitar o acesso às informações, organizar os anúncios e aproximar os animais de possíveis adotantes.

Além de ajudar quem deseja adotar, o projeto também busca oferecer mais visibilidade ao trabalho realizado por ONGs e protetores independentes.

## Proposta de solução

A solução proposta é desenvolver um aplicativo chamado PetMatch, no qual os usuários possam encontrar animais disponíveis para adoção e acompanhar suas solicitações.

O aplicativo contará com um sistema de cadastro e login, listagem de animais, filtros de pesquisa, visualização de detalhes, favoritos e solicitações de adoção.

Também haverá funcionalidades específicas para ONGs, protetores e administradores, permitindo o gerenciamento dos animais e das informações cadastradas.

A proposta é reunir essas funcionalidades em um único ambiente, com uma interface simples, organizada e intuitiva.

## Nome e identidade visual da aplicação

O nome PetMatch representa a ideia de criar uma conexão entre animais e pessoas, ajudando cada pet a encontrar uma família.

A identidade visual utiliza principalmente as cores laranja, verde e tons claros, além de uma patinha como símbolo da aplicação. O design foi pensado para transmitir uma imagem acolhedora, moderna e organizada, facilitando a navegação dos usuários.

## Tipos de usuários e permissões

O sistema foi planejado para atender quatro tipos de usuários: adotantes, ONGs, protetores independentes e administradores.

Os **adotantes** poderão criar uma conta, realizar login, visualizar os animais disponíveis, pesquisar por características específicas, consultar informações detalhadas, adicionar animais aos favoritos, enviar solicitações de adoção e acompanhar seus pedidos.

As **ONGs** terão acesso às funcionalidades gerais do aplicativo e também poderão cadastrar animais disponíveis para adoção, atualizar suas informações, gerenciar os anúncios sob sua responsabilidade e acompanhar solicitações relacionadas a esses animais.

Os **protetores independentes** terão permissões semelhantes às das ONGs, podendo divulgar animais, manter seus cadastros atualizados e acompanhar o interesse de possíveis adotantes.

O **administrador** será responsável pelo gerenciamento geral da plataforma, podendo acessar as funcionalidades do aplicativo, administrar os cadastros de animais, consultar usuários e gerenciar os níveis de acesso autorizados.

O cadastro público será destinado aos adotantes, enquanto os demais níveis de acesso dependerão de autorização administrativa.

## Principais funcionalidades

O PetMatch contará com funcionalidades de cadastro e autenticação de usuários, permitindo que cada pessoa tenha sua própria conta e acesse as informações relacionadas ao seu perfil.

A plataforma apresentará uma listagem de cães e gatos disponíveis para adoção, com ferramentas de pesquisa e filtros para facilitar a busca. Cada animal terá uma página de detalhes, onde o usuário poderá consultar suas informações.

Também será possível adicionar animais aos favoritos e realizar solicitações de adoção, acompanhando posteriormente o andamento desses pedidos.

Para ONGs, protetores e administradores, o aplicativo disponibilizará recursos de gerenciamento dos animais cadastrados, incluindo operações de criação, consulta, atualização e exclusão, conforme as permissões de cada perfil.

## Telas previstas

O aplicativo foi estruturado com 12 telas principais, responsáveis pelas diferentes funcionalidades do sistema.

As telas de **Login** e **Cadastro de Usuário** permitem o acesso e a criação de contas. A **Home** apresenta o PetMatch e direciona os usuários para as principais funcionalidades. A tela **Animais** reúne os pets disponíveis, enquanto **Detalhes do Animal** apresenta as informações individuais de cada um.

A tela **Favoritos** permite consultar os animais salvos, e **Solicitar Adoção** possibilita iniciar um pedido de adoção. Em **Minhas Solicitações**, o usuário poderá acompanhar os pedidos realizados.

A tela **Perfil** reúne as informações da conta. Já **Cadastrar Animal** e **Editar Animal** são destinadas ao gerenciamento dos anúncios, enquanto a tela **Usuários** permite realizar funções administrativas relacionadas às contas e permissões.

O aplicativo também prevê seções informativas de Sobre e Contato.

## Fluxo inicial de navegação

O fluxo principal do PetMatch começa na tela de Login, onde o usuário pode acessar uma conta existente ou escolher a opção de cadastro.

Após realizar o cadastro e a autenticação, ele é direcionado para a Home, onde encontra uma apresentação do projeto e pode acessar a listagem de animais disponíveis para adoção.

Ao selecionar um animal, o usuário poderá visualizar seus detalhes, adicioná-lo aos favoritos ou iniciar uma solicitação de adoção. Também será possível acessar o perfil e acompanhar as solicitações realizadas.

Os usuários com permissões de ONG, protetor ou administrador terão acesso às funcionalidades adicionais de gerenciamento, de acordo com seu nível de acesso.

## Tecnologias utilizadas

O projeto utiliza **React Native** e **Expo** para o desenvolvimento e a execução do aplicativo, com **JavaScript** como linguagem de programação.

A navegação entre as telas é realizada por meio do **React Navigation**, enquanto o backend utiliza **Node.js** e **Express** para desenvolver a API responsável pela comunicação entre o aplicativo e o banco de dados.

O **MySQL** é utilizado para armazenar as informações de usuários, animais, favoritos e solicitações de adoção. A autenticação utiliza **JWT**, permitindo controlar o acesso às funcionalidades conforme o perfil de cada usuário.

O desenvolvimento também utiliza **Git e GitHub** para o versionamento e armazenamento do código-fonte.

## Estrutura do projeto

O código do PetMatch está organizado em diferentes pastas para facilitar o desenvolvimento e a manutenção.

A pasta **screens** contém as telas do aplicativo, enquanto **components** reúne os componentes reutilizáveis da interface. A pasta **services** é responsável pelos serviços de comunicação com a API, e **backend** contém os arquivos do servidor, incluindo rotas, controladores e configurações.

A pasta **database** reúne arquivos relacionados ao banco de dados, enquanto **assets** armazena imagens e outros recursos visuais. O projeto também possui arquivos e pastas destinados aos testes e às configurações gerais da aplicação.

O arquivo **App.js** é responsável pela navegação principal e pelo fluxo de autenticação, enquanto **package.json** reúne as dependências e os comandos necessários para executar o projeto.

## Banco de dados

O PetMatch utiliza um banco de dados MySQL para armazenar as informações necessárias ao funcionamento da plataforma.

A estrutura contempla dados de usuários, animais disponíveis para adoção, favoritos e solicitações de adoção.

Essas informações são acessadas por meio de uma API desenvolvida com Node.js e Express, permitindo que o aplicativo consulte, cadastre, atualize e exclua registros conforme as permissões estabelecidas.

## Desenvolvimento e próximas etapas

O PetMatch está em desenvolvimento e será aprimorado ao longo das próximas entregas.

As próximas etapas incluem a revisão da integração entre o aplicativo, a API e o banco de dados, a validação das funcionalidades de cadastro e autenticação, os testes das operações CRUD e o aperfeiçoamento da interface.

Também serão revisados os arquivos herdados do projeto-base utilizado em aula, garantindo que toda a documentação, as configurações e os testes estejam de acordo com a proposta do PetMatch.

O objetivo final é entregar uma aplicação funcional, organizada e coerente com o planejamento apresentado.
## Estado técnico após a revisão de 05/11/2026

O planejamento acima foi preservado. O código atual usa exclusivamente as rotas `/auth`, `/animais`, `/usuarios`, `/favoritos` e `/adocoes`. Os níveis são `adotante`, `ong`, `protetor` e `admin`; o cadastro público sempre cria um adotante. A origem didática é o projeto Loja JWT fornecido pelo professor, mas as funcionalidades atuais são de adoção.

Na pasta que contém `package.json`, use `npm ci` se precisar instalar as dependências já declaradas. Execute `npm run api` em um terminal e `npm run web` em outro. No PowerShell com bloqueio de scripts, use `npm.cmd` no lugar de `npm`. Nenhuma dependência nova foi necessária nesta revisão.

A API lê a configuração existente em `backend/.env` e usa as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT` e `JWT_SECRET`. O esquema entregue chama-se `petmatch_db`. Nenhuma configuração ou credencial local foi alterada. Para celular físico, confira o endereço da API em `services/api.js`: localhost aponta para o próprio dispositivo.

O arquivo `database/petmatch.sql` contém a estrutura para um banco novo e não cria contas demonstrativas. `CREATE TABLE IF NOT EXISTS` não atualiza tabelas existentes: qualquer migração de um banco já preenchido deve ser planejada separadamente. Esta revisão não aplicou SQL no banco real.

As verificações e suas limitações estão em [VALIDACAO.md](VALIDACAO.md). `npm test` usa MySQL simulado; `npm run test:web` usa API simulada no navegador; `npm run test:mysql` cria um servidor MySQL descartável separado e importa o SQL entregue. Este último exige o binário local `mysqld` (ou `MYSQLD_PATH` apontando para ele).
```


### petmatch/VALIDACAO.md

```markdown
# Validação do PetMatch

Revisão realizada em 05/11/2026.

## Escopo e preservação

Foram inventariados os arquivos próprios do projeto: configurações, App.js, 12 telas, componentes, serviço HTTP, API, middlewares, rotas, controllers, SQL, testes, scripts, documentação e seis imagens de assets. As imagens foram inspecionadas e ainda são recursos genéricos do template Expo, sem marca da loja; foram preservadas para não mudar o design.

A busca de legado abrangeu nomes de arquivos e conteúdo, incluindo arquivos ocultos de configuração. Dependências instaladas, metadados Git, caches, resultados gerados e arquivos binários do MySQL temporário não são código autoral e não foram editados. Arquivos .env e credenciais locais não foram alterados nem reproduzidos. Alterações locais já existentes foram preservadas. O banco real não foi acessado ou modificado.

## Referências corrigidas

- AGENTS.md: título PetMatch, cadastro público como adotante e identificação de animais na navegação.
- backend/controllers/produtosController.js: removido após confirmar que nenhuma rota ou importação executável o utilizava. A API já montava somente as rotas de animais.
- backend/utils/validacoes.js: removida apenas validarProduto, utilizada exclusivamente pelo controller obsoleto. Validações de usuário e ID foram mantidas; animais já têm validação própria.
- backend/tests/api.test.js: catálogo e CRUD passaram a testar animais; nível comum passou de usuario para adotante; mock SQL aceita consultas em várias linhas e os campos reais do animal. Mantidas verificações de JWT, bcrypt, cadastro, administração e revogação de privilégios.
- tests/app.spec.js: mocks e cenários foram adaptados às telas atuais, ao cadastro com login automático, às rotas de animais, às mensagens e permissões atuais. Seletores respeitam elementos visíveis porque a navegação mantém telas montadas.
- scripts/gerar-entrega.js e ENTREGA_COMPLETA.md: identidade PetMatch, SQL correto, remoção das instruções de contas demonstrativas antigas e da cópia de um .env.example inexistente. A entrega foi regenerada a partir dos fontes atuais.
- README.md: acrescentado estado técnico atual sem apagar o planejamento original.

app.json, package.json e os dois nomes raiz do package-lock.json já estavam adaptados para PetMatch na cópia de trabalho; foram conferidos e preservados. A substituição de database/loja_jwt.sql por database/petmatch.sql já estava em andamento antes da revisão.

## Compatibilidade do SQL

O SQL entregue tinha divergências reais com a implementação: idade textual, imagem em vez de foto, ausência de unidade_idade, saude e mensagem da adoção, além de sexo incompatível com Fêmea. O arquivo agora representa os campos e valores usados pelo frontend e pelos controllers, com responsável obrigatório para animais. Colunas opcionais de adoção já existentes (tipo_moradia, possui_outros_animais, observacoes) foram preservadas.

O teste MySQL deixou de criar um esquema paralelo embutido e agora importa database/petmatch.sql exclusivamente em uma instância temporária, com diretório próprio e porta diferente de 3306. Isso valida o SQL que acompanha a entrega. Não foi criada ou executada migração do banco real. CREATE TABLE IF NOT EXISTS não corrige tabelas existentes.

As rotas foram cruzadas com as chamadas do frontend: atualização de adoção usa PUT /adocoes/:id/status e cancelamento usa PUT /adocoes/:id/cancelar. A falha 404 versus 403 encontrada na integração vinha do teste, que usava /adocoes/:id; o teste foi corrigido sem mudar a API.

## Resultados executados

| Verificação | Resultado |
| --- | --- |
| Análise de sintaxe (Babel parser e JSON.parse) | 43 arquivos JavaScript e 4 JSON válidos |
| npm.cmd test | 14 testes de API passaram; integração MySQL ignorada por padrão (executada separadamente abaixo) |
| npm.cmd run test:mysql | 1 cenário integrado passou usando o SQL entregue e MySQL descartável |
| npm.cmd run test:web | 7 cenários passaram no Edge com Expo Web real e API simulada |
| ESLint nos fontes (comando abaixo) | Falhou: 3 erros e 5 avisos em código de interface já existente |
| npm.cmd run typecheck | Falhou: 8 erros em propriedades e tipos da interface já existente |

Comando de lint concluído: `npm.cmd run lint -- App.js index.js components screens services backend scripts tests playwright.config.js eslint.config.js`. A tentativa sem caminhos explícitos não concluiu e foi interrompida; a execução com caminhos cobriu os fontes e configurações JavaScript. Não se considera lint aprovado.

O ambiente inicialmente bloqueou processos com spawn EPERM. Os testes foram repetidos com autorização fora dessa restrição. O PowerShell bloqueou npm.ps1; npm.cmd funcionou sem alterar a política de execução.

A integração validou os quatro perfis, cadastro público sem elevação de privilégio, login/JWT, consulta de perfil, administração, criação e atualização de animais por ONG, bloqueio de alteração/exclusão por outro responsável, criação/exclusão por protetor, favoritos e duplicidade, solicitação de adoção, bloqueio de avaliação por outro responsável e aprovação que marca o animal como adotado. Os relatórios locais ficam em ../.mysql-validation/petmatch-*/resultado.txt.

Os testes web validaram cadastro com login automático sem enviar nível, listagem/detalhes para adotante com Bearer, ausência de controles de gerenciamento para adotante, restauração/logout, sessão inválida, recuperação após falha de rede, 401 em sessão ativa e acesso administrativo. As duas falhas iniciais eram ambiguidades nos seletores dos testes; foram corrigidas e a suíte foi repetida com sucesso. Estes cenários não constituem validação completa de todos os fluxos visuais.

## Problemas de implementação ainda presentes

São problemas estáticos da interface atual, sem relação com a antiga loja, e não foram alterados para preservar o escopo e o comportamento solicitado:

- App.js:94: react-hooks/set-state-in-effect ao chamar restaurarSessao dentro do efeito.
- screens/Animais.js:332: duas aspas literais em JSX violam react/no-unescaped-entities.
- Avisos de lint: dependências de useCallback em DetalhesAnimal.js:88 e EditarAnimal.js:114; imports não utilizados em Home.js:6 e Login.js:5; variável capturada não utilizada em Perfil.js:83.
- App.js:249: Perfil recebe usuario/sair/atualizarUsuario, mas sua assinatura declara somente navigation (1 erro do verificador).
- Home.js:329,335,340,346,354: parâmetros ativo/icone de BotaoMenu inferidos como obrigatórios, mas omitidos em chamadas (5 erros).
- Home.js:737,857: nomes de ícones inferidos como string ampla, incompatível com o conjunto de nomes de Ionicons (2 erros).

Portanto, testes executáveis passaram, mas a validação estática global permanece reprovada. Não foi testado dispositivo físico Android/iOS nem realizado build nativo. Nenhuma dependência nova foi instalada.

## Histórico preservado

Loja JWT é a origem didática fornecida pelo professor. Menções explicativas em README.md e neste relatório foram mantidas; resultados antigos da loja não são evidência de aprovação do PetMatch. Termos genéricos corretos, como usuário, autenticarToken, cartão e imagem, não foram renomeados por semelhança textual. A licença original Expo foi preservada.
```

