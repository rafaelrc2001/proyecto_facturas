const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQFNxPS_lZrhCuH7xrQfeMJgZIb3vaHirtKySurmZCvrQmKV45caRB-eJAqJ6sju3Mxdwy6ituHWBEA/pub?gid=0&single=true&output=csv";
let registrosOriginales = []; // Guarda todos los registros

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

  mostrarTiendas(registros);

  actualizarTarjetasDashboard(registros, window.totalIndex);

  actualizarGraficaTipos(registros);
  actualizarGraficaEstatus(registros);
  actualizarGraficaTicketsPorDia(registros);
  actualizarGraficaPastel(registros);
  actualizarGraficaEstablecimientos(registros);
  actualizarGraficaEstablecimientosTipo(registros);
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
  registros.forEach((fila, idx) => {
    console.log(`Fila ${idx}:`, fila); // Imprime todas las columnas de cada fila
  });

  let conteoTickets = 0;
  let conteoFacturas = 0;
  let sumaTotalGastos = 0;
  let sumaFacturas = 0;
  let sumaTickets = 0;

  registros.forEach((fila) => {
    if (fila.length > totalIndex && totalIndex >= 0) {
      const total = parseFloat(fila[totalIndex]) || 0; // Columna 'total' en índice 3

      sumaTotalGastos += total;
      console.log("Sumando valor:", total);

      const tipo = fila[2].toLowerCase().trim();
      if (tipo === "ticket" || tipo === "tickets") {
        conteoTickets++;
        sumaTickets += total;
      } else if (tipo === "factura" || tipo === "facturas") {
        conteoFacturas++;
        sumaFacturas += total;
      }
    }
  });

  const totalGeneral = conteoTickets + conteoFacturas;

  // KPIs de gastos
  document.getElementById("total-gastos").textContent = "$" + sumaTotalGastos.toFixed(2);
  document.getElementById("facturas-gastos").textContent = "$" + sumaFacturas.toFixed(2);
  document.getElementById("tickets-gastos").textContent = "$" + sumaTickets.toFixed(2);

  // Summary cards
  document.getElementById("total-count").textContent = totalGeneral;
  document.getElementById("tickets-count").textContent = conteoTickets;
  document.getElementById("facturas-count").textContent = conteoFacturas;
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

// Filtra por establecimiento o factura
function filtrarRegistros(valor) {
  valor = valor.toLowerCase();
  const filtrados = registrosOriginales.filter(fila =>
    fila[0].toLowerCase().includes(valor) ||
    fila[1].toLowerCase().includes(valor)
  );
  actualizarTarjetasDashboard(filtrados, window.totalIndex); // <-- CORREGIDO
  // Aquí puedes actualizar también la tabla si tienes una
}

// Muestra las tiendas disponibles en los registros
function mostrarTiendas(registros) {
  const TIENDA_INDEX = 4;

  const tiendasSet = new Set();
  registros.forEach(fila => {
    if (fila[TIENDA_INDEX]) tiendasSet.add(fila[TIENDA_INDEX].trim());
  });
  const tiendas = Array.from(tiendasSet);

  const menu = document.querySelector('.filter-menu');
  menu.innerHTML = "";

  // Opción "Todos"
  const opcionTodos = document.createElement('div');
  opcionTodos.className = 'filter-option';
  opcionTodos.textContent = "Todos";
  opcionTodos.onclick = () => {
    actualizarTarjetasDashboard(registrosOriginales, window.totalIndex); // <-- CORREGIDO
    document.querySelector('.filter-dropdown').classList.remove('active');
  };
  menu.appendChild(opcionTodos);

  tiendas.forEach(tienda => {
    const opcion = document.createElement('div');
    opcion.className = 'filter-option';
    opcion.textContent = tienda;
    opcion.onclick = () => {
      filtrarPorTienda(tienda);
      document.querySelector('.filter-dropdown').classList.remove('active');
    };
    menu.appendChild(opcion);
  });

  console.log("Tiendas agregadas:", tiendas);
  console.log("Opciones en el menú:", menu.innerHTML);
}

// Filtra los registros por tienda seleccionada
function filtrarPorTienda(tienda) {
  const filtrados = registrosOriginales.filter(fila => fila[0].trim() === tienda);
  actualizarTarjetasDashboard(filtrados, window.totalIndex); // <-- CORREGIDO
  // Si tienes una tabla, actualízala aquí también
}

// Evento para el input de búsqueda
document.addEventListener("DOMContentLoaded", () => {
  cargarDatosDashboard();

  document.querySelector('.dashboard-search').addEventListener('input', function(e) {
    const valor = e.target.value.toLowerCase();
    const filtrados = registrosOriginales.filter(fila =>
      (fila[4] && fila[4].toLowerCase().includes(valor)) || // Establecimiento/Folio
      (fila[3] && fila[3].toLowerCase().includes(valor))    // Columna 3 (ej. factura)
    );

    actualizarTarjetasDashboard(filtrados, window.totalIndex);
    actualizarGraficaPastel(filtrados);
    actualizarGraficaEstablecimientosTipo(filtrados);
    // ...otras gráficas si tienes
  });
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

// Llama después de cargar los datos
actualizarGraficaEstablecimientosTipo(registros);
actualizarGraficaEstablecimientosGradiente(registros);
// Al cargar los datos
window.totalIndex = getColIndex("Total", filas);

// En el filtro del buscador
actualizarTarjetasDashboard(filtrados, window.totalIndex);