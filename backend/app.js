
import './config/ambiente.js';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import animaisRoutes from './routes/animaisRoutes.js';
import usuariosRoutes from './routes/usuariosRoutes.js';
import adocoesRoutes from './routes/adocoesRoutes.js';
import favoritosRoutes from './routes/favoritosRoutes.js';

const app = express();

app.disable('x-powered-by');

// PERMITIR REQUISIÇÕES DO APLICATIVO
// CORS É NECESSÁRIO PRINCIPALMENTE PARA O EXPO WEB
app.use(cors());

// RECEBER DADOS EM FORMATO JSON
app.use(express.json({ limit: '10kb' }));

// IMPEDIR CACHE DE INFORMAÇÕES SENSÍVEIS
app.use(function impedirCache(req, res, next) {
  res.setHeader('Cache-Control', 'no-store');

  // GARANTIR UM OBJETO SEGURO PARA VALIDAÇÃO
  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body)
  ) {
    req.body = {};
  }

  next();
});

// ROTA INICIAL DA API
app.get('/', function apresentarApi(req, res) {
  res.json({
    mensagem: 'API PETMATCH',
    descricao: 'Sistema de adoção responsável de animais',
    rotas: [
      '/auth',
      '/animais',
      '/usuarios',
      '/adocoes',
      '/favoritos',
    ],
  });
});

// ROTAS DE AUTENTICAÇÃO
app.use('/auth', authRoutes);

// ROTAS DOS ANIMAIS
// CADASTRAR, LISTAR, EDITAR E EXCLUIR
app.use('/animais', animaisRoutes);

// ROTAS DE USUÁRIOS
// GERENCIAMENTO DE CONTAS E PERMISSÕES
app.use('/usuarios', usuariosRoutes);

// ROTAS DE ADOÇÃO
// ENVIAR E ACOMPANHAR SOLICITAÇÕES
app.use('/adocoes', adocoesRoutes);

// ROTAS DE FAVORITOS
// SALVAR ANIMAIS DE INTERESSE
app.use('/favoritos', favoritosRoutes);

// ROTA NÃO ENCONTRADA
app.use(function rotaNaoEncontrada(req, res) {
  res.status(404).json({
    mensagem: 'Rota não encontrada.',
  });
});

// TRATAMENTO DE ERROS DA API
app.use(function tratarErro(erro, req, res, next) {
  // JSON INVÁLIDO
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({
      mensagem: 'JSON inválido no corpo da requisição.',
    });
  }

  // REQUISIÇÃO MUITO GRANDE
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({
      mensagem: 'Corpo da requisição muito grande.',
    });
  }

  // NÃO EXPOR INFORMAÇÕES INTERNAS DO SERVIDOR
  console.error('Erro na API:', erro);

  return res.status(500).json({
    mensagem: 'Erro interno do servidor. Tente novamente.',
  });
});

export default app;
