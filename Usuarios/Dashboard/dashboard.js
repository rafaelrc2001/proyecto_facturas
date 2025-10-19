import { supabase } from '../../supabase/db.js';
import { cargarTablaSupabase } from './graficas/tabla.js';
import { cargarPagoChartDesdeSupabase } from './graficas/grafica-barra.js';
import { cargarPastelDesdeSupabase } from './graficas/grafica-pastel.js';

const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQFNxPS_lZrhCuH7xrQfeMJgZIb3vaHirtKySurmZCvrQmKV45caRB-eJAqJ6sju3Mxdwy6ituHWBEA/pub?gid=0&single=true&output=csv";
let registrosOriginales = []; // Guarda todos los registros
let projectsMap = {}; // nombre_lower -> id_proyecto
let projectsList = []; // lista de nombres para sugerencias

function getColIndex(nombreColumna, filas) {
  // Busca el índice por el nombre en la primera fila (encabezado)
  if (!filas || !filas.length) return -1;
  return filas[0].findIndex(col => col.trim().toLowerCase() === nombreColumna.trim().toLowerCase());
}

// Ejemplo de uso en cargarDatosDashboard:
async function cargarDatosDashboard() {
  const response = await fetch(SHEET_URL);
  const data = await response.text();
  const filas = data.split("\n").map((row) => row.split(","));
  const registros = filas.slice(1); // omite encabezado

  // Obtén el índice de la columna "Total"
  window.totalIndex = getColIndex("Total", filas);
  console.log("Índice de columna 'Total':", window.totalIndex);

  registrosOriginales = registros;

  // Cargar KPIs (Supabase) después de tener registros cargados
  // (esto evita errores por llamadas fuera de scope)
  cargarKPIsSupabase();

  // Si quieres actualizar gráficas al cargar, descomenta y deja las llamadas aquí,
  // usando la variable `registros` (que sí existe en este scope):
  // actualizarGraficaEstablecimientos(registros);
  // actualizarGraficaEstablecimientosTipo(registros);
  // actualizarGraficaTipos(registros);
  // actualizarGraficaEstatus(registros);
  // actualizarGraficaTicketsPorDia(registros);
}

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
function actualizarGraficaEstatus(registros) {
  // Contar facturas y tickets totales
  let totalFacturas = 0;
  let totalTickets = 0;

  registros.forEach((fila) => {
    const tipo = (fila[1] || "").trim().toLowerCase();
    if (tipo === "factura") totalFacturas++;
    else if (tipo === "ticket") totalTickets++;
  });

  // Asegura que sean números válidos
  totalFacturas = Number.isFinite(totalFacturas) ? totalFacturas : 0;
  totalTickets = Number.isFinite(totalTickets) ? totalTickets : 0;

  // Si ambos son cero, pon 1 y 1 para evitar división por cero
  if (totalFacturas === 0 && totalTickets === 0) {
    totalFacturas = 1;
    totalTickets = 1;
  }

  const categories = ["Facturas", "Tickets"];
  const values = [totalFacturas, totalTickets];
  const colors = ["#1D3E53", "#77ABB7"];

  if (window.statusChartInstance) {
    window.statusChartInstance.updateData({
      categories,
      values,
      colors,
    });
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
    console.log('[KPIs] iniciar, projectId=', projectId);

    if (typeof supabase === 'undefined' || !supabase) {
      console.error('[KPIs] supabase no está definido (revisar supabase/db.js import).');
      setTextById('total-gastos', 'Error');
      setTextById('facturas-gastos', 'Error');
      setTextById('tickets-gastos', 'Error');
      return;
    }

    let query = supabase.from('registro').select('importe, tipo');
    if (projectId) query = query.eq('id_proyecto', projectId);

    const { data, error, status } = await query;
    console.log('[KPIs] respuesta Supabase status=', status, 'error=', error, 'rows=', (data && data.length) || 0);

    if (error) {
      console.error('[KPIs] error de Supabase:', error);
      setTextById('total-gastos', 'Error');
      setTextById('facturas-gastos', 'Error');
      setTextById('tickets-gastos', 'Error');
      return;
    }

    if (!data || data.length === 0) {
      console.warn('[KPIs] no hay datos (data vacía).');
      setTextById('total-gastos', '-');
      setTextById('facturas-gastos', '-');
      setTextById('tickets-gastos', '-');
      return;
    }

    // Nueva lógica: "Sin facturar" = suma de todo lo que NO sea factura
    let total = 0;
    let totalFacturas = 0;

    data.forEach(r => {
      const importe = Number(String(r.importe).replace(',', '.')) || 0;
      total += importe;
      const tipo = (r.tipo || '').toString().toLowerCase();
      if (tipo.includes('factura')) {
        totalFacturas += importe;
      }
    });

    const totalSinFacturar = total - totalFacturas;

    setTextById('total-gastos', formatCurrency(total));
    setTextById('facturas-gastos', formatCurrency(totalFacturas));
    setTextById('tickets-gastos', formatCurrency(totalSinFacturar));

    console.log('[KPIs] actualizados:', { total, totalFacturas, totalSinFacturar });

  } catch (err) {
    console.error('[KPIs] excepción:', err);
    setTextById('total-gastos', 'Error');
    setTextById('facturas-gastos', 'Error');
    setTextById('tickets-gastos', 'Error');
  }
}

// helper formato moneda (si no la tienes)
function formatCurrency(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Carga proyectos en memoria (no renderiza select)
async function cargarProyectosSupabase() {
  try {
    const { data, error } = await supabase
      .from('proyecto')
      .select('id_proyecto, nombre')
      .eq('visibilidad', true);

    if (error) {
      console.error('Error cargando proyectos:', error);
      return;
    }
    const proyectos = data || [];
    projectsMap = {};
    projectsList = proyectos.map(p => {
      const name = (p.nombre || '').toString().trim();
      if (name) projectsMap[name.toLowerCase()] = p.id_proyecto;
      return name;
    }).filter(Boolean);
  } catch (err) {
    console.error('Exception cargando proyectos:', err);
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
      // si parece un id numérico exacto lo usamos
      if (/^\d+$/.test(v)) {
        projectId = v;
      } else {
        // buscar por nombre en projectsMap (keys en lowercase)
        const q = v.toLowerCase();
        const keys = Object.keys(projectsMap || {});
        // prioridad: startsWith -> includes
        let key = keys.find(k => k === q) || keys.find(k => k.startsWith(q));
        if (!key) key = keys.find(k => k.includes(q));
        projectId = key ? projectsMap[key] : null;
      }
    }

    // esconder sugerencias
    const box = document.getElementById('project-suggestions');
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }

    // recargar vistas con filtro (projectId puede ser null)
    await cargarTablaSupabase({ limit: 300, projectId });
    if (typeof cargarPagoChartDesdeSupabase === 'function') await cargarPagoChartDesdeSupabase(projectId);
    if (typeof cargarPastelDesdeSupabase === 'function') await cargarPastelDesdeSupabase(projectId);
    // cargar KPIs si existe (puede estar deshabilitada)
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