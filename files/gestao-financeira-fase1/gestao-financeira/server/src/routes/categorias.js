const express = require('express');
const db = require('../config/db');
const { exigirCampos, exigirEnum } = require('../utils/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
const TIPOS = ['entrada', 'saida'];

router.get('/', (req, res, next) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT * FROM categorias';
    const params = [];
    if (tipo) {
      exigirEnum(tipo, TIPOS, 'tipo');
      sql += ' WHERE tipo = ?';
      params.push(tipo);
    }
    sql += ' ORDER BY nome ASC';
    res.json(db.prepare(sql).all(...params));
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { nome, tipo, limite_mensal } = req.body;
    exigirCampos(req.body, ['nome', 'tipo']);
    exigirEnum(tipo, TIPOS, 'tipo');

    const info = db
      .prepare('INSERT INTO categorias (nome, tipo, limite_mensal) VALUES (?, ?, ?)')
      .run(nome, tipo, limite_mensal ?? null);

    res.status(201).json({ id: info.lastInsertRowid, nome, tipo, limite_mensal: limite_mensal ?? null });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, tipo, limite_mensal } = req.body;
    exigirCampos(req.body, ['nome', 'tipo']);
    exigirEnum(tipo, TIPOS, 'tipo');

    const existe = db.prepare('SELECT id FROM categorias WHERE id = ?').get(id);
    if (!existe) throw new AppError('Categoria nao encontrada.', 404);

    db.prepare('UPDATE categorias SET nome = ?, tipo = ?, limite_mensal = ? WHERE id = ?')
      .run(nome, tipo, limite_mensal ?? null, id);

    res.json({ mensagem: 'Categoria atualizada com sucesso.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const emUso = db.prepare('SELECT COUNT(*) as total FROM transacoes WHERE categoria_id = ?').get(id);
    if (emUso.total > 0) {
      throw new AppError('Esta categoria esta em uso em transacoes e nao pode ser excluida.', 409);
    }
    db.prepare('DELETE FROM categorias WHERE id = ?').run(id);
    res.json({ mensagem: 'Categoria excluida com sucesso.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
