
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
