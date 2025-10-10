import { supabase } from '../../supabase/db.js';

let registroEditando = null;

async function cargarRegistrosSupabase() {
  const { data, error } = await supabase
    .from('registro')
    .select('*');

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Error al cargar registros</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No hay registros</td></tr>`;
    return;
  }

  data.forEach((registro, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${registro.fecha || ''}</td>
      <td>${registro.tipo || ''}</td>
      <td>${registro.pago || ''}</td>
      <td>${registro.folio || ''}</td>
      <td>${registro.establecimiento || ''}</td>
      <td>${registro.subtotal || ''}</td>
      <td>${registro.iva || ''}</td>
      <td>${registro.total || ''}</td>
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

document.addEventListener('DOMContentLoaded', cargarRegistrosSupabase);