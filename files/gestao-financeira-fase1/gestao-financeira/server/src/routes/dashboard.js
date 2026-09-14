const express = require('express');
const db = require('../config/db');
const { round2 } = require('../utils/money');

const router = express.Router();

function ultimoDiaDoMes(ano, mes) {
  return new Date(ano, mes, 0).toISOString().slice(0, 10);
}

// GET /api/dashboard?mes=9&ano=2026
// Retorna todos os indicadores descritos no requisito 1 (Dashboard Principal)
// e no requisito 9 (Previsao de Deficit). Os limiares de "atencao"/"critico"
// sao uma regra de exibicao (nao um valor financeiro assumido) e podem ser
// ajustados aqui conforme a preferencia do usuario.
router.get('/', (req, res, next) => {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const mes = req.query.mes ? Number(req.query.mes) : now.getMonth() + 1;
    const ano = req.query.ano ? Number(req.query.ano) : now.getFullYear();
    const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const fimMes = ultimoDiaDoMes(ano, mes);

    const num = (sql, ...params) => db.prepare(sql).get(...params).v || 0;

    // --- saldo atual (real, considerando tudo ja recebido/pago, independente do mes filtrado) ---
    const saldoContas = num("SELECT COALESCE(SUM(saldo_inicial),0) AS v FROM contas");
    const totalRecebidoGeral = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='entrada' AND status='recebido'");
    const totalPagoGeral = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status='pago'");
    const saldoAtual = round2(saldoContas + totalRecebidoGeral - totalPagoGeral);

    // --- entradas do mes ---
    const entradasRecebidasMes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='entrada' AND status='recebido' AND data BETWEEN ? AND ?",
      inicioMes, fimMes
    );
    const entradasPrevistasMes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='entrada' AND status='previsto' AND data_prevista BETWEEN ? AND ?",
      inicioMes, fimMes
    );
    const totalEntradasMes = round2(entradasRecebidasMes + entradasPrevistasMes);

    // --- saidas do mes ---
    const saidasPagasMes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status='pago' AND data BETWEEN ? AND ?",
      inicioMes, fimMes
    );
    const saidasPendentesMes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status='pendente' AND vencimento BETWEEN ? AND ? AND vencimento >= ?",
      inicioMes, fimMes, hoje
    );
    const saidasVencidasMes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status IN ('pendente','vencido') AND vencimento < ?",
      hoje
    );
    const totalSaidasMes = round2(saidasPagasMes + saidasPendentesMes + saidasVencidasMes);

    // --- contas a pagar/receber (visao geral, nao so do mes) ---
    const totalContasPagas = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status='pago' AND data BETWEEN ? AND ?", inicioMes, fimMes);
    const totalContasPendentes = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status='pendente' AND vencimento >= ?", hoje);
    const totalContasVencidas = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status IN ('pendente','vencido') AND vencimento < ?", hoje);
    const totalAReceber = num("SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='entrada' AND status='previsto'");

    // --- projecao ate o fim do mes selecionado ---
    const entradasPrevistasRestantes = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='entrada' AND status='previsto' AND data_prevista BETWEEN ? AND ? AND data_prevista >= ?",
      inicioMes, fimMes, hoje
    );
    const saidasAPagarRestante = num(
      "SELECT COALESCE(SUM(valor),0) AS v FROM transacoes WHERE tipo='saida' AND status IN ('pendente','vencido') AND vencimento <= ?",
      fimMes
    );

    const saldoDisponivelAtual = round2(saldoAtual - saidasAPagarRestante);
    const saldoProjetado = round2(saldoDisponivelAtual + entradasPrevistasRestantes);
    const valorNecessarioParaFecharMes = saldoProjetado < 0 ? round2(Math.abs(saldoProjetado)) : 0;
    const rendaAdicionalNecessaria = valorNecessarioParaFecharMes;
    const valorDisponivelParaGastos = saldoProjetado > 0 ? saldoProjetado : 0;

    // --- situacao financeira (regra de exibicao, nao valor financeiro assumido) ---
    const margemAtencao = Math.max(100, saidasAPagarRestante * 0.15);
    let situacao = 'positiva';
    let mensagemSituacao = 'Contas cobertas — saldo suficiente.';
    if (saldoProjetado < 0) {
      situacao = 'critica';
      mensagemSituacao = `Déficit previsto — faltam R$ ${valorNecessarioParaFecharMes.toFixed(2)} para fechar o mês.`;
    } else if (saldoProjetado < margemAtencao) {
      situacao = 'atencao';
      mensagemSituacao = 'Atenção — margem financeira baixa.';
    }

    res.json({
      periodo: { mes, ano, inicioMes, fimMes },
      saldoAtual,
      totalEntradasMes,
      totalSaidasMes,
      totalContasPagas,
      totalContasPendentes,
      totalContasVencidas,
      totalAReceber,
      saldoProjetado,
      valorNecessarioParaFecharMes,
      valorDisponivelParaGastos,
      rendaAdicionalNecessaria,
      situacao,
      mensagemSituacao,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
