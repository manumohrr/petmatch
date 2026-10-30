// Consolida os fontes reais em um único material, mantendo a ordem pedida:
// estrutura, comandos e conteúdo integral de cada arquivo de texto.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = fileURLToPath(new URL('../', import.meta.url));
const nomeSaida = 'ENTREGA_COMPLETA.md';

// Nenhum diretório gerado, de ferramentas ou de credenciais entra na entrega.
const pastasIgnoradas = new Set([
  'node_modules', '.git', '.expo', 'dist', 'web-build', '.claude', '.codex',
  '.agents', '.aws', '.ssh', '.azure', 'credentials', 'secrets',
  '.npm-cache', '.expo-home', '.mysql-validation', '.cache', '.caches',
  '.parcel-cache', '.turbo', '.next', '.kotlin', 'temp', 'tmp', 'cache',
  'caches', 'test-results', 'playwright-report', 'coverage', 'android', 'ios',
]);

const extensoesTexto = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.sql', '.http', '.txt',
  '.html', '.css', '.yaml', '.yml', '.xml', '.toml', '.ps1', '.sh',
]);

const extensoesImagem = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.svg']);

function deveIgnorarArquivo(nome) {
  const minusculo = nome.toLowerCase();
  if (minusculo === nomeSaida.toLowerCase()) return true;
  // Somente o exemplo público pode ser lido. .env e suas variantes são locais.
  if (minusculo === '.env.example') return false;
  if (minusculo === '.env' || minusculo.startsWith('.env.')) return true;
  if (minusculo.startsWith('.npmrc') || minusculo.startsWith('.netrc')) return true;
  if (/^(?:credentials?|secrets?|tokens?)(?:\.|$)/i.test(nome)) return true;
  if (/^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/i.test(nome)) return true;
  if (minusculo === '.ds_store' || minusculo === 'thumbs.db') return true;
  if (/\.(?:log|pem|key|p8|p12|pfx|jks|mobileprovision|tsbuildinfo|zip|gz|7z|tar)$/i.test(nome)) return true;
  return false;
}

function ehArquivoTexto(nome) {
  return nome === '.gitignore' || nome === '.env.example' || nome === 'LICENSE'
    || extensoesTexto.has(path.extname(nome).toLowerCase());
}

function compararEntradas(primeira, segunda) {
  if (primeira.tipo !== segunda.tipo) return primeira.tipo === 'pasta' ? -1 : 1;
  return primeira.nome.localeCompare(segunda.nome, 'pt-BR', { numeric: true });
}

async function lerEstrutura(pasta, relativo = '') {
  const entradas = await readdir(pasta, { withFileTypes: true });
  const estrutura = [];

  for (const entrada of entradas) {
    const caminhoRelativo = relativo ? relativo + '/' + entrada.name : entrada.name;
    const caminhoAbsoluto = path.join(pasta, entrada.name);

    if (entrada.isDirectory()) {
      if (pastasIgnoradas.has(entrada.name.toLowerCase())) continue;
      const filhos = await lerEstrutura(caminhoAbsoluto, caminhoRelativo);
      if (filhos.length > 0) estrutura.push({ nome: entrada.name, relativo: caminhoRelativo, tipo: 'pasta', filhos });
      continue;
    }

    // Links simbólicos não são seguidos: a leitura permanece dentro do projeto.
    if (!entrada.isFile() || deveIgnorarArquivo(entrada.name)) continue;
    const texto = ehArquivoTexto(entrada.name);
    const imagem = caminhoRelativo.startsWith('assets/') && extensoesImagem.has(path.extname(entrada.name).toLowerCase());
    if (texto || imagem) estrutura.push({ nome: entrada.name, relativo: caminhoRelativo, tipo: 'arquivo', texto });
  }

  return estrutura.sort(compararEntradas);
}

function desenharArvore(estrutura, prefixo = '') {
  const linhas = [];

  for (let indice = 0; indice < estrutura.length; indice += 1) {
    const entrada = estrutura[indice];
    const ultima = indice === estrutura.length - 1;
    linhas.push(prefixo + (ultima ? '└── ' : '├── ') + entrada.nome + (entrada.tipo === 'pasta' ? '/' : ''));

    if (entrada.tipo === 'pasta') {
      linhas.push(...desenharArvore(entrada.filhos, prefixo + (ultima ? '    ' : '│   ')));
    }
  }

  return linhas;
}

function listarArquivos(estrutura) {
  const arquivos = [];
  for (const entrada of estrutura) {
    if (entrada.tipo === 'pasta') arquivos.push(...listarArquivos(entrada.filhos));
    else arquivos.push(entrada);
  }
  return arquivos;
}

function linguagemArquivo(nome) {
  if (nome === '.env.example') return 'dotenv';
  const linguagens = {
    '.js': 'js', '.jsx': 'jsx', '.mjs': 'js', '.cjs': 'js', '.json': 'json',
    '.md': 'markdown', '.sql': 'sql', '.http': 'http', '.html': 'html',
    '.css': 'css', '.yaml': 'yaml', '.yml': 'yaml', '.xml': 'xml',
    '.toml': 'toml', '.ps1': 'powershell', '.sh': 'bash',
  };
  return linguagens[path.extname(nome).toLowerCase()] || 'text';
}

