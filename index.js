console.log('index.js executing - debug');
import { supabase } from './supabase/db.js';

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.querySelector('.login-form');
  if (!loginForm) return;

  // Mostrar/ocultar contraseña (mismo scope)
  const toggleBtn = document.querySelector('.toggle-password');
  const passwordInput = document.getElementById('password');
  if (toggleBtn && passwordInput) {
      toggleBtn.innerHTML = '<i class="ri-eye-off-line"></i>';
      toggleBtn.addEventListener('click', function() {
          const isPassword = passwordInput.type === 'password';
          passwordInput.type = isPassword ? 'text' : 'password';
          toggleBtn.innerHTML = isPassword
              ? '<i class="ri-eye-line"></i>'
              : '<i class="ri-eye-off-line"></i>';
      });
  }

  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const usuario = (document.getElementById('email') || {}).value?.trim();
    const contrasena = (document.getElementById('password') || {}).value?.trim();
    const passwordError = document.getElementById('password-error');
    if (passwordError) passwordError.textContent = '';

    console.log('Attempt login:', { usuario, contrasena });

    if (!usuario || !contrasena) {
      if (passwordError) passwordError.textContent = 'Usuario y contraseña son requeridos';
      return;
    }

    try {
      // 1) Buscar en trabajador (traer fila y comparar en JS)
      const { data: trabRows, error: trabErr } = await supabase
        .from('trabajador')
        .select('id_trabajador, nombre, usuario, contrasena')
        .eq('usuario', usuario);

      console.log('trabajador query result:', { trabErr, trabRows });

      if (trabErr) throw trabErr;

      if (trabRows && trabRows.length > 0) {
        const row = trabRows[0];
        console.log('found trabajador row:', row);
        // comparar en JS (útil para debugging; no para producción si hay hashing)
        if (row.contrasena === contrasena) {
          localStorage.setItem('user', JSON.stringify({ id: row.id_trabajador, nombre: row.nombre, role: 'trabajador' }));
          localStorage.setItem('id_trabajador', String(row.id_trabajador));
          window.location.href = '/../Usuarios/Dashboard/dashboard.html';
          return;
        } else {
          console.warn('Password mismatch for trabajador (value in DB shown above). If it is hashed you must use backend/Supabase Auth.');
          if (passwordError) passwordError.textContent = 'Contraseña incorrecta';
          return;
        }
      }

      // 2) Buscar en login (admin)
      console.log('Consulta login (usuario):', usuario);
      const { data: adminRows, error: adminErr } = await supabase
        .from('login')
        .select('id, usuario, password')
        .eq('usuario', usuario);
      console.log('login table query result:', { adminErr, adminRows });

      if (adminErr) throw adminErr;

      if (adminRows && adminRows.length > 0) {
        const a = adminRows[0];
        if (a.password === contrasena) {
          localStorage.setItem('user', JSON.stringify({ id: a.id, usuario: a.usuario, role: 'admin' }));
          localStorage.removeItem('id_trabajador');
          window.location.href = '/../../modules/dashboard/dashboard.html';
          return;
        } else {
          if (passwordError) passwordError.textContent = 'Contraseña incorrecta';
          return;
        }
      }

      if (passwordError) passwordError.textContent = 'Usuario no encontrado';
    } catch (err) {
      console.error('Login error:', err);
      if (passwordError) passwordError.textContent = 'Error al conectar con Supabase';
    }
  });
});
