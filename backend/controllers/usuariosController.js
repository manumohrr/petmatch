
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
