const express = require('express');
const db = require('../config/db');
const { exigirCampos, exigirNumeroPositivo } = require('../utils/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', (req, res, next) => {
  try {
    res.json(db.prepare('SELECT * FROM contas ORDER BY nome ASC').all());
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { nome, tipo, saldo_inicial } = req.body;
    exigirCampos(req.body, ['nome']);
    const saldo = exigirNumeroPositivo(saldo_inicial ?? 0, 'saldo_inicial');

    const info = db
      .prepare('INSERT INTO contas (nome, tipo, saldo_inicial) VALUES (?, ?, ?)')
      .run(nome, tipo || 'corrente', saldo);

    res.status(201).json({ id: info.lastInsertRowid, nome, tipo: tipo || 'corrente', saldo_inicial: saldo });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, tipo, saldo_inicial } = req.body;
    exigirCampos(req.body, ['nome']);
    const saldo = exigirNumeroPositivo(saldo_inicial ?? 0, 'saldo_inicial');

    const existe = db.prepare('SELECT id FROM contas WHERE id = ?').get(id);
    if (!existe) throw new AppError('Conta nao encontrada.', 404);

    db.prepare('UPDATE contas SET nome = ?, tipo = ?, saldo_inicial = ? WHERE id = ?')
      .run(nome, tipo || 'corrente', saldo, id);

    res.json({ mensagem: 'Conta atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const emUso = db.prepare('SELECT COUNT(*) as total FROM transacoes WHERE conta_id = ?').get(id);
    if (emUso.total > 0) {
      throw new AppError('Esta conta esta vinculada a transacoes e nao pode ser excluida.', 409);
    }
    db.prepare('DELETE FROM contas WHERE id = ?').run(id);
    res.json({ mensagem: 'Conta excluida com sucesso.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
