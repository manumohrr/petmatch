
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
  verde: '#579F13',
  verdeClaro: '#EDF5E7',
  borda: '#EAE6DF',
  vermelho: '#C54848',
};

function obterStatus(status) {
  switch (status) {
    case 'disponivel':
      return {
        nome: 'Disponível para adoção',
        cor: '#376B0C',
        fundo: CORES.verdeClaro,
      };

    case 'em_processo':
      return {
        nome: 'Em processo de adoção',
        cor: '#A66A17',
        fundo: '#FFF4DF',
      };

    case 'adotado':
      return {
        nome: 'Adotado',
        cor: CORES.secundario,
        fundo: '#F0F0F0',
      };

    default:
      return {
        nome: 'Status não informado',
        cor: CORES.secundario,
        fundo: '#F0F0F0',
      };
  }
}

function formatarIdade(idade, unidade) {
  if (
    idade === null ||
    idade === undefined ||
    idade === ''
  ) {
    return 'Idade não informada';
  }

  const numero = Number(idade);

  if (!Number.isFinite(numero)) {
    return String(idade);
  }

  if (unidade === 'meses' || unidade === 'mes') {
    return `${numero} ${numero === 1 ? 'mês' : 'meses'}`;
  }

  return `${numero} ${numero === 1 ? 'ano' : 'anos'}`;
}

