// fetch é nativo: não precisamos de Axios para conversar com a API REST.
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web no mesmo computador: localhost. No celular, substitua pelo IP do computador.
// Exemplo ilustrativo: http://192.168.0.20:3000 (confira seu IP antes de usar).
export const API = 'http://localhost:3000';

let avisarSessaoExpirada = null;

export function configurarSessaoExpirada(callback) {
  avisarSessaoExpirada = callback;
  return function cancelarAviso() { avisarSessaoExpirada = null; };
}

export async function fetchAutenticado(caminho, opcoes = {}) {
  const token = await AsyncStorage.getItem('token');
  // Bearer significa que apresentamos o token como comprovante de autenticação.
  const resposta = await fetch(API + caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...opcoes.headers,
      Authorization: 'Bearer ' + (token || ''),
    },
  });
  if (resposta.status === 401) {
    await AsyncStorage.removeItem('token');
    if (avisarSessaoExpirada) { avisarSessaoExpirada(); }
  }
  // Mantemos o Response para a tela enxergar a requisição e a resposta.
  return resposta;
}

export async function lerResposta(resposta) {
  let dados;
  try {
    dados = await resposta.json();
  } catch {
    const erro = Object.assign(new Error('Resposta inesperada da API. Confira o endereço em services/api.js.'), { status: resposta.status });
    throw erro;
  }
  if (!resposta.ok) {
    const erro = Object.assign(new Error(dados.mensagem || 'Não foi possível concluir a requisição.'), { status: resposta.status });
    throw erro;
  }
  return dados;
}
