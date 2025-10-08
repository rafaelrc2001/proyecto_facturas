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

    // Submenú animado con click
    const submenuToggles = document.querySelectorAll(".submenu-toggle");
    submenuToggles.forEach(toggle => {
        toggle.addEventListener("click", function(e) {
            e.preventDefault();
            const parent = toggle.closest(".has-submenu");
            parent.classList.toggle("open");
        });
    });

    // Abrir submenú automáticamente según la URL
    const path = window.location.pathname;
    const registrarMenu = document.querySelector('.has-submenu');
    if (registrarMenu) {
        if (
            path.includes('/proyectos/proyectos.html') ||
            path.includes('/trabajador/trabajador.html')
        ) {
            registrarMenu.classList.add('open');
        }
        // Marcar activo en submenú
        const proyectoLink = registrarMenu.querySelector('a[href*="proyectos.html"]');
        const trabajadorLink = registrarMenu.querySelector('a[href*="trabajador.html"]');
        if (proyectoLink) proyectoLink.classList.remove('active');
        if (trabajadorLink) trabajadorLink.classList.remove('active');
        if (path.includes('/proyectos/proyectos.html') && proyectoLink) {
            proyectoLink.classList.add('active');
        }
        if (path.includes('/trabajador/trabajador.html') && trabajadorLink) {
            trabajadorLink.classList.add('active');
        }
    }

    // Botón para colapsar sidebar
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('compact');
        });
    }
});
