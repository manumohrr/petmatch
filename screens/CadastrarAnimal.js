
import React, { useState } from 'react';
import { Text, View } from 'react-native';

import FormularioAnimal, {
  prepararAnimal,
} from '../components/FormularioAnimal.js';

import {
  Aviso,
  Botao,
  Pagina,
  Painel,
  estilos,
} from '../components/ui.js';

import {
  fetchAutenticado,
  lerResposta,
} from '../services/api.js';

// CAMPOS INICIAIS DO FORMULÁRIO
const camposIniciais = {
  nome: '',
  especie: '',
  raca: '',
  idade: '',
  unidade_idade: 'anos',
  porte: '',
  sexo: '',
  cidade: '',
  descricao: '',
  saude: '',
  foto: '',
  status: 'disponivel',
};

export default function CadastrarAnimal({
  navigation,
  usuario,
}) {
  const [campos, setCampos] = useState({
    ...camposIniciais,
  });

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // ALTERAR OS CAMPOS DO FORMULÁRIO
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

  // CADASTRAR ANIMAL NA API
  async function cadastrarAnimal() {
    if (salvando) return;

    setErro('');
    setSucesso('');

    try {
      // VALIDAR E PREPARAR OS DADOS
      const animal = prepararAnimal(campos);

      setSalvando(true);

      // ENVIO DO TOKEN JWT PELO FETCH AUTENTICADO
      const resposta = await fetchAutenticado('/animais', {
        method: 'POST',
        body: JSON.stringify(animal),
      });

      const dados = await lerResposta(resposta);

      setSucesso(
        dados.mensagem || 'Animal cadastrado com sucesso!'
      );

      // LIMPAR FORMULÁRIO APÓS O CADASTRO
      setCampos({
        ...camposIniciais,
      });
    } catch (falha) {
      setErro(
        falha.message || 'Não foi possível cadastrar o animal.'
      );
    } finally {
      setSalvando(false);
    }
  }

  // VERIFICAR PERMISSÕES
  const podeCadastrar =
    usuario?.nivel === 'ong' ||
    usuario?.nivel === 'protetor' ||
    usuario?.nivel === 'admin';

  if (!podeCadastrar) {
    return (
      <Pagina>
        <Aviso
          mensagem="Apenas ONGs, protetores e administradores podem cadastrar animais."
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
        Cadastrar animal
      </Text>

      <Text style={estilos.subtitulo}>
        Preencha as informações do animal para
        disponibilizá-lo para adoção no PetMatch.
      </Text>

      {/* MENSAGENS */}
      <Aviso mensagem={erro} />

      <Aviso
        mensagem={sucesso}
        tipo="sucesso"
      />

      {/* FORMULÁRIO */}
      <Painel>
        <FormularioAnimal
          campos={campos}
          onAlterar={alterarCampo}
          onSalvar={cadastrarAnimal}
          salvando={salvando}
          tituloBotao="Cadastrar animal"
        />
      </Painel>

      {/* VOLTAR PARA A LISTA */}
      <View style={{ marginTop: 16 }}>
        <Botao
          titulo="Ver animais cadastrados"
          variante="secundario"
          disabled={salvando}
          onPress={() => navigation.navigate('Animais')}
        />
      </View>
    </Pagina>
  );
}
