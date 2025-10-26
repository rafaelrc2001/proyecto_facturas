import { createVehiculo, updateVehiculo, deleteVehiculo, fetchVehiculos } from '../../supabase/vehiculo.js';
import { supabase } from '../../supabase/db.js';

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('table-body');
  const contador = document.getElementById('contador-registros');
  const inputBuscar = document.querySelector('.input-buscar');

  if (!tableBody) return;

  let vehiculosOriginales = []; // Almacenar todos los vehículos
  let vehiculosFiltrados = []; // Almacenar vehículos filtrados

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
    `;
    return tr;
  }

  // Mostrar vehículos en la tabla
  function mostrarVehiculos(vehiculos) {
    tableBody.innerHTML = '';
    vehiculos.forEach(vehiculo => {
      const row = renderRow(vehiculo);
      tableBody.appendChild(row);
    });
    actualizarContador();
  }

  // Filtrar vehículos por modelo
  function filtrarVehiculos(termino) {
    if (!termino.trim()) {
      // Si no hay término de búsqueda, mostrar todos
      vehiculosFiltrados = [...vehiculosOriginales];
    } else {
      // Filtrar por modelo (case insensitive)
      const terminoLower = termino.toLowerCase();
      vehiculosFiltrados = vehiculosOriginales.filter(vehiculo => {
        const modelo = (vehiculo.modelo || '').toLowerCase();
        return modelo.includes(terminoLower);
      });
    }
    
    mostrarVehiculos(vehiculosFiltrados);
  }

  // Event listener para el buscador
  if (inputBuscar) {
    inputBuscar.addEventListener('input', function(e) {
      const termino = e.target.value;
      filtrarVehiculos(termino);
    });

    // Limpiar búsqueda al presionar Escape
    inputBuscar.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.target.value = '';
        filtrarVehiculos('');
      }
    });
  }

  // Cargar datos iniciales desde Supabase
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

  actualizarContador();
});