function BotaoAcao({
  titulo,
  onPress,
  variante = 'principal',
  disabled = false,
  carregando = false,
}) {
  const secundario = variante === 'secundario';

  return (
    <Pressable
      style={[
        estilos.botao,
        secundario && estilos.botaoSecundario,
        disabled && estilos.botaoDesabilitado,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {carregando ? (
        <ActivityIndicator
          color={
            secundario ? CORES.vermelho : CORES.branco
          }
        />
      ) : (
        <Text
          style={[
            estilos.textoBotao,
            secundario && estilos.textoBotaoSecundario,
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

function CartaoFavorito({
  animal,
  removendo,
  bloqueado,
  onDetalhes,
  onRemover,
}) {
  const status = obterStatus(animal.status);

  const foto =
    animal.foto ||
    animal.imagem ||
    animal.foto_url;

  return (
    <View style={estilos.cartao}>
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
              Foto não disponível
            </Text>
          </View>
        )}

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

      <View style={estilos.informacoes}>
        <Text style={estilos.especie}>
          {animal.especie || 'Animal para adoção'}
        </Text>

        <Text
          style={estilos.nomeAnimal}
          numberOfLines={1}
        >
          {animal.nome || 'Nome não informado'}
        </Text>

        <Text
          style={estilos.localizacao}
          numberOfLines={1}
        >
          {animal.cidade || 'Localização não informada'}
        </Text>

        <View style={estilos.caracteristicas}>
          <View style={estilos.etiquetaDetalhe}>
            <Text style={estilos.textoDetalhe}>
              {formatarIdade(
                animal.idade,
                animal.unidade_idade
              )}
            </Text>
          </View>

          {animal.porte ? (
            <View style={estilos.etiquetaDetalhe}>
              <Text style={estilos.textoDetalhe}>
                {animal.porte}
              </Text>
            </View>
          ) : null}
        </View>

        {animal.raca ? (
          <Text
            style={estilos.raca}
            numberOfLines={1}
          >
            {animal.raca}
          </Text>
        ) : (
          <Text style={estilos.raca}>
            Raça não informada
          </Text>
        )}

        {animal.descricao ? (
          <Text
            style={estilos.descricao}
            numberOfLines={2}
          >
            {animal.descricao}
          </Text>
        ) : null}

        <View style={estilos.areaBotoes}>
          <BotaoAcao
            titulo="Conhecer este pet"
            onPress={onDetalhes}
          />

          <BotaoAcao
            titulo={
              removendo
                ? 'Removendo...'
                : 'Remover dos favoritos'
            }
            variante="secundario"
            disabled={bloqueado}
            carregando={removendo}
            onPress={onRemover}
          />
        </View>
      </View>
    </View>
  );
}

export default function Favoritos({ navigation }) {
  const { width } = useWindowDimensions();

  const [favoritos, setFavoritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [erro, setErro] = useState('');

  const colunas =
    width >= 1050 ? 3 : width >= 650 ? 2 : 1;

  function avisar(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  const carregarFavoritos = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
        const resposta = await fetchAutenticado(
          '/favoritos'
        );

        const dados = await lerResposta(resposta);

        setFavoritos(
          Array.isArray(dados) ? dados : []
        );
      } catch (falha) {
        setErro(
          falha.message ||
          'Não foi possível carregar seus favoritos.'
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
      carregarFavoritos();
    }, [carregarFavoritos])
  );

  async function removerFavorito(animalId) {
    if (removendoId !== null) return;

    try {
      setRemovendoId(animalId);

      const resposta = await fetchAutenticado(
        `/favoritos/${animalId}`,
        {
          method: 'DELETE',
        }
      );

      await lerResposta(resposta);

      setFavoritos((listaAtual) =>
        listaAtual.filter(
          (favorito) =>
            String(favorito.animal_id) !==
            String(animalId)
        )
      );

      avisar(
        'Favorito removido',
        'O animal foi removido dos seus favoritos.'
      );
    } catch (falha) {
      avisar(
        'Erro',
        falha.message ||
        'Não foi possível remover o favorito.'
      );
    } finally {
      setRemovendoId(null);
    }
  }

  function confirmarRemocao(animalId, nome) {
    if (removendoId !== null) return;

    const mensagem =
      `Deseja remover ${nome || 'este animal'} dos seus favoritos?`;

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) {
        removerFavorito(animalId);
      }

      return;
    }

    Alert.alert(
      'Remover favorito',
      mensagem,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            removerFavorito(animalId),
        },
      ]
    );
  }

  function abrirDetalhes(animal) {
    const id = animal.animal_id;

    if (id === null || id === undefined) {
      avisar(
        'Atenção',
        'Não foi possível identificar este animal.'
      );
      return;
    }

    navigation.navigate('DetalhesAnimal', {
      id,
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
          Carregando seus favoritos...
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
              carregarFavoritos(false)
            }
            tintColor={CORES.laranja}
            colors={[CORES.laranja]}
          />
        }
      >
        <View style={estilos.larguraMaxima}>
          <View style={estilos.cabecalhoPagina}>
            <Text style={estilos.titulo}>
              Meus favoritos
            </Text>

            <Text style={estilos.subtitulo}>
              Aqui ficam os pets que chamaram sua atenção.
              Você pode voltar para conhecer melhor cada um deles.
            </Text>
          </View>

          {erro ? (
            <View style={estilos.cartaoVazio}>
              <Text style={estilos.tituloVazio}>
                Não foi possível carregar seus favoritos
              </Text>

              <Text style={estilos.textoErro}>
                {erro}
              </Text>

              <View style={estilos.botaoVazio}>
                <BotaoAcao
                  titulo="Tentar novamente"
                  onPress={() => carregarFavoritos()}
                />
              </View>
            </View>
          ) : favoritos.length === 0 ? (
            <View style={estilos.cartaoVazio}>
              <Text style={estilos.tituloVazio}>
                Você ainda não tem favoritos
              </Text>

              <Text style={estilos.textoAuxiliar}>
                Explore os animais disponíveis e salve
                aqueles que você gostaria de conhecer melhor.
              </Text>

              <View style={estilos.botaoVazio}>
                <BotaoAcao
                  titulo="Conhecer animais"
                  onPress={() =>
                    navigation.navigate('Animais')
                  }
                />
              </View>
            </View>
          ) : (
            <>
              <View style={estilos.cabecalhoLista}>
                <Text style={estilos.tituloLista}>
                  Pets que você salvou
                </Text>

                <Text style={estilos.quantidade}>
                  {favoritos.length === 1
                    ? '1 animal salvo'
                    : `${favoritos.length} animais salvos`}
                </Text>
              </View>

              <View style={estilos.grade}>
                {favoritos.map((animal, index) => {
                  const removendo =
                    removendoId !== null &&
                    String(removendoId) ===
                      String(animal.animal_id);

                  return (
                    <View
                      key={String(
                        animal.id ??
                        animal.animal_id ??
                        index
                      )}
                      style={[
                        estilos.itemGrade,
                        colunas === 2 &&
                          estilos.itemDuasColunas,
                        colunas === 3 &&
                          estilos.itemTresColunas,
                      ]}
                    >
                      <CartaoFavorito
                        animal={animal}
                        removendo={removendo}
                        bloqueado={removendoId !== null}
                        onDetalhes={() =>
                          abrirDetalhes(animal)
                        }
                        onRemover={() =>
                          confirmarRemocao(
                            animal.animal_id,
                            animal.nome
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
    paddingTop: 36,
    paddingBottom: 70,
  },

  larguraMaxima: {
    width: '100%',
    maxWidth: 1250,
    alignSelf: 'center',
  },

  centralizado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: CORES.fundo,
  },

  cabecalhoPagina: {
    marginBottom: 30,
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

  cabecalhoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  tituloLista: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
  },

  quantidade: {
    color: CORES.secundario,
    fontSize: 13,
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    alignItems: 'stretch',
  },

  itemGrade: {
    width: '100%',
  },

  itemDuasColunas: {
    width: '48%',
  },

  itemTresColunas: {
    width: '31.4%',
  },

  cartao: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    overflow: 'hidden',
  },

  areaFoto: {
    height: 230,
    backgroundColor: CORES.verdeClaro,
    position: 'relative',
  },

  foto: {
    width: '100%',
    height: '100%',
  },

  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  textoSemFoto: {
    color: CORES.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  etiquetaStatus: {
    position: 'absolute',
    top: 14,
    left: 14,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  textoStatus: {
    fontSize: 11,
    fontWeight: '800',
  },

  informacoes: {
    padding: 20,
    flex: 1,
  },

  especie: {
    color: CORES.verde,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 7,
  },

  nomeAnimal: {
    color: CORES.texto,
    fontSize: 24,
    fontWeight: '800',
  },

  localizacao: {
    color: CORES.secundario,
    fontSize: 13,
    marginTop: 8,
  },

  caracteristicas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  etiquetaDetalhe: {
    backgroundColor: '#F6F5F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  textoDetalhe: {
    color: CORES.texto,
    fontSize: 12,
    fontWeight: '600',
  },

  raca: {
    color: CORES.secundario,
    fontSize: 13,
    marginTop: 15,
  },

  descricao: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 12,
  },

  areaBotoes: {
    gap: 10,
    marginTop: 'auto',
    paddingTop: 22,
  },

  botao: {
    backgroundColor: CORES.laranja,
    borderRadius: 11,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoSecundario: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
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
    color: CORES.vermelho,
  },

  cartaoVazio: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    minHeight: 260,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  tituloVazio: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoAuxiliar: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  textoErro: {
    color: CORES.vermelho,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  botaoVazio: {
    width: '100%',
    maxWidth: 240,
    marginTop: 10,
  },
});
