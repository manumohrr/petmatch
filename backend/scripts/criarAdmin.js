import bcrypt from 'bcryptjs';
import pool from '../database/conexao.js';
import { validarBanco } from '../config/ambiente.js';
import { emailValido, senhaValida } from '../utils/validacoes.js';

async function criarAdministrador() {
  try {
    validarBanco();
    const nome = process.env.ADMIN_NOME?.trim();
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const senha = process.env.ADMIN_SENHA;

    if (!nome || nome.length > 100 || !emailValido(email) || !senhaValida(senha) || senha === 'DEFINA_UMA_SENHA_FORTE') {
      console.error('Preencha ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA em backend/.env. A senha deve ter pelo menos 8 caracteres e até 72 bytes.');
      process.exitCode = 1;
      return;
    }

    const [existentes] = await pool.execute('SELECT id, nivel FROM usuarios WHERE email = ?', [email]);
    if (existentes.length > 0) {
      // Não promover silenciosamente uma conta comum que já usa este endereço.
      console.log(existentes[0].nivel === 'admin' ? 'Administrador já cadastrado' : 'E-mail já cadastrado como usuário. Use outro ADMIN_EMAIL ou peça a um administrador para alterar o nível.');
      return;
    }

    // A senha original não é salva nem impressa. Apenas seu hash é enviado ao MySQL.
    const senhaHash = await bcrypt.hash(senha, 10);
    await pool.execute('INSERT INTO usuarios (nome, email, senha, nivel) VALUES (?, ?, ?, ?)', [nome, email, senhaHash, 'admin']);
    console.log('Administrador criado com sucesso');
  } catch (erro) {
    console.error(erro.code === 'ER_DUP_ENTRY' ? 'E-mail já cadastrado. Nenhum administrador foi duplicado.' : 'Não foi possível criar o administrador. Confira backend/.env, a execução do MySQL e a importação do SQL.');
    process.exitCode = 1;
  } finally {
    // Fechar o pool permite que o script termine normalmente.
    await pool.end();
  }
}

criarAdministrador();
