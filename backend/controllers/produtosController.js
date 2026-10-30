import pool from '../database/conexao.js';
import { idValido, validarProduto } from '../utils/validacoes.js';

export async function listarProdutos(req, res) {
  try {
    const [produtos] = await pool.execute('SELECT id, nome, descricao, categoria, preco, estoque, criado_em FROM produtos ORDER BY id DESC');
    return res.status(200).json(produtos);
  } catch {
    return res.status(500).json({ mensagem: 'Não foi possível listar os produtos.' });
  }
}

export async function buscarProdutoPorId(req, res) {
  // req.params.id vem da URL e também precisa ser validado.
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensagem: 'ID do produto inválido.' });
  }

  try {
    const [produtos] = await pool.execute(
      'SELECT id, nome, descricao, categoria, preco, estoque, criado_em FROM produtos WHERE id = ?',
      [Number(req.params.id)],
    );
    if (produtos.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }
    return res.status(200).json(produtos[0]);
  } catch {
    return res.status(500).json({ mensagem: 'Não foi possível buscar o produto.' });
  }
}

export async function cadastrarProduto(req, res) {
  const erroValidacao = validarProduto(req.body);
  if (erroValidacao) {
    return res.status(400).json({ mensagem: erroValidacao });
  }

  const nome = req.body.nome.trim();
  const descricao = (req.body.descricao || '').trim();
  const categoria = (req.body.categoria || '').trim();
  const preco = Number(req.body.preco);
  const estoque = Number(req.body.estoque);

  try {
    // Os valores externos entram nos parâmetros ?, sem concatenar dados na consulta SQL.
    const [resultado] = await pool.execute(
      'INSERT INTO produtos (nome, descricao, categoria, preco, estoque) VALUES (?, ?, ?, ?, ?)',
      [nome, descricao, categoria, preco, estoque],
    );
    return res.status(201).json({
      mensagem: 'Produto cadastrado com sucesso.',
      produto: { id: resultado.insertId, nome, descricao, categoria, preco, estoque },
    });
  } catch {
    return res.status(500).json({ mensagem: 'Não foi possível cadastrar o produto.' });
  }
}

export async function atualizarProduto(req, res) {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensagem: 'ID do produto inválido.' });
  }
  const erroValidacao = validarProduto(req.body);
  if (erroValidacao) {
    return res.status(400).json({ mensagem: erroValidacao });
  }

  const id = Number(req.params.id);
  const nome = req.body.nome.trim();
  const descricao = (req.body.descricao || '').trim();
  const categoria = (req.body.categoria || '').trim();
  const preco = Number(req.body.preco);
  const estoque = Number(req.body.estoque);

  try {
    // A consulta inicial distingue "não existe" de uma atualização sem mudanças.
    const [existentes] = await pool.execute('SELECT id FROM produtos WHERE id = ?', [id]);
    if (existentes.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }
    await pool.execute('UPDATE produtos SET nome = ?, descricao = ?, categoria = ?, preco = ?, estoque = ? WHERE id = ?', [nome, descricao, categoria, preco, estoque, id]);
    return res.status(200).json({
      mensagem: 'Produto atualizado com sucesso.',
      produto: { id, nome, descricao, categoria, preco, estoque },
    });
  } catch {
    return res.status(500).json({ mensagem: 'Não foi possível atualizar o produto.' });
  }
}

export async function excluirProduto(req, res) {
  if (!idValido(req.params.id)) {
    return res.status(400).json({ mensagem: 'ID do produto inválido.' });
  }

  try {
    const [resultado] = await pool.execute('DELETE FROM produtos WHERE id = ?', [Number(req.params.id)]);
    if (resultado.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }
    return res.status(200).json({ mensagem: 'Produto excluído com sucesso.' });
  } catch {
    return res.status(500).json({ mensagem: 'Não foi possível excluir o produto.' });
  }
}
