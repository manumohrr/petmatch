import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaProjeto = path.dirname(fileURLToPath(import.meta.url));
const pastaWorkspace = path.resolve(pastaProjeto, '..');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8081',
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
    headless: true,
    viewport: { width: 1280, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/expo/bin/cli start --web --port 8081 --localhost',
    url: 'http://localhost:8081',
    timeout: 120000,
    reuseExistingServer: true,
    env: {
      CI: '1',
      __UNSAFE_EXPO_HOME_DIRECTORY: path.join(pastaWorkspace, '.expo-home'),
      npm_config_cache: path.join(pastaWorkspace, '.npm-cache'),
    },
  },
});
