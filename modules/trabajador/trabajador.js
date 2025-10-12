import { insertarTrabajador, obtenerTrabajadores, eliminarTrabajador, actualizarTrabajador } from '../../supabase/trabajador.js';
import { obtenerProyectos } from '../../supabase/proyecto.js';
import { supabase } from '../../supabase/db.js';
import { insertarAsignacion } from '../../supabase/asignar_proyecto.js';

let trabajadorEditandoId = null;
let trabajadoresList = [];
let proyectosList = [];
let trabajadorSeleccionadoId = null;
let proyectoSeleccionadoId = null;

async function cargarTrabajadores() {
  const { data: trabajadores, error } = await obtenerTrabajadores();
  const { data: asignaciones } = await supabase
    .from('asignar_proyecto')
    .select('id_trabajador, proyecto:proyecto(cliente)');

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4">Error al cargar trabajadores</td></tr>`;
    return;
  }

  if (trabajadores.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4">No hay trabajadores</td></tr>`;
    return;
  }

  trabajadores.forEach(trabajador => {
    // Busca la asignación de proyecto para este trabajador
    const asignacion = asignaciones?.find(a => a.id_trabajador === trabajador.id_trabajador);
    const cliente = asignacion?.proyecto?.cliente || '';

    tbody.innerHTML += `
      <tr>
        <td>${trabajador.nombre}</td>
        <td>${trabajador.puesto}</td>
        <td>${cliente}</td>
        <td>
          <div class="acciones-btns">
            <button class="btn-accion btn-editar" title="Editar" data-id="${trabajador.id_trabajador}"><i class="ri-edit-2-line"></i></button>
            <button class="btn-accion btn-eliminar" title="Eliminar" data-id="${trabajador.id_trabajador}"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  // Asignar eventos a los botones de eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // Obtén el botón aunque el clic sea en el ícono
      const button = e.currentTarget;
      const id = button.getAttribute('data-id');
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
    const button = e.currentTarget;
    const id = button.getAttribute('data-id');
    const trabajador = trabajadores.find(t => t.id_trabajador == id);
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
    selectTrabajador.innerHTML =
      `<option value="" disabled selected>Selecciona un encargado</option>` +
      trabajadores.map(t =>
        `<option value="${t.id_trabajador}">${t.nombre}</option>`
      ).join('');

    // Proyectos
    const { data: proyectos } = await obtenerProyectos();
    const selectProyecto = document.getElementById('selectProyecto');
    selectProyecto.innerHTML =
      `<option value="" disabled selected>Selecciona un proyecto</option>` +
      proyectos.map(p =>
        `<option value="${p.id_proyecto}">${p.nombre}</option>`
      ).join('');
  }

  // Guardar asignación
  document.getElementById('formAsignarProyecto').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!trabajadorSeleccionadoId || !proyectoSeleccionadoId) {
      alert('Selecciona un encargado y un proyecto válido.');
      return;
    }
    const { error } = await insertarAsignacion({ id_trabajador: trabajadorSeleccionadoId, id_proyecto: proyectoSeleccionadoId });
    if (error) {
      alert('Error al asignar: ' + error.message);
    } else {
      alert('Proyecto asignado correctamente');
      document.getElementById('modalAsignarProyecto').style.display = 'none';
      e.target.reset();
      trabajadorSeleccionadoId = null;
      proyectoSeleccionadoId = null;
    }
  });

  // Cargar datos para autocompletado
  async function cargarDatosAsignar() {
    const { data: trabajadores } = await obtenerTrabajadores();
    trabajadoresList = trabajadores || [];
    const { data: proyectos } = await obtenerProyectos();
    proyectosList = proyectos || [];
  }
  document.querySelector('.btn-asignar').addEventListener('click', () => {
    cargarDatosAsignar();
  });

  // Autocompletado para trabajador
  const inputTrabajador = document.getElementById('inputTrabajador');
  const listTrabajador = document.getElementById('listTrabajador');
  inputTrabajador.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listTrabajador.innerHTML = '';
    trabajadorSeleccionadoId = null;
    if (!valor) return;
    const sugerencias = trabajadoresList.filter(t => t.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t.nombre;
      div.onclick = function() {
        inputTrabajador.value = t.nombre;
        trabajadorSeleccionadoId = t.id_trabajador;
        listTrabajador.innerHTML = '';
      };
      listTrabajador.appendChild(div);
    });
  });

  // Autocompletado para proyecto
  const inputProyecto = document.getElementById('inputProyecto');
  const listProyecto = document.getElementById('listProyecto');
  inputProyecto.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listProyecto.innerHTML = '';
    proyectoSeleccionadoId = null;
    if (!valor) return;
    const sugerencias = proyectosList.filter(p => p.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(p => {
      const div = document.createElement('div');
      div.textContent = p.nombre;
      div.onclick = function() {
        inputProyecto.value = p.nombre;
        proyectoSeleccionadoId = p.id_proyecto;
        listProyecto.innerHTML = '';
      };
      listProyecto.appendChild(div);
    });
  });

  // Oculta sugerencias si se hace clic fuera
  document.addEventListener('click', function(e) {
    if (!listTrabajador.contains(e.target) && e.target !== inputTrabajador) listTrabajador.innerHTML = '';
    if (!listProyecto.contains(e.target) && e.target !== inputProyecto) listProyecto.innerHTML = '';
  });
});