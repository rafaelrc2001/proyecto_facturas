const express = require('express');
const router = express.Router();
const db = require('../db'); // tu conexión a MySQL

router.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;
  db.query(
    'SELECT id_trabajador, nombre, puesto FROM trabajador WHERE usuario = ? AND contrasena = ?',
    [usuario, contrasena],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Error en el servidor' });
      if (results.length === 0) return res.status(401).json({ error: 'Usuario o contraseña incorrecta' });
      res.json(results[0]);
    }
  );
});

module.exports = router;