
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
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

// NÍVEIS DE ACESSO DO PETMATCH
const niveis = [
  'adotante',
  'ong',
  'protetor',
  'admin',
];

// EXIBIR NOMES MAIS AMIGÁVEIS
function nomeNivel(nivel) {
  const nomes = {
    adotante: 'Adotante',
    ong: 'ONG',
    protetor: 'Protetor independente',
    admin: 'Administrador',
  };

  return nomes[nivel] || nivel;
}

export default function Usuarios({ usuario }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [alterandoId, setAlterandoId] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // BUSCAR USUÁRIOS CADASTRADOS
  async function carregarUsuarios(signal) {
    setCarregando(true);
    setErro('');

    try {
      // ROTA PROTEGIDA PARA ADMINISTRADORES
      const resposta = await fetchAutenticado(
        '/usuarios',
        { signal }
      );

      const dados = await lerResposta(resposta);

      if (!signal?.aborted) {
        setUsuarios(
          Array.isArray(dados) ? dados : []
        );
      }
    } catch (falha) {
      if (!signal?.aborted) {
        setErro(
          falha.message ||
          'Não foi possível carregar os usuários.'
        );
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // CARREGAR AO ABRIR A TELA
  useFocusEffect(
    useCallback(function () {
      if (usuario?.nivel !== 'admin') {
        return undefined;
      }

      const controle = new AbortController();

      carregarUsuarios(controle.signal);

      return function () {
        controle.abort();
      };
    }, [usuario?.nivel])
  );

  // ATUALIZAR NÍVEL DO USUÁRIO
  async function alterarNivel(pessoa, novoNivel) {
    if (alterandoId !== null) return;

    setErro('');
    setSucesso('');

    // IMPEDIR ALTERAÇÃO DO PRÓPRIO NÍVEL
    if (Number(pessoa.id) === Number(usuario.id)) {
      setErro('Você não pode alterar seu próprio nível.');
      return;
    }

    if (!niveis.includes(novoNivel)) {
      setErro('Nível de acesso inválido.');
      return;
    }

    if (pessoa.nivel === novoNivel) {
      return;
    }

    setAlterandoId(pessoa.id);

    try {
      // PUT ATUALIZA O NÍVEL NO BANCO DE DADOS
      const resposta = await fetchAutenticado(
        '/usuarios/' + pessoa.id + '/nivel',
        {
          method: 'PUT',
          body: JSON.stringify({
            nivel: novoNivel,
          }),
        }
      );

      const dados = await lerResposta(resposta);

      // ATUALIZAR LISTA LOCAL
      setUsuarios(function (atuais) {
        return atuais.map(function (item) {
          return Number(item.id) === Number(pessoa.id)
            ? { ...item, nivel: novoNivel }
            : item;
        });
      });

      setSucesso(
        dados.mensagem ||
        'Nível de acesso atualizado com sucesso.'
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível alterar o nível.'
      );
    } finally {
      setAlterandoId(null);
    }
  }

  // CONFIRMAR ANTES DE ALTERAR
  function confirmarAlteracao(pessoa, novoNivel) {
    Alert.alert(
      'Alterar nível de acesso',
      'Deseja alterar o nível de ' +
        pessoa.nome +
        ' para ' +
        nomeNivel(novoNivel) +
        '?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: function () {
            alterarNivel(pessoa, novoNivel);
          },
        },
      ]
    );
  }

  // RENDERIZAR CADA USUÁRIO
  function renderizarUsuario({ item }) {
    const proprioUsuario =
      Number(item.id) === Number(usuario.id);

    const alterandoEste =
      alterandoId === item.id;

    return (
      <Painel style={locais.cartao}>

        <Text style={locais.nome}>
          {item.nome}
          {proprioUsuario ? ' (você)' : ''}
        </Text>

        <Text style={locais.email}>
          {item.email}
        </Text>

        <View style={locais.areaNivel}>
          <Text style={locais.rotuloNivel}>
            NÍVEL DE ACESSO
          </Text>

          <Text style={locais.nivel}>
            {nomeNivel(item.nivel)}
          </Text>
        </View>

        {proprioUsuario ? (
          <Text style={locais.observacao}>
            Seu próprio nível de acesso não pode
            ser alterado.
          </Text>
        ) : (
          <View style={locais.acoes}>
            <Text style={locais.tituloAcoes}>
              Alterar para:
            </Text>

            {niveis
              .filter(function (nivel) {
                return nivel !== item.nivel;
              })
              .map(function (nivel) {
                return (
                  <Botao
                    key={nivel}
                    titulo={nomeNivel(nivel)}
                    variante="secundario"
                    disabled={alterandoId !== null}
                    carregando={alterandoEste}
                    onPress={function () {
                      confirmarAlteracao(item, nivel);
                    }}
                  />
                );
              })}
          </View>
        )}

      </Painel>
    );
  }

  // BLOQUEAR ACESSO NÃO AUTORIZADO
  if (usuario?.nivel !== 'admin') {
    return (
      <Pagina>
        <Aviso
          mensagem="Acesso permitido apenas para administradores."
        />
      </Pagina>
    );
  }

  return (
    <SafeAreaView
      style={locais.tela}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={usuarios}
        extraData={alterandoId}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarUsuario}
        contentContainerStyle={locais.conteudo}
        refreshing={carregando}
        onRefresh={() => carregarUsuarios()}

        ListHeaderComponent={
          <View style={locais.cabecalho}>

            <Text style={estilos.etiqueta}>
              PETMATCH / ADMINISTRAÇÃO
            </Text>

            <Text style={estilos.titulo}>
              Gerenciar usuários
            </Text>

            <Text style={estilos.subtitulo}>
              Visualize as contas cadastradas
              e gerencie as permissões de
              adotantes, ONGs e protetores.
            </Text>

            <Aviso mensagem={erro} />

            <Aviso
              mensagem={sucesso}
              tipo="sucesso"
            />

            <Botao
              titulo="Atualizar lista"
              variante="secundario"
              disabled={
                carregando ||
                alterandoId !== null
              }
              onPress={() => carregarUsuarios()}
            />

            <Text style={locais.contagem}>
              {usuarios.length} usuário(s) cadastrado(s)
            </Text>

          </View>
        }

        ListEmptyComponent={
          carregando ? (
            <Carregamento
              mensagem="Carregando usuários..."
            />
          ) : (
            <Painel>
              <Text style={estilos.texto}>
                {erro
                  ? 'Não foi possível carregar os usuários.'
                  : 'Nenhum usuário encontrado.'}
              </Text>
            </Painel>
          )
        }
      />
    </SafeAreaView>
  );
}

const locais = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },

  conteudo: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 48,
    flexGrow: 1,
  },

  cabecalho: {
    marginBottom: 18,
    gap: 12,
  },

  cartao: {
    marginBottom: 16,
  },

  nome: {
    color: cores.texto,
    fontSize: 21,
    fontWeight: '700',
    marginBottom: 8,
  },

  email: {
    color: cores.muted,
    fontSize: 15,
    marginBottom: 14,
  },

  areaNivel: {
    backgroundColor: '#E8EFE4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  rotuloNivel: {
    color: cores.muted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
  },

  nivel: {
    color: cores.verde,
    fontSize: 16,
    fontWeight: '700',
  },

  acoes: {
    gap: 10,
  },

  tituloAcoes: {
    color: cores.texto,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  observacao: {
    color: cores.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  contagem: {
    color: cores.muted,
    fontSize: 13,
    marginTop: 12,
  },
});
