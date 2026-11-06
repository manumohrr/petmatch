
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

const CORES = {
  fundo: '#FAF8F3',
  branco: '#FFFFFF',
  texto: '#252B35',
  secundario: '#737B87',
  laranja: '#FF7628',
  laranjaClaro: '#FFF0E6',
  verde: '#579F13',
  verdeClaro: '#EDF5E7',
  borda: '#EAE6DF',
  vermelho: '#C54848',
};

const niveis = [
  'adotante',
  'ong',
  'protetor',
  'admin',
];

function nomeNivel(nivel) {
  const nomes = {
    adotante: 'Adotante',
    ong: 'ONG',
    protetor: 'Protetor independente',
    admin: 'Administrador',
  };

  return nomes[nivel] || nivel || 'Não informado';
}

function estiloNivel(nivel) {
  switch (nivel) {
    case 'admin':
      return {
        cor: '#A15C18',
        fundo: '#FFF0DF',
      };

    case 'ong':
      return {
        cor: '#376B0C',
        fundo: CORES.verdeClaro,
      };

    case 'protetor':
      return {
        cor: '#466BA0',
        fundo: '#EBF2FC',
      };

    default:
      return {
        cor: CORES.secundario,
        fundo: '#F0F0F0',
      };
  }
}

function Botao({
  titulo,
  onPress,
  secundario = false,
  disabled = false,
  carregando = false,
}) {
  return (
    <Pressable
      style={[
        estilos.botao,
        secundario && estilos.botaoSecundario,
        disabled && estilos.botaoDesabilitado,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      {carregando ? (
        <ActivityIndicator
          color={
            secundario ? CORES.texto : CORES.branco
          }
        />
      ) : (
        <Text
          style={[
            estilos.textoBotao,
            secundario && estilos.textoBotaoSecundario,
          ]}
        >
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

function CartaoUsuario({
  pessoa,
  proprioUsuario,
  alterando,
  bloqueado,
  nivelSelecionado,
  onSelecionar,
  onSalvar,
}) {
  const nivelVisual = estiloNivel(pessoa.nivel);
  const nivelAtual = nivelSelecionado || pessoa.nivel;
  const temAlteracao = nivelAtual !== pessoa.nivel;

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalhoCartao}>
        <View style={estilos.avatar}>
          <Text style={estilos.inicialAvatar}>
            {(pessoa.nome || 'U')
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View style={estilos.dadosUsuario}>
          <Text
            style={estilos.nomeUsuario}
            numberOfLines={2}
          >
            {pessoa.nome || 'Usuário sem nome'}
          </Text>

          <Text
            style={estilos.emailUsuario}
            numberOfLines={2}
          >
            {pessoa.email || 'E-mail não informado'}
          </Text>

          {proprioUsuario ? (
            <Text style={estilos.identificacao}>
              Sua conta
            </Text>
          ) : null}
        </View>
      </View>

      <View style={estilos.divisor} />

      <Text style={estilos.rotulo}>
        NÍVEL DE ACESSO ATUAL
      </Text>

      <View
        style={[
          estilos.etiquetaNivel,
          { backgroundColor: nivelVisual.fundo },
        ]}
      >
        <Text
          style={[
            estilos.textoNivel,
            { color: nivelVisual.cor },
          ]}
        >
          {nomeNivel(pessoa.nivel)}
        </Text>
      </View>

      {proprioUsuario ? (
        <Text style={estilos.observacao}>
          Por segurança, você não pode alterar
          seu próprio nível de acesso.
        </Text>
      ) : (
        <View style={estilos.areaPermissoes}>
          <Text style={estilos.tituloPermissoes}>
            Alterar permissão
          </Text>

          <Text style={estilos.descricaoPermissoes}>
            Selecione o nível que deseja atribuir
            a este usuário.
          </Text>

          <View style={estilos.opcoes}>
            {niveis.map((nivel) => {
              const selecionado = nivelAtual === nivel;

              return (
                <Pressable
                  key={nivel}
                  style={[
                    estilos.opcao,
                    selecionado && estilos.opcaoSelecionada,
                    bloqueado && estilos.opcaoBloqueada,
                  ]}
                  disabled={bloqueado}
                  onPress={() =>
                    onSelecionar(nivel)
                  }
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: selecionado,
                    disabled: bloqueado,
                  }}
                >
                  <View
                    style={[
                      estilos.radio,
                      selecionado && estilos.radioSelecionado,
                    ]}
                  >
                    {selecionado ? (
                      <View style={estilos.radioCentro} />
                    ) : null}
                  </View>

                  <Text
                    style={[
                      estilos.textoOpcao,
                      selecionado &&
                        estilos.textoOpcaoSelecionada,
                    ]}
                  >
                    {nomeNivel(nivel)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Botao
            titulo={
              alterando
                ? 'Salvando...'
                : 'Salvar alteração'
            }
            carregando={alterando}
            disabled={!temAlteracao || bloqueado}
            onPress={onSalvar}
          />
        </View>
      )}
    </View>
  );
}

export default function Usuarios({ usuario }) {
  const { width } = useWindowDimensions();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [alterandoId, setAlterandoId] = useState(null);
  const [pesquisa, setPesquisa] = useState('');
  const [filtroNivel, setFiltroNivel] = useState('todos');
  const [selecoes, setSelecoes] = useState({});
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const duasColunas = width >= 950;

  const ehAdmin = usuario?.nivel === 'admin';

  const carregarUsuarios = useCallback(
    async (mostrarCarregamento = true, signal) => {
      if (mostrarCarregamento) {
        setCarregando(true);
      } else {
        setAtualizando(true);
      }

      setErro('');

      try {
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
          setAtualizando(false);
        }
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      if (!ehAdmin) return undefined;

      const controle = new AbortController();

      carregarUsuarios(true, controle.signal);

      return () => controle.abort();
    }, [ehAdmin, carregarUsuarios])
  );

  const usuariosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return usuarios.filter((pessoa) => {
      const correspondePesquisa =
        !termo ||
        String(pessoa.nome || '')
          .toLowerCase()
          .includes(termo) ||
        String(pessoa.email || '')
          .toLowerCase()
          .includes(termo) ||
        String(pessoa.id)
          .includes(termo);

      const correspondeNivel =
        filtroNivel === 'todos' ||
        pessoa.nivel === filtroNivel;

      return correspondePesquisa && correspondeNivel;
    });
  }, [usuarios, pesquisa, filtroNivel]);

  const totalAdotantes = usuarios.filter(
    (pessoa) => pessoa.nivel === 'adotante'
  ).length;

  const totalResponsaveis = usuarios.filter(
    (pessoa) =>
      pessoa.nivel === 'ong' ||
      pessoa.nivel === 'protetor'
  ).length;

  const totalAdministradores = usuarios.filter(
    (pessoa) => pessoa.nivel === 'admin'
  ).length;

  function confirmarAlteracao(pessoa, novoNivel) {
    if (alterandoId !== null) return;

    if (String(pessoa.id) === String(usuario?.id)) {
      setErro('Você não pode alterar seu próprio nível.');
      return;
    }

    if (!niveis.includes(novoNivel)) {
      setErro('Nível de acesso inválido.');
      return;
    }

    if (pessoa.nivel === novoNivel) return;

    const mensagem =
      `Deseja alterar o nível de ${pessoa.nome} ` +
      `para ${nomeNivel(novoNivel)}?`;

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) {
        alterarNivel(pessoa, novoNivel);
      }

      return;
    }

    Alert.alert(
      'Alterar nível de acesso',
      mensagem,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: () =>
            alterarNivel(pessoa, novoNivel),
        },
      ]
    );
  }

  async function alterarNivel(pessoa, novoNivel) {
    if (alterandoId !== null) return;

    setErro('');
    setSucesso('');
    setAlterandoId(pessoa.id);

    try {
      const resposta = await fetchAutenticado(
        `/usuarios/${pessoa.id}/nivel`,
        {
          method: 'PUT',
          body: JSON.stringify({
            nivel: novoNivel,
          }),
        }
      );

      const dados = await lerResposta(resposta);

      setUsuarios((atuais) =>
        atuais.map((item) =>
          String(item.id) === String(pessoa.id)
            ? { ...item, nivel: novoNivel }
            : item
        )
      );

      setSelecoes((atuais) => {
        const novas = { ...atuais };
        delete novas[String(pessoa.id)];
        return novas;
      });

      setSucesso(
        dados.mensagem ||
        `Permissão de ${pessoa.nome} atualizada com sucesso.`
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível alterar o nível de acesso.'
      );
    } finally {
      setAlterandoId(null);
    }
  }

  function selecionarNivel(id, nivel) {
    setSelecoes((atuais) => ({
      ...atuais,
      [String(id)]: nivel,
    }));

    setErro('');
    setSucesso('');
  }

  if (!ehAdmin) {
    return (
      <View style={estilos.centralizado}>
        <Text style={estilos.tituloVazio}>
          Acesso não autorizado
        </Text>

        <Text style={estilos.textoAuxiliar}>
          Apenas administradores podem gerenciar
          as permissões dos usuários.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={estilos.container}
      edges={['left', 'right', 'bottom']}
    >
      <FlatList
        data={usuariosFiltrados}
        key={duasColunas ? 'duas' : 'uma'}
        numColumns={duasColunas ? 2 : 1}
        keyExtractor={(item) => String(item.id)}
        extraData={{ selecoes, alterandoId }}
        columnWrapperStyle={
          duasColunas ? estilos.linhaGrade : undefined
        }
        contentContainerStyle={estilos.conteudo}
        refreshing={atualizando}
        onRefresh={() => {
          if (alterandoId === null) {
            carregarUsuarios(false);
          }
        }}
        ListHeaderComponent={
          <View>
            <View style={estilos.cabecalho}>
              <Text style={estilos.titulo}>
                Gerenciar usuários
              </Text>

              <Text style={estilos.subtitulo}>
                Visualize as contas cadastradas
                e gerencie as permissões de acesso
                dos usuários do PetMatch.
              </Text>
            </View>

            {erro ? (
              <View style={estilos.avisoErro}>
                <Text style={estilos.textoErro}>
                  {erro}
                </Text>
              </View>
            ) : null}

            {sucesso ? (
              <View style={estilos.avisoSucesso}>
                <Text style={estilos.textoSucesso}>
                  {sucesso}
                </Text>
              </View>
            ) : null}

            <View style={estilos.resumos}>
              <View style={estilos.resumo}>
                <Text style={estilos.numeroResumo}>
                  {usuarios.length}
                </Text>
                <Text style={estilos.rotuloResumo}>
                  Total de usuários
                </Text>
              </View>

              <View style={estilos.resumo}>
                <Text style={estilos.numeroResumo}>
                  {totalAdotantes}
                </Text>
                <Text style={estilos.rotuloResumo}>
                  Adotantes
                </Text>
              </View>

              <View style={estilos.resumo}>
                <Text style={estilos.numeroResumo}>
                  {totalResponsaveis}
                </Text>
                <Text style={estilos.rotuloResumo}>
                  ONGs e protetores
                </Text>
              </View>

              <View style={estilos.resumo}>
                <Text style={estilos.numeroResumo}>
                  {totalAdministradores}
                </Text>
                <Text style={estilos.rotuloResumo}>
                  Administradores
                </Text>
              </View>
            </View>

            <View style={estilos.areaFiltros}>
              <Text style={estilos.tituloLista}>
                Usuários cadastrados
              </Text>

              <TextInput
                style={estilos.campoPesquisa}
                placeholder="Buscar por nome, e-mail ou ID..."
                placeholderTextColor="#999FA8"
                value={pesquisa}
                onChangeText={setPesquisa}
                autoCapitalize="none"
              />

              <View style={estilos.filtros}>
                {[
                  { valor: 'todos', nome: 'Todos' },
                  { valor: 'adotante', nome: 'Adotantes' },
                  { valor: 'ong', nome: 'ONGs' },
                  { valor: 'protetor', nome: 'Protetores' },
                  { valor: 'admin', nome: 'Admins' },
                ].map((filtro) => {
                  const ativo =
                    filtroNivel === filtro.valor;

                  return (
                    <Pressable
                      key={filtro.valor}
                      style={[
                        estilos.filtro,
                        ativo && estilos.filtroAtivo,
                      ]}
                      onPress={() =>
                        setFiltroNivel(filtro.valor)
                      }
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          estilos.textoFiltro,
                          ativo && estilos.textoFiltroAtivo,
                        ]}
                      >
                        {filtro.nome}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={estilos.linhaContagem}>
                <Text style={estilos.contagem}>
                  {usuariosFiltrados.length}
                  {usuariosFiltrados.length === 1
                    ? ' usuário encontrado'
                    : ' usuários encontrados'}
                </Text>

                <Pressable
                  onPress={() => carregarUsuarios(false)}
                  disabled={
                    carregando ||
                    atualizando ||
                    alterandoId !== null
                  }
                  accessibilityRole="button"
                >
                  <Text style={estilos.atualizar}>
                    Atualizar lista
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const proprioUsuario =
            String(item.id) === String(usuario.id);

          return (
            <View
              style={[
                estilos.itemLista,
                duasColunas && estilos.itemDuasColunas,
              ]}
            >
              <CartaoUsuario
                pessoa={item}
                proprioUsuario={proprioUsuario}
                alterando={
                  String(alterandoId) === String(item.id)
                }
                bloqueado={alterandoId !== null}
                nivelSelecionado={
                  selecoes[String(item.id)]
                }
                onSelecionar={(nivel) =>
                  selecionarNivel(item.id, nivel)
                }
                onSalvar={() =>
                  confirmarAlteracao(
                    item,
                    selecoes[String(item.id)] ||
                      item.nivel
                  )
                }
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={estilos.cartaoVazio}>
            {carregando ? (
              <>
                <ActivityIndicator
                  size="large"
                  color={CORES.laranja}
                />
                <Text style={estilos.textoAuxiliar}>
                  Carregando usuários...
                </Text>
              </>
            ) : (
              <>
                <Text style={estilos.tituloVazio}>
                  Nenhum usuário encontrado
                </Text>

                <Text style={estilos.textoAuxiliar}>
                  {erro
                    ? 'Não foi possível carregar a lista. Tente atualizar novamente.'
                    : 'Não encontramos usuários com os filtros selecionados.'}
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CORES.fundo,
  },

  conteudo: {
    width: '100%',
    maxWidth: 1250,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 65,
    flexGrow: 1,
  },

  centralizado: {
    flex: 1,
    backgroundColor: CORES.fundo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
    gap: 15,
  },

  cabecalho: {
    marginBottom: 28,
  },

  titulo: {
    fontSize: 32,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 10,
  },

  subtitulo: {
    fontSize: 15,
    color: CORES.secundario,
    lineHeight: 24,
    maxWidth: 720,
  },

  resumos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 35,
  },

  resumo: {
    flexGrow: 1,
    flexBasis: 170,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 14,
    padding: 19,
  },

  numeroResumo: {
    fontSize: 29,
    fontWeight: '800',
    color: CORES.texto,
    marginBottom: 7,
  },

  rotuloResumo: {
    color: CORES.secundario,
    fontSize: 13,
  },

  areaFiltros: {
    marginBottom: 22,
  },

  tituloLista: {
    color: CORES.texto,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 18,
  },

  campoPesquisa: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: CORES.texto,
    minHeight: 52,
  },

  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 15,
  },

  filtro: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  filtroAtivo: {
    backgroundColor: CORES.laranja,
    borderColor: CORES.laranja,
  },

  textoFiltro: {
    color: CORES.secundario,
    fontSize: 13,
    fontWeight: '700',
  },

  textoFiltroAtivo: {
    color: CORES.branco,
  },

  linhaContagem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },

  contagem: {
    color: CORES.secundario,
    fontSize: 13,
  },

  atualizar: {
    color: CORES.verde,
    fontSize: 13,
    fontWeight: '800',
  },

  linhaGrade: {
    gap: 18,
  },

  itemLista: {
    flex: 1,
    marginBottom: 18,
  },

  itemDuasColunas: {
    minWidth: 0,
  },

  cartao: {
    flex: 1,
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 22,
  },

  cabecalhoCartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: CORES.laranjaClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inicialAvatar: {
    color: CORES.laranja,
    fontSize: 22,
    fontWeight: '800',
  },

  dadosUsuario: {
    flex: 1,
    minWidth: 0,
  },

  nomeUsuario: {
    color: CORES.texto,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 5,
  },

  emailUsuario: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 20,
  },

  identificacao: {
    color: CORES.verde,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  divisor: {
    height: 1,
    backgroundColor: CORES.borda,
    marginVertical: 21,
  },

  rotulo: {
    color: CORES.secundario,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 10,
  },

  etiquetaNivel: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  textoNivel: {
    fontSize: 12,
    fontWeight: '800',
  },

  observacao: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 20,
  },

  areaPermissoes: {
    marginTop: 24,
    flex: 1,
  },

  tituloPermissoes: {
    color: CORES.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 7,
  },

  descricaoPermissoes: {
    color: CORES.secundario,
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 16,
  },

  opcoes: {
    gap: 9,
    marginBottom: 20,
  },

  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 13,
  },

  opcaoSelecionada: {
    backgroundColor: CORES.laranjaClaro,
    borderColor: CORES.laranja,
  },

  opcaoBloqueada: {
    opacity: 0.65,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#B5B7BC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioSelecionado: {
    borderColor: CORES.laranja,
  },

  radioCentro: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CORES.laranja,
  },

  textoOpcao: {
    color: CORES.texto,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },

  textoOpcaoSelecionada: {
    color: CORES.texto,
    fontWeight: '800',
  },

  botao: {
    backgroundColor: CORES.laranja,
    borderRadius: 11,
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },

  botaoSecundario: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
  },

  botaoDesabilitado: {
    opacity: 0.45,
  },

  textoBotao: {
    color: CORES.branco,
    fontSize: 14,
    fontWeight: '800',
  },

  textoBotaoSecundario: {
    color: CORES.texto,
  },

  avisoErro: {
    backgroundColor: '#FFF0F0',
    borderRadius: 11,
    padding: 15,
    marginBottom: 18,
  },

  textoErro: {
    color: CORES.vermelho,
    fontSize: 13,
    lineHeight: 21,
  },

  avisoSucesso: {
    backgroundColor: CORES.verdeClaro,
    borderRadius: 11,
    padding: 15,
    marginBottom: 18,
  },

  textoSucesso: {
    color: CORES.verde,
    fontSize: 13,
    lineHeight: 21,
  },

  cartaoVazio: {
    backgroundColor: CORES.branco,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    minHeight: 200,
  },

  tituloVazio: {
    color: CORES.texto,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  textoAuxiliar: {
    color: CORES.secundario,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
