import app from './app.js';
import validarAmbiente from './config/ambiente.js';

try {
  // Configuração ausente é detectada antes de aceitar qualquer requisição.
  validarAmbiente();
  const porta = Number(process.env.PORT || 3000);
  const servidor = app.listen(porta, '0.0.0.0', function iniciarServidor() {
    console.log('API executando em http://localhost:' + porta);
  });

  servidor.on('error', function informarErroServidor(erro) {
    console.error(erro.code === 'EADDRINUSE' ? 'A porta da API já está em uso.' : 'Não foi possível iniciar a API.');
    process.exitCode = 1;
  });
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
}
