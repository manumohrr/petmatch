
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
