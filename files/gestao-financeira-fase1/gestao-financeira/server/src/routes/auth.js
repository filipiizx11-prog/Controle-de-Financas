const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { exigirCampos, exigirEmailValido } = require('../utils/validate');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// POST /api/auth/registrar
// Cria um usuario (marido ou esposa) para acessar o sistema.
router.post('/registrar', (req, res, next) => {
  try {
    const { nome, email, senha } = req.body;
    exigirCampos(req.body, ['nome', 'email', 'senha']);
    exigirEmailValido(email);

    if (senha.length < 6) {
      throw new AppError('A senha precisa ter no minimo 6 caracteres.', 400);
    }

    const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existente) {
      throw new AppError('Ja existe um usuario cadastrado com este e-mail.', 409);
    }

    const senha_hash = bcrypt.hashSync(senha, 10);
    const info = db
      .prepare('INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)')
      .run(nome, email, senha_hash);

    const usuario = { id: info.lastInsertRowid, nome, email };
    const token = jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ mensagem: 'Usuario criado com sucesso.', token, usuario });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const { email, senha } = req.body;
    exigirCampos(req.body, ['email', 'senha']);

    const registro = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
    if (!registro) {
      throw new AppError('E-mail ou senha invalidos.', 401);
    }

    const senhaValida = bcrypt.compareSync(senha, registro.senha_hash);
    if (!senhaValida) {
      throw new AppError('E-mail ou senha invalidos.', 401);
    }

    const usuario = { id: registro.id, nome: registro.nome, email: registro.email };
    const token = jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ mensagem: 'Login realizado com sucesso.', token, usuario });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
