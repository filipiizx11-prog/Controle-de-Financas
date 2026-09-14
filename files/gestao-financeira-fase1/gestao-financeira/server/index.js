require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const transacoesRoutes = require('./src/routes/transacoes');
const categoriasRoutes = require('./src/routes/categorias');
const contasRoutes = require('./src/routes/contas');
const dashboardRoutes = require('./src/routes/dashboard');
const { autenticar } = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errorHandler');

require('./src/config/db'); // inicializa o banco e aplica o schema

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Rotas publicas
app.use('/api/auth', authRoutes);

// Rotas protegidas (exigem login)
app.use('/api/transacoes', autenticar, transacoesRoutes);
app.use('/api/categorias', autenticar, categoriasRoutes);
app.use('/api/contas', autenticar, contasRoutes);
app.use('/api/dashboard', autenticar, dashboardRoutes);

app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada.' }));
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
