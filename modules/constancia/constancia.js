import { supabase } from '../../supabase/db.js';

let archivoSeleccionado = null;

// Verificación de sesión
function verificarSesion() {
  const adminAutenticado = localStorage.getItem('projectidadmin');
  if (adminAutenticado !== '1') {
    document.body.innerHTML = '<div style="position:fixed; top:0; left:0; width:100%; height:100%; background:#fff; z-index:99999; display:flex; align-items:center; justify-content:center; font-family:Arial;"><div style="text-align:center;"><h2 style="color:#003B5C;">Acceso Denegado</h2><p>No tienes permisos para acceder a esta sección</p></div></div>';
    return false;
  }
  return true;
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  if (!verificarSesion()) return;
  
  // Solo inicializar una vez
  if (!window.constanciaInicializada) {
    inicializarEventos();
    verificarConstanciaExistente();
    window.constanciaInicializada = true;
  }
});

function inicializarEventos() {
  // 🔥 REMOVER LISTENERS EXISTENTES ANTES DE AGREGAR NUEVOS
  const btnSubirConstancia = document.getElementById('btn-subir-constancia');
  const btnSubirInicial = document.getElementById('btn-subir-inicial');
  const cerrarModalBtn = document.getElementById('cerrar-modal-constancia');
  const cancelarBtn = document.getElementById('cancelar-subida');
  const confirmarBtn = document.getElementById('confirmar-subida');
  const fileInput = document.getElementById('file-input');
  const uploadArea = document.getElementById('upload-area');
  
  // Limpiar event listeners existentes
  if (btnSubirConstancia) {
    btnSubirConstancia.replaceWith(btnSubirConstancia.cloneNode(true));
    document.getElementById('btn-subir-constancia').addEventListener('click', abrirModalSubida);
  }
  
  if (btnSubirInicial) {
    btnSubirInicial.replaceWith(btnSubirInicial.cloneNode(true));
    document.getElementById('btn-subir-inicial').addEventListener('click', abrirModalSubida);
  }
  
  // Modal eventos
  cerrarModalBtn?.addEventListener('click', cerrarModal);
  cancelarBtn?.addEventListener('click', cerrarModal);
  
  if (confirmarBtn) {
    confirmarBtn.replaceWith(confirmarBtn.cloneNode(true));
    document.getElementById('confirmar-subida').addEventListener('click', subirConstancia);
  }
  
  // File input
  if (fileInput) {
    fileInput.replaceWith(fileInput.cloneNode(true));
    document.getElementById('file-input').addEventListener('change', manejarSeleccionArchivo);
  }
  
  // 🔥 UPLOAD AREA - SOLO UN LISTENER
  if (uploadArea) {
    uploadArea.replaceWith(uploadArea.cloneNode(true));
    const newUploadArea = document.getElementById('upload-area');
    
    newUploadArea.addEventListener('dragover', manejarDragOver);
    newUploadArea.addEventListener('dragleave', manejarDragLeave);
    newUploadArea.addEventListener('drop', manejarDrop);
    
    // 🔥 SOLO UN CLICK LISTENER AQUÍ
    newUploadArea.addEventListener('click', () => {
      document.getElementById('file-input').click();
    });
  }
  
  // Cerrar modal al hacer clic fuera
  const modal = document.getElementById('modal-subir-constancia');
  if (modal) {
    modal.replaceWith(modal.cloneNode(true));
    document.getElementById('modal-subir-constancia').addEventListener('click', function(e) {
      if (e.target === this) cerrarModal();
    });
  }
}

function abrirModalSubida() {
  document.getElementById('modal-subir-constancia').style.display = 'flex';
  limpiarFormulario();
}

function cerrarModal() {
  document.getElementById('modal-subir-constancia').style.display = 'none';
  limpiarFormulario();
}

function limpiarFormulario() {
  archivoSeleccionado = null;
  document.getElementById('file-input').value = '';
  document.getElementById('file-info').style.display = 'none';
  document.getElementById('confirmar-subida').disabled = true;
  
  const uploadArea = document.getElementById('upload-area');
  uploadArea.style.borderColor = '#ddd';
  uploadArea.style.background = '#fafafa';
}

function manejarDragOver(e) {
  e.preventDefault();
  const uploadArea = e.currentTarget;
  uploadArea.style.borderColor = '#FF6F00';
  uploadArea.style.background = '#fff8f0';
}

function manejarDragLeave(e) {
  e.preventDefault();
  const uploadArea = e.currentTarget;
  uploadArea.style.borderColor = '#ddd';
  uploadArea.style.background = '#fafafa';
}

function manejarDrop(e) {
  e.preventDefault();
  const uploadArea = e.currentTarget;
  uploadArea.style.borderColor = '#ddd';
  uploadArea.style.background = '#fafafa';
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    procesarArchivo(files[0]);
  }
}

function manejarSeleccionArchivo(e) {
  const file = e.target.files[0];
  if (file) {
    procesarArchivo(file);
  }
}

function procesarArchivo(file) {
  // Validar que sea PDF
  if (file.type !== 'application/pdf') {
    mostrarAlerta('Error', 'Solo se permiten archivos PDF', 'error');
    return;
  }
  
  // Validar tamaño (máximo 10MB)
  if (file.size > 10 * 1024 * 1024) {
    mostrarAlerta('Error', 'El archivo no puede ser mayor a 10MB', 'error');
    return;
  }
  
  archivoSeleccionado = file;
  mostrarInfoArchivo(file);
  
  // Habilitar botón con estilos
  const btnConfirmar = document.getElementById('confirmar-subida');
  btnConfirmar.disabled = false;
  btnConfirmar.style.opacity = '1';
  btnConfirmar.style.cursor = 'pointer';
  btnConfirmar.onmouseover = function() { this.style.background = '#e55f00'; };
  btnConfirmar.onmouseout = function() { this.style.background = '#FF6F00'; };
}

function mostrarInfoArchivo(file) {
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('selected-file-name');
  const fileSize = document.getElementById('selected-file-size');
  
  fileName.textContent = file.name;
  fileSize.textContent = `Tamaño: ${formatearTamaño(file.size)}`;
  fileInfo.style.display = 'block';
}

function formatearTamaño(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 🔥 FUNCIÓN MODIFICADA PARA USAR SUPABASE STORAGE
async function subirConstancia() {
  if (!archivoSeleccionado) return;
  
  try {
    // Mostrar loading
    const btnConfirmar = document.getElementById('confirmar-subida');
    const textoOriginal = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> Subiendo...';
    btnConfirmar.disabled = true;
    
    // Generar nombre único para el archivo
    const nombreArchivo = `constancia-fiscal-${Date.now()}.pdf`;
    
    console.log('Subiendo archivo a Storage:', nombreArchivo);
    
    // 🔥 SUBIR ARCHIVO A SUPABASE STORAGE
    const { data: storageData, error: storageError } = await supabase.storage
      .from('constancias-fiscales')
      .upload(nombreArchivo, archivoSeleccionado, {
        cacheControl: '3600',
        upsert: true
      });

    if (storageError) {
      console.error('Error al subir a Storage:', storageError);
      mostrarAlerta('Error', 'Error al subir la constancia: ' + storageError.message, 'error');
      
      // Restaurar botón
      btnConfirmar.innerHTML = textoOriginal;
      btnConfirmar.disabled = false;
      return;
    }

    console.log('Archivo subido exitosamente:', storageData);

    // 🔥 GUARDAR METADATOS EN LA TABLA
    const { data: dbData, error: dbError } = await supabase
      .from('constancia_fiscal')
      .upsert([{
        id: 1,
        nombre_archivo: archivoSeleccionado.name,
        tamaño_archivo: archivoSeleccionado.size,
        tipo_archivo: archivoSeleccionado.type,
        ruta_storage: storageData.path,
        fecha_carga: new Date().toISOString()
      }], {
        onConflict: 'id'
      });

    if (dbError) {
      console.error('Error al guardar metadatos:', dbError);
      mostrarAlerta('Error', 'Error al guardar información: ' + dbError.message, 'error');
      
      // Restaurar botón
      btnConfirmar.innerHTML = textoOriginal;
      btnConfirmar.disabled = false;
      return;
    }

    console.log('Metadatos guardados:', dbData);
    
    setTimeout(() => {
      btnConfirmar.innerHTML = textoOriginal;
      btnConfirmar.disabled = false;
      mostrarAlerta('Éxito', 'Constancia subida correctamente', 'success');
      cerrarModal();
      verificarConstanciaExistente(); // Recargar desde Supabase
    }, 1000);
    
  } catch (error) {
    console.error('Error general al subir constancia:', error);
    mostrarAlerta('Error', 'Error al subir la constancia: ' + error.message, 'error');
    
    // Restaurar botón
    const btnConfirmar = document.getElementById('confirmar-subida');
    btnConfirmar.innerHTML = '<i class="ri-upload-2-line"></i> Confirmar';
    btnConfirmar.disabled = false;
  }
}

// 🔥 FUNCIÓN ALTERNATIVA: Leer directo de Storage
async function verificarConstanciaExistente() {
  try {
    console.log('🔍 Buscando archivos en Storage...');
    
    // Listar archivos en el bucket
    const { data: files, error } = await supabase.storage
      .from('constancias-fiscales')
      .list('', {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    console.log('📊 Archivos encontrados:', files, error);

    if (error) {
      console.error('❌ Error al listar archivos:', error);
      mostrarEstadoSinConstancia();
      return;
    }

    if (files && files.length > 0) {
      const archivo = files[0];
      console.log('✅ Archivo encontrado:', archivo);
      
      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('constancias-fiscales')
        .getPublicUrl(archivo.name);

      const constanciaData = {
        nombre: archivo.name,
        tamaño: archivo.metadata?.size || 0,
        tipo: archivo.metadata?.mimetype || 'application/pdf',
        fechaCarga: archivo.created_at,
        contenido: urlData.publicUrl
      };
      
      console.log('📄 Datos a mostrar:', constanciaData);
      mostrarConstancia(constanciaData);
    } else {
      console.log('❌ No hay archivos en Storage');
      mostrarEstadoSinConstancia();
    }
  } catch (error) {
    console.error('💥 Error general:', error);
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

// 🔥 FUNCIÓN MODIFICADA PARA ELIMINAR DE SUPABASE
async function eliminarConstancia() {
  if (confirm('¿Estás seguro de que deseas eliminar la constancia? Esta acción no se puede deshacer.')) {
    try {
      // Obtener ruta del archivo
      const { data: metadata } = await supabase
        .from('constancia_fiscal')
        .select('ruta_storage')
        .eq('id', 1)
        .single();

      if (metadata && metadata.ruta_storage) {
        // Eliminar archivo de Storage
        await supabase.storage
          .from('constancias-fiscales')
          .remove([metadata.ruta_storage]);
      }

      // Eliminar metadatos de la tabla
      const { error } = await supabase
        .from('constancia_fiscal')
        .delete()
        .eq('id', 1);

      if (error) {
        console.error('Error al eliminar:', error);
        mostrarAlerta('Error', 'Error al eliminar la constancia', 'error');
        return;
      }

      mostrarEstadoSinConstancia();
      mostrarAlerta('Éxito', 'Constancia eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar constancia:', error);
      mostrarAlerta('Error', 'Error al eliminar la constancia', 'error');
    }
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