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
