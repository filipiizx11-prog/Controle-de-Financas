// Middleware central de tratamento de erros.
// Mantem mensagens de erro compreensiveis para o usuario (requisito 25).
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ erro: 'Ja existe um registro com esses dados.' });
  }
  if (err.code === 'SQLITE_CONSTRAINT_CHECK') {
    return res.status(400).json({ erro: 'Um dos valores enviados nao e valido.' });
  }

  const status = err.status || 500;
  const mensagem = err.expose ? err.message : 'Ocorreu um erro inesperado. Tente novamente.';
  res.status(status).json({ erro: mensagem });
}

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

module.exports = { errorHandler, AppError };
