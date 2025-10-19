import { supabase } from '../../supabase/db.js';
import { insertarProyecto, obtenerProyectos, eliminarProyecto, actualizarProyecto } from '../../supabase/proyecto.js';
import { obtenerTrabajadores } from '../../supabase/trabajador.js';
import { asignarProyectoATrabajador } from '../../supabase/asignar_proyecto.js';
import { enviarDatosAsignacion } from '../../Js/correo.js';


let proyectosData = [];

const PROYECTOS_POR_PAGINA = 7;
let paginaActual = 1;
let proyectosFiltrados = [];

async function cargarProyectos() {
  // 1. Obtén todos los proyectos
  const { data: proyectos, error: errorProyectos } = await obtenerProyectos();
  // 2. Obtén todas las asignaciones y trabajadores
  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from('asignar_proyecto')
    .select('id_proyecto, trabajador:trabajador(id_trabajador, nombre)');

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (errorProyectos) {
    tbody.innerHTML = `<tr><td colspan="7">Error al cargar proyectos</td></tr>`;
    return;
  }
  if (!proyectos || proyectos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">No hay proyectos</td></tr>`;
    return;
  }

  proyectosData = proyectos.map(proyecto => ({
    ...proyecto,
    asignacion: asignaciones?.find(a => a.id_proyecto === proyecto.id_proyecto)
  }));

  mostrarProyectosPaginados(proyectosData);

  // Actualiza el contador de registros
  document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;

  // Asigna eventos a los botones editar DESPUÉS de crear las filas
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectos[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.ubicacion.value = proyecto.ubicación || '';
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
    //  form.responsable.value = proyecto.responsable || '';
      modal.style.display = 'flex';
      form.dataset.index = index;
    });
  });

  // Después de crear las filas en cargarProyectos()
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async function() {
      const index = this.parentElement.querySelector('.btn-editar').getAttribute('data-index');
      const proyecto = proyectos[index];
      if (confirm('¿Seguro que deseas eliminar este proyecto?')) {
        const { error } = await eliminarProyecto(proyecto.id_proyecto);
        if (error) {
          if (
            error.message &&
            error.message.includes('violates foreign key constraint')
          ) {
            mostrarAlertaRelacion();
          } else {
            alert('Error al eliminar: ' + error.message);
          }
        } else {
          alert('Proyecto eliminado correctamente');
          cargarProyectos();
        }
      }
    });
  });
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

  // Después de cargar las filas, asigna el evento a los botones editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectos[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      // Rellena el formulario con los datos del proyecto
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.ubicacion.value = proyecto.ubicación || '';
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
    //  form.responsable.value = proyecto.responsable || '';
      modal.style.display = 'flex';
      // Puedes guardar el id o index si lo necesitas para editar
      form.dataset.index = index;
    });
  });

  // Cerrar el modal de edición
  document.getElementById('close-modal-editar').addEventListener('click', function() {
    document.getElementById('modal-editar-proyecto').style.display = 'none';
  });

  // Opcional: cerrar al hacer click fuera del modal
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-editar-proyecto');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.querySelectorAll('#modal-nuevo-proyecto textarea, #modal-editar-proyecto textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });
});

function mostrarProyectosPaginados(proyectos) {
  proyectosFiltrados = proyectos;
  const totalPaginas = Math.ceil(proyectos.length / PROYECTOS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
  const inicio = (paginaActual - 1) * PROYECTOS_POR_PAGINA;
  const fin = inicio + PROYECTOS_POR_PAGINA;
  const proyectosPagina = proyectos.slice(inicio, fin);

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  proyectosPagina.forEach((proyecto, i) => {
    const responsable = proyecto.asignacion?.trabajador?.nombre || 'Sin asignar';
    tbody.innerHTML += `
      <tr>
        <td>${proyecto.cliente}</td>
        <td>${proyecto.nombre || ''}</td>
        <td>${proyecto.descripción || ''}</td>
        <td>${proyecto.ubicación || ''}</td>
        <td>${proyecto.fecha_inicio || ''}</td>
        <td>${proyecto.fecha_final || ''}</td>
        <td>${responsable}</td>
        <td>
          <div class="acciones-btns">
            <button class="btn-accion btn-editar" title="Editar" data-index="${i + inicio}"><i class="ri-edit-2-line"></i></button>
            <button class="btn-accion btn-eliminar" title="Eliminar" data-index="${i + inicio}"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;
  renderizarPaginacionProyectos(totalPaginas);

  // ASIGNA LOS EVENTOS DESPUÉS DE RENDERIZAR LA TABLA
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.ubicacion.value = proyecto.ubicación || '';
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
      modal.style.display = 'flex';
      form.dataset.index = index;
    };
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.onclick = async function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      if (confirm('¿Seguro que deseas eliminar este proyecto?')) {
        const { error } = await eliminarProyecto(proyecto.id_proyecto);
        if (error) {
          if (
            error.message &&
            error.message.includes('violates foreign key constraint')
          ) {
            mostrarAlertaRelacion();
          } else {
            alert('Error al eliminar: ' + error.message);
          }
        } else {
          alert('Proyecto eliminado correctamente');
          cargarProyectos();
        }
      }
    };
  });
}

function renderizarPaginacionProyectos(totalPaginas) {
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
      mostrarProyectosPaginados(proyectosFiltrados);
    }
  };
  pagDiv.appendChild(btnPrev);

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (i === paginaActual ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => {
      paginaActual = i;
      mostrarProyectosPaginados(proyectosFiltrados);
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
      mostrarProyectosPaginados(proyectosFiltrados);
    }
  };
  pagDiv.appendChild(btnNext);
}

// Agrega esta función para mostrar la alerta personalizada
function mostrarAlertaRelacion() {
  // Crea el modal si no existe
  let modal = document.getElementById('modal-relacion');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-relacion';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
      <div style="
        background:#fff;
        border-radius:14px;
        box-shadow:0 4px 24px rgba(0,59,92,0.12);
        padding:32px 32px 24px 32px;
        min-width:340px;
        max-width:420px;
        position:relative;
        display:flex;
        flex-direction:column;
        gap:18px;
        align-items:center;
      ">
        <span style="position:absolute;top:16px;right:16px;font-size:1.3em;cursor:pointer;color:#003B5C;" id="cerrar-modal-relacion">&times;</span>
        <h2 style="color:#FF6F00;font-family:'Montserrat',sans-serif;font-size:1.2rem;font-weight:700;">No se puede eliminar</h2>
        <div style="color:#003B5C;font-size:1em;text-align:center;">
          Este proyecto tiene relación en otras tablas.<br>
          Elimina primero las asignaciones relacionadas antes de eliminar este proyecto.
        </div>
        <button id="btn-cerrar-relacion" style="
          margin-top:18px;
          background:#FF6F00;
          color:#fff;
          border:none;
          border-radius:8px;
          padding:10px 22px;
          font-size:1em;
          font-family:'Montserrat',sans-serif;
          font-weight:600;
          cursor:pointer;
          transition:background 0.2s;
        ">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('cerrar-modal-relacion').onclick = cerrarModalRelacion;
    document.getElementById('btn-cerrar-relacion').onclick = cerrarModalRelacion;
    modal.onclick = function(e) {
      if (e.target === modal) cerrarModalRelacion();
    };
  }
  modal.style.display = 'flex';
}

function cerrarModalRelacion() {
  const modal = document.getElementById('modal-relacion');
  if (modal) modal.style.display = 'none';
}

// Filtro por cliente, proyecto y responsable
document.querySelector('.input-buscar').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = proyectosData.filter(p =>
    (p.cliente && p.cliente.toLowerCase().includes(valor)) ||
    (p.nombre && p.nombre.toLowerCase().includes(valor)) ||
   (p.descripción && p.descripción.toLowerCase().includes(valor)) || // <-- agrega esta línea
 
    (() => {
      const asignacion = p.asignacion || {};
      return asignacion.trabajador?.nombre?.toLowerCase().includes(valor);
    })()
  );
  paginaActual = 1;
  mostrarProyectosPaginados(filtrados);
});

// Agrega el evento submit para el formulario de edición
document.getElementById('form-editar-proyecto').addEventListener('submit', async function(e) {
  e.preventDefault();
  const index = e.target.dataset.index;
  const proyecto = proyectosData[index];
  const id = proyecto.id_proyecto;

  const cliente = e.target.cliente.value;
  const nombre = e.target.nombre.value;
  const ubicación = e.target.ubicacion.value;
  const fecha_inicio = e.target.fecha_inicio.value;
  const fecha_final = e.target.fecha_final.value;
  // const descripción = e.target.descripcion.value;

  const { error } = await actualizarProyecto(id, { cliente, nombre, /*descripción,*/ ubicación, fecha_inicio, fecha_final });
  if (error) {
    alert('Error al actualizar: ' + error.message);
  } else {
    alert('Proyecto actualizado correctamente');
    document.getElementById('modal-editar-proyecto').style.display = 'none';
    cargarProyectos();
  }
});

let trabajadoresList = [];
let proyectosList = [];
let trabajadorSeleccionadoId = null;
let proyectoSeleccionadoId = null;

// Mostrar el modal al hacer clic en el botón "Asignar proyecto"
document.addEventListener('DOMContentLoaded', () => {
  const btnAsignar = document.querySelector('.btn-asignar');
  const modalAsignar = document.getElementById('modalAsignarProyecto');
  const cerrarModal = document.getElementById('cerrarModalAsignarProyecto');
  const inputTrabajador = document.getElementById('inputTrabajador');
  const listTrabajador = document.getElementById('listTrabajador');
  const inputProyecto = document.getElementById('inputProyecto');
  const listProyecto = document.getElementById('listProyecto');
  const formAsignar = document.getElementById('formAsignarProyecto');

  btnAsignar.addEventListener('click', async () => {
    modalAsignar.style.display = 'flex';
    await cargarDatosAsignar();
  });

  cerrarModal.addEventListener('click', () => {
    modalAsignar.style.display = 'none';
    formAsignar.reset();
    trabajadorSeleccionadoId = null;
    proyectoSeleccionadoId = null;
    listTrabajador.innerHTML = '';
    listProyecto.innerHTML = '';
  });

  // Opcional: cerrar el modal si se hace clic fuera del contenido
  modalAsignar.addEventListener('click', function(e) {
    if (e.target === modalAsignar) {
      modalAsignar.style.display = 'none';
      formAsignar.reset();
      trabajadorSeleccionadoId = null;
      proyectoSeleccionadoId = null;
      listTrabajador.innerHTML = '';
      listProyecto.innerHTML = '';
    }
  });

  async function cargarDatosAsignar() {
    // Cargar trabajadores
    const { data: trabajadores } = await obtenerTrabajadores();
    trabajadoresList = trabajadores || [];
    // Cargar proyectos
    const { data: proyectos } = await obtenerProyectos();
    proyectosList = proyectos || [];
  }

  // Autocompletado para trabajador
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

  // Guardar asignación
  formAsignar.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!trabajadorSeleccionadoId || !proyectoSeleccionadoId) {
      alert('Selecciona un encargado y un proyecto válido.');
      return;
    }
    // Usa la nueva función
    const { error } = await asignarProyectoATrabajador(proyectoSeleccionadoId, trabajadorSeleccionadoId);
    if (error) {
      alert('Error al asignar: ' + error.message);
    } else {
      enviarDatosAsignacion(trabajadorSeleccionadoId, proyectoSeleccionadoId);
      alert('Proyecto asignado correctamente');
      modalAsignar.style.display = 'none';
      formAsignar.reset();
      trabajadorSeleccionadoId = null;
      proyectoSeleccionadoId = null;
      listTrabajador.innerHTML = '';
      listProyecto.innerHTML = '';
      cargarProyectos(); // Actualiza la tabla
    }
  });
});

const idTrabajador = localStorage.getItem('id_trabajador');
if (idTrabajador) {
  console.log(`ID del trabajador autenticado: ${idTrabajador}`);
}

// Muestra id del admin (si existe)
const projectidadmin = localStorage.getItem('projectidadmin');
if (projectidadmin) {
  console.log(`ID del admin autenticado (projectidadmin): ${projectidadmin}`);
}