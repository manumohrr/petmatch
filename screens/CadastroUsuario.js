
import { useState } from 'react';
import {
  ActivityIndicator,
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

export default function CadastroUsuario({
  navigation,
  aoEntrar,
}) {
  const { width } = useWindowDimensions();
  const telaGrande = width >= 850;

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cadastrarUsuario() {
    if (enviando) return;

    setErro('');

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (
      !nomeLimpo ||
      !emailLimpo ||
      !senha ||
      !confirmacao
    ) {
      setErro('Preencha todos os campos para continuar.');
      return;
    }

    if (nomeLimpo.length > 100) {
      setErro('O nome deve ter no máximo 100 caracteres.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro('Informe um e-mail válido.');
      return;
    }

    if (senha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (new TextEncoder().encode(senha).length > 72) {
      setErro('A senha deve ter no máximo 72 bytes.');
      return;
    }

    if (senha !== confirmacao) {
      setErro('As senhas não são iguais.');
      return;
    }

    setEnviando(true);

    let cadastroConcluido = false;

    try {
      // 1. CADASTRAR NO BANCO DE DADOS
      const respostaCadastro = await fetch(
        API + '/auth/cadastro',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: nomeLimpo,
            email: emailLimpo,
            senha,
          }),
        }
      );

      await lerResposta(respostaCadastro);
      cadastroConcluido = true;

      // 2. FAZER LOGIN AUTOMATICAMENTE
      const respostaLogin = await fetch(
        API + '/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailLimpo,
            senha,
          }),
        }
      );

      const dadosLogin = await lerResposta(respostaLogin);

      if (!dadosLogin.token || !dadosLogin.usuario) {
        throw new Error('Resposta de login inválida.');
      }

      // 3. SALVAR TOKEN JWT
      await AsyncStorage.setItem(
        'token',
        dadosLogin.token
      );

      setSenha('');
      setConfirmacao('');

      // 4. ABRIR A HOME PELO APP.JS
      aoEntrar(dadosLogin.usuario);

    } catch (falha) {
      if (cadastroConcluido) {
        setErro(
          'Sua conta foi criada, mas não foi possível entrar automaticamente. Volte ao login e entre com seu e-mail e senha.'
        );
      } else {
        setErro(
          falha.status
            ? falha.message
            : 'Não foi possível criar sua conta. Confira se a API está funcionando.'
        );
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={css.tela}
      behavior={
        Platform.OS === 'ios' ? 'padding' : undefined
      }
    >
      <ScrollView
        contentContainerStyle={css.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={css.container}>

          {/* LOGO */}
          <View style={css.cabecalho}>
            <View style={css.logoIcone}>
              <Ionicons
                name="paw"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View>
              <Text style={css.logoNome}>
                Pet
                <Text style={css.logoDestaque}>
                  Match
                </Text>
              </Text>

              <Text style={css.logoSubtitulo}>
                Conectando pets a novos lares
              </Text>
            </View>
          </View>

          {/* CONTEÚDO */}
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
                  FAÇA PARTE DO PETMATCH
                </Text>
              </View>

              <Text
                style={[
                  css.tituloPrincipal,
                  !telaGrande && css.tituloMobile,
                ]}
              >
                Seu próximo{'\n'}
                melhor amigo{'\n'}
                <Text style={css.tituloDestaque}>
                  espera por você.
                </Text>
              </Text>

              <Text style={css.descricao}>
                Crie sua conta e conheça cães e gatos
                que estão esperando por uma família.
                O primeiro passo para uma nova história
                começa aqui.
              </Text>

              <View style={css.informacao}>
                <View style={css.barraVerde} />

                <Text style={css.informacaoTexto}>
                  A adoção responsável transforma
                  a vida dos animais e de quem os acolhe.
                </Text>
              </View>
            </View>

            {/* FORMULÁRIO */}
            <View style={css.cartao}>

              <Text style={css.tituloFormulario}>
                Crie sua conta
              </Text>

              <Text style={css.subtituloFormulario}>
                Preencha seus dados para começar.
              </Text>

              {!!erro && (
                <View style={css.avisoErro}>
                  <Text style={css.erroTexto}>
                    {erro}
                  </Text>
                </View>
              )}

              {/* NOME */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Nome completo
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="Digite seu nome"
                  placeholderTextColor="#A1A5AD"
                  value={nome}
                  onChangeText={setNome}
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={100}
                  editable={!enviando}
                />
              </View>

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
                  maxLength={150}
                  editable={!enviando}
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
                    placeholder="Pelo menos 8 caracteres"
                    placeholderTextColor="#A1A5AD"
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!enviando}
                  />

                  <Pressable
                    style={css.botaoMostrar}
                    onPress={() =>
                      setMostrarSenha(!mostrarSenha)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      mostrarSenha
                        ? 'Ocultar senhas'
                        : 'Mostrar senhas'
                    }
                  >
                    <Text style={css.mostrarTexto}>
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* CONFIRMAR SENHA */}
              <View style={css.campoGrupo}>
                <Text style={css.rotulo}>
                  Confirmar senha
                </Text>

                <TextInput
                  style={css.campo}
                  placeholder="Digite sua senha novamente"
                  placeholderTextColor="#A1A5AD"
                  value={confirmacao}
                  onChangeText={setConfirmacao}
                  secureTextEntry={!mostrarSenha}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!enviando}
                  onSubmitEditing={cadastrarUsuario}
                />
              </View>

              {/* CRIAR CONTA */}
              <Pressable
                style={[
                  css.botaoPrincipal,
                  enviando && css.botaoDesativado,
                ]}
                onPress={cadastrarUsuario}
                disabled={enviando}
                accessibilityRole="button"
              >
                {enviando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={css.botaoPrincipalTexto}>
                    Criar minha conta
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

              <Text style={css.textoLogin}>
                Já tem uma conta?
              </Text>

              <Pressable
                style={css.botaoSecundario}
                onPress={() => navigation.goBack()}
                disabled={enviando}
                accessibilityRole="button"
              >
                <Text style={css.botaoSecundarioTexto}>
                  Voltar para o login
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
  },

  subtituloFormulario: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 23,
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
    marginBottom: 15,
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

  botaoPrincipal: {
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

  botaoPrincipalTexto: {
    color: C.branco,
    fontSize: 14,
    fontWeight: '800',
  },

  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 17,
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

  textoLogin: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 12,
    marginBottom: 12,
  },

  botaoSecundario: {
    height: 46,
    borderWidth: 1,
    borderColor: C.laranja,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botaoSecundarioTexto: {
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
