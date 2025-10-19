import { supabase } from '../../supabase/db.js';
import { getIdTrabajador, isAdmin } from '../../supabase/auth.js';

import { cargarPastelDesdeSupabase } from './graficas/grafica-pastel.js';
import { cargarPagoChartDesdeSupabase } from './graficas/grafica-barra.js';
import { cargarTablaSupabase } from './graficas/tabla.js';

// Variables para autocompletado / mapping de proyectos
let projectsMap = {};   // { 'proyecto x': 123, ... }
let projectsList = [];  // ['Proyecto X', ...]

async function cargarDatosDashboard() {
  try {
    const idTrabajador = getIdTrabajador();

    // Si es trabajador (no admin) usamos los proyectos asignados y visibles
    if (idTrabajador && !isAdmin()) {
      // obtener proyectos asignados
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) { console.error('Error cargando asignaciones:', asignErr); registrosOriginales = []; return; }
      const ids = (asigns || []).map(a => Number(a.id_proyecto));
      if (!ids.length) { registrosOriginales = []; return; }

      // filtrar solo proyectos visibles entre los asignados
      const { data: visibleProjs, error: visErr } = await supabase
        .from('proyecto')
        .select('id_proyecto')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      if (visErr) { console.error('Error cargando proyectos visibles:', visErr); registrosOriginales = []; return; }
      const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
      if (!visibleIds.length) { registrosOriginales = []; return; }

      // consultar registros sólo para proyectos visibles asignados
      const { data, error, count } = await supabase
        .from('registro')
        .select('id_registro, importe, fecha_facturacion', { count: 'exact' })
        .in('id_proyecto', visibleIds);

      if (error) { console.error('Error cargando registros dashboard:', error); registrosOriginales = []; return; }
      registrosOriginales = data || [];

      // Cargar KPIs y luego gráficas/tablas
      await cargarKPIsSupabase(null); // o pasar projectId específico si aplica
      await Promise.all([
        cargarPastelDesdeSupabase(null),
        cargarPagoChartDesdeSupabase(null),
        cargarTablaSupabase({ limit: 300, projectId: null })
      ]);
      return;
    }

    // Admin u otros: comportamiento original (sin filtro por proyecto)
    let query = supabase
      .from('registro')
      .select('id_registro, importe, fecha_facturacion', { count: 'exact' });

    const { data, error, count } = await query;
    if (error) { console.error('Error cargando datos dashboard:', error); registrosOriginales = []; return; }

    registrosOriginales = data || [];
  } catch (err) {
    console.error('Error cargarDatosDashboard:', err);
  }
}

document.addEventListener('DOMContentLoaded', cargarDatosDashboard);

// Procesa y actualiza la gráfica de tipos
function actualizarGraficaTipos(registros) {
  const facturasPorDia = {};
  registros.forEach((fila) => {
    const fecha = (fila[1] || "").trim(); // <-- Fecha en columna 1
    const tipo = (fila[2] || "").trim().toLowerCase(); // <-- Tipo en columna 2
    if (tipo === "factura" && fecha) {
      facturasPorDia[fecha] = (facturasPorDia[fecha] || 0) + 1;
    }
  });

  const fechas = Object.keys(facturasPorDia).sort();
  const valores = fechas.map((f) => facturasPorDia[f]);

  // Inicializar o actualizar la gráfica
  if (!window.facturasDiaChartInstance) {
    const chartDom = document.getElementById("type-chart");
    if (!chartDom) return;
    const chart = echarts.init(chartDom);
    window.facturasDiaChartInstance = chart;
  }
  window.facturasDiaChartInstance.setOption({
    title: { text: "" },
    tooltip: {},
    xAxis: { type: "category", data: fechas },
    yAxis: { type: "value" },
    series: [
      {
        data: valores,
        type: "bar",
        itemStyle: { color: "#1D3E53" },
      },
    ],
  });
}

