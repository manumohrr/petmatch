import { Router } from 'express';
import { listarUsuarios, alterarNivelUsuario } from '../controllers/usuariosController.js';
import autenticarToken from '../middlewares/autenticarToken.js';
import somenteAdmin from '../middlewares/somenteAdmin.js';

const router = Router();

// A ordem importa: autenticar primeiro (401), conferir a permissão depois (403).
router.use(autenticarToken, somenteAdmin);
router.get('/', listarUsuarios);
router.put('/:id/nivel', alterarNivelUsuario);

export default router;
