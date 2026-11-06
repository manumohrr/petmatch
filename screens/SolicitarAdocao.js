
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

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
  vermelho: '#D94B4B',
};

function ResumoAnimal({ animal }) {
  const foto =
    animal.foto ||
    animal.imagem ||
    animal.foto_url;

  return (
    <View style={estilos.cartaoResumo}>
      <Text style={estilos.tituloResumo}>
        O pet que você escolheu
      </Text>

      <Text style={estilos.subtituloResumo}>
        Confira as informações antes de enviar
        sua solicitação.
      </Text>

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

      <View style={estilos.dadosAnimal}>
        <Text style={estilos.especie}>
          {animal.especie || 'Animal para adoção'}
        </Text>

        <Text style={estilos.nomeAnimal}>
          {animal.nome || 'Nome não informado'}
        </Text>

        {animal.raca ? (
          <Text style={estilos.detalhesAnimal}>
            {animal.raca}
          </Text>
        ) : null}

        {animal.cidade ? (
          <Text style={estilos.localizacao}>
            {animal.cidade}
          </Text>
        ) : null}

        <View style={estilos.statusContainer}>
          <Text style={estilos.textoStatus}>
            {animal.status === 'disponivel'
              ? 'Disponível para adoção'
              : 'Indisponível para adoção'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SolicitarAdocao({
  route,
  navigation,
}) {
  const { width } = useWindowDimensions();

  const animalId =
    route.params?.animalId ??
    route.params?.id;

  const [animal, setAnimal] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const duasColunas = width >= 900;

  function avisar(titulo, texto, aoConfirmar) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${texto}`);

      if (aoConfirmar) {
        aoConfirmar();
      }
    } else {
      Alert.alert(titulo, texto, [
        {
          text: 'OK',
          onPress: aoConfirmar,
        },
      ]);
    }
  }

  useEffect(() => {
    const controle = new AbortController();

    async function carregarAnimal() {
      setCarregando(true);
      setErro('');

      if (animalId === undefined || animalId === null) {
        setErro('Animal não informado.');
        setCarregando(false);
        return;
      }

      try {
        const resposta = await fetchAutenticado(
          `/animais/${animalId}`,
          { signal: controle.signal }
        );

        const dados = await lerResposta(resposta);

        if (!controle.signal.aborted) {
          setAnimal(dados);
        }
      } catch (falha) {
        if (!controle.signal.aborted) {
          setAnimal(null);
          setErro(
            falha.message ||
            'Não foi possível carregar as informações do animal.'
          );
        }
      } finally {
        if (!controle.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregarAnimal();

    return () => controle.abort();
  }, [animalId]);

  async function enviarSolicitacao() {
    if (enviando) return;

    setErro('');

    if (!animalId || !animal) {
      setErro('Animal não encontrado.');
      return;
    }

    if (animal.status !== 'disponivel') {
      setErro(
        'Este animal não está disponível para adoção.'
      );
      return;
    }

    if (!mensagem.trim()) {
      setErro(
        'Escreva uma mensagem contando por que deseja adotar.'
      );
      return;
    }

    if (mensagem.trim().length > 1000) {
      setErro(
        'A mensagem deve ter até 1000 caracteres.'
      );
      return;
    }

    try {
      setEnviando(true);

      const resposta = await fetchAutenticado(
        '/adocoes',
        {
          method: 'POST',
          body: JSON.stringify({
            animal_id: Number(animalId),
            mensagem: mensagem.trim(),
          }),
        }
      );

      await lerResposta(resposta);

      avisar(
        'Solicitação enviada!',
        'Seu pedido de adoção foi enviado com sucesso. Acompanhe a resposta em Minhas Solicitações.',
        () => navigation.navigate('MinhasSolicitacoes')
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível enviar a solicitação.'
      );
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={CORES.laranja}
        />

        <Text style={estilos.textoAuxiliar}>
          Carregando informações...
        </Text>
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.tituloErro}>
          Animal não encontrado
        </Text>

        <Text style={estilos.textoAuxiliar}>
          {erro ||
            'Não foi possível encontrar as informações deste pet.'}
        </Text>

        <Pressable
          style={estilos.botaoPrincipal}
          onPress={() => navigation.goBack()}
        >
          <Text style={estilos.textoBotaoPrincipal}>
            Voltar
          </Text>
        </Pressable>
      </View>
    );
  }

  const disponivel = animal.status === 'disponivel';

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.larguraMaxima}>
          <Pressable
            style={estilos.voltarCabecalho}
            onPress={() => navigation.goBack()}
            disabled={enviando}
            accessibilityRole="button"
          >
            <Text style={estilos.textoVoltar}>
              ← Voltar ao perfil do animal
            </Text>
          </Pressable>

          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>
              Solicitar adoção
            </Text>

            <Text style={estilos.subtitulo}>
              Você está a um passo de demonstrar
              seu interesse em oferecer um novo lar
              para este pet.
            </Text>
          </View>

          <View
            style={[
              estilos.areaPrincipal,
              duasColunas
                ? estilos.areaHorizontal
                : estilos.areaVertical,
            ]}
          >
            <View
              style={[
                estilos.colunaFormulario,
                duasColunas &&
                  estilos.colunaFormularioDesktop,
              ]}
            >
              <View style={estilos.cartaoFormulario}>
                <View style={estilos.cabecalhoFormulario}>
                  <View style={estilos.numeroEtapa}>
                    <Text style={estilos.textoNumeroEtapa}>
                      1
                    </Text>
                  </View>

                  <View style={estilos.textosEtapa}>
                    <Text style={estilos.tituloFormulario}>
                      Conte um pouco sobre você
                    </Text>

                    <Text style={estilos.descricaoFormulario}>
                      Essa mensagem será enviada
                      ao responsável pelo animal.
                    </Text>
                  </View>
                </View>

                <View style={estilos.divisor} />

                <Text style={estilos.rotulo}>
                  Sua mensagem
                </Text>

                <Text style={estilos.ajudaCampo}>
                  Explique por que você gostaria de
                  adotar {animal.nome || 'este pet'}.
                </Text>

                <TextInput
                  style={estilos.campoMensagem}
                  placeholder="Olá! Tenho interesse em adotar este pet porque..."
                  placeholderTextColor="#999FA8"
                  multiline
                  textAlignVertical="top"
                  value={mensagem}
                  onChangeText={(texto) => {
                    setMensagem(texto);
                    setErro('');
                  }}
                  maxLength={1000}
                  editable={!enviando && disponivel}
                  accessibilityLabel="Mensagem de solicitação de adoção"
                />

                <Text style={estilos.contador}>
                  {mensagem.length}/1000 caracteres
                </Text>

                {erro ? (
                  <View style={estilos.avisoErro}>
                    <Text style={estilos.textoErro}>
                      {erro}
                    </Text>
                  </View>
                ) : null}

                {!disponivel ? (
                  <View style={estilos.avisoErro}>
                    <Text style={estilos.textoErro}>
                      Este animal não está disponível
                      para novas solicitações.
                    </Text>
                  </View>
                ) : null}

                <View style={estilos.aviso}>
                  <Text style={estilos.tituloAviso}>
                    Antes de enviar
                  </Text>

                  <Text style={estilos.textoAviso}>
                    Enviar a solicitação não significa
                    que a adoção foi aprovada. O responsável
                    vai analisar seu pedido antes de confirmar.
                  </Text>
                </View>

                <Pressable
                  style={[
                    estilos.botaoPrincipal,
                    (enviando || !disponivel) &&
                      estilos.botaoDesabilitado,
                  ]}
                  onPress={enviarSolicitacao}
                  disabled={enviando || !disponivel}
                  accessibilityRole="button"
                >
                  {enviando ? (
                    <ActivityIndicator color={CORES.branco} />
                  ) : (
                    <Text style={estilos.textoBotaoPrincipal}>
                      Enviar solicitação
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={estilos.botaoSecundario}
                  onPress={() => navigation.goBack()}
                  disabled={enviando}
                  accessibilityRole="button"
                >
                  <Text style={estilos.textoBotaoSecundario}>
                    Cancelar
                  </Text>
                </Pressable>
              </View>
            </View>

            <View
              style={[
                estilos.colunaResumo,
                duasColunas && estilos.colunaResumoDesktop,
              ]}
            >
              <ResumoAnimal animal={animal} />
            </View>
          </View>
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
    paddingTop: 32,
    paddingBottom: 60,
  },

  larguraMaxima: {
    width: '100%',
    maxWidth: 1150,
    alignSelf: 'center',
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: CORES.fundo,
  },

  textoAuxiliar: {
    fontSize: 14,
    color: CORES.secundario,
    textAlign: 'center',
    lineHeight: 22,
  },

  tituloErro: {
    fontSize: 24,
    fontWeight: '800',
    color: CORES.texto,
  },

  voltarCabecalho: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    marginBottom: 23,
  },

  textoVoltar: {
    color: CORES.verde,
    fontSize: 14,
    fontWeight: '700',
  },

  cabecalho: {
    marginBottom: 28,
  },

  titulo: {
    fontSize: 34,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: CORES.secundario,
    lineHeight: 24,
    maxWidth: 650,
  },

  areaPrincipal: {
    gap: 24,
    alignItems: 'flex-start',
  },

  areaHorizontal: {
    flexDirection: 'row',
  },

  areaVertical: {
    flexDirection: 'column',
  },

  colunaFormulario: {
    width: '100%',
  },

  colunaFormularioDesktop: {
    flex: 1,
    width: undefined,
    minWidth: 0,
  },

  colunaResumo: {
    width: '100%',
  },

  colunaResumoDesktop: {
    width: '35%',
  },

  cartaoFormulario: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 25,
  },

  cabecalhoFormulario: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },

  numeroEtapa: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: CORES.laranjaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoNumeroEtapa: {
    color: CORES.laranja,
    fontSize: 17,
    fontWeight: '800',
  },

  textosEtapa: {
    flex: 1,
  },

  tituloFormulario: {
    fontSize: 21,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 7,
  },

  descricaoFormulario: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 22,
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginVertical: 24,
  },

  rotulo: {
    fontSize: 15,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 7,
  },

  ajudaCampo: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 14,
  },

  campoMensagem: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: CORES.texto,
    minHeight: 180,
  },

  contador: {
    color: CORES.secundario,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 9,
    marginBottom: 20,
  },

  aviso: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 12,
    padding: 17,
    marginBottom: 22,
  },

  tituloAviso: {
    color: CORES.verde,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 7,
  },

  textoAviso: {
    color: '#496B35',
    fontSize: 13,
    lineHeight: 21,
  },

  avisoErro: {
    backgroundColor: '#FFF0F0',
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
  },

  textoErro: {
    color: CORES.vermelho,
    fontSize: 13,
    lineHeight: 20,
  },

  botaoPrincipal: {
    backgroundColor: CORES.laranja,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoDesabilitado: {
    opacity: 0.5,
  },

  textoBotaoPrincipal: {
    color: CORES.branco,
    fontSize: 15,
    fontWeight: '800',
  },

  botaoSecundario: {
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  textoBotaoSecundario: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: '700',
  },

  cartaoResumo: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 22,
  },

  tituloResumo: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8,
  },

  subtituloResumo: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  areaFoto: {
    width: '100%',
    height: 280,
    backgroundColor: CORES.verdeClaro,
    borderRadius: 12,
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
    padding: 20,
  },

  textoSemFoto: {
    color: CORES.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  dadosAnimal: {
    paddingTop: 19,
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
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 8,
  },

  detalhesAnimal: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 22,
  },

  localizacao: {
    color: CORES.secundario,
    fontSize: 13,
    marginTop: 8,
  },

  statusContainer: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    marginTop: 17,
  },

  textoStatus: {
    color: CORES.verde,
    fontSize: 12,
    fontWeight: '800',
  },
});
