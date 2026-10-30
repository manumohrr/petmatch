// Componentes visuais reutilizam Props; não escondem regras da aplicação.
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const cores = {
  fundo: '#F4F6F2', papel: '#FFFFFF', texto: '#152B24', muted: '#5C6C63',
  verde: '#245C46', borda: '#DCE4DA', vermelho: '#AA352D',
};

export function Pagina({ children, incluirTopo = false }) {
  return (
    <SafeAreaView style={ui.tela} edges={incluirTopo ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={ui.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={ui.conteudo} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Painel({ children, style = undefined }) {
  return <View style={[ui.painel, style]}>{children}</View>;
}

export function Botao({ titulo, onPress, disabled = false, variante = 'primario', carregando = false }) {
  const bloqueado = disabled || carregando;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado} onPress={onPress}
      style={function estiloBotao({ pressed }) {
        return [ui.botao, variante === 'secundario' && ui.secundario, variante === 'perigo' && ui.perigo,
          (pressed || bloqueado) && { opacity: 0.55 }];
      }}>
      {carregando && <ActivityIndicator size="small" color={variante === 'primario' ? '#FFFFFF' : cores.verde} />}
      <Text style={[ui.textoBotao, variante === 'secundario' && { color: cores.verde }, variante === 'perigo' && { color: cores.vermelho }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({ rotulo, style = undefined, ...propriedades }) {
  return <View style={ui.campo}>
    <Text style={ui.rotulo}>{rotulo}</Text>
    <TextInput accessibilityLabel={rotulo} placeholderTextColor="#7B877F" style={[ui.input, style]} {...propriedades} />
  </View>;
}

export function Aviso({ mensagem, tipo = 'erro' }) {
  if (!mensagem) { return null; }
  return <View style={[ui.aviso, tipo === 'sucesso' && { backgroundColor: '#E9F3E8' }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ color: tipo === 'sucesso' ? cores.verde : cores.vermelho, lineHeight: 22 }}>{mensagem}</Text>
  </View>;
}

export function Carregamento({ mensagem = 'Carregando…' }) {
  return <View style={ui.carregamento}><ActivityIndicator color={cores.verde} size="large" /><Text style={estilos.texto}>{mensagem}</Text></View>;
}

export function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const estilos = StyleSheet.create({
  titulo: { color: cores.texto, fontSize: 28, fontWeight: '700', lineHeight: 36 },
  subtitulo: { color: cores.muted, fontSize: 16, lineHeight: 25 },
  texto: { color: cores.texto, fontSize: 15, lineHeight: 24 },
  linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  separador: { height: 1, backgroundColor: cores.borda, marginVertical: 12 },
  etiqueta: { color: cores.verde, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
});

const ui = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: 24, paddingBottom: 40, gap: 20, flexGrow: 1 },
  painel: { backgroundColor: cores.papel, borderWidth: 1, borderColor: cores.borda, borderRadius: 20, padding: 24, gap: 16 },
  botao: { minHeight: 48, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, backgroundColor: cores.verde, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  secundario: { backgroundColor: '#EDF2EB', borderWidth: 1, borderColor: cores.borda },
  perigo: { backgroundColor: '#FCEEEB', borderWidth: 1, borderColor: '#EBD3CC' },
  textoBotao: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  campo: { gap: 8 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  input: { color: cores.texto, backgroundColor: '#FAFCF9', borderWidth: 1, borderColor: cores.borda, borderRadius: 12, padding: 14, minHeight: 48, fontSize: 16 },
  aviso: { padding: 14, backgroundColor: '#FCEEEB', borderRadius: 12 },
  carregamento: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: cores.fundo },
});
