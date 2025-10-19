import { supabase } from '../../supabase/db.js';
import { getIdTrabajador, isAdmin } from '../../supabase/auth.js';

let gastosOriginales = [];

const GASTOS_POR_PAGINA = 7;
let paginaActual = 1;
let gastosFiltrados = [];

async function cargarGastos() {
  console.log('[gastos] iniciar cargarGastos', { href: window.location.href });
  const idRaw = getIdTrabajador();
  const idTrabajador = idRaw ? Number(idRaw) : null;
  const admin = typeof isAdmin === 'function' ? isAdmin() : false;
  console.log('[gastos] idTrabajadorRaw:', idRaw, '=> Number:', idTrabajador, 'isAdmin:', admin);

  try {
    if (idTrabajador && !admin) {
      // 1) obtener proyectos asignados
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', idTrabajador);

      if (asignErr) {
        console.error('[gastos] error al consultar asignar_proyecto:', asignErr);
        throw asignErr;
      }

      const ids = (asigns || []).map(a => Number(a.id_proyecto));
      console.log('[gastos] proyectos asignados ids (raw):', ids);

      // --- NUEVO: limitar a proyectos visibles ---
      const { data: visibleProjs, error: visErr } = await supabase
        .from('proyecto')
        .select('id_proyecto')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);

      if (visErr) {
        console.error('[gastos] error al consultar proyectos visibles:', visErr);
        throw visErr;
      }

      const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
      console.log('[gastos] proyectos visibles asignados ids:', visibleIds);

      if (!visibleIds.length) {
        console.log('[gastos] no hay proyectos asignados y visibles -> no mostrar gastos');
        gastosOriginales = [];
        paginaActual = 1;
        mostrarGastosPaginados(gastosOriginales);
        return;
      }

      // usa visibleIds para la consulta a registro
      const { data, error } = await supabase
        .from('registro')
        .select('*')
        .in('id_proyecto', visibleIds)
        .order('fecha_cargo', { ascending: false });

      console.log('[gastos] registro query result:', { error, totalReturned: (data||[]).length, sample: (data||[]).slice(0,5) });
      if (error) throw error;

      // doble comprobación cliente: eliminar registros sin id_proyecto o fuera de la lista
      gastosOriginales = (data || []).filter(r => {
        // log si no tiene id_proyecto para detectar datos sucios
        if (r.id_proyecto === null || r.id_proyecto === undefined) {
          console.warn('[gastos] registro sin id_proyecto detectado:', r);
          return false;
        }
        return ids.includes(Number(r.id_proyecto));
      });

      console.log('[gastos] despues filtro cliente total:', gastosOriginales.length, 'unique proyectos in results:', Array.from(new Set(gastosOriginales.map(x=>Number(x.id_proyecto)))));

      paginaActual = 1;
      mostrarGastosPaginados(gastosOriginales);

      // marca que ya cargó (debug para detectar sobreescrituras posteriores)
      window.__gastos_last_loaded_at = Date.now();
      return;
    }

    // admin / fallback: traer todos
    const { data, error } = await supabase
      .from('registro')
      .select('*')
      .order('fecha_cargo', { ascending: false });

    if (error) throw error;
    console.log('[gastos] fallback: total registros (todos):', (data||[]).length);
    gastosOriginales = data || [];
    paginaActual = 1;
    mostrarGastosPaginados(gastosOriginales);
    window.__gastos_last_loaded_at = Date.now();
  } catch (err) {
    console.error('[gastos] excepción cargarGastos:', err);
  }
}

