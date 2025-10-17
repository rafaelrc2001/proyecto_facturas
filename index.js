// Lógica básica de login para usuario admin
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usuario = document.getElementById('email').value.trim();
            const contrasena = document.getElementById('password').value.trim();
            const passwordError = document.getElementById('password-error');
            if (passwordError) passwordError.textContent = '';

            try {
                const res = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, contrasena })
                });
                const data = await res.json();
                if (res.ok) {
                    // Guardar datos en localStorage
                    localStorage.setItem('user', JSON.stringify(data));
                    window.location.href = 'modules/Dashboard/dashboard.html';
                } else {
                    passwordError.textContent = data.error || 'Usuario o contraseña incorrecta';
                    setTimeout(() => { passwordError.textContent = ''; }, 2000);
                }
            } catch (err) {
                passwordError.textContent = 'Error de conexión';
                setTimeout(() => { passwordError.textContent = ''; }, 2000);
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
