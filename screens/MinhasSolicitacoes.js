
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

const CORES = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  texto: '#252B35',
  secundario: '#737B87',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E6',
  verde: '#579F13',
  verdeClaro: '#EDF5E7',
  borda: '#EAE6DF',
  vermelho: '#C54848',
};

function obterStatus(status) {
  switch (status) {
    case 'pendente':
      return {
        nome: 'Pendente',
        cor: '#A66A17',
        fundo: '#FFF4DF',
      };

    case 'aprovada':
      return {
        nome: 'Aprovada',
        cor: '#376B0C',
        fundo: CORES.verdeClaro,
      };

    case 'recusada':
      return {
        nome: 'Recusada',
        cor: CORES.vermelho,
        fundo: '#FDECEC',
      };

    case 'cancelada':
      return {
        nome: 'Cancelada',
        cor: CORES.secundario,
        fundo: '#F0F0F0',
      };

    default:
      return {
        nome: status || 'Não informado',
        cor: CORES.secundario,
        fundo: '#F0F0F0',
      };
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

function BotaoAcao({
  titulo,
  onPress,
  variante = 'principal',
  disabled = false,
  carregando = false,
}) {
  const secundario = variante === 'secundario';
  const perigo = variante === 'perigo';

  return (
    <Pressable
      style={[
        estilos.botaoAcao,
        secundario && estilos.botaoSecundario,
        perigo && estilos.botaoPerigo,
        disabled && estilos.botaoDesabilitado,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {carregando ? (
        <ActivityIndicator
          color={
            secundario || perigo
              ? CORES.texto
              : CORES.branco
          }
        />
      ) : (
        <Text
          style={[
            estilos.textoBotao,
            secundario && estilos.textoBotaoSecundario,
            perigo && estilos.textoBotaoPerigo,
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

function CartaoSolicitacao({
  solicitacao,
  ehResponsavel,
  processando,
  onVerAnimal,
  onCancelar,
  onAprovar,
  onRecusar,
}) {
  const status = obterStatus(solicitacao.status);
  const pendente = solicitacao.status === 'pendente';

  const foto = solicitacao.foto_animal;
  const data = formatarData(solicitacao.criado_em);

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalhoCartao}>
        <View style={estilos.areaFoto}>
          {foto ? (
            <Image
              source={{ uri: foto }}
              style={estilos.foto}
              resizeMode="cover"
            />
          ) : (
            <View style={estilos.semFoto}>
              <Text style={estilos.textoSemFoto}>
                Sem foto
              </Text>
            </View>
          )}
        </View>

        <View style={estilos.informacoesAnimal}>
          <Text style={estilos.rotuloPet}>
            ANIMAL PARA ADOÇÃO
          </Text>

          <Text
            style={estilos.nomeAnimal}
            numberOfLines={2}
          >
            {solicitacao.nome_animal || 'Animal'}
          </Text>

          {data ? (
            <Text style={estilos.data}>
              Solicitação em {data}
            </Text>
          ) : null}

          <View
            style={[
              estilos.etiquetaStatus,
              { backgroundColor: status.fundo },
            ]}
          >
            <Text
              style={[
                estilos.textoStatus,
                { color: status.cor },
              ]}
            >
              {status.nome}
            </Text>
          </View>
        </View>
      </View>

      {ehResponsavel ? (
        <View style={estilos.areaInteressado}>
          <Text style={estilos.rotuloInformacao}>
            INTERESSADO NA ADOÇÃO
          </Text>

          <Text style={estilos.valorInformacao}>
            {solicitacao.nome_adotante ||
              'Nome não informado'}
          </Text>
        </View>
      ) : null}

      {solicitacao.mensagem ? (
        <View style={estilos.areaMensagem}>
          <Text style={estilos.tituloMensagem}>
            {ehResponsavel
              ? 'Mensagem do adotante'
              : 'Sua mensagem'}
          </Text>

          <Text style={estilos.mensagem}>
            {solicitacao.mensagem}
          </Text>
        </View>
      ) : null}

      <View style={estilos.divisor} />

      <View style={estilos.areaBotoes}>
        <BotaoAcao
          titulo="Ver animal"
          variante="secundario"
          onPress={onVerAnimal}
        />

        {pendente && !ehResponsavel ? (
          <BotaoAcao
            titulo="Cancelar solicitação"
            variante="perigo"
            disabled={processando}
            onPress={onCancelar}
          />
        ) : null}

        {pendente && ehResponsavel ? (
          <>
            <BotaoAcao
              titulo="Aprovar adoção"
              disabled={processando}
              onPress={onAprovar}
            />

            <BotaoAcao
              titulo="Recusar solicitação"
              variante="perigo"
              disabled={processando}
              onPress={onRecusar}
            />
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function MinhasSolicitacoes({
  navigation,
}) {
  const { width } = useWindowDimensions();

  const [solicitacoes, setSolicitacoes] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [processandoId, setProcessandoId] = useState(null);
  const [erro, setErro] = useState('');

  const ehResponsavel = [
    'ong',
    'protetor',
    'admin',
  ].includes(usuario?.nivel);

  const duasColunas = width >= 950;

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
      {
        text: 'Voltar',
        style: 'cancel',
      },
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
        const respostaUsuario =
          await fetchAutenticado('/auth/me');

        const dadosUsuario =
          await lerResposta(respostaUsuario);

        setUsuario(dadosUsuario);

        const resposta =
          await fetchAutenticado('/adocoes');

        const dados = await lerResposta(resposta);

        setSolicitacoes(
          Array.isArray(dados) ? dados : []
        );
      } catch (falha) {
        setErro(
          falha.message ||
          'Não foi possível carregar as solicitações.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      carregarSolicitacoes();
    }, [carregarSolicitacoes])
  );

  async function cancelarSolicitacao(id) {
    if (processandoId !== null) return;

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
    } catch (falha) {
      avisar(
        'Erro',
        falha.message ||
        'Não foi possível cancelar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  async function atualizarStatus(id, novoStatus) {
    if (processandoId !== null) return;

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
    } catch (falha) {
      avisar(
        'Erro',
        falha.message ||
        'Não foi possível atualizar a solicitação.'
      );
    } finally {
      setProcessandoId(null);
    }
  }

  const total = solicitacoes.length;

  const pendentes = solicitacoes.filter(
    (item) => item.status === 'pendente'
  ).length;

  const aprovadas = solicitacoes.filter(
    (item) => item.status === 'aprovada'
  ).length;

  function abrirAnimal(solicitacao) {
    if (
      solicitacao.animal_id === null ||
      solicitacao.animal_id === undefined
    ) {
      avisar(
        'Atenção',
        'Não foi possível identificar este animal.'
      );
      return;
    }

    navigation.navigate('DetalhesAnimal', {
      id: solicitacao.animal_id,
    });
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={CORES.laranja}
        />

        <Text style={estilos.textoAuxiliar}>
          Carregando solicitações...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() =>
              carregarSolicitacoes(false)
            }
            tintColor={CORES.laranja}
            colors={[CORES.laranja]}
          />
        }
      >
        <View style={estilos.larguraMaxima}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>
              {ehResponsavel
                ? 'Solicitações recebidas'
                : 'Minhas solicitações'}
            </Text>

            <Text style={estilos.subtitulo}>
              {ehResponsavel
                ? 'Acompanhe e avalie os pedidos de adoção dos animais sob sua responsabilidade.'
                : 'Acompanhe o andamento dos seus pedidos de adoção e confira as respostas.'}
            </Text>
          </View>

          {!erro ? (
            <View style={estilos.areaResumo}>
              <View style={estilos.resumoItem}>
                <Text style={estilos.numeroResumo}>
                  {total}
                </Text>

                <Text style={estilos.rotuloResumo}>
                  Total de pedidos
                </Text>
              </View>

              <View style={estilos.resumoItem}>
                <Text
                  style={[
                    estilos.numeroResumo,
                    { color: '#A66A17' },
                  ]}
                >
                  {pendentes}
                </Text>

                <Text style={estilos.rotuloResumo}>
                  Pendentes
                </Text>
              </View>

              <View style={estilos.resumoItem}>
                <Text
                  style={[
                    estilos.numeroResumo,
                    { color: CORES.verde },
                  ]}
                >
                  {aprovadas}
                </Text>

                <Text style={estilos.rotuloResumo}>
                  Aprovadas
                </Text>
              </View>
            </View>
          ) : null}

          {erro ? (
            <View style={estilos.cartaoVazio}>
              <Text style={estilos.tituloVazio}>
                Não foi possível carregar os pedidos
              </Text>

              <Text style={estilos.textoErro}>
                {erro}
              </Text>

              <BotaoAcao
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
                  ? 'Quando alguém solicitar a adoção de um animal sob sua responsabilidade, o pedido aparecerá aqui.'
                  : 'Você ainda não fez nenhuma solicitação de adoção. Que tal conhecer os pets disponíveis?'}
              </Text>

              {!ehResponsavel ? (
                <View style={estilos.botaoVazio}>
                  <BotaoAcao
                    titulo="Conhecer animais"
                    onPress={() =>
                      navigation.navigate('Animais')
                    }
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <>
              <View style={estilos.cabecalhoLista}>
                <Text style={estilos.tituloLista}>
                  {ehResponsavel
                    ? 'Pedidos recebidos'
                    : 'Seus pedidos'}
                </Text>

                <Text style={estilos.contagem}>
                  {total === 1
                    ? '1 solicitação'
                    : `${total} solicitações`}
                </Text>
              </View>

              <View
                style={[
                  estilos.grade,
                  duasColunas && estilos.gradeDesktop,
                ]}
              >
                {solicitacoes.map((solicitacao) => {
                  const processando =
                    processandoId !== null;

                  return (
                    <View
                      key={String(solicitacao.id)}
                      style={[
                        estilos.itemGrade,
                        duasColunas &&
                          estilos.itemGradeDesktop,
                      ]}
                    >
                      <CartaoSolicitacao
                        solicitacao={solicitacao}
                        ehResponsavel={ehResponsavel}
                        processando={processando}
                        onVerAnimal={() =>
                          abrirAnimal(solicitacao)
                        }
                        onCancelar={() =>
                          confirmar(
                            'Cancelar solicitação',
                            'Deseja cancelar este pedido de adoção?',
                            () =>
                              cancelarSolicitacao(
                                solicitacao.id
                              )
                          )
                        }
                        onAprovar={() =>
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
                        onRecusar={() =>
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
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },

  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 35,
    paddingBottom: 70,
  },

  larguraMaxima: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: CORES.fundo,
  },

  cabecalho: {
    marginBottom: 27,
  },

  titulo: {
    color: CORES.texto,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },

  subtitulo: {
    color: CORES.secundario,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 700,
  },

  areaResumo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 35,
  },

  resumoItem: {
    flexGrow: 1,
    flexBasis: 150,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    padding: 20,
  },

  numeroResumo: {
    color: CORES.texto,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 7,
  },

  rotuloResumo: {
    color: CORES.secundario,
    fontSize: 13,
  },

  cabecalhoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  tituloLista: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
  },

  contagem: {
    color: CORES.secundario,
    fontSize: 13,
  },

  grade: {
    gap: 18,
  },

  gradeDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },

  itemGrade: {
    width: '100%',
  },

  itemGradeDesktop: {
    width: '48.5%',
  },

  cartao: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 20,
  },

  cabecalhoCartao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },

  areaFoto: {
    width: 110,
    height: 115,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CORES.verdeClaro,
  },

  foto: {
    width: '100%',
    height: '100%',
  },

  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },

  textoSemFoto: {
    color: CORES.secundario,
    fontSize: 12,
    textAlign: 'center',
  },

  informacoesAnimal: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },

  rotuloPet: {
    color: CORES.verde,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 7,
  },

  nomeAnimal: {
    color: CORES.texto,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 7,
  },

  data: {
    color: CORES.secundario,
    fontSize: 12,
    marginBottom: 12,
  },

  etiquetaStatus: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoStatus: {
    fontSize: 11,
    fontWeight: '800',
  },

  areaInteressado: {
    marginTop: 19,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: CORES.borda,
  },

  rotuloInformacao: {
    color: CORES.secundario,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },

  valorInformacao: {
    color: CORES.texto,
    fontSize: 15,
    fontWeight: '700',
  },

  areaMensagem: {
    backgroundColor: '#F7F6F3',
    borderRadius: 12,
    padding: 17,
    marginTop: 20,
  },

  tituloMensagem: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
  },

  mensagem: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 23,
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginTop: 22,
    marginBottom: 18,
  },

  areaBotoes: {
    gap: 10,
    marginTop: 'auto',
  },

  botaoAcao: {
    backgroundColor: CORES.laranja,
    minHeight: 48,
    borderRadius: 11,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  botaoSecundario: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
  },

  botaoPerigo: {
    backgroundColor: '#FFF1F1',
    borderWidth: 1,
    borderColor: '#F5D5D5',
  },

  botaoDesabilitado: {
    opacity: 0.5,
  },

  textoBotao: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoBotaoSecundario: {
    color: CORES.texto,
  },

  textoBotaoPerigo: {
    color: CORES.vermelho,
  },

  cartaoVazio: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 30,
    minHeight: 230,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },

  tituloVazio: {
    color: CORES.texto,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoAuxiliar: {
    color: CORES.secundario,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  textoErro: {
    color: CORES.vermelho,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  botaoVazio: {
    marginTop: 10,
    width: '100%',
    maxWidth: 240,
  },
});
