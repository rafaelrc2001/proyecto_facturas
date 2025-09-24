// Lógica para el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', function() {
	const logoutBtn = document.querySelector('.logout-btn');
	if (logoutBtn) {
		logoutBtn.addEventListener('click', function(e) {
			e.preventDefault();
			// Aquí puedes agregar la lógica real de logout
			alert('Sesión cerrada.');
			window.location.href = '/index.html';
		});
	}
});
// Lógica de navegación para el menú lateral
document.addEventListener('DOMContentLoaded', function() {
	const menuItems = document.querySelectorAll('.sidebar-nav li');
	menuItems.forEach(item => {
		item.addEventListener('click', function(e) {
			// Evita el comportamiento por defecto si el enlace es '#'
			const link = item.querySelector('a');
			if (link && link.getAttribute('href') === '#') {
				e.preventDefault();
			}
			// Quitar clase active de todos
			menuItems.forEach(i => i.classList.remove('active'));
			// Agregar clase active al seleccionado
			item.classList.add('active');
			// Navegación básica
			if (link) {
				if (link.textContent.includes('Dashboard')) {
					window.location.href = '/modules/Dashboard/dashboard.html';
				} else if (link.textContent.includes('Tickets y Facturas')) {
					window.location.href = '/modules/registros/registros.html';
				}
			}
		});
	});
});
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('compact');
        });
    }
});
