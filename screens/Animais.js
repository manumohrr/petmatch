
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAutenticado, lerResposta } from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E9E5DE',
};

function BotaoMenu({
  titulo,
  ativo = false,
  onPress,
  icone = null,
}) {
  
  return (
    <Pressable
      onPress={onPress}
      style={[css.menuBotao, ativo && css.menuBotaoAtivo]}
    >
      {icone ? (
       <Ionicons
  name={
    icone === 'person-outline'
      ? 'person-outline'
      : 'home-outline'
  }
  size={17}
  color={ativo ? C.laranja : C.texto}
/>
      ) : null}

      <Text style={[css.menuTexto, ativo && css.menuTextoAtivo]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

function obterLista(dados) {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.animais)) return dados.animais;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
}

function obterId(animal) {
  return animal.id ?? animal.id_animal;
}

function obterFoto(animal) {
  return (
    animal.foto ||
    animal.imagem ||
    animal.foto_url ||
    animal.imagem_url ||
    null
  );
}

function obterEspecie(animal) {
  const especie = String(
    animal.especie || animal.tipo || ''
  ).toLowerCase();

  if (especie.includes('cach') || especie.includes('canin')) {
    return 'Cachorro';
  }

  if (especie.includes('gat') || especie.includes('felin')) {
    return 'Gato';
  }

  return animal.especie || 'Pet';
}

function obterStatus(animal) {
  return animal.status || animal.situacao || 'disponivel';
}

export default function Animais({
  navigation,
  usuario,
  sair,
}) {
  const { width } = useWindowDimensions();

  const desktop = width >= 900;
  const tablet = width >= 620;
  const colunas = desktop ? 3 : tablet ? 2 : 1;

  const [animais, setAnimais] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregarAnimais = useCallback(async () => {
    setCarregando(true);

    try {
      const resposta = await fetchAutenticado('/animais');
      const dados = await lerResposta(resposta);

      setAnimais(obterLista(dados));
      setErro('');
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

  function abrirInicio(aba = 'Inicio') {
    navigation.navigate('Home', { aba });
  }

  function abrirDetalhes(animal) {
    const id = obterId(animal);

    navigation.navigate('DetalhesAnimal', {
      id,
      animalId: id,
      animal,
    });
  }

  const animaisFiltrados = animais.filter((animal) => {
    const especie = obterEspecie(animal);

    const correspondeFiltro =
      filtro === 'Todos' ||
      (filtro === 'Cachorros' && especie === 'Cachorro') ||
      (filtro === 'Gatos' && especie === 'Gato');

    const texto = [
      animal.nome,
      animal.raca,
      animal.cidade,
      especie,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return (
      correspondeFiltro &&
      texto.includes(busca.trim().toLowerCase())
    );
  });

  return (
    <View style={css.tela}>
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABEÇALHO IGUAL AO DA HOME */}
        <View style={css.cabecalho}>
          <View style={css.largura}>
            <View
              style={[
                css.cabecalhoInterno,
                !desktop && css.cabecalhoMobile,
              ]}
            >
              <Pressable
                style={css.marca}
                onPress={() => abrirInicio()}
              >
                <View style={css.logoIcone}>
                  <Ionicons
                    name="paw"
                    size={23}
                    color={C.branco}
                  />
                </View>

                <View>
                  <Text style={css.logoNome}>
                    Pet
                    <Text style={css.logoLaranja}>Match</Text>
                  </Text>

                  <Text style={css.logoDescricao}>
                    Conectando pets a novos lares
                  </Text>
                </View>
              </Pressable>

              <View style={css.menu}>
                <BotaoMenu
                  titulo="Início"
                  onPress={() => abrirInicio()}
                />

                <BotaoMenu
                  titulo="Animais"
                  ativo
                  onPress={() => {}}
                />

                <BotaoMenu
                  titulo="Sobre"
                  onPress={() => abrirInicio('Sobre')}
                />

                <BotaoMenu
                  titulo="Contato"
                  onPress={() => abrirInicio('Contato')}
                />
              </View>

              <View style={css.menuConta}>
                <BotaoMenu
                  titulo="Perfil"
                  icone="person-outline"
                  onPress={() => navigation.navigate('Perfil')}
                />

                <Pressable
                  style={css.botaoSair}
                  onPress={sair}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={17}
                    color={C.secundario}
                  />

                  <Text style={css.botaoSairTexto}>
                    Sair
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* CONTEÚDO DA PÁGINA */}
        <View style={css.largura}>
          <View style={css.conteudo}>
            <Text style={css.titulo}>
              Animais para adoção
            </Text>

            <Text style={css.subtitulo}>
              Conheça os pets que estão esperando por um novo lar.
            </Text>

            <View style={css.campoBusca}>
              <Ionicons
                name="search-outline"
                size={19}
                color={C.secundario}
              />

              <TextInput
                style={css.inputBusca}
                placeholder="Buscar por nome, raça ou cidade..."
                placeholderTextColor="#9DA2AA"
                value={busca}
                onChangeText={setBusca}
              />
            </View>

            <View style={css.filtros}>
              {['Todos', 'Cachorros', 'Gatos'].map((opcao) => (
                <Pressable
                  key={opcao}
                  onPress={() => setFiltro(opcao)}
                  style={[
                    css.filtro,
                    filtro === opcao && css.filtroAtivo,
                  ]}
                >
                  <Text
                    style={[
                      css.filtroTexto,
                      filtro === opcao && css.filtroTextoAtivo,
                    ]}
                  >
                    {opcao}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={css.secaoCabecalho}>
              <Text style={css.secaoTitulo}>
                Pets disponíveis
              </Text>

              <Text style={css.contagem}>
                {animaisFiltrados.length}{' '}
                {animaisFiltrados.length === 1
                  ? 'animal encontrado'
                  : 'animais encontrados'}
              </Text>
            </View>

            {erro ? (
              <Text style={css.erro}>{erro}</Text>
            ) : null}

            {carregando ? (
              <View style={css.estadoVazio}>
                <ActivityIndicator
                  size="large"
                  color={C.laranja}
                />
                <Text style={css.estadoTexto}>
                  Carregando animais...
                </Text>
              </View>
            ) : animaisFiltrados.length === 0 ? (
              <View style={css.estadoVazio}>
                <Ionicons
                  name="paw-outline"
                  size={35}
                  color={C.verde}
                />
                <Text style={css.estadoTitulo}>
                  Nenhum animal encontrado
                </Text>
                <Text style={css.estadoTexto}>
                  Tente alterar os filtros da pesquisa.
                </Text>
              </View>
            ) : (
              <View style={css.grade}>
                {animaisFiltrados.map((animal, indice) => {
                  const id = obterId(animal);
                  const foto = obterFoto(animal);
                  const especie = obterEspecie(animal);
                  const status = obterStatus(animal);

                  return (
                    <Pressable
                      key={String(id ?? indice)}
                      onPress={() => abrirDetalhes(animal)}
                      style={[
                        css.cartaoAnimal,
                        {
                          width: desktop
                            ? '31.8%'
                            : tablet
                              ? '48.5%'
                              : '100%',
                        },
                      ]}
                    >
                      <View style={css.imagemAnimal}>
                        {foto ? (
                          <Image
                            source={{ uri: foto }}
                            style={css.fotoAnimal}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={css.semFoto}>
                            <Ionicons
                              name="paw-outline"
                              size={40}
                              color="#B9C7AC"
                            />
                            <Text style={css.estadoTexto}>
                              Sem foto
                            </Text>
                          </View>
                        )}

                        <View style={css.status}>
                          <Text style={css.statusTexto}>
                            {status === 'disponivel'
                              ? 'Disponível para adoção'
                              : status === 'adotado'
                                ? 'Adotado'
                                : 'Em processo de adoção'}
                          </Text>
                        </View>
                      </View>

                      <View style={css.animalConteudo}>
                        <Text style={css.animalNome}>
                          {animal.nome || 'Sem nome'}
                        </Text>

                        <Text style={css.animalDescricao}>
                          {[
                            especie,
                            animal.raca,
                            animal.cidade,
                          ]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>

                        <View style={css.botaoDetalhes}>
                          <Text style={css.botaoDetalhesTexto}>
                            Conhecer
                          </Text>

                          <Ionicons
                            name="arrow-forward"
                            size={16}
                            color={C.laranja}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* RODAPÉ */}
        <View style={css.rodape}>
          <View style={css.rodapeInterno}>
            <Text style={css.rodapeMarca}>
              Pet
              <Text style={css.logoLaranja}>Match</Text>
            </Text>

            <Text style={css.rodapeTexto}>
              Conectando pets a novos lares.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const css = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: C.fundo,
  },

  scroll: {
    flexGrow: 1,
  },

  largura: {
    width: '100%',
    maxWidth: 1140,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },

  cabecalho: {
    backgroundColor: C.branco,
    borderBottomWidth: 1,
    borderBottomColor: C.borda,
  },

  cabecalhoInterno: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },

  cabecalhoMobile: {
    flexWrap: 'wrap',
    paddingVertical: 14,
    gap: 12,
  },

  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  logoIcone: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoNome: {
    fontSize: 23,
    fontWeight: '900',
    color: C.texto,
    letterSpacing: -0.7,
  },

  logoLaranja: {
    color: C.laranja,
  },

  logoDescricao: {
    fontSize: 10,
    color: C.secundario,
  },

  menu: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },

  menuConta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  menuBotao: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  menuBotaoAtivo: {
    backgroundColor: '#FFF2E9',
  },

  menuTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: C.texto,
  },

  menuTextoAtivo: {
    color: C.laranja,
  },

  botaoSair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 8,
  },

  botaoSairTexto: {
    fontSize: 12,
    color: C.secundario,
  },

  conteudo: {
    paddingTop: 36,
    paddingBottom: 55,
  },

  titulo: {
    fontSize: 30,
    fontWeight: '900',
    color: C.texto,
    letterSpacing: -0.6,
  },

  subtitulo: {
    fontSize: 14,
    color: C.secundario,
    marginTop: 10,
    marginBottom: 26,
    lineHeight: 22,
  },

  campoBusca: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 11,
    backgroundColor: C.branco,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
  },

  inputBusca: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: C.texto,
    paddingVertical: 10,
  },

  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 15,
  },

  filtro: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    backgroundColor: C.branco,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borda,
  },

  filtroAtivo: {
    backgroundColor: C.laranja,
    borderColor: C.laranja,
  },

  filtroTexto: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
  },

  filtroTextoAtivo: {
    color: C.branco,
  },

  secaoCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 35,
    marginBottom: 20,
  },

  secaoTitulo: {
    fontSize: 21,
    fontWeight: '800',
    color: C.texto,
  },

  contagem: {
    fontSize: 12,
    color: C.secundario,
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  cartaoAnimal: {
    backgroundColor: C.branco,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borda,
    marginBottom: 8,
  },

  imagemAnimal: {
    height: 190,
    backgroundColor: '#EEF0E9',
    position: 'relative',
  },

  fotoAnimal: {
    width: '100%',
    height: '100%',
  },

  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  status: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#EDF5E5',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  statusTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#386C0A',
  },

  animalConteudo: {
    padding: 16,
  },

  animalNome: {
    fontSize: 18,
    fontWeight: '800',
    color: C.texto,
  },

  animalDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 7,
    lineHeight: 19,
    minHeight: 20,
  },

  botaoDetalhes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.borda,
    paddingTop: 12,
    marginTop: 15,
  },

  botaoDetalhesTexto: {
    color: C.laranja,
    fontSize: 13,
    fontWeight: '800',
  },

  estadoVazio: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.branco,
    borderRadius: 17,
    gap: 10,
  },

  estadoTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: C.texto,
  },

  estadoTexto: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  erro: {
    color: '#B42318',
    fontSize: 13,
    marginBottom: 16,
  },

  rodape: {
    backgroundColor: C.branco,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    marginTop: 'auto',
  },

  rodapeInterno: {
    paddingVertical: 25,
    alignItems: 'center',
    gap: 5,
  },

  rodapeMarca: {
    fontSize: 18,
    fontWeight: '900',
    color: C.texto,
  },

  rodapeTexto: {
    fontSize: 11,
    color: C.secundario,
  },
});
