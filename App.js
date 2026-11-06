
import { useCallback, useEffect, useState } from 'react';
import { Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// TELAS DE AUTENTICAÇÃO
import Login from './screens/Login.js';
import CadastroUsuario from './screens/CadastroUsuario.js';

// TELAS PRINCIPAIS
import Home from './screens/Home.js';
import Animais from './screens/Animais.js';
import DetalhesAnimal from './screens/DetalhesAnimal.js';
import Perfil from './screens/Perfil.js';
import Favoritos from './screens/Favoritos.js';
import MinhasSolicitacoes from './screens/MinhasSolicitacoes.js';
import SolicitarAdocao from './screens/SolicitarAdocao.js';

// TELAS DE GERENCIAMENTO
import GerenciarAnimais from './screens/GerenciarAnimais.js';
import CadastrarAnimal from './screens/CadastrarAnimal.js';
import EditarAnimal from './screens/EditarAnimal.js';
import Usuarios from './screens/Usuarios.js';

// API
import {
  configurarSessaoExpirada,
  fetchAutenticado,
  lerResposta,
} from './services/api.js';

// COMPONENTES
import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  cores,
  estilos,
} from './components/ui.js';

const Stack = createNativeStackNavigator();

export default function App() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');
  const [erroInicial, setErroInicial] = useState('');

  const atualizarUsuario = useCallback((dados) => {
    setUsuario(dados);
  }, []);

  async function restaurarSessao() {
    setCarregando(true);
    setErroInicial('');

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        setUsuario(null);
        return;
      }

      const resposta = await fetchAutenticado('/auth/me');
      const dados = await lerResposta(resposta);

      setUsuario(dados);
    } catch (erro) {
      if (erro.status === 401) {
        await AsyncStorage.removeItem('token');
        setUsuario(null);
      } else {
        setErroInicial(
          'Não foi possível verificar sua sessão. Confira a API e sua conexão.'
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    const cancelar = configurarSessaoExpirada(() => {
      setUsuario(null);
      setAviso('Sua sessão expirou. Entre novamente.');
    });

    restaurarSessao();

    return cancelar;
  }, []);

  function entrar(dadosUsuario) {
    setAviso('');
    setUsuario(dadosUsuario);
  }

  async function sair() {
    try {
      await AsyncStorage.removeItem('token');
      setUsuario(null);
      setAviso('Você saiu da sua conta.');
    } catch {
      setAviso('Não foi possível sair. Tente novamente.');
    }
  }

  function renderizarConteudo() {
    if (carregando) {
      return <Carregamento mensagem="Carregando PetMatch..." />;
    }

    if (erroInicial) {
      return (
        <Pagina>
          <Painel>
            <Text style={estilos.titulo}>
              Vamos reconectar?
            </Text>

            <Aviso mensagem={erroInicial} />

            <Botao
              titulo="Tentar novamente"
              onPress={restaurarSessao}
            />
          </Painel>
        </Pagina>
      );
    }

    const podeGerenciar =
      usuario?.nivel === 'ong' ||
      usuario?.nivel === 'protetor' ||
      usuario?.nivel === 'admin';

    const ehAdmin = usuario?.nivel === 'admin';

    return (
      <NavigationContainer>
        <Stack.Navigator
          id="PetMatch"
          screenOptions={{
            headerStyle: {
              backgroundColor: cores.papel,
            },
            headerTintColor: cores.texto,
            headerTitleStyle: {
              fontWeight: '700',
            },
            contentStyle: {
              backgroundColor: cores.fundo,
            },
            headerShadowVisible: false,
          }}
        >
          {usuario === null ? (
            <Stack.Group navigationKey="publico">
              <Stack.Screen
                name="Login"
                options={{ headerShown: false }}
              >
                {(props) => (
                  <Login
                    {...props}
                    aoEntrar={entrar}
                    avisoSessao={aviso}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="CadastroUsuario"
                options={{
                  headerShown: false,
                }}
              >
                {(props) => (
                  <CadastroUsuario
                    {...props}
                    aoEntrar={entrar}
                  />
                )}
              </Stack.Screen>
            </Stack.Group>
          ) : (
            <Stack.Group navigationKey={'sessao-' + usuario.id}>
              <Stack.Screen
                name="Home"
                options={{
                  title: 'PetMatch',
                  headerShown: false,
                }}
              >
                {(props) => (
                  <Home
                    {...props}
                    usuario={usuario}
                    sair={sair}
                    atualizarUsuario={atualizarUsuario}
                    aviso={aviso}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
  name="Animais"
  options={{
    headerShown: false,
  }}
>
  {(props) => (
    <Animais
      {...props}
      usuario={usuario}
      sair={sair}
    />
  )}
</Stack.Screen>

              <Stack.Screen
                name="DetalhesAnimal"
                options={{
                  title: 'Conheça este pet',
                }}
              >
                {(props) => (
                  <DetalhesAnimal
                    {...props}
                    usuario={usuario}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="Perfil"
                options={{
                  title: 'Meu perfil',
                }}
              >
                {(props) => (
                  <Perfil
                    {...props}
                    usuario={usuario}
                    sair={sair}
                    atualizarUsuario={atualizarUsuario}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen
                name="Favoritos"
                options={{
                  title: 'Meus favoritos',
                }}
                component={Favoritos}
              />

              <Stack.Screen
                name="MinhasSolicitacoes"
                options={{
                  title: 'Solicitações de adoção',
                }}
                component={MinhasSolicitacoes}
              />

              <Stack.Screen
                name="SolicitarAdocao"
                options={{
                  title: 'Solicitar adoção',
                }}
                component={SolicitarAdocao}
              />

              {podeGerenciar && (
                <Stack.Group>
                  <Stack.Screen
                    name="CadastrarAnimal"
                    options={{
                      title: 'Cadastrar animal',
                    }}
                  >
                    {(props) => (
                      <CadastrarAnimal
                        {...props}
                        usuario={usuario}
                      />
                    )}
                  </Stack.Screen>

                  <Stack.Screen
                    name="EditarAnimal"
                    options={{
                      title: 'Editar animal',
                    }}
                  >
                    {(props) => (
                      <EditarAnimal
                        {...props}
                        usuario={usuario}
                      />
                    )}
                  </Stack.Screen>
                </Stack.Group>
              )}

              {ehAdmin && (
  <Stack.Screen
    name="GerenciarAnimais"
    options={{
      title: 'Gerenciar animais',
    }}
  >
    {(props) => (
      <GerenciarAnimais
        {...props}
        usuario={usuario}
      />
    )}
  </Stack.Screen>
)}

              {ehAdmin && (
                <Stack.Screen
                  name="Usuarios"
                  options={{
                    title: 'Gerenciar usuários',
                  }}
                >
                  {(props) => (
                    <Usuarios
                      {...props}
                      usuario={usuario}
                    />
                  )}
                </Stack.Screen>
              )}
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {renderizarConteudo()}
    </SafeAreaProvider>
  );
}
