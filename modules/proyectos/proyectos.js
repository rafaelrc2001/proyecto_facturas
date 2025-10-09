import { insertarProyecto } from '../../supabase/proyecto.js';

document.addEventListener('DOMContentLoaded', function() {
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
    const descripcion = e.target.descripcion.value;
    const ubicacion = e.target.ubicacion.value;
    const fecha_inicio = e.target['fecha-inicio'].value;
    const fecha_fin = e.target['fecha-fin'].value;

    const { error } = await insertarProyecto({ cliente, nombre, descripcion, ubicacion, fecha_inicio, fecha_fin });
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Proyecto guardado correctamente');
      document.getElementById('modal-nuevo-proyecto').style.display = 'none';
      e.target.reset();
      // Aquí puedes recargar la tabla si lo necesitas
    }
  });
});