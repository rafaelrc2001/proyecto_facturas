const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBnwkeQram0eM9JdLWPkbjG9SPrc1ZjsSwFQ_N8gj3l6f3YSB7RBA-j_ddbZXplTjJcPDgiVbLrr3L/pub?output=csv";

async function cargarDatosDashboard() {
  const response = await fetch(SHEET_URL);
  const data = await response.text();
  const filas = data.split("\n").map((row) => row.split(","));
  const registros = filas.slice(1); // omite encabezado
  actualizarTarjetasDashboard(registros);
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

document.addEventListener("DOMContentLoaded", cargarDatosDashboard);