
import React, { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Carregamento,
} from '../components/ui.js';

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
};

function formatarIdade(animal) {
  if (
    animal?.idade === null ||
    animal?.idade === undefined ||
    animal?.idade === ''
  ) {
    return 'Não informada';
  }

  const idade = Number(animal.idade);

  if (!Number.isFinite(idade)) {
    return String(animal.idade);
  }

  if (animal.unidade_idade === 'meses') {
    return `${idade} ${idade === 1 ? 'mês' : 'meses'}`;
  }

  return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
}

function obterStatus(status) {
  switch (status) {
    case 'disponivel':
      return {
        texto: 'Disponível para adoção',
        fundo: CORES.verdeClaro,
        cor: '#376B0C',
      };

    case 'em_processo':
      return {
        texto: 'Em processo de adoção',
        fundo: CORES.laranjaClaro,
        cor: '#A94C14',
      };

    case 'adotado':
      return {
        texto: 'Adotado',
        fundo: '#F0F0F0',
        cor: '#727782',
      };

    default:
      return {
        texto: status || 'Status não informado',
        fundo: '#F0F0F0',
        cor: CORES.secundario,
      };
  }
}

function CampoInformacao({ titulo, valor }) {
  return (
    <View style={estilos.campoInformacao}>
      <Text style={estilos.rotulo}>
        {titulo}
      </Text>

      <Text style={estilos.valor}>
        {valor || 'Não informado'}
      </Text>
    </View>
  );
}

