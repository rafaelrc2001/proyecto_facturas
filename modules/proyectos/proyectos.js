import { insertarProyecto, obtenerProyectos } from '../../supabase/proyecto.js';

async function cargarProyectos() {
  const { data, error } = await obtenerProyectos();
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Error al cargar proyectos</td></tr>`;
    return;
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay proyectos</td></tr>`;
    return;
  }

  data.forEach(proyecto => {
    tbody.innerHTML += `
      <tr>
        <td>${proyecto.cliente}</td>
        <td>${proyecto.ubicación || ''}</td>
        <td>${proyecto.fecha_inicio || ''}</td>
        <td>${proyecto.fecha_final || ''}</td>
        <td>${proyecto.responsable || ''}</td>
        <td>
          <!-- Botones de acciones -->
        </td>
      </tr>
    `;
  });

  // Actualiza el contador de registros
  document.getElementById('contador-registros').textContent = data.length;
}

document.addEventListener('DOMContentLoaded', function() {
  cargarProyectos();

  const btnNuevo = document.querySelector('.btn-nuevo');
  const modal = document.getElementById('modal-nuevo-proyecto');
  const closeModal = document.getElementById('close-modal-nuevo');
  const cancelarModal = document.getElementById('cancelar-modal-nuevo');

  btnNuevo.addEventListener('click', function() {
    modal.style.display = 'flex';
  });

  closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  cancelarModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.getElementById('form-nuevo-proyecto').addEventListener('submit', async function(e) {
    e.preventDefault();
    const cliente = e.target.cliente.value;
    const nombre = e.target.nombre.value;
    const descripción = e.target.descripcion.value; // sin tilde aquí
    const ubicación = e.target.ubicacion.value;     // sin tilde aquí
    const fecha_inicio = e.target['fecha-inicio'].value;
    const fecha_final = e.target['fecha-fin'].value;

    const { error } = await insertarProyecto({ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final });
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Proyecto guardado correctamente');
      document.getElementById('modal-nuevo-proyecto').style.display = 'none';
      e.target.reset();
      cargarProyectos();
    }
  });
});