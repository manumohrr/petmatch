# PetMatch — Adoção de Animais

##1 ENTREGA

## Apresentação do projeto

O PetMatch é um aplicativo desenvolvido com o objetivo de facilitar a adoção responsável de animais, conectando cães e gatos que precisam de um novo lar a pessoas interessadas em adotar.

A proposta é criar uma plataforma organizada e acessível, onde os usuários possam conhecer os animais disponíveis, visualizar suas informações, salvar favoritos e realizar solicitações de adoção. Além disso, o aplicativo busca auxiliar ONGs e protetores independentes na divulgação dos animais, tornando esse processo mais prático e centralizado.

## Problema identificado

Atualmente, muitos animais aguardam por uma oportunidade de adoção, enquanto pessoas interessadas em adotar nem sempre sabem onde encontrar informações sobre eles.

Grande parte das divulgações acontece por meio de redes sociais, grupos e publicações individuais, o que pode dificultar a organização das informações e o acompanhamento dos animais disponíveis.

Outro problema é a dificuldade que ONGs e protetores independentes podem enfrentar para divulgar os animais e alcançar pessoas realmente interessadas na adoção.

## Contexto e público afetado

O projeto está relacionado à adoção de animais e à necessidade de melhorar a comunicação entre quem procura um pet e quem é responsável por sua divulgação.

O público-alvo do PetMatch é formado por pessoas interessadas em adotar cães ou gatos, ONGs que trabalham com proteção animal e protetores independentes que resgatam, cuidam ou divulgam animais disponíveis para adoção.

## Justificativa

O PetMatch surgiu da ideia de utilizar a tecnologia para contribuir com uma causa importante: a adoção responsável de animais.

A criação de uma plataforma específica para essa finalidade pode facilitar o acesso às informações, organizar os anúncios e aproximar os animais de possíveis adotantes.

Além de ajudar quem deseja adotar, o projeto também busca oferecer mais visibilidade ao trabalho realizado por ONGs e protetores independentes.

## Proposta de solução

A solução proposta é desenvolver um aplicativo chamado PetMatch, no qual os usuários possam encontrar animais disponíveis para adoção e acompanhar suas solicitações.

O aplicativo contará com um sistema de cadastro e login, listagem de animais, filtros de pesquisa, visualização de detalhes, favoritos e solicitações de adoção.

Também haverá funcionalidades específicas para ONGs, protetores e administradores, permitindo o gerenciamento dos animais e das informações cadastradas.

A proposta é reunir essas funcionalidades em um único ambiente, com uma interface simples, organizada e intuitiva.

## Nome e identidade visual da aplicação

O nome PetMatch representa a ideia de criar uma conexão entre animais e pessoas, ajudando cada pet a encontrar uma família.

A identidade visual utiliza principalmente as cores laranja, verde e tons claros, além de uma patinha como símbolo da aplicação. O design foi pensado para transmitir uma imagem acolhedora, moderna e organizada, facilitando a navegação dos usuários.

## Tipos de usuários e permissões

O sistema foi planejado para atender quatro tipos de usuários: adotantes, ONGs, protetores independentes e administradores.

Os **adotantes** poderão criar uma conta, realizar login, visualizar os animais disponíveis, pesquisar por características específicas, consultar informações detalhadas, adicionar animais aos favoritos, enviar solicitações de adoção e acompanhar seus pedidos.

As **ONGs** terão acesso às funcionalidades gerais do aplicativo e também poderão cadastrar animais disponíveis para adoção, atualizar suas informações, gerenciar os anúncios sob sua responsabilidade e acompanhar solicitações relacionadas a esses animais.

Os **protetores independentes** terão permissões semelhantes às das ONGs, podendo divulgar animais, manter seus cadastros atualizados e acompanhar o interesse de possíveis adotantes.

O **administrador** será responsável pelo gerenciamento geral da plataforma, podendo acessar as funcionalidades do aplicativo, administrar os cadastros de animais, consultar usuários e gerenciar os níveis de acesso autorizados.

O cadastro público será destinado aos adotantes, enquanto os demais níveis de acesso dependerão de autorização administrativa.

## Principais funcionalidades

O PetMatch contará com funcionalidades de cadastro e autenticação de usuários, permitindo que cada pessoa tenha sua própria conta e acesse as informações relacionadas ao seu perfil.

A plataforma apresentará uma listagem de cães e gatos disponíveis para adoção, com ferramentas de pesquisa e filtros para facilitar a busca. Cada animal terá uma página de detalhes, onde o usuário poderá consultar suas informações.

Também será possível adicionar animais aos favoritos e realizar solicitações de adoção, acompanhando posteriormente o andamento desses pedidos.

Para ONGs, protetores e administradores, o aplicativo disponibilizará recursos de gerenciamento dos animais cadastrados, incluindo operações de criação, consulta, atualização e exclusão, conforme as permissões de cada perfil.

## Telas previstas

O aplicativo foi estruturado com 12 telas principais, responsáveis pelas diferentes funcionalidades do sistema.

As telas de **Login** e **Cadastro de Usuário** permitem o acesso e a criação de contas. A **Home** apresenta o PetMatch e direciona os usuários para as principais funcionalidades. A tela **Animais** reúne os pets disponíveis, enquanto **Detalhes do Animal** apresenta as informações individuais de cada um.

