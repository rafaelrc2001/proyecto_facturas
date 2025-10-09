// Abrir modal "Nuevo Trabajador"
document.querySelector('.btn-nuevo').addEventListener('click', () => {
  document.getElementById('modalNuevoTrabajador').style.display = 'flex';
});

// Cerrar modal "Nuevo Trabajador"
document.getElementById('cerrarModalNuevoTrabajador').addEventListener('click', () => {
  document.getElementById('modalNuevoTrabajador').style.display = 'none';
});

// Abrir modal "Asignar Proyecto"
document.querySelector('.btn-asignar').addEventListener('click', () => {
  document.getElementById('modalAsignarProyecto').style.display = 'flex';
});

// Cerrar modal "Asignar Proyecto"
document.getElementById('cerrarModalAsignarProyecto').addEventListener('click', () => {
  document.getElementById('modalAsignarProyecto').style.display = 'none';
});