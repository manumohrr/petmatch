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

export function validarProduto(dados) {
  if (typeof dados.nome !== 'string' || !dados.nome.trim() || dados.nome.trim().length > 120) {
    return 'Informe um nome de produto com até 120 caracteres.';
  }

  if (dados.descricao !== undefined && (typeof dados.descricao !== 'string' || dados.descricao.trim().length > 500)) {
    return 'A descrição deve ter até 500 caracteres.';
  }

  if (dados.categoria !== undefined && (typeof dados.categoria !== 'string' || dados.categoria.trim().length > 100)) {
    return 'A categoria deve ter até 100 caracteres.';
  }

  // Não aceitar vazio, booleanos, NaN ou números fora dos limites de DECIMAL(10,2).
  const preco = String(dados.preco);
  if (!['number', 'string'].includes(typeof dados.preco) || !/^\d+(\.\d{1,2})?$/.test(preco) || Number(preco) > 99999999.99) {
    return 'Informe um preço de 0 a 99999999.99, com no máximo duas casas decimais.';
  }

  const estoque = String(dados.estoque);
  if (!['number', 'string'].includes(typeof dados.estoque) || !/^\d+$/.test(estoque) || !Number.isInteger(Number(estoque)) || Number(estoque) > 2147483647) {
    return 'Informe um estoque inteiro de 0 a 2147483647.';
  }

  return null;
}
