import { createVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } from '../../supabase/vehiculo.js';
import { supabase } from '../../supabase/db.js';

document.addEventListener('DOMContentLoaded', () => {
  const btnNuevo = document.querySelector('.btn-nuevo');
  const modal = document.getElementById('modal-nuevo-proyecto');
  const closeBtn = document.getElementById('close-modal-nuevo');
  const cancelarBtn = document.getElementById('cancelar-modal-nuevo');
  const form = document.getElementById('form-nuevo-proyecto');
  const tableBody = document.getElementById('table-body');
  const contador = document.getElementById('contador-registros');
  const inputBuscar = document.querySelector('.input-buscar');

  // --- elementos del modal de editar ---
  const editModal = document.getElementById('modal-editar-vehiculo');
  const editForm = document.getElementById('form-editar-vehiculo');
  const closeEditBtn = document.getElementById('close-modal-editar');
  const cancelEditBtn = document.getElementById('cancelar-modal-editar');

  if (!btnNuevo || !modal || !form || !tableBody) return;

  let vehiculosOriginales = []; // Almacenar todos los vehículos
  let vehiculosFiltrados = []; // Almacenar vehículos filtrados

  const abrirModal = () => { modal.style.display = 'block'; modal.querySelector('input,textarea')?.focus(); };
  const cerrarModal = () => { modal.style.display = 'none'; form.reset(); };

  btnNuevo.addEventListener('click', abrirModal);
  closeBtn?.addEventListener('click', cerrarModal);
  cancelarBtn?.addEventListener('click', cerrarModal);

  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  const abrirEditModal = () => { if (editModal) { editModal.style.display = 'block'; editForm?.querySelector('input')?.focus(); } };
  const cerrarEditModal = () => { if (editModal) { editModal.style.display = 'none'; editForm?.reset(); delete editForm?.dataset?.editingId; } };

  closeEditBtn?.addEventListener('click', cerrarEditModal);
  cancelEditBtn?.addEventListener('click', cerrarEditModal);
  editModal?.addEventListener('click', (e) => { if (e.target === editModal) cerrarEditModal(); });

  function actualizarContador() {
    if (!contador) return;
    const rows = tableBody.querySelectorAll('tr').length;
    const total = vehiculosOriginales.length;
    
    if (rows === total) {
      contador.textContent = `${total} vehículo(s)`;
    } else {
      contador.textContent = `${rows} de ${total} vehículo(s)`;
    }
  }

  function renderRow(rowData) {
    const tr = document.createElement('tr');
    tr.dataset.id = rowData.id ?? '';
    tr.innerHTML = `
      <td style="text-align:center;">${rowData.modelo ?? '-'}</td>
      <td style="text-align:center;">${rowData.marca ?? '-'}</td>
      <td style="text-align:center;">${rowData.placas ?? '-'}</td>
      <td style="text-align:center;">
        <div class="acciones-btns">
          <button class="btn-accion btn-editar" title="Editar" data-id="${rowData.id ?? ''}">
            <i class="ri-edit-2-line"></i>
          </button>
          <button class="btn-accion btn-eliminar" title="Eliminar" data-id="${rowData.id ?? ''}">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    `;
    return tr;
  }

  // 🔥 NUEVA FUNCIÓN: Mostrar vehículos en la tabla
  function mostrarVehiculos(vehiculos) {
    tableBody.innerHTML = '';
    vehiculos.forEach(vehiculo => {
      const row = renderRow(vehiculo);
      tableBody.appendChild(row);
    });
    actualizarContador();
  }

  // 🔥 NUEVA FUNCIÓN: Filtrar vehículos por marca
  function filtrarVehiculos(termino) {
    if (!termino.trim()) {
      // Si no hay término de búsqueda, mostrar todos
      vehiculosFiltrados = [...vehiculosOriginales];
    } else {
      // Filtrar por marca (case insensitive)
      const terminoLower = termino.toLowerCase();
      vehiculosFiltrados = vehiculosOriginales.filter(vehiculo => {
        const marca = (vehiculo.marca || '').toLowerCase();
        return marca.includes(terminoLower);
      });
    }
    
    mostrarVehiculos(vehiculosFiltrados);
  }

  // 🔥 AGREGAR EVENT LISTENER PARA EL BUSCADOR:
  if (inputBuscar) {
    inputBuscar.addEventListener('input', function(e) {
      const termino = e.target.value;
      filtrarVehiculos(termino);
    });

    inputBuscar.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.target.value = '';
        filtrarVehiculos('');
      }
    });
  }

  // 🔥 ACTUALIZAR función loadInitial:
  (async function loadInitial() {
    try {
      if (typeof supabase !== 'undefined') {
        const rows = await fetchVehiculos();
        vehiculosOriginales = rows || [];
        vehiculosFiltrados = [...vehiculosOriginales];
        mostrarVehiculos(vehiculosFiltrados);
      }
    } catch (err) {
      console.warn('No se pudieron cargar vehículos desde Supabase:', err);
      vehiculosOriginales = [];
      vehiculosFiltrados = [];
      actualizarContador();
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true);

    const modelo = form.querySelector('#vehiculo-modelo')?.value?.trim() || '-';
    const marca = form.querySelector('#vehiculo-marca')?.value?.trim() || '-';
    const placas = form.querySelector('#vehiculo-placas')?.value?.trim() || '-';

    try {
      let rowData;
      if (typeof supabase !== 'undefined') {
        rowData = await createVehiculo({ modelo, marca, placas });
      } else {
        rowData = { modelo, marca, placas };
      }

      // 🔥 ACTUALIZAR: Agregar al array original y refiltrar
      vehiculosOriginales.unshift(rowData);
      const termino = inputBuscar ? inputBuscar.value : '';
      filtrarVehiculos(termino);
      
      cerrarModal();
    } catch (err) {
      console.error('Error guardando vehículo:', err);
      alert('No se pudo guardar el vehículo. Revisa la consola.');
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });

  // Delegación para botones Edit / Delete
  tableBody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const row = btn.closest('tr');
    if (!row) return;

    if (btn.classList.contains('btn-eliminar')) {
      const id = btn.getAttribute('data-id') || row.dataset.id;
      if (!id) {
        row.remove();
        actualizarContador();
        return;
      }

      try {
        await deleteVehiculo(id);
        
        // 🔥 ACTUALIZAR: Remover del array original y refiltrar
        vehiculosOriginales = vehiculosOriginales.filter(v => String(v.id) !== String(id));
        const termino = inputBuscar ? inputBuscar.value : '';
        filtrarVehiculos(termino);
        
      } catch (err) {
        console.error('Error eliminando en servidor:', err);
        alert('Error eliminando en servidor. Revisa la consola.');
      }
      return;
    }

    if (btn.classList.contains('btn-editar')) {
      const id = btn.getAttribute('data-id') || row.dataset.id || '';
      const cols = row.querySelectorAll('td');

      if (editForm) {
        editForm.querySelector('#editar-modelo').value = cols[0]?.textContent?.trim() || '';
        editForm.querySelector('#editar-marca').value = cols[1]?.textContent?.trim() || '';
        editForm.querySelector('#editar-placas').value = cols[2]?.textContent?.trim() || '';
        editForm.dataset.editingId = id;
        abrirEditModal();
      } else {
        form.querySelector('#vehiculo-modelo').value = cols[0]?.textContent?.trim() || '';
        form.querySelector('#vehiculo-marca').value = cols[1]?.textContent?.trim() || '';
        form.querySelector('#vehiculo-placas').value = cols[2]?.textContent?.trim() || '';
        abrirModal();
      }
    }
  });

  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editForm.dataset.editingId;
      if (!id) { alert('ID de vehículo no disponible.'); return; }

      const submitBtn = editForm.querySelector('button[type="submit"]');
      submitBtn && (submitBtn.disabled = true);

      const modelo = editForm.querySelector('#editar-modelo').value.trim() || '-';
      const marca = editForm.querySelector('#editar-marca').value.trim() || '-';
      const placas = editForm.querySelector('#editar-placas').value.trim() || '-';

      try {
        let updated;
        if (typeof supabase !== 'undefined' && updateVehiculo) {
          updated = await updateVehiculo(id, { modelo, marca, placas });
        } else {
          updated = { modelo, marca, placas };
        }

        // 🔥 ACTUALIZAR: También actualizar en el array original
        const index = vehiculosOriginales.findIndex(v => String(v.id) === String(id));
        if (index !== -1) {
          vehiculosOriginales[index] = { 
            ...vehiculosOriginales[index], 
            modelo: updated?.modelo ?? modelo,
            marca: updated?.marca ?? marca,
            placas: updated?.placas ?? placas
          };
        }

        // Re-aplicar filtro actual
        const termino = inputBuscar ? inputBuscar.value : '';
        filtrarVehiculos(termino);

        cerrarEditModal();
      } catch (err) {
        console.error('Error actualizando vehículo:', err);
        alert('No se pudo actualizar el vehículo. Revisa la consola.');
      } finally {
        submitBtn && (submitBtn.disabled = false);
      }
    });
  }

  actualizarContador();
});