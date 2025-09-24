// Lógica para el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Sesión cerrada.');
            window.location.href = '../../index.html';
        });
    }

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
                const path = window.location.pathname;
                // Si estamos en Dashboard
                if (link.textContent.includes('Tickets y Facturas')) {
                    if (path.includes('/modules/Dashboard/')) {
                        window.location.href = '../registros/registros.html';
                    } else {
                        window.location.href = 'registros.html';
                    }
                } else if (link.textContent.includes('Dashboard')) {
                    if (path.includes('/modules/registros/')) {
                        window.location.href = '../Dashboard/dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }
            }
        });
    });

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('compact');
        });
    }
});
