
import React, { useCallback, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  cores,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function DetalhesAnimal({
  route,
  navigation,
  usuario,
}) {
  const id = route.params?.id;

  const [animal, setAnimal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // VERIFICAR PERMISSÕES
  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR INFORMAÇÕES DO ANIMAL NA API
  async function carregarAnimal(signal) {
    setCarregando(true);
    setErro('');

    try {
      if (!id) {
        throw new Error(
          'Animal não informado. Volte para a lista de adoção.'
        );
      }

      const resposta = await fetchAutenticado(
        '/animais/' + id,
        { signal }
      );

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setAnimal(dados);
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setAnimal(null);
        setErro(falha.message);
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR DADOS AO VOLTAR PARA A TELA
  useFocusEffect(
    useCallback(function atualizarAnimal() {
      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [id])
  );

  // FORMATAR IDADE
  function formatarIdade() {
    if (
      animal?.idade === null ||
      animal?.idade === undefined
    ) {
      return 'Não informada';
    }

    const idade = Number(animal.idade);

    if (!Number.isFinite(idade)) {
      return String(animal.idade);
    }

    if (animal.unidade_idade === 'meses') {
      return idade + (idade === 1 ? ' mês' : ' meses');
    }

    return idade + (idade === 1 ? ' ano' : ' anos');
  }

  // FORMATAR STATUS
  function formatarStatus(status) {
    switch (status) {
      case 'disponivel':
        return 'Disponível para adoção';

      case 'em_processo':
        return 'Em processo de adoção';

      case 'adotado':
        return 'Adotado';

      default:
        return status || 'Não informado';
    }
  }

  // SOLICITAR ADOÇÃO
  function solicitarAdocao() {
    navigation.navigate('SolicitarAdocao', {
      id: animal.id,
    });
  }

  // EDITAR ANIMAL
  function editarAnimal() {
    navigation.navigate('EditarAnimal', {
      id: animal.id,
    });
  }

  return (
    <Pagina>
      <Text style={estilos.etiqueta}>
        PETMATCH / PERFIL DO ANIMAL
      </Text>

      <Aviso mensagem={erro} />

      {carregando ? (
        <Carregamento mensagem="Carregando informações do pet..." />
      ) : animal ? (
        <>
          <Painel>
            {/* FOTO DO ANIMAL */}
            {animal.foto ? (
              <Image
                source={{ uri: animal.foto }}
                style={locais.foto}
                resizeMode="cover"
              />
            ) : (
              <View style={locais.semFoto}>
                <Text style={locais.textoSemFoto}>
                  Foto não disponível
                </Text>
              </View>
            )}

            {/* INFORMAÇÕES PRINCIPAIS */}
            <Text style={estilos.etiqueta}>
              {animal.especie || 'ANIMAL PARA ADOÇÃO'}
            </Text>

            <Text style={locais.nome}>
              {animal.nome}
            </Text>

            <Text style={estilos.subtitulo}>
              Conheça um pouco mais sobre este pet!
            </Text>

            {/* STATUS DE ADOÇÃO */}
            <View style={locais.statusContainer}>
              <Text style={locais.status}>
                {formatarStatus(animal.status)}
              </Text>
            </View>

            <View style={estilos.separador} />

            {/* CARACTERÍSTICAS */}
            <Text style={estilos.etiqueta}>
              INFORMAÇÕES DO PET
            </Text>

            <View style={locais.informacoes}>
              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Espécie: </Text>
                {animal.especie || 'Não informada'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Raça: </Text>
                {animal.raca || 'Não informada'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Idade: </Text>
                {formatarIdade()}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Porte: </Text>
                {animal.porte || 'Não informado'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Sexo: </Text>
                {animal.sexo || 'Não informado'}
              </Text>

              <Text style={locais.detalhe}>
                <Text style={locais.rotulo}>Localização: </Text>
                {animal.cidade || 'Não informada'}
              </Text>
            </View>

            <View style={estilos.separador} />

            {/* DESCRIÇÃO */}
            <Text style={estilos.etiqueta}>
              SOBRE MIM
            </Text>

            <Text style={estilos.texto}>
              {animal.descricao ||
                'Ainda não temos uma descrição cadastrada para este animal.'}
            </Text>

            {/* INFORMAÇÕES DE SAÚDE */}
            {animal.saude ? (
              <>
                <View style={estilos.separador} />

                <Text style={estilos.etiqueta}>
                  SAÚDE E CUIDADOS
                </Text>

                <Text style={estilos.texto}>
                  {animal.saude}
                </Text>
              </>
            ) : null}

            {/* SOLICITAÇÃO DE ADOÇÃO */}
            {animal.status === 'disponivel' &&
              usuario?.nivel !== 'admin' &&
              usuario?.nivel !== 'ong' &&
              usuario?.nivel !== 'protetor' && (
                <View style={locais.areaBotoes}>
                  <Botao
                    titulo="Quero adotar"
                    onPress={solicitarAdocao}
                  />
                </View>
              )}

            {/* GERENCIAMENTO */}
            {podeGerenciar && (
              <View style={locais.areaBotoes}>
                <Botao
                  titulo="Editar informações"
                  onPress={editarAnimal}
                  variante="secundario"
                />
              </View>
            )}
          </Painel>
        </>
      ) : (
        <Botao
          titulo="Tentar novamente"
          onPress={() => carregarAnimal()}
        />
      )}

      <View style={locais.voltar}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          onPress={() => navigation.goBack()}
        />
      </View>
    </Pagina>
  );
}

const locais = StyleSheet.create({
  foto: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    marginBottom: 20,
  },

  semFoto: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    backgroundColor: '#E8EFE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  textoSemFoto: {
    color: cores.muted,
    fontSize: 15,
  },

  nome: {
    color: cores.texto,
    fontSize: 30,
    fontWeight: '700',
    marginVertical: 8,
  },

  statusContainer: {
    backgroundColor: '#E8EFE4',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginVertical: 16,
  },

  status: {
    color: cores.verde,
    fontSize: 14,
    fontWeight: '700',
  },

  informacoes: {
    gap: 12,
    marginVertical: 16,
  },

  detalhe: {
    color: cores.texto,
    fontSize: 15,
    lineHeight: 23,
  },

  rotulo: {
    fontWeight: '700',
  },

  areaBotoes: {
    marginTop: 24,
    gap: 12,
  },

  voltar: {
    marginTop: 16,
  },
});
