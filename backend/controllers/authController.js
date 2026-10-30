
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
