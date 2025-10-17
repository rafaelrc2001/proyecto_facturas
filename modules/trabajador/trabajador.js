import { insertarTrabajador, obtenerTrabajadores, eliminarTrabajador, actualizarTrabajador } from '../../supabase/trabajador.js';
import { supabase } from '../../supabase/db.js';

let trabajadorEditandoId = null;
let trabajadoresList = [];
let asignacionesList = [];
let proyectosList = [];
const TRABAJADORES_POR_PAGINA = 7;
let paginaActual = 1;
let trabajadoresFiltrados = [];

async function cargarTrabajadores() {
  const { data: trabajadores, error } = await obtenerTrabajadores();
  trabajadoresList = trabajadores || [];

  // Obtén todas las asignaciones de proyecto
  const { data: asignaciones } = await supabase
    .from('asignar_proyecto')
    .select('id_trabajador, id_proyecto');
  asignacionesList = asignaciones || [];

  // Obtén todos los proyectos (para obtener el nombre del cliente)
  const { data: proyectos } = await supabase
    .from('proyecto')
    .select('id_proyecto, cliente');
  proyectosList = proyectos || [];

  mostrarTrabajadoresPaginados(trabajadoresList);
}

function mostrarTrabajadoresPaginados(trabajadores) {
  trabajadoresFiltrados = trabajadores;
  const totalPaginas = Math.ceil(trabajadores.length / TRABAJADORES_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
  const inicio = (paginaActual - 1) * TRABAJADORES_POR_PAGINA;
  const fin = inicio + TRABAJADORES_POR_PAGINA;
  const trabajadoresPagina = trabajadores.slice(inicio, fin);

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (trabajadoresPagina.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay trabajadores</td></tr>`;
    return;
  }

  trabajadoresPagina.forEach(trabajador => {
    tbody.innerHTML += `
      <tr>
       <td>${trabajador.id_empleado}</td>
        <td>${trabajador.nombre}</td>
        <td>${trabajador.puesto}</td>
        <td>${trabajador.correo}</td>
        <td>${trabajador.usuario}</td>
        <td>
          <div class="acciones-btns">
            <button class="btn-accion btn-editar" title="Editar" data-id="${trabajador.id_trabajador}"><i class="ri-edit-2-line"></i></button>
            <button class="btn-accion btn-eliminar" title="Eliminar" data-id="${trabajador.id_trabajador}"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById('contador-registros').textContent = `Registros Totales: ${trabajadores.length}`;

  renderizarPaginacionTrabajadores(totalPaginas);

  // Asignar eventos a los botones de eliminar
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async (e) => {
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
        document.querySelector('[name="correo"]').value = trabajador.correo || '';
        document.querySelector('[name="usuario"]').value = trabajador.usuario || '';
        document.querySelector('[name="contrasena"]').value = trabajador.contrasena || '';
      }
    });
  });
}

function renderizarPaginacionTrabajadores(totalPaginas) {
  const pagDiv = document.querySelector('.pagination');
  pagDiv.innerHTML = '';
  if (totalPaginas <= 1) return;

  // Botón anterior
    const btnPrev = document.createElement('button');
  btnPrev.className = 'pagination-btn';
  btnPrev.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      mostrarTrabajadoresPaginados(trabajadoresFiltrados);
    }
  };
  pagDiv.appendChild(btnPrev);

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = (i === paginaActual) ? 'active' : '';
    btn.onclick = () => {
      paginaActual = i;
      mostrarTrabajadoresPaginados(trabajadoresFiltrados);
    };
    pagDiv.appendChild(btn);
  }

  // Botón siguiente
  const btnNext = document.createElement('button');
  btnNext.className = 'pagination-btn';
  btnNext.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      mostrarTrabajadoresPaginados(trabajadoresFiltrados);
    }
  };
  pagDiv.appendChild(btnNext);
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
    document.querySelector('[name="correo"]').value = '';
    document.querySelector('[name="usuario"]').value = '';
    document.querySelector('[name="contrasena"]').value = '';
  });

  // Cerrar modal "Nuevo Trabajador"
  document.getElementById('cerrarModalNuevoTrabajador').addEventListener('click', () => {
    document.getElementById('modalNuevoTrabajador').style.display = 'none';
  });

  document.getElementById('formNuevoTrabajador').addEventListener('submit', async function(e) {
    e.preventDefault();
    const nombre = e.target.nombre.value;
    const puesto = e.target.puesto.value;
    const idEmpleado = e.target.idEmpleado.value;
    const correo = e.target.correo.value;
    const usuario = e.target.usuario.value;
    const contrasena = e.target.contrasena.value;

    let error;
    if (trabajadorEditandoId) {
      ({ error } = await actualizarTrabajador(trabajadorEditandoId, { nombre, puesto, idEmpleado, correo, usuario, contrasena }));
      trabajadorEditandoId = null;
    } else {
      ({ error } = await insertarTrabajador({ nombre, puesto, idEmpleado, correo, usuario, contrasena }));
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

  // Filtro de búsqueda
  document.querySelector('.input-buscar').addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    const filtrados = trabajadoresList.filter(t =>
      t.nombre.toLowerCase().includes(valor) ||
      t.puesto.toLowerCase().includes(valor) ||
      (t.correo && t.correo.toLowerCase().includes(valor)) ||
      (t.usuario && t.usuario.toLowerCase().includes(valor)) ||
      (t.id_empleado && t.id_empleado.toString().toLowerCase().includes(valor))
    );
    paginaActual = 1;
    mostrarTrabajadoresPaginados(filtrados);
  });

  const idTrabajador = localStorage.getItem('id_trabajador');
  if (idTrabajador) {
    console.log(`ID del trabajador autenticado: ${idTrabajador}`);
  }
});