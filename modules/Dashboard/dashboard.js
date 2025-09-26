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
  actualizarGraficaPastel(registros);
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

function actualizarTarjetasDashboard(registros) {
  let conteoTickets = 0;
  let conteoFacturas = 0;

  registros.forEach((fila) => {
    if (fila.length > 2) {
      const tipo = fila[2].toLowerCase().trim(); // Usa índice 2 como en registros.js
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

document.addEventListener("DOMContentLoaded", cargarDatosDashboard);