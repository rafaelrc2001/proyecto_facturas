import { supabase } from '../../supabase/db.js';

// Tipos de pago para separar las tablas
const tiposPago = [
  "PAGO EDENRED CON CFDI",
  "PAGO EDENRED SIN COMPROBANTE",
  "RETIRO EDENRED CFDI",
  "RETIBO EDENRED SIN COMPROBANTE",
  "PAGO EFECTIVO CAJA CFDI",
  "PAGO EFECTIVO CAJA SIN COMPROBANTE",
  "PAGO TARJETA PERSONAL CON CFDI",
  "PAGO TARJETA PERSONAL SIN COMPROBANTE"
];

let proyectosInfo = [];
let proyectosNombres = [];
let registrosOriginales = [];
let respuestasHTML = '';
// 🔥 AGREGAR ESTA VARIABLE:
let vehiculos = [];

// 🔥 NUEVA FUNCIÓN: Cargar vehículos desde la base de datos
async function cargarVehiculos() {
  try {
    const { data, error } = await supabase
      .from('vehiculo')               // <- usar 'vehiculo' (singular)
      .select('id, marca, modelo, placas')
      .order('marca');

    if (error) {
      console.error('Error al cargar vehículos:', error);
      vehiculos = [];
      return;
    }

    vehiculos = data || [];
    console.log(`Vehículos cargados: ${vehiculos.length}`);
    llenarSelectVehiculos();
  } catch (err) {
    console.error('Error inesperado al cargar vehículos:', err);
    vehiculos = [];
  }
}

function llenarSelectVehiculos() {
  const selectVehiculo = document.getElementById('respuesta1');
  if (!selectVehiculo) {
    console.warn('Select de vehículos no encontrado (ID: respuesta1)');
    return;
  }

  selectVehiculo.innerHTML = '<option value="" disabled selected>Selecciona un vehículo</option>';

  if (vehiculos.length === 0) {
    const option = document.createElement('option');
    option.value = "";
    option.textContent = "No hay vehículos disponibles";
    option.disabled = true;
    selectVehiculo.appendChild(option);
    return;
  }

  vehiculos.forEach(v => {
    const option = document.createElement('option');
    option.value = `${v.marca} ${v.modelo} - ${v.placas}`;
    option.textContent = `${v.marca} ${v.modelo} - ${v.placas}`;
    selectVehiculo.appendChild(option);
  });
}

// Agregar función: verifica session solo por projectidadmin === '1'
function verificarSesion() {
  const projectidadmin = localStorage.getItem('projectidadmin');
  if (!projectidadmin || projectidadmin !== '1') {
    const body = document.body;
    Array.from(body.children).forEach(el => el.style.display = 'none');
    const aviso = document.createElement('div');
    aviso.id = 'login-warning';
    aviso.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100vh;padding:1rem;font-size:1.25rem;';
    aviso.textContent = 'Por favor inicie sesión';
    body.appendChild(aviso);
    return false;
  }
  return true;
}

// Cargar proyectos y registros al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  if (!verificarSesion()) return;
  await cargarProyectosNombres();
  await cargarRegistrosSupabase();
  await cargarVehiculos();
  
  // Configurar eventos de filtros
  configurarEventosFiltros();
  
  // Mostrar todos los registros inicialmente
  mostrarTablasPorProyecto();
});

// Nueva función para configurar todos los eventos de filtros
function configurarEventosFiltros() {
  // Configurar autocompletado de proyectos
  configurarAutocompletadoProyecto();
  
  // Configurar filtros de fecha
  configurarFiltrosFecha();
}

// Función para configurar autocompletado de proyectos
function configurarAutocompletadoProyecto() {
  const proyectoInput = document.getElementById('imprimir-proyecto-autocomplete');
  const autocompleteList = document.getElementById('imprimir-autocomplete-list');

  if (!proyectoInput || !autocompleteList) return;

  proyectoInput.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    autocompleteList.innerHTML = '';
    
    if (!valor) {
      aplicarFiltrosCombinados(); // Aplicar filtros sin proyecto específico
      return;
    }
    
    const sugerencias = proyectosNombres.filter(n => n.toLowerCase().includes(valor));
    sugerencias.forEach(nombre => {
      const div = document.createElement('div');
      div.textContent = nombre;
      div.onclick = function() {
        proyectoInput.value = nombre;
        autocompleteList.innerHTML = '';
        aplicarFiltrosCombinados(); // Aplicar filtros con proyecto seleccionado
      };
      autocompleteList.appendChild(div);
    });
  });

  // Ocultar autocompletado al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!autocompleteList.contains(e.target) && e.target !== proyectoInput) {
      autocompleteList.innerHTML = '';
    }
  });
}

// Función para configurar filtros de fecha
function configurarFiltrosFecha() {
  const fechaDesde = document.getElementById('fecha-desde');
  const fechaHasta = document.getElementById('fecha-hasta');
  const limpiarFechas = document.getElementById('limpiar-fechas');

  if (!fechaDesde || !fechaHasta || !limpiarFechas) {
    console.warn('Elementos de filtro de fecha no encontrados');
    return;
  }

  // Eventos para aplicar filtros cuando cambien las fechas
  fechaDesde.addEventListener('change', aplicarFiltrosCombinados);
  fechaHasta.addEventListener('change', aplicarFiltrosCombinados);
  
  // Evento para limpiar filtros de fecha
  limpiarFechas.addEventListener('click', () => {
    fechaDesde.value = '';
    fechaHasta.value = '';
    aplicarFiltrosCombinados();
  });
}

// Nueva función que aplica TODOS los filtros combinados
function aplicarFiltrosCombinados() {
  const fechaDesde = document.getElementById('fecha-desde')?.value || '';
  const fechaHasta = document.getElementById('fecha-hasta')?.value || '';
  const proyectoSeleccionado = document.getElementById('imprimir-proyecto-autocomplete')?.value || '';

  let registrosFiltrados = [...registrosOriginales];

  // FILTRO 1: Por proyecto (si hay uno seleccionado)
  if (proyectoSeleccionado) {
    const proyecto = proyectosInfo.find(p => p.nombre === proyectoSeleccionado);
    if (proyecto) {
      registrosFiltrados = registrosFiltrados.filter(r => 
        String(r.id_proyecto) === String(proyecto.id_proyecto)
      );
    }
  }

  // FILTRO 2: Por rango de fechas de cargo
  if (fechaDesde || fechaHasta) {
    registrosFiltrados = registrosFiltrados.filter(registro => {
      if (!registro.fecha_cargo) return false;
      
      const fechaCargo = new Date(registro.fecha_cargo);
      let cumpleFiltro = true;

      if (fechaDesde) {
        const desde = new Date(fechaDesde);
        desde.setHours(0, 0, 0, 0); // Inicio del día
        cumpleFiltro = cumpleFiltro && fechaCargo >= desde;
      }

      if (fechaHasta) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59, 999); // Final del día
        cumpleFiltro = cumpleFiltro && fechaCargo <= hasta;
      }

      return cumpleFiltro;
    });
  }

  // Mostrar registros filtrados
  mostrarTablasFiltradas(registrosFiltrados, proyectoSeleccionado);
}

// Función para mostrar tablas con registros filtrados
function mostrarTablasFiltradas(registrosFiltrados, nombreProyecto) {
  const container = document.getElementById('imprimir-table-container');
  container.innerHTML = '';

  // Mostrar información del proyecto
  const infoContainer = document.getElementById('imprimir-proyecto-info');
  infoContainer.innerHTML = '';

  // 🔥 OBTENER LAS FECHAS SELECCIONADAS
  const fechaDesde = document.getElementById('fecha-desde')?.value || '';
  const fechaHasta = document.getElementById('fecha-hasta')?.value || '';
  
  // 🔥 CREAR TEXTO DE RANGO DE FECHAS
  let rangoFechas = '';
  if (fechaDesde && fechaHasta) {
    rangoFechas = `Del ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}`;
  } else if (fechaDesde) {
    rangoFechas = `Desde el ${formatearFecha(fechaDesde)}`;
  } else if (fechaHasta) {
    rangoFechas = `Hasta el ${formatearFecha(fechaHasta)}`;
  }

  let proyecto = null;

  if (nombreProyecto) {
    proyecto = proyectosInfo.find(p => p.nombre === nombreProyecto);
    if (proyecto) {
      infoContainer.innerHTML = `
        <h2 style="text-align:center; color:#FF6F00; margin-bottom:18px;">Listado de Facturas y Tickets</h2>
        ${rangoFechas ? `<p style="text-align:center; font-size:1.1em; color:#276080; font-weight:600; margin-bottom:18px;">${rangoFechas}</p>` : ''}
        <hr style="border:1px solid #FF6F00; margin-bottom:18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
          <div style="flex:1;">
            <table style="font-size:1em;">
              <tr>
                <td><strong>NOMBRE DEL PROYECTO:</strong></td>
                <td>${proyecto.nombre || ''}</td>
              </tr>
              <tr>
                <td><strong>CLIENTE:</strong></td>
                <td>${proyecto.cliente || ''}</td>
              </tr>
              <tr>
                <td><strong>UBICACIÓN DE LA OBRA:</strong></td>
                <td>${proyecto.ubicación || ''}</td>
              </tr>
              <tr>
                <td><strong>RESPONSABLE DEL PROYECTO:</strong></td>
                <td>${proyecto.responsable || ''}</td>
              </tr>
            </table>
          </div>
          <div style="flex:0 0 180px; text-align:right;">
            <img src="../../img/inxite.png" alt="Logo Inxite" style="max-width:160px;">
          </div>
        </div>
      `;
    }
  } else {
    infoContainer.innerHTML = `
      <h2 style="text-align:center; color:#FF6F00; margin-bottom:18px;">Listado de Facturas y Tickets</h2>
      ${rangoFechas ? `<p style="text-align:center; font-size:1.1em; color:#276080; font-weight:600; margin-bottom:18px;">${rangoFechas}</p>` : ''}
      <hr style="border:1px solid #FF6F00; margin-bottom:18px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div style="flex:1;"></div>
        <div style="flex:0 0 180px; text-align:right;">
          <img src="../../img/inxite.png" alt="Logo Inxite" style="max-width:160px;">
        </div>
      </div>
    `;
  }

  let totalRegistros = 0;

  tiposPago.forEach(tipo => {
    const tipoNormalizado = tipo.replace(/\s+/g, ' ').trim().toLowerCase();
    const registrosPorTipo = registrosFiltrados.filter(r =>
      r.pago && r.pago.replace(/\s+/g, ' ').trim().toLowerCase() === tipoNormalizado
    );
    
    if (registrosPorTipo.length > 0) {
      totalRegistros += registrosPorTipo.length;
      let tablaHTML = `
        <h4 class="imprimir-titulo-tipo">${tipo}</h4>
        <table class="imprimir-subtabla">
          <thead>
            <tr>
              <th>Fecha de cargo</th>
              <th>Fecha de Facturación</th>
              <th>Tipo</th>
              <th>Folio</th>
              <th>Establecimiento</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
      `;
      let totalImporte = 0;
      registrosPorTipo.forEach(reg => {
        tablaHTML += `
          <tr>
            <td>${formatearFecha(reg.fecha_cargo) || ''}</td>
            <td>${formatearFecha(reg.fecha_facturacion) || ''}</td>
            <td>${reg.tipo || ''}</td>
            <td>${reg.folio || ''}</td>
            <td>${reg.establecimiento || ''}</td>
            <td>${formatoMoneda(reg.importe) || ''}</td>
          </tr>
        `;
        totalImporte += Number(reg.importe) || 0;
      });
      tablaHTML += `
        </tbody>
        </table>
        <div class="imprimir-total">Total: ${formatoMoneda(totalImporte)}</div>
      `;
      container.innerHTML += tablaHTML;
    }
  });

  // Total general
  const totalGeneral = registrosFiltrados.reduce((acc, reg) => acc + (Number(reg.importe) || 0), 0);
  container.innerHTML += `
    <div class="imprimir-total-general" style="font-weight:bold; color:#FF6F00; margin-top:24px; font-size:1.2em;">
      Total general de importes: ${formatoMoneda(totalGeneral)}
    </div>
  `;

  // Agregar respuestas si existen
  container.innerHTML += respuestasHTML;

  // Actualizar contador
  const contadorElement = document.getElementById('imprimir-contador-registros');
  if (contadorElement) {
    contadorElement.textContent = `Registros mostrados: ${totalRegistros}`;
  }
}

// Actualizar la función mostrarTablasPorProyecto existente para usar la nueva lógica
function mostrarTablasPorProyecto(nombreProyecto = '') {
  if (nombreProyecto) {
    document.getElementById('imprimir-proyecto-autocomplete').value = nombreProyecto;
  }
  aplicarFiltrosCombinados();
}

