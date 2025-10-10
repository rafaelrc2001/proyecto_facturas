import { insertarTrabajador, obtenerTrabajadores, eliminarTrabajador, actualizarTrabajador } from '../../supabase/trabajador.js';
import { obtenerProyectos } from '../../supabase/proyecto.js';
import { insertarAsignacion } from '../../supabase/asignar_proyecto.js';

let trabajadorEditandoId = null;

async function cargarTrabajadores() {
  const { data, error } = await obtenerTrabajadores();
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar trabajadores</td></tr>`;
    return;
  }

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No hay trabajadores</td></tr>`;
    return;
  }

  data.forEach(trabajador => {
    tbody.innerHTML += `
      <tr>
        <td>${trabajador.nombre}</td>
        <td>${trabajador.puesto}</td>
        <td>${trabajador.cliente || ''}</td>
        <td>
          <button class="btn-editar" data-id="${trabajador.id_trabajador}">Editar</button>
          <button class="btn-eliminar" data-id="${trabajador.id_trabajador}">Eliminar</button>
        </td>
      </tr>
    `;
  });

  // Asignar eventos a los botones de eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('¿Seguro que deseas eliminar este trabajador?')) {
        const { error } = await eliminarTrabajador(id);
        if (error) {
          alert('Error al eliminar: ' + error.message);
        } else {
          cargarTrabajadores();
        }
      }
    });
  });

  // Asignar eventos a los botones de editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const trabajador = data.find(t => t.id_trabajador == id);
      if (trabajador) {
        trabajadorEditandoId = id;
        document.getElementById('modalNuevoTrabajador').style.display = 'flex';
        document.querySelector('[name="nombre"]').value = trabajador.nombre;
        document.querySelector('[name="puesto"]').value = trabajador.puesto;
        document.querySelector('[name="idEmpleado"]').value = trabajador.id_empleado || '';
      }
    });
  });
}

// Llama la función al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  cargarTrabajadores();

  // Abrir modal "Nuevo Trabajador"
  document.querySelector('.btn-nuevo').addEventListener('click', () => {
    trabajadorEditandoId = null;
    document.getElementById('modalNuevoTrabajador').style.display = 'flex';
    document.querySelector('[name="nombre"]').value = '';
    document.querySelector('[name="puesto"]').value = '';
    document.querySelector('[name="idEmpleado"]').value = '';
  });

  // Cerrar modal "Nuevo Trabajador"
  document.getElementById('cerrarModalNuevoTrabajador').addEventListener('click', () => {
    document.getElementById('modalNuevoTrabajador').style.display = 'none';
  });

  // Abrir modal "Asignar Proyecto"
  document.querySelector('.btn-asignar').addEventListener('click', () => {
    document.getElementById('modalAsignarProyecto').style.display = 'flex';
    llenarSelectsAsignarProyecto();
  });

  // Cerrar modal "Asignar Proyecto"
  document.getElementById('cerrarModalAsignarProyecto').addEventListener('click', () => {
    document.getElementById('modalAsignarProyecto').style.display = 'none';
  });

  document.getElementById('formNuevoTrabajador').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nombre = e.target.nombre.value;
    const puesto = e.target.puesto.value;
    const idEmpleado = e.target.idEmpleado.value;

    let error;
    if (trabajadorEditandoId) {
      ({ error } = await actualizarTrabajador(trabajadorEditandoId, { nombre, puesto, idEmpleado }));
      trabajadorEditandoId = null;
    } else {
      ({ error } = await insertarTrabajador({ nombre, puesto, idEmpleado }));
    }

    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Trabajador guardado correctamente');
      document.getElementById('modalNuevoTrabajador').style.display = 'none';
      e.target.reset();
      cargarTrabajadores();
    }
  });

  async function llenarSelectsAsignarProyecto() {
    // Trabajadores
    const { data: trabajadores } = await obtenerTrabajadores();
    const selectTrabajador = document.getElementById('selectTrabajador');
    selectTrabajador.innerHTML = trabajadores.map(t =>
      `<option value="${t.id_trabajador}">${t.nombre}</option>`
    ).join('');

    // Proyectos
    const { data: proyectos } = await obtenerProyectos();
    const selectProyecto = document.getElementById('selectProyecto');
    selectProyecto.innerHTML = proyectos.map(p =>
      `<option value="${p.id_proyecto}">${p.nombre}</option>`
    ).join('');
  }

  // Guardar asignación
  document.getElementById('formAsignarProyecto').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id_trabajador = document.getElementById('selectTrabajador').value;
    const id_proyecto = document.getElementById('selectProyecto').value;

    const { error } = await insertarAsignacion({ id_trabajador, id_proyecto });
    if (error) {
      alert('Error al asignar: ' + error.message);
    } else {
      alert('Proyecto asignado correctamente');
      document.getElementById('modalAsignarProyecto').style.display = 'none';
      e.target.reset();
    }
  });
});