
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api';

import { Botao, cores } from '../components/ui';

export default function SolicitarAdocao({ route, navigation }) {
  const animalId = route.params?.animalId ?? route.params?.id;

  const [animal, setAnimal] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  function avisar(titulo, texto, aoConfirmar) {
    if (Platform.OS === 'web') {
      window.alert(`${titulo}\n\n${texto}`);
      if (aoConfirmar) aoConfirmar();
    } else {
      Alert.alert(titulo, texto, [
        { text: 'OK', onPress: aoConfirmar },
      ]);
    }
  }

  useEffect(() => {
    async function carregarAnimal() {
      if (!animalId) {
        setCarregando(false);
        return;
      }

      try {
        const resposta = await fetchAutenticado(
          `/animais/${animalId}`
        );

        const dados = await lerResposta(resposta);
        setAnimal(dados);
      } catch (erro) {
        avisar(
          'Erro',
          erro.message ||
            'Não foi possível carregar as informações do animal.'
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarAnimal();
  }, [animalId]);

  async function enviarSolicitacao() {
    if (!animalId || !animal) {
      avisar('Atenção', 'Animal não encontrado.');
      return;
    }

    if (animal.status !== 'disponivel') {
      avisar(
        'Atenção',
        'Este animal não está disponível para adoção.'
      );
      return;
    }

    if (!mensagem.trim()) {
      avisar(
        'Atenção',
        'Escreva uma mensagem contando por que deseja adotar.'
      );
      return;
    }

    if (mensagem.trim().length > 1000) {
      avisar(
        'Atenção',
        'A mensagem deve ter até 1000 caracteres.'
      );
      return;
    }

    try {
      setEnviando(true);

      const resposta = await fetchAutenticado('/adocoes', {
        method: 'POST',
        body: JSON.stringify({
          animal_id: Number(animalId),
          mensagem: mensagem.trim(),
        }),
      });

      await lerResposta(resposta);

      avisar(
        'Solicitação enviada!',
        'Seu pedido de adoção foi enviado com sucesso. Acompanhe a resposta em Minhas Solicitações.',
        () => navigation.navigate('MinhasSolicitacoes')
      );
    } catch (erro) {
      avisar(
        'Erro',
        erro.message ||
          'Não foi possível enviar a solicitação.'
      );
    } finally {
      setEnviando(false);
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
          Carregando informações...
        </Text>
      </View>
    );
  }

  if (!animal) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.titulo}>
          Animal não encontrado
        </Text>

        <Botao
          titulo="Voltar"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.container}
      contentContainerStyle={estilos.conteudo}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={estilos.titulo}>
        Solicitar adoção
      </Text>

      <Text style={estilos.subtitulo}>
        Que bom que você quer dar uma nova oportunidade
        a um animal!
      </Text>

      <View style={estilos.cartao}>
        <Text style={estilos.rotulo}>
          Você deseja adotar:
        </Text>

        <Text style={estilos.nomeAnimal}>
          {animal.nome}
        </Text>

        <Text style={estilos.detalhes}>
          {animal.especie}
          {animal.raca ? ` • ${animal.raca}` : ''}
        </Text>

        {animal.cidade ? (
          <Text style={estilos.detalhes}>
            Localização: {animal.cidade}
          </Text>
        ) : null}
      </View>

      <Text style={estilos.secaoTitulo}>
        Conte um pouquinho sobre você
      </Text>

      <Text style={estilos.descricao}>
        Escreva por que você gostaria de adotar{' '}
        {animal.nome}. Sua mensagem será enviada para
        o responsável pelo animal.
      </Text>

      <Text style={estilos.rotulo}>
        Sua mensagem
      </Text>

      <TextInput
        style={estilos.campoMensagem}
        placeholder="Olá! Tenho interesse em adotar..."
        placeholderTextColor="#999"
        multiline
        textAlignVertical="top"
        value={mensagem}
        onChangeText={setMensagem}
        maxLength={1000}
        editable={!enviando}
      />

      <Text style={estilos.contador}>
        {mensagem.length}/1000 caracteres
      </Text>

      <View style={estilos.aviso}>
        <Text style={estilos.textoAviso}>
          Enviar a solicitação não significa que a
          adoção foi aprovada. O responsável vai analisar
          seu pedido antes de confirmar.
        </Text>
      </View>

      <Botao
        titulo="Enviar solicitação"
        onPress={enviarSolicitacao}
        disabled={
          enviando ||
          animal.status !== 'disponivel'
        }
        carregando={enviando}
      />

      <View style={estilos.espacoBotao}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          onPress={() => navigation.goBack()}
          disabled={enviando}
        />
      </View>
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

  cartao: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  rotulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 10,
  },

  nomeAnimal: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 8,
  },

  detalhes: {
    fontSize: 14,
    color: '#607D8B',
    marginBottom: 5,
  },

  secaoTitulo: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 12,
  },

  descricao: {
    fontSize: 15,
    color: '#607D8B',
    lineHeight: 22,
    marginBottom: 20,
  },

  campoMensagem: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE2E5',
    borderRadius: 12,
    padding: 15,
    fontSize: 15,
    color: '#263238',
    minHeight: 150,
  },

  contador: {
    fontSize: 12,
    color: '#78909C',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 22,
  },

  aviso: {
    backgroundColor: '#EAF4F0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 25,
  },

  textoAviso: {
    fontSize: 13,
    color: '#42685C',
    lineHeight: 20,
  },

  textoAuxiliar: {
    color: '#607D8B',
  },

  espacoBotao: {
    marginTop: 12,
  },
});
