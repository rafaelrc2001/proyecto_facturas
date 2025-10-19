import { supabase } from '../../supabase/db.js';

// Tipos de pago para separar las tablas
const tiposPago = [
  "Pagos con tarjeta facturados.",
  "Pagos con tarjeta tickets",
  "Pagos con efectivo retiro tarjeta facturados.",
  "Pagos con efectivo retiro tarjeta tickets.",
  "Pagos efectivo retiro tarjeta sin comprobante",
  "Pagos efectivo (caja) tickets",
  "Pago efectivo (caja) sin comprobante"
];

let proyectosInfo = [];
let proyectosNombres = [];
let registrosOriginales = [];

// Cargar proyectos y registros al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await cargarProyectosNombres();
  await cargarRegistrosSupabase();
});

// Cargar nombres de proyectos
async function cargarProyectosNombres() {
  const idTrabajador = localStorage.getItem('id_trabajador');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  try {
    if (idTrabajador && user.role === 'trabajador') {
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
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
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final')
        .eq('visibilidad', true);
      proyectosInfo = data || [];
    }
  } catch (err) {
    console.error('Error cargando proyectos (imprimir):', err);
    proyectosInfo = [];
  }
  proyectosNombres = proyectosInfo.map(p => p.nombre);
}

// Cargar registros
async function cargarRegistrosSupabase() {
  const { data } = await supabase.from('registro').select('*');
  registrosOriginales = data || [];
  mostrarTablasPorProyecto(""); // Muestra todo al inicio
}

// Autocompletado de proyectos
const proyectoInput = document.getElementById('imprimir-proyecto-autocomplete');
const autocompleteList = document.getElementById('imprimir-autocomplete-list');

proyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  autocompleteList.innerHTML = '';
  if (!valor) {
    mostrarTablasPorProyecto("");
    return;
  }
  const sugerencias = proyectosNombres.filter(n => n.toLowerCase().includes(valor));
  sugerencias.forEach(nombre => {
    const div = document.createElement('div');
    div.textContent = nombre;
    div.onclick = function() {
      proyectoInput.value = nombre;
      autocompleteList.innerHTML = '';
      mostrarTablasPorProyecto(nombre);
    };
    autocompleteList.appendChild(div);
  });
});

// Oculta el autocompletado si se hace clic fuera
document.addEventListener('click', function(e) {
  if (!autocompleteList.contains(e.target) && e.target !== proyectoInput) {
    autocompleteList.innerHTML = '';
  }
});

// Renderiza las tablas separadas por tipo de pago
function mostrarTablasPorProyecto(nombreProyecto) {
  const container = document.getElementById('imprimir-table-container');
  container.innerHTML = '';

  // Mostrar información del proyecto arriba de la tabla
  const infoContainer = document.getElementById('imprimir-proyecto-info');
  infoContainer.innerHTML = '';

  let registrosFiltrados = registrosOriginales;
  let proyecto = null;

  if (nombreProyecto) {
    proyecto = proyectosInfo.find(p => p.nombre === nombreProyecto);
    console.log('Proyecto seleccionado:', proyecto);
    if (proyecto) {
      registrosFiltrados = registrosOriginales.filter(r => r.id_proyecto === proyecto.id_proyecto);

      // Mostrar datos del proyecto
      infoContainer.innerHTML = `
  <h2 style="text-align:center; color:#FF6F00; margin-bottom:18px;">Listado de Facturas y Tickets</h2>
  <hr style="border:1px solid #FF6F00; margin-bottom:18px;">
 
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
    <div style="flex:1;">
      <table style="font-size:1em;">
        <tr>
          <td><strong>NOMBRE DEL PROYECTO:</strong></td>
          <td>${proyecto.nombre || ''}</td>
        </tr>
        <tr>
          <td><strong>CLIENTE:</strong></td>
          <td>${proyecto.cliente || ''}</td>
        </tr>
        <tr>
          <td><strong>UBICACIÓN DE LA OBRA:</strong></td>
          <td>${proyecto.ubicación || ''}</td>
        </tr>
        <tr>
          <td><strong>FECHA DE INICIO:</strong></td>
          <td>${formatearFecha(proyecto.fecha_inicio)}</td>
        </tr>
        <tr>
          <td><strong>FECHA DE TERMINACIÓN:</strong></td>
          <td>${formatearFecha(proyecto.fecha_final)}</td>
        </tr>
      </table>
    </div>
    <div style="flex:0 0 180px; text-align:right;">
      <img src="../../img/inxite.png" alt="Logo Inxite" style="max-width:160px;">
    </div>
  </div>
       `;
    } else {
      registrosFiltrados = [];
      infoContainer.innerHTML = '';
    }
  } else {
    infoContainer.innerHTML = `
      <h2 style="text-align:center; color:#FF6F00; margin-bottom:18px;">Listado de Facturas y Tickets</h2>
      <hr style="border:1px solid #FF6F00; margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div style="flex:1;">
          <span style="font-size:1.1em;">Mostrando todos los proyectos</span>
        </div>
        <div style="flex:0 0 180px; text-align:right;">
          <img src="../../img/inxite.png" alt="Logo Inxite" style="max-width:160px;">
        </div>
      </div>
    `;
  }

  let totalRegistros = 0;

  tiposPago.forEach(tipo => {
    const tipoNormalizado = tipo.replace(/\s+/g, ' ').trim().toLowerCase();
    const registrosPorTipo = registrosFiltrados.filter(r =>
      r.pago && r.pago.replace(/\s+/g, ' ').trim().toLowerCase() === tipoNormalizado
    );
    if (registrosPorTipo.length > 0) {
      totalRegistros += registrosPorTipo.length;
      let tablaHTML = `
        <h4 class="imprimir-titulo-tipo">${tipo}</h4>
        <table class="imprimir-subtabla">
          <thead>
            <tr>
              <th>Fecha de cargo</th>
              <th>Fecha de Facturación</th>
              <th>Tipo</th>
              <th>Folio</th>
              <th>Establecimiento</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
      `;
      let totalImporte = 0;
      registrosPorTipo.forEach(reg => {
        tablaHTML += `
          <tr>
            <td>${reg.fecha_cargo || ''}</td>
            <td>${reg.fecha_facturacion || ''}</td>
            <td>${reg.tipo || ''}</td>
            <td>${reg.folio || ''}</td>
            <td>${reg.establecimiento || ''}</td>
            <td>${formatoMoneda(reg.importe) || ''}</td>
          </tr>
        `;
        totalImporte += Number(reg.importe) || 0;
      });
      tablaHTML += `
    </tbody>
  </table>
  <div class="imprimir-total">Total: ${formatoMoneda(totalImporte)}</div>
      `;
      container.innerHTML += tablaHTML;
    }
  });

  // Suma total de todos los importes mostrados
  const totalGeneral = registrosFiltrados.reduce((acc, reg) => acc + (Number(reg.importe) || 0), 0);

  // Muestra el total general debajo de todas las tablas
  container.innerHTML += `
    <div class="imprimir-total-general" style="font-weight:bold; color:#FF6F00; margin-top:24px; font-size:1.2em;">
      Total general de importes: ${formatoMoneda(totalGeneral)}
    </div>
  `;

  const respuestasHTML = buildRespuestasHTML();

  container.innerHTML += respuestasHTML;

  // Actualiza el contador de registros
  document.getElementById('imprimir-contador-registros').textContent = `Registros mostrados: ${totalRegistros}`;
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  // Ejemplo: 04-ago-25
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = meses[d.getMonth()];
  const año = String(d.getFullYear()).slice(-2);
  return `${dia}-${mes}-${año}`;
}

// Función para formatear importe a moneda
function formatoMoneda(valor) {
  return '$' + Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Botón descargar CSV (descarga todos los registros mostrados)
document.getElementById('imprimir-descargar-csv').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('modalPreguntas').style.display = 'flex';
});

let respuestasPreguntas = respuestasPreguntas || {}; // ya existía, reafirmamos
function buildRespuestasHTML() {
  if (!respuestasPreguntas || Object.keys(respuestasPreguntas).length === 0) return '';
  return Object.entries(respuestasPreguntas)
    .map(([k, v]) => `<div class="pregunta-respuesta"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`)
    .join('');
}

// Al hacer clic en el botón de imprimir/descargar, muestra el modal
document.getElementById('imprimir-descargar-csv').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('modalPreguntas').style.display = 'flex';
});

// Cuando se envía el formulario del modal, guarda las respuestas y genera el documento
document.getElementById('formPreguntas').addEventListener('submit', function(e) {
  e.preventDefault();
  respuestasPreguntas.respuesta1 = e.target.respuesta1.value;
  respuestasPreguntas.respuesta2 = e.target.respuesta2.value;
  document.getElementById('modalPreguntas').style.display = 'none';

  // Genera el documento de impresión incluyendo las respuestas al final
  const infoContents = document.getElementById('imprimir-proyecto-info').innerHTML;
  const tableContents = document.getElementById('imprimir-table-container').innerHTML;
  const respuestasHTML = `
    <div style="margin-top:32px; font-size:1.1em;">
      <strong>Vehiculo Utilizado:</strong> ${respuestasPreguntas.respuesta1}<br>
      <strong>Personal que viaticó:</strong> ${respuestasPreguntas.respuesta2}
    </div>
  `;
  const printContents = infoContents + tableContents + respuestasHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  location.reload();
});

document.getElementById('cerrarModalPreguntas').onclick = function() {
  document.getElementById('modalPreguntas').style.display = 'none';
};
document.getElementById('cancelarModalPreguntas').onclick = function() {
  document.getElementById('modalPreguntas').style.display = 'none';
  window.location.reload(); // O redirige a la página principal si lo prefieres
};


