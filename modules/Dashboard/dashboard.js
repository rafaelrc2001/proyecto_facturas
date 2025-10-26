import { supabase } from '../../supabase/db.js';
import { cargarTablaSupabase } from './graficas/tabla.js';
import { cargarPagoChartDesdeSupabase } from './graficas/grafica-barra.js';
import { cargarPastelDesdeSupabase } from './graficas/grafica-pastel.js';

// Función simple: muestra overlay blanco fullscreen si no hay admin autenticado
function verificarSesion() {
  const projectidadmin = localStorage.getItem('projectidadmin');
  if (projectidadmin && projectidadmin === '1') return true;

  if (!document.getElementById('login-warning')) {
    const overlay = document.createElement('div');
    overlay.id = 'login-warning';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:#fff',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font-size:20px',
      'color:#000',
      'padding:20px'
    ].join(';');
    overlay.innerHTML = '<div>Por favor inicie sesión</div>';
    document.body.appendChild(overlay);
    // Evita scroll detrás del overlay
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  return false;
}

// Listener muy corto que crea el overlay lo antes posible al cargar
document.addEventListener('DOMContentLoaded', () => {
  verificarSesion();
});

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
  // Contar CFDI y sin comprobante totales
  let totalCFDI = 0;
  let totalSinComprobante = 0;

  registros.forEach((fila) => {
    const tipo = (fila[2] || "").trim().toLowerCase();
    if (tipo === "cfdi") totalCFDI++;
    else if (tipo === "sin comprobante(ticket o nota)") totalSinComprobante++;
  });

  // Asegura que sean números válidos
  totalCFDI = Number.isFinite(totalCFDI) ? totalCFDI : 0;
  totalSinComprobante = Number.isFinite(totalSinComprobante) ? totalSinComprobante : 0;

  const categories = ["CFDI", "SIN COMPROBANTE"];
  const values = [totalCFDI, totalSinComprobante];
  const colors = ["#003B5C", "#FF6F00"];

  if (window.statusChartInstance) {
    window.statusChartInstance.setOption({
      series: [{
        data: categories.map((cat, idx) => ({
          value: values[idx],
          name: cat,
          itemStyle: { color: colors[idx] }
        }))
      }]
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

// Agrega esto para mostrar el id del admin (projectidadmin)
const projectidadmin = localStorage.getItem('projectidadmin');
if (projectidadmin) {
  console.log(`ID del admin autenticado (projectidadmin): ${projectidadmin}`);
} else {
  console.log('No hay projectidadmin en localStorage');
}

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
      setTextById('tickets-Viaticos', 'Error');
      setTextById('tickets-viaticos-restantes', 'Error');
      return;
    }

    // Consulta de registros
    let query = supabase.from('registro').select('importe, tipo');
    if (projectId) query = query.eq('id_proyecto', projectId);

    const { data, error, status } = await query;
    console.log('[KPIs] respuesta Supabase status=', status, 'error=', error, 'rows=', (data && data.length) || 0);

    if (error) {
      console.error('[KPIs] error de Supabase:', error);
      setTextById('total-gastos', 'Error');
      setTextById('facturas-gastos', 'Error');
      setTextById('tickets-gastos', 'Error');
      setTextById('tickets-Viaticos', 'Error');
      setTextById('tickets-viaticos-restantes', 'Error');
      return;
    }

    // 🔥 CONSULTA PARA TOTAL DE PRESUPUESTOS (Total Viáticos)
    let queryPresupuestos = supabase.from('proyecto').select('presupuesto').eq('visibilidad', true);
    if (projectId) queryPresupuestos = queryPresupuestos.eq('id_proyecto', projectId);

    const { data: presupuestosData, error: presupuestosError } = await queryPresupuestos;
    
    let totalPresupuestos = 0;
    if (presupuestosError) {
      console.error('[KPIs] error obteniendo presupuestos:', presupuestosError);
      setTextById('tickets-Viaticos', 'Error');
      setTextById('tickets-viaticos-restantes', 'Error');
    } else {
      // Calcular total de presupuestos
      totalPresupuestos = (presupuestosData || []).reduce((sum, proyecto) => {
        return sum + (Number(proyecto.presupuesto) || 0);
      }, 0);
      
      setTextById('tickets-Viaticos', formatCurrency(totalPresupuestos));
      console.log('[KPIs] Total presupuestos:', totalPresupuestos);
    }

    if (!data || data.length === 0) {
      console.warn('[KPIs] no hay datos (data vacía).');
      setTextById('total-gastos', '-');
      setTextById('facturas-gastos', '-');
      setTextById('tickets-gastos', '-');
      // 🔥 CALCULAR VIÁTICOS RESTANTES AUNQUE NO HAYA GASTOS
      const viaticosRestantes = totalPresupuestos - 0; // 0 gastos
      setTextById('tickets-viaticos-restantes', formatCurrency(viaticosRestantes));
      return;
    }

    // Calcular totales de gastos
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

    // 🔥 CALCULAR VIÁTICOS RESTANTES: Total Viáticos - Total de Gastos
    const viaticosRestantes = totalPresupuestos - total;

    // Actualizar todos los KPIs
    setTextById('total-gastos', formatCurrency(total));
    setTextById('facturas-gastos', formatCurrency(totalFacturas));
    setTextById('tickets-gastos', formatCurrency(totalSinFacturar));
    setTextById('tickets-viaticos-restantes', formatCurrency(viaticosRestantes));

    console.log('[KPIs] actualizados:', { 
      total, 
      totalFacturas, 
      totalSinFacturar, 
      totalPresupuestos, 
      viaticosRestantes 
    });

  } catch (err) {
    console.error('[KPIs] excepción:', err);
    setTextById('total-gastos', 'Error');
    setTextById('facturas-gastos', 'Error');
    setTextById('tickets-gastos', 'Error');
    setTextById('tickets-Viaticos', 'Error');
    setTextById('tickets-viaticos-restantes', 'Error');
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

// ==============================
// Configuración del administrador
// Maneja mostrar modal, validar contraseña actual, verificar confirmación y actualizar en Supabase
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const avatarBtn = document.getElementById('avatar-btn');
  const avatarModal = document.getElementById('avatar-modal');
  const closeAvatar = document.getElementById('close-avatar-modal');
  const form = document.getElementById('avatar-config-form');
  const msgEl = document.getElementById('cfg-msg');
  const saveBtn = document.getElementById('cfg-save');

  // Abrir modal y cargar usuario actual (opcional)
  avatarBtn?.addEventListener('click', async () => {
    if (avatarModal) avatarModal.style.display = 'flex';
    msgEl && (msgEl.textContent = '');
    const adminId = localStorage.getItem('projectidadmin');
    if (!adminId) return;
    try {
      const { data, error } = await supabase
        .from('login')
        .select('usuario')
        .eq('id', adminId)
        .single();
      if (!error && data && form) {
        form.usuario && (form.usuario.value = data.usuario || '');
      }
    } catch (err) {
      console.error('Error cargando usuario admin:', err);
    }
  });

  closeAvatar?.addEventListener('click', () => {
    if (avatarModal) avatarModal.style.display = 'none';
    msgEl && (msgEl.textContent = '');
  });

  // Toggle mostrar contraseña (usa los botones .pw-toggle existentes en HTML)
  document.querySelectorAll('.pw-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = btn.querySelector('i');
      if (icon) icon.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
    });
  });

  // Toggle para mostrar/ocultar campos de contraseña (usa botones con class="pw-toggle" y data-target="#inputId")
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pw-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (!targetId) return;
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          // intercambia clases de icono (ajusta según los iconos que uses)
          if (isPassword) {
            icon.classList.remove('ri-eye-off-line');
            icon.classList.add('ri-eye-line');
          } else {
            icon.classList.remove('ri-eye-line');
            icon.classList.add('ri-eye-off-line');
          }
        }
      });
    });
  });

  // Submit: validar y actualizar contraseña
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!msgEl) return;
    msgEl.style.color = '#c00';
    msgEl.textContent = '';

    const adminId = localStorage.getItem('projectidadmin');
    if (!adminId) {
      msgEl.textContent = 'Administrador no identificado.';
      return;
    }

    const currentPwd = (form.current_password && form.current_password.value) ? form.current_password.value.trim() : '';
    const newPwd = (form.password && form.password.value) ? form.password.value.trim() : '';
    const newPwd2 = (form.password2 && form.password2.value) ? form.password2.value.trim() : '';

    if (!currentPwd || !newPwd || !newPwd2) {
      msgEl.textContent = 'Completa todos los campos.';
      return;
    }

    if (newPwd !== newPwd2) {
      msgEl.textContent = 'La nueva contraseña y su confirmación no coinciden.';
      return;
    }

    saveBtn && (saveBtn.disabled = true);

    try {
      // Obtiene la contraseña actual desde la tabla login
      const { data: loginRow, error: selectError } = await supabase
        .from('login')
        .select('password')
        .eq('id', adminId)
        .single();

      if (selectError || !loginRow) {
        console.error('Error consultando login:', selectError, loginRow);
        msgEl.textContent = 'Error al verificar la contraseña actual.';
        saveBtn && (saveBtn.disabled = false);
        return;
      }

      // Compara contraseña actual (ajusta si estás usando hashing)
      if ((loginRow.password || '') !== currentPwd) {
        msgEl.textContent = 'La contraseña actual no coincide.';
        saveBtn && (saveBtn.disabled = false);
        return;
      }

      // Asegúrate que el id sea número (si la columna es int)
      const adminIdNum = parseInt(adminId, 10);
      console.log('Actualizar password para id (raw,type):', adminId, typeof adminId, 'parsed:', adminIdNum);

      // Actualiza la contraseña en Supabase y pide que devuelva la fila actualizada
      const { data: updateData, error: updateError } = await supabase
        .from('login')
        .update({ password: newPwd })
        .eq('id', Number.isNaN(adminIdNum) ? adminId : adminIdNum)
        .select(); // devuelve la(s) fila(s) actualizada(s)

      console.log('update response:', { updateData, updateError });
      if (updateError || !updateData || updateData.length === 0) {
        msgEl.textContent = updateError ? 'No se pudo actualizar la contraseña.' : 'No se actualizaron filas (id no encontrado).';
        saveBtn && (saveBtn.disabled = false);
        return;
      }
 
      // Éxito
      msgEl.style.color = '#0a0';
      msgEl.textContent = 'Contraseña actualizada correctamente.';
      // Limpia inputs
      form.current_password && (form.current_password.value = '');
      form.password && (form.password.value = '');
      form.password2 && (form.password2.value = '');

      // Cerrar modal luego de breve tiempo
      setTimeout(() => {
        if (avatarModal) avatarModal.style.display = 'none';
        msgEl && (msgEl.textContent = '');
        saveBtn && (saveBtn.disabled = false);
      }, 1400);

    } catch (err) {
      console.error('Exception updating password:', err);
      msgEl.textContent = 'Ocurrió un error inesperado.';
      saveBtn && (saveBtn.disabled = false);
    }
  });
});