export default function DetalhesAnimal({
  route,
  navigation,
  usuario,
}) {
  const { width } = useWindowDimensions();

  const id =
    route.params?.id ??
    route.params?.animalId ??
    route.params?.animal?.id ??
    route.params?.animal?.id_animal;

  const [animal, setAnimal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const duasColunas = width >= 850;

  const carregarAnimal = useCallback(
    async (signal) => {
      setCarregando(true);
      setErro('');

      try {
        if (id === undefined || id === null) {
          throw new Error(
            'Animal não informado. Volte para a lista de adoção.'
          );
        }

        const resposta = await fetchAutenticado(
          '/animais/' + id,
          { signal }
        );

        const dados = await lerResposta(resposta);

        if (!signal?.aborted) {
          setAnimal(dados);
        }
      } catch (falha) {
        if (!signal?.aborted) {
          setAnimal(null);
          setErro(
            falha.message ||
            'Não foi possível carregar este animal.'
          );
        }
      } finally {
        if (!signal?.aborted) {
          setCarregando(false);
        }
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return () => controle.abort();
    }, [carregarAnimal])
  );

  function solicitarAdocao() {
    if (!animal) return;

    const animalId = animal.id ?? animal.id_animal;

    navigation.navigate('SolicitarAdocao', {
      id: animalId,
    });
  }

  const podeAdotar =
    usuario?.nivel === 'adotante' &&
    animal?.status === 'disponivel';

  const status = obterStatus(animal?.status);

  const foto =
    animal?.foto ||
    animal?.imagem ||
    animal?.foto_url;

  return (
    <SafeAreaView
      style={estilos.tela}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.larguraMaxima}>
          <Pressable
            style={estilos.voltarCabecalho}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={estilos.textoVoltar}>
              ← Voltar para os animais
            </Text>
          </Pressable>

          {erro ? (
            <View style={estilos.areaAviso}>
              <Aviso mensagem={erro} />
            </View>
          ) : null}

          {carregando ? (
            <Carregamento
              mensagem="Carregando informações do pet..."
            />
          ) : animal ? (
            <>
              <View
                style={[
                  estilos.areaPrincipal,
                  duasColunas
                    ? estilos.areaPrincipalDesktop
                    : estilos.areaPrincipalMobile,
                ]}
              >
                <View
                  style={[
                    estilos.colunaFoto,
                    duasColunas && estilos.colunaFotoDesktop,
                  ]}
                >
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
                  </View>
                </View>

                <View
                  style={[
                    estilos.colunaInformacoes,
                    duasColunas &&
                      estilos.colunaInformacoesDesktop,
                  ]}
                >
                  <Text style={estilos.especie}>
                    {animal.especie || 'Animal para adoção'}
                  </Text>

                  <Text style={estilos.nome}>
                    {animal.nome || 'Nome não informado'}
                  </Text>

                  <Text style={estilos.frase}>
                    Conheça um pouco mais sobre este pet.
                  </Text>

                  <View
                    style={[
                      estilos.statusContainer,
                      { backgroundColor: status.fundo },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.status,
                        { color: status.cor },
                      ]}
                    >
                      {status.texto}
                    </Text>
                  </View>

                  <View style={estilos.divisor} />

                  <Text style={estilos.tituloSecao}>
                    Informações do pet
                  </Text>

                  <View style={estilos.gradeInformacoes}>
                    <CampoInformacao
                      titulo="Espécie"
                      valor={animal.especie}
                    />

                    <CampoInformacao
                      titulo="Raça"
                      valor={animal.raca}
                    />

                    <CampoInformacao
                      titulo="Idade"
                      valor={formatarIdade(animal)}
                    />

                    <CampoInformacao
                      titulo="Porte"
                      valor={animal.porte}
                    />

                    <CampoInformacao
                      titulo="Sexo"
                      valor={animal.sexo}
                    />

                    <CampoInformacao
                      titulo="Localização"
                      valor={animal.cidade}
                    />
                  </View>

                  {podeAdotar ? (
                    <Pressable
                      style={estilos.botaoAdotar}
                      onPress={solicitarAdocao}
                      accessibilityRole="button"
                    >
                      <Text style={estilos.textoBotaoAdotar}>
                        Quero adotar
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <View style={estilos.areaComplementar}>
                <View style={estilos.secaoTexto}>
                  <Text style={estilos.tituloSecao}>
                    Sobre mim
                  </Text>

                  <Text style={estilos.textoDescricao}>
                    {animal.descricao ||
                      'Ainda não temos uma descrição cadastrada para este animal.'}
                  </Text>
                </View>

                {animal.saude ? (
                  <View style={estilos.secaoTexto}>
                    <Text style={estilos.tituloSecao}>
                      Saúde e cuidados
                    </Text>

                    <Text style={estilos.textoDescricao}>
                      {animal.saude}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : (
            <View style={estilos.areaErro}>
              <Text style={estilos.textoErro}>
                Não foi possível exibir as informações
                deste animal.
              </Text>

              <Pressable
                style={estilos.botaoTentar}
                onPress={() => carregarAnimal()}
                accessibilityRole="button"
              >
                <Text style={estilos.textoBotaoTentar}>
                  Tentar novamente
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },

  conteudo: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 65,
  },

  larguraMaxima: {
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },

  voltarCabecalho: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    marginBottom: 25,
  },

  textoVoltar: {
    color: CORES.verde,
    fontSize: 14,
    fontWeight: '700',
  },

  areaAviso: {
    marginBottom: 20,
  },

  areaPrincipal: {
    gap: 30,
    alignItems: 'flex-start',
  },

  areaPrincipalDesktop: {
    flexDirection: 'row',
  },

  areaPrincipalMobile: {
    flexDirection: 'column',
  },

  colunaFoto: {
    width: '100%',
  },

  colunaFotoDesktop: {
    width: '45%',
  },

  areaFoto: {
    width: '100%',
    height: 460,
    backgroundColor: CORES.verdeClaro,
    borderRadius: 16,
    overflow: 'hidden',
  },

  foto: {
    width: '100%',
    height: '100%',
  },

  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  textoSemFoto: {
    color: CORES.secundario,
    fontSize: 15,
  },

  colunaInformacoes: {
    width: '100%',
  },

  colunaInformacoesDesktop: {
    flex: 1,
    width: undefined,
    minWidth: 0,
  },

  especie: {
    color: CORES.verde,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  nome: {
    color: CORES.texto,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 10,
  },

  frase: {
    color: CORES.secundario,
    fontSize: 15,
    lineHeight: 24,
  },

  statusContainer: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginTop: 18,
  },

  status: {
    fontSize: 13,
    fontWeight: '700',
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginVertical: 27,
  },

  tituloSecao: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 20,
  },

  gradeInformacoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  campoInformacao: {
    width: '47%',
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    padding: 15,
    minWidth: 0,
  },

  rotulo: {
    color: CORES.secundario,
    fontSize: 12,
    marginBottom: 7,
  },

  valor: {
    color: CORES.texto,
    fontSize: 15,
    fontWeight: '700',
  },

  botaoAdotar: {
    backgroundColor: CORES.laranja,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    minHeight: 54,
  },

  textoBotaoAdotar: {
    color: CORES.branco,
    fontSize: 16,
    fontWeight: '800',
  },

  areaComplementar: {
    marginTop: 35,
    gap: 20,
  },

  secaoTexto: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 25,
  },

  textoDescricao: {
    color: CORES.secundario,
    fontSize: 15,
    lineHeight: 26,
  },

  areaErro: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
  },

  textoErro: {
    color: CORES.secundario,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },

  botaoTentar: {
    backgroundColor: CORES.verdeClaro,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 10,
  },

  textoBotaoTentar: {
    color: CORES.verde,
    fontSize: 14,
    fontWeight: '800',
  },
});
