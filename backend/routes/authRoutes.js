import { Router } from 'express';
import { cadastrar, login, usuarioAtual } from '../controllers/authController.js';
import autenticarToken from '../middlewares/autenticarToken.js';

const router = Router();

// Cadastro e login são públicos. /me precisa de um token válido.
router.post('/cadastro', cadastrar);
router.post('/login', login);
router.get('/me', autenticarToken, usuarioAtual);

export default router;
