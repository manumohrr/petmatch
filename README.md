# LOJA JWT

Projeto didático para o 3º ano do Ensino Médio Técnico: uma loja simples usada para estudar **cadastro, login, hash de senha, JWT, autenticação e autorização**. O usuário consulta produtos; o administrador também cadastra, edita, exclui e gerencia níveis de usuários.

O projeto reúne aplicativo, API e SQL na pasta `loja-jwt`. Os produtos são apresentados sem imagens. Pagamentos, carrinho, frete e checkout ficam fora do escopo da atividade.

## 1. Estrutura completa

```text
loja-jwt/
├── App.js
├── index.js
├── app.json
├── package.json
├── package-lock.json
├── eslint.config.js
├── jsconfig.json
├── playwright.config.js
├── .gitignore
├── README.md
├── VALIDACAO.md
├── ENTREGA_COMPLETA.md
├── AGENTS.md
├── LICENSE
├── assets/
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── components/
│   ├── FormularioProduto.js
│   └── ui.js
├── screens/
│   ├── Login.js
│   ├── CadastroUsuario.js
│   ├── Home.js
│   ├── Produtos.js
│   ├── DetalhesProduto.js
│   ├── CadastrarProduto.js
│   ├── EditarProduto.js
│   └── Usuarios.js
├── services/
│   └── api.js
├── scripts/
│   ├── gerar-entrega.js
│   ├── testar-web.js
│   └── testar-mysql.js
├── tests/
│   └── app.spec.js
├── backend/
│   ├── server.js
│   ├── app.js
│   ├── .env.example
│   ├── config/
│   │   └── ambiente.js
│   ├── database/
│   │   └── conexao.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── produtosController.js
│   │   └── usuariosController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── produtosRoutes.js
│   │   └── usuariosRoutes.js
│   ├── middlewares/
│   │   ├── autenticarToken.js
│   │   └── somenteAdmin.js
│   ├── scripts/
│   │   └── criarAdmin.js
│   ├── utils/
│   │   └── validacoes.js
│   └── tests/
│       ├── api.test.js
│       └── mysql.integration.test.js
└── database/
    └── loja_jwt.sql
```

`backend/.env` será criado **localmente por quem configurar o projeto**. Ele não acompanha o material. `node_modules/`, `.expo/` e `dist/` são pastas geradas pelas ferramentas. `ENTREGA_COMPLETA.md` é a consolidação gerada com estrutura, comandos e conteúdo integral dos fontes; o próprio arquivo é excluído das entradas do gerador.

Os ícones de `assets/` pertencem ao aplicativo criado pelo Expo; nenhum produto depende de imagem.

## 2. Criação e instalação

### Criar um projeto novo para acompanhar a construção em aula

Execute na pasta que receberá `loja-jwt`:

```bash
npx create-expo-app@latest loja-jwt --template blank
cd loja-jwt
```

O comando oficial foi executado para este projeto em **25/10/2026**. Antes da implementação, o `package.json` gerado indicou:

| Componente | Versão do projeto criado |
| --- | --- |
| Expo | `~58.0.19` |
| React | `19.3.0` |
| React Native | `0.88.0` |
| React Navigation Native | `^7.5.1` |
| React Navigation Native Stack | `^7.21.0` |
| Node usado na preparação | `22.20.0` |
| npm usado na preparação | `10.9.3` |

As versões de React e React Native do template foram preservadas. O SDK 58 exige Node a partir de `22.13.x`; utilize uma versão compatível. A criação e a relação entre versões estão documentadas em [create-expo-app](https://docs.expo.dev/more/create-expo/) e na [referência do SDK 58](https://docs.expo.dev/versions/v58.0.0/).

Instale a navegação estável com Native Stack:

```bash
npm install @react-navigation/native
npm install @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

O procedimento segue a [instalação oficial do React Navigation](https://reactnavigation.org/docs/getting-started/). Neste projeto a navegação começa em `App.js`, usando JavaScript e Native Stack.

Instale o suporte web e o armazenamento do token:

```bash
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo install @react-native-async-storage/async-storage
```

Instale as dependências da API na **mesma raiz**:

```bash
npm install express mysql2 cors jsonwebtoken bcryptjs dotenv
```

As dependências nativas são resolvidas por `expo install`, que considera o SDK do projeto. Não é necessário instalar um `expo-cli` global.

### Executar o projeto já entregue

Se a pasta já contém os arquivos deste material, entre nela e instale as versões registradas no arquivo de lock:

```bash
cd loja-jwt
npm ci
```

Não execute `create-expo-app` dentro do projeto pronto. O `package-lock.json` permite que a turma instale o mesmo conjunto de dependências.

O `package.json` da raiz contém `"type": "module"`. O Node interpreta os arquivos do backend como ES Modules: os imports usam `import`/`export` e caminhos locais terminam em `.js`. O backend compartilha as dependências da raiz.

## 3. Objetivo e conteúdos

Os alunos já conhecem componentes, Props, State, efeitos, React Navigation, `fetch`, `async/await`, API REST e CRUD com Express/MySQL. A nova pergunta é: **quem pode executar cada operação?**

| Conceito novo | Para que serve | Onde observar |
| --- | --- | --- |
| Cadastro | Criar uma conta comum | `CadastroUsuario.js` e `authController.js` |
| Hash com bcrypt | Proteger a senha armazenada | Cadastro e script `criarAdmin.js` |
| Login | Conferir as credenciais | `Login.js` e `authController.js` |
| JWT | Representar uma autenticação durante um período | Login e `autenticarToken.js` |
| Bearer Token | Transportar o token na requisição HTTP | `services/api.js` |
| Middleware | Verificar a requisição antes do controller | `backend/middlewares/` |
| Autenticação | Identificar quem está fazendo a requisição | `autenticarToken.js` |
| Autorização | Decidir o que a pessoa pode fazer | `somenteAdmin.js` |
| Sessão persistida | Reabrir o app sem repetir um login válido | `App.js` e AsyncStorage |
| Níveis de acesso | Separar consulta e administração | `usuario` e `admin` |

### Tecnologias

O front-end utiliza React Native, Expo Blank, JavaScript, Native Stack, `useState`, `useEffect`, `useFocusEffect`, `fetch`, `FlatList`, `TextInput`, `Pressable`, `StyleSheet` e AsyncStorage.

O backend utiliza Node.js, Express, `mysql2/promise`, CORS, `jsonwebtoken`, `bcryptjs`, `dotenv` e ES Modules. O banco é MySQL, administrado pelo MySQL Workbench.

A organização mantém visível o caminho estudado em aula:

```text
screen → fetch → route → middleware → controller → MySQL
```

`components/ui.js` reúne pequenos elementos visuais reutilizados. `components/FormularioProduto.js` compartilha os campos das telas de cadastro e edição. `services/api.js` reúne a URL e o envio do token. `backend/app.js` monta o Express; `server.js` abre a porta. Essa separação também permite verificar as rotas nos testes sem iniciar a API de uso normal.

## 4. Preparar o MySQL

1. Inicie o serviço MySQL no computador.
2. Abra o MySQL Workbench e conecte-se ao seu servidor local.
3. Abra o arquivo `database/loja_jwt.sql` em uma aba SQL.
4. Execute o arquivo completo.
5. Atualize a lista de schemas e confira `loja_jwt`, `usuarios` e `produtos`.

Verifique com:

```sql
USE loja_jwt;
SHOW TABLES;
SELECT id, nome, email, nivel, criado_em FROM usuarios;
SELECT id, nome, categoria, preco, estoque FROM produtos;
```

São fornecidos seis produtos: notebook, mouse, teclado, monitor, headset e webcam. O SQL também inclui `INSERT` de duas contas demonstrativas, uma de cada nível:

| Nível | E-mail | Senha de demonstração |
| --- | --- | --- |
| `usuario` | `usuario@loja.com` | `Usuario@123` |
| `admin` | `admin@loja.com` | `Admin@123` |

Depois de importar o SQL, configurar o `.env` e iniciar a API e o aplicativo, essas contas já podem fazer login. Não é necessário executar `criarAdmin.js` para usar o administrador demonstrativo. O cadastro pelo aplicativo continua disponível para criar outras contas comuns.

Essas senhas são públicas e servem somente à aula; não use as contas demonstrativas com dados reais. A coluna `senha` recebe apenas hashes bcrypt com custo `10`, previamente gerados com `bcryptjs`; o SQL não armazena as senhas em texto puro.

Os usuários são inseridos com `INSERT IGNORE`, sem informar IDs. Ao executar o SQL novamente, os e-mails existentes não são duplicados, e seus dados, senhas e níveis atuais são preservados. As credenciais da tabela acima funcionam somente para as contas que o SQL criou; se o e-mail já existia ou foi alterado depois, continuam valendo os dados anteriores.

### Tabelas e tipos

| Tabela | Colunas principais | Observação |
| --- | --- | --- |
| `usuarios` | `id`, `nome`, `email`, `senha`, `nivel`, `criado_em` | `senha` guarda somente o hash; `email` é `UNIQUE` |
| `produtos` | `id`, `nome`, `descricao`, `categoria`, `preco`, `estoque`, `criado_em` | `preco` é `DECIMAL(10,2)`; `estoque` é inteiro |

`nivel` aceita somente `usuario` ou `admin` e possui padrão `usuario`. O controller também fixa esse valor no cadastro público: a regra existe no servidor, além da restrição do banco.

### Consultas parametrizadas

Dados enviados pelo cliente não são concatenados ao texto SQL. O placeholder `?` recebe o valor separadamente:

```js
const [usuarios] = await pool.execute(
  'SELECT id, nome, email, senha, nivel FROM usuarios WHERE email = ?',
  [email]
);
```

O login precisa ler o hash para executar `bcrypt.compare`. Essa leitura interna não autoriza devolver o hash ao cliente. A listagem administrativa seleciona explicitamente `id`, `nome`, `email`, `nivel` e `criado_em`.

O pool de conexões está em `backend/database/conexao.js`. Ele permite ao MySQL2 gerenciar conexões para várias requisições. Veja [MySQL2: Promises e placeholders](https://sidorares.github.io/node-mysql2/docs).

## 5. Configurar as variáveis de ambiente

Copie o modelo para um arquivo local. No PowerShell, dentro de `loja-jwt`:

```powershell
Copy-Item -LiteralPath backend/.env.example -Destination backend/.env
```

Em um terminal Linux/macOS, a cópia equivalente é:

```bash
cp backend/.env.example backend/.env
```

Abra `backend/.env` no editor e preencha:

| Variável | Significado |
| --- | --- |
| `JWT_SECRET` | Segredo forte que a API usa para assinar e verificar os tokens |
| `PORT` | Porta HTTP opcional; padrão `3000` |
| `DB_HOST` | Endereço do servidor MySQL, normalmente `localhost` |
| `DB_PORT` | Porta MySQL opcional; padrão `3306` |
| `DB_USER` | Usuário do MySQL com acesso ao banco |
| `DB_PASSWORD` | Senha desse usuário do MySQL |
| `DB_NAME` | Nome do schema, `loja_jwt` |
| `ADMIN_NOME` | Nome de um administrador próprio, se usar o script opcional |
| `ADMIN_EMAIL` | E-mail dessa conta; o modelo usa `admin.professor@loja.com` |
| `ADMIN_SENHA` | Senha escolhida localmente para essa conta opcional |

Os valores do modelo são instruções de preenchimento, não credenciais prontas. `DB_PASSWORD` pode ficar vazio somente quando a configuração local do seu MySQL realmente usa senha vazia.

Para gerar um segredo aleatório no seu computador, execute:

```bash
node --input-type=module -e "import { randomBytes } from 'node:crypto'; process.stdout.write(randomBytes(48).toString('hex'));"
```

Copie o resultado para `JWT_SECRET`; a API exige no mínimo 32 caracteres. Se for criar um administrador próprio, escolha uma senha para `ADMIN_SENHA`, com pelo menos oito caracteres e até 72 bytes em UTF-8. As variáveis `ADMIN_*` são usadas somente pelo script opcional, sem alterar as contas demonstrativas do SQL. Não publique o segredo JWT nem suas credenciais próprias ou os coloque no front-end. O loader `backend/config/ambiente.js` lê `backend/.env` com `dotenv`.

`backend/.env` está no `.gitignore`. O arquivo versionado é somente `backend/.env.example`. As senhas do banco e do administrador próprio permanecem na máquina que você configurar.

## 6. Criar um administrador próprio (opcional)

O administrador demonstrativo `admin@loja.com` já é criado pelo SQL. Para criar outra conta administrativa, configure `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no `.env`, usando um e-mail próprio ainda não cadastrado, e rode na raiz:

```bash
node backend/scripts/criarAdmin.js
```

Ou use o atalho:

```bash
npm run criar-admin
```

O fluxo é:

```text
backend/.env
  ↓ ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA
validar os dados
  ↓
bcrypt.hash(senha, 10)
  ↓
INSERT em usuarios com nivel = admin
  ↓
Administrador criado com sucesso
```

Se a conta já existir, o script informa isso, não duplica o registro e não altera sua senha nem seu nível. Se a conta existente já for administradora, a mensagem será `Administrador já cadastrado`. Escolher `admin@loja.com` no `.env` não redefine a senha demonstrativa. O script não é um mecanismo público de promoção de usuários. Para contas existentes, um administrador autenticado usa a tela de gerenciamento de usuários.

Tanto os `INSERT` demonstrativos do SQL quanto o script gravam somente hashes bcrypt. Após criar uma conta própria com o script, entre no aplicativo usando o e-mail e a senha que você escolheu no `.env`.

## 7. Executar a API e o Expo

Abra dois terminais na pasta `loja-jwt`.

**Terminal 1 — API:**

```bash
node backend/server.js
```

Ou:

```bash
npm run api
```

Com a configuração e o banco disponíveis, a mensagem esperada é:

```text
API executando em http://localhost:3000
```

Abra `http://localhost:3000` no navegador para conferir a resposta pública de identificação da API. Esse endereço não é a tela do aplicativo. As consultas de produtos continuam exigindo token.

Para reiniciar a API quando alterar arquivos do backend:

```bash
npm run api:dev
```

**Terminal 2 — aplicativo:**

```bash
npx expo start
```

Pressione `w` para abrir a versão web. Também é possível iniciar diretamente:

```bash
npm run web
```

### Android e iOS

O código usa componentes e navegação compatíveis com as plataformas nativas. O Expo Go instalado precisa reconhecer o SDK deste projeto. Se aparecer incompatibilidade com SDK 58, utilize um Expo Go compatível, quando disponível para seu dispositivo, ou prepare uma development build. Mantenha as versões do projeto geradas pelo template.

Uma development build é uma versão própria do aplicativo com ferramentas de desenvolvimento. O caminho local, com as ferramentas nativas já instaladas, é:

```bash
npx expo install expo-dev-client
npx expo run:android
```

Para compilar iOS localmente, é necessário macOS com Xcode:

```bash
npx expo run:ios
```

Esses comandos são alternativas para preparar o ambiente nativo, não requisitos para estudar pela versão web. Consulte o [guia oficial de development builds](https://docs.expo.dev/develop/development-builds/introduction/) para a configuração da sua plataforma.

## 8. localhost, IP local e conexão pelo celular

A URL está centralizada em `services/api.js`:

```js
export const API = 'http://localhost:3000';
```

| Onde o app está executando | Endereço da API |
| --- | --- |
| Expo Web no mesmo computador da API | `http://localhost:3000` |
| Celular físico na mesma rede do computador | `http://IP-DO-COMPUTADOR:3000` |
| Emulador Android padrão do Android Studio | Geralmente `http://10.0.2.2:3000` |
| Simulador iOS no mesmo Mac da API | Geralmente `http://localhost:3000` |

No emulador Android, `10.0.2.2` é o alias para a interface de loopback do computador, conforme a [documentação de endereços de rede do Android Emulator](https://developer.android.com/studio/run/emulator-networking-address).

No celular, `localhost` aponta para o próprio celular. Descubra o IPv4 do computador com `ipconfig` no Windows e use o endereço da conexão ativa. Um exemplo **apenas ilustrativo** seria:

```js
export const API = 'http://192.168.0.20:3000';
```

Não copie esse IP sem verificar o seu. O computador e o celular precisam alcançar a mesma rede; redes escolares podem bloquear comunicação entre dispositivos. Se necessário, permita o Node e a porta 3000 no firewall da rede local.

O QR code do Expo conecta o celular ao servidor do aplicativo. A URL da API continua sendo a de `services/api.js`. O túnel do Expo para carregar o app não transforma automaticamente uma API local em uma API pública.

## 9. Cadastro: criar uma conta comum

**O que é:** criação de uma identidade no banco. **Para que serve:** permitir que cada pessoa faça login com suas credenciais. **Onde está:** `screens/CadastroUsuario.js`, rota pública `POST /auth/cadastro` e função do cadastro em `authController.js`.

A tela recebe nome, e-mail, senha e confirmação de senha. A confirmação serve à interface e não precisa ser armazenada ou enviada à API. A tela verifica campos vazios, diferença entre as senhas e senha com menos de oito caracteres. O backend repete as validações porque requisições podem ser feitas fora do aplicativo.

```text
CadastroUsuario
  ↓ nome, email, senha
POST /auth/cadastro
  ↓
authController
  ↓ validar e verificar e-mail duplicado
bcrypt.hash(senha, 10)
  ↓
INSERT usuarios com nivel = usuario
  ↓
201 Created
```

E-mail duplicado produz `409 Conflict`. O campo `UNIQUE` também protege o banco se duas requisições tentarem inserir o mesmo e-mail ao mesmo tempo.

A tela não oferece escolha de nível. Mesmo que alguém envie `"nivel": "admin"` no JSON, o controller ignora esse valor e grava `usuario`. A conta criada deve fazer login para receber um token.

## 10. Hash de senha com bcrypt

**O que é:** uma transformação de mão única usada para conferir senhas sem guardar o texto original no banco. **Para que serve:** evitar o armazenamento direto da senha. **Onde está:** cadastro, login e script de criação do administrador.

No cadastro, a operação principal é:

```js
const senhaHash = await bcrypt.hash(senha, 10);
```

Somente `senhaHash` é salvo na coluna `usuarios.senha`. O número `10` configura o custo do bcrypt. O salt é gerado pela biblioteca; duas contas que escolham a mesma senha podem ter hashes diferentes.

No login, a operação principal é:

```js
const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
```

`compare` responde se a senha informada corresponde ao hash. O processo não precisa recuperar a senha original. A senha existe temporariamente durante o envio e a comparação; o aplicativo não a grava no AsyncStorage e a API não a imprime nem a devolve nas respostas.

JWT não substitui bcrypt: **bcrypt protege a senha armazenada; JWT representa a autenticação nas próximas requisições**. A biblioteca possui um limite de 72 bytes de entrada; o backend rejeita senhas que ultrapassem esse limite para evitar truncamento silencioso. Caracteres acentuados podem ocupar mais de um byte. Veja a [documentação do bcryptjs](https://github.com/dcodeIO/bcrypt.js).

## 11. Login e JWT

**O que é login:** conferência de e-mail e senha. **Onde está:** `screens/Login.js`, função `realizarLogin`, e rota `POST /auth/login`.

```text
Login
  ↓ email + senha
POST /auth/login
  ↓
buscar usuário pelo e-mail
  ↓
bcrypt.compare()
  ↓ senha correta
jwt.sign()
  ↓
responder token + usuario
  ↓
AsyncStorage.setItem('token', token)
  ↓
App.js atualiza usuario
  ↓
Home
```

E-mail inexistente e senha incorreta recebem a mesma mensagem: `E-mail ou senha inválidos`. O aplicativo não precisa saber qual dos dois dados falhou.

Uma resposta de login possui este formato; o token abaixo é apenas uma indicação do campo:

```json
{
  "token": "TOKEN_RETORNADO_PELA_API",
  "usuario": {
    "id": 2,
    "nome": "Aluno Exemplo",
    "email": "aluno@example.com",
    "nivel": "usuario"
  }
}
```

### O que é JWT?

JWT é um formato de token. Aqui ele carrega informações mínimas sobre a autenticação e uma assinatura verificável pelo servidor. O login usa:

```js
const token = jwt.sign(
  {
    id: usuario.id,
    email: usuario.email,
    nivel: usuario.nivel,
  },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }
);
```

| Parte | Significado no projeto |
| --- | --- |
| Payload | Dados `id`, `email` e `nivel` usados para identificar a autenticação |
| Secret | Valor privado `JWT_SECRET`, conhecido somente pelo backend |
| `expiresIn: '2h'` | Token válido por até duas horas após a emissão |
| Assinatura | Permite verificar se o token foi emitido com o segredo esperado e se seu conteúdo foi alterado |

`jsonwebtoken` também inclui os campos de tempo necessários, como `iat` e `exp`. O servidor usa `jwt.verify` para conferir assinatura e validade. Somente decodificar o payload não autentica ninguém. As operações estão descritas na [documentação de jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).

Um JWT assinado **não é uma senha criptografada**. Seu payload pode ser lido por quem tiver o token. Por isso, ele nunca inclui senha, hash ou informações sensíveis. Quem obtém um Bearer Token pode tentar usá-lo até sua expiração.

O campo `nivel` do token registra o nível no momento do login. Para que promoções e rebaixamentos tenham efeito imediato, este projeto consulta o usuário atual no banco em cada requisição autenticada e usa o nível atual para autorizar a operação.

## 12. Authorization e Bearer Token

**O que é:** uma forma de enviar a credencial no cabeçalho HTTP. **Para que serve:** a API reconhecer a autenticação sem receber e-mail e senha a cada consulta. **Onde está:** `services/api.js`.

O formato é:

```http
Authorization: Bearer TOKEN_RETORNADO_NO_LOGIN
```

`Authorization` é o nome do header. `Bearer` identifica o esquema de autenticação. Depois de um espaço vem o token completo, sem aspas extras.

O helper `fetchAutenticado` lê o token no AsyncStorage e acrescenta o cabeçalho. Este exemplo completo mostra uma consulta feita fora de uma screen:

```js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API } from './services/api.js';

async function consultarProdutos() {
  const token = await AsyncStorage.getItem('token');
  const resposta = await fetch(API + '/produtos', {
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(dados.mensagem || 'Não foi possível consultar os produtos');
  }

  return dados;
}
```

Nas telas, o projeto usa `fetchAutenticado` para evitar repetir a busca do token. A função retorna o objeto `Response`; `lerResposta` lê o JSON e transforma respostas de erro em mensagens para a tela. `fetch` não lança erro automaticamente por receber `400`, `401` ou `403`: é necessário examinar o status ou `resposta.ok`.

## 13. Middlewares: autenticação e autorização

### autenticarToken

**O que é:** função Express executada antes do controller. **Para que serve:** bloquear requisições sem autenticação válida. **Onde está:** `backend/middlewares/autenticarToken.js`.

```text
fetchAutenticado()
  ↓
Authorization: Bearer TOKEN
  ↓
autenticarToken(req, res, next)
  ↓ conferir cabeçalho e esquema Bearer
jwt.verify(token, JWT_SECRET)
  ↓ conferir assinatura e expiração
consultar usuário atual no MySQL
  ↓
req.usuario
  ↓ next()
controller
```

O middleware lê `req.headers.authorization`. Se faltar token, se o formato estiver incorreto, se a assinatura não conferir ou se o token tiver expirado, responde `401`. O controller protegido não é executado.

`req.usuario` é uma propriedade definida pelo middleware no objeto da requisição. Ela disponibiliza a identidade autenticada para os próximos passos. O projeto também confere se a conta ainda existe e usa os dados atuais do banco para decidir permissões.

`req.body` contém os dados enviados no corpo JSON; `req.params.id` contém o trecho variável do caminho, como o `5` de `/produtos/5`. Esses dados precisam de validação antes das consultas.

### somenteAdmin

**O que é:** middleware de autorização. **Para que serve:** permitir operações administrativas somente a quem possui nível `admin`. **Onde está:** `backend/middlewares/somenteAdmin.js`.

```text
POST /produtos
  ↓
autenticarToken
  ↓ token válido e usuário atual identificado
somenteAdmin
  ↓ req.usuario.nivel === 'admin'?
  ├── SIM → next() → controller → INSERT → 201
  └── NÃO → 403 Forbidden
```

A ordem importa: primeiro identificar, depois autorizar. Um usuário comum com token perfeitamente válido pode receber `403` porque não tem a permissão necessária.

### Diferença entre 401 e 403

| Status | Pergunta respondida | Exemplo |
| --- | --- | --- |
| `401 Unauthorized` | Existe autenticação válida? | `GET /produtos` sem token; token expirado ou alterado |
| `403 Forbidden` | A pessoa autenticada pode executar esta ação? | `POST /produtos` com token de usuário comum |

**Esconder um botão no aplicativo não protege uma rota.** O cliente pode ser alterado e a API pode ser chamada por outras ferramentas. A autorização precisa acontecer no backend. O nível recebido ou guardado no front-end serve à apresentação da interface; o servidor decide a permissão.

## 14. Rotas e matriz de permissões

| Método e caminho | Público | `usuario` | `admin` | Resposta de sucesso |
| --- | --- | --- | --- | --- |
| `POST /auth/cadastro` | Sim | Sim | Sim | `201` — conta comum criada |
| `POST /auth/login` | Sim | Sim | Sim | `200` — `{ token, usuario }` |
| `GET /auth/me` | Não | Sim | Sim | `200` — dados básicos do usuário |
| `GET /produtos` | Não | Sim | Sim | `200` — array de produtos |
| `GET /produtos/:id` | Não | Sim | Sim | `200` — objeto do produto |
| `POST /produtos` | Não | Não | Sim | `201` — `{ mensagem, produto }` |
| `PUT /produtos/:id` | Não | Não | Sim | `200` — `{ mensagem, produto }` |
| `DELETE /produtos/:id` | Não | Não | Sim | `200` — `{ mensagem }` |
| `GET /usuarios` | Não | Não | Sim | `200` — array de usuários sem hash |
| `PUT /usuarios/:id/nivel` | Não | Não | Sim | `200` — `{ mensagem, usuario }` |

Nas rotas públicas, as colunas `usuario` e `admin` significam que a rota não exige autenticação; fazer um cadastro público continua criando uma conta comum.

As rotas de produtos exigem `autenticarToken`. As alterações de produtos e todas as rotas de usuários acrescentam `somenteAdmin`.

### Permissões para verificar na prática

| Credencial | Requisição | Status esperado |
| --- | --- | --- |
| Sem token | `GET /produtos` | `401` |
| Usuário comum | `GET /produtos` | `200` |
| Usuário comum | `POST /produtos` | `403` |
| Administrador | `POST /produtos` com dados válidos | `201` |
| Usuário comum | `GET /usuarios` | `403` |
| Administrador | `GET /usuarios` | `200` |

## 15. Sessão, navegação e logout

### App.js como responsável pela sessão

`usuario` guarda os dados básicos da pessoa autenticada. `carregando` impede exibir o fluxo errado enquanto o aplicativo verifica o armazenamento. O token é o único dado de autenticação persistido no AsyncStorage.

```text
Aplicativo inicia
  ↓ useEffect
AsyncStorage.getItem('token')
  ↓
Existe token?
  ├── NÃO → Login / CadastroUsuario
  └── SIM → GET /auth/me com Authorization
               ├── 200 → carregar usuario → Home
               ├── 401 → remover token → Login
               └── falha de rede → informar e permitir tentar novamente
```

A rota `/auth/me` responde somente `id`, `nome`, `email` e `nivel`. O aplicativo não confia apenas na existência de um texto chamado `token`; ele consulta a API para verificar a sessão.

Falha de conexão e token inválido são situações diferentes: quando a API está temporariamente indisponível durante a restauração, o aplicativo preserva o token e oferece nova tentativa. Se a API retornar `401`, a sessão é encerrada e o aplicativo informa que é necessário entrar novamente.

### Navegação por estado e nível

| Estado | Telas disponíveis |
| --- | --- |
| Sem usuário autenticado | `Login`, `CadastroUsuario` |
| Usuário comum autenticado | `Home`, `Produtos`, `DetalhesProduto` |
| Administrador autenticado | Telas comuns, `CadastrarProduto`, `EditarProduto`, `Usuarios` |

O Native Stack é montado conforme o estado da sessão. O login atualiza `usuario` e exibe o fluxo autenticado. O logout limpa o estado e o fluxo volta para Login.

A Home mostra `Olá, NOME` e o nível atual. Para usuário comum, oferece **Ver produtos** e **Sair**. Para administrador, oferece também **Cadastrar produto** e **Gerenciar usuários**.

Ao voltar para Home, a consulta de `/auth/me` atualiza o nível usado pela interface. Se um administrador promover ou rebaixar outra pessoa, o backend aplica a alteração já na próxima requisição dela, usando o banco. Não é necessário esperar um novo token para fazer a autorização correta.

### Logout e expiração

O logout executa a remoção local do token e limpa `usuario`:

```js
await AsyncStorage.removeItem('token');
```

O botão voltar não deve reabrir telas autenticadas depois disso. O token expira após duas horas; uma resposta `401` também remove a sessão local e apresenta o aviso.

O logout deste projeto é local: ele **não revoga cópias de tokens já emitidos**. Uma cópia ainda pode ser aceita até expirar, desde que a conta exista e tenha a permissão atual. Não há refresh token, lista de revogação ou sessão armazenada em tabela.

### Limite didático do AsyncStorage

AsyncStorage persiste pares chave/valor e não fornece criptografia de dados. Aqui ele é usado para tornar visível o ciclo salvar → ler → enviar → remover token. Não é um cofre de credenciais. Essa característica está descrita na [documentação do AsyncStorage para SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/).

Em produção, use HTTPS e reavalie armazenamento seguro e estratégia de sessão conforme a plataforma; em dispositivos nativos, isso pode envolver armazenamento protegido pelo sistema operacional. A senha não deve ser persistida no aplicativo.

## 16. CRUD protegido de produtos

| Operação | Rota | Tela e comportamento |
| --- | --- | --- |
| CREATE | `POST /produtos` | `CadastrarProduto`: formulário administrativo |
| READ | `GET /produtos` | `Produtos`: listagem com `FlatList` |
| READ por ID | `GET /produtos/:id` | `DetalhesProduto`: recebe `route.params.id` |
| UPDATE | `PUT /produtos/:id` | `EditarProduto`: carrega e preenche o produto antes de salvar |
| DELETE | `DELETE /produtos/:id` | Ação Excluir na listagem, com confirmação |

Campos: nome, descrição, categoria, preço e estoque. A listagem mostra nome, categoria, preço e estoque; os detalhes também mostram a descrição. O formulário valida os dados antes do envio e o backend valida novamente. Nome é obrigatório e aceita até 120 caracteres; descrição e categoria são opcionais, com limites de 500 e 100 caracteres. Preço é obrigatório, não negativo, com até duas casas decimais e máximo de `99999999.99`. Estoque é obrigatório, inteiro entre `0` e `2147483647`.

A tela `EditarProduto` recebe o ID pela navegação e faz `GET` antes do `PUT`. A exclusão exige confirmação; depois do `DELETE`, a lista é atualizada. O retorno de telas de edição/cadastro também permite atualizar os dados da listagem.

Para usuário comum, os controles Editar e Excluir não aparecem. Para administrador, eles aparecem. Mesmo que uma pessoa comum construa uma requisição manual de alteração, a API responde `403`.

Exemplo completo de corpo para criação ou atualização:

```json
{
  "nome": "Teclado de laboratório",
  "descricao": "Teclado USB utilizado na atividade de CRUD protegido",
  "categoria": "Periféricos",
  "preco": 149.9,
  "estoque": 12
}
```

Os números JSON usam ponto decimal. Na tela, o valor é convertido antes do envio. IDs do caminho devem ser inteiros positivos; um ID válido que não exista produz `404`.

## 17. Gerenciamento de usuários

**O que é:** consulta de contas e alteração controlada de seus níveis. **Para que serve:** atribuir ou remover permissões administrativas. **Onde está:** `screens/Usuarios.js`, `usuariosRoutes.js` e `usuariosController.js`.

`GET /usuarios` exige os dois middlewares e retorna nome, e-mail, nível e identificadores básicos, sem a coluna de senha. Na tela:

- Uma conta `usuario` oferece **Tornar administrador**.
- Uma conta `admin` oferece **Tornar usuário**.
- A própria conta autenticada não oferece mudança de nível.

Para promover, o administrador envia `PUT /usuarios/:id/nivel` com:

```json
{
  "nivel": "admin"
}
```

Para rebaixar:

```json
{
  "nivel": "usuario"
}
```

O servidor aceita somente esses dois valores. Se `Number(req.params.id)` corresponder a `Number(req.usuario.id)`, responde `400` e `Não é possível alterar o próprio nível`. A regra existe no servidor mesmo que alguém ignore o bloqueio visual.

Após uma alteração, a lista é recarregada. A autorização seguinte da conta afetada considera seu nível atual no MySQL.

## 18. Status HTTP e mensagens

| Status | Significado nesta API | Exemplo |
| --- | --- | --- |
| `200 OK` | Consulta ou alteração concluída | Login, listar produtos, editar produto |
| `201 Created` | Registro criado | Cadastro de conta ou produto |
| `400 Bad Request` | Dados inválidos | Campos vazios, nível desconhecido, alterar o próprio nível |
| `401 Unauthorized` | Autenticação ausente ou inválida | Senha incorreta no login, token ausente ou expirado |
| `403 Forbidden` | Pessoa autenticada sem a permissão exigida | Usuário comum tentando cadastrar produto |
| `404 Not Found` | Registro ou rota não encontrado | Produto excluído ou ID inexistente |
| `409 Conflict` | E-mail já cadastrado | Repetir cadastro com o mesmo e-mail |
| `500 Internal Server Error` | Falha interna inesperada | Erro ao executar uma consulta |

As mensagens de erro seguem o formato `{ "mensagem": "Descrição do problema" }`. Senhas, hashes, segredos e detalhes internos do banco não devem ser expostos ao cliente.

## 19. Testar com Postman e curl

### Preparar o Postman

Crie um ambiente local com `base_url = http://localhost:3000`, `email_usuario`, `senha_usuario`, `email_admin`, `senha_admin`, `token_usuario` e `token_admin`. Preencha as senhas somente no ambiente local da ferramenta, sem publicar ou exportar credenciais.

Nas requisições com JSON, escolha **Body → raw → JSON**. Nos exemplos a seguir, `{{senha_usuario}}` é uma variável a preencher, não uma senha fornecida pelo material.

**1. Criar conta comum — `POST {{base_url}}/auth/cadastro`:**

```json
{
  "nome": "Aluno Exemplo",
  "email": "{{email_usuario}}",
  "senha": "{{senha_usuario}}",
  "nivel": "admin"
}
```

O campo adicional `nivel` permite demonstrar a tentativa de promoção indevida: o cadastro deve continuar com `nivel = usuario`. Na tela normal, esse campo não é enviado.

**2. Fazer login comum — `POST {{base_url}}/auth/login`:**

```json
{
  "email": "{{email_usuario}}",
  "senha": "{{senha_usuario}}"
}
```

Copie o campo `token` da resposta para `token_usuario`. Para o login administrativo, utilize as variáveis `email_admin` e `senha_admin`, configuradas com a conta demonstrativa do SQL ou com a conta própria criada pelo script, e salve o resultado em `token_admin`.

**3. Conferir a sessão — `GET {{base_url}}/auth/me`:** escolha **Authorization → Bearer Token** e informe `{{token_usuario}}`. A ferramenta monta `Authorization: Bearer TOKEN`.

**4. Consultar produtos — `GET {{base_url}}/produtos`:** use `token_usuario`; espere `200` e um array.

**5. Tentar cadastrar produto com usuário comum — `POST {{base_url}}/produtos`:** envie o corpo de produto da seção anterior com `token_usuario`; espere `403`.

**6. Repetir com `token_admin`:** espere `201`. Anote o ID retornado para consultar, editar e excluir o produto de teste.

**7. Promover uma segunda conta — `PUT {{base_url}}/usuarios/ID-DA-SEGUNDA-CONTA/nivel`:** substitua o ID no caminho, use `token_admin` e envie `{ "nivel": "admin" }`. Não use o ID do próprio administrador.

### Requisições simples com curl

No Windows, use `curl.exe` para chamar o programa curl, evitando o alias existente em algumas versões do PowerShell:

```powershell
curl.exe -i http://localhost:3000/produtos
```

O resultado esperado é `401`. Para consultar autenticado, substitua o marcador pelo token completo copiado do login:

```powershell
curl.exe -i http://localhost:3000/produtos -H "Authorization: Bearer TOKEN_DO_USUARIO"
curl.exe -i http://localhost:3000/auth/me -H "Authorization: Bearer TOKEN_DO_USUARIO"
curl.exe -i http://localhost:3000/usuarios -H "Authorization: Bearer TOKEN_DO_USUARIO"
curl.exe -i http://localhost:3000/usuarios -H "Authorization: Bearer TOKEN_DO_ADMIN"
```

Os status esperados, na ordem, são `200`, `200`, `403` e `200`, desde que os marcadores tenham sido substituídos por tokens válidos. Em Linux/macOS, utilize `curl` no lugar de `curl.exe`.

Os exemplos não incluem senhas reais. Evite compartilhar tokens em capturas de tela, gravações de aula ou coleções exportadas.

## 20. Testes recomendados

Execute com um banco local preparado e, para os testes administrativos, com a conta demonstrativa do SQL ou uma conta própria criada pelo script. Use um e-mail novo no cenário de cadastro. Registre os resultados observados; esta lista descreve o comportamento esperado.

| Nº | Ação | Resultado esperado |
| --- | --- | --- |
| 1 | Cadastrar usuário com dados válidos | `201`; conta com nível `usuario`; sem hash na resposta |
| 2 | Repetir o mesmo e-mail | `409`; nenhuma conta duplicada |
| 3 | Fazer login com senha errada | `401`; `E-mail ou senha inválidos` |
| 4 | Fazer login correto | `200`; token salvo; Home mostra nome e nível |
| 5 | Abrir produtos e detalhes como usuário | `200`; seis produtos iniciais e detalhes acessíveis |
| 6 | Enviar `POST /produtos` manualmente com token comum | A requisição chega ao controle administrativo |
| 7 | Conferir a resposta do teste anterior | `403`; produto não criado |
| 8 | Fazer login com a conta administrativa | Home oferece cadastro de produto e usuários |
| 9 | Cadastrar um produto válido | `201`; produto aparece na listagem |
| 10 | Editar esse produto | `200`; novos dados aparecem nos detalhes |
| 11 | Excluir esse produto e confirmar | `200`; lista atualizada; consulta posterior ao ID retorna `404` |
| 12 | Listar usuários como admin | `200`; nome, e-mail e nível disponíveis, sem senha/hash |
| 13 | Promover outra conta para admin | `200`; nível alterado; autorização seguinte usa o nível atual |
| 14 | Fazer logout | Token removido; Login exibido; voltar não reabre Home |
| 15 | Chamar `GET /produtos` sem Authorization | Nenhuma credencial é enviada |
| 16 | Conferir a resposta do teste anterior | `401`; dados de produtos não são devolvidos |

### Verificações complementares de segurança e sessão

- Envie `nivel: admin` no cadastro público e confirme que a conta criada é `usuario`.
- Tente alterar o próprio nível e confirme `400`.
- Envie um nível diferente de `usuario`/`admin` e confirme `400`.
- Tente IDs inválidos, preço negativo e estoque fracionado e confirme `400`.
- Reabra o aplicativo com token válido: `/auth/me` deve manter a sessão.
- Use um token alterado ou expirado: a API deve responder `401`; o app deve remover a sessão e avisar.
- Interrompa a API antes de reabrir o aplicativo: a falha de rede deve permitir nova tentativa sem apagar um token que ainda pode ser válido.
- Rebaixe outra conta administrativa: o token antigo dela não deve permitir a próxima operação administrativa.
- Confira no MySQL que `usuarios.senha` contém hash bcrypt, nunca o texto digitado. Não projete senhas ou hashes em capturas compartilhadas.

### Navegação a conferir

```text
Login → CadastroUsuario → Login
Login correto → Home
Home → Produtos → DetalhesProduto
Admin → CadastrarProduto
Admin → Produtos → EditarProduto
Admin → Usuarios
Logout → Login
```

### Verificações por comando

```bash
npm test
npm run lint
npm run typecheck
npx expo install --check
npm run export:web
npm run test:web
npm run test:mysql
```

`npm test` executa os testes Node das rotas e regras de acesso em `backend/tests/api.test.js`, sem exigir MySQL ou `.env`. HTTP, Express, JWT e bcrypt são reais; somente o pool do MySQL é substituído durante esses testes. A suíte cobre assinatura e expiração, bcrypt, cadastro forçando nível comum, `401`/`403`, CRUD, dados de usuários sem hash, alteração do próprio nível e efeito imediato do rebaixamento. A integração MySQL é ignorada na execução padrão e ativada pelo comando opcional descrito a seguir. A suíte padrão não executa o SQL em um servidor MySQL nem substitui os testes manuais do aplicativo.

`npm run lint` analisa o JavaScript. `npm run typecheck` usa o verificador configurado em `jsconfig.json` para verificar o projeto JavaScript sem gerar arquivos; o projeto continua em `.js`, sem telas TypeScript.

`expo install --check` confere dependências em relação ao SDK. A exportação web verifica o empacotamento do aplicativo e gera `dist/`; ela não inicia o MySQL nem faz login por você. A execução real da API, a importação do SQL e a navegação em cada dispositivo devem ser conferidas no ambiente da turma.

### Navegador e MySQL real

`npm run test:web` executa o wrapper `scripts/testar-web.js`, que inicia ou reutiliza o Expo e chama os testes de `tests/app.spec.js` com Playwright. Ao terminar, encerra somente o servidor que ele próprio iniciou. A configuração está em `playwright.config.js`. No Windows, ela usa Microsoft Edge por padrão; tenha esse navegador instalado. As respostas da API são simuladas para exercitar a interface, navegação, sessão e permissões visuais. Essa simulação não comprova a conexão com o MySQL nem substitui os testes de autorização do backend. O canal pode ser escolhido pela variável `PLAYWRIGHT_CHANNEL`; fora do Windows, o padrão é Chromium, que pode ser instalado com `npx playwright install chromium`.

`npm run test:mysql` executa o teste opcional de integração por `scripts/testar-mysql.js`, com casos em `backend/tests/mysql.integration.test.js`. Ele exige o executável `mysqld` e prepara outra instância, com diretório de dados temporário e porta livres, para exercitar a API com MySQL real. O script não apaga nem reutiliza o banco de aula, arquivos de dados existentes, credenciais do `.env` ou o serviço MySQL já instalado.

No Windows, o wrapper procura a instalação padrão em `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe`. Se a instalação estiver em outro local, defina o caminho real antes de executar:

```powershell
$env:MYSQLD_PATH = 'CAMINHO-COMPLETO-PARA-mysqld.exe'
npm run test:mysql
```

Em outros sistemas, forneça `MYSQLD_PATH` com o executável correspondente. Os dados e logs dessa validação ficam em uma nova pasta dentro de `.mysql-validation`, ao lado de `loja-jwt`, para consulta. O teste encerra os processos temporários ao finalizar.

### Gerar a entrega integral

```bash
npm run entrega
```

O comando executa `scripts/gerar-entrega.js` e atualiza `ENTREGA_COMPLETA.md` na raiz. O documento começa pela árvore real, apresenta os comandos de criação e execução e reproduz cada arquivo de texto completo, com caminho `loja-jwt/`. `package-lock.json` também é incluído. As imagens permanecem nos arquivos originais em `assets/` e são listadas na árvore.

O gerador exclui o próprio resultado, `node_modules`, pastas de cache, relatórios de testes e credenciais locais. `backend/.env.example` é incluído como modelo público; arquivos `.env` e suas variantes locais não são lidos. Depois de alterar os fontes ou o README, execute novamente para atualizar a consolidação.

### Resultados da preparação desta entrega

Em 25/10/2026, passaram 14 testes da API, oito cenários no navegador e a integração isolada com MySQL real. Lint, análise do JavaScript, os 20 checks do Expo Doctor e os bundles web/Android/iOS também passaram. O relatório [VALIDACAO.md](VALIDACAO.md) explica o que foi exercitado, as simulações usadas, a ausência de teste em aparelho físico e os cinco avisos do `npm audit` na árvore de ferramentas do Expo. Nenhum downgrade foi aplicado.

## 21. Possíveis erros e como investigar

| Sintoma | Verificação e correção |
| --- | --- |
| Node abaixo da versão exigida | Atualize para uma versão que atenda ao SDK 58 e reinstale com `npm ci` |
| `Cannot find package` | Execute `npm ci` na raiz `loja-jwt` |
| Erro de import/export no Node | Confira `"type": "module"` no `package.json` e extensão `.js` nos imports locais |
| Variável de ambiente ausente ou modelo não preenchido | Crie `backend/.env` a partir do exemplo e preencha os valores |
| `ECONNREFUSED` ao conectar ao MySQL | Confira se o serviço MySQL está iniciado e se host/porta estão corretos |
| `Access denied for user` | Confira `DB_USER`, `DB_PASSWORD` e as permissões no MySQL |
| `Unknown database 'loja_jwt'` | Execute `database/loja_jwt.sql` na conexão correta do Workbench |
| Tabela não encontrada | Confirme se o arquivo SQL completo foi executado e se `DB_NAME` aponta para o schema certo |
| `EADDRINUSE` na porta 3000 | Outra API está usando a porta; encerre a instância antiga antes de iniciar esta |
| `Failed to fetch` ou `Network request failed` | Confira API iniciada, URL em `services/api.js`, IP local, Wi-Fi e firewall |
| Funciona na web, mas falha no celular | Troque `localhost` pelo IP alcançável do computador |
| Token ausente ou expirado, resposta `401` | Faça login e envie o token completo com `Bearer` e espaço |
| Token perdeu validade após mudar `JWT_SECRET` | Tokens assinados com o segredo anterior deixam de ser aceitos; faça novo login |
| Usuário recebe `403` ao cadastrar produto | A autenticação existe; confira se o nível atual no banco é `admin` |
| Cadastro recebe `409` | Esse e-mail já foi cadastrado; use a conta existente ou outro e-mail |
| Alteração do próprio nível recebe `400` | A regra é intencional; outro administrador gerencia essa conta |
| Campo de preço ou estoque recebe `400` | Confira número válido, preço não negativo e estoque inteiro |
| Expo Go informa SDK incompatível | Confira a compatibilidade do Expo Go instalado ou use development build |
| Web publicada por HTTPS não alcança API HTTP | Use API HTTPS para evitar bloqueio de conteúdo misto no navegador |

Quando alterar arquivos JavaScript e a tela parecer antiga, confirme o terminal correto do Expo. Se necessário, reinicie com `npx expo start --clear`. Esse comando limpa o cache do empacotador; não apaga o banco.

## 22. Ordem recomendada para explicar em aula

O professor pode manter a estrutura pronta e construir as partes gradualmente, testando cada etapa antes de avançar.

| Etapa | Conteúdo e arquivo principal | Demonstração sugerida |
| --- | --- | --- |
| 1 | Banco `usuarios`; `database/loja_jwt.sql` | Identificar `UNIQUE`, hash e nível padrão; revisar a tabela `produtos` |
| 2 | Cadastro e bcrypt; `CadastroUsuario.js`, `authController.js` | Cadastrar, comparar texto digitado com o formato do hash sem expor a senha |
| 3 | Login e `bcrypt.compare` | Mesmo resultado de erro para e-mail inexistente e senha incorreta |
| 4 | JWT e `jwt.sign` | Relacionar payload mínimo, segredo e expiração de duas horas |
| 5 | `autenticarToken` | Fazer uma consulta sem token, com token alterado e com token válido |
| 6 | Bearer Token no React Native; `services/api.js` | Acompanhar AsyncStorage → header Authorization → API |
| 7 | Níveis `usuario` e `admin`; Home | Comparar botões e explicar que o nível visual não autoriza a API |
| 8 | `somenteAdmin` | Demonstrar `401` sem autenticação e `403` com usuário comum |
| 9 | CRUD protegido de produtos | Reutilizar GET, POST, PUT e DELETE conhecidos, acrescentando os middlewares |
| 10 | Administração de usuários | Promover/rebaixar outra conta e mostrar efeito na autorização seguinte |
| 11 | Logout e sessão persistida; `App.js` | Reabrir com token válido, expirar sessão, interromper rede e remover token no logout |

Perguntas para discussão: por que esconder o botão não basta? Por que a senha não pode ir no payload? Por que a API não confia em `req.body.nivel` no cadastro? O que muda entre um erro de rede e uma resposta `401`? Por que o nível deve ser conferido novamente depois de uma alteração no banco?

## 23. Fluxo completo para revisar

```text
CADASTRO
  ↓ nome + email + senha
bcrypt.hash
  ↓
MySQL: hash + nivel usuario

LOGIN
  ↓ email + senha
bcrypt.compare
  ↓ senha correta
JWT válido por duas horas
  ↓
AsyncStorage: token

REQUISIÇÃO AUTENTICADA
  ↓
Authorization: Bearer TOKEN
  ↓
autenticarToken: assinatura + expiração + usuário atual
  ↓
req.usuario
  ↓
somenteAdmin, quando a ação exigir
  ↓
controller
  ↓
query parametrizada
  ↓
MySQL
  ↓
resposta HTTP sem senha ou hash
  ↓
State e interface atualizados
```

## 24. Comparação final: SEM JWT e COM JWT

O primeiro desenho representa o CRUD sem a camada de autenticação estudada nesta unidade. O segundo mostra as verificações acrescentadas antes de acessar os dados:

```text
SEM JWT:

Aplicativo
  ↓
API
  ↓
Banco

COM JWT:

Aplicativo
  ↓
Login
  ↓
Token
  ↓
Authorization
  ↓
Middleware
  ↓
Permissão
  ↓
Controller
  ↓
Banco
```

```text
USUÁRIO
  ↓
consulta produtos

ADMIN
  ↓
consulta
  +
cadastra
  +
edita
  +
exclui
  +
gerencia usuários
```
