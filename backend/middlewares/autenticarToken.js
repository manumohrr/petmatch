
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
