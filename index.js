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

            // Consulta a Supabase
            const { data, error } = await supabase
                .from('trabajador')
                .select('id_trabajador, nombre, puesto')
                .eq('usuario', usuario)
                .eq('contrasena', contrasena)
                .single();

            if (error || !data) {
                passwordError.textContent = 'Usuario o contraseña incorrecta';
                setTimeout(() => { passwordError.textContent = ''; }, 2000);
            } else {
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = 'modules/Dashboard/dashboard.html';
            }
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
