
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import FormularioAnimal, {
  prepararAnimal,
} from '../components/FormularioAnimal.js';

import {
  Aviso,
  Botao,
  Carregamento,
  Pagina,
  Painel,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

export default function EditarAnimal({
  route,
  navigation,
  usuario,
}) {
  // ID DO ANIMAL ENVIADO PELA NAVEGAÇÃO
  const id = route.params?.id;

  const [campos, setCampos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // VERIFICAR PERMISSÕES
  const podeGerenciar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  // BUSCAR DADOS DO ANIMAL
  async function carregarAnimal(signal) {
    setCarregando(true);
    setErro('');
    setSucesso('');

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

      const animal = await lerResposta(resposta);

      if (signal?.aborted) return;

      // PREENCHER O FORMULÁRIO COM OS DADOS DO ANIMAL
      setCampos({
        nome: animal.nome || '',
        especie: animal.especie || '',
        raca: animal.raca || '',
        idade:
          animal.idade === null ||
          animal.idade === undefined
            ? ''
            : String(animal.idade),
        unidade_idade: animal.unidade_idade || 'anos',
        porte: animal.porte || '',
        sexo: animal.sexo || '',
        cidade: animal.cidade || '',
        descricao: animal.descricao || '',
        saude: animal.saude || '',
        foto: animal.foto || '',
        status: animal.status || 'disponivel',
      });
    } catch (falha) {
      if (!signal?.aborted) {
        setCampos(null);
        setErro(
          falha.message ||
          'Não foi possível carregar o animal.'
        );
      }
    } finally {
      if (!signal?.aborted) {
        setCarregando(false);
      }
    }
  }

  // ATUALIZAR DADOS AO ABRIR A TELA
  useFocusEffect(
    useCallback(function atualizarDados() {
      if (!podeGerenciar) {
        return undefined;
      }

      const controle = new AbortController();

      carregarAnimal(controle.signal);

      return function limparEfeito() {
        controle.abort();
      };
    }, [id, podeGerenciar])
  );

  // ALTERAR CAMPOS DO FORMULÁRIO
  function alterarCampo(campo, texto) {
    setCampos(function (anteriores) {
      return {
        ...anteriores,
        [campo]: texto,
      };
    });

    setErro('');
    setSucesso('');
  }

  // ATUALIZAR ANIMAL NA API
  async function atualizarAnimal() {
    if (salvando || !campos) return;

    setErro('');
    setSucesso('');

    try {
      // VALIDAR OS DADOS ANTES DO ENVIO
      const animal = prepararAnimal(campos);

      setSalvando(true);

      // PUT ATUALIZA O ANIMAL PELO ID
      // O JWT É ENVIADO PELO FETCH AUTENTICADO
      const resposta = await fetchAutenticado(
        '/animais/' + id,
        {
          method: 'PUT',
          body: JSON.stringify(animal),
        }
      );

      const dados = await lerResposta(resposta);

      setSucesso(
        dados.mensagem ||
        'Informações do animal atualizadas com sucesso!'
      );
    } catch (falha) {
      setErro(
        falha.message ||
        'Não foi possível atualizar o animal.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // BLOQUEAR ACESSO NÃO AUTORIZADO
  if (!podeGerenciar) {
    return (
      <Pagina>
        <Aviso
          mensagem="Apenas ONGs, protetores e administradores podem editar animais."
        />
      </Pagina>
    );
  }

  return (
    <Pagina>
      {/* CABEÇALHO */}
      <Text style={estilos.etiqueta}>
        PETMATCH / GERENCIAMENTO
      </Text>

      <Text style={estilos.titulo}>
        Editar animal
      </Text>

      <Text style={estilos.subtitulo}>
        Atualize as informações do animal para
        manter seu perfil sempre completo.
      </Text>

      {/* MENSAGENS */}
      <Aviso mensagem={erro} />

      <Aviso
        mensagem={sucesso}
        tipo="sucesso"
      />

      {/* FORMULÁRIO */}
      {carregando ? (
        <Carregamento
          mensagem="Carregando informações do animal..."
        />
      ) : campos ? (
        <Painel>
          <FormularioAnimal
            campos={campos}
            onAlterar={alterarCampo}
            onSalvar={atualizarAnimal}
            salvando={salvando}
            tituloBotao="Salvar alterações"
          />
        </Painel>
      ) : (
        <Botao
          titulo="Tentar novamente"
          onPress={() => carregarAnimal()}
        />
      )}

      {/* BOTÃO VOLTAR */}
      <View style={{ marginTop: 16 }}>
        <Botao
          titulo="Voltar"
          variante="secundario"
          disabled={salvando}
          onPress={() => navigation.goBack()}
        />
      </View>
    </Pagina>
  );
}
