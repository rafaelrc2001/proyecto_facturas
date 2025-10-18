import { supabase } from './supabase/db.js';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usuario = document.getElementById('email').value.trim();
            const contrasena = document.getElementById('password').value.trim();
            const passwordError = document.getElementById('password-error');
            if (passwordError) passwordError.textContent = '';

            // Consulta en trabajador
            const { data: trabajador, error: errorTrabajador } = await supabase
                .from('trabajador')
                .select('id_trabajador, nombre, puesto')
                .eq('usuario', usuario)
                .eq('contrasena', contrasena);

            if (trabajador && trabajador.length > 0) {
                localStorage.setItem('user', JSON.stringify(trabajador[0]));
                localStorage.setItem('id_trabajador', trabajador[0].id_trabajador);
                window.location.href = '/usuarios/dashboard/dashboard.html';
                return;
            }

            // Consulta en login
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

            // Si no existe en ninguna tabla
            passwordError.textContent = 'Usuario o contraseña incorrecta';
            setTimeout(() => { passwordError.textContent = ''; }, 2000);
        });
    }
});

// Mostrar/ocultar contraseña
document.addEventListener('DOMContentLoaded', function() {
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
});
