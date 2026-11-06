
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  vermelho: '#D94B4B',
};

function nomeNivel(nivel) {
  switch (nivel) {
    case 'adotante':
      return 'Adotante';
    case 'ong':
      return 'ONG';
    case 'protetor':
      return 'Protetor independente';
    case 'admin':
      return 'Administrador';
    default:
      return 'Usuário';
  }
}

function ItemMenu({
  simbolo,
  titulo,
  descricao,
  onPress,
  destaque = false,
  ultimo = false,
}) {
  return (
    <Pressable
      style={[
        estilos.itemMenu,
        !ultimo && estilos.bordaItem,
      ]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View
        style={[
          estilos.iconeMenu,
          destaque
            ? estilos.iconeMenuLaranja
            : estilos.iconeMenuVerde,
        ]}
      >
        <Text
          style={[
            estilos.simboloMenu,
            {
              color: destaque
                ? CORES.laranja
                : CORES.verde,
            },
          ]}
        >
          {simbolo}
        </Text>
      </View>

      <View style={estilos.textosMenu}>
        <Text style={estilos.tituloMenu}>
          {titulo}
        </Text>

        {descricao ? (
          <Text style={estilos.descricaoMenu}>
            {descricao}
          </Text>
        ) : null}
      </View>

      <Text style={estilos.setaMenu}>›</Text>
    </Pressable>
  );
}

export default function Perfil({
  navigation,
  usuario: usuarioApp,
  sair,
  atualizarUsuario,
}) {
  const { width } = useWindowDimensions();

  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState('');

  const larguraConteudo = width >= 900 ? 850 : 680;

  const carregarPerfil = useCallback(async () => {
    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetchAutenticado('/auth/me');
      const dados = await lerResposta(resposta);

      setUsuario(dados);
    } catch (falha) {
      setUsuario(null);
      setErro(
        falha.message ||
        'Não foi possível carregar seu perfil.'
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarPerfil();
    }, [carregarPerfil])
  );

  async function sairDaConta() {
    try {
      setSaindo(true);

      await AsyncStorage.removeItem('token');

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch {
      if (Platform.OS === 'web') {
        window.alert('Não foi possível sair da conta.');
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível sair da conta.'
        );
      }
    } finally {
      setSaindo(false);
    }
  }

  function confirmarSaida() {
    if (Platform.OS === 'web') {
      if (
        window.confirm(
          'Deseja realmente sair da sua conta?'
        )
      ) {
        sairDaConta();
      }
      return;
    }

    Alert.alert(
      'Sair da conta',
      'Deseja realmente sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: sairDaConta,
        },
      ]
    );
  }

  if (carregando) {
    return (
      <View style={estilos.centralizado}>
        <ActivityIndicator
          size="large"
          color={CORES.laranja}
        />

        <Text style={estilos.textoAuxiliar}>
          Carregando seu perfil...
        </Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.titulo}>
          Meu perfil
        </Text>

        <Text style={estilos.textoAuxiliar}>
          {erro ||
            'Não foi possível carregar suas informações.'}
        </Text>

        <Pressable
          style={estilos.botaoPrincipal}
          onPress={carregarPerfil}
        >
          <Text style={estilos.textoBotaoPrincipal}>
            Tentar novamente
          </Text>
        </Pressable>
      </View>
    );
  }

  const inicial =
    usuario.nome?.charAt(0)?.toUpperCase() || 'U';

  const administrador = usuario.nivel === 'admin';

  const responsavel = [
    'ong',
    'protetor',
  ].includes(usuario.nivel);

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            estilos.areaPrincipal,
            { maxWidth: larguraConteudo },
          ]}
        >
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>
              Meu{' '}
              <Text style={estilos.tituloLaranja}>
                perfil.
              </Text>
            </Text>

            <Text style={estilos.subtitulo}>
              Suas informações e tudo o que você
              precisa em um só lugar.
            </Text>
          </View>

          <View style={estilos.cartaoPerfil}>
            <View style={estilos.avatar}>
              <Text style={estilos.letraAvatar}>
                {inicial}
              </Text>
            </View>

            <Text style={estilos.nome}>
              {usuario.nome}
            </Text>

            <Text style={estilos.email}>
              {usuario.email}
            </Text>

            <View style={estilos.etiquetaNivel}>
              <View style={estilos.pontoNivel} />

              <Text style={estilos.textoNivel}>
                {nomeNivel(usuario.nivel)}
              </Text>
            </View>
          </View>

          <Text style={estilos.tituloSecao}>
            Minhas informações
          </Text>

          <View style={estilos.cartao}>
            <View style={estilos.campoInformacao}>
              <Text style={estilos.rotulo}>
                Nome completo
              </Text>

              <Text style={estilos.valor}>
                {usuario.nome}
              </Text>
            </View>

            <View style={estilos.divisor} />

            <View style={estilos.campoInformacao}>
              <Text style={estilos.rotulo}>
                E-mail
              </Text>

              <Text style={estilos.valor}>
                {usuario.email}
              </Text>
            </View>

            <View style={estilos.divisor} />

            <View style={estilos.campoInformacao}>
              <Text style={estilos.rotulo}>
                Tipo de conta
              </Text>

              <Text style={estilos.valor}>
                {nomeNivel(usuario.nivel)}
              </Text>
            </View>
          </View>

          <Text style={estilos.tituloSecao}>
            Minha conta
          </Text>

          <View style={estilos.cartaoMenu}>
            <ItemMenu
              simbolo="♡"
              titulo="Meus favoritos"
              descricao="Veja os animais que você salvou"
              onPress={() =>
                navigation.navigate('Favoritos')
              }
            />

            <ItemMenu
              simbolo="≡"
              titulo="Minhas solicitações"
              descricao="Acompanhe seus pedidos de adoção"
              onPress={() =>
                navigation.navigate('MinhasSolicitacoes')
              }
              ultimo
            />
          </View>

          {responsavel && (
            <>
              <Text style={estilos.tituloSecao}>
                Gerenciamento de animais
              </Text>

              <View style={estilos.cartaoMenu}>
                <ItemMenu
                  simbolo="+"
                  titulo="Cadastrar animal"
                  descricao="Adicione um novo pet para adoção"
                  onPress={() =>
                    navigation.navigate('CadastrarAnimal')
                  }
                  ultimo
                />
              </View>
            </>
          )}

          {administrador && (
            <>
              <Text style={estilos.tituloSecao}>
                Administração
              </Text>

              <View style={estilos.cartaoMenu}>
                <ItemMenu
                  simbolo="⚙"
                  titulo="Gerenciamento do site"
                  descricao="Gerencie animais e acesse as ferramentas administrativas"
                  destaque
                  ultimo
                  onPress={() =>
                    navigation.navigate('GerenciarAnimais')
                  }
                />
              </View>
            </>
          )}

          <Pressable
            style={estilos.botaoSair}
            onPress={confirmarSaida}
            disabled={saindo}
            accessibilityRole="button"
          >
            {saindo ? (
              <ActivityIndicator
                color={CORES.vermelho}
              />
            ) : (
              <Text style={estilos.textoSair}>
                Sair da conta
              </Text>
            )}
          </Pressable>

          <Text style={estilos.rodape}>
            PetMatch — Conectando animais a novos lares.
          </Text>
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
    paddingBottom: 60,
  },

  areaPrincipal: {
    width: '100%',
    alignSelf: 'center',
  },

  centralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 18,
    backgroundColor: CORES.fundo,
  },

  cabecalho: {
    marginBottom: 28,
  },

  titulo: {
    fontSize: 36,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 10,
  },

  tituloLaranja: {
    color: CORES.laranja,
  },

  subtitulo: {
    fontSize: 15,
    lineHeight: 24,
    color: CORES.secundario,
  },

  cartaoPerfil: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: CORES.borda,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: CORES.laranjaClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 17,
  },

  letraAvatar: {
    fontSize: 38,
    fontWeight: '800',
    color: CORES.laranja,
  },

  nome: {
    fontSize: 24,
    fontWeight: '800',
    color: CORES.texto,
    textAlign: 'center',
    marginBottom: 6,
  },

  email: {
    fontSize: 14,
    color: CORES.secundario,
    textAlign: 'center',
    marginBottom: 16,
  },

  etiquetaNivel: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  pontoNivel: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: CORES.verde,
  },

  textoNivel: {
    color: CORES.verde,
    fontSize: 13,
    fontWeight: '700',
  },

  tituloSecao: {
    color: CORES.texto,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 15,
  },

  cartao: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 30,
  },

  campoInformacao: {
    gap: 7,
  },

  rotulo: {
    color: CORES.secundario,
    fontSize: 13,
    fontWeight: '500',
  },

  valor: {
    color: CORES.texto,
    fontSize: 16,
    fontWeight: '700',
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginVertical: 18,
  },

  cartaoMenu: {
    backgroundColor: CORES.branco,
    borderRadius: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: CORES.borda,
    marginBottom: 30,
    overflow: 'hidden',
  },

  itemMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 19,
    gap: 14,
  },

  bordaItem: {
    borderBottomWidth: 1,
    borderBottomColor: CORES.borda,
  },

  iconeMenu: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconeMenuVerde: {
    backgroundColor: CORES.verdeClaro,
  },

  iconeMenuLaranja: {
    backgroundColor: CORES.laranjaClaro,
  },

  simboloMenu: {
    fontSize: 24,
    fontWeight: '700',
  },

  textosMenu: {
    flex: 1,
    gap: 4,
  },

  tituloMenu: {
    color: CORES.texto,
    fontSize: 15,
    fontWeight: '700',
  },

  descricaoMenu: {
    color: CORES.secundario,
    fontSize: 12,
    lineHeight: 18,
  },

  setaMenu: {
    color: '#A8AFB8',
    fontSize: 30,
    fontWeight: '300',
  },

  botaoSair: {
    borderWidth: 1,
    borderColor: '#F3D7D7',
    backgroundColor: CORES.branco,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  textoSair: {
    color: CORES.vermelho,
    fontSize: 15,
    fontWeight: '700',
  },

  botaoPrincipal: {
    backgroundColor: CORES.laranja,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },

  textoBotaoPrincipal: {
    color: CORES.branco,
    fontWeight: '700',
  },

  textoAuxiliar: {
    color: CORES.secundario,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  rodape: {
    color: '#A0A5AE',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
