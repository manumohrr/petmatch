
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API, lerResposta } from '../services/api.js';

const C = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E5',
  verde: '#579F13',
  texto: '#252B35',
  secundario: '#737984',
  borda: '#E7E4DE',
  erro: '#B42318',
};

export default function Login({
  navigation,
  aoEntrar,
  avisoSessao,
}) {
  const { width } = useWindowDimensions();
  const telaGrande = width >= 850;

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function realizarLogin() {
    if (enviando) return;

    setErro('');

    if (!email.trim() || !senha) {
      setErro('Preencha seu e-mail e sua senha.');
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch(API + '/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha,
        }),
      });

      const dados = await lerResposta(resposta);

      if (!dados.token || !dados.usuario) {
        throw new Error('Resposta de login inválida.');
      }

      await AsyncStorage.setItem('token', dados.token);

      setSenha('');
      aoEntrar(dados.usuario);
    } catch (falha) {
      setErro(
        falha.status
          ? falha.message
          : falha.message === 'Resposta de login inválida.'
            ? falha.message
            : 'Não foi possível entrar. Confira se a API está funcionando.'
      );
    } finally {
      setEnviando(false);
    }
  }

  function abrirCadastro() {
    navigation.navigate('CadastroUsuario');
  }

  return (
    <KeyboardAvoidingView
      style={css.tela}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={css.container}>

          {/* LOGO */}
          <View style={css.cabecalho}>
            <View style={css.logoIcone}>
              <Ionicons name="paw" size={25} color="#FFFFFF" />
            </View>

            <View>
              <Text style={css.logoNome}>
                Pet<Text style={css.logoDestaque}>Match</Text>
              </Text>

              <Text style={css.logoSubtitulo}>
                Conectando pets a novos lares
              </Text>
            </View>
          </View>

          {/* CONTEÚDO PRINCIPAL */}
          <View
            style={[
              css.conteudo,
              telaGrande && css.conteudoDesktop,
            ]}
          >

            {/* APRESENTAÇÃO */}
            <View style={css.apresentacao}>
              <View style={css.etiqueta}>
                <View style={css.pontoVerde} />

                <Text style={css.etiquetaTexto}>
                  ADOÇÃO RESPONSÁVEL
                </Text>
              </View>

              <Text
                style={[
                  css.tituloPrincipal,
                  !telaGrande && css.tituloMobile,
                ]}
              >
                Um novo amigo{'\n'}
                está esperando{'\n'}
                <Text style={css.tituloDestaque}>
                  por você.
                </Text>
              </Text>

              <Text style={css.descricao}>
                Cada animal merece uma nova oportunidade.
                O PetMatch aproxima pessoas que desejam
                adotar de cães e gatos que estão esperando
                por um lar.
              </Text>

              <View style={css.informacao}>
                <View style={css.barraVerde} />

                <Text style={css.informacaoTexto}>
                  Encontre seu novo melhor amigo e
                  transforme duas vidas para sempre.
                </Text>
              </View>
            </View>

            {/* FORMULÁRIO */}
            <View style={css.cartao}>

              <Text style={css.tituloFormulario}>
                Bem-vindo ao PetMatch!
              </Text>

              <Text style={css.subtituloFormulario}>
                Entre na sua conta para continuar.
              </Text>

              {/* AVISO DE SESSÃO */}
              {!!avisoSessao && (
                <View style={css.aviso}>
                  <Text style={css.avisoTexto}>
                    {avisoSessao}
                  </Text>
                </View>
              )}

              {/* ERRO */}
              {!!erro && (
                <View style={css.avisoErro}>
                  <Text style={css.erroTexto}>
                    {erro}
                  </Text>
                </View>
              )}

              {/* E-MAIL */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  E-mail
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor="#A1A5AD"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  editable={!enviando}
                  maxLength={150}
                />
              </View>

              {/* SENHA */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Senha
                </Text>

                <View style={css.campoSenha}>
                  <TextInput
                    style={css.inputSenha}
                    placeholder="Digite sua senha"
                    placeholderTextColor="#A1A5AD"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    editable={!enviando}
                    onSubmitEditing={realizarLogin}
                  />

                  <Pressable
                    style={css.botaoMostrar}
                    onPress={() => setMostrarSenha(!mostrarSenha)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarSenha
                        ? 'Ocultar senha'
                        : 'Mostrar senha'
                    }
                  >
                    <Text style={css.mostrarTexto}>
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* ENTRAR */}
              <Pressable
                style={[
                  css.botaoEntrar,
                  enviando && css.botaoDesativado,
                ]}
                onPress={realizarLogin}
                disabled={enviando}
                accessibilityRole="button"
              >
                {enviando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={css.botaoEntrarTexto}>
                    Entrar
                  </Text>
                )}
              </Pressable>

              {/* DIVISOR */}
              <View style={css.divisor}>
                <View style={css.linha} />

                <Text style={css.divisorTexto}>
                  OU
                </Text>

                <View style={css.linha} />
              </View>

              {/* CADASTRO */}
              <Text style={css.textoCadastro}>
                Ainda não tem uma conta?
              </Text>

              <Pressable
                style={css.botaoCadastro}
                onPress={abrirCadastro}
                disabled={enviando}
                accessibilityRole="button"
              >
                <Text style={css.botaoCadastroTexto}>
                  Criar minha conta
                </Text>
              </Pressable>

            </View>
          </View>

          {/* RODAPÉ */}
          <View style={css.rodape}>
            <Text style={css.rodapeTexto}>
              PetMatch • Adoção responsável
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

  container: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexGrow: 1,
  },

  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    gap: 10,
  },

  logoIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
  },

  patinha: {
    width: 25,
    height: 25,
  },

  logoNome: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  logoDestaque: {
    color: C.laranja,
  },

  logoSubtitulo: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 1,
  },

  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 25,
  },

  conteudoDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40,
  },

  apresentacao: {
    flex: 1,
    maxWidth: 500,
  },

  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EAF4DF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },

  pontoVerde: {
    width: 7,
    height: 7,
    backgroundColor: C.verde,
    borderRadius: 4,
  },

  etiquetaTexto: {
    color: C.verde,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  tituloPrincipal: {
    color: C.texto,
    fontSize: 43,
    lineHeight: 51,
    fontWeight: '900',
    letterSpacing: -1.5,
  },

  tituloMobile: {
    fontSize: 32,
    lineHeight: 39,
  },

  tituloDestaque: {
    color: C.laranja,
  },

  descricao: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 17,
    maxWidth: 420,
  },

  informacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
    maxWidth: 390,
  },

  barraVerde: {
    width: 4,
    height: 42,
    borderRadius: 3,
    backgroundColor: C.verde,
  },

  informacaoTexto: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },

  cartao: {
    width: '100%',
    maxWidth: 405,
    alignSelf: 'center',
    backgroundColor: C.branco,
    borderRadius: 22,
    padding: 25,
    borderWidth: 1,
    borderColor: '#EEEAE3',
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 25px rgba(60, 50, 35, 0.06)',
      },
      default: {
        elevation: 3,
      },
    }),
  },

  tituloFormulario: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },

  subtituloFormulario: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 26,
  },

  aviso: {
    backgroundColor: '#EFF7E9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  avisoTexto: {
    color: C.verde,
    fontSize: 12,
  },

  avisoErro: {
    backgroundColor: '#FFF0EF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },

  erroTexto: {
    color: C.erro,
    fontSize: 12,
  },

  campoGrupo: {
    marginBottom: 17,
  },

  rotulo: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },

  campo: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FEFDFC',
    color: C.texto,
    fontSize: 13,
  },

  campoSenha: {
    height: 46,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFDFC',
  },

  inputSenha: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 13,
    color: C.texto,
  },

  botaoMostrar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  mostrarTexto: {
    color: C.laranja,
    fontSize: 11,
    fontWeight: '700',
  },

  botaoEntrar: {
    height: 46,
    borderRadius: 12,
    backgroundColor: C.laranja,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  botaoDesativado: {
    opacity: 0.65,
  },

  botaoEntrarTexto: {
    color: C.branco,
    fontSize: 14,
    fontWeight: '800',
  },

  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 19,
  },

  linha: {
    flex: 1,
    height: 1,
    backgroundColor: C.borda,
  },

  divisorTexto: {
    color: C.secundario,
    fontSize: 10,
    fontWeight: '700',
  },

  textoCadastro: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 12,
    marginBottom: 12,
  },

  botaoCadastro: {
    height: 46,
    borderWidth: 1,
    borderColor: C.laranja,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoCadastroTexto: {
    color: C.laranja,
    fontSize: 13,
    fontWeight: '800',
  },

  rodape: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  rodapeTexto: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
  },
});
