-- ============================================================
-- SCHEMA - Sistema de Gestao Financeira Familiar
-- Fase 1: usuarios, contas bancarias, categorias, transacoes
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'corrente', -- corrente, poupanca, carteira, cartao
  saldo_inicial REAL NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  limite_mensal REAL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(nome, tipo)
);

-- transacoes cobre tanto ENTRADAS quanto SAIDAS (campo "tipo")
CREATE TABLE IF NOT EXISTS transacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  pessoa TEXT NOT NULL CHECK (pessoa IN ('eu', 'esposa', 'ambos', 'outro')),
  descricao TEXT NOT NULL,
  categoria_id INTEGER REFERENCES categorias(id),
  valor REAL NOT NULL CHECK (valor >= 0),
  data TEXT NOT NULL,
  vencimento TEXT,
  data_prevista TEXT,
  forma_pagamento TEXT,
  conta_id INTEGER REFERENCES contas(id),
  recorrente INTEGER NOT NULL DEFAULT 0,
  frequencia TEXT CHECK (frequencia IN ('unica','mensal','semanal','quinzenal','anual')) DEFAULT 'unica',
  grupo_recorrencia TEXT,
  status TEXT NOT NULL DEFAULT 'previsto',
  data_pagamento TEXT,
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transacoes_tipo ON transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_status ON transacoes(status);
CREATE INDEX IF NOT EXISTS idx_transacoes_vencimento ON transacoes(vencimento);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes(data);
