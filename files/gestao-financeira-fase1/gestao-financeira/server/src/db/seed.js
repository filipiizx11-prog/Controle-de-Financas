// Script opcional de dados iniciais (categorias padrao).
// Rode com: npm run seed
require('dotenv').config();
const db = require('../config/db');

const categoriasPadrao = [
  ['Salário', 'entrada'], ['Freelance', 'entrada'], ['Venda', 'entrada'],
  ['Comissão', 'entrada'], ['PIX recebido', 'entrada'], ['Renda extra', 'entrada'], ['Outros', 'entrada'],
  ['Moradia', 'saida'], ['Energia', 'saida'], ['Água', 'saida'], ['Internet', 'saida'],
  ['Telefone', 'saida'], ['Alimentação', 'saida'], ['Mercado', 'saida'], ['Transporte', 'saida'],
  ['Combustível', 'saida'], ['Saúde', 'saida'], ['Educação', 'saida'], ['Lazer', 'saida'],
  ['Assinaturas', 'saida'], ['Cartão', 'saida'], ['Empréstimos', 'saida'], ['Financiamentos', 'saida'],
  ['Impostos', 'saida'], ['Compras', 'saida'], ['Outros', 'saida'],
];

const inserir = db.prepare('INSERT OR IGNORE INTO categorias (nome, tipo) VALUES (?, ?)');
for (const [nome, tipo] of categoriasPadrao) inserir.run(nome, tipo);

console.log(`Categorias padrao inseridas (${categoriasPadrao.length} tentativas, duplicadas ignoradas).`);