A tela **Favoritos** permite consultar os animais salvos, e **Solicitar Adoção** possibilita iniciar um pedido de adoção. Em **Minhas Solicitações**, o usuário poderá acompanhar os pedidos realizados.

A tela **Perfil** reúne as informações da conta. Já **Cadastrar Animal** e **Editar Animal** são destinadas ao gerenciamento dos anúncios, enquanto a tela **Usuários** permite realizar funções administrativas relacionadas às contas e permissões.

O aplicativo também prevê seções informativas de Sobre e Contato.

## Fluxo inicial de navegação

O fluxo principal do PetMatch começa na tela de Login, onde o usuário pode acessar uma conta existente ou escolher a opção de cadastro.

Após realizar o cadastro e a autenticação, ele é direcionado para a Home, onde encontra uma apresentação do projeto e pode acessar a listagem de animais disponíveis para adoção.

Ao selecionar um animal, o usuário poderá visualizar seus detalhes, adicioná-lo aos favoritos ou iniciar uma solicitação de adoção. Também será possível acessar o perfil e acompanhar as solicitações realizadas.

Os usuários com permissões de ONG, protetor ou administrador terão acesso às funcionalidades adicionais de gerenciamento, de acordo com seu nível de acesso.

## Tecnologias utilizadas

O projeto utiliza **React Native** e **Expo** para o desenvolvimento e a execução do aplicativo, com **JavaScript** como linguagem de programação.

A navegação entre as telas é realizada por meio do **React Navigation**, enquanto o backend utiliza **Node.js** e **Express** para desenvolver a API responsável pela comunicação entre o aplicativo e o banco de dados.

O **MySQL** é utilizado para armazenar as informações de usuários, animais, favoritos e solicitações de adoção. A autenticação utiliza **JWT**, permitindo controlar o acesso às funcionalidades conforme o perfil de cada usuário.

O desenvolvimento também utiliza **Git e GitHub** para o versionamento e armazenamento do código-fonte.

## Estrutura do projeto

O código do PetMatch está organizado em diferentes pastas para facilitar o desenvolvimento e a manutenção.

A pasta **screens** contém as telas do aplicativo, enquanto **components** reúne os componentes reutilizáveis da interface. A pasta **services** é responsável pelos serviços de comunicação com a API, e **backend** contém os arquivos do servidor, incluindo rotas, controladores e configurações.

A pasta **database** reúne arquivos relacionados ao banco de dados, enquanto **assets** armazena imagens e outros recursos visuais. O projeto também possui arquivos e pastas destinados aos testes e às configurações gerais da aplicação.

O arquivo **App.js** é responsável pela navegação principal e pelo fluxo de autenticação, enquanto **package.json** reúne as dependências e os comandos necessários para executar o projeto.

## Banco de dados

O PetMatch utiliza um banco de dados MySQL para armazenar as informações necessárias ao funcionamento da plataforma.

A estrutura contempla dados de usuários, animais disponíveis para adoção, favoritos e solicitações de adoção.

Essas informações são acessadas por meio de uma API desenvolvida com Node.js e Express, permitindo que o aplicativo consulte, cadastre, atualize e exclua registros conforme as permissões estabelecidas.

## Desenvolvimento e próximas etapas

O PetMatch está em desenvolvimento e será aprimorado ao longo das próximas entregas.

As próximas etapas incluem a revisão da integração entre o aplicativo, a API e o banco de dados, a validação das funcionalidades de cadastro e autenticação, os testes das operações CRUD e o aperfeiçoamento da interface.

Também serão revisados os arquivos herdados do projeto-base utilizado em aula, garantindo que toda a documentação, as configurações e os testes estejam de acordo com a proposta do PetMatch.

O objetivo final é entregar uma aplicação funcional, organizada e coerente com o planejamento apresentado.
## Estado técnico após a revisão de 05/11/2026

O planejamento acima foi preservado. O código atual usa exclusivamente as rotas `/auth`, `/animais`, `/usuarios`, `/favoritos` e `/adocoes`. Os níveis são `adotante`, `ong`, `protetor` e `admin`; o cadastro público sempre cria um adotante. A origem didática é o projeto Loja JWT fornecido pelo professor, mas as funcionalidades atuais são de adoção.

Na pasta que contém `package.json`, use `npm ci` se precisar instalar as dependências já declaradas. Execute `npm run api` em um terminal e `npm run web` em outro. No PowerShell com bloqueio de scripts, use `npm.cmd` no lugar de `npm`. Nenhuma dependência nova foi necessária nesta revisão.

A API lê a configuração existente em `backend/.env` e usa as variáveis `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT` e `JWT_SECRET`. O esquema entregue chama-se `petmatch_db`. Nenhuma configuração ou credencial local foi alterada. Para celular físico, confira o endereço da API em `services/api.js`: localhost aponta para o próprio dispositivo.

O arquivo `database/petmatch.sql` contém a estrutura para um banco novo e não cria contas demonstrativas. `CREATE TABLE IF NOT EXISTS` não atualiza tabelas existentes: qualquer migração de um banco já preenchido deve ser planejada separadamente. Esta revisão não aplicou SQL no banco real.

As verificações e suas limitações estão em [VALIDACAO.md](VALIDACAO.md). `npm test` usa MySQL simulado; `npm run test:web` usa API simulada no navegador; `npm run test:mysql` cria um servidor MySQL descartável separado e importa o SQL entregue. Este último exige o binário local `mysqld` (ou `MYSQLD_PATH` apontando para ele).
