const { AppError } = require('../middleware/errorHandler');

// Validacao simples e explicita (sem libs externas) para manter o projeto leve.
// Evita SQL Injection por si so pois usamos queries parametrizadas (prepared statements)
// em todo o codigo -- nunca concatenamos valores de usuario nas queries SQL.

function exigirCampos(obj, campos) {
  const faltando = campos.filter((c) => obj[c] === undefined || obj[c] === null || obj[c] === '');
  if (faltando.length) {
    throw new AppError(`Campos obrigatorios faltando: ${faltando.join(', ')}`, 400);
  }
}

function exigirNumeroPositivo(valor, nomeCampo) {
  const n = Number(valor);
  if (Number.isNaN(n) || n < 0) {
    throw new AppError(`O campo "${nomeCampo}" precisa ser um numero valido e nao negativo.`, 400);
  }
  return n;
}

function exigirEnum(valor, opcoes, nomeCampo) {
  if (!opcoes.includes(valor)) {
    throw new AppError(`O campo "${nomeCampo}" deve ser um dos valores: ${opcoes.join(', ')}.`, 400);
  }
}

function exigirEmailValido(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    throw new AppError('Informe um e-mail valido.', 400);
  }
}

module.exports = { exigirCampos, exigirNumeroPositivo, exigirEnum, exigirEmailValido };
