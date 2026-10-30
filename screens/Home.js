
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E9E5DE',
  verdeClaro: '#EDF5E5',
};

const FOTO_CAPA =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1200&auto=format&fit=crop&q=85';

function listaAnimais(dados) {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.animais)) return dados.animais;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
}

function fotoAnimal(animal) {
  const foto =
    animal?.imagem ||
    animal?.foto ||
    animal?.foto_url ||
    animal?.imagem_url;

  if (typeof foto !== 'string' || !foto.trim()) {
    return null;
  }

  return foto.trim();
}

function nomeEspecie(animal) {
  const especie = String(
    animal?.especie || animal?.tipo || ''
  ).toLowerCase();

  if (especie.includes('cach') || especie.includes('canin')) {
    return 'Cachorro';
  }

  if (especie.includes('gat') || especie.includes('felin')) {
    return 'Gato';
  }

  return animal?.especie || animal?.tipo || 'Pet';
}

function informacaoAnimal(animal) {
  return [
    nomeEspecie(animal),
    animal?.idade ? String(animal.idade) : null,
    animal?.cidade ? String(animal.cidade) : null,
  ]
    .filter(Boolean)
    .join(' • ');
}

function BotaoMenu({ titulo, ativo, onPress, icone }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        css.menuBotao,
        ativo && css.menuBotaoAtivo,
      ]}
      accessibilityRole="button"
    >
      {icone ? (
        <Ionicons
          name={icone}
          size={17}
          color={ativo ? C.laranja : C.texto}
        />
      ) : null}

      <Text
        style={[
          css.menuTexto,
          ativo && css.menuTextoAtivo,
        ]}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export default function Home({
  navigation,
  usuario,
  sair,
  atualizarUsuario,
  aviso,
}) {
  const { width } = useWindowDimensions();

  const desktop = width >= 900;
  const tablet = width >= 620;
  const colunas = desktop ? 3 : tablet ? 2 : 1;

  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [aba, setAba] = useState('Inicio');
  const [favoritos, setFavoritos] = useState([]);

  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  const admin = usuario?.nivel === 'admin';

  const nomeUsuario =
    usuario?.nome?.trim()?.split(' ')[0] || 'Usuário';

  const carregarDados = useCallback(async () => {
    try {
      const resposta = await fetchAutenticado('/animais');
      const dados = await lerResposta(resposta);

      setAnimais(listaAnimais(dados));
      setErro('');
    } catch (falha) {
      if (falha.status !== 401) {
        setErro('Não foi possível carregar os animais.');
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarFavoritos = useCallback(async () => {
    try {
      const resposta = await fetchAutenticado('/favoritos');
      const dados = await lerResposta(resposta);

      const lista = Array.isArray(dados)
        ? dados
        : Array.isArray(dados?.favoritos)
          ? dados.favoritos
          : [];

      setFavoritos(
        lista.map((item) =>
          String(item.animal_id ?? item.animal?.id ?? item.id)
        )
      );
    } catch {
      // Os animais continuam visíveis mesmo se
      // a lista de favoritos não carregar.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function atualizar() {
        await Promise.all([
          carregarDados(),
          carregarFavoritos(),
        ]);

        try {
          const resposta = await fetchAutenticado('/auth/me');
          const dados = await lerResposta(resposta);

          if (ativo && atualizarUsuario) {
            atualizarUsuario(dados.usuario || dados);
          }
        } catch {
          // A autenticação é tratada pelo serviço.
        }
      }

      atualizar();

      return () => {
        ativo = false;
      };
    }, [carregarDados, carregarFavoritos, atualizarUsuario])
  );

  function abrirAnimais() {
    navigation.navigate('Animais');
  }

  function abrirPerfil() {
    navigation.navigate('Perfil');
  }

  function abrirDetalhes(animal) {
    navigation.navigate('DetalhesAnimal', {
      animalId: animal.id,
      id: animal.id,
      animal,
    });
  }

  async function alternarFavorito(animal) {
    const id = String(animal.id);
    const jaFavorito = favoritos.includes(id);

    try {
      const resposta = await fetchAutenticado(
        jaFavorito ? `/favoritos/${animal.id}` : '/favoritos',
        {
          method: jaFavorito ? 'DELETE' : 'POST',
          ...(!jaFavorito
            ? {
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  animal_id: animal.id,
                }),
              }
            : {}),
        }
      );

      await lerResposta(resposta);

      setFavoritos((anteriores) =>
        jaFavorito
          ? anteriores.filter((item) => item !== id)
          : [...anteriores, id]
      );
    } catch (falha) {
      setErro(
        falha.message || 'Não foi possível atualizar o favorito.'
      );
    }
  }

  const animaisFiltrados = animais.filter((animal) => {
    const especie = nomeEspecie(animal);
    const correspondeTipo =
      tipo === 'Todos' || especie === tipo;

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
      correspondeTipo &&
      texto.includes(busca.trim().toLowerCase())
    );
  });

  const destaques = animaisFiltrados.slice(0, 6);

  return (
    <View style={css.tela}>
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* CABEÇALHO */}
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
                onPress={() => setAba('Inicio')}
              >
                <View style={css.logoIcone}>
                  <Ionicons
                    name="paw"
                    size={23}
                    color="#FFFFFF"
                  />
                </View>

                <View>
                  <Text style={css.logoNome}>
                    Pet
                    <Text style={css.logoLaranja}>
                      Match
                    </Text>
                  </Text>
                  <Text style={css.logoDescricao}>
                    Conectando pets a novos lares
                  </Text>
                </View>
              </Pressable>

              <View style={css.menu}>
                <BotaoMenu
                  titulo="Início"
                  ativo={aba === 'Inicio'}
                  onPress={() => setAba('Inicio')}
                />

                <BotaoMenu
                  titulo="Animais"
                  onPress={abrirAnimais}
                />

                <BotaoMenu
                  titulo="Sobre"
                  ativo={aba === 'Sobre'}
                  onPress={() => setAba('Sobre')}
                />

                <BotaoMenu
                  titulo="Contato"
                  ativo={aba === 'Contato'}
                  onPress={() => setAba('Contato')}
                />
              </View>

              <View style={css.menuConta}>
                <BotaoMenu
                  titulo={desktop ? 'Perfil' : nomeUsuario}
                  icone="person-outline"
                  onPress={abrirPerfil}
                />

                <Pressable
                  onPress={sair}
                  style={css.botaoSair}
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

        {!!(erro || aviso) && (
          <View style={css.largura}>
            <View style={css.aviso}>
              <Text style={css.avisoTexto}>
                {erro || aviso}
              </Text>
            </View>
          </View>
        )}

        {aba === 'Inicio' && (
          <>
            {/* HERO */}
            <View style={css.largura}>
              <View
                style={[
                  css.hero,
                  !desktop && css.heroMobile,
                ]}
              >
                <View style={css.heroConteudo}>
                  <View style={css.etiqueta}>
                    <Ionicons
                      name="paw-outline"
                      size={14}
                      color={C.verde}
                    />
                    <Text style={css.etiquetaTexto}>
                      ADOÇÃO RESPONSÁVEL
                    </Text>
                  </View>

                  <Text
                    style={[
                      css.heroTitulo,
                      !desktop && css.heroTituloMobile,
                    ]}
                  >
                    Conectando pets a{' '}
                    <Text style={css.textoLaranja}>
                      novos lares.
                    </Text>
                  </Text>

                  <Text style={css.heroDescricao}>
                    Encontre seu novo melhor amigo e
                    transforme duas vidas para sempre.
                  </Text>

                  <Text style={css.heroComplemento}>
                    Conheça animais que esperam por uma
                    família e dê o primeiro passo para
                    uma adoção responsável.
                  </Text>

                  <Pressable
                    style={css.botaoVerde}
                    onPress={abrirAnimais}
                  >
                    <Text style={css.botaoVerdeTexto}>
                      Ver todos os animais
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>

                <View style={css.heroImagemContainer}>
                  <Image
                    source={{ uri: FOTO_CAPA }}
                    style={css.heroImagem}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            {/* BUSCA */}
            <View style={css.largura}>
              <View style={css.buscaCartao}>
                <View style={css.buscaTituloLinha}>
                  <View>
                    <Text style={css.buscaTitulo}>
                      Encontre seu novo amigo
                    </Text>
                    <Text style={css.buscaDescricao}>
                      Pesquise pelo nome, raça ou cidade.
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    css.buscaLinha,
                    !tablet && css.buscaLinhaMobile,
                  ]}
                >
                  <View style={css.campoBusca}>
                    <Ionicons
                      name="search-outline"
                      size={19}
                      color={C.secundario}
                    />
                    <TextInput
                      value={busca}
                      onChangeText={setBusca}
                      placeholder="Nome, raça ou cidade..."
                      placeholderTextColor="#9DA2AA"
                      style={css.inputBusca}
                    />
                  </View>

                  <View style={css.filtros}>
                    {['Todos', 'Cachorro', 'Gato'].map(
                      (opcao) => (
                        <Pressable
                          key={opcao}
                          onPress={() => setTipo(opcao)}
                          style={[
                            css.filtro,
                            tipo === opcao &&
                              css.filtroAtivo,
                          ]}
                        >
                          <Text
                            style={[
                              css.filtroTexto,
                              tipo === opcao &&
                                css.filtroTextoAtivo,
                            ]}
                          >
                            {opcao}
                          </Text>
                        </Pressable>
                      )
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ANIMAIS EM DESTAQUE */}
            <View style={css.largura}>
              <View style={css.secao}>
                <View style={css.secaoCabecalho}>
                  <View style={css.secaoTexto}>
                    <Text style={css.secaoEtiqueta}>
                      CONHEÇA QUEM ESTÁ ESPERANDO
                    </Text>
                    <Text style={css.secaoTitulo}>
                      Animais para adoção
                    </Text>
                    <Text style={css.secaoDescricao}>
                      Talvez seu próximo companheiro
                      esteja aqui.
                    </Text>
                  </View>

                  <Pressable
                    style={css.linkVerTodos}
                    onPress={abrirAnimais}
                  >
                    <Text style={css.linkVerTodosTexto}>
                      Ver todos
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={17}
                      color={C.laranja}
                    />
                  </Pressable>
                </View>

                {carregando ? (
                  <View style={css.estadoVazio}>
                    <ActivityIndicator
                      color={C.laranja}
                      size="large"
                    />
                    <Text style={css.estadoTexto}>
                      Carregando animais...
                    </Text>
                  </View>
                ) : destaques.length === 0 ? (
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
                      {busca || tipo !== 'Todos'
                        ? 'Tente mudar os filtros da pesquisa.'
                        : 'Ainda não há animais cadastrados.'}
                    </Text>
                  </View>
                ) : (
                  <View style={css.grade}>
                    {destaques.map((animal) => {
                      const imagem = fotoAnimal(animal);
                      const favorito = favoritos.includes(
                        String(animal.id)
                      );

                      return (
                        <View
                          key={String(animal.id)}
                          style={[
                            css.cartaoAnimal,
                            {
                              width: tablet
                                ? `${100 / colunas - 2}%`
                                : '100%',
                            },
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              abrirDetalhes(animal)
                            }
                          >
                            <View style={css.imagemAnimal}>
                              {imagem ? (
                                <Image
                                  source={{ uri: imagem }}
                                  style={css.fotoAnimal}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View
                                  style={css.semFoto}
                                >
                                  <Ionicons
                                    name="paw-outline"
                                    size={42}
                                    color="#B9C7AC"
                                  />
                                  <Text
                                    style={css.semFotoTexto}
                                  >
                                    Sem foto
                                  </Text>
                                </View>
                              )}
                            </View>
                          </Pressable>

                          <Pressable
                            onPress={() =>
                              alternarFavorito(animal)
                            }
                            style={css.favoritar}
                            accessibilityRole="button"
                            accessibilityLabel={
                              favorito
                                ? 'Remover dos favoritos'
                                : 'Adicionar aos favoritos'
                            }
                          >
                            <Ionicons
                              name={
                                favorito
                                  ? 'heart'
                                  : 'heart-outline'
                              }
                              size={20}
                              color={
                                favorito
                                  ? C.laranja
                                  : C.texto
                              }
                            />
                          </Pressable>

                          <View style={css.animalConteudo}>
                            <Text style={css.animalNome}>
                              {animal.nome || 'Sem nome'}
                            </Text>

                            <Text
                              style={css.animalDescricao}
                              numberOfLines={2}
                            >
                              {informacaoAnimal(animal)}
                            </Text>

                            <Pressable
                              style={css.botaoDetalhes}
                              onPress={() =>
                                abrirDetalhes(animal)
                              }
                            >
                              <Text
                                style={css.botaoDetalhesTexto}
                              >
                                Conhecer
                              </Text>
                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={C.laranja}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* SOBRE O PROJETO */}
            <View style={css.secaoSobre}>
              <View style={css.largura}>
                <View style={css.sobreInterno}>
                  <Text style={css.secaoEtiqueta}>
                    SOBRE O PETMATCH
                  </Text>
                  <Text style={css.secaoTitulo}>
                    Uma conexão que muda vidas
                  </Text>
                  <Text style={css.sobreDescricao}>
                    O PetMatch foi criado para facilitar
                    o encontro entre pessoas interessadas
                    em adotar e animais divulgados por
                    ONGs e protetores independentes.
                  </Text>

                  <View style={css.passos}>
                    {[
                      {
                        icone: 'search-outline',
                        titulo: 'Encontre',
                        texto: 'Conheça os animais disponíveis para adoção.',
                      },
                      {
                        icone: 'bookmark-outline',
                        titulo: 'Favorite',
                        texto: 'Salve os animais que chamaram sua atenção.',
                      },
                      {
                        icone: 'home-outline',
                        titulo: 'Adote',
                        texto: 'Entre com uma solicitação de adoção.',
                      },
                    ].map((passo) => (
                      <View
                        key={passo.titulo}
                        style={css.passo}
                      >
                        <View style={css.passoIcone}>
                          <Ionicons
                            name={passo.icone}
                            size={23}
                            color={C.verde}
                          />
                        </View>
                        <Text style={css.passoTitulo}>
                          {passo.titulo}
                        </Text>
                        <Text style={css.passoTexto}>
                          {passo.texto}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            {/* GERENCIAMENTO */}
            {podeGerenciar && (
              <View style={css.largura}>
                <View style={css.gerenciamento}>
                  <View style={css.gerenciamentoTexto}>
                    <Text style={css.secaoEtiqueta}>
                      ÁREA DE GERENCIAMENTO
                    </Text>
                    <Text style={css.gerenciamentoTitulo}>
                      Gerencie os animais cadastrados
                    </Text>
                    <Text style={css.gerenciamentoDescricao}>
                      Adicione novos animais e mantenha
                      os anúncios atualizados.
                    </Text>
                  </View>

                  <View style={css.gerenciamentoBotoes}>
                    <Pressable
                      style={css.botaoLaranja}
                      onPress={() =>
                        navigation.navigate(
                          'CadastrarAnimal'
                        )
                      }
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={css.botaoLaranjaTexto}>
                        Cadastrar animal
                      </Text>
                    </Pressable>

                    {admin && (
                      <Pressable
                        style={css.botaoContorno}
                        onPress={() =>
                          navigation.navigate('Usuarios')
                        }
                      >
                        <Ionicons
                          name="people-outline"
                          size={17}
                          color={C.laranja}
                        />
                        <Text
                          style={css.botaoContornoTexto}
                        >
                          Gerenciar usuários
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {aba === 'Sobre' && (
          <View style={css.largura}>
            <View style={css.paginaInterna}>
              <Text style={css.secaoEtiqueta}>
                CONHEÇA O PETMATCH
              </Text>
              <Text style={css.secaoTitulo}>
                Sobre o projeto
              </Text>
              <Text style={css.sobreDescricao}>
                O PetMatch busca facilitar a adoção
                responsável de cães e gatos, aproximando
                pessoas interessadas em adotar de ONGs e
                protetores independentes.
              </Text>

              <View style={css.passos}>
                {[
                  {
                    icone: 'search-outline',
                    titulo: 'Encontre',
                    texto: 'Explore os animais cadastrados na plataforma.',
                  },
                  {
                    icone: 'bookmark-outline',
                    titulo: 'Favorite',
                    texto: 'Guarde seus animais preferidos para consultar depois.',
                  },
                  {
                    icone: 'home-outline',
                    titulo: 'Solicite a adoção',
                    texto: 'Preencha uma solicitação para iniciar o processo.',
                  },
                ].map((item) => (
                  <View
                    key={item.titulo}
                    style={css.passo}
                  >
                    <View style={css.passoIcone}>
                      <Ionicons
                        name={item.icone}
                        size={24}
                        color={C.verde}
                      />
                    </View>
                    <Text style={css.passoTitulo}>
                      {item.titulo}
                    </Text>
                    <Text style={css.passoTexto}>
                      {item.texto}
                    </Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  css.botaoVerde,
                  { alignSelf: 'flex-start', marginTop: 28 },
                ]}
                onPress={abrirAnimais}
              >
                <Text style={css.botaoVerdeTexto}>
                  Conhecer os animais
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {aba === 'Contato' && (
          <View style={css.largura}>
            <View style={css.paginaInterna}>
              <Text style={css.secaoEtiqueta}>
                ENTRE EM CONTATO
              </Text>
              <Text style={css.secaoTitulo}>
                Fale com o PetMatch
              </Text>
              <Text style={css.sobreDescricao}>
                Precisa de informações sobre um animal
                ou sobre o processo de adoção? Acesse o
                perfil do animal para consultar os dados
                disponíveis e iniciar uma solicitação.
              </Text>

              <Pressable
                style={[
                  css.botaoVerde,
                  { alignSelf: 'flex-start', marginTop: 25 },
                ]}
                onPress={abrirAnimais}
              >
                <Text style={css.botaoVerdeTexto}>
                  Ver animais disponíveis
                </Text>
              </Pressable>

              <Text style={css.contatoNota}>
                O formulário de contato será conectado
                quando configurarmos o serviço de
                recebimento de mensagens.
              </Text>
            </View>
          </View>
        )}

        {/* RODAPÉ */}
        <View style={css.rodape}>
          <View style={css.largura}>
            <View style={css.rodapeInterno}>
              <Text style={css.rodapeMarca}>
                Pet<Text style={css.logoLaranja}>Match</Text>
              </Text>
              <Text style={css.rodapeTexto}>
                Conectando pets a novos lares.
              </Text>
            </View>
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

  aviso: {
    backgroundColor: '#FFF1EA',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  avisoTexto: {
    color: '#A14D20',
    fontSize: 12,
  },

  hero: {
    flexDirection: 'row',
    backgroundColor: '#FFF1E7',
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 30,
    minHeight: 340,
  },
  heroMobile: {
    flexDirection: 'column',
  },
  heroConteudo: {
    flex: 1,
    padding: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EAF3DE',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 30,
    marginBottom: 18,
  },
  etiquetaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: C.verde,
    letterSpacing: 0.4,
  },
  heroTitulo: {
    color: C.texto,
    fontSize: 39,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: -1.1,
    maxWidth: 510,
  },
  heroTituloMobile: {
    fontSize: 31,
    lineHeight: 38,
  },
  textoLaranja: {
    color: C.laranja,
  },
  heroDescricao: {
    color: C.texto,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 15,
    maxWidth: 430,
  },
  heroComplemento: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 10,
    maxWidth: 410,
  },
  botaoVerde: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: C.verde,
    paddingHorizontal: 21,
    height: 45,
    borderRadius: 11,
    marginTop: 22,
  },
  botaoVerdeTexto: {
    color: C.branco,
    fontWeight: '800',
    fontSize: 13,
  },
  heroImagemContainer: {
    flex: 0.85,
    minHeight: 245,
    backgroundColor: '#E8E3D9',
  },
  heroImagem: {
    width: '100%',
    height: '100%',
    minHeight: 245,
  },

  buscaCartao: {
    backgroundColor: C.branco,
    borderRadius: 18,
    padding: 24,
    marginTop: 25,
    borderWidth: 1,
    borderColor: C.borda,
  },
  buscaTituloLinha: {
    marginBottom: 17,
  },
  buscaTitulo: {
    fontSize: 19,
    fontWeight: '800',
    color: C.texto,
  },
  buscaDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 5,
  },
  buscaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  buscaLinhaMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  campoBusca: {
    flex: 1,
    minHeight: 45,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 9,
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
    gap: 7,
    flexWrap: 'wrap',
  },
  filtro: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F7F7F5',
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

  secao: {
    paddingVertical: 45,
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 23,
  },
  secaoTexto: {
    flex: 1,
  },
  secaoEtiqueta: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: C.verde,
    marginBottom: 10,
  },
  secaoTitulo: {
    color: C.texto,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  secaoDescricao: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 8,
  },
  linkVerTodos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
  },
  linkVerTodosTexto: {
    color: C.laranja,
    fontWeight: '800',
    fontSize: 13,
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  cartaoAnimal: {
    backgroundColor: C.branco,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.borda,
    position: 'relative',
    marginBottom: 8,
  },
  imagemAnimal: {
    height: 190,
    backgroundColor: '#EEF0E9',
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
  semFotoTexto: {
    color: C.secundario,
    fontSize: 12,
  },
  favoritar: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.branco,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.borda,
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
    borderWidth: 1,
    borderColor: C.borda,
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

  secaoSobre: {
    backgroundColor: '#F0F4EA',
    paddingVertical: 45,
  },
  sobreInterno: {
    alignItems: 'center',
  },
  sobreDescricao: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 23,
    maxWidth: 650,
    textAlign: 'center',
    marginTop: 13,
  },
  passos: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 28,
  },
  passo: {
    flexGrow: 1,
    flexBasis: 210,
    maxWidth: 340,
    padding: 23,
    backgroundColor: C.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E9DE',
    alignItems: 'center',
  },
  passoIcone: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  passoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },
  passoTexto: {
    fontSize: 12,
    lineHeight: 19,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 8,
  },

  gerenciamento: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 17,
    padding: 25,
    marginVertical: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 18,
  },
  gerenciamentoTexto: {
    flex: 1,
    minWidth: 220,
  },
  gerenciamentoTitulo: {
    fontSize: 19,
    fontWeight: '800',
    color: C.texto,
  },
  gerenciamentoDescricao: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 8,
  },
  gerenciamentoBotoes: {
    gap: 9,
  },
  botaoLaranja: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 10,
    backgroundColor: C.laranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoLaranjaTexto: {
    color: C.branco,
    fontSize: 12,
    fontWeight: '800',
  },
  botaoContorno: {
    height: 43,
    paddingHorizontal: 17,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.laranja,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  botaoContornoTexto: {
    color: C.laranja,
    fontSize: 12,
    fontWeight: '800',
  },

  paginaInterna: {
    backgroundColor: C.branco,
    borderRadius: 20,
    padding: 35,
    marginVertical: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borda,
    minHeight: 300,
  },
  contatoNota: {
    fontSize: 12,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 25,
  },

  rodape: {
    backgroundColor: C.branco,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    marginTop: 20,
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