// Cargar nombres de proyectos
async function cargarProyectosNombres() {
  const idTrabajadorRaw = localStorage.getItem('id_trabajador');
  const idTrabajador = idTrabajadorRaw ? Number(idTrabajadorRaw) : null;
  const userRaw = localStorage.getItem('user');

  if (!userRaw) {
    proyectosInfo = [];
    proyectosNombres = [];
    return;
  }

  const user = JSON.parse(userRaw || '{}');

  try {
    let proyectos = [];

    if (idTrabajador && user.role === 'trabajador') {
      // Para trabajadores: solo proyectos asignados, visibles y NO liberados
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', idTrabajador);
      
      if (asignErr) throw asignErr;
      
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (ids.length === 0) {
        proyectosInfo = [];
        proyectosNombres = [];
        return;
      }
      
      // 🔥 CAMBIAR: usar 'ubicación' con tilde
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final') // 🔥 CON TILDE
        .in('id_proyecto', ids)
        .eq('visibilidad', true)
        .eq('liberar', false);
      proyectos = data || [];
    } else {
      // 🔥 CAMBIAR: usar 'ubicación' con tilde
      const { data } = await supabase
        .from('proyecto')
        .select('id_proyecto, nombre, cliente, ubicación, fecha_inicio, fecha_final') // 🔥 CON TILDE
        .eq('visibilidad', true)
        .eq('liberar', false);
      proyectos = data || [];
    }

    // Obtener asignaciones para los proyectos obtenidos
    const proyectoIds = proyectos.map(p => p.id_proyecto);
    let asignaciones = [];
    if (proyectoIds.length > 0) {
      const { data: asigData, error: asigErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto, id_trabajador')
        .in('id_proyecto', proyectoIds);
      if (asigErr) throw asigErr;
      asignaciones = asigData || [];
    }

    // Obtener trabajadores para mapear nombres
    const { data: trabajadoresData } = await supabase
      .from('trabajador')
      .select('id_trabajador, nombre')
      .eq('visibilidad', true);
    const trabajadores = trabajadoresData || [];
    const trabajadorMap = {};
    trabajadores.forEach(t => { trabajadorMap[String(t.id_trabajador)] = t.nombre || ''; });

    // Construir proyectosInfo con responsable
    proyectosInfo = proyectos.map(p => {
      const asign = asignaciones.find(a => String(a.id_proyecto) === String(p.id_proyecto));
      const responsableNombre = asign ? (trabajadorMap[String(asign.id_trabajador)] || '') : '';
      return { ...p, responsable: responsableNombre };
    });

    proyectosNombres = proyectosInfo.map(p => p.nombre);
  } catch (err) {
    console.error('Error cargando proyectos (imprimir - Usuarios):', err);
    proyectosInfo = [];
    proyectosNombres = [];
  }
}

// Cargar registros
async function cargarRegistrosSupabase() {
  const idTrabajadorRaw = localStorage.getItem('id_trabajador');
  const idTrabajador = idTrabajadorRaw ? Number(idTrabajadorRaw) : null;
  const userRaw = localStorage.getItem('user');

  // Si no hay usuario autenticado o no hay id_trabajador -> no mostrar nada
  if (!userRaw || idTrabajador === null) {
    registrosOriginales = [];
    mostrarTablasPorProyecto("");
    return;
  }

  const user = JSON.parse(userRaw || '{}');

  try {
    // 🔥 CAMBIO PRINCIPAL: Si es trabajador, traer solo registros de proyectos asignados
    if (idTrabajador && user.role === 'trabajador') {
      // Obtener proyectos asignados al trabajador
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', idTrabajador);

      if (asignErr) throw asignErr;
      const ids = (asigns || []).map(a => a.id_proyecto);
      if (ids.length === 0) {
        registrosOriginales = [];
        mostrarTablasPorProyecto(""); // No hay proyectos asignados
        return;
      }

      // FILTRAR: limitar solo a proyectos visibles
      const { data: visibleProjs, error: visErr } = await supabase
        .from('proyecto')
        .select('id_proyecto')
        .in('id_proyecto', ids)
        .eq('visibilidad', true);

      if (visErr) throw visErr;
      const visibleIds = (visibleProjs || []).map(p => p.id_proyecto);
      if (visibleIds.length === 0) {
        registrosOriginales = [];
        mostrarTablasPorProyecto("");
        return;
      }

      // Traer registros solo para proyectos visibles asignados
      const { data, error } = await supabase
        .from('registro')
        .select('*')
        .in('id_proyecto', visibleIds)
        .order('fecha_cargo', { ascending: false });

      if (error) throw error;
      registrosOriginales = data || [];
      mostrarTablasPorProyecto("");
      return;
    }

    // Fallback (admin) -> traer registros de todos los proyectos visibles
    const proyectosVisiblesIds = proyectosInfo.map(p => p.id_proyecto);
    let data, error;
    if (proyectosVisiblesIds.length > 0) {
      ({ data, error } = await supabase
        .from('registro')
        .select('*')
        .in('id_proyecto', proyectosVisiblesIds)
        .order('fecha_cargo', { ascending: false }));
    } else {
      data = [];
      error = null;
    }

    if (error) throw error;
    registrosOriginales = data || [];
    mostrarTablasPorProyecto("");
  } catch (err) {
    console.error('Error cargando registros (imprimir):', err);
    registrosOriginales = [];
    mostrarTablasPorProyecto("");
  }
}

// Función para formatear fechas
function formatearFecha(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d)) return fecha;
  // Ejemplo: 04-ago-25
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = meses[d.getMonth()];
  const año = String(d.getFullYear()).slice(-2);
  return `${dia}-${mes}-${año}`;
}

// Función para formatear importe a moneda
function formatoMoneda(valor) {
  return '$' + Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Botón descargar CSV (descarga todos los registros mostrados)
document.getElementById('imprimir-descargar-csv').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('modalPreguntas').style.display = 'flex';
});

let respuestasPreguntas = {};

// Al hacer clic en el botón de imprimir/descargar, muestra el modal
document.getElementById('imprimir-descargar-csv').addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('modalPreguntas').style.display = 'flex';
});

// Cuando se envía el formulario del modal, guarda las respuestas y genera el documento
document.getElementById('formPreguntas').addEventListener('submit', function(e) {
  e.preventDefault();
  respuestasPreguntas.respuesta1 = e.target.respuesta1.value;
  respuestasPreguntas.respuesta2 = e.target.respuesta2.value;
  document.getElementById('modalPreguntas').style.display = 'none';

  // 🔥 OBTENER LAS FECHAS PARA LA IMPRESIÓN
  const fechaDesde = document.getElementById('fecha-desde')?.value || '';
  const fechaHasta = document.getElementById('fecha-hasta')?.value || '';
  
  let rangoFechas = '';
  if (fechaDesde && fechaHasta) {
    rangoFechas = `Del ${formatearFecha(fechaDesde)} al ${formatearFecha(fechaHasta)}`;
  } else if (fechaDesde) {
    rangoFechas = `Desde el ${formatearFecha(fechaDesde)}`;
  } else if (fechaHasta) {
    rangoFechas = `Hasta el ${formatearFecha(fechaHasta)}`;
  }

  // Genera el documento de impresión incluyendo las fechas y respuestas al final
  const infoContents = document.getElementById('imprimir-proyecto-info').innerHTML;
  const tableContents = document.getElementById('imprimir-table-container').innerHTML;
  const respuestasHTML = `
    <div style="margin-top:32px; font-size:1.1em;">
      ${rangoFechas ? `<div style="margin-bottom:12px;"><strong>Periodo:</strong> ${rangoFechas}</div>` : ''}
      <strong>Vehículo Utilizado:</strong> ${respuestasPreguntas.respuesta1}<br>
      <strong>Personal que viaticó:</strong> ${respuestasPreguntas.respuesta2}
    </div>
  `;
  const printContents = infoContents + tableContents + respuestasHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = printContents;
  window.print();
  document.body.innerHTML = originalContents;
  location.reload();
});

document.getElementById('cerrarModalPreguntas').onclick = function() {
  document.getElementById('modalPreguntas').style.display = 'none';
};
document.getElementById('cancelarModalPreguntas').onclick = function() {
  document.getElementById('modalPreguntas').style.display = 'none';
  window.location.reload(); // O redirige a la página principal si lo prefieres
};


