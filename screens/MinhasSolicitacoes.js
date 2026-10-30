
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function MinhasSolicitacoes({ navigation }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');

  const ehResponsavel = ['ong', 'protetor', 'admin'].includes(
    usuario?.nivel
  );

  function avisar(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  function confirmar(titulo, mensagem, acao) {
    if (Platform.OS === 'web') {
      if (window.confirm(`${titulo}\n\n${mensagem}`)) {
        acao();
      }
      return;
    }

    Alert.alert(titulo, mensagem, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: acao,
      },
    ]);
  }

  const carregarSolicitacoes = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
        // IDENTIFICAR O USUÁRIO LOGADO
        const respostaUsuario = await fetchAutenticado(
          '/auth/me'
        );

        const dadosUsuario = await lerResposta(
          respostaUsuario
        );

        setUsuario(dadosUsuario);

        // BUSCAR AS SOLICITAÇÕES PERMITIDAS PARA A CONTA
        const resposta = await fetchAutenticado(
          '/adocoes'
        );

        const dados = await lerResposta(resposta);

        setSolicitacoes(
          Array.isArray(dados) ? dados : []
        );
      } catch (erroRequisicao) {
        setErro(
          erroRequisicao.message ||
            'Não foi possível carregar as solicitações.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    []
  );

  // ATUALIZAR QUANDO A TELA FOR ABERTA NOVAMENTE
  useFocusEffect(
    useCallback(() => {
      carregarSolicitacoes();
    }, [carregarSolicitacoes])
  );

  function nomeStatus(status) {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aprovada':
        return 'Aprovada';
      case 'recusada':
        return 'Recusada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status || 'Não informado';
    }
  }

  function corStatus(status) {
    switch (status) {
      case 'pendente':
        return '#B7791F';
      case 'aprovada':
        return '#25805A';
      case 'recusada':
        return '#B54747';
      case 'cancelada':
        return '#607D8B';
      default:
        return '#607D8B';
    }
  }

  function formatarData(data) {
    if (!data) return '';

    const valor = new Date(data);

    if (Number.isNaN(valor.getTime())) {
      return '';
    }

    return valor.toLocaleDateString('pt-BR');
  }

  // ADOTANTE CANCELA UMA SOLICITAÇÃO PENDENTE
  async function cancelarSolicitacao(id) {
    try {
      setProcessandoId(id);

      const resposta = await fetchAutenticado(
        `/adocoes/${id}/cancelar`,
        {
          method: 'PUT',
        }
      );

      const dados = await lerResposta(resposta);

      avisar(
        'Solicitação cancelada',
        dados.mensagem || 'Seu pedido foi cancelado.'
      );

      await carregarSolicitacoes(false);
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível cancelar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  // ONG, PROTETOR OU ADMIN AVALIA UMA SOLICITAÇÃO
  async function atualizarStatus(id, novoStatus) {
    try {
      setProcessandoId(id);

      const resposta = await fetchAutenticado(
        `/adocoes/${id}/status`,
        {
          method: 'PUT',
          body: JSON.stringify({
            status: novoStatus,
          }),
        }
      );

      const dados = await lerResposta(resposta);

      avisar(
        'Solicitação atualizada',
        dados.mensagem || 'Status atualizado.'
      );

      await carregarSolicitacoes(false);
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível atualizar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={cores.primaria}
        />
        <Text style={estilos.textoAuxiliar}>
          Carregando solicitações...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl
          refreshing={atualizando}
          onRefresh={() => carregarSolicitacoes(false)}
        />
      }
    >
      <Text style={estilos.titulo}>
        {ehResponsavel
          ? 'Solicitações recebidas'
          : 'Minhas solicitações'}
      </Text>

      <Text style={estilos.subtitulo}>
        {ehResponsavel
          ? 'Acompanhe e avalie os pedidos de adoção dos animais sob sua responsabilidade.'
          : 'Acompanhe aqui o andamento dos seus pedidos de adoção.'}
      </Text>

      {erro ? (
        <View style={estilos.cartao}>
          <Text style={estilos.textoErro}>
            {erro}
          </Text>

          <Botao
            titulo="Tentar novamente"
            onPress={() => carregarSolicitacoes()}
          />
        </View>
      ) : solicitacoes.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.tituloVazio}>
            Nenhuma solicitação encontrada
          </Text>

          <Text style={estilos.textoAuxiliar}>
            {ehResponsavel
              ? 'Quando alguém solicitar a adoção de um dos seus animais, o pedido aparecerá aqui.'
              : 'Você ainda não fez nenhuma solicitação de adoção.'}
          </Text>

          {!ehResponsavel && (
            <View style={estilos.espacoBotao}>
              <Botao
                titulo="Conhecer animais"
                onPress={() => navigation.navigate('Animais')}
              />
            </View>
          )}
        </View>
      ) : (
        solicitacoes.map((solicitacao) => {
          const processando =
            processandoId !== null;

          const pendente =
            solicitacao.status === 'pendente';

          return (
            <View
              key={solicitacao.id}
              style={estilos.cartao}
            >
              {solicitacao.foto_animal ? (
                <Image
                  source={{
                    uri: solicitacao.foto_animal,
                  }}
                  style={estilos.foto}
                  resizeMode="cover"
                />
              ) : null}

              <View style={estilos.linhaCabecalho}>
                <Text style={estilos.nomeAnimal}>
                  {solicitacao.nome_animal ||
                    'Animal'}
                </Text>

                <View
                  style={[
                    estilos.etiqueta,
                    {
                      backgroundColor:
                        corStatus(solicitacao.status) +
                        '18',
                    },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoEtiqueta,
                      {
                        color: corStatus(
                          solicitacao.status
                        ),
                      },
                    ]}
                  >
                    {nomeStatus(
                      solicitacao.status
                    )}
                  </Text>
                </View>
              </View>

              {ehResponsavel && (
                <Text style={estilos.informacao}>
                  <Text style={estilos.negrito}>
                    Interessado:{' '}
                  </Text>
                  {solicitacao.nome_adotante}
                </Text>
              )}

              {solicitacao.criado_em && (
                <Text style={estilos.informacao}>
                  <Text style={estilos.negrito}>
                    Data:{' '}
                  </Text>
                  {formatarData(
                    solicitacao.criado_em
                  )}
                </Text>
              )}

              {solicitacao.mensagem ? (
                <View style={estilos.areaMensagem}>
                  <Text style={estilos.rotuloMensagem}>
                    Mensagem do adotante
                  </Text>

                  <Text style={estilos.mensagem}>
                    {solicitacao.mensagem}
                  </Text>
                </View>
              ) : null}

              <View style={estilos.espacoBotao}>
                <Botao
                  titulo="Ver animal"
                  variante="secundario"
                  onPress={() =>
                    navigation.navigate(
                      'DetalhesAnimal',
                      {
                        id: solicitacao.animal_id,
                      }
                    )
                  }
                />
              </View>

              {pendente && !ehResponsavel && (
                <View style={estilos.espacoBotao}>
                  <Botao
                    titulo="Cancelar solicitação"
                    variante="secundario"
                    disabled={processando}
                    onPress={() =>
                      confirmar(
                        'Cancelar solicitação',
                        'Deseja cancelar este pedido de adoção?',
                        () =>
                          cancelarSolicitacao(
                            solicitacao.id
                          )
                      )
                    }
                  />
                </View>
              )}

              {pendente && ehResponsavel && (
                <>
                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Aprovar adoção"
                      disabled={processando}
                      onPress={() =>
                        confirmar(
                          'Aprovar adoção',
                          'Deseja aprovar esta solicitação? O animal será marcado como adotado e os outros pedidos pendentes serão recusados.',
                          () =>
                            atualizarStatus(
                              solicitacao.id,
                              'aprovada'
                            )
                        )
                      }
                    />
                  </View>

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Recusar solicitação"
                      variante="secundario"
                      disabled={processando}
                      onPress={() =>
                        confirmar(
                          'Recusar solicitação',
                          'Deseja recusar este pedido de adoção?',
                          () =>
                            atualizarStatus(
                              solicitacao.id,
                              'recusada'
                            )
                        )
                      }
                    />
                  </View>
                </>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  conteudo: {
    padding: 20,
    paddingBottom: 40,
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 24,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  cartaoVazio: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  tituloVazio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
    textAlign: 'center',
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 21,
  },

  textoErro: {
    color: '#B54747',
    marginBottom: 15,
  },

  foto: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 16,
  },

  linhaCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  nomeAnimal: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
  },

  etiqueta: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  informacao: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 8,
  },

  negrito: {
    fontWeight: 'bold',
    color: '#455A64',
  },

  areaMensagem: {
    backgroundColor: '#F5F7F8',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },

  rotuloMensagem: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#455A64',
    marginBottom: 8,
  },

  mensagem: {
    fontSize: 14,
    color: '#607D8B',
    lineHeight: 21,
  },

  espacoBotao: {
    marginTop: 12,
  },
});
