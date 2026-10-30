
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Botao,
  Carregamento,
  Painel,
  cores,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function Animais({ navigation, usuario }) {
  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [animalExcluir, setAnimalExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState('');

  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR ANIMAIS NA API
  async function carregarAnimais(signal) {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetchAutenticado('/animais', {
        signal,
      });

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setAnimais(Array.isArray(dados) ? dados : []);
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setErro(falha.message);
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR LISTA AO VOLTAR PARA A TELA
  useFocusEffect(
    useCallback(function atualizarLista() {
      const controle = new AbortController();

      carregarAnimais(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [])
  );

  // SOLICITAR EXCLUSÃO
  function solicitarExclusao(animal) {
    setErroExclusao('');
    setSucesso('');
    setAnimalExcluir(animal);
  }

  function cancelarExclusao() {
    if (!excluindo) {
      setAnimalExcluir(null);
    }
  }

  // EXCLUIR ANIMAL
  async function excluirAnimal() {
    if (!animalExcluir || excluindo) return;

    setExcluindo(true);
    setErroExclusao('');

    try {
      const resposta = await fetchAutenticado(
        '/animais/' + animalExcluir.id,
        { method: 'DELETE' }
      );

      const dados = await lerResposta(resposta);

      setAnimais(function (atuais) {
        return atuais.filter(
          (animal) => animal.id !== animalExcluir.id
        );
      });

      setAnimalExcluir(null);

      setSucesso(
        dados.mensagem || 'Cadastro removido com sucesso.'
      );

      await carregarAnimais();
    } catch (falha) {
      setErroExclusao(falha.message);
    } finally {
      setExcluindo(false);
    }
  }

  // FORMATAR INFORMAÇÕES
  function formatarIdade(animal) {
    if (animal.idade === null || animal.idade === undefined) {
      return 'Idade não informada';
    }

    const idade = Number(animal.idade);
    if (!Number.isFinite(idade)) return String(animal.idade);

    const unidade = animal.unidade_idade || 'anos';

    if (unidade === 'meses') {
      return idade + (idade === 1 ? ' mês' : ' meses');
    }

    return idade + (idade === 1 ? ' ano' : ' anos');
  }

  // CARTÃO DO ANIMAL
  function renderizarAnimal({ item }) {
    const status = item.status || 'disponivel';

    const statusTexto =
      status === 'disponivel'
        ? 'Disponível para adoção'
        : status === 'em_processo'
        ? 'Em processo de adoção'
        : status === 'adotado'
        ? 'Adotado'
        : status;

    return (
      <Painel style={locais.cartao}>
        {item.foto ? (
          <Image
            source={{ uri: item.foto }}
            style={locais.foto}
            resizeMode="cover"
          />
        ) : (
          <View style={locais.semFoto}>
            <Text style={locais.textoSemFoto}>
              Foto do pet
            </Text>
          </View>
        )}

        <View style={locais.informacoes}>
          <Text style={locais.especie}>
            {item.especie || 'Animal para adoção'}
          </Text>

          <Text style={locais.nome}>
            {item.nome}
          </Text>

          <Text style={locais.detalhe}>
            Raça: {item.raca || 'Não informada'}
          </Text>

          <Text style={locais.detalhe}>
            Idade: {formatarIdade(item)}
          </Text>

          <Text style={locais.detalhe}>
            Porte: {item.porte || 'Não informado'}
          </Text>

          <Text style={locais.detalhe}>
            Localização: {item.cidade || 'Não informada'}
          </Text>

          <View style={locais.statusContainer}>
            <Text style={locais.status}>
              {statusTexto}
            </Text>
          </View>

          <View style={locais.acoes}>
            <Botao
              titulo="Conhecer este pet"
              onPress={() =>
                navigation.navigate('DetalhesAnimal', {
                  id: item.id,
                })
              }
            />

            {podeGerenciar && (
              <>
                <Botao
                  titulo="Editar cadastro"
                  variante="secundario"
                  onPress={() =>
                    navigation.navigate('EditarAnimal', {
                      id: item.id,
                    })
                  }
                />

                <Botao
                  titulo="Excluir cadastro"
                  variante="perigo"
                  disabled={excluindo}
                  onPress={() => solicitarExclusao(item)}
                />
              </>
            )}
          </View>
        </View>
      </Painel>
    );
  }

  return (
    <SafeAreaView
      style={locais.tela}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={animais}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarAnimal}
        contentContainerStyle={locais.conteudo}
        refreshing={carregando}
        onRefresh={() => carregarAnimais()}
        ListHeaderComponent={
          <View style={locais.cabecalho}>
            <Text style={estilos.etiqueta}>
              PETMATCH / ADOÇÃO RESPONSÁVEL
            </Text>

            <Text style={estilos.titulo}>
              Encontre seu novo amigo!
            </Text>

            <Text style={estilos.subtitulo}>
              Conheça os animais que estão esperando
              por uma família e descubra quem pode
              fazer parte da sua vida.
            </Text>

            <View style={locais.acoes}>
              {podeGerenciar && (
                <Botao
                  titulo="Cadastrar animal"
                  onPress={() =>
                    navigation.navigate('CadastrarAnimal')
                  }
                />
              )}

              <Botao
                titulo="Atualizar lista"
                variante="secundario"
                disabled={carregando || excluindo}
                onPress={() => carregarAnimais()}
              />
            </View>

            <Text style={locais.contagem}>
              {animais.length} animal(is) cadastrado(s)
            </Text>

            <Aviso mensagem={erro} />
            <Aviso mensagem={sucesso} tipo="sucesso" />
          </View>
        }
        ListEmptyComponent={
          carregando ? (
            <Carregamento mensagem="Buscando animais..." />
          ) : (
            <Painel>
              <Text style={estilos.texto}>
                {erro
                  ? 'Não foi possível carregar os animais. Tente atualizar a lista.'
                  : 'Nenhum animal cadastrado no momento.'}
              </Text>
            </Painel>
          )
        }
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal
        visible={animalExcluir !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelarExclusao}
      >
        <View style={locais.fundoModal}>
          <View
            style={locais.modal}
            accessibilityViewIsModal
          >
            <Text
              style={estilos.titulo}
              accessibilityRole="header"
            >
              Excluir cadastro?
            </Text>

            <Text style={estilos.texto}>
              O animal "{animalExcluir?.nome}" será
              removido dos anúncios de adoção.
            </Text>

            <Aviso mensagem={erroExclusao} />

            <View style={locais.acoes}>
              <Botao
                titulo="Confirmar exclusão"
                variante="perigo"
                carregando={excluindo}
                onPress={excluirAnimal}
              />

              <Botao
                titulo="Cancelar"
                variante="secundario"
                disabled={excluindo}
                onPress={cancelarExclusao}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const locais = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 48,
    flexGrow: 1,
  },

  cabecalho: {
    marginBottom: 18,
  },

  cartao: {
    marginBottom: 16,
    overflow: 'hidden',
  },

  foto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },

  semFoto: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#E8EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  textoSemFoto: {
    color: cores.muted,
    fontSize: 15,
  },

  informacoes: {
    gap: 7,
  },

  especie: {
    color: cores.verde,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  nome: {
    color: cores.texto,
    fontSize: 25,
    fontWeight: '700',
  },

  detalhe: {
    color: cores.muted,
    fontSize: 14,
  },

  statusContainer: {
    backgroundColor: '#E8EFE4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 10,
  },

  status: {
    color: cores.verde,
    fontSize: 13,
    fontWeight: '700',
  },

  acoes: {
    gap: 10,
    marginTop: 10,
  },

  contagem: {
    color: cores.muted,
    fontSize: 13,
    marginTop: 20,
  },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 27, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modal: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: cores.papel,
    borderRadius: 18,
    padding: 24,
    gap: 18,
  },
});
