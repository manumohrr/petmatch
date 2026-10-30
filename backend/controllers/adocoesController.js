
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
