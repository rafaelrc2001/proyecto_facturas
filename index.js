// Lógica básica de login para usuario admin
document.addEventListener('DOMContentLoaded', function() {
	const loginForm = document.querySelector('.login-form');
	if (loginForm) {
		loginForm.addEventListener('submit', function(e) {
			e.preventDefault();
			const email = document.getElementById('email').value.trim();
			const password = document.getElementById('password').value.trim();
					const emailError = document.getElementById('email-error');
					const passwordError = document.getElementById('password-error');
					if (emailError) emailError.textContent = '';
					if (passwordError) passwordError.textContent = '';
					if (email === 'admin' && password === 'admin123') {
						window.location.href = '/modules/Dashboard/dashboard.html';
					} else {
						if (email !== 'admin' && emailError) {
							emailError.textContent = 'Usuario incorrecto';
						}
						if (password !== 'admin123' && passwordError) {
							passwordError.textContent = 'Contraseña incorrecta';
						}
					}
		});
	}
});