function cercarCodigo(conteudo, linguagem) {
  // O README e este script também contêm fences. O delimitador externo deve ser
  // maior que qualquer sequência interna para preservar o Markdown completo.
  let tamanho = 3;
  const sequencias = conteudo.match(/`+/g) || [];
  for (const sequencia of sequencias) tamanho = Math.max(tamanho, sequencia.length + 1);
  const cerca = '`'.repeat(tamanho);
  return cerca + linguagem + '\n' + conteudo + (conteudo.endsWith('\n') ? '' : '\n') + cerca + '\n';
}

function comandosDaEntrega() {
  return [
    '## 2. Comandos de criação, instalação e execução',
    '',
    'Para criar um projeto novo durante a construção em aula:',
    '',
    cercarCodigo([
      'npx create-expo-app@latest loja-jwt --template blank',
      'cd loja-jwt',
      'npm install @react-navigation/native',
      'npm install @react-navigation/native-stack',
      'npx expo install react-native-screens react-native-safe-area-context',
      'npx expo install react-dom react-native-web @expo/metro-runtime',
      'npx expo install @react-native-async-storage/async-storage',
      'npm install express mysql2 cors jsonwebtoken bcryptjs dotenv',
    ].join('\n'), 'bash'),
    'Para executar os arquivos já entregues, entre na pasta e instale as versões do lock:',
    '',
    cercarCodigo('cd loja-jwt\nnpm ci', 'bash'),
    'Execute `database/loja_jwt.sql` no MySQL Workbench. No PowerShell, copie o modelo local:',
    '',
    cercarCodigo('Copy-Item -LiteralPath backend/.env.example -Destination backend/.env', 'powershell'),
    'Preencha o arquivo local com suas configurações e um segredo JWT próprio. Nenhum `.env` acompanha esta entrega.',
    '',
    'O SQL insere duas contas demonstrativas: `usuario@loja.com` / `Usuario@123` (nível `usuario`) e `admin@loja.com` / `Admin@123` (nível `admin`). São senhas públicas para aula; no banco, somente hashes bcrypt com custo 10. Ao reimportar, `INSERT IGNORE` preserva contas existentes, inclusive suas senhas e níveis. As credenciais acima valem para as contas criadas pelo SQL.',
    '',
    'Opcionalmente, configure `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env` para criar um administrador próprio com outro e-mail. O script não altera a senha nem o nível de uma conta existente:',
    '',
    cercarCodigo('node backend/scripts/criarAdmin.js', 'bash'),
    'No primeiro terminal, inicie a API:',
    '',
    cercarCodigo('node backend/server.js', 'bash'),
    'Em outro terminal na mesma raiz, inicie o Expo e pressione `w` para web:',
    '',
    cercarCodigo('npx expo start', 'bash'),
    'Verificações disponíveis depois da instalação:',
    '',
    cercarCodigo([
      'npm test',
      'npm run lint',
      'npm run typecheck',
      'npx expo install --check',
      'npm run export:web',
      'npm run test:web',
      'npm run test:mysql',
    ].join('\n'), 'bash'),
    'Os detalhes de ambiente, dispositivos, testes e conceitos estão no README reproduzido integralmente adiante.',
    '',
  ].join('\n');
}

async function gerarEntrega() {
  const estrutura = await lerEstrutura(pastaProjeto);
  const arquivos = listarArquivos(estrutura);
  const partes = [
    '# LOJA JWT — entrega completa',
    '',
    '## 1. Estrutura completa de pastas e arquivos',
    '',
    cercarCodigo('loja-jwt/\n' + desenharArvore(estrutura).join('\n'), 'text'),
    'A árvore lista os fontes e os assets originais. Imagens são entregues nos arquivos de `assets/` e não são convertidas em texto neste documento. Dependências instaladas, caches, resultados gerados e credenciais locais ficam fora da consolidação.',
    '',
    comandosDaEntrega(),
    '## 3. Conteúdo integral dos arquivos de texto',
    '',
  ];
  let quantidadeTexto = 0;

  for (const arquivo of arquivos) {
    if (!arquivo.texto) continue;
    const conteudo = await readFile(path.join(pastaProjeto, arquivo.relativo), 'utf8');
    if (conteudo.includes('\u0000')) throw new Error('Arquivo classificado como texto contém bytes nulos: ' + arquivo.relativo);
    partes.push('### loja-jwt/' + arquivo.relativo, '', cercarCodigo(conteudo, linguagemArquivo(arquivo.nome)), '');
    quantidadeTexto += 1;
  }

  // A saída é gravada somente após todas as leituras concluírem com sucesso.
  await writeFile(path.join(pastaProjeto, nomeSaida), partes.join('\n'), 'utf8');
  console.log(nomeSaida + ' gerado com ' + quantidadeTexto + ' arquivos de texto completos.');
}

gerarEntrega().catch(function informarErro(erro) {
  console.error('Não foi possível gerar a entrega: ' + erro.message);
  process.exitCode = 1;
});
