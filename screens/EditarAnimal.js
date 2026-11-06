
import React, { useCallback, useState } from 'react';
import {
  Text,
  View,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormularioAnimal, {
  prepararAnimal,
} from '../components/FormularioAnimal.js';

import {
  Aviso,
  Botao,
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
  secundario: '#7C8492',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E6',
  verde: '#579F13',
  verdeClaro: '#EDF5E7',
  borda: '#EAE6DF',
};

function formatarStatus(status) {
  const nomes = {
    disponivel: 'Disponível',
    adotado: 'Adotado',
    reservado: 'Reservado',
    indisponivel: 'Indisponível',
  };

  return nomes[status] || status || 'Disponível';
}

function PreviaAnimal({ campos }) {
  const foto = campos.foto?.trim();

  const informacoes = [
    campos.especie,
    campos.raca,
    campos.idade
      ? `${campos.idade} ${campos.unidade_idade || 'anos'}`
      : '',
  ].filter(Boolean);

  return (
    <View style={estilos.cartaoPrevia}>
      <Text style={estilos.tituloPrevia}>
        Prévia do animal
      </Text>

      <Text style={estilos.descricaoPrevia}>
        Veja como as informações do pet estão ficando.
      </Text>

      <View style={estilos.areaFoto}>
        {foto ? (
          <Image
            source={{ uri: foto }}
            style={estilos.foto}
            resizeMode="cover"
          />
        ) : (
          <View style={estilos.fotoVazia}>
            <Text style={estilos.textoFotoVazia}>
              Sem foto cadastrada
            </Text>
          </View>
        )}
      </View>

      <View style={estilos.informacoesPrevia}>
        <Text style={estilos.nomePrevia}>
          {campos.nome?.trim() || 'Nome do animal'}
        </Text>

        <Text style={estilos.detalhesPrevia}>
          {informacoes.join(' · ') || 'Informações do pet'}
        </Text>

        {campos.cidade ? (
          <Text style={estilos.cidadePrevia}>
            {campos.cidade}
          </Text>
        ) : null}

        <View style={estilos.etiquetaStatus}>
          <Text style={estilos.textoStatus}>
            {formatarStatus(campos.status)}
          </Text>
        </View>

        {campos.descricao ? (
          <>
            <View style={estilos.divisor} />

            <Text style={estilos.rotuloPrevia}>
              Sobre o pet
            </Text>

            <Text style={estilos.descricaoAnimal}>
              {campos.descricao}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

export default function EditarAnimal({
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

  const [campos, setCampos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  const duasColunas = width >= 950;

  const carregarAnimal = useCallback(
    async (signal) => {
      setCarregando(true);
      setErro('');
      setSucesso('');

      try {
        if (id === undefined || id === null) {
          throw new Error(
            'Animal não informado. Volte para a lista de animais.'
          );
        }

        const resposta = await fetchAutenticado(
          '/animais/' + id,
          { signal }
        );

        const animal = await lerResposta(resposta);

        if (signal?.aborted) return;

        setCampos({
          nome: animal.nome || '',
          especie: animal.especie || '',
          raca: animal.raca || '',
          idade:
            animal.idade === null ||
            animal.idade === undefined
              ? ''
              : String(animal.idade),
          unidade_idade: animal.unidade_idade || 'anos',
          porte: animal.porte || '',
          sexo: animal.sexo || '',
          cidade: animal.cidade || '',
          descricao: animal.descricao || '',
          saude: animal.saude || '',
          foto: animal.foto || '',
          status: animal.status || 'disponivel',
        });
      } catch (falha) {
        if (!signal?.aborted) {
          setCampos(null);
          setErro(
            falha.message ||
            'Não foi possível carregar o animal.'
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
      if (!podeGerenciar) return undefined;

      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return () => controle.abort();
    }, [carregarAnimal, podeGerenciar])
  );

  function alterarCampo(campo, texto) {
    setCampos((anteriores) => ({
      ...anteriores,
      [campo]: texto,
    }));

    setErro('');
    setSucesso('');
  }

  async function atualizarAnimal() {
    if (salvando || !campos) return;

    setErro('');
    setSucesso('');

    try {
      const animal = prepararAnimal(campos);

      setSalvando(true);

      const resposta = await fetchAutenticado(
        '/animais/' + id,
        {
          method: 'PUT',
          body: JSON.stringify(animal),
        }
      );

      const dados = await lerResposta(resposta);

      navigation.goBack();
      
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível atualizar o animal.'
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!podeGerenciar) {
    return (
      <SafeAreaView style={estilos.centralizado}>
        <Aviso
          mensagem="Apenas ONGs, protetores e administradores podem editar animais."
        />
      </SafeAreaView>
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
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.larguraMaxima}>
          <View style={estilos.cabecalho}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={estilos.voltarCabecalho}
              accessibilityRole="button"
            >
              <Text style={estilos.textoVoltar}>
                ← Voltar ao gerenciamento
              </Text>
            </Pressable>

            <Text style={estilos.titulo}>
              Editar animal
            </Text>

            <Text style={estilos.subtitulo}>
              Atualize as informações do pet e confira
              as alterações na prévia ao lado.
            </Text>
          </View>

          {erro ? (
            <View style={estilos.areaAviso}>
              <Aviso mensagem={erro} />
            </View>
          ) : null}

          {sucesso ? (
            <View style={estilos.areaAviso}>
              <Aviso
                mensagem={sucesso}
                tipo="sucesso"
              />
            </View>
          ) : null}

          {carregando ? (
            <Carregamento
              mensagem="Carregando informações do animal..."
            />
          ) : campos ? (
            <View
              style={[
                estilos.areaEdicao,
                duasColunas
                  ? estilos.areaEdicaoHorizontal
                  : estilos.areaEdicaoVertical,
              ]}
            >
              <View
                style={[
                  estilos.colunaFormulario,
                  duasColunas && estilos.colunaFormularioDesktop,
                ]}
              >
                <View style={estilos.cartaoFormulario}>
                  <Text style={estilos.tituloFormulario}>
                    Informações do animal
                  </Text>

                  <Text style={estilos.descricaoFormulario}>
                    Edite os dados abaixo e salve quando terminar.
                  </Text>

                  <FormularioAnimal
                    campos={campos}
                    onAlterar={alterarCampo}
                    onSalvar={atualizarAnimal}
                    salvando={salvando}
                    tituloBotao="Salvar alterações"
                  />
                </View>
              </View>

              <View
                style={[
                  estilos.colunaPrevia,
                  duasColunas && estilos.colunaPreviaDesktop,
                ]}
              >
                <PreviaAnimal campos={campos} />
              </View>
            </View>
          ) : (
            <View style={estilos.areaErro}>
              <Botao
                titulo="Tentar novamente"
                onPress={() => carregarAnimal()}
              />
            </View>
          )}

          <View style={estilos.areaBotaoVoltar}>
            <Pressable
              style={estilos.botaoVoltar}
              onPress={() => navigation.goBack()}
              disabled={salvando}
              accessibilityRole="button"
            >
              <Text style={estilos.textoBotaoVoltar}>
                Cancelar e voltar
              </Text>
            </Pressable>
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
    paddingTop: 35,
    paddingBottom: 55,
  },

  larguraMaxima: {
    width: '100%',
    maxWidth: 1250,
    alignSelf: 'center',
  },

  centralizado: {
    flex: 1,
    backgroundColor: CORES.fundo,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  cabecalho: {
    marginBottom: 28,
  },

  voltarCabecalho: {
    alignSelf: 'flex-start',
    marginBottom: 22,
    paddingVertical: 6,
  },

  textoVoltar: {
    color: CORES.verde,
    fontSize: 14,
    fontWeight: '700',
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
  },

  areaAviso: {
    marginBottom: 18,
  },

  areaEdicao: {
    gap: 24,
    alignItems: 'flex-start',
  },

  areaEdicaoHorizontal: {
    flexDirection: 'row',
  },

  areaEdicaoVertical: {
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

  colunaPrevia: {
    width: '100%',
  },

  colunaPreviaDesktop: {
    width: '34%',
  },

  cartaoFormulario: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: CORES.borda,
  },

  tituloFormulario: {
    fontSize: 21,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 8,
  },

  descricaoFormulario: {
    fontSize: 14,
    color: CORES.secundario,
    lineHeight: 22,
    marginBottom: 25,
  },

  cartaoPrevia: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CORES.borda,
    padding: 22,
  },

  tituloPrevia: {
    fontSize: 21,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 8,
  },

  descricaoPrevia: {
    fontSize: 13,
    color: CORES.secundario,
    lineHeight: 20,
    marginBottom: 20,
  },

  areaFoto: {
    width: '100%',
    height: 300,
    backgroundColor: CORES.laranjaClaro,
    borderRadius: 12,
    overflow: 'hidden',
  },

  foto: {
    width: '100%',
    height: '100%',
  },

  fotoVazia: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  textoFotoVazia: {
    color: CORES.secundario,
    fontSize: 14,
    textAlign: 'center',
  },

  informacoesPrevia: {
    paddingTop: 20,
  },

  nomePrevia: {
    fontSize: 24,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 8,
  },

  detalhesPrevia: {
    fontSize: 14,
    color: CORES.secundario,
    lineHeight: 22,
  },

  cidadePrevia: {
    fontSize: 13,
    color: CORES.secundario,
    marginTop: 8,
  },

  etiquetaStatus: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
  },

  textoStatus: {
    color: CORES.verde,
    fontSize: 12,
    fontWeight: '700',
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginVertical: 20,
  },

  rotuloPrevia: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
  },

  descricaoAnimal: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 23,
  },

  areaErro: {
    paddingVertical: 20,
    alignItems: 'flex-start',
  },

  areaBotaoVoltar: {
    marginTop: 25,
    alignItems: 'flex-start',
  },

  botaoVoltar: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },

  textoBotaoVoltar: {
    color: CORES.texto,
    fontSize: 14,
    fontWeight: '700',
  },
});
