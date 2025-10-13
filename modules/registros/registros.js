import { supabase } from '../../supabase/db.js';

let registroEditando = null;
let proyectosNombres = [];
let registrosOriginales = [];
let proyectosInfo = []; // [{ id_proyecto, nombre }]

const REGISTROS_POR_PAGINA = 7;
let paginaActual = 1;
let registrosFiltrados = []; // Para guardar el resultado del filtro

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
  const tickets = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'ticket').length;
  const facturas = data.filter(r => r.tipo && r.tipo.toLowerCase() === 'factura').length;

  document.getElementById('total-count').textContent = total;
  document.getElementById('tickets-count').textContent = tickets;
  document.getElementById('facturas-count').textContent = facturas;
  document.getElementById('contador-registros').textContent = `Registros Totales: ${data.length}`;
}

function actualizarContadores() {
  const total = registrosFiltrados.length;
  const tickets = registrosFiltrados.filter(r => r.tipo && r.tipo.toLowerCase() === 'ticket').length;
  const facturas = registrosFiltrados.filter(r => r.tipo && r.tipo.toLowerCase() === 'factura').length;

  document.getElementById('contador-total').textContent = total;
  document.getElementById('contador-tickets').textContent = tickets;
  document.getElementById('contador-facturas').textContent = facturas;
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
  document.getElementById('tickets-count').textContent = registros.filter(r => r.tipo && r.tipo.toLowerCase() === 'ticket').length;
  document.getElementById('facturas-count').textContent = registros.filter(r => r.tipo && r.tipo.toLowerCase() === 'factura').length;

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
    (r.folio && r.folio.toLowerCase().includes(valor)) ||
    (r.establecimiento && r.establecimiento.toLowerCase().includes(valor)) ||
    (r.importe && r.importe.toString().toLowerCase().includes(valor))
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

document.addEventListener('DOMContentLoaded', cargarRegistrosSupabase);

document.getElementById('descargar-csv').addEventListener('click', function() {
  window.location.href = '/proyecto_facturas/modules/Impresion/imprimir.html';
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



