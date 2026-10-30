
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Botao, Campo, cores } from './ui.js';

// VALIDAR E PREPARAR OS DADOS DO ANIMAL
export function prepararAnimal(campos) {
  const nome = String(campos.nome || '').trim();
  const especie = String(campos.especie || '').trim();
  const raca = String(campos.raca || '').trim();
  const textoIdade = String(campos.idade || '').trim();
  const unidade_idade = String(campos.unidade_idade || 'anos').trim();
  const porte = String(campos.porte || '').trim();
  const sexo = String(campos.sexo || '').trim();
  const cidade = String(campos.cidade || '').trim();
  const descricao = String(campos.descricao || '').trim();
  const saude = String(campos.saude || '').trim();
  const foto = String(campos.foto || '').trim();
  const status = String(campos.status || 'disponivel').trim();

  // VALIDAR NOME
  if (!nome || nome.length > 120) {
    throw new Error(
      'Informe o nome do animal com até 120 caracteres.'
    );
  }

  // VALIDAR ESPÉCIE
  if (!['Cachorro', 'Gato'].includes(especie)) {
    throw new Error(
      'Informe a espécie: Cachorro ou Gato.'
    );
  }

  // VALIDAR RAÇA
  if (raca.length > 100) {
    throw new Error(
      'A raça deve ter no máximo 100 caracteres.'
    );
  }

  // VALIDAR IDADE
  if (!/^\d+$/.test(textoIdade)) {
    throw new Error(
      'Informe a idade do animal em números inteiros.'
    );
  }

  const idade = Number(textoIdade);

  if (!Number.isInteger(idade) || idade < 0 || idade > 300) {
    throw new Error(
      'Informe uma idade válida para o animal.'
    );
  }

  if (!['anos', 'meses'].includes(unidade_idade)) {
    throw new Error(
      'A unidade da idade deve ser anos ou meses.'
    );
  }

  // VALIDAR PORTE
  if (!['Pequeno', 'Médio', 'Grande'].includes(porte)) {
    throw new Error(
      'Informe o porte: Pequeno, Médio ou Grande.'
    );
  }

  // VALIDAR SEXO
  if (!['Macho', 'Fêmea'].includes(sexo)) {
    throw new Error(
      'Informe o sexo: Macho ou Fêmea.'
    );
  }

  // VALIDAR CIDADE
  if (!cidade || cidade.length > 120) {
    throw new Error(
      'Informe a cidade com até 120 caracteres.'
    );
  }

  // VALIDAR DESCRIÇÃO
  if (descricao.length > 1000) {
    throw new Error(
      'A descrição deve ter no máximo 1000 caracteres.'
    );
  }

  // VALIDAR SAÚDE
  if (saude.length > 500) {
    throw new Error(
      'As informações de saúde devem ter até 500 caracteres.'
    );
  }

  // VALIDAR FOTO
  if (foto && !/^https?:\/\/\S+$/i.test(foto)) {
    throw new Error(
      'Informe um link válido para a foto, começando com http:// ou https://.'
    );
  }

  // VALIDAR STATUS
  if (
    !['disponivel', 'em_processo', 'adotado'].includes(status)
  ) {
    throw new Error(
      'Informe um status de adoção válido.'
    );
  }

  return {
    nome,
    especie,
    raca,
    idade,
    unidade_idade,
    porte,
    sexo,
    cidade,
    descricao,
    saude,
    foto,
    status,
  };
}

// FORMULÁRIO DE CADASTRO E EDIÇÃO
export default function FormularioAnimal({
  campos,
  onAlterar,
  onSalvar,
  salvando,
  tituloBotao,
}) {
  return (
    <View style={estilos.formulario}>

      {/* NOME */}
      <Campo
        rotulo="Nome do animal *"
        value={campos.nome}
        onChangeText={(texto) => onAlterar('nome', texto)}
        maxLength={120}
        placeholder="Ex.: Nina"
        editable={!salvando}
      />

      {/* ESPÉCIE */}
      <Campo
        rotulo="Espécie *"
        value={campos.especie}
        onChangeText={(texto) => onAlterar('especie', texto)}
        maxLength={20}
        placeholder="Cachorro ou Gato"
        editable={!salvando}
      />

      {/* RAÇA */}
      <Campo
        rotulo="Raça"
        value={campos.raca}
        onChangeText={(texto) => onAlterar('raca', texto)}
        maxLength={100}
        placeholder="Ex.: Sem raça definida"
        editable={!salvando}
      />

      {/* IDADE */}
      <Campo
        rotulo="Idade *"
        value={String(campos.idade ?? '')}
        onChangeText={(texto) => onAlterar('idade', texto)}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={3}
        placeholder="Ex.: 2"
        editable={!salvando}
      />

      {/* UNIDADE DA IDADE */}
      <Campo
        rotulo="Unidade da idade *"
        value={campos.unidade_idade}
        onChangeText={(texto) =>
          onAlterar('unidade_idade', texto)
        }
        maxLength={5}
        placeholder="anos ou meses"
        editable={!salvando}
      />

      {/* PORTE */}
      <Campo
        rotulo="Porte *"
        value={campos.porte}
        onChangeText={(texto) => onAlterar('porte', texto)}
        maxLength={20}
        placeholder="Pequeno, Médio ou Grande"
        editable={!salvando}
      />

      {/* SEXO */}
      <Campo
        rotulo="Sexo *"
        value={campos.sexo}
        onChangeText={(texto) => onAlterar('sexo', texto)}
        maxLength={20}
        placeholder="Macho ou Fêmea"
        editable={!salvando}
      />

      {/* CIDADE */}
      <Campo
        rotulo="Cidade *"
        value={campos.cidade}
        onChangeText={(texto) => onAlterar('cidade', texto)}
        maxLength={120}
        placeholder="Ex.: Santa Cruz do Sul"
        editable={!salvando}
      />

      {/* DESCRIÇÃO */}
      <Campo
        rotulo="Descrição do animal"
        value={campos.descricao}
        onChangeText={(texto) =>
          onAlterar('descricao', texto)
        }
        maxLength={1000}
        multiline
        numberOfLines={4}
        placeholder="Conte sobre a personalidade, os hábitos e a história do animal."
        editable={!salvando}
        style={estilos.descricao}
      />

      {/* SAÚDE */}
      <Campo
        rotulo="Saúde e cuidados"
        value={campos.saude}
        onChangeText={(texto) => onAlterar('saude', texto)}
        maxLength={500}
        multiline
        numberOfLines={3}
        placeholder="Ex.: Vacinado, castrado e vermifugado."
        editable={!salvando}
        style={estilos.descricao}
      />

      {/* FOTO */}
      <Campo
        rotulo="Link da foto"
        value={campos.foto}
        onChangeText={(texto) => onAlterar('foto', texto)}
        maxLength={1000}
        placeholder="https://exemplo.com/foto.jpg"
        autoCapitalize="none"
        editable={!salvando}
      />

      {/* STATUS */}
      <Campo
        rotulo="Status de adoção *"
        value={campos.status}
        onChangeText={(texto) => onAlterar('status', texto)}
        maxLength={20}
        placeholder="disponivel, em_processo ou adotado"
        editable={!salvando}
      />

      <Text style={estilos.ajuda}>
        * Campos obrigatórios. Preencha as informações
        corretamente para facilitar a adoção responsável.
      </Text>

      <Botao
        titulo={tituloBotao}
        onPress={onSalvar}
        carregando={salvando}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  formulario: {
    gap: 12,
  },

  descricao: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  ajuda: {
    color: cores.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
