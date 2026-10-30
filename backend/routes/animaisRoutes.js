
import { Router } from 'express';

import {
  listarAnimais,
  buscarAnimalPorId,
  cadastrarAnimal,
  atualizarAnimal,
  excluirAnimal,
} from '../controllers/animaisController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM AUTENTICAÇÃO JWT
router.use(autenticarToken);

// VERIFICAR SE O USUÁRIO PODE GERENCIAR ANIMAIS
function permitirGerenciamento(req, res, next) {
  const nivel = req.usuario?.nivel;

  if (
    nivel !== 'ong' &&
    nivel !== 'protetor' &&
    nivel !== 'admin'
  ) {
    return res.status(403).json({
      mensagem:
        'Apenas ONGs, protetores e administradores podem gerenciar animais.',
    });
  }

  next();
}

// READ - LISTAR TODOS OS ANIMAIS
router.get('/', listarAnimais);

// READ - BUSCAR UM ANIMAL PELO ID
router.get('/:id', buscarAnimalPorId);

// CREATE - CADASTRAR UM NOVO ANIMAL
router.post(
  '/',
  permitirGerenciamento,
  cadastrarAnimal
);

// UPDATE - ATUALIZAR UM ANIMAL
router.put(
  '/:id',
  permitirGerenciamento,
  atualizarAnimal
);

// DELETE - EXCLUIR UM ANIMAL
router.delete(
  '/:id',
  permitirGerenciamento,
  excluirAnimal
);

export default router;
