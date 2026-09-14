const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { exigirCampos, exigirNumeroPositivo, exigirEnum } = require('../utils/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

const TIPOS = ['entrada', 'saida'];
const PESSOAS = ['eu', 'esposa', 'ambos', 'outro'];
const FREQUENCIAS = ['unica', 'mensal', 'semanal', 'quinzenal', 'anual'];
const STATUS_ENTRADA = ['previsto', 'recebido', 'cancelado'];
const STATUS_SAIDA = ['pendente', 'pago', 'vencido', 'cancelado'];

// -------- helpers --------
function proximaData(dataISO, frequencia) {
  const d = new Date(dataISO + 'T00:00:00');
  if (frequencia === 'semanal') d.setDate(d.getDate() + 7);
  else if (frequencia === 'quinzenal') d.setDate(d.getDate() + 15);
  else if (frequencia === 'mensal') d.setMonth(d.getMonth() + 1);
  else if (frequencia === 'anual') d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// Requisito 27.2: nao criar movimentacoes automaticas sem regra de recorrencia configurada.
// Aqui, ao CRIAR uma transacao recorrente, geramos as proximas N ocorrencias (mesma serie),
// pois a regra de recorrencia foi explicitamente configurada pelo usuario nesse momento.
const OCORRENCIAS_FUTURAS = 11; // gera 1 ano (mensal) ou equivalente

function inserirTransacao(t) {
  const stmt = db.prepare(`
    INSERT INTO transacoes
      (tipo, usuario_id, pessoa, descricao, categoria_id, valor, data, vencimento,
       data_prevista, forma_pagamento, conta_id, recorrente, frequencia, grupo_recorrencia,
       status, data_pagamento, observacoes)
    VALUES (@tipo, @usuario_id, @pessoa, @descricao, @categoria_id, @valor, @data, @vencimento,
       @data_prevista, @forma_pagamento, @conta_id, @recorrente, @frequencia, @grupo_recorrencia,
       @status, @data_pagamento, @observacoes)
  `);
  return stmt.run(t);
}

// -------- rotas --------

// GET /api/transacoes?tipo=&status=&pessoa=&categoria_id=&conta_id=&data_inicio=&data_fim=&busca=&pagina=&limite=
router.get('/', (req, res, next) => {
  try {
    const {
      tipo, status, pessoa, categoria_id, conta_id,
      data_inicio, data_fim, busca,
      pagina = 1, limite = 50,
    } = req.query;

    const condicoes = [];
    const params = {};

    if (tipo) { exigirEnum(tipo, TIPOS, 'tipo'); condicoes.push('t.tipo = @tipo'); params.tipo = tipo; }
    if (status) { condicoes.push('t.status = @status'); params.status = status; }
    if (pessoa) { exigirEnum(pessoa, PESSOAS, 'pessoa'); condicoes.push('t.pessoa = @pessoa'); params.pessoa = pessoa; }
    if (categoria_id) { condicoes.push('t.categoria_id = @categoria_id'); params.categoria_id = categoria_id; }
    if (conta_id) { condicoes.push('t.conta_id = @conta_id'); params.conta_id = conta_id; }
    if (data_inicio) { condicoes.push('t.data >= @data_inicio'); params.data_inicio = data_inicio; }
    if (data_fim) { condicoes.push('t.data <= @data_fim'); params.data_fim = data_fim; }
    if (busca) { condicoes.push('(t.descricao LIKE @busca OR t.observacoes LIKE @busca)'); params.busca = `%${busca}%`; }

    const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
    const offset = (Number(pagina) - 1) * Number(limite);

    const itens = db.prepare(`
      SELECT t.*, c.nome AS categoria_nome, co.nome AS conta_nome
      FROM transacoes t
      LEFT JOIN categorias c ON c.id = t.categoria_id
      LEFT JOIN contas co ON co.id = t.conta_id
      ${where}
      ORDER BY t.data DESC, t.id DESC
      LIMIT @limite OFFSET @offset
    `).all({ ...params, limite: Number(limite), offset });

    const total = db.prepare(`SELECT COUNT(*) AS total FROM transacoes t ${where}`).get(params).total;

    res.json({ itens, total, pagina: Number(pagina), limite: Number(limite) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res, next) => {
  try {
    const item = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(req.params.id);
    if (!item) throw new AppError('Transacao nao encontrada.', 404);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/transacoes
router.post('/', (req, res, next) => {
  try {
    const body = req.body;
    exigirCampos(body, ['tipo', 'pessoa', 'descricao', 'valor', 'data']);
    exigirEnum(body.tipo, TIPOS, 'tipo');
    exigirEnum(body.pessoa, PESSOAS, 'pessoa');
    const valor = exigirNumeroPositivo(body.valor, 'valor');

    const frequencia = body.recorrente ? (body.frequencia || 'mensal') : 'unica';
    if (body.recorrente) exigirEnum(frequencia, FREQUENCIAS.filter((f) => f !== 'unica'), 'frequencia');

    const statusPadrao = body.tipo === 'entrada' ? 'previsto' : 'pendente';
    const statusPermitido = body.tipo === 'entrada' ? STATUS_ENTRADA : STATUS_SAIDA;
    const status = body.status || statusPadrao;
    exigirEnum(status, statusPermitido, 'status');

    const grupo = body.recorrente ? crypto.randomUUID() : null;

    const base = {
      tipo: body.tipo,
      usuario_id: req.usuario.id,
      pessoa: body.pessoa,
      descricao: body.descricao,
      categoria_id: body.categoria_id || null,
      valor,
      data: body.data,
      vencimento: body.tipo === 'saida' ? (body.vencimento || body.data) : null,
      data_prevista: body.tipo === 'entrada' ? (body.data_prevista || body.data) : null,
      forma_pagamento: body.forma_pagamento || null,
      conta_id: body.conta_id || null,
      recorrente: body.recorrente ? 1 : 0,
      frequencia,
      grupo_recorrencia: grupo,
      status,
      data_pagamento: null,
      observacoes: body.observacoes || null,
    };

    const criados = [];
    const primeira = inserirTransacao(base);
    criados.push(primeira.lastInsertRowid);

    // Gera ocorrencias futuras somente se o usuario configurou recorrencia explicitamente.
    if (body.recorrente) {
      let dataRef = base.vencimento || base.data_prevista || base.data;
      for (let i = 0; i < OCORRENCIAS_FUTURAS; i++) {
        dataRef = proximaData(dataRef, frequencia);
        const ocorrencia = {
          ...base,
          data: dataRef,
          vencimento: base.tipo === 'saida' ? dataRef : null,
          data_prevista: base.tipo === 'entrada' ? dataRef : null,
          status: statusPadrao,
        };
        const r = inserirTransacao(ocorrencia);
        criados.push(r.lastInsertRowid);
      }
    }

    res.status(201).json({
      mensagem: body.tipo === 'entrada' ? 'Entrada adicionada com sucesso.' : 'Despesa adicionada com sucesso.',
      ids_criados: criados,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/transacoes/:id  (edita 1 ocorrencia)
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    if (!existente) throw new AppError('Transacao nao encontrada.', 404);

    const body = req.body;
    exigirCampos(body, ['pessoa', 'descricao', 'valor', 'data']);
    exigirEnum(body.pessoa, PESSOAS, 'pessoa');
    const valor = exigirNumeroPositivo(body.valor, 'valor');

    const statusPermitido = existente.tipo === 'entrada' ? STATUS_ENTRADA : STATUS_SAIDA;
    const status = body.status || existente.status;
    exigirEnum(status, statusPermitido, 'status');

    db.prepare(`
      UPDATE transacoes SET
        pessoa = @pessoa, descricao = @descricao, categoria_id = @categoria_id,
        valor = @valor, data = @data, vencimento = @vencimento, data_prevista = @data_prevista,
        forma_pagamento = @forma_pagamento, conta_id = @conta_id, status = @status,
        observacoes = @observacoes, atualizado_em = datetime('now')
      WHERE id = @id
    `).run({
      id,
      pessoa: body.pessoa,
      descricao: body.descricao,
      categoria_id: body.categoria_id || null,
      valor,
      data: body.data,
      vencimento: existente.tipo === 'saida' ? (body.vencimento || body.data) : null,
      data_prevista: existente.tipo === 'entrada' ? (body.data_prevista || body.data) : null,
      forma_pagamento: body.forma_pagamento || null,
      conta_id: body.conta_id || null,
      status,
      observacoes: body.observacoes || null,
    });

    res.json({ mensagem: 'Transacao atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transacoes/:id/pagar  -> marca conta como paga / entrada como recebida
router.patch('/:id/pagar', (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    if (!existente) throw new AppError('Transacao nao encontrada.', 404);
    if (existente.status === 'cancelado') {
      throw new AppError('Nao e possivel confirmar uma transacao cancelada.', 400);
    }

    const novoStatus = existente.tipo === 'entrada' ? 'recebido' : 'pago';
    const dataPagamento = req.body.data_pagamento || new Date().toISOString().slice(0, 10);

    db.prepare(`
      UPDATE transacoes SET status = @status, data_pagamento = @data_pagamento, atualizado_em = datetime('now')
      WHERE id = @id
    `).run({ id, status: novoStatus, data_pagamento: dataPagamento });

    res.json({
      mensagem: existente.tipo === 'entrada' ? 'Entrada marcada como recebida.' : 'Conta marcada como paga.',
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transacoes/:id/cancelar
router.patch('/:id/cancelar', (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = db.prepare('SELECT id FROM transacoes WHERE id = ?').get(id);
    if (!existente) throw new AppError('Transacao nao encontrada.', 404);

    db.prepare("UPDATE transacoes SET status = 'cancelado', atualizado_em = datetime('now') WHERE id = ?").run(id);
    res.json({ mensagem: 'Transacao cancelada.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transacoes/:id?serie=true  -> exclui 1 ou toda a serie recorrente
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const existente = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(id);
    if (!existente) throw new AppError('Transacao nao encontrada.', 404);

    if (req.query.serie === 'true' && existente.grupo_recorrencia) {
      const info = db.prepare('DELETE FROM transacoes WHERE grupo_recorrencia = ?').run(existente.grupo_recorrencia);
      return res.json({ mensagem: `Serie recorrente excluida (${info.changes} lancamentos).` });
    }

    db.prepare('DELETE FROM transacoes WHERE id = ?').run(id);
    res.json({ mensagem: 'Transacao excluida com sucesso.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