// Procesa y actualiza la gráfica de estatus
async function actualizarGraficaEstatus(registros) {
  // Delegar la creación/actualización del gráfico de pastel al módulo dedicado.
  // Evitar crear o actualizar aquí cualquier instancia de "statusChartInstance".
  try {
    // Si ya existe una función para cargar el pastel, llámala sin parámetros
    if (typeof cargarPastelDesdeSupabase === 'function') {
      await cargarPastelDesdeSupabase(null);
      return;
    }
    // Si no existe el loader, sólo computar resumen (opcional) sin renderizar
    let totalFacturas = 0;
    let totalTickets = 0;
    registros.forEach((fila) => {
      const tipo = (fila[1] || "").trim().toLowerCase();
      if (tipo === "factura") totalFacturas++;
      else if (tipo === "ticket") totalTickets++;
    });
    // No renderizar nada aquí.
    console.debug('[dashboard] actualizarGraficaEstatus (delegada) facturas:', totalFacturas, 'tickets:', totalTickets);
  } catch (err) {
    console.error('Error delegando actualización del gráfico de estatus:', err);
  }
}

function actualizarTarjetasDashboard(registros, totalIndex) {
  // Stub: deshabilitado el cálculo automático de totales.
  // Si en el futuro quieres recalcular, implementa la lógica aquí.
  console.log('actualizarTarjetasDashboard deshabilitada — registros recibidos:', registros.length);
  return;
}

function actualizarGraficaTicketsPorDia(registros) {
  const ticketsPorDia = {};
  registros.forEach((fila) => {
    const fecha = (fila[1] || "").trim(); // <-- Fecha en columna 1
    const tipo = (fila[2] || "").trim().toLowerCase(); // <-- Tipo en columna 2
    if (tipo === "ticket" && fecha) {
      ticketsPorDia[fecha] = (ticketsPorDia[fecha] || 0) + 1;
    }
  });

  const fechas = Object.keys(ticketsPorDia).sort();
  const valores = fechas.map((f) => ticketsPorDia[f]);
  const colors = fechas.map(() => "#1D3E53");

  if (!window.ticketsDiaChartInstance) {
    const chartDom = document.getElementById("tickets-dia-chart");
    if (!chartDom) return;
    const chart = echarts.init(chartDom);
    window.ticketsDiaChartInstance = chart;
  }
  window.ticketsDiaChartInstance.setOption({
    title: { text: "" },
    tooltip: {},
    xAxis: { type: "category", data: fechas },
    yAxis: { type: "value" },
    series: [
      {
        data: valores,
        type: "bar",
        itemStyle: { color: "#77ABB7" },
      },
    ],
  });
}

// Elimina el listener de búsqueda / filtrado y solo carga datos al DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  cargarDatosDashboard();

  // Borrado: ya no existe el filtrado por input
  // Si hay otras inicializaciones necesarias, agrégalas aquí.
});

