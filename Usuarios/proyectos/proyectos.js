import { supabase } from '../../supabase/db.js';
import { obtenerTrabajadores } from '../../supabase/trabajador.js';
import { getIdTrabajador, isAdmin } from '../../supabase/auth.js';
 

let proyectosData = [];

const PROYECTOS_POR_PAGINA = 7;
let paginaActual = 1;
let proyectosFiltrados = [];

// Verifica sesión por id_trabajador en localStorage
function verificarSesion() {
  const idTrabajador = localStorage.getItem('id_trabajador');
  if (!idTrabajador) {
    const body = document.body;
    Array.from(body.children).forEach(el => el.style.display = 'none');
    const aviso = document.createElement('div');
    aviso.id = 'login-warning';
    aviso.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;padding:1rem;font-size:1.25rem;';
    aviso.textContent = 'Por favor inicie sesión';
    body.appendChild(aviso);
    return false;
  }
  return true;
}

async function cargarProyectos() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const idTrabajador = getIdTrabajador();
  try {
    let proyectos = [];

    // Si es trabajador (no admin) cargar solo proyectos asignados a este trabajador
    if (idTrabajador && !isAdmin()) {
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) throw asignErr;
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (!ids.length) {
        tbody.innerHTML = `<tr><td colspan="7">No hay proyectos</td></tr>`;
        document.getElementById('contador-registros').textContent = 'Registros Totales: 0';
        proyectosData = [];
        return;
      }

      const { data, error } = await supabase
        .from('proyecto')
        .select('*')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      if (error) throw error;
      proyectos = data || [];
    } else {
      // admin u otros: mantiene comportamiento original (proyectos visibles)
      const { data, error } = await supabase
        .from('proyecto')
        .select('*')
        .eq('visibilidad', true);
      if (error) throw error;
      proyectos = data || [];
    }

    // Obtener asignaciones (solo para los proyectos listados) para mostrar responsable
    const proyectoIds = proyectos.map(p => p.id_proyecto);
    const { data: asignaciones, error: asignError } = await supabase
      .from('asignar_proyecto')
      .select('id_proyecto, trabajador:trabajador(id_trabajador, nombre)')
      .in('id_proyecto', proyectoIds);
    if (asignError) throw asignError;

    proyectosData = proyectos.map(p => ({
      ...p,
      asignacion: (asignaciones || []).find(a => a.id_proyecto === p.id_proyecto)
    }));

    mostrarProyectosPaginados(proyectosData);
    document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    tbody.innerHTML = `<tr><td colspan="7">Error al cargar proyectos</td></tr>`;
  }
}



document.addEventListener('DOMContentLoaded', function() {
  if (!verificarSesion()) return;
  cargarProyectos();

  // Cerrar el modal de edición
  const closeEditar = document.getElementById('close-modal-editar');
  if (closeEditar) {
    closeEditar.addEventListener('click', function() {
      document.getElementById('modal-editar-proyecto').style.display = 'none';
    });
  }

  // Auto-resize para textareas dentro del modal de editar (si existen)
  document.querySelectorAll('#modal-editar-proyecto textarea').forEach(textarea => {
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
      
      </tr>
    `;
  });

  document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;
  renderizarPaginacionProyectos(totalPaginas);

  // ASIGNA LOS EVENTOS DESPUÉS DE RENDERIZAR LA TABLA
;

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
    (p.descripción && p.descripción.toLowerCase().includes(valor)) ||
    (() => {
      const asignacion = p.asignacion || {};
      return asignacion.trabajador?.nombre?.toLowerCase().includes(valor);
    })()
  );
  paginaActual = 1;
  mostrarProyectosPaginados(filtrados);
});

const idTrabajador = localStorage.getItem('id_trabajador');
if (idTrabajador) {
  console.log(`ID del trabajador autenticado: ${idTrabajador}`);
}

// (Se eliminó logging de admin; solo se usa id_trabajador)

// Rellenar avatar y nombre de usuario SIN alterar la carga de la tabla
(function renderUsuarioSinInterferir() {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const userRaw = localStorage.getItem('user');
      if (!userRaw) return; // no hacer nada si no hay usuario

      const user = JSON.parse(userRaw);
      const nombreCompleto = (user.nombre || user.name || '').trim();

      // Selecciona elementos existentes (no crear/ocultar nada)
      const avatarEl = document.querySelector('.avatar') || document.querySelector('.user-avatar');
      const nameEl = document.querySelector('.name') || document.querySelector('.user-name') || document.querySelector('.logo-text');

      if (avatarEl && nombreCompleto) {
        const initials = nombreCompleto.split(' ').map(p => p[0] || '').join('').toUpperCase().slice(0,2);
        avatarEl.textContent = initials;
      }
      if (nameEl && nombreCompleto) nameEl.textContent = nombreCompleto;
      if (roleEl && (user.puesto || user.role)) roleEl.textContent = user.puesto || user.role;
    } catch (e) {
      console.warn('renderUsuarioSinInterferir:', e);
    }
  });
})();