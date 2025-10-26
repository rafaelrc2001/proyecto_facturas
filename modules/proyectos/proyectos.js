import { supabase } from '../../supabase/db.js';
import { insertarProyecto, obtenerProyectos, eliminarProyecto, actualizarProyecto, actualizarPresupuestoProyecto, liberarProyecto } from '../../supabase/proyecto.js';
import { obtenerTrabajadores } from '../../supabase/trabajador.js';
import { asignarProyectoATrabajador } from '../../supabase/asignar_proyecto.js';
import { enviarDatosAsignacion } from '../../Js/correo.js';



let proyectosData = [];

const PROYECTOS_POR_PAGINA = 7;
let paginaActual = 1;
let proyectosFiltrados = [];

// Agregar: función que verifica solo projectidadmin === '1'
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

async function cargarProyectos() {
  // 1. Obtén todos los proyectos - ASEGURÁNDONOS DE TRAER EL CAMPO 'liberar'
  const { data: proyectos, error: errorProyectos } = await supabase
    .from('proyecto')
    .select('*, liberar')  // 🔥 AGREGAR 'liberar' aquí
    .eq('visibilidad', true);
  
  // 2. Obtén todas las asignaciones con trabajadores (corregir la consulta)
  const { data: asignaciones, error: errorAsignaciones } = await supabase
    .from('asignar_proyecto')
    .select(`
      id_proyecto, 
      id_trabajador,
      id_viatico,
      trabajador:trabajador!asignar_proyecto_id_trabajador_fkey(id_trabajador, nombre),
      responsable_viaticos:trabajador!asignar_proyecto_id_viatico_fkey(id_trabajador, nombre)
    `);

  console.log('Error asignaciones:', errorAsignaciones); // Para debug

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  if (errorProyectos) {
    tbody.innerHTML = `<tr><td colspan="8">Error al cargar proyectos</td></tr>`;
    return;
  }
  if (!proyectos || proyectos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">No hay proyectos</td></tr>`;
    return;
  }

  // Si hay error en asignaciones, usar consulta alternativa
  let asignacionesCorregidas = [];
  if (errorAsignaciones) {
    console.log('Usando consulta alternativa...');
    // Consulta más simple sin foreign keys complejas
    const { data: asignacionesSimples } = await supabase
      .from('asignar_proyecto')
      .select('*');
    
    // Obtener trabajadores por separado
    const { data: trabajadores } = await supabase
      .from('trabajador')
      .select('id_trabajador, nombre');

    asignacionesCorregidas = asignacionesSimples?.map(asig => ({
      ...asig,
      trabajador: trabajadores?.find(t => t.id_trabajador === asig.id_trabajador),
      responsable_viaticos: trabajadores?.find(t => t.id_trabajador === asig.id_viatico)
    })) || [];
  } else {
    asignacionesCorregidas = asignaciones || [];
  }

  proyectosData = proyectos.map(proyecto => ({
    ...proyecto,
    asignacion: asignacionesCorregidas?.find(a => a.id_proyecto === proyecto.id_proyecto)
  }));

  mostrarProyectosPaginados(proyectosData);

  // Actualiza el contador de registros
  document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;

  // Asigna eventos a los botones editar DESPUÉS de crear las filas
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectos[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.descripcion.value = proyecto.descripción || ''; //
      form.ubicacion.value = proyecto.ubicación || '';
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
    //  form.responsable.value = proyecto.responsable || '';
      modal.style.display = 'flex';
      form.dataset.index = index;
    });
  });

  // Después de crear las filas en cargarProyectos()
  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.addEventListener('click', async function() {
      const index = this.parentElement.querySelector('.btn-editar').getAttribute('data-index');
      const proyecto = proyectos[index];
      if (confirm('¿Seguro que deseas eliminar este proyecto?')) {
        const { error } = await eliminarProyecto(proyecto.id_proyecto);
        if (error) {
          if (
            error.message &&
            error.message.includes('violates foreign key constraint')
          ) {
            mostrarAlertaRelacion();
          } else {
            alert('Error al eliminar: ' + error.message);
          }
        } else {
          alert('Proyecto eliminado correctamente');
          cargarProyectos();
        }
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  if (!verificarSesion()) return;
  cargarProyectos();

  const btnNuevo = document.querySelector('.btn-nuevo');
  const modal = document.getElementById('modal-nuevo-proyecto');
  const closeModal = document.getElementById('close-modal-nuevo');
  const cancelarModal = document.getElementById('cancelar-modal-nuevo');


//la parte para agregar presupuesto  
  // EVENT LISTENER PARA EL FORMULARIO DE ASIGNAR PRESUPUESTO
  const formPresupuesto = document.getElementById('form-asignar-presupuesto');
  if (formPresupuesto && !formPresupuesto.dataset.bound) {
    formPresupuesto.dataset.bound = '1';
    formPresupuesto.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const proyectoId = this.dataset.proyectoId;
      const presupuesto = document.getElementById('presupuesto-actual').value;
      
      console.log('Datos del formulario:', { proyectoId, presupuesto }); // Para debug
      
      if (!presupuesto || parseFloat(presupuesto) <= 0) {
        alert('Por favor ingresa un presupuesto válido');
        return;
      }
      
      if (!proyectoId) {
        alert('Error: No se encontró el ID del proyecto');
        return;
      }
      
      try {
        console.log('Enviando a la base de datos...'); // Para debug
        const { data, error } = await actualizarPresupuestoProyecto(proyectoId, parseFloat(presupuesto));
        
        console.log('Respuesta de Supabase:', { data, error }); // Para debug
        
        if (error) {
          console.error('Error al asignar presupuesto:', error);
          alert('Error al asignar presupuesto: ' + error.message);
        } else {
          console.log('Presupuesto guardado exitosamente'); // Para debug
          alert('Presupuesto asignado correctamente');
          document.getElementById('modal-asignar-presupuesto').style.display = 'none';
          document.getElementById('presupuesto-actual').value = '';
          // Opcional: recargar proyectos para ver el cambio
           cargarProyectos();
        }
      } catch (ex) {
        console.error('Error inesperado:', ex);
        alert('Ocurrió un error inesperado al asignar el presupuesto');
      }
    });
  }


//hasta aca










  //los nuevos modales










  // 🔥 AGREGAR ESTAS LÍNEAS AQUÍ:

  // EVENT LISTENERS PARA LOS MODALES DE PRESUPUESTO Y LIBERAR
  
  // Modal asignar presupuesto - Botón X
  const closePresupuesto = document.getElementById('close-modal-presupuesto');
  if (closePresupuesto) {
    closePresupuesto.addEventListener('click', function() {
      console.log('Cerrando modal presupuesto con X');
      document.getElementById('modal-asignar-presupuesto').style.display = 'none';
    });
  }

  // Modal asignar presupuesto - Botón Cancelar
  const cancelarPresupuesto = document.getElementById('cancelar-modal-presupuesto');
  if (cancelarPresupuesto) {
    cancelarPresupuesto.addEventListener('click', function() {
      console.log('Cerrando modal presupuesto con Cancelar');
      document.getElementById('modal-asignar-presupuesto').style.display = 'none';
    });
  }

  // Modal liberar proyecto - Botón X
  const closeLiberar = document.getElementById('close-modal-liberar');
  if (closeLiberar) {
    closeLiberar.addEventListener('click', function() {
      console.log('Cerrando modal liberar con X');
      document.getElementById('modal-liberar-proyecto').style.display = 'none';
    });
  }

  // Modal liberar proyecto - Botón Cancelar
  const cancelarLiberar = document.getElementById('cancelar-liberar-proyecto');
  if (cancelarLiberar) {
    cancelarLiberar.addEventListener('click', function() {
      console.log('Cerrando modal liberar con Cancelar');
      document.getElementById('modal-liberar-proyecto').style.display = 'none';
    });
  }

  // Funcionalidad del checkbox del modal liberar
  const confirmarCheckbox = document.getElementById('confirmar-liberacion');
  const btnConfirmarLiberar = document.getElementById('confirmar-liberar-proyecto');
  if (confirmarCheckbox && btnConfirmarLiberar) {
    confirmarCheckbox.addEventListener('change', function() {
      if (this.checked) {
        btnConfirmarLiberar.disabled = false;
        btnConfirmarLiberar.style.opacity = '1';
      } else {
        btnConfirmarLiberar.disabled = true;
        btnConfirmarLiberar.style.opacity = '0.5';
      }
    });
  }

  // Cerrar modales al hacer click fuera
  window.addEventListener('click', function(e) {
    const modalPresupuesto = document.getElementById('modal-asignar-presupuesto');
    const modalLiberar = document.getElementById('modal-liberar-proyecto');
    
    if (e.target === modalPresupuesto) {
      console.log('Cerrando modal presupuesto por click fuera');
      modalPresupuesto.style.display = 'none';
    }
    
    if (e.target === modalLiberar) {
      console.log('Cerrando modal liberar por click fuera');
      modalLiberar.style.display = 'none';
    }
  });

  // 🔥 FIN DE LAS LÍNEAS AGREGADAS

 



//hasta aca



  btnNuevo.addEventListener('click', function() {
    modal.style.display = 'flex';
  });

  closeModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  cancelarModal.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  window.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.getElementById('form-nuevo-proyecto').addEventListener('submit', async function(e) {
    e.preventDefault();
    const cliente = e.target.cliente.value;
    const nombre = e.target.nombre.value;
    const descripción = e.target.descripcion.value; // sin tilde aquí
    const ubicación = e.target.ubicacion.value;     // sin tilde aquí
    const fecha_inicio = e.target['fecha-inicio'].value;
    const fecha_final = e.target['fecha-fin'].value;

    const { error } = await insertarProyecto({ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final });
    if (error) {
      alert('Error al guardar: ' + error.message);
    } else {
      alert('Proyecto guardado correctamente');
      document.getElementById('modal-nuevo-proyecto').style.display = 'none';
      e.target.reset();
      cargarProyectos();
    }
  });

  // Después de cargar las filas, asigna el evento a los botones editar
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectos[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      // Rellena el formulario con los datos del proyecto
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.ubicacion.value = proyecto.ubicación || '';
      form.descripcion.value = proyecto.descripción || ''; // 🔥 ESTA LÍNEA
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
    //  form.responsable.value = proyecto.responsable || '';
      modal.style.display = 'flex';
      // Puedes guardar el id o index si lo necesitas para editar
      form.dataset.index = index;
    });
  });

  // Cerrar el modal de edición
  document.getElementById('close-modal-editar').addEventListener('click', function() {
    document.getElementById('modal-editar-proyecto').style.display = 'none';
  });

  // Opcional: cerrar al hacer click fuera del modal
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('modal-editar-proyecto');
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  document.querySelectorAll('#modal-nuevo-proyecto textarea, #modal-editar-proyecto textarea').forEach(textarea => {
    textarea.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = (this.scrollHeight) + 'px';
    });
  });
});

