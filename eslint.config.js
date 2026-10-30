// Configuração ESM: todo o código da aplicação continua em JavaScript.
import expo from 'eslint-config-expo/flat.js';

export default [
  ...expo,
  { ignores: ['dist/**', '.expo/**', 'node_modules/**'] },
  { files: ['backend/**/*.js', 'tests/**/*.js', 'scripts/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { process: 'readonly', Buffer: 'readonly' } } },
];
