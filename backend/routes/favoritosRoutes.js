
import { Router } from 'express';

import {
  listarFavoritos,
  adicionarFavorito,
  removerFavorito,
} from '../controllers/favoritosController.js';

import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// TODAS AS ROTAS EXIGEM LOGIN
router.use(autenticarToken);

// READ - LISTAR OS ANIMAIS FAVORITOS
router.get('/', listarFavoritos);

// CREATE - ADICIONAR UM ANIMAL AOS FAVORITOS
router.post('/', adicionarFavorito);

// DELETE - REMOVER UM ANIMAL DOS FAVORITOS
router.delete('/:animalId', removerFavorito);

export default router;