// Reemplaza el segundo DOMContentLoaded por esta versión (asignar proyecto)
document.addEventListener('DOMContentLoaded', () => {
  if (!verificarSesion()) return;

  const btnAsignar = document.querySelector('.btn-asignar');
  const modalAsignar = document.getElementById('modalAsignarProyecto');
  const cerrarModal = document.getElementById('cerrarModalAsignarProyecto');
  const inputTrabajador = document.getElementById('inputTrabajador');
  const listTrabajador = document.getElementById('listTrabajador');
  const inputResponsableViaticos = document.getElementById('inputResponsableViaticos'); // Agregar esta línea
  const listResponsableViaticos = document.getElementById('listResponsableViaticos'); // Agregar esta línea
  const inputProyecto = document.getElementById('inputProyecto');
  const listProyecto = document.getElementById('listProyecto');
  const formAsignar = document.getElementById('formAsignarProyecto');

  btnAsignar.addEventListener('click', async () => {
    modalAsignar.style.display = 'flex';
    await cargarDatosAsignar();
  });

  cerrarModal.addEventListener('click', () => {
    modalAsignar.style.display = 'none';
    formAsignar.reset();
    trabajadorSeleccionadoId = null;
    responsableViaticosSeleccionadoId = null; // Agregar esta línea
    proyectoSeleccionadoId = null;
    listTrabajador.innerHTML = '';
    listResponsableViaticos.innerHTML = ''; // Agregar esta línea
    listProyecto.innerHTML = '';
  });

  // Opcional: cerrar el modal si se hace clic fuera del contenido
  modalAsignar.addEventListener('click', function(e) {
    if (e.target === modalAsignar) {
      modalAsignar.style.display = 'none';
      formAsignar.reset();
      trabajadorSeleccionadoId = null;
      responsableViaticosSeleccionadoId = null; // Agregar esta línea
      proyectoSeleccionadoId = null;
      listTrabajador.innerHTML = '';
      listResponsableViaticos.innerHTML = ''; // Agregar esta línea
      listProyecto.innerHTML = '';
    }
  });

  async function cargarDatosAsignar() {
    // Cargar trabajadores
    const { data: trabajadores } = await obtenerTrabajadores();
    trabajadoresList = trabajadores || [];
    // Cargar proyectos
    const { data: proyectos } = await obtenerProyectos();
    proyectosList = proyectos || [];
  }

  // Autocompletado para trabajador
  inputTrabajador.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listTrabajador.innerHTML = '';
    trabajadorSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = trabajadoresList.filter(t => t.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputTrabajador.value = t.nombre;
        trabajadorSeleccionadoId = t.id_trabajador;
        listTrabajador.innerHTML = '';
      };
      listTrabajador.appendChild(div);
    });
  });

  // Autocompletado para responsable de viáticos
  inputResponsableViaticos.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listResponsableViaticos.innerHTML = '';
    responsableViaticosSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = trabajadoresList.filter(t => t.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputResponsableViaticos.value = t.nombre;
        responsableViaticosSeleccionadoId = t.id_trabajador;
        listResponsableViaticos.innerHTML = '';
      };
      listResponsableViaticos.appendChild(div);
    });
  });

  // Autocompletado para proyecto
  inputProyecto.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listProyecto.innerHTML = '';
    proyectoSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = proyectosList.filter(p => p.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(p => {
      const div = document.createElement('div');
      div.textContent = p.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputProyecto.value = p.nombre;
        proyectoSeleccionadoId = p.id_proyecto;
        listProyecto.innerHTML = '';
      };
      listProyecto.appendChild(div);
    });
  });

  // Oculta sugerencias si se hace clic fuera (actualizar esta línea)
  document.addEventListener('click', function(e) {
    if (!listTrabajador.contains(e.target) && e.target !== inputTrabajador) listTrabajador.innerHTML = '';
    if (!listResponsableViaticos.contains(e.target) && e.target !== inputResponsableViaticos) listResponsableViaticos.innerHTML = ''; // Agregar esta línea
    if (!listProyecto.contains(e.target) && e.target !== inputProyecto) listProyecto.innerHTML = '';
  });

  // Guardar asignación (evita bind duplicado y previene duplicados en BD)
  if (formAsignar && !formAsignar.dataset.bound) {
    formAsignar.dataset.bound = '1';
    formAsignar.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (!trabajadorSeleccionadoId || !proyectoSeleccionadoId) {
          alert('Selecciona un encargado y un proyecto válido.');
          return;
        }

        // Comprobar existencia previa (cliente-side) antes de insertar
        const { data: existe, error: errCheck } = await supabase
          .from('asignar_proyecto')
          .select('id_asignacion')
          .eq('id_proyecto', proyectoSeleccionadoId)
          .eq('id_trabajador', trabajadorSeleccionadoId)
          .limit(1);

        if (errCheck) {
          console.error('Error comprobando existencia:', errCheck);
          alert('Error al asignar (verifica la consola).');
          return;
        }

        if (existe && existe.length > 0) {
          alert('La asignación ya existe.');
          return;
        }

        // Inserta la asignación incluyendo el responsable de viáticos
        const { error } = await asignarProyectoATrabajador(
          proyectoSeleccionadoId, 
          trabajadorSeleccionadoId,
          responsableViaticosSeleccionadoId // Agregar este parámetro
        );

        if (error) {
          console.error('Error al insertar asignación:', error);
          alert('Error al asignar: ' + (error.message || JSON.stringify(error)));
        } else {
          enviarDatosAsignacion(trabajadorSeleccionadoId, proyectoSeleccionadoId);
          alert('Proyecto asignado correctamente');
          modalAsignar.style.display = 'none';
          formAsignar.reset();
          trabajadorSeleccionadoId = null;
          responsableViaticosSeleccionadoId = null; 
          proyectoSeleccionadoId = null;
          listTrabajador.innerHTML = '';
          listResponsableViaticos.innerHTML = '';
          listProyecto.innerHTML = '';
          cargarProyectos();
        }
      } catch (ex) {
        console.error('Exception en submit asignar proyecto:', ex);
        alert('Ocurrió un error inesperado al asignar.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // 🔥 AGREGAR ESTE EVENT LISTENER PARA EL BOTÓN DE CONFIRMAR LIBERACIÓN:
  
  // Event listener para confirmar liberación del proyecto
  const btnConfirmarLiberar = document.getElementById('confirmar-liberar-proyecto');
  if (btnConfirmarLiberar && !btnConfirmarLiberar.dataset.bound) {
    btnConfirmarLiberar.dataset.bound = '1';
    btnConfirmarLiberar.addEventListener('click', async function() {
      const modal = document.getElementById('modal-liberar-proyecto');
      const proyectoId = modal.dataset.proyectoId;
      const proyectoNombre = modal.dataset.proyectoNombre;
      
      if (!proyectoId) {
        alert('Error: No se encontró el ID del proyecto');
        return;
      }
      
      console.log(`Liberando proyecto ID: ${proyectoId}`); // Para debug
      
      // Confirmar una vez más
      if (!confirm(`¿Estás completamente seguro de liberar el proyecto "${proyectoNombre}"?\n\nEsta acción eliminará todas las asignaciones y no se puede deshacer.`)) {
        return;
      }
      
      try {
        // Deshabilitar el botón mientras procesa
        this.disabled = true;
        this.textContent = 'Liberando...';
        
        const { error } = await liberarProyecto(proyectoId);
        
        if (error) {
          console.error('Error al liberar proyecto:', error);
          alert('Error al liberar proyecto: ' + error.message);
        } else {
          console.log('Proyecto liberado exitosamente'); // Para debug
          alert('Proyecto liberado correctamente. Se han eliminado todas las asignaciones relacionadas.');
          
          // Cerrar modal
          modal.style.display = 'none';
          
          // Resetear el checkbox y botón
          document.getElementById('confirmar-liberacion').checked = false;
          this.disabled = true;
          this.style.opacity = '0.5';
          this.textContent = 'Liberar proyecto';
          
          // Recargar proyectos para ver los cambios
          cargarProyectos();
        }
      } catch (ex) {
        console.error('Error inesperado al liberar proyecto:', ex);
        alert('Ocurrió un error inesperado al liberar el proyecto');
      } finally {
        // Reactivar el botón
        this.disabled = false;
        this.textContent = 'Liberar proyecto';
      }
    });
  }
});

function mostrarProyectosPaginados(proyectos) {
  proyectosFiltrados = proyectos;
  const totalPaginas = Math.ceil(proyectos.length / PROYECTOS_POR_PAGINA);
  if (paginaActual > totalPaginas) paginaActual = totalPaginas || 1;
  const inicio = (paginaActual - 1) * PROYECTOS_POR_PAGINA;
  const fin = inicio + PROYECTOS_POR_PAGINA;
  const proyectosPagina = proyectos.slice(inicio, fin);

  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';
  proyectosPagina.forEach((proyecto, i) => {
    const responsableProyecto = proyecto.asignacion?.trabajador?.nombre || 'Sin asignar';
    const responsableViaticos = proyecto.asignacion?.responsable_viaticos?.nombre || 'Sin asignar';
    

    const presupuestoTotal = proyecto.presupuesto_total ? 
  `$${parseFloat(proyecto.presupuesto_total).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
  '$0.00';

    const presupuesto = proyecto.presupuesto ? 
  `$${parseFloat(proyecto.presupuesto).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 
  'Sin asignar';

    tbody.innerHTML += `
      <tr>
        <td>${proyecto.cliente}</td>
        <td>${proyecto.nombre || ''}</td>
        <td>${proyecto.descripción || ''}</td>
        <td>${proyecto.ubicación || ''}</td>
        <td>${proyecto.fecha_inicio || ''}</td>
        <td>${proyecto.fecha_final || ''}</td>
        <td style="font-weight: 600; color: #276080; text-align: center;">${presupuesto}</td>
           <td style="font-weight: 700; color: #28a745; text-align: center; background: #f8fff9;">${presupuestoTotal}</td>
        <td>${responsableProyecto}</td>
        <td>${responsableViaticos}</td>
        <td>${proyecto.liberar ? 'Sí' : 'No'}</td>
        <td>
      
       <div class="acciones-btns">
  <button class="btn-accion btn-editar" title="Editar" data-index="${i + inicio}"><i class="ri-edit-2-line"></i></button>
  <button class="btn-accion btn-eliminar" title="Eliminar" data-index="${i + inicio}"><i class="ri-delete-bin-line"></i></button>
  <button class="btn-accion btn-asignar-presupuesto" title="Asignar presupuesto" data-index="${i + inicio}" style="background: #276080; border-color: #276080; color: white;"><i class="ri-money-dollar-circle-line"></i></button>
  <button class="btn-accion btn-liberar" title="Liberar proyecto" data-index="${i + inicio}" style="background: #FF8F00; border-color: #FF8F00; color: white;"><i class="ri-user-unfollow-line"></i></button>
</div>
        </td>
      </tr>
    `;
  });

  // 🔥 AGREGAR ESTE BLOQUE COMPLETO AQUÍ:
  
  // Event listener para los botones de asignar presupuesto
  document.querySelectorAll('.btn-asignar-presupuesto').forEach(btn => {
    btn.onclick = function() {
      console.log('Click en asignar presupuesto');
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      
      const modal = document.getElementById('modal-asignar-presupuesto');
      if (modal) {
        modal.style.display = 'flex';
        
        // Llenar información del proyecto
        document.getElementById('presupuesto-proyecto-nombre').textContent = proyecto.nombre || 'Sin nombre';
        document.getElementById('presupuesto-cliente').textContent = proyecto.cliente || 'Sin cliente';
        
        // Mostrar presupuesto total actual
        const totalActual = proyecto.presupuesto_total || 0;
        document.getElementById('presupuesto-total-actual').textContent = 
          `$${parseFloat(totalActual).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Limpiar el input
        document.getElementById('presupuesto-actual').value = '';
        
        // Guardar el ID del proyecto
        document.getElementById('form-asignar-presupuesto').dataset.proyectoId = proyecto.id_proyecto;
      }
    };
  });

  document.getElementById('contador-registros').textContent = `Registros Totales: ${proyectos.length}`;
  renderizarPaginacionProyectos(totalPaginas);

  // ASIGNA TODOS LOS EVENTOS DESPUÉS DE RENDERIZAR LA TABLA
  document.querySelectorAll('.btn-editar').forEach(btn => {
    btn.onclick = function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      const modal = document.getElementById('modal-editar-proyecto');
      const form = document.getElementById('form-editar-proyecto');
      form.cliente.value = proyecto.cliente || '';
      form.nombre.value = proyecto.nombre || '';
      form.ubicacion.value = proyecto.ubicación || '';
      form.fecha_inicio.value = proyecto.fecha_inicio || '';
      form.fecha_final.value = proyecto.fecha_final || '';
      modal.style.display = 'flex';
      form.dataset.index = index;
    };
  });

  document.querySelectorAll('.btn-eliminar').forEach(btn => {
    btn.onclick = async function() {
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      if (confirm('¿Seguro que deseas eliminar este proyecto?')) {
        const { error } = await eliminarProyecto(proyecto.id_proyecto);
        if (error) {
          if (
            error.message &&
            error.message.includes('violates foreign key constraint')
          ) {
            mostrarAlertaRelacion();
          } else {
            alert('Error al eliminar: ' + error.message);
          }
        } else {
          alert('Proyecto eliminado correctamente');
          cargarProyectos();
        }
      }
    };
  });

  // AGREGAR ESTOS EVENT LISTENERS AQUÍ:
  document.querySelectorAll('.btn-asignar-presupuesto').forEach(btn => {
    btn.onclick = function() {
      console.log('Click en asignar presupuesto'); // Para debug
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      
      // Mostrar modal simple por ahora
      const modal = document.getElementById('modal-asignar-presupuesto');
      if (modal) {
        modal.style.display = 'flex';
        
        // Llenar información del proyecto
        document.getElementById('presupuesto-proyecto-nombre').textContent = proyecto.nombre || 'Sin nombre';
        document.getElementById('presupuesto-cliente').textContent = proyecto.cliente || 'Sin cliente';
        
        // Mostrar presupuesto total actual
        const totalActual = proyecto.presupuesto_total || 0;
        document.getElementById('presupuesto-total-actual').textContent = 
          `$${parseFloat(totalActual).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        // Limpiar el input
        document.getElementById('presupuesto-actual').value = '';
        
        // Guardar el ID del proyecto
        document.getElementById('form-asignar-presupuesto').dataset.proyectoId = proyecto.id_proyecto;
      } else {
        alert('Modal no encontrado. Verifica que el HTML esté agregado.');
      }
    };
  });

  document.querySelectorAll('.btn-liberar').forEach(btn => {
    btn.onclick = function() {
      console.log('Click en liberar proyecto'); // Para debug
      const index = this.getAttribute('data-index');
      const proyecto = proyectosData[index];
      
      // Mostrar modal simple por ahora
      const modal = document.getElementById('modal-liberar-proyecto');
      if (modal) {
        modal.style.display = 'flex';
        
        // Llenar información del proyecto
        document.getElementById('liberar-proyecto-nombre').textContent = proyecto.nombre || 'Sin nombre';
        document.getElementById('liberar-cliente').textContent = proyecto.cliente || 'Sin cliente';
        document.getElementById('liberar-responsable').textContent = proyecto.asignacion?.trabajador?.nombre || 'Sin asignar';
        document.getElementById('liberar-responsable-viaticos').textContent = proyecto.asignacion?.responsable_viaticos?.nombre || 'Sin asignar';
        
        // Guardar información del proyecto para cuando se confirme
        modal.dataset.proyectoId = proyecto.id_proyecto;
        modal.dataset.proyectoNombre = proyecto.nombre || 'Sin nombre';
        
        // Resetear el checkbox
        document.getElementById('confirmar-liberacion').checked = false;
        document.getElementById('confirmar-liberar-proyecto').disabled = true;
        document.getElementById('confirmar-liberar-proyecto').style.opacity = '0.5';
      } else {
        alert('Modal no encontrado. Verifica que el HTML esté agregado.');
      }
    };
  });
}

function renderizarPaginacionProyectos(totalPaginas) {
  const pagDiv = document.querySelector('.pagination');
  pagDiv.innerHTML = '';
  if (totalPaginas <= 1) return;

  // Botón anterior
  const btnPrev = document.createElement('button');
  btnPrev.className = 'pagination-btn';
  btnPrev.innerHTML = '<i class="ri-arrow-left-s-line"></i>';
  btnPrev.disabled = paginaActual === 1;
  btnPrev.onclick = () => {
    if (paginaActual > 1) {
      paginaActual--;
      mostrarProyectosPaginados(proyectosFiltrados);
    }
  };
  pagDiv.appendChild(btnPrev);

  // Números de página
  for (let i = 1; i <= totalPaginas; i++) {
    const btn = document.createElement('button');
    btn.className = 'pagination-btn' + (i === paginaActual ? ' active' : '');
    btn.textContent = i;
    btn.onclick = () => {
      paginaActual = i;
      mostrarProyectosPaginados(proyectosFiltrados);
    };
    pagDiv.appendChild(btn);
  }

  // Botón siguiente
  const btnNext = document.createElement('button');
  btnNext.className = 'pagination-btn';
  btnNext.innerHTML = '<i class="ri-arrow-right-s-line"></i>';
  btnNext.disabled = paginaActual === totalPaginas;
  btnNext.onclick = () => {
    if (paginaActual < totalPaginas) {
      paginaActual++;
      mostrarProyectosPaginados(proyectosFiltrados);
    }
  };
  pagDiv.appendChild(btnNext);
}

// Agrega esta función para mostrar la alerta personalizada
function mostrarAlertaRelacion() {
  // Crea el modal si no existe
  let modal = document.getElementById('modal-relacion');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-relacion';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
      <div style="
        background:#fff;
        border-radius:14px;
        box-shadow:0 4px 24px rgba(0,59,92,0.12);
        padding:32px 32px 24px 32px;
        min-width:340px;
        max-width:420px;
        position:relative;
        display:flex;
        flex-direction:column;
        gap:18px;
        align-items:center;
      ">
        <span style="position:absolute;top:16px;right:16px;font-size:1.3em;cursor:pointer;color:#003B5C;" id="cerrar-modal-relacion">&times;</span>
        <h2 style="color:#FF6F00;font-family:'Montserrat',sans-serif;font-size:1.2rem;font-weight:700;">No se puede eliminar</h2>
        <div style="color:#003B5C;font-size:1em;text-align:center;">
          Este proyecto tiene relación en otras tablas.<br>
          Elimina primero las asignaciones relacionadas antes de eliminar este proyecto.
        </div>
        <button id="btn-cerrar-relacion" style="
          margin-top:18px;
          background:#FF6F00;
          color:#fff;
          border:none;
          border-radius:8px;
          padding:10px 22px;
          font-size:1em;
          font-family:'Montserrat',sans-serif;
          font-weight:600;
          cursor:pointer;
          transition:background 0.2s;
        ">Cerrar</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('cerrar-modal-relacion').onclick = cerrarModalRelacion;
    document.getElementById('btn-cerrar-relacion').onclick = cerrarModalRelacion;
    modal.onclick = function(e) {
      if (e.target === modal) cerrarModalRelacion();
    };
  }
  modal.style.display = 'flex';
}

function cerrarModalRelacion() {
  const modal = document.getElementById('modal-relacion');
  if (modal) modal.style.display = 'none';
}

// Filtro por cliente, proyecto y responsable
document.querySelector('.input-buscar').addEventListener('input', function() {
  const valor = this.value.trim().toLowerCase();
  const filtrados = proyectosData.filter(p =>
    (p.cliente && p.cliente.toLowerCase().includes(valor)) ||
    (p.nombre && p.nombre.toLowerCase().includes(valor)) ||
   (p.descripción && p.descripción.toLowerCase().includes(valor)) || // <-- agrega esta línea
 
    (() => {
      const asignacion = p.asignacion || {};
      return asignacion.trabajador?.nombre?.toLowerCase().includes(valor);
    })()
  );
  paginaActual = 1;
  mostrarProyectosPaginados(filtrados);
});

// Agrega el evento submit para el formulario de edición
document.getElementById('form-editar-proyecto').addEventListener('submit', async function(e) {
  e.preventDefault();
  const index = e.target.dataset.index;
  const proyecto = proyectosData[index];
  const id = proyecto.id_proyecto;

  const cliente = e.target.cliente.value;
  const nombre = e.target.nombre.value;
  const descripción = e.target.descripcion.value; // 🔥 AGREGAR ESTA LÍNEA
  const ubicación = e.target.ubicacion.value;
  const fecha_inicio = e.target.fecha_inicio.value;
  const fecha_final = e.target.fecha_final.value;
  // const descripción = e.target.descripcion.value;

  const { error } = await actualizarProyecto(id, { cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final });
  if (error) {
    alert('Error al actualizar: ' + error.message);
  } else {
    alert('Proyecto actualizado correctamente');
    document.getElementById('modal-editar-proyecto').style.display = 'none';
    cargarProyectos();
  }
});

let trabajadoresList = [];
let proyectosList = [];
let trabajadorSeleccionadoId = null;
let responsableViaticosSeleccionadoId = null; // Agregar esta línea
let proyectoSeleccionadoId = null;

// Mostrar el modal al hacer clic en el botón "Asignar proyecto"
document.addEventListener('DOMContentLoaded', () => {
  const btnAsignar = document.querySelector('.btn-asignar');
  const modalAsignar = document.getElementById('modalAsignarProyecto');
  const cerrarModal = document.getElementById('cerrarModalAsignarProyecto');
  const inputTrabajador = document.getElementById('inputTrabajador');
  const listTrabajador = document.getElementById('listTrabajador');
  const inputResponsableViaticos = document.getElementById('inputResponsableViaticos'); // Agregar esta línea
  const listResponsableViaticos = document.getElementById('listResponsableViaticos'); // Agregar esta línea
  const inputProyecto = document.getElementById('inputProyecto');
  const listProyecto = document.getElementById('listProyecto');
  const formAsignar = document.getElementById('formAsignarProyecto');

  btnAsignar.addEventListener('click', async () => {
    modalAsignar.style.display = 'flex';
    await cargarDatosAsignar();
  });

  cerrarModal.addEventListener('click', () => {
    modalAsignar.style.display = 'none';
    formAsignar.reset();
    trabajadorSeleccionadoId = null;
    responsableViaticosSeleccionadoId = null; // Agregar esta línea
    proyectoSeleccionadoId = null;
    listTrabajador.innerHTML = '';
    listResponsableViaticos.innerHTML = ''; // Agregar esta línea
    listProyecto.innerHTML = '';
  });

  // Opcional: cerrar el modal si se hace clic fuera del contenido
  modalAsignar.addEventListener('click', function(e) {
    if (e.target === modalAsignar) {
      modalAsignar.style.display = 'none';
      formAsignar.reset();
      trabajadorSeleccionadoId = null;
      responsableViaticosSeleccionadoId = null; // Agregar esta línea
      proyectoSeleccionadoId = null;
      listTrabajador.innerHTML = '';
      listResponsableViaticos.innerHTML = ''; // Agregar esta línea
      listProyecto.innerHTML = '';
    }
  });

  async function cargarDatosAsignar() {
    // Cargar trabajadores
    const { data: trabajadores } = await obtenerTrabajadores();
    trabajadoresList = trabajadores || [];
    // Cargar proyectos
    const { data: proyectos } = await obtenerProyectos();
    proyectosList = proyectos || [];
  }

  // Autocompletado para trabajador
  inputTrabajador.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listTrabajador.innerHTML = '';
    trabajadorSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = trabajadoresList.filter(t => t.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputTrabajador.value = t.nombre;
        trabajadorSeleccionadoId = t.id_trabajador;
        listTrabajador.innerHTML = '';
      };
      listTrabajador.appendChild(div);
    });
  });

  // Autocompletado para responsable de viáticos
  inputResponsableViaticos.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listResponsableViaticos.innerHTML = '';
    responsableViaticosSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = trabajadoresList.filter(t => t.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(t => {
      const div = document.createElement('div');
      div.textContent = t.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputResponsableViaticos.value = t.nombre;
        responsableViaticosSeleccionadoId = t.id_trabajador;
        listResponsableViaticos.innerHTML = '';
      };
      listResponsableViaticos.appendChild(div);
    });
  });

  // Autocompletado para proyecto
  inputProyecto.addEventListener('input', function() {
    const valor = this.value.trim().toLowerCase();
    listProyecto.innerHTML = '';
    proyectoSeleccionadoId = null;
    if (!valor) return;
    
    const sugerencias = proyectosList.filter(p => p.nombre.toLowerCase().includes(valor));
    sugerencias.forEach(p => {
      const div = document.createElement('div');
      div.textContent = p.nombre;
      div.className = 'autocomplete-item';
      div.onclick = function() {
        inputProyecto.value = p.nombre;
        proyectoSeleccionadoId = p.id_proyecto;
        listProyecto.innerHTML = '';
      };
      listProyecto.appendChild(div);
    });
  });

  // Oculta sugerencias si se hace clic fuera (actualizar esta línea)
  document.addEventListener('click', function(e) {
    if (!listTrabajador.contains(e.target) && e.target !== inputTrabajador) listTrabajador.innerHTML = '';
    if (!listResponsableViaticos.contains(e.target) && e.target !== inputResponsableViaticos) listResponsableViaticos.innerHTML = ''; // Agregar esta línea
    if (!listProyecto.contains(e.target) && e.target !== inputProyecto) listProyecto.innerHTML = '';
  });

  // Guardar asignación (evita bind duplicado y previene duplicados en BD)
  if (formAsignar && !formAsignar.dataset.bound) {
    formAsignar.dataset.bound = '1';
    formAsignar.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = this.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (!trabajadorSeleccionadoId || !proyectoSeleccionadoId) {
          alert('Selecciona un encargado y un proyecto válido.');
          return;
        }

        // Comprobar existencia previa (cliente-side) antes de insertar
        const { data: existe, error: errCheck } = await supabase
          .from('asignar_proyecto')
          .select('id_asignacion')
          .eq('id_proyecto', proyectoSeleccionadoId)
          .eq('id_trabajador', trabajadorSeleccionadoId)
          .limit(1);

        if (errCheck) {
          console.error('Error comprobando existencia:', errCheck);
          alert('Error al asignar (verifica la consola).');
          return;
        }

        if (existe && existe.length > 0) {
          alert('La asignación ya existe.');
          return;
        }

        // Inserta la asignación incluyendo el responsable de viáticos
        const { error } = await asignarProyectoATrabajador(
          proyectoSeleccionadoId, 
          trabajadorSeleccionadoId,
          responsableViaticosSeleccionadoId // Agregar este parámetro
        );

        if (error) {
          console.error('Error al insertar asignación:', error);
          alert('Error al asignar: ' + (error.message || JSON.stringify(error)));
        } else {
          enviarDatosAsignacion(trabajadorSeleccionadoId, proyectoSeleccionadoId);
          alert('Proyecto asignado correctamente');
          modalAsignar.style.display = 'none';
          formAsignar.reset();
          trabajadorSeleccionadoId = null;
          responsableViaticosSeleccionadoId = null; 
          proyectoSeleccionadoId = null;
          listTrabajador.innerHTML = '';
          listResponsableViaticos.innerHTML = '';
          listProyecto.innerHTML = '';
          cargarProyectos();
        }
      } catch (ex) {
        console.error('Exception en submit asignar proyecto:', ex);
        alert('Ocurrió un error inesperado al asignar.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});

const idTrabajador = localStorage.getItem('id_trabajador');
if (idTrabajador) {
  console.log(`ID del trabajador autenticado: ${idTrabajador}`);
}

// Muestra id del admin (si existe)
const projectidadmin = localStorage.getItem('projectidadmin');
if (projectidadmin) {
  console.log(`ID del admin autenticado (projectidadmin): ${projectidadmin}`);
}