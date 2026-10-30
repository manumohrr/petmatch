# LOJA JWT

Projeto didático para alunos do 3º ano do Ensino Médio Técnico. Priorize código
simples, funções tradicionais, comentários explicativos em português e
compatibilidade com Expo Web, Android e iOS.

## Requisitos deste projeto

- Use JavaScript, template Blank, `App.js` e React Navigation com Native Stack.
- Não introduza Expo Router, pasta `app/`, `_layout.js`, fontes TypeScript ou Redux.
- O verificador `tsc` é apenas uma ferramenta de análise dos arquivos JavaScript
  via `jsconfig.json`; não converta a aplicação para TypeScript.
- Mantenha aplicativo, backend e SQL nesta mesma raiz. Não altere projetos antigos.
- Preserve as versões de React e React Native geradas pelo template oficial.
- Todo código Node usa ES Modules e extensão `.js` nos imports locais.
- Use `fetch`, Express, mysql2/promise, bcryptjs e jsonwebtoken, sem ORM.
- Nunca versione `backend/.env`, salve senhas no aplicativo ou retorne hashes.
- Cadastro público define `usuario` no servidor. Rotas administrativas exigem
  `autenticarToken` e `somenteAdmin`; o nível atual vem do banco.
- Não acrescente pagamento, carrinho, frete, checkout ou imagens de produtos.

As instruções específicas acima substituem as recomendações genéricas de
navegação do template do Expo que originou este projeto.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # Use for Expo/native dependencies to resolve SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npm run typecheck          # Check JavaScript through jsconfig.json
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done. This is a JavaScript-only
project: use `npm run lint` and `npm run typecheck` (configured through jsconfig).
Run `npm test` for the Express/JWT tests, `npm run test:web` for browser flows,
and `npm run test:mysql` for the optional isolated MySQL integration test.

## Navigation & Routing

- Use Native Stack in `App.js`, as required by the teaching plan.
- Keep screens in `screens/` and shared visual components in `components/`.
- Pass the product ID through `route.params.id` and session data through Props.
- Docs: https://reactnavigation.org/docs/getting-started/

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