// Añade logs en mostrarGastosPaginados
function mostrarGastosPaginados(gastos) {
  gastosFiltrados = gastos;
  console.log('[gastos] mostrando pagina, registros en esta llamada:', gastos.length, 'primeros 5 id_proyecto:', gastos.slice(0,5).map(g=>g.id_proyecto));
  const totalPaginas = Math.ceil(gastos.length / GASTOS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = 1;
  const inicio = (paginaActual - 1) * GASTOS_POR_PAGINA;
  const fin = inicio + GASTOS_POR_PAGINA;
  const gastosPagina = gastos.slice(inicio, fin);

  const tbody = document.getElementById('table-body');
  if (tbody) tbody.innerHTML = '';

  if (!gastosPagina.length) {
    tbody.innerHTML = `<tr><td colspan="8">No hay gastos</td></tr>`;
    document.getElementById('contador-registros').textContent = 'Registros Totales: 0';
    renderizarPaginacionGastos(totalPaginas);
    return;
  }

  gastosPagina.forEach(gasto => {
    tbody.innerHTML += `
      <tr>
        <td>${gasto.fecha_cargo || ''}</td>
        <td>${gasto.fecha_facturacion || ''}</td>
        <td>${gasto.tipo || ''}</td>
        <td>${gasto.pago || ''}</td>
        <td>${gasto.folio || ''}</td>
        <td>${gasto.establecimiento || ''}</td>
        <td>${gasto.importe || ''}</td>
        <td>
          <div class="acciones-btns">
            <button class="btn-accion btn-editar" title="Editar"><i class="ri-edit-2-line"></i></button>
            <button class="btn-accion btn-eliminar" title="Eliminar"><i class="ri-delete-bin-line"></i></button>
            <button class="btn-accion btn-ver" title="Ver Documento"><i class="ri-eye-line"></i></button>
          </div>
        </td>
      </tr>
    `;
  });

  const contador = document.getElementById('contador-registros');
  if (contador) contador.textContent = `Registros Totales: ${gastos.length}`;

  renderizarPaginacionGastos(totalPaginas);
  asignarEventosGastos();
}

function renderizarPaginacionGastos(totalPaginas) {
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
      mostrarGastosPaginados(gastosFiltrados);
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
      mostrarGastosPaginados(gastosFiltrados);
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
      mostrarGastosPaginados(gastosFiltrados);
    }
  };
  pagDiv.appendChild(btnNext);
}

// Filtro por folio y establecimiento
document.querySelector('.input-buscar').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = gastosOriginales.filter(g =>
    (g.pago && g.pago.toLowerCase().includes(valor)) || // Tipo de pago
    (g.establecimiento && g.establecimiento.toLowerCase().includes(valor)) || // Establecimiento
    (g.folio && g.folio.toLowerCase().includes(valor)) || // Folio
     (g.tipo && g.tipo.toLowerCase().includes(valor)) || // <-- Nuevo filtro por tipo
    (proyectosInfo.find(p => p.id_proyecto === g.id_proyecto && p.nombre.toLowerCase().includes(valor))) // Proyecto
  );
  paginaActual = 1;
  mostrarGastosPaginados(filtrados);
});

let proyectosInfo = []; // [{ id_proyecto, nombre }]
let proyectoSeleccionadoId = null;

// Cargar proyectos al abrir el modal
async function cargarProyectosInfo() {
  try {
    const idTrabajador = getIdTrabajador();
    if (idTrabajador && !isAdmin()) {
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) throw asignErr;
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (ids.length === 0) {
        proyectosInfo = [];
        return;
      }
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      proyectosInfo = data || [];
    } else {
      const { data } = await supabase.from('proyecto').select('id_proyecto, nombre').eq('visibilidad', true);
      proyectosInfo = data || [];
    }
  } catch (err) {
    console.error('Error cargando proyectos (gastos):', err);
    proyectosInfo = [];
  }
}

document.querySelector('.btn-nuevo').addEventListener('click', async () => {
  await cargarProyectosInfo();
  document.getElementById('modal-nuevo-gasto').style.display = 'flex';
  proyectoSeleccionadoId = null;
  document.getElementById('proyecto-autocomplete').value = '';
});

// Autocompletado
const proyectoInput = document.getElementById('proyecto-autocomplete');
const autocompleteList = document.getElementById('autocomplete-list');

proyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  autocompleteList.innerHTML = '';
  proyectoSeleccionadoId = null;
  if (!valor) return;
  const sugerencias = proyectosInfo.filter(p => p.nombre.toLowerCase().includes(valor));
  sugerencias.forEach(p => {
    const div = document.createElement('div');
    div.textContent = p.nombre;
    div.onclick = function() {
      proyectoInput.value = p.nombre;
      proyectoSeleccionadoId = p.id_proyecto;
      autocompleteList.innerHTML = '';
    };
    autocompleteList.appendChild(div);
  });
});

// Oculta sugerencias si se hace clic fuera
document.addEventListener('click', function(e) {
  if (!autocompleteList.contains(e.target) && e.target !== proyectoInput) {
    autocompleteList.innerHTML = '';
  }
});

// Cerrar el modal
document.getElementById('close-modal-nuevo').onclick = function() {
  document.getElementById('modal-nuevo-gasto').style.display = 'none';
};
document.getElementById('cancelar-modal-nuevo').onclick = function() {
  document.getElementById('modal-nuevo-gasto').style.display = 'none';
};

// Función para insertar gasto en Supabase
async function insertarGasto(gasto) {
  const { error } = await supabase
    .from('registro')
    .insert([gasto]);
  return error;
}

// Subir archivo a Supabase Storage
// Subir archivo a Supabase Storage
async function subirDocumento(file) {
  const nombreArchivo = `${Date.now()}_${file.name}`;
  const { data, error } = await supabase.storage
    .from('gastos') // <-- usa el nombre real de tu bucket aquí
    .upload(nombreArchivo, file);

  if (error) return null;
  // Obtén la URL pública
  return supabase.storage.from('gastos').getPublicUrl(nombreArchivo).data.publicUrl;
}

// Evento submit del formulario
document.getElementById('form-nuevo-gasto').addEventListener('submit', async function(e) {
  e.preventDefault();

  const fileInput = document.getElementById('documentos');
  let documentoUrl = null;
  if (fileInput.files.length > 0) {
    documentoUrl = await subirDocumento(fileInput.files[0]);
    if (!documentoUrl) {
      alert('Error al subir el documento');
      return;
    }
  }

  // Obtén los datos del formulario
  const gasto = {
    fecha_cargo: document.getElementById('fecha_cargo').value,
    fecha_facturacion: document.getElementById('fecha_facturacion').value,
    tipo: document.getElementById('tipo').value,
    pago: document.getElementById('pago').value,
    folio: document.getElementById('folio').value,
    establecimiento: document.getElementById('establecimiento').value,
    importe: document.getElementById('importe').value,
    link: documentoUrl, // Guarda la URL en la columna 'link'
    id_proyecto: proyectoSeleccionadoId
  };

  if (!gasto.id_proyecto) {
    alert('Selecciona un proyecto válido.');
    return;
  }

  const error = await insertarGasto(gasto);

  if (error) {
    alert('Error al guardar gasto');
  } else {
    alert('Gasto guardado correctamente');
    document.getElementById('modal-nuevo-gasto').style.display = 'none';
    e.target.reset();
    cargarGastos(); // Actualiza la tabla
  }
});

let gastoEditando = null;
let gastoProyectoEditandoId = null;

// Editar
function asignarEventosGastos() {
  const tbody = document.getElementById('table-body');
  // Ver documento
  tbody.querySelectorAll('.btn-ver').forEach((btn, idx) => {
    btn.onclick = function() {
      const gasto = gastosFiltrados[(paginaActual - 1) * GASTOS_POR_PAGINA + idx];
      if (gasto.link) {
        window.open(gasto.link, '_blank');
      } else {
        alert('No hay enlace disponible para este gasto.');
      }
    };
  });

  // Editar
  tbody.querySelectorAll('.btn-editar').forEach((btn, idx) => {
    btn.onclick = async function() {
      const gasto = gastosFiltrados[(paginaActual - 1) * GASTOS_POR_PAGINA + idx];
      gastoEditando = gasto;

      // <--- AGREGA ESTO
      await cargarProyectosInfo();

      // Llena el modal de edición
      document.getElementById('gasto-editar-fecha_cargo').value = gasto.fecha_cargo || '';
      document.getElementById('gasto-editar-fecha_facturacion').value = gasto.fecha_facturacion || '';
      document.getElementById('gasto-editar-tipo').value = gasto.tipo || '';
      document.getElementById('gasto-editar-pago').value = gasto.pago || '';
      document.getElementById('gasto-editar-folio').value = gasto.folio || '';
      document.getElementById('gasto-editar-establecimiento').value = gasto.establecimiento || '';
      document.getElementById('gasto-editar-importe').value = gasto.importe || '';

      // Proyecto autocompletado
      const nombreProyecto = obtenerNombreProyecto(gasto.id_proyecto) || '';
      document.getElementById('gasto-editar-proyecto-autocomplete').value = nombreProyecto;
      gastoProyectoEditandoId = gasto.id_proyecto || null;

      document.getElementById('modal-editar-gasto').style.display = 'flex';
    };
  });

  // Eliminar
  tbody.querySelectorAll('.btn-eliminar').forEach((btn, idx) => {
    btn.onclick = async function() {
      const gasto = gastosFiltrados[(paginaActual - 1) * GASTOS_POR_PAGINA + idx];
      if (confirm('¿Seguro que deseas eliminar este gasto?')) {
        const { error } = await supabase
          .from('registro')
          .delete()
          .eq('id_registro', gasto.id_registro);
        if (!error) {
          cargarGastos();
        } else {
          alert('Error al eliminar');
        }
      }
    };
  });
}

// Autocompletado para proyectos en edición
const gastoProyectoInput = document.getElementById('gasto-editar-proyecto-autocomplete');
const gastoAutocompleteList = document.getElementById('gasto-editar-autocomplete-list');

gastoProyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  gastoAutocompleteList.innerHTML = '';
  gastoProyectoEditandoId = null;
  if (!valor) return;
  const sugerencias = proyectosInfo.filter(p => p.nombre.toLowerCase().includes(valor));
  sugerencias.forEach(p => {
    const div = document.createElement('div');
    div.textContent = p.nombre;
    div.onclick = function() {
      gastoProyectoInput.value = p.nombre;
      gastoProyectoEditandoId = p.id_proyecto;
      gastoAutocompleteList.innerHTML = '';
    };
    gastoAutocompleteList.appendChild(div);
  });
});

document.addEventListener('click', function(e) {
  if (!gastoAutocompleteList.contains(e.target) && e.target !== gastoProyectoInput) {
    gastoAutocompleteList.innerHTML = '';
  }
});

// Guardar cambios al editar gasto
document.getElementById('gasto-form-editar-gasto').onsubmit = async function(e) {
  e.preventDefault();
  if (!gastoEditando) return;

  let documentoUrl = gastoEditando.link;
  const fileInput = document.getElementById('gasto-editar-documentos');
  if (fileInput.files.length > 0) {
    documentoUrl = await subirDocumento(fileInput.files[0]);
  }

  const cambios = {
    fecha_cargo: document.getElementById('gasto-editar-fecha_cargo').value,
    fecha_facturacion: document.getElementById('gasto-editar-fecha_facturacion').value,
    tipo: document.getElementById('gasto-editar-tipo').value,
    pago: document.getElementById('gasto-editar-pago').value,
    folio: document.getElementById('gasto-editar-folio').value,
    establecimiento: document.getElementById('gasto-editar-establecimiento').value,
    importe: document.getElementById('gasto-editar-importe').value,
    id_proyecto: gastoProyectoEditandoId,
    link: documentoUrl
  };

  const { error } = await supabase
    .from('registro')
    .update(cambios)
    .eq('id_registro', gastoEditando.id_registro);

  if (!error) {
    document.getElementById('modal-editar-gasto').style.display = 'none';
    cargarGastos();
  } else {
    alert('Error al guardar cambios');
  }
};

// Cerrar el modal de edición con los nuevos IDs
document.getElementById('gasto-close-modal-editar').onclick = function() {
  document.getElementById('modal-editar-gasto').style.display = 'none';
};
document.getElementById('gasto-cancelar-modal-editar').onclick = function() {
  document.getElementById('modal-editar-gasto').style.display = 'none';
};

// Helper para obtener nombre de proyecto por id
function obtenerNombreProyecto(id_proyecto) {
  const proyecto = proyectosInfo.find(p => p.id_proyecto === id_proyecto);
  return proyecto ? proyecto.nombre : '';
}

document.addEventListener('DOMContentLoaded', cargarGastos);

const idTrabajador = localStorage.getItem('id_trabajador');
if (idTrabajador) {
  console.log(`ID del trabajador autenticado: ${idTrabajador}`);
}

console.log('[gastos.js] archivo cargado', { location: window.location.href, now: new Date().toISOString() });

// Rellenar avatar/nombre del usuario en el header (seguro si faltan selectores)
document.addEventListener('DOMContentLoaded', () => {
  try {
    const userRaw = localStorage.getItem('user');
    if (!userRaw) return;
    const user = JSON.parse(userRaw);

    const avatarEl = document.querySelector('.avatar') || document.querySelector('.user-avatar');
    const nameEl = document.querySelector('.name') || document.querySelector('.user-name');
    const roleEl = document.querySelector('.role') || document.querySelector('.user-role');

    if (user && avatarEl) {
      const nombre = (user.nombre || '').trim();
      const initials = nombre ? nombre.split(' ').map(n => n[0]).join('').toUpperCase() : '';
      avatarEl.textContent = initials;
    }
    if (user && nameEl) nameEl.textContent = user.nombre || '';
    if (user && roleEl) roleEl.textContent = user.puesto || '';
  } catch (err) {
    console.warn('gastos.js: no se pudo renderizar usuario:', err);
  }
});