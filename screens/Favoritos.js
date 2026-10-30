
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function Favoritos({ navigation }) {
  const [favoritos, setFavoritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);
  const [erro, setErro] = useState('');

  function avisar(titulo, mensagem) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${mensagem}`);
    } else {
      Alert.alert(titulo, mensagem);
    }
  }

  function confirmarRemocao(animalId, nome) {
    const mensagem = `Deseja remover ${nome} dos seus favoritos?`;

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
          onPress: () => removerFavorito(animalId),
        },
      ]
    );
  }

  // READ - CARREGAR OS ANIMAIS FAVORITOS
  const carregarFavoritos = useCallback(
    async (mostrarCarregamento = true) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
        const resposta = await fetchAutenticado('/favoritos');
        const dados = await lerResposta(resposta);

        setFavoritos(Array.isArray(dados) ? dados : []);
      } catch (erroRequisicao) {
        setErro(
          erroRequisicao.message ||
            'Não foi possível carregar seus favoritos.'
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    []
  );

  // ATUALIZAR SEMPRE QUE ABRIR A TELA
  useFocusEffect(
    useCallback(() => {
      carregarFavoritos();
    }, [carregarFavoritos])
  );

  // DELETE - REMOVER ANIMAL DOS FAVORITOS
  async function removerFavorito(animalId) {
    try {
      setRemovendoId(animalId);

      const resposta = await fetchAutenticado(
        `/favoritos/${animalId}`,
        {
          method: 'DELETE',
        }
      );

      await lerResposta(resposta);

      // ATUALIZAR A LISTA SEM PRECISAR REABRIR A TELA
      setFavoritos((listaAtual) =>
        listaAtual.filter(
          (favorito) =>
            Number(favorito.animal_id) !== Number(animalId)
        )
      );

      avisar(
        'Favorito removido',
        'O animal foi removido dos seus favoritos.'
      );
    } catch (erroRequisicao) {
      avisar(
        'Erro',
        erroRequisicao.message ||
          'Não foi possível remover o favorito.'
      );
    } finally {
      setRemovendoId(null);
    }
  }

  function formatarIdade(idade, unidade) {
    if (idade === null || idade === undefined) {
      return 'Idade não informada';
    }

    const numero = Number(idade);
    const tipo = unidade || 'anos';

    if (tipo === 'meses' || tipo === 'mes') {
      return `${numero} ${numero === 1 ? 'mês' : 'meses'}`;
    }

    return `${numero} ${numero === 1 ? 'ano' : 'anos'}`;
  }

  function nomeStatus(status) {
    switch (status) {
      case 'disponivel':
        return 'Disponível para adoção';

      case 'em_processo':
        return 'Em processo de adoção';

      case 'adotado':
        return 'Adotado';

      default:
        return 'Status não informado';
    }
  }

  function corStatus(status) {
    switch (status) {
      case 'disponivel':
        return '#25805A';

      case 'em_processo':
        return '#B7791F';

      case 'adotado':
        return '#607D8B';

      default:
        return '#607D8B';
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
          Carregando seus favoritos...
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
          onRefresh={() => carregarFavoritos(false)}
        />
      }
    >
      <Text style={estilos.titulo}>
        Meus favoritos
      </Text>

      <Text style={estilos.subtitulo}>
        Aqui ficam os animais que chamaram sua atenção.
        Você pode voltar para conhecer melhor cada um deles.
      </Text>

      {erro ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.textoErro}>
            {erro}
          </Text>

          <Botao
            titulo="Tentar novamente"
            onPress={() => carregarFavoritos()}
          />
        </View>
      ) : favoritos.length === 0 ? (
        <View style={estilos.cartaoVazio}>
          <Text style={estilos.tituloVazio}>
            Você ainda não tem favoritos
          </Text>

          <Text style={estilos.textoAuxiliar}>
            Explore os animais disponíveis e salve aqueles
            que você gostaria de conhecer melhor.
          </Text>

          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Conhecer animais"
              onPress={() => navigation.navigate('Animais')}
            />
          </View>
        </View>
      ) : (
        <>
          <Text style={estilos.quantidade}>
            {favoritos.length}{' '}
            {favoritos.length === 1
              ? 'animal salvo'
              : 'animais salvos'}
          </Text>

          {favoritos.map((animal) => {
            const removendo = removendoId === animal.animal_id;

            return (
              <View
                key={animal.id}
                style={estilos.cartao}
              >
                {animal.foto ? (
                  <Image
                    source={{ uri: animal.foto }}
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

                <View style={estilos.informacoes}>
                  <View style={estilos.cabecalho}>
                    <Text style={estilos.nomeAnimal}>
                      {animal.nome}
                    </Text>

                    <View
                      style={[
                        estilos.etiqueta,
                        {
                          backgroundColor:
                            corStatus(animal.status) + '18',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.textoEtiqueta,
                          {
                            color: corStatus(animal.status),
                          },
                        ]}
                      >
                        {nomeStatus(animal.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={estilos.detalhes}>
                    {animal.especie}
                    {animal.raca ? ` • ${animal.raca}` : ''}
                  </Text>

                  <Text style={estilos.detalhes}>
                    {formatarIdade(
                      animal.idade,
                      animal.unidade_idade
                    )}
                    {animal.porte ? ` • Porte ${animal.porte}` : ''}
                  </Text>

                  {animal.cidade ? (
                    <Text style={estilos.detalhes}>
                      Localização: {animal.cidade}
                    </Text>
                  ) : null}

                  {animal.descricao ? (
                    <Text
                      style={estilos.descricao}
                      numberOfLines={3}
                    >
                      {animal.descricao}
                    </Text>
                  ) : null}

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo="Ver detalhes"
                      onPress={() =>
                        navigation.navigate(
                          'DetalhesAnimal',
                          {
                            id: animal.animal_id,
                          }
                        )
                      }
                    />
                  </View>

                  <View style={estilos.espacoBotao}>
                    <Botao
                      titulo={
                        removendo
                          ? 'Removendo...'
                          : 'Remover dos favoritos'
                      }
                      variante="secundario"
                      disabled={removendoId !== null}
                      carregando={removendo}
                      onPress={() =>
                        confirmarRemocao(
                          animal.animal_id,
                          animal.nome
                        )
                      }
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </>
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
    backgroundColor: '#F8F9FA',
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

  quantidade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#607D8B',
    marginBottom: 16,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  foto: {
    width: '100%',
    height: 220,
  },

  semFoto: {
    height: 180,
    backgroundColor: '#EAF4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoSemFoto: {
    fontSize: 14,
    color: '#607D8B',
  },

  informacoes: {
    padding: 18,
  },

  cabecalho: {
    marginBottom: 12,
  },

  nomeAnimal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 10,
  },

  etiqueta: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  textoEtiqueta: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  detalhes: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 7,
  },

  descricao: {
    fontSize: 14,
    color: '#455A64',
    lineHeight: 21,
    marginTop: 10,
  },

  espacoBotao: {
    marginTop: 12,
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
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 12,
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    lineHeight: 21,
  },

  textoErro: {
    fontSize: 14,
    color: '#B54747',
    textAlign: 'center',
    marginBottom: 16,
  },

});