function actualizarGraficaEstablecimientos(registros) {
  const TIENDA_INDEX = 4; // Columna de establecimiento
  const conteo = {};

  registros.forEach(fila => {
    const tienda = (fila[TIENDA_INDEX] || '').trim();
    if (tienda) {
      conteo[tienda] = (conteo[tienda] || 0) + 1;
    }
  });

  // Ordena por cantidad descendente
  const establecimientos = Object.keys(conteo);
  const cantidades = establecimientos.map(e => conteo[e]);
  const ordenados = establecimientos
    .map((nombre, i) => ({ nombre, cantidad: cantidades[i] }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const categorias = ordenados.map(e => e.nombre);
  const valores = ordenados.map(e => e.cantidad);

  // Inicializa o actualiza la gráfica
  const chartDom = document.getElementById('establecimientos-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  chart.setOption({
    backgroundColor: "#fff",
    grid: {
      left: '10%',
      right: '8%',
      top: 30,
      bottom: 20,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      data: categorias,
      axisLabel: {
        color: '#003B5C',
        fontSize: 13,
        fontWeight: 500
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: valores,
      barWidth: 22,
      itemStyle: {
        color: '#77ABB7',
        borderRadius: [6, 6, 6, 6]
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 12,
        color: '#003B5C'
      }
    }]
  });

  window.addEventListener('resize', function() {
    chart.resize();
  });
}

function actualizarGraficaEstablecimientosTipo(registros) {
  const TIENDA_INDEX = 4; // Columna de establecimiento
  const TIPO_INDEX = 2; // Columna de tipo (factura/ticket)
  const conteo = {};

  registros.forEach(fila => {
    const tienda = (fila[TIENDA_INDEX] || '').trim();
    const tipo = (fila[TIPO_INDEX] || '').trim().toLowerCase();
    if (tienda && (tipo === 'factura' || tipo === 'ticket')) {
      const clave = `${tienda}-${tipo}`;
      conteo[clave] = (conteo[clave] || 0) + 1;
    }
  });

  // Ordena por cantidad descendente
  const claves = Object.keys(conteo);
  const cantidades = claves.map(c => conteo[c]);
  const ordenados = claves
    .map((clave, i) => ({ clave, cantidad: cantidades[i] }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const categorias = ordenados.map(e => e.clave);
  const valores = ordenados.map(e => e.cantidad);

  // Inicializa o actualiza la gráfica
  const chartDom = document.getElementById('establecimientos-tipo-chart');
  if (!chartDom) return;
  const chart = echarts.init(chartDom);

  chart.setOption({
    backgroundColor: "#fff",
    grid: {
      left: '10%',
      right: '8%',
      top: 30,
      bottom: 20,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      data: categorias,
      axisLabel: {
        color: '#003B5C',
        fontSize: 13,
        fontWeight: 500
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: valores,
      barWidth: 22,
      itemStyle: {
        color: '#1D3E53',
        borderRadius: [6, 6, 6, 6]
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 12,
        color: '#003B5C'
      }
    }]
  });

  window.addEventListener('resize', function() {
    chart.resize();
  });
}

// const idTrabajador = localStorage.getItem('id_trabajador');
// if (idTrabajador) {
//   console.log(`Ingresaste con el id_trabajador: ${idTrabajador}`);
// }

/**
 * Carga KPIs desde Supabase y actualiza el DOM.
 * Acepta projectId opcional.
 */
async function cargarKPIsSupabase(projectId = null) {
  try {
    const idTrabajador = getIdTrabajador();

    // Si se pide projectId explícito lo usamos inmediatamente
    if (projectId) {
      const { data, error } = await supabase.from('registro').select('importe, tipo').eq('id_proyecto', projectId);
      if (error) { console.error('[KPIs] error de Supabase:', error); calcularYSetearKPIs([]); return; }
      calcularYSetearKPIs(data || []);
      return;
    }

    // Si es trabajador y no admin, limitar a proyectos asignados y visibles
    if (idTrabajador && !isAdmin()) {
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) { console.error('[KPIs] error asigns:', asignErr); calcularYSetearKPIs([]); return; }
      const ids = (asigns || []).map(a => Number(a.id_proyecto));
      if (!ids.length) { calcularYSetearKPIs([]); return; }

      const { data: visibleProjs, error: visErr } = await supabase
        .from('proyecto')
        .select('id_proyecto')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      if (visErr) { console.error('[KPIs] error proyectos visibles:', visErr); calcularYSetearKPIs([]); return; }
      const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
      if (!visibleIds.length) { calcularYSetearKPIs([]); return; }

      const { data, error } = await supabase
        .from('registro')
        .select('importe, tipo')
        .in('id_proyecto', visibleIds);

      if (error) { console.error('[KPIs] error de Supabase:', error); calcularYSetearKPIs([]); return; }
      calcularYSetearKPIs(data || []);
      return;
    }

    // Caso admin / sin filtro: traer todo
    const { data, error } = await supabase.from('registro').select('importe, tipo');
    if (error) { console.error('[KPIs] error de Supabase:', error); calcularYSetearKPIs([]); return; }
    calcularYSetearKPIs(data || []);
  } catch (err) {
    console.error('[KPIs] excepción:', err);
    calcularYSetearKPIs([]);
  }
}

// helper formato moneda (si no la tienes)
function formatCurrency(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Carga proyectos en memoria (no renderiza select)
async function cargarProyectosSupabase() {
  try {
    const idTrabajador = getIdTrabajador();
    let proyectos = [];
    if (idTrabajador && !isAdmin()) {
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) throw asignErr;
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (ids.length === 0) {
        projectsMap = {};
        projectsList = [];
        return;
      }
      const { data, error } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);
      if (error) { console.error('Error cargando proyectos:', error); return; }
      proyectos = data || [];
    } else {
      const { data, error } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre')
        .eq('visibilidad', true);
      if (error) { console.error('Error cargando proyectos:', error); return; }
      proyectos = data || [];
    }

    // normalizar y almacenar map/list
    projectsMap = {};
    projectsList = proyectos.map(p => {
      const name = (p.nombre || '').toString().trim();
      const key = name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      if (key) projectsMap[key] = Number(p.id_proyecto);
      return name;
    }).filter(Boolean);
  } catch (err) {
    console.error('Exception cargando proyectos:', err);
    projectsMap = {};
    projectsList = [];
  }
}

function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// muestra sugerencias inmediatas
function showProjectSuggestions(query) {
  const box = document.getElementById('project-suggestions');
  if (!box) return;
  const q = (query || '').toLowerCase().trim();
  if (!q) { box.style.display='none'; box.innerHTML=''; return; }

  const matches = projectsList.filter(name => name.toLowerCase().includes(q)).slice(0,8);
  if (matches.length === 0) { box.style.display='none'; box.innerHTML=''; return; }

  box.innerHTML = matches.map(name =>
    `<div class="suggest-item" data-name="${escapeHtml(name)}" style="padding:10px 12px; cursor:pointer; border-bottom:1px solid #f2f2f2;">${escapeHtml(name)}</div>`
  ).join('');
  box.style.display = 'block';
}

// cuando el usuario elige una sugerencia
async function onSuggestionSelect(projectName) {
  const projectId = projectsMap[(projectName||'').toLowerCase()] || null;
  // actualizar input (ya contiene projectName normalmente)
  const input = document.getElementById('dashboard-search');
  if (input) input.value = projectName;
  // ocultar sugerencias
  const box = document.getElementById('project-suggestions');
  if (box) { box.style.display='none'; box.innerHTML=''; }
  // recargar vistas con filtro
  await cargarTablaSupabase({ limit: 300, projectId });
  await cargarKPIsSupabase(projectId);
  await cargarPagoChartDesdeSupabase(projectId);
  await cargarPastelDesdeSupabase(projectId);
}

// Cerrar sugerencias al click fuera
document.addEventListener('click', (e) => {
  const box = document.getElementById('project-suggestions');
  if (!box) return;
  if (!e.target.closest('#project-suggestions') && !e.target.closest('#dashboard-search')) {
    box.style.display = 'none'; box.innerHTML = '';
  }
});

/**
 * Helper debounce
 */
function debounce(fn, wait = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/**
 * Filtrado centralizado por proyecto.
 * - acepta id numérico o nombre parcial/texto del proyecto
 * - oculta sugerencias, recarga tabla, gráficas y KPIs (si existe la función)
 */
async function filterByProject(queryOrId) {
  try {
    let projectId = null;
    if (!queryOrId) {
      projectId = null;
    } else {
      const v = String(queryOrId).trim();
      if (/^\d+$/.test(v)) {
        projectId = Number(v);
      } else {
        const q = v.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
        const keys = Object.keys(projectsMap || {});
        // prioridad: exact -> startsWith -> includes
        let key = keys.find(k => k === q) || keys.find(k => k.startsWith(q));
        if (!key) key = keys.find(k => k.includes(q));
        projectId = key ? Number(projectsMap[key]) : null;
      }
    }

    // esconder sugerencias
    const box = document.getElementById('project-suggestions');
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }

    // recargar vistas con filtro (projectId puede ser null)
    await cargarTablaSupabase({ limit: 300, projectId });
    if (typeof cargarPagoChartDesdeSupabase === 'function') await cargarPagoChartDesdeSupabase(projectId);
    if (typeof cargarPastelDesdeSupabase === 'function') await cargarPastelDesdeSupabase(projectId);
    if (typeof cargarKPIsSupabase === 'function') await cargarKPIsSupabase(projectId);
  } catch (err) {
    console.error('filterByProject error:', err);
  }
}

// Debounced handler para el input (usar en el listener)
const debouncedFilterByProject = debounce((val) => filterByProject(val), 450);

// Inicialización: cargar proyectos y conectar listeners
document.addEventListener('DOMContentLoaded', async () => {
  await cargarProyectosSupabase();

  const input = document.getElementById('dashboard-search');
  const suggestionsBox = document.getElementById('project-suggestions');

  if (input) {
    // Mostrar sugerencias al tipear
    input.addEventListener('input', (e) => {
      const val = e.target.value || '';
      showProjectSuggestions(val);

      // Si el campo quedó vacío, restablecer a todos los registros
      if (val.trim() === '') {
        // oculta sugerencias
        const box = document.getElementById('project-suggestions');
        if (box) { box.style.display = 'none'; box.innerHTML = ''; }
        // recargar todo sin filtro
        filterByProject(null).catch(err => console.error('filterByProject:', err));
      }
      // NOTA: no aplicamos filtro automático cuando hay texto (se aplica con Enter o selección)
    });

    // Enter aplica el filtro (busca proyecto y carga)
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await filterByProject(input.value);
      }
    });

    // Selección con mouse: usar mousedown para que ocurra antes del blur/hide
    suggestionsBox?.addEventListener('mousedown', (e) => {
      const item = e.target.closest('.suggest-item');
      if (!item) return;
      e.preventDefault(); // evitar que el input pierda foco antes de esta acción
      const name = item.dataset.name;
      onSuggestionSelect(name);
    });

    // (Opcional) permitir selección con teclado: flechas + Enter — implementar si lo deseas
  }

  // click fuera: oculta sugerencias (se mantiene)
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#project-suggestions') && !e.target.closest('#dashboard-search')) {
      suggestionsBox.style.display = 'none';
      suggestionsBox.innerHTML = '';
    }
  });

  // cargas iniciales sin filtro
  await cargarTablaSupabase({ limit: 300, projectId: null });
  if (typeof cargarPagoChartDesdeSupabase === 'function') await cargarPagoChartDesdeSupabase(null);
  if (typeof cargarPastelDesdeSupabase === 'function') await cargarPastelDesdeSupabase(null);
  if (typeof cargarKPIsSupabase === 'function') await cargarKPIsSupabase(null);
});

// Helper seguro para escribir texto en un elemento por id
function setTextById(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function calcularYSetearKPIs(data) {
  console.log('[KPIs] calcularYSetearKPIs recibidos:', (data || []).length, data?.slice(0,5));
  if (!data || data.length === 0) {
    // indicar explícito en DOM para no dejar guiones vacíos
    setTextById('total-gastos', formatCurrency(0));
    setTextById('facturas-gastos', formatCurrency(0));
    setTextById('tickets-gastos', formatCurrency(0));
    return;
  }

  let total = 0;
  let totalFacturas = 0;

  data.forEach(r => {
    const importe = Number(String(r.importe).replace(',', '.')) || 0;
    total += importe;
    const tipo = (r.tipo || '').toString().toLowerCase();
    if (tipo.includes('factura')) totalFacturas += importe;
  });

  const totalSinFacturar = total - totalFacturas;
  setTextById('total-gastos', formatCurrency(total));
  setTextById('facturas-gastos', formatCurrency(totalFacturas));
  setTextById('tickets-gastos', formatCurrency(totalSinFacturar));
}