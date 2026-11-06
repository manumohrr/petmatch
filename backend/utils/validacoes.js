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
