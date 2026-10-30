# Validação da LOJA JWT

Verificações executadas em 25/10/2026, com Node 22.20.0, npm 10.9.3 e Windows.

## Projeto e dependências

O comando oficial `npx create-expo-app@latest loja-jwt --template blank` foi
executado antes da implementação. Foram preservados Expo `~58.0.19`, React
`19.3.0` e React Native `0.88.0`. React Navigation estável: Native `7.5.1` e
Native Stack `7.21.0`. As dependências nativas foram instaladas com `expo install`.

Todo o código da aplicação está em JavaScript. O backend é reconhecido pelo
Node como ES Modules. Nenhum arquivo `.env` com credenciais foi criado ou entregue.

| Verificação | Resultado observado |
| --- | --- |
| `npm test` | 14 testes passaram; 1 integração opcional ignorada na execução padrão |
| `npm run test:mysql` | Integração com MySQL 8.0.43 real passou |
| `npm run test:web` | 8 cenários passaram no Microsoft Edge headless |
| `npm run lint` | Sem erros ou avisos |
| `npm run typecheck` | Análise dos arquivos JavaScript do frontend passou, sem gerar arquivos |
| `npx expo-doctor` | 20 de 20 verificações aprovadas |
| `npx expo install --check` | Dependências compatíveis com o SDK |
| `npm run export:web` | Bundle web gerado com sucesso |
| `npx expo export --platform android --platform ios --output-dir dist/native` | Bundles Android e iOS gerados com sucesso |

## API, autenticação e banco

Os testes padrão usam HTTP, Express, JWT e bcrypt reais; somente o pool MySQL
é simulado. Cobrem token ausente, inválido, expirado ou com algoritmo diferente,
cadastro público ignorando `nivel: admin`, bcrypt com custo 10, e-mail duplicado,
login sem revelar qual credencial está errada, validação de dados, CRUD,
proibição de mudar o próprio nível e rebaixamento com efeito imediato.

O teste opcional iniciou outro `mysqld` com `--no-defaults`, dados próprios,
endereço `127.0.0.1` e porta `33307`. O serviço e os bancos preexistentes não
foram usados. A API iniciou com `backend/server.js` e configurações geradas
somente na memória dos processos de teste, sem criar `backend/.env`.

Foram confirmados no MySQL real:

- Importação do SQL duas vezes, mantendo seis produtos sem duplicação.
- Script do administrador: criação e segunda execução sem duplicar a conta.
- Cadastro sempre como `usuario`, duplicidade `409` e login incorreto `401`.
- Login correto, JWT de duas horas e `/auth/me` sem senha ou hash.
- Senhas armazenadas como hashes, diferentes dos valores de entrada.
- CRUD administrativo completo, inclusive atualização sem mudanças e consulta após exclusão.
- Listagem de usuários sem hash, promoção e rebaixamento de outra conta.
- Próprio nível e nível inválido rejeitados com `400`.
- Encerramento dos processos temporários da API e do MySQL ao final.

| Requisição | Perfil | Status observado |
| --- | --- | --- |
| `GET /produtos` | Sem token | `401` |
| `GET /produtos` | Usuário | `200` |
| `POST /produtos` | Usuário | `403` |
| `POST /produtos` | Admin | `201` |
| `GET /usuarios` | Usuário | `403` |
| `GET /usuarios` | Admin | `200` |

## Atualização: usuários demonstrativos no SQL

Foram adicionados `INSERT` para `usuario@loja.com` (nível `usuario`) e
`admin@loja.com` (nível `admin`). As senhas de demonstração estão no README;
o SQL armazena apenas os hashes bcrypt com custo 10.

A integração com MySQL real foi executada novamente e passou, confirmando:

- Login e `/auth/me` de ambas as contas com seus níveis corretos.
- Usuário comum consulta produtos, mas recebe `403` nas operações administrativas.
- Administrador cadastra/exclui produtos e lista usuários.
- Reimportar o SQL não duplica contas nem sobrescreve ID, nome, senha ou nível existentes.
- Os cenários anteriores de autenticação, administração e CRUD continuam passando.

Lint e análise do JavaScript passaram novamente; os 14 testes padrão da API
também passaram. Os resultados anteriores de navegador e bundles acima se
referem à implementação da interface, que não foi alterada nesta atualização.

## Interface e sessão

Os oito testes Playwright executam o Expo Web real e simulam somente as
respostas HTTP da API. Verificam cadastro, login incorreto e correto, Bearer
nas consultas, ausência de senha no armazenamento, navegação por nível,
restauração por `/auth/me`, logout, `401` durante a restauração e durante o uso,
falha de rede preservando o token, CRUD com confirmação/cancelamento da exclusão
e alteração dos níveis de outras contas.

As telas de login, Home e catálogo foram inspecionadas em 390 × 844 e
1280 × 900. Não houve overflow horizontal nem erro JavaScript de página.
Os previews locais ficam em `dist/previews/` e usam dados fictícios.

## Limites observados

Os bundles nativos foram gerados, mas não houve execução em aparelho físico,
emulador Android ou simulador iOS. Essa etapa deve ser feita no ambiente da
turma, com a URL da API e a versão do cliente Expo compatíveis.

O `npm audit` reportou cinco ocorrências de severidade alta na árvore de
ferramentas do Expo: `expo`, `@expo/cli`, `@expo/code-signing-certificates`,
`node-forge` e `zod`. Há duas dependências subjacentes envolvidas. A sugestão
automática incluía trocar o Expo por uma versão antiga; isso não foi aplicado,
preservando o SDK solicitado. Não foram forçadas versões incompatíveis.
Os avisos precisam ser reavaliados quando o Expo publicar correções compatíveis.

Para uso normal, configure seu próprio `backend/.env` e importe o SQL. A versão
atual do SQL cria uma conta demonstrativa de cada nível, com hashes bcrypt e
credenciais públicas documentadas no README. O script de administrador é opcional
para criar uma conta própria. Os testes isolados não configuram o banco de aula
nem deixam contas no serviço local preexistente.
