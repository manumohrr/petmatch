-- Execute este arquivo no MySQL Workbench antes de iniciar a API.
-- IF NOT EXISTS evita apagar dados se o arquivo for executado novamente.
CREATE DATABASE IF NOT EXISTS loja_jwt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE loja_jwt;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  -- Armazena somente o hash do bcrypt; nunca uma senha original.
  senha VARCHAR(255) NOT NULL,
  nivel ENUM('usuario', 'admin') NOT NULL DEFAULT 'usuario',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS produtos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  descricao VARCHAR(500),
  categoria VARCHAR(100),
  preco DECIMAL(10,2) NOT NULL,
  estoque INT NOT NULL DEFAULT 0,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_produtos_preco CHECK (preco >= 0),
  CONSTRAINT chk_produtos_estoque CHECK (estoque >= 0)
) ENGINE=InnoDB;

-- IDs explícitos e INSERT IGNORE mantêm os seis exemplos sem duplicar a cada execução.
-- Registros existentes com esses IDs são preservados.
INSERT IGNORE INTO produtos (id, nome, descricao, categoria, preco, estoque) VALUES
  (1, 'Notebook', 'Notebook para estudar, programar e realizar atividades do dia a dia.', 'Computadores', 3299.90, 8),
  (2, 'Mouse', 'Mouse óptico USB com três botões.', 'Periféricos', 49.90, 35),
  (3, 'Teclado', 'Teclado USB com padrão brasileiro ABNT2.', 'Periféricos', 119.90, 20),
  (4, 'Monitor', 'Monitor de 24 polegadas para estudo e trabalho.', 'Monitores', 899.90, 12),
  (5, 'Headset', 'Fone de ouvido com microfone para aulas e chamadas.', 'Áudio', 179.90, 18),
  (6, 'Webcam', 'Câmera USB para videoaulas e reuniões.', 'Periféricos', 229.90, 15);

-- Contas demonstrativas para a aula: uma comum e uma administrativa.
-- Os valores de senha abaixo são hashes bcrypt de custo 10, compatíveis com
-- bcrypt.compare() no login. As credenciais de demonstração estão no README.
-- Sem IDs fixos: o MySQL gera as chaves e não conflita com contas já existentes.
-- INSERT IGNORE preserva senha e nível se o e-mail já estiver cadastrado.
INSERT IGNORE INTO usuarios (nome, email, senha, nivel) VALUES
  ('Usuário de demonstração', 'usuario@loja.com', '$2b$10$iGSCOAfHr.Z6b8rYTiSj/.JkX1dVqXOrQX51zQzuDG8eU2dj2Ijwa', 'usuario'),
  ('Administrador de demonstração', 'admin@loja.com', '$2b$10$bKxUFTiSnDAZb5EHVy9QV.bTlqQaUUW1qPO6Y/XJ9JVHotJkd9dIK', 'admin');

-- Para criar outro administrador com uma senha própria, use opcionalmente:
-- node backend/scripts/criarAdmin.js (configurado em backend/.env).
