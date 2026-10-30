export default function somenteAdmin(req, res, next) {
  // autenticarToken precisa executar antes: ele preenche req.usuario com o nível atual.
  if (req.usuario?.nivel !== 'admin') {
    return res.status(403).json({ mensagem: 'Acesso permitido apenas para administradores' });
  }

  next();
}
