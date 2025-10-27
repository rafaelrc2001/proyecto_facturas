import { supabase } from '../../supabase/db.js';

let gastosOriginales = [];
let filtroTipoActual = '';

const GASTOS_POR_PAGINA = 7;
let paginaActual = 1;
let gastosFiltrados = [];

async function cargarGastos() {
  const { data, error } = await supabase
    .from('registro')
    .select('*')
    .order('fecha_facturacion', { ascending: false });

  if (error) {
    alert('Error al cargar gastos');
    return;
  }

  gastosOriginales = data || [];
  paginaActual = 1;
  mostrarGastosPaginados(gastosOriginales);
}

function mostrarGastosPaginados(gastos) {
  gastosFiltrados = gastos;
  const totalPaginas = Math.ceil(gastos.length / GASTOS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
  const inicio = (paginaActual - 1) * GASTOS_POR_PAGINA;
  const fin = inicio + GASTOS_POR_PAGINA;
  const gastosPagina = gastos.slice(inicio, fin);

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

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

  document.getElementById('contador-registros').textContent = `Registros Totales: ${gastos.length}`;
  renderizarPaginacionGastos(totalPaginas);

  // Asigna los eventos de editar/eliminar
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
function aplicarFiltros() {
  const valorBusqueda = document.querySelector('.input-buscar').value.trim().toLowerCase();
  
  let filtrados = gastosOriginales.filter(gasto => {
    // Filtro por búsqueda de texto
    const coincideBusqueda = !valorBusqueda || 
      (gasto.pago && gasto.pago.toLowerCase().includes(valorBusqueda)) ||
      (gasto.establecimiento && gasto.establecimiento.toLowerCase().includes(valorBusqueda)) ||
      (gasto.folio && gasto.folio.toLowerCase().includes(valorBusqueda)) ||
      (gasto.tipo && gasto.tipo.toLowerCase().includes(valorBusqueda)) ||
      (proyectosInfo.find(p => p.id_proyecto === gasto.id_proyecto && p.nombre.toLowerCase().includes(valorBusqueda)));
    
    // Filtro por tipo (nuevo)
    const coincideTipo = !filtroTipoActual || gasto.tipo === filtroTipoActual;
    
    return coincideBusqueda && coincideTipo;
  });
  
  paginaActual = 1;
  mostrarGastosPaginados(filtrados);
}
let proyectosInfo = []; // [{ id_proyecto, nombre }]
let proyectoSeleccionadoId = null;

// Agregar: función que verifica solo projectidadmin === '1'
function verificarSesion() {
  const projectidadmin = localStorage.getItem('projectidadmin');
  if (!projectidadmin || projectidadmin !== '1') {
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

// Cargar proyectos al abrir el modal
async function cargarProyectosInfo() {
  const { data } = await supabase.from('proyecto').select('id_proyecto, nombre');
  proyectosInfo = data || [];
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

document.addEventListener('DOMContentLoaded', () => {
  if (!verificarSesion()) return;
  cargarGastos();
  
  // Event listeners para filtros
  const inputBuscar = document.querySelector('.input-buscar');
  const filtroTipo = document.getElementById('filtro-tipo');
  
  if (inputBuscar) {
    inputBuscar.addEventListener('input', aplicarFiltros);
  }
  
  if (filtroTipo) {
    filtroTipo.addEventListener('change', function() {
      filtroTipoActual = this.value;
      aplicarFiltros();
    });
  }
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