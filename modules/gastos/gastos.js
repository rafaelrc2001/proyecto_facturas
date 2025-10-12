import { supabase } from '../../supabase/db.js';

let gastosOriginales = [];

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
  mostrarGastos(gastosOriginales);
}

function mostrarGastos(gastos) {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (!gastos.length) {
    tbody.innerHTML = `<tr><td colspan="4">No hay gastos</td></tr>`;
    document.getElementById('contador-registros').textContent = 'Registros Totales: 0';
    return;
  }

  gastos.forEach(gasto => {
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
          </div>
        </td>
      </tr>
    `;
  });

  document.getElementById('contador-registros').textContent = `Registros Totales: ${gastos.length}`;
}

// Filtro por folio y establecimiento
document.querySelector('.input-buscar').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = gastosOriginales.filter(g =>
    (g.folio && g.folio.toLowerCase().includes(valor)) ||
    (g.establecimiento && g.establecimiento.toLowerCase().includes(valor))
  );
  mostrarGastos(filtrados);
});

let proyectosInfo = []; // [{ id_proyecto, nombre }]
let proyectoSeleccionadoId = null;

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

document.addEventListener('DOMContentLoaded', cargarGastos);