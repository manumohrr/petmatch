
-- Banco de dados do PetMatch
-- Plataforma de adoção responsável de animais

CREATE DATABASE IF NOT EXISTS petmatch_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE petmatch_db;

-- Usuários do aplicativo
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  nivel ENUM('adotante', 'ong', 'protetor', 'admin')
    NOT NULL DEFAULT 'adotante',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Animais disponíveis para adoção
CREATE TABLE IF NOT EXISTS animais (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(120) NOT NULL,
  especie ENUM('Cachorro', 'Gato') NOT NULL,
  raca VARCHAR(100),
  idade INT NOT NULL,
  unidade_idade ENUM('anos', 'meses') NOT NULL,
  sexo ENUM('Macho', 'Fêmea') NOT NULL,
  porte ENUM('Pequeno', 'Médio', 'Grande') NOT NULL,
  descricao TEXT,
  cidade VARCHAR(120) NOT NULL,
  foto VARCHAR(1000),
  saude VARCHAR(500),
  status ENUM('disponivel', 'em_processo', 'adotado')
    NOT NULL DEFAULT 'disponivel',
  usuario_id INT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Animais favoritos dos usuários
CREATE TABLE IF NOT EXISTS favoritos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  animal_id INT NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorito (usuario_id, animal_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animais(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Solicitações de adoção
CREATE TABLE IF NOT EXISTS adocoes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  animal_id INT NOT NULL,
  mensagem VARCHAR(1000) NOT NULL DEFAULT '',
  tipo_moradia VARCHAR(50),
  possui_outros_animais BOOLEAN,
  observacoes TEXT,
  status ENUM('pendente', 'aprovada', 'recusada', 'cancelada')
    NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE,
  FOREIGN KEY (animal_id) REFERENCES animais(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
