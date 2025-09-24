const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBnwkeQram0eM9JdLWPkbjG9SPrc1ZjsSwFQ_N8gj3l6f3YSB7RBA-j_ddbZXplTjJcPDgiVbLrr3L/pub?output=csv";

async function cargarDatosDashboard() {
  const response = await fetch(SHEET_URL);
  const data = await response.text();
  const filas = data.split("\n").map((row) => row.split(","));
  const registros = filas.slice(1); // omite encabezado

  actualizarTarjetasDashboard(registros);

  // --- Procesar datos para gráficas ---
  actualizarGraficaTipos(registros);
  actualizarGraficaEstatus(registros);
  actualizarGraficaTicketsPorDia(registros);
}

// Procesa y actualiza la gráfica de tipos
function actualizarGraficaTipos(registros) {
  // Suponiendo que columna 0 es Fecha, columna 1 es Tipo
  const facturasPorDia = {};
  registros.forEach((fila) => {
    const fecha = (fila[0] || "").trim();
    const tipo = (fila[1] || "").trim().toLowerCase();
    if (tipo === "factura" && fecha) {
      facturasPorDia[fecha] = (facturasPorDia[fecha] || 0) + 1;
    }
  });

  // Ordenar fechas de menor a mayor
  const fechas = Object.keys(facturasPorDia).sort();
  const valores = fechas.map((f) => facturasPorDia[f]);
  const colors = fechas.map(() => "#0284c7"); // Un solo color o puedes alternar

  if (window.typesChartInstance) {
    window.typesChartInstance.updateData({
      categories: fechas,
      values: valores,
      colors: colors,
    });
  }
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

  const categories = ["Facturas", "Tickets"];
  const values = [totalFacturas, totalTickets];
  const colors = ["#0ea5e9", "#22c55e"];

  if (window.statusChartInstance) {
    window.statusChartInstance.updateData({
      categories,
      values,
      colors,
    });
  }
}

function actualizarTarjetasDashboard(registros) {
  let conteoTickets = 0;
  let conteoFacturas = 0;

  registros.forEach((fila) => {
    if (fila.length > 1) {
      const tipo = fila[1].toLowerCase().trim();
      if (tipo === "ticket" || tipo === "tickets") {
        conteoTickets++;
      } else if (tipo === "factura" || tipo === "facturas") {
        conteoFacturas++;
      }
    }
  });

  const totalGeneral = conteoTickets + conteoFacturas;

  document.getElementById("total-count").textContent = totalGeneral;
  document.getElementById("tickets-count").textContent = conteoTickets;
  document.getElementById("facturas-count").textContent = conteoFacturas;
}

function actualizarGraficaTicketsPorDia(registros) {
  // Suponiendo que columna 0 es Fecha, columna 1 es Tipo
  const ticketsPorDia = {};
  registros.forEach((fila) => {
    const fecha = (fila[0] || "").trim();
    const tipo = (fila[1] || "").trim().toLowerCase();
    if (tipo === "ticket" && fecha) {
      ticketsPorDia[fecha] = (ticketsPorDia[fecha] || 0) + 1;
    }
  });

  const fechas = Object.keys(ticketsPorDia).sort();
  const valores = fechas.map((f) => ticketsPorDia[f]);
  const colors = fechas.map(() => "#22c55e");

  // Inicializar o actualizar la gráfica
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
        itemStyle: { color: "#22c55e" },
      },
    ],
  });
}

document.addEventListener("DOMContentLoaded", cargarDatosDashboard);