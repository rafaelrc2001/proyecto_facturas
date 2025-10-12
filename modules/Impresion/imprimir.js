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
  const { data } = await supabase
    .from('proyecto')
    .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final');
  proyectosInfo = data || [];
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
        <table class="proyecto-info-table">
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
      `;
    } else {
      registrosFiltrados = [];
      infoContainer.innerHTML = '';
    }
  } else {
    infoContainer.innerHTML = '';
  }

  let totalRegistros = 0;

  tiposPago.forEach(tipo => {
    // Filtra por tipo de pago
    const registrosPorTipo = registrosFiltrados.filter(r => r.pago === tipo);
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
            <td>${reg.importe || ''}</td>
          </tr>
        `;
        totalImporte += Number(reg.importe) || 0;
      });
      tablaHTML += `
    </tbody>
  </table>
  <div class="imprimir-total">Total: ${totalImporte.toFixed(2)}</div>
      `;
      container.innerHTML += tablaHTML;
    }
  });

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

// Botón descargar CSV (descarga todos los registros mostrados)
document.getElementById('imprimir-descargar-csv').addEventListener('click', function() {
  const tablas = document.querySelectorAll('.imprimir-subtabla');
  let datos = [];
  tablas.forEach(tabla => {
    const tipoPago = tabla.previousElementSibling.textContent;
    const filas = tabla.querySelectorAll('tbody tr');
    filas.forEach(tr => {
      const celdas = tr.querySelectorAll('td');
      datos.push({
        'Tipo de pago': tipoPago,
        'Fecha de cargo': celdas[0].textContent,
        'Fecha de Facturación': celdas[1].textContent,
        'Tipo': celdas[2].textContent,
        'Folio': celdas[3].textContent,
        'Establecimiento': celdas[4].textContent,
        'Importe': celdas[5].textContent
      });
    });
  });
  if (datos.length === 0) {
    alert('No hay datos para descargar.');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registros");
  XLSX.writeFile(wb, "registros_separados.csv");
});

document.getElementById('volver').addEventListener('click', function() {
  window.location.href = '/modules/registros/registros.html';
});