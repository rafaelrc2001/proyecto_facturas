const express = require('express');
const router = express.Router();
const db = require('../db'); // tu conexión a MySQL
const { data: loginUser, error: errorLogin } = await supabase
  .from('login')
  .select('*')
  .eq('usuario', usuario)
  .eq('password', contrasena);

if (loginUser && loginUser.length > 0) {
  localStorage.setItem('user', JSON.stringify(loginUser[0]));
  window.location.href = '/modules/dashboard/dashboard.html';
  return;
}

module.exports = router;