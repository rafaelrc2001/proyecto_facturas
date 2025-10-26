import { supabase } from '../../supabase/db.js';

let registroEditando = null;
let proyectosNombres = [];
let registrosOriginales = [];
let proyectosInfo = []; // [{ id_proyecto, nombre }]

const REGISTROS_POR_PAGINA = 7;
let paginaActual = 1;
let registrosFiltrados = []; // Para guardar el resultado del filtro
let respuestasPreguntas = {};


// Obtén los nombres de proyectos al cargar la página
async function cargarProyectosNombres() {
  const idTrabajadorRaw = localStorage.getItem('id_trabajador');
  const idTrabajador = idTrabajadorRaw ? Number(idTrabajadorRaw) : null;
  const userRaw = localStorage.getItem('user');

  if (!userRaw) {
    proyectosInfo = [];
    proyectosNombres = [];
    return;
  }

  const user = JSON.parse(userRaw || '{}');

  try {
    // 🔥 CAMBIO: Si es trabajador, solo sus proyectos asignados
    if (idTrabajador && user.role === 'trabajador') {
      // Obtener proyectos asignados a este trabajador
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', idTrabajador);
      
      if (asignErr) throw asignErr;
      
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (ids.length === 0) {
        proyectosInfo = [];
        proyectosNombres = [];
        return;
      }
      
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      proyectosInfo = data || [];
    } else {
      // Admin: todos los proyectos
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final')
        .eq('visibilidad', true);
      proyectosInfo = data || [];
    }
    
    proyectosNombres = proyectosInfo.map(p => p.nombre);
  } catch (err) {
    console.error('Error cargando proyectos:', err);
    proyectosInfo = [];
    proyectosNombres = [];
  }
}
document.addEventListener('DOMContentLoaded', () => {
  if (!verificarSesion()) return;
  cargarProyectosNombres();
});

async function cargarRegistrosSupabase() {
  const { data, error } = await supabase
    .from('registro')
    .select('*');
  registrosOriginales = data || [];
  paginaActual = 1;
  mostrarRegistrosPaginados(registrosOriginales);
}

function mostrarRegistros(data) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay registros</td></tr>`;
    return;
  }

  data.forEach((registro, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${registro.fecha_cargo || ''}</td>
      <td>${registro.fecha_facturacion || ''}</td>
      <td>${registro.tipo || ''}</td>
      <td>${registro.pago || ''}</td>
      <td>${registro.folio || ''}</td>
      <td>${registro.establecimiento || ''}</td>
      <td>${registro.importe || ''}</td>
      <td>
        <button class="icon-btn ver" title="Ver" data-index="${index}"><i class="fas fa-eye"></i></button>
        <button class="icon-btn editar" title="Editar" data-index="${index}"><i class="fas fa-edit"></i></button>
        <button class="icon-btn eliminar" title="Eliminar" data-index="${index}"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });


  // Eventos para los botones
  tbody.querySelectorAll('.icon-btn.ver').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const registro = data[idx];
      if (registro.link) {
        window.open(registro.link, '_blank'); // Abre el link en una nueva pestaña
      } else {
        alert('No hay enlace disponible para este registro.');
      }
    });
  });

  // Abrir modal y llenar datos
  tbody.querySelectorAll('.icon-btn.editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const registro = data[idx];
      registroEditando = registro;

      // Llena los campos del nuevo modal
      document.getElementById('editar-fecha_cargo').value = registro.fecha_cargo || '';
      document.getElementById('editar-fecha_facturacion').value = registro.fecha_facturacion || '';
      document.getElementById('editar-tipo').value = registro.tipo || '';
      document.getElementById('editar-pago').value = registro.pago || '';
      document.getElementById('editar-folio').value = registro.folio || '';
      document.getElementById('editar-establecimiento').value = registro.establecimiento || '';
      document.getElementById('editar-importe').value = registro.importe || '';
      document.getElementById('editar-proyecto-autocomplete').value = obtenerNombreProyecto(registro.id_proyecto) || '';
      // Documento: no se puede previsualizar el archivo, solo subir uno nuevo

      document.getElementById('modal-editar-gasto').style.display = 'flex';
    });
  });

  tbody.querySelectorAll('.icon-btn.eliminar').forEach(btn => {
    btn.addEventListener('click', async function() {
      const idx = this.getAttribute('data-index');
      const registro = data[idx];
      if (confirm('¿Seguro que deseas eliminar este registro?')) {
        const { error } = await supabase
          .from('registro')
          .delete()
          .eq('id_registro', registro.id_registro);
        if (!error) {
          cargarRegistrosSupabase();
        } else {
          alert('Error al eliminar');
        }
      }
    });
  });

  // Contadores
  const total = data.length;
  const cfdi = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'cfdi').length;
  const sinComprobante = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'sin comprobante(ticket o nota)').length;

  document.getElementById('total-count').textContent = total;
  document.getElementById('cfdi-count').textContent = cfdi;
  document.getElementById('sin-comprobante-count').textContent = sinComprobante;
  document.getElementById('contador-registros').textContent = `Registros Totales: ${data.length}`;
}

function actualizarContadores() {
  const total = registrosFiltrados.length;
  const cfdi = registrosFiltrados.filter(r => r.tipo && r.tipo.toLowerCase() === 'cfdi').length;
  const sinComprobante = registrosFiltrados.filter(r => r.tipo && r.tipo.toLowerCase() === 'sin comprobante(ticket o nota)').length;

  document.getElementById('contador-total').textContent = total;
  document.getElementById('contador-cfdi').textContent = cfdi;
  document.getElementById('contador-sin-comprobante').textContent = sinComprobante;
}

function mostrarRegistrosPaginados(registros) {
  // Ordena por fecha_cargo descendente (más nueva primero)
  registros = [...registros].sort((a, b) => {
    // Si la fecha está en formato YYYY-MM-DD, esto funciona directo
    return new Date(b.fecha_cargo) - new Date(a.fecha_cargo);
  });

  registrosFiltrados = registros;
  const totalPaginas = Math.ceil(registros.length / REGISTROS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
  const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
  const fin = inicio + REGISTROS_POR_PAGINA;
  const registrosPagina = registros.slice(inicio, fin);
  mostrarRegistros(registrosPagina);

  // Actualiza los contadores con el total filtrado
  document.getElementById('total-count').textContent = registros.length;
  document.getElementById('cfdi-count').textContent = registros.filter(r => r.tipo && r.tipo.toLowerCase() === 'cfdi').length;
  document.getElementById('sin-comprobante-count').textContent = registros.filter(r => r.tipo && r.tipo.toLowerCase() === 'sin comprobante(ticket o nota)').length;

  document.getElementById('contador-registros').textContent = `Registros Totales: ${registros.length}`;
  renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
  const pagDiv = document.querySelector('.pagination');
  pagDiv.innerHTML = '';
  if (totalPaginas <= 1) return;

  // Botón anterior
  const btnPrev = document.createElement('button');
  btnPrev.textContent = 'Anterior';
  btnPrev.className = 'paginacion-btn';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      mostrarRegistrosPaginados(registrosFiltrados);
    }
  };
  pagDiv.appendChild(btnPrev);

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'paginacion-btn' + (i === paginaActual ? ' active' : '');
    btn.onclick = () => {
      paginaActual = i;
      mostrarRegistrosPaginados(registrosFiltrados);
    };
    pagDiv.appendChild(btn);
  }

  // Botón siguiente
  const btnNext = document.createElement('button');
  btnNext.textContent = 'Siguiente';
  btnNext.className = 'paginacion-btn';
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      mostrarRegistrosPaginados(registrosFiltrados);
    }
  };
  pagDiv.appendChild(btnNext);
}

// Cerrar modal





// Filtro por folio, establecimiento e importe
document.getElementById('registro-search').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = registrosOriginales.filter(r =>
    (r.pago && r.pago.toLowerCase().includes(valor)) || // Tipo de pago
    (r.establecimiento && r.establecimiento.toLowerCase().includes(valor)) || // Establecimiento
    (r.folio && r.folio.toLowerCase().includes(valor)) || // Folio
    (proyectosInfo.find(p => p.id_proyecto === r.id_proyecto && p.nombre.toLowerCase().includes(valor))) // Proyecto
  );
  paginaActual = 1;
  mostrarRegistrosPaginados(filtrados);
});

// Autocompletado
const proyectoInput = document.getElementById('proyecto-autocomplete');
const autocompleteList = document.getElementById('autocomplete-list');

proyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  autocompleteList.innerHTML = '';
  if (!valor) {
    paginaActual = 1;
    mostrarRegistrosPaginados(registrosOriginales);
    return;
  }
  const sugerencias = proyectosNombres.filter(n => n.toLowerCase().includes(valor));
  sugerencias.forEach(nombre => {
    const div = document.createElement('div');
    div.textContent = nombre;
    div.onclick = function() {
      proyectoInput.value = nombre;
      autocompleteList.innerHTML = '';
      filtrarPorProyecto(nombre);
    };
    autocompleteList.appendChild(div);
  });
});

// Filtrar registros por nombre de proyecto
function filtrarPorProyecto(nombreProyecto) {
  const filtrados = registrosOriginales.filter(r =>
    proyectosInfo.find(p => p.id_proyecto === r.id_proyecto && p.nombre === nombreProyecto)
  );
  paginaActual = 1;
  mostrarRegistrosPaginados(filtrados);
}

// Opcional: Oculta el autocompletado si se hace clic fuera
document.addEventListener('click', function(e) {
  if (!autocompleteList.contains(e.target) && e.target !== proyectoInput) {
    autocompleteList.innerHTML = '';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (!verificarSesion()) return;
  cargarRegistrosSupabase();
});

document.getElementById('descargar-csv').addEventListener('click', function() {
  //window.location.href = '/proyecto_facturas/modules/impresion/imprimir.html';
  window.location.href = '../impresion/imprimir.html';
});

document.getElementById('descargar-btn').addEventListener('click', function() {
  document.getElementById('modalPreguntas').style.display = 'flex';
});

// Guardar cambios al editar
document.getElementById('form-editar-gasto').onsubmit = async function(e) {
  e.preventDefault();
  if (!registroEditando) return;

  // Si se sube un nuevo documento, súbelo y obtén el link
  let documentoUrl = registroEditando.link;
  const fileInput = document.getElementById('editar-documentos');
  if (fileInput.files.length > 0) {
    documentoUrl = await subirDocumento(fileInput.files[0]); // Debes tener esta función igual que en "nuevo gasto"
  }

  // Busca el id_proyecto por nombre
  const nombreProyecto = document.getElementById('editar-proyecto-autocomplete').value;
  const proyecto = proyectosInfo.find(p => p.nombre === nombreProyecto);

  const cambios = {
    fecha_cargo: document.getElementById('editar-fecha_cargo').value,
    fecha_facturacion: document.getElementById('editar-fecha_facturacion').value,
    tipo: document.getElementById('editar-tipo').value,
    pago: document.getElementById('editar-pago').value,
    folio: document.getElementById('editar-folio').value,
    establecimiento: document.getElementById('editar-establecimiento').value,
    importe: document.getElementById('editar-importe').value,
    id_proyecto: proyecto ? proyecto.id_proyecto : null,
    link: documentoUrl
  };

  const { error } = await supabase
    .from('registro')
    .update(cambios)
    .eq('id_registro', registroEditando.id_registro);

  if (!error) {
    document.getElementById('modal-editar-gasto').style.display = 'none';
    cargarRegistrosSupabase();
  } else {
    alert('Error al guardar cambios');
  }
};

// Cerrar modal editar
document.getElementById('close-modal-editar').onclick = function() {
  document.getElementById('modal-editar-gasto').style.display = 'none';
};
document.getElementById('cancelar-modal-editar').onclick = function() {
  document.getElementById('modal-editar-gasto').style.display = 'none';
};

// Helper para obtener nombre de proyecto por id
function obtenerNombreProyecto(id_proyecto) {
  const proyecto = proyectosInfo.find(p => p.id_proyecto === id_proyecto);
  return proyecto ? proyecto.nombre : '';
}

const editarProyectoInput = document.getElementById('editar-proyecto-autocomplete');
const editarAutocompleteList = document.getElementById('editar-autocomplete-list');

// Al escribir en el input, muestra sugerencias de todos los proyectos
editarProyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  editarAutocompleteList.innerHTML = '';
  if (!valor) return;
  const sugerencias = proyectosNombres.filter(n => n.toLowerCase().includes(valor));
  sugerencias.forEach(nombre => {
    const div = document.createElement('div');
    div.textContent = nombre;
    div.onclick = function() {
      editarProyectoInput.value = nombre;
      editarAutocompleteList.innerHTML = '';
    };
    editarAutocompleteList.appendChild(div);
  });
});

// Opcional: Oculta el autocompletado si se hace clic fuera
document.addEventListener('click', function(e) {
  if (!editarAutocompleteList.contains(e.target) && e.target !== editarProyectoInput) {
    editarAutocompleteList.innerHTML = '';
  }
});

function normalizarPago(str) {
  return (str || '')
    .replace(/[\s\r\n\t]+/g, ' ') // reemplaza espacios, saltos de línea, tabulaciones por un solo espacio
    .trim()
    .replace(/\.$/, '')           // elimina punto final si existe
    .toLowerCase();
}

// Array de tipos de pago actualizados
const TIPOS_PAGO = [
  "PAGO EDENRED CON CFDI",
  "PAGO EDENRED SIN COMPROBANTE", 
  "RETIRO EDENRED CFDI",
  "RETIBO EDENRED SIN COMPROBANTE",
  "PAGO EFECTIVO CAJA CFDI",
  "PAGO EFECTIVO CAJA SIN COMPROBANTE",
  "PAGO TARJETA PERSONAL CON CFDI",
  "PAGO TARJETA PERSONAL SIN COMPROBANTE"
];

// Formatea fecha igual que imprimir.js
function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = meses[d.getMonth()];
  const año = String(d.getFullYear()).slice(-2);
  return `${dia}-${mes}-${año}`;
}

// Genera el HTML de impresión
function generarHTMLImpresion(registros, proyecto) {
  let html = `
    <div style="font-family:Montserrat,Roboto,sans-serif; color:#003B5C; padding:24px;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">

      <div>
          <h2 style="margin:0; font-size:1.5em;">Registros de Facturas y Tickets</h2>
          <div style="font-size:1em; color:#276080;">Sistema INXITE / Gestión de Gastos</div>
        </div>
      </div>
      ${proyecto ? `
        <table style="margin-bottom:24px; border-collapse:collapse;">
          <tr><td><strong>PROYECTO:</strong></td><td>${proyecto.nombre || ''}</td></tr>
          <tr><td><strong>CLIENTE:</strong></td><td>${proyecto.cliente || ''}</td></tr>
          <tr><td><strong>UBICACIÓN:</strong></td><td>${proyecto.ubicación || ''}</td></tr>
          <tr><td><strong>INICIO:</strong></td><td>${formatearFecha(proyecto.fecha_inicio)}</td></tr>
          <tr><td><strong>TERMINACIÓN:</strong></td><td>${formatearFecha(proyecto.fecha_final)}</td></tr>
        </table>
      ` : ''}
  `;

  let totalRegistros = 0;
  const tiposPagoNormalizados = TIPOS_PAGO.map(normalizarPago);

  TIPOS_PAGO.forEach(tipo => {
    const tipoNormalizado = normalizarPago(tipo);
    const registrosPorTipo = registros.filter(r =>
      normalizarPago(r.pago) === tipoNormalizado
    );
    if (registrosPorTipo.length > 0) {
      totalRegistros += registrosPorTipo.length;
      let totalImporte = 0;
      html += `
        <h3 style="margin-top:24px; color:#FF6F00;">${tipo}</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
          <thead>
            <tr style="background:#ececec;">
              <th style="padding:6px; border:1px solid #ececec;">Fecha de cargo</th>
              <th style="padding:6px; border:1px solid #ececec;">Fecha de Facturación</th>
              <th style="padding:6px; border:1px solid #ececec;">Tipo</th>
              <th style="padding:6px; border:1px solid #ececec;">Folio</th>
              <th style="padding:6px; border:1px solid #ececec;">Establecimiento</th>
              <th style="padding:6px; border:1px solid #ececec;">Importe</th>
            </tr>
          </thead>
          <tbody>
      `;
      registrosPorTipo.forEach(reg => {
        html += `
          <tr>
            <td style="padding:6px; border:1px solid #ececec;">${formatearFecha(reg.fecha_cargo)}</td>
            <td style="padding:6px; border:1px solid #ececec;">${formatearFecha(reg.fecha_facturacion)}</td>
            <td style="padding:6px; border:1px solid #ececec;">${reg.tipo || ''}</td>
            <td style="padding:6px; border:1px solid #ececec;">${reg.folio || ''}</td>
            <td style="padding:6px; border:1px solid #ececec;">${reg.establecimiento || ''}</td>
            <td style="padding:6px; border:1px solid #ececec;">${reg.importe || ''}</td>
          </tr>
        `;
        totalImporte += Number(reg.importe) || 0;
      });
      html += `
          </tbody>
        </table>
        <div style="font-weight:bold; color:#003B5C; margin-bottom:16px;">Total: ${totalImporte.toFixed(2)}</div>
      `;
    }
  });

  // Sección "Otros"
  const otrosRegistros = registros.filter(r =>
    !tiposPagoNormalizados.includes(
      normalizarPago(r.pago)
    )
  );
  if (otrosRegistros.length > 0) {
    totalRegistros += otrosRegistros.length;
    let totalImporteOtros = 0;
    html += `
      <h3 style="margin-top:24px; color:#FF6F00;">Otros</h3>
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px;">
        <thead>
          <tr style="background:#ececec;">
            <th style="padding:6px; border:1px solid #ececec;">Fecha de cargo</th>
            <th style="padding:6px; border:1px solid #ececec;">Fecha de Facturación</th>
            <th style="padding:6px; border:1px solid #ececec;">Tipo</th>
            <th style="padding:6px; border:1px solid #ececec;">Tipo de pago</th>
            <th style="padding:6px; border:1px solid #ececec;">Folio</th>
            <th style="padding:6px; border:1px solid #ececec;">Establecimiento</th>
            <th style="padding:6px; border:1px solid #ececec;">Importe</th>
          </tr>
        </thead>
        <tbody>
    `;
    otrosRegistros.forEach(reg => {
      html += `
        <tr>
          <td style="padding:6px; border:1px solid #ececec;">${formatearFecha(reg.fecha_cargo)}</td>
          <td style="padding:6px; border:1px solid #ececec;">${formatearFecha(reg.fecha_facturacion)}</td>
          <td style="padding:6px; border:1px solid #ececec;">${reg.tipo || ''}</td>
          <td style="padding:6px; border:1px solid #ececec;">${reg.pago || ''}</td>
          <td style="padding:6px; border:1px solid #ececec;">${reg.folio || ''}</td>
          <td style="padding:6px; border:1px solid #ececec;">${reg.establecimiento || ''}</td>
          <td style="padding:6px; border:1px solid #ececec;">${reg.importe || ''}</td>
        </tr>
      `;
      totalImporteOtros += Number(reg.importe) || 0;
    });
    html += `
        </tbody>
      </table>
      <div style="font-weight:bold; color:#003B5C; margin-bottom:16px;">Total: ${totalImporteOtros.toFixed(2)}</div>
    `;
  }

  html += `<div style="margin-top:24px; font-weight:bold;">Registros mostrados: ${totalRegistros}</div>`;
  html += `</div>`;
  return html;
}

// Evento para el botón de imprimir (flecha)
document.querySelector('.table-footer .btn').addEventListener('click', async function() {
  // Usa los registros filtrados actualmente
  let registros = registrosFiltrados.length ? registrosFiltrados : registrosOriginales;

  // Si hay filtro de proyecto, busca el proyecto
  let nombreProyecto = document.getElementById('proyecto-autocomplete').value.trim();
  let proyecto = null;
  if (nombreProyecto) {
    proyecto = proyectosInfo.find(p => p.nombre === nombreProyecto);
    registros = registros.filter(r => proyecto && r.id_proyecto === proyecto.id_proyecto);
  }

  // Genera el HTML de impresión
  const htmlImpresion = generarHTMLImpresion(registros, proyecto);

  // Inserta en el área oculta
  const printArea = document.getElementById('print-area');
  printArea.innerHTML = htmlImpresion;

  // Imprime solo el área generada
  const ventana = window.open('', '', 'width=900,height=700');
  ventana.document.write(`
    <html>
      <head>
        <title>Imprimir Registros</title>
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
        <style>
          body { font-family:Montserrat,Roboto,sans-serif; color:#003B5C; }
          table { border-collapse:collapse; width:100%; }
          th, td { border:1px solid #ececec; padding:6px; }
          th { background:#ececec; }
          h2, h3 { color:#003B5C; }
        </style>
      </head>
      <body>
        ${htmlImpresion}
      </body>
    </html>
  `);
  ventana.document.close();
  ventana.focus();
  ventana.print();
  ventana.close();
});

// Agregar función: verifica session solo por projectidadmin === '1'
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

// Ejemplo para dashboard.js
const user = JSON.parse(localStorage.getItem('user'));
if (user) {
    // Iniciales
    const initials = user.nombre.split(' ').map(n => n[0]).join('').toUpperCase();
    document.querySelector('.avatar').textContent = initials;
    document.querySelector('.name').textContent = user.nombre;
    document.querySelector('.role').textContent = user.puesto;
}



