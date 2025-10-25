import { createVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } from '../../supabase/vehiculo.js';
import { supabase } from '../../supabase/db.js'; // <-- agregado

document.addEventListener('DOMContentLoaded', () => {
  const btnNuevo = document.querySelector('.btn-nuevo');
  const modal = document.getElementById('modal-nuevo-proyecto');
  const closeBtn = document.getElementById('close-modal-nuevo');
  const cancelarBtn = document.getElementById('cancelar-modal-nuevo');
  const form = document.getElementById('form-nuevo-proyecto');
  const tableBody = document.getElementById('table-body');
  const contador = document.getElementById('contador-registros');

  // --- Nuevo: elementos del modal de editar ---
  const editModal = document.getElementById('modal-editar-vehiculo');
  const editForm = document.getElementById('form-editar-vehiculo');
  const closeEditBtn = document.getElementById('close-modal-editar');
  const cancelEditBtn = document.getElementById('cancelar-modal-editar');
  // --- Fin de elementos del modal de editar ---

  if (!btnNuevo || !modal || !form || !tableBody) return;
  // Permite continuar si no existe el modal de editar; lo comprobamos luego

  const abrirModal = () => { modal.style.display = 'block'; modal.querySelector('input,textarea')?.focus(); };
  const cerrarModal = () => { modal.style.display = 'none'; form.reset(); };

  btnNuevo.addEventListener('click', abrirModal);
  closeBtn?.addEventListener('click', cerrarModal);
  cancelarBtn?.addEventListener('click', cerrarModal);

  // Cerrar al hacer click fuera del contenido
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrarModal(); });

  // Cerrar con ESC
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  // --- funciones abrir/cerrar para modal editar ---
  const abrirEditModal = () => { if (editModal) { editModal.style.display = 'block'; editForm?.querySelector('input')?.focus(); } };
  const cerrarEditModal = () => { if (editModal) { editModal.style.display = 'none'; editForm?.reset(); delete editForm?.dataset?.editingId; } };

  closeEditBtn?.addEventListener('click', cerrarEditModal);
  cancelEditBtn?.addEventListener('click', cerrarEditModal);
  editModal?.addEventListener('click', (e) => { if (e.target === editModal) cerrarEditModal(); });

  function actualizarContador() {
    if (!contador) return;
    const rows = tableBody.querySelectorAll('tr').length;
    contador.textContent = `${rows} vehículo(s)`;
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
    tableBody.prepend(tr);
  }

  // Cargar datos iniciales desde Supabase (si está disponible)
  (async function loadInitial() {
    try {
      if (typeof supabase !== 'undefined') {
        const rows = await fetchVehiculos();
        rows.forEach(r => renderRow(r));
        actualizarContador();
      }
    } catch (err) {
      console.warn('No se pudieron cargar vehículos desde Supabase:', err);
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
        // Inserta en Supabase via wrapper
        rowData = await createVehiculo({ modelo, marca, placas });
      } else {
        // Modo local (sin supabase)
        rowData = { modelo, marca, placas };
      }

      renderRow(rowData);
      actualizarContador();
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

    // Eliminar (usa la clase y data-id como en trabajador)
    if (btn.classList.contains('btn-eliminar')) {
      const id = btn.getAttribute('data-id') || row.dataset.id;
      if (!id) {
        // modo local: eliminar fila
        row.remove();
        actualizarContador();
        return;
      }

      // eliminar en servidor
      try {
        await deleteVehiculo(id);
        row.remove();
        actualizarContador();
      } catch (err) {
        console.error('Error eliminando en servidor:', err);
        alert('Error eliminando en servidor. Revisa la consola.');
      }
      return;
    }

    // --- Editar: abrir modal de editar en lugar de reutilizar el form "nuevo" ---
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
        // Fallback: abrir modal nuevo con los valores (antiguo comportamiento)
        form.querySelector('#vehiculo-modelo').value = cols[0]?.textContent?.trim() || '';
        form.querySelector('#vehiculo-marca').value = cols[1]?.textContent?.trim() || '';
        form.querySelector('#vehiculo-placas').value = cols[2]?.textContent?.trim() || '';
        abrirModal();
        // mantén el override original solo si editForm no existe (no tocar aquí)
      }
    }
  });

  // --- Manejar envío del formulario de editar ---
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

        // actualizar fila DOM si existe
        const row = tableBody.querySelector(`tr[data-id="${id}"]`);
        if (row) {
          const cols = row.querySelectorAll('td');
          cols[0].textContent = updated?.modelo ?? modelo;
          cols[1].textContent = updated?.marca ?? marca;
          cols[2].textContent = updated?.placas ?? placas;
        }

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