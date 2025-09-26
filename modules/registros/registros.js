// ------------------- CONFIGURACIÓN DE HOJA -------------------
const SHEET_ID = "1vwurBvgGx2jl1lhMxWZc4QiZFVXJIgwILZdYIUz6Xks"; // Tu Sheet ID
const API_KEY = "TU_API_KEY_AQUI"; // La sacas de Google Cloud
const RANGE = "facturas"; // Cambia si tu hoja se llama distinto
const URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

// CSV público como alternativa
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSBnwkeQram0eM9JdLWPkbjG9SPrc1ZjsSwFQ_N8gj3l6f3YSB7RBA-j_ddbZXplTjJcPDgiVbLrr3L/pub?output=csv";

// ------------------- CONFIGURACIÓN APPS SCRIPT -------------------
const APPS_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzm2z10tHekmyE339mhDcNFArJsfXo8SbRJ2PzrYNKQQb9aGT0WIIpnv5STEhKFmN3zEA/exec";


async function cargarDatosCSV() {
  const response = await fetch(SHEET_URL);
  const data = await response.text();
  const filas = data.split("\n").map((row) => row.split(","));
  registrosGlobal = ordenarPorFechaDesc(filas.slice(1)); // omite encabezado y ordena
  registrosFiltrados = registrosGlobal;
  paginaActual = 1;
  renderTabla(registrosFiltrados);
  actualizarTarjetasDashboard(registrosGlobal); // <-- aquí
}

// ------------------- CARGA DE DATOS DESDE APPS SCRIPT -------------------
async function cargarDatosDesdeAppsScript() {
  try {
    console.log("Cargando datos desde Apps Script...");
    const response = await fetch(APPS_SCRIPT_URL + "?action=get");
    const data = await response.json();

    console.log("Respuesta Apps Script:", data);

    // Aquí debes aceptar array de arrays, no de objetos
    if (Array.isArray(data) && data.length > 1 && Array.isArray(data[0])) {
      // data[0] es el encabezado, data[1...] son los registros
      registrosGlobal = ordenarPorFechaDesc(data.slice(1)); // omite encabezado y ordena
      registrosFiltrados = registrosGlobal;
      paginaActual = 1;

      renderTabla(registrosFiltrados);
      actualizarTarjetasDashboard(registrosGlobal);

      console.log("✅ Datos cargados:", registrosGlobal.length, "registros");
    } else {
      throw new Error("Respuesta inesperada del servidor");
    }
  } catch (error) {
    console.error("❌ Error cargando desde Apps Script:", error);
    cargarDatosCSV();
  }
}

// ------------------- ACTUALIZAR CONTADORES -------------------
function actualizarContadores() {
  let conteoTickets = 0;
  let conteoFacturas = 0;

  // Contar tickets y facturas basándose en la columna "Tipo" (índice 1)
  registrosGlobal.forEach((fila) => {
    if (fila.length > 2) {
      const tipo = fila[2].toLowerCase().trim(); // Cambia a índice 2
      if (tipo === "ticket" || tipo === "tickets") {
        conteoTickets++;
      } else if (tipo === "factura" || tipo === "facturas") {
        conteoFacturas++;
      }
    }
  });

  const totalGeneral = conteoTickets + conteoFacturas;

  // Actualizar las tarjetas usando los IDs específicos
  const totalCountElement = document.getElementById("total-count");
  const ticketsCountElement = document.getElementById("tickets-count");
  const facturasCountElement = document.getElementById("facturas-count");

  if (totalCountElement) {
    totalCountElement.textContent = totalGeneral;
  }

  if (ticketsCountElement) {
    ticketsCountElement.textContent = conteoTickets;
  }

  if (facturasCountElement) {
    facturasCountElement.textContent = conteoFacturas;
  }

  console.log(
    `Contadores actualizados: Total: ${totalGeneral}, Tickets: ${conteoTickets}, Facturas: ${conteoFacturas}`
  );
}

// ------------------- VARIABLES -------------------
let registrosGlobal = [];
let registrosFiltrados = []; // Nueva variable para registros filtrados
let paginaActual = 1;
const registrosPorPagina = 15; // Cambiado de 7 a 15

// ------------------- FUNCIONES DE EDICIÓN Y ELIMINACIÓN -------------------

// Función para habilitar edición en una fila
function habilitarEdicion(filaElement, filaIndex) {
  const celdas = filaElement.querySelectorAll("td:not(:last-child)");

  // Hacer celdas editables
  celdas.forEach((td, index) => {
    const valorOriginal = td.textContent;
    td.innerHTML = `<input type="text" value="${valorOriginal}" class="edit-input">`;
  });

  // Cambiar botones a Guardar/Cancelar
  const tdAcciones = filaElement.lastElementChild;
  tdAcciones.innerHTML = `
    <button class="icon-btn guardar-btn" title="Guardar"><i class="fas fa-save"></i></button>
    <button class="icon-btn cancelar-btn" title="Cancelar"><i class="fas fa-times"></i></button>
  `;

  // Eventos para guardar/cancelar
  tdAcciones.querySelector(".guardar-btn").addEventListener("click", () => {
    guardarEdicion(filaElement, filaIndex);
  });

  tdAcciones.querySelector(".cancelar-btn").addEventListener("click", () => {
    cancelarEdicion(filaElement);
  });
}

// Función para guardar los cambios en Apps Script
async function guardarEdicion(filaElement, filaIndex) {
  // Selecciona sólo los inputs creados para edición
  const inputs = filaElement.querySelectorAll(".edit-input");
  const valores = Array.from(inputs).map(i => i.value);

  // seguridad: debe haber 6 inputs (Fecha..Total)
  if (valores.length < 6) {
    console.warn("Esperaba 6 inputs (Fecha..Total). Encontrados:", valores.length);
  }

  const filaActual = registrosGlobal[filaIndex] || [];
  const sheetRowNumber = filaActual[filaActual.length - 1]; // último elemento = número de fila
  const linkValue = filaActual.length >= 2 ? filaActual[filaActual.length - 2] : ""; // penúltimo = Link (si existe)

  // Reconstruir la fila preservando Id y Link y añadiendo rowNumber al final
  const nuevaFila = [
    filaActual[0] || "",    // Id (no tocar)
    valores[0] || "",      // Fecha
    valores[1] || "",      // Tipo
    valores[2] || "",      // Factura
    valores[3] || "",      // Subtotal
    valores[4] || "",      // IVA
    valores[5] || "",      // Total
    linkValue || "",       // Link (no tocar)
    sheetRowNumber         // número de fila (último)
  ];

  // Actualizar localmente (para que renderTabla muestre los cambios)
  registrosGlobal[filaIndex] = nuevaFila;
  registrosFiltrados = registrosGlobal;

  // Preparar datos a enviar: SOLO Fecha..Total + row
  const formData = new FormData();
  formData.append("action", "update");
  formData.append("row", sheetRowNumber);
  formData.append("Fecha", valores[0] || "");
  formData.append("Tipo", valores[1] || "");
  formData.append("Factura", valores[2] || "");
  formData.append("Subtotal", valores[3] || "");
  formData.append("IVA", valores[4] || "");
  formData.append("Total", valores[5] || "");

  // Opcional: feedback visual en el botón Guardar
  const guardarBtn = filaElement.querySelector(".guardar-btn");
  if (guardarBtn) {
    guardarBtn.disabled = true;
    guardarBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, { method: "POST", body: formData });
    const result = await response.json();

    if (result.success) {
      renderTabla(registrosFiltrados);
      mostrarNotificacion("✅ Registro actualizado", "success");
    } else {
      throw new Error(result.error || result.message || "Respuesta no exitosa");
    }
  } catch (err) {
    console.error("Error al actualizar:", err);
    mostrarNotificacion("❌ Error al actualizar: " + err.message, "error");
    // Restaurar datos desde servidor por seguridad
    await cargarDatosDesdeAppsScript();
  } finally {
    if (guardarBtn) {
      guardarBtn.disabled = false;
      guardarBtn.innerHTML = '<i class="fas fa-save"></i>';
    }
  }
}



// Función para cancelar edición
function cancelarEdicion(filaElement) {
  // Recargar los datos originales
  cargarDatosDesdeAppsScript();
}

// Actualizar la interfaz después de guardar
function actualizarFilaUI(filaElement, nuevosDatos) {
  nuevosDatos.forEach((dato, index) => {
    const td = filaElement.children[index];
    td.textContent = dato;
    td.classList.remove("editing");
  });

  // Restaurar botones normales
  const tdAcciones = filaElement.lastElementChild;
  tdAcciones.innerHTML = `
    <button class="icon-btn" title="Ver"><i class="fas fa-eye"></i></button>
    <button class="icon-btn" title="Editar"><i class="fas fa-edit"></i></button>
    <button class="icon-btn" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
  `;

  // Reagregar eventos
  agregarEventosAcciones(
    filaElement,
    Array.from(filaElement.parentNode.children).indexOf(filaElement)
  );
}

// Función para eliminar registro
async function eliminarRegistro(filaIndex) {
  if (!confirm("¿Eliminar este registro?")) return;

  const filaEliminada = registrosGlobal[filaIndex];
  const sheetRowNumber = filaEliminada[filaEliminada.length - 1]; // último valor

  const formData = new FormData();
  formData.append('action', 'delete');
  formData.append('row', sheetRowNumber);

  const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formData });
  const result = await response.json();

  if (result.success) {
    registrosGlobal.splice(filaIndex, 1);
    registrosFiltrados = registrosGlobal;
    renderTabla(registrosFiltrados);
    actualizarContadores();
    mostrarNotificacion("✅ Registro eliminado", "success");
  } else {
    mostrarNotificacion("❌ Error: " + result.error, "error");
  }
}


// ------------------- RENDER TABLA -------------------
function renderTabla(registros) {
  const tbody = document.querySelector("#facturasTable tbody");
  tbody.innerHTML = "";

  const inicio = (paginaActual - 1) * registrosPorPagina;
  const fin = inicio + registrosPorPagina;
  const paginaRegistros = registros.slice(inicio, fin);

  paginaRegistros.forEach((fila, indexLocal) => {
    if (fila.length >= 6) {
      const tr = document.createElement("tr");

      // Formatear la fecha
      let fechaFormateada = fila[1]; // Ahora la fecha está en la columna 1
      if (fechaFormateada && fechaFormateada.includes("T")) {
        const fechaObj = new Date(fechaFormateada);
        fechaFormateada = fechaObj.toLocaleDateString("es-ES");
      }

      // Mostrar columnas: Fecha, Tipo, Factura, Subtotal, IVA, Total
      const columnas = [fechaFormateada, fila[2], fila[3], fila[4], fila[5], fila[6]];
      columnas.forEach((valor) => {
        const td = document.createElement("td");
        td.textContent = valor || "";
        tr.appendChild(td);
      });

      // Botones de acciones
      const tdAcciones = document.createElement("td");
      tdAcciones.innerHTML = `
        <button class="icon-btn" title="Ver"><i class="fas fa-eye"></i></button>
        <button class="icon-btn" title="Editar"><i class="fas fa-edit"></i></button>
        <button class="icon-btn" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
      `;
      tr.appendChild(tdAcciones);
      tbody.appendChild(tr);

      // Agregar eventos a esta fila específica
      const filaGlobalIndex = inicio + indexLocal;
      agregarEventosAcciones(tr, filaGlobalIndex);
    }
  });

  renderPaginacion(registros.length);
}

// ------------------- PAGINACIÓN -------------------
function renderPaginacion(totalRegistros) {
  const paginacion = document.querySelector(".pagination");
  paginacion.innerHTML = "";

  const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
  let start = Math.max(1, paginaActual - 2);
  let end = Math.min(totalPaginas, start + 4);

  // Ajustar el rango si estamos cerca del final
  if (end - start < 4) {
    start = Math.max(1, end - 4);
  }

  // Botón anterior
  if (paginaActual > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "<";
    prevBtn.addEventListener("click", () => {
      paginaActual--;
      renderTabla(registrosFiltrados);
    });
    paginacion.appendChild(prevBtn);
  }

  // Botones de página
  for (let i = start; i <= end; i++) {
    const btn = document.createElement("button");
    btn.className = "pagination-btn" + (i === paginaActual ? " active" : "");
    btn.textContent = i;
    btn.addEventListener("click", () => {
      paginaActual = i;
      renderTabla(registrosFiltrados);
    });
    paginacion.appendChild(btn);
  }

  // Botón siguiente
  if (paginaActual < totalPaginas) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = ">";
    nextBtn.addEventListener("click", () => {
      paginaActual++;
      renderTabla(registrosFiltrados);
    });
    paginacion.appendChild(nextBtn);
  }
}

// ------------------- BÚSQUEDA -------------------
document
  .querySelector(".search-bar input")
  .addEventListener("keyup", function () {
    const filtro = this.value.toLowerCase();

    if (filtro === "") {
      // Si no hay filtro, mostrar todos los registros
      registrosFiltrados = registrosGlobal;
    } else {
      // Filtrar registros
      registrosFiltrados = registrosGlobal.filter((fila) => {
        return fila.some((celda) => String(celda).toLowerCase().includes(filtro));
      });
    }

    paginaActual = 1; // Resetear a la primera página
    renderTabla(registrosFiltrados);
    actualizarContadoresFiltrados(registrosFiltrados);
  });

// ------------------- ACTUALIZAR CONTADORES FILTRADOS -------------------
function actualizarContadoresFiltrados(registrosFiltrados) {
  let conteoTickets = 0;
  let conteoFacturas = 0;

  // Contar tickets y facturas en los registros filtrados
  registrosFiltrados.forEach((fila) => {
    if (fila.length > 2) {
      const tipo = fila[2].toLowerCase().trim(); // Cambia a índice 2
      if (tipo === "ticket" || tipo === "tickets") {
        conteoTickets++;
      } else if (tipo === "factura" || tipo === "facturas") {
        conteoFacturas++;
      }
    }
  });

  const totalGeneral = conteoTickets + conteoFacturas;

  // Actualizar las tarjetas
  const totalCountElement = document.getElementById("total-count");
  const ticketsCountElement = document.getElementById("tickets-count");
  const facturasCountElement = document.getElementById("facturas-count");

  if (totalCountElement) {
    totalCountElement.textContent = totalGeneral;
  }

  if (ticketsCountElement) {
    ticketsCountElement.textContent = conteoTickets;
  }

  if (facturasCountElement) {
    facturasCountElement.textContent = conteoFacturas;
  }
}

// ------------------- EXPORTAR CSV -------------------
document.querySelector(".btn.primary").addEventListener("click", function () {
  // Descargar directamente como CSV
  descargarCSV();
});

// ------------------- DESCARGAR CSV -------------------
function descargarCSV() {
  try {
    mostrarNotificacion("Descargando archivo CSV...", "info");

    const enlaceDescarga = document.createElement("a");
    enlaceDescarga.href = SHEET_URL;
    enlaceDescarga.download = "facturas_y_tickets.csv";
    enlaceDescarga.style.display = "none";

    document.body.appendChild(enlaceDescarga);
    enlaceDescarga.click();
    document.body.removeChild(enlaceDescarga);

    mostrarNotificacion("Descarga CSV iniciada correctamente", "success");
  } catch (error) {
    console.error("Error al descargar CSV:", error);
    mostrarNotificacion("Error al descargar CSV", "error");
  }
}

// ------------------- MODAL -------------------
function getDriveImageLink(link) {
  if (!link) return null;

  let fileId = null;

  // /file/d/ID/
  let match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) fileId = match[1];

  // ?id=ID
  if (!fileId) {
    match = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  // /open?id=ID
  if (!fileId) {
    match = link.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  }

  return fileId ? `https://drive.google.com/uc?export=view&id=${fileId}` : null;
}

// Nueva función para agregar eventos de acciones
function agregarEventosAcciones(filaElement, filaIndex) {
  // Evento Ver: abrir URL en nueva pestaña
  filaElement
    .querySelector('.icon-btn[title="Ver"]')
    .addEventListener("click", function () {
      const link = registrosFiltrados[filaIndex] ? registrosFiltrados[filaIndex][6] : null;
      if (link) {
        window.open(link, '_blank');
      }
    });

  // Evento Editar
  filaElement
    .querySelector('.icon-btn[title="Editar"]')
    .addEventListener("click", function () {
      habilitarEdicion(filaElement, filaIndex);
    });

  // Evento Eliminar
  filaElement
    .querySelector('.icon-btn[title="Eliminar"]')
    .addEventListener("click", function () {
      eliminarRegistro(filaIndex);
    });
}

function agregarEventosVer() {
  document.querySelectorAll(".icon-btn[title='Ver']").forEach((btn) => {
    btn.addEventListener("click", function () {
      const fila = btn.closest("tr");
      const datos = Array.from(fila.querySelectorAll("td"))
        .slice(0, 6)
        .map((td) => td.textContent);
      const index = Array.from(fila.parentNode.children).indexOf(fila);
      const link =
        registrosFiltrados[(paginaActual - 1) * registrosPorPagina + index][6];

      const imgSrc = getDriveImageLink(link);
      console.log("URL de imagen Drive generada:", imgSrc); // Imprime la URL en consola

      let linkHtml = "";
      if (imgSrc) {
        linkHtml = `<br><strong>Enlace:</strong> <a href="${imgSrc}" target="_blank" style="color:#1565c0;text-decoration:underline;">Ver imagen en Drive</a>`;
      } else if (link) {
        linkHtml = `<br><strong>Enlace:</strong> <span style="color:#ef4444;">No se pudo generar el enlace</span>`;
      }

      const detalle = `
                <strong>Fecha:</strong> ${datos[0]}<br>
                <strong>Tipo:</strong> ${datos[1]}<br>
                <strong>Factura:</strong> ${datos[2]}<br>
                <strong>Subtotal:</strong> ${datos[3]}<br>
                <strong>IVA:</strong> ${datos[4]}<br>
                <strong>Total:</strong> ${datos[5]}
                ${linkHtml}
            `;
      document.getElementById("modal-detalle").innerHTML = detalle;
      document.getElementById("modal-ver").style.display = "block";
    });
  });

  // Cerrar modal
  document.querySelector(".modal-close").onclick = () => {
    document.getElementById("modal-ver").style.display = "none";
  };
  window.onclick = (event) => {
    if (event.target === document.getElementById("modal-ver")) {
      document.getElementById("modal-ver").style.display = "none";
    }
  };
}

// ------------------- NOTIFICACIONES -------------------
function mostrarNotificacion(mensaje, tipo = "info") {
  // Crear elemento de notificación
  const notificacion = document.createElement("div");
  notificacion.className = `notificacion ${tipo}`;
  notificacion.innerHTML = `
    <span>${mensaje}</span>
    <button onclick="this.parentElement.remove()">&times;</button>
  `;

  // Estilos para la notificación
  notificacion.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${
      tipo === "success" ? "#4CAF50" : tipo === "error" ? "#f44336" : "#2196F3"
    };
    color: white;
    border-radius: 5px;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 10px;
  `;

  document.body.appendChild(notificacion);

  // Auto-eliminar después de 3 segundos
  setTimeout(() => {
    if (notificacion.parentElement) {
      notificacion.remove();
    }
  }, 3000);
}

// ------------------- INICIALIZAR -------------------
document.addEventListener("DOMContentLoaded", () => {
  cargarDatosDesdeAppsScript();

  // Cerrar modal solo si existe el elemento
  const modalCloseBtn = document.querySelector(".modal-close");
  if (modalCloseBtn) {
    modalCloseBtn.onclick = () => {
      document.getElementById("modal-ver").style.display = "none";
    };
  }
  window.onclick = (event) => {
    const modalVer = document.getElementById("modal-ver");
    if (modalVer && event.target === modalVer) {
      modalVer.style.display = "none";
    }
  };
});

function actualizarTarjetasDashboard(registros) {
  let conteoTickets = 0;
  let conteoFacturas = 0;

  registros.forEach((fila) => {
    if (fila.length > 2) {
      const tipo = fila[2].toLowerCase().trim(); // Cambia a índice 2
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


  // Función para mostrar la fecha actual
  function mostrarFecha() {
    const fecha = new Date();
    const opciones = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const fechaFormateada = fecha.toLocaleDateString("es-ES", opciones);
    const fechaElem = document.getElementById("current-date");
    if (fechaElem) {
      fechaElem.textContent = fechaFormateada;
    }
  }

  // Ejecutar al cargar la página
  document.addEventListener("DOMContentLoaded", mostrarFecha);

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-ver')) {
      const url = e.target.getAttribute('data-url');
      if (url) {
        window.open(url, '_blank'); // Abre la URL en otra ventana/pestaña
      }
    }
  });

function ordenarPorFechaDesc(registros) {
  return registros.slice().sort((a, b) => {
    const fechaA = new Date(a[1]);
    const fechaB = new Date(b[1]);
    return fechaB - fechaA;
  });
}

function doGet(e) {
  var doc = SpreadsheetApp.openById(SHEET_ID);
  var sheet = doc.getSheetByName(SHEET_NAME);
  var values = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(values)).setMimeType(ContentService.MimeType.JSON);
}

