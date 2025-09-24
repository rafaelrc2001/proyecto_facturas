// Lógica para el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Sesión cerrada.');
            // Redirección relativa a la raíz del proyecto
            window.location.href = '../../index.html';
        });
    }
});

// Lógica de navegación para el menú lateral
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.sidebar-nav li');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const link = item.querySelector('a');
            if (link && link.getAttribute('href') === '#') {
                e.preventDefault();
            }
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            if (link) {
                // Redirecciones relativas desde cualquier subcarpeta
                if (link.textContent.includes('Dashboard')) {
                    window.location.href = 'dashboard.html';
                } else if (link.textContent.includes('Tickets y Facturas')) {
                    window.location.href = '../registros/registros.html';
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
