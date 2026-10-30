
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function Perfil({ navigation }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    carregarPerfil();
  }, []);

  async function carregarPerfil() {
    try {
      setCarregando(true);

      const resposta = await fetchAutenticado('/auth/me');
      const dados = await lerResposta(resposta);

      setUsuario(dados);
    } catch (erro) {
      const mensagem =
        erro.message ||
        'Não foi possível carregar seu perfil.';

      if (Platform.OS === 'web') {
        window.alert(mensagem);
      } else {
        Alert.alert('Erro', mensagem);
      }
    } finally {
      setCarregando(false);
    }
  }

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

  async function sairDaConta() {
    try {
      setSaindo(true);

      await AsyncStorage.removeItem('token');

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (erro) {
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
          color={cores.primaria}
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
          Não foi possível carregar suas informações.
        </Text>

        <Botao
          titulo="Tentar novamente"
          onPress={carregarPerfil}
        />
      </View>
    );
  }

  const inicial =
    usuario.nome?.charAt(0)?.toUpperCase() || 'U';

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
    >
      <Text style={estilos.titulo}>
        Meu perfil
      </Text>

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

        <View style={estilos.etiqueta}>
          <Text style={estilos.textoEtiqueta}>
            {nomeNivel(usuario.nivel)}
          </Text>
        </View>
      </View>

      <Text style={estilos.tituloSecao}>
        Minhas informações
      </Text>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>
          Nome completo
        </Text>

        <Text style={estilos.valor}>
          {usuario.nome}
        </Text>

        <View style={estilos.divisor} />

        <Text style={estilos.rotulo}>
          E-mail
        </Text>

        <Text style={estilos.valor}>
          {usuario.email}
        </Text>

        <View style={estilos.divisor} />

        <Text style={estilos.rotulo}>
          Tipo de conta
        </Text>

        <Text style={estilos.valor}>
          {nomeNivel(usuario.nivel)}
        </Text>
      </View>

      <Text style={estilos.tituloSecao}>
        Minha conta
      </Text>

      <View style={estilos.cartao}>
        <Botao
          titulo="Meus favoritos"
          onPress={() =>
            navigation.navigate('Favoritos')
          }
        />

        <View style={estilos.espacoBotao}>
          <Botao
            titulo="Minhas solicitações"
            variante="secundario"
            onPress={() =>
              navigation.navigate('MinhasSolicitacoes')
            }
          />
        </View>

        {['ong', 'protetor', 'admin'].includes(
          usuario.nivel
        ) && (
          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Cadastrar animal"
              variante="secundario"
              onPress={() =>
                navigation.navigate('CadastrarAnimal')
              }
            />
          </View>
        )}

        {usuario.nivel === 'admin' && (
          <View style={estilos.espacoBotao}>
            <Botao
              titulo="Gerenciar usuários"
              variante="secundario"
              onPress={() =>
                navigation.navigate('Usuarios')
              }
            />
          </View>
        )}
      </View>

      <View style={estilos.areaSair}>
        <Botao
          titulo="Sair da conta"
          variante="secundario"
          onPress={confirmarSaida}
          disabled={saindo}
          carregando={saindo}
        />
      </View>

      <Text style={estilos.rodape}>
        PetMatch — Conectando animais a novos lares.
      </Text>
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
    gap: 16,
    backgroundColor: '#F8F9FA',
  },

  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 24,
  },

  cartaoPerfil: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#DCEFE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },

  letraAvatar: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#42685C',
  },

  nome: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#263238',
    textAlign: 'center',
    marginBottom: 6,
  },

  email: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
    marginBottom: 14,
  },

  etiqueta: {
    backgroundColor: '#EAF4F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  textoEtiqueta: {
    color: '#42685C',
    fontSize: 13,
    fontWeight: '600',
  },

  tituloSecao: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 14,
  },

  cartao: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    marginBottom: 26,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  rotulo: {
    fontSize: 13,
    color: '#78909C',
    marginBottom: 5,
  },

  valor: {
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
  },

  divisor: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 16,
  },

  espacoBotao: {
    marginTop: 12,
  },

  areaSair: {
    marginBottom: 25,
  },

  textoAuxiliar: {
    fontSize: 14,
    color: '#607D8B',
    textAlign: 'center',
  },

  rodape: {
    fontSize: 12,
    color: '#90A4AE',
    textAlign: 'center',
    marginTop: 10,
  },
});
