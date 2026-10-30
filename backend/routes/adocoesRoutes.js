
import { Router } from 'express';

import {
  solicitarAdocao,
  listarAdocoes,
  atualizarStatusAdocao,
  cancelarAdocao,
} from '../controllers/adocoesController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM LOGIN
router.use(autenticarToken);

// CREATE - SOLICITAR A ADOÇÃO DE UM ANIMAL
router.post('/', solicitarAdocao);

// READ - LISTAR SOLICITAÇÕES DE ADOÇÃO
router.get('/', listarAdocoes);

// UPDATE - APROVAR OU RECUSAR UMA SOLICITAÇÃO
router.put('/:id/status', atualizarStatusAdocao);

// UPDATE - CANCELAR UMA SOLICITAÇÃO PENDENTE
router.put('/:id/cancelar', cancelarAdocao);

export default router;
