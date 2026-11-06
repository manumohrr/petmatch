# Validação do PetMatch

Revisão realizada em 05/11/2026.

## Escopo e preservação

Foram inventariados os arquivos próprios do projeto: configurações, App.js, 12 telas, componentes, serviço HTTP, API, middlewares, rotas, controllers, SQL, testes, scripts, documentação e seis imagens de assets. As imagens foram inspecionadas e ainda são recursos genéricos do template Expo, sem marca da loja; foram preservadas para não mudar o design.

A busca de legado abrangeu nomes de arquivos e conteúdo, incluindo arquivos ocultos de configuração. Dependências instaladas, metadados Git, caches, resultados gerados e arquivos binários do MySQL temporário não são código autoral e não foram editados. Arquivos .env e credenciais locais não foram alterados nem reproduzidos. Alterações locais já existentes foram preservadas. O banco real não foi acessado ou modificado.

## Referências corrigidas

- AGENTS.md: título PetMatch, cadastro público como adotante e identificação de animais na navegação.
- backend/controllers/produtosController.js: removido após confirmar que nenhuma rota ou importação executável o utilizava. A API já montava somente as rotas de animais.
- backend/utils/validacoes.js: removida apenas validarProduto, utilizada exclusivamente pelo controller obsoleto. Validações de usuário e ID foram mantidas; animais já têm validação própria.
- backend/tests/api.test.js: catálogo e CRUD passaram a testar animais; nível comum passou de usuario para adotante; mock SQL aceita consultas em várias linhas e os campos reais do animal. Mantidas verificações de JWT, bcrypt, cadastro, administração e revogação de privilégios.
- tests/app.spec.js: mocks e cenários foram adaptados às telas atuais, ao cadastro com login automático, às rotas de animais, às mensagens e permissões atuais. Seletores respeitam elementos visíveis porque a navegação mantém telas montadas.
- scripts/gerar-entrega.js e ENTREGA_COMPLETA.md: identidade PetMatch, SQL correto, remoção das instruções de contas demonstrativas antigas e da cópia de um .env.example inexistente. A entrega foi regenerada a partir dos fontes atuais.
- README.md: acrescentado estado técnico atual sem apagar o planejamento original.

app.json, package.json e os dois nomes raiz do package-lock.json já estavam adaptados para PetMatch na cópia de trabalho; foram conferidos e preservados. A substituição de database/loja_jwt.sql por database/petmatch.sql já estava em andamento antes da revisão.

## Compatibilidade do SQL

O SQL entregue tinha divergências reais com a implementação: idade textual, imagem em vez de foto, ausência de unidade_idade, saude e mensagem da adoção, além de sexo incompatível com Fêmea. O arquivo agora representa os campos e valores usados pelo frontend e pelos controllers, com responsável obrigatório para animais. Colunas opcionais de adoção já existentes (tipo_moradia, possui_outros_animais, observacoes) foram preservadas.

O teste MySQL deixou de criar um esquema paralelo embutido e agora importa database/petmatch.sql exclusivamente em uma instância temporária, com diretório próprio e porta diferente de 3306. Isso valida o SQL que acompanha a entrega. Não foi criada ou executada migração do banco real. CREATE TABLE IF NOT EXISTS não corrige tabelas existentes.

As rotas foram cruzadas com as chamadas do frontend: atualização de adoção usa PUT /adocoes/:id/status e cancelamento usa PUT /adocoes/:id/cancelar. A falha 404 versus 403 encontrada na integração vinha do teste, que usava /adocoes/:id; o teste foi corrigido sem mudar a API.

## Resultados executados

| Verificação | Resultado |
| --- | --- |
| Análise de sintaxe (Babel parser e JSON.parse) | 43 arquivos JavaScript e 4 JSON válidos |
| npm.cmd test | 14 testes de API passaram; integração MySQL ignorada por padrão (executada separadamente abaixo) |
| npm.cmd run test:mysql | 1 cenário integrado passou usando o SQL entregue e MySQL descartável |
| npm.cmd run test:web | 7 cenários passaram no Edge com Expo Web real e API simulada |
| ESLint nos fontes (comando abaixo) | Falhou: 3 erros e 5 avisos em código de interface já existente |
| npm.cmd run typecheck | Falhou: 8 erros em propriedades e tipos da interface já existente |

Comando de lint concluído: `npm.cmd run lint -- App.js index.js components screens services backend scripts tests playwright.config.js eslint.config.js`. A tentativa sem caminhos explícitos não concluiu e foi interrompida; a execução com caminhos cobriu os fontes e configurações JavaScript. Não se considera lint aprovado.

O ambiente inicialmente bloqueou processos com spawn EPERM. Os testes foram repetidos com autorização fora dessa restrição. O PowerShell bloqueou npm.ps1; npm.cmd funcionou sem alterar a política de execução.

A integração validou os quatro perfis, cadastro público sem elevação de privilégio, login/JWT, consulta de perfil, administração, criação e atualização de animais por ONG, bloqueio de alteração/exclusão por outro responsável, criação/exclusão por protetor, favoritos e duplicidade, solicitação de adoção, bloqueio de avaliação por outro responsável e aprovação que marca o animal como adotado. Os relatórios locais ficam em ../.mysql-validation/petmatch-*/resultado.txt.

Os testes web validaram cadastro com login automático sem enviar nível, listagem/detalhes para adotante com Bearer, ausência de controles de gerenciamento para adotante, restauração/logout, sessão inválida, recuperação após falha de rede, 401 em sessão ativa e acesso administrativo. As duas falhas iniciais eram ambiguidades nos seletores dos testes; foram corrigidas e a suíte foi repetida com sucesso. Estes cenários não constituem validação completa de todos os fluxos visuais.

## Problemas de implementação ainda presentes

São problemas estáticos da interface atual, sem relação com a antiga loja, e não foram alterados para preservar o escopo e o comportamento solicitado:

- App.js:94: react-hooks/set-state-in-effect ao chamar restaurarSessao dentro do efeito.
- screens/Animais.js:332: duas aspas literais em JSX violam react/no-unescaped-entities.
- Avisos de lint: dependências de useCallback em DetalhesAnimal.js:88 e EditarAnimal.js:114; imports não utilizados em Home.js:6 e Login.js:5; variável capturada não utilizada em Perfil.js:83.
- App.js:249: Perfil recebe usuario/sair/atualizarUsuario, mas sua assinatura declara somente navigation (1 erro do verificador).
- Home.js:329,335,340,346,354: parâmetros ativo/icone de BotaoMenu inferidos como obrigatórios, mas omitidos em chamadas (5 erros).
- Home.js:737,857: nomes de ícones inferidos como string ampla, incompatível com o conjunto de nomes de Ionicons (2 erros).

Portanto, testes executáveis passaram, mas a validação estática global permanece reprovada. Não foi testado dispositivo físico Android/iOS nem realizado build nativo. Nenhuma dependência nova foi instalada.

## Histórico preservado

Loja JWT é a origem didática fornecida pelo professor. Menções explicativas em README.md e neste relatório foram mantidas; resultados antigos da loja não são evidência de aprovação do PetMatch. Termos genéricos corretos, como usuário, autenticarToken, cartão e imagem, não foram renomeados por semelhança textual. A licença original Expo foi preservada.
