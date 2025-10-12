import { supabase } from '../../supabase/db.js';

let registroEditando = null;
let proyectosNombres = [];
let registrosOriginales = [];
let proyectosInfo = []; // [{ id_proyecto, nombre }]

// Obtén los nombres de proyectos al cargar la página
async function cargarProyectosNombres() {
  const { data } = await supabase.from('proyecto').select('id_proyecto, nombre');
  proyectosInfo = data || [];
  proyectosNombres = proyectosInfo.map(p => p.nombre);
}
document.addEventListener('DOMContentLoaded', cargarProyectosNombres);

async function cargarRegistrosSupabase() {
  const { data, error } = await supabase
    .from('registro')
    .select('*');

  registrosOriginales = data || [];

  mostrarRegistros(data || []);
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

  tbody.querySelectorAll('.icon-btn.editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const registro = data[idx];
      registroEditando = registro;

      // Llena los campos del modal
      document.getElementById('edit-fecha').value = registro.fecha || '';
      document.getElementById('edit-tipo').value = registro.tipo || '';
      document.getElementById('edit-pago').value = registro.pago || ''; // <-- agrega esta línea
      document.getElementById('edit-factura').value = registro.folio || '';
      document.getElementById('edit-establecimiento').value = registro.establecimiento || '';
      document.getElementById('edit-subtotal').value = registro.subtotal || '';
      document.getElementById('edit-iva').value = registro.iva || '';
      document.getElementById('edit-total').value = registro.total || '';

      // Muestra el modal
      document.getElementById('modal-editar').style.display = 'block';
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
  const tickets = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'ticket').length;
  const facturas = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'factura').length;

  document.getElementById('total-count').textContent = total;
  document.getElementById('tickets-count').textContent = tickets;
  document.getElementById('facturas-count').textContent = facturas;
  document.getElementById('contador-registros').textContent = `Registros Totales: ${data.length}`;
}

// Cerrar modal
document.querySelector('#modal-editar .modal-close').onclick = function() {
  document.getElementById('modal-editar').style.display = 'none';
};
document.getElementById('cancelar-editar').onclick = function() {
  document.getElementById('modal-editar').style.display = 'none';
};

// Guardar cambios
document.getElementById('form-editar').onsubmit = async function(e) {
  e.preventDefault();
  if (!registroEditando) return;

  const cambios = {
    fecha: document.getElementById('edit-fecha').value,
    tipo: document.getElementById('edit-tipo').value,
    pago: document.getElementById('edit-pago').value, // <-- agrega esta línea
    folio: document.getElementById('edit-factura').value,
    establecimiento: document.getElementById('edit-establecimiento').value,
    subtotal: document.getElementById('edit-subtotal').value,
    iva: document.getElementById('edit-iva').value,
    total: document.getElementById('edit-total').value
  };

  const { error } = await supabase
    .from('registro')
    .update(cambios)
    .eq('id_registro', registroEditando.id_registro);

  if (!error) {
    document.getElementById('modal-editar').style.display = 'none';
    cargarRegistrosSupabase();
  } else {
    alert('Error al guardar cambios');
  }
};

// Filtro por folio, establecimiento e importe
document.getElementById('registro-search').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = registrosOriginales.filter(r =>
    (r.folio && r.folio.toLowerCase().includes(valor)) ||
    (r.establecimiento && r.establecimiento.toLowerCase().includes(valor)) ||
    (r.importe && r.importe.toString().toLowerCase().includes(valor))
  );
  mostrarRegistros(filtrados);
});

// Autocompletado
const proyectoInput = document.getElementById('proyecto-autocomplete');
const autocompleteList = document.getElementById('autocomplete-list');

proyectoInput.addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  autocompleteList.innerHTML = '';
  if (!valor) return;
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
  const proyecto = proyectosInfo.find(p => p.nombre === nombreProyecto);
  if (!proyecto) {
    mostrarRegistros(registrosOriginales);
    return;
  }
  const filtrados = registrosOriginales.filter(r => r.id_proyecto === proyecto.id_proyecto);
  mostrarRegistros(filtrados);
}

// Opcional: Oculta el autocompletado si se hace clic fuera
document.addEventListener('click', function(e) {
  if (!autocompleteList.contains(e.target) && e.target !== proyectoInput) {
    autocompleteList.innerHTML = '';
  }
});

document.addEventListener('DOMContentLoaded', cargarRegistrosSupabase);

document.getElementById('descargar-csv').addEventListener('click', function() {
  // Usa los datos actualmente mostrados en la tabla
  const tbody = document.getElementById('table-body');
  const filas = Array.from(tbody.querySelectorAll('tr'));
  if (filas.length === 0) {
    alert('No hay datos para descargar.');
    return;
  }

  // Obtén los datos mostrados en la tabla
  let datos = [];
  filas.forEach(tr => {
    const celdas = tr.querySelectorAll('td');
    // Solo toma filas con el número correcto de columnas (evita la fila de "No hay registros")
    if (celdas.length >= 7) {
      datos.push({
        'Fecha de cargo': celdas[0].textContent,
        'Fecha de Facturacion': celdas[1].textContent,
        'Tipo': celdas[2].textContent,
        'Tipo de pago': celdas[3].textContent,
        'Folio': celdas[4].textContent,
        'Establecimiento': celdas[5].textContent,
        'Importe': celdas[6].textContent
      });
    }
  });

  if (datos.length === 0) {
    alert('No hay datos para descargar.');
    return;
  }

  // Genera el archivo CSV usando SheetJS
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registros");
  XLSX.writeFile(wb, "registros.csv");
});