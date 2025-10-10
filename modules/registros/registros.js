import { supabase } from '../../supabase/db.js';

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
      alert(
        `Detalle:\nFecha: ${registro.fecha}\nTipo: ${registro.tipo}\nPago: ${registro.pago}`
      );
      // Aquí puedes abrir un modal con más detalles si lo deseas
    });
  });

  tbody.querySelectorAll('.icon-btn.editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = this.getAttribute('data-index');
      const registro = data[idx];
      alert(
        `Editar registro:\nID: ${registro.id_registro}\nTipo: ${registro.tipo}`
      );
      // Aquí puedes abrir un modal de edición y guardar cambios en Supabase
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

document.addEventListener('DOMContentLoaded', cargarRegistrosSupabase);