
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAutenticado, lerResposta } from '../services/api';

const CORES = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  texto: '#252B35',
  cinza: '#7C8492',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E6',
  verde: '#579F13',
  verdeClaro: '#EDF5E7',
  borda: '#EAE6DF',
  vermelho: '#C94C4C',
  vermelhoClaro: '#FFF0F0',
};

function obterId(animal) {
  return animal.id ?? animal.id_animal;
}

function obterFoto(animal) {
  return animal.foto || animal.imagem || animal.foto_url || '';
}

function obterStatus(animal) {
  const valor = String(
    animal.status || animal.situacao || 'disponivel'
  ).toLowerCase();

  if (valor === 'disponivel' || valor === 'disponível') {
    return 'Disponível';
  }

  if (valor === 'adotado') {
    return 'Adotado';
  }

  if (valor === 'reservado') {
    return 'Reservado';
  }

  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function BotaoAcao({ titulo, simbolo, perigo = false, onPress }) {
  return (
    <Pressable
      style={[
        estilos.botaoAcao,
        perigo && estilos.botaoPerigo,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={[
          estilos.textoBotaoAcao,
          perigo && estilos.textoPerigo,
        ]}
      >
        {simbolo} {titulo}
      </Text>
    </Pressable>
  );
}

export default function GerenciarAnimais({ navigation, usuario }) {
  const { width } = useWindowDimensions();
  const compacto = width < 650;

  const [animais, setAnimais] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState(null);
  const [erro, setErro] = useState('');

  const administrador = usuario?.nivel === 'admin';

  const carregarAnimais = useCallback(async () => {
    try {
      setCarregando(true);
      setErro('');

      const resposta = await fetchAutenticado('/animais');
      const dados = await lerResposta(resposta);

      setAnimais(
        Array.isArray(dados)
          ? dados
          : Array.isArray(dados?.animais)
          ? dados.animais
          : []
      );
    } catch (falha) {
      setErro(
        falha.message || 'Não foi possível carregar os animais.'
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarAnimais();
    }, [carregarAnimais])
  );

  function mostrarMensagem(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(mensagem);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  async function excluirAnimal(animal) {
    const id = obterId(animal);

    if (id == null) {
      mostrarMensagem('Erro', 'Este animal não possui um ID válido.');
      return;
    }

    try {
      setExcluindoId(id);

      const resposta = await fetchAutenticado(
        `/animais/${id}`,
        { method: 'DELETE' }
      );

      await lerResposta(resposta);

      setAnimais((anteriores) =>
        anteriores.filter((item) => obterId(item) !== id)
      );

      mostrarMensagem(
        'Animal excluído',
        `${animal.nome} foi excluído com sucesso.`
      );
    } catch (falha) {
      mostrarMensagem(
        'Erro',
        falha.message || 'Não foi possível excluir o animal.'
      );
    } finally {
      setExcluindoId(null);
    }
  }

  function confirmarExclusao(animal) {
    const mensagem =
      `Deseja excluir "${animal.nome}"? ` +
      'Essa ação não pode ser desfeita.';

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) {
        excluirAnimal(animal);
      }
      return;
    }

    Alert.alert('Excluir animal', mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => excluirAnimal(animal),
      },
    ]);
  }

  const animaisFiltrados = animais.filter((animal) => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return true;

    return [
      animal.nome,
      animal.especie,
      animal.raca,
      animal.cidade,
      String(obterId(animal) ?? ''),
    ].some((valor) =>
      String(valor || '').toLowerCase().includes(termo)
    );
  });

  function renderizarAnimal({ item }) {
    const id = obterId(item);
    const foto = obterFoto(item);
    const status = obterStatus(item);
    const excluindo = excluindoId === id;

    return (
      <View
        style={[
          estilos.cartaoAnimal,
          compacto && estilos.cartaoAnimalCompacto,
        ]}
      >
        <View style={estilos.areaAnimal}>
          <View style={estilos.fotoContainer}>
            {foto ? (
              <Image
                source={{ uri: foto }}
                style={estilos.fotoAnimal}
                resizeMode="cover"
              />
            ) : (
              <View style={estilos.fotoVazia}>
                <Text style={estilos.simboloFoto}>♡</Text>
              </View>
            )}
          </View>

          <View style={estilos.informacoesAnimal}>
            <Text style={estilos.codigo}>
              Código #{id ?? '—'}
            </Text>

            <Text
              style={estilos.nomeAnimal}
              numberOfLines={2}
            >
              {item.nome || 'Animal sem nome'}
            </Text>

            <Text style={estilos.detalhesAnimal}>
              {[
                item.especie,
                item.raca,
                item.idade != null ? `${item.idade}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            <View
              style={[
                estilos.etiquetaStatus,
                status === 'Adotado' && estilos.statusAdotado,
              ]}
            >
              <Text
                style={[
                  estilos.textoStatus,
                  status === 'Adotado' && estilos.textoStatusAdotado,
                ]}
              >
                {status}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            estilos.acoes,
            compacto && estilos.acoesCompactas,
          ]}
        >
          <BotaoAcao
            titulo="Editar"
            simbolo="✎"
            onPress={() =>
              navigation.navigate('EditarAnimal', {
                animal: item,
                animalId: id,
                id,
              })
            }
          />

          <BotaoAcao
            titulo={excluindo ? 'Excluindo...' : 'Excluir'}
            simbolo="×"
            perigo
            onPress={() => {
              if (!excluindo) confirmarExclusao(item);
            }}
          />
        </View>
      </View>
    );
  }

  if (!administrador) {
    return (
      <SafeAreaView style={estilos.centralizado}>
        <Text style={estilos.titulo}>Acesso restrito</Text>
        <Text style={estilos.textoAuxiliar}>
          Esta área é exclusiva para administradores.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={animaisFiltrados}
        keyExtractor={(item, index) =>
          String(obterId(item) ?? index)
        }
        renderItem={renderizarAnimal}
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={estilos.larguraMaxima}>
            <View
              style={[
                estilos.cabecalho,
                compacto && estilos.cabecalhoCompacto,
              ]}
            >
              <View style={estilos.areaTitulo}>
                <Text style={estilos.sobretitulo}>
                  PAINEL ADMINISTRATIVO
                </Text>

                <Text style={estilos.titulo}>
                  Gerenciar animais
                </Text>

                <Text style={estilos.subtitulo}>
                  Cadastre, edite e organize os animais do PetMatch.
                </Text>
              </View>

              <Pressable
                style={estilos.botaoNovo}
                onPress={() =>
                  navigation.navigate('CadastrarAnimal')
                }
              >
                <Text style={estilos.textoBotaoNovo}>
                  +  Novo animal
                </Text>
              </Pressable>
            </View>

            <View style={estilos.resumo}>
              <View style={estilos.iconeResumo}>
                <Text style={estilos.simboloResumo}>♡</Text>
              </View>

              <View>
                <Text style={estilos.numeroResumo}>
                  {animais.length}
                </Text>
                <Text style={estilos.legendaResumo}>
                  animais cadastrados
                </Text>
              </View>
            </View>

            <View style={estilos.areaBusca}>
              <Text style={estilos.tituloBusca}>
                Animais cadastrados
              </Text>

              <TextInput
                style={estilos.inputBusca}
                placeholder="Buscar por nome, espécie, raça ou código..."
                placeholderTextColor="#9A9FA8"
                value={busca}
                onChangeText={setBusca}
              />
            </View>

            {erro ? (
              <View style={estilos.cartaoMensagem}>
                <Text style={estilos.textoErro}>
                  {erro}
                </Text>

                <Pressable onPress={carregarAnimais}>
                  <Text style={estilos.textoRecarregar}>
                    Tentar novamente
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {carregando ? (
              <View style={estilos.carregamento}>
                <ActivityIndicator
                  size="large"
                  color={CORES.laranja}
                />
                <Text style={estilos.textoAuxiliar}>
                  Carregando animais...
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !carregando && !erro ? (
            <View style={estilos.cartaoMensagem}>
              <Text style={estilos.textoVazio}>
                {busca
                  ? 'Nenhum animal encontrado para essa busca.'
                  : 'Nenhum animal cadastrado ainda.'}
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: 14 }} />
        )}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
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
    paddingBottom: 40,
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  larguraMaxima: {
    width: '100%',
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    marginBottom: 28,
  },
  cabecalhoCompacto: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  areaTitulo: {
    flex: 1,
  },
  sobretitulo: {
    fontSize: 12,
    color: CORES.verde,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  titulo: {
    fontSize: 32,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 9,
  },
  subtitulo: {
    fontSize: 15,
    color: CORES.cinza,
    lineHeight: 23,
  },
  botaoNovo: {
    backgroundColor: CORES.laranja,
    paddingHorizontal: 23,
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoNovo: {
    color: CORES.branco,
    fontSize: 15,
    fontWeight: '700',
  },
  resumo: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 15,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 32,
  },
  iconeResumo: {
    width: 52,
    height: 52,
    backgroundColor: CORES.branco,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simboloResumo: {
    fontSize: 30,
    color: CORES.verde,
  },
  numeroResumo: {
    fontSize: 30,
    fontWeight: '800',
    color: CORES.texto,
  },
  legendaResumo: {
    fontSize: 14,
    color: CORES.cinza,
    marginTop: 2,
  },
  areaBusca: {
    marginBottom: 22,
    gap: 13,
  },
  tituloBusca: {
    fontSize: 21,
    fontWeight: '800',
    color: CORES.texto,
  },
  inputBusca: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 17,
    paddingVertical: 15,
    fontSize: 14,
    color: CORES.texto,
  },
  cartaoAnimal: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  cartaoAnimalCompacto: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  areaAnimal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  fotoContainer: {
    width: 112,
    height: 112,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: CORES.laranjaClaro,
  },
  fotoAnimal: {
    width: '100%',
    height: '100%',
  },
  fotoVazia: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  simboloFoto: {
    fontSize: 40,
    color: CORES.laranja,
  },
  informacoesAnimal: {
    flex: 1,
    gap: 6,
  },
  codigo: {
    fontSize: 12,
    color: CORES.cinza,
  },
  nomeAnimal: {
    fontSize: 20,
    fontWeight: '800',
    color: CORES.texto,
  },
  detalhesAnimal: {
    fontSize: 13,
    color: CORES.cinza,
    lineHeight: 19,
  },
  etiquetaStatus: {
    alignSelf: 'flex-start',
    backgroundColor: CORES.verdeClaro,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 3,
  },
  statusAdotado: {
    backgroundColor: CORES.laranjaClaro,
  },
  textoStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: CORES.verde,
  },
  textoStatusAdotado: {
    color: CORES.laranja,
  },
  acoes: {
    flexDirection: 'row',
    gap: 10,
  },
  acoesCompactas: {
    justifyContent: 'flex-end',
  },
  botaoAcao: {
    borderWidth: 1,
    borderColor: '#D8E6CE',
    borderRadius: 9,
    paddingHorizontal: 17,
    paddingVertical: 13,
    backgroundColor: CORES.branco,
  },
  textoBotaoAcao: {
    fontSize: 14,
    color: CORES.verde,
    fontWeight: '700',
  },
  botaoPerigo: {
    borderColor: '#F0D2D2',
  },
  textoPerigo: {
    color: CORES.vermelho,
  },
  carregamento: {
    paddingVertical: 45,
    alignItems: 'center',
    gap: 14,
  },
  centralizado: {
    flex: 1,
    backgroundColor: CORES.fundo,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  textoAuxiliar: {
    fontSize: 14,
    color: CORES.cinza,
    textAlign: 'center',
  },
  cartaoMensagem: {
    backgroundColor: CORES.branco,
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CORES.borda,
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  textoVazio: {
    fontSize: 15,
    color: CORES.cinza,
    textAlign: 'center',
  },
  textoErro: {
    fontSize: 14,
    color: CORES.vermelho,
    textAlign: 'center',
  },
  textoRecarregar: {
    color: CORES.laranja,
    fontWeight: '700',
  },
});
