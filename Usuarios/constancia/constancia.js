// 🔥 AGREGAR IMPORT DE SUPABASE AL INICIO
import { supabase } from '../../supabase/db.js';

let archivoSeleccionado = null;

// 🔥 VERIFICACIÓN DE SESIÓN PARA USUARIO (no admin)
function verificarSesion() {
  const idTrabajador = localStorage.getItem('id_trabajador');
  if (!idTrabajador) {
    document.body.innerHTML = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:99999; display:flex; align-items:center; justify-content:center; font-family:Arial;"><div style="text-align:center;"><h2 style="color:#003B5C;">Acceso Denegado</h2><p>Debes iniciar sesión como trabajador</p></div></div>';
    setTimeout(() => {
      window.location.href = '/tickets/';
    }, 2000);
    return false;
  }
  return true;
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  if (!verificarSesion()) return;
  
  inicializarEventos();
  verificarConstanciaExistente();
});

function inicializarEventos() {
  // 🔥 SOLO BOTÓN DE DESCARGA (sin subir ni eliminar)
  document.getElementById('btn-descargar')?.addEventListener('click', descargarConstancia);
}

// 🔥 FUNCIÓN MODIFICADA PARA CARGAR DESDE SUPABASE
async function verificarConstanciaExistente() {
  try {
    const { data, error } = await supabase
      .from('constancia_fiscal')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
      console.error('Error al cargar constancia:', error);
      mostrarEstadoSinConstancia();
      return;
    }

    if (data) {
      console.log('Constancia encontrada:', data);
      
      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('constancias-fiscales')
        .getPublicUrl(data.ruta_storage);

      const constanciaData = {
        nombre: data.nombre_archivo,
        tamaño: data.tamaño_archivo,
        tipo: data.tipo_archivo,
        fechaCarga: data.fecha_carga,
        contenido: urlData.publicUrl // URL pública del archivo
      };
      
      mostrarConstancia(constanciaData);
    } else {
      console.log('No hay constancia guardada');
      mostrarEstadoSinConstancia();
    }
  } catch (error) {
    console.error('Error al verificar constancia:', error);
    mostrarEstadoSinConstancia();
  }
}

function mostrarConstancia(constanciaData) {
  // Ocultar mensaje de sin constancia
  document.getElementById('no-constancia').style.display = 'none';
  
  // Mostrar contenedor PDF
  document.getElementById('pdf-container').style.display = 'block';
  
  // Actualizar info del archivo
  document.getElementById('nombre-archivo').textContent = constanciaData.nombre;
  document.getElementById('fecha-carga').textContent = new Date(constanciaData.fechaCarga).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Cargar PDF en iframe usando la URL pública
  const iframe = document.getElementById('pdf-iframe');
  iframe.src = constanciaData.contenido;
}

function mostrarEstadoSinConstancia() {
  document.getElementById('pdf-container').style.display = 'none';
  document.getElementById('no-constancia').style.display = 'block';
}

// 🔥 FUNCIÓN MODIFICADA PARA DESCARGAR DESDE SUPABASE
async function descargarConstancia() {
  try {
    // Obtener metadatos
    const { data: metadata, error: dbError } = await supabase
      .from('constancia_fiscal')
      .select('*')
      .eq('id', 1)
      .single();

    if (dbError || !metadata) {
      mostrarAlerta('Error', 'No se encontró la constancia', 'error');
      return;
    }

    // Descargar desde Storage
    const { data, error } = await supabase.storage
      .from('constancias-fiscales')
      .download(metadata.ruta_storage);

    if (error) {
      console.error('Error al descargar:', error);
      mostrarAlerta('Error', 'Error al descargar la constancia', 'error');
      return;
    }

    // Crear enlace de descarga
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = metadata.nombre_archivo;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    mostrarAlerta('Éxito', 'Constancia descargada correctamente', 'success');
  } catch (error) {
    console.error('Error al descargar constancia:', error);
    mostrarAlerta('Error', 'Error al descargar la constancia', 'error');
  }
}

function mostrarAlerta(titulo, mensaje, tipo) {
  const colores = {
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107'
  };
  
  const iconos = {
    success: 'ri-check-line',
    error: 'ri-error-warning-line',
    warning: 'ri-alert-line'
  };
  
  const alerta = document.createElement('div');
  alerta.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-left: 4px solid ${colores[tipo]};
      border-radius: 8px;
      padding: 15px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 300px;
      animation: slideIn 0.3s ease;
    ">
      <div style="display: flex; align-items: center; gap: 10px;">
        <i class="${iconos[tipo]}" style="color: ${colores[tipo]}; font-size: 1.2rem;"></i>
        <div>
          <h4 style="margin: 0; color: #333; font-size: 1rem;">${titulo}</h4>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">${mensaje}</p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(alerta);
  
  setTimeout(() => {
    alerta.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => alerta.remove(), 300);
  }, 3000);
}

// CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);