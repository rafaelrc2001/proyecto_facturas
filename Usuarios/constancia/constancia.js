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
  
  inicializarEventos();
  verificarConstanciaExistente();
});

function inicializarEventos() {
  // Botones para abrir modal
  document.getElementById('btn-subir-constancia')?.addEventListener('click', abrirModalSubida);
  document.getElementById('btn-subir-inicial')?.addEventListener('click', abrirModalSubida);
  
  // Modal eventos
  document.getElementById('cerrar-modal-constancia')?.addEventListener('click', cerrarModal);
  document.getElementById('cancelar-subida')?.addEventListener('click', cerrarModal);
  document.getElementById('confirmar-subida')?.addEventListener('click', subirConstancia);
  
  // File input
  const fileInput = document.getElementById('file-input');
  fileInput?.addEventListener('change', manejarSeleccionArchivo);
  
  // Drag & Drop
  const uploadArea = document.getElementById('upload-area');
  uploadArea?.addEventListener('dragover', manejarDragOver);
  uploadArea?.addEventListener('dragleave', manejarDragLeave);
  uploadArea?.addEventListener('drop', manejarDrop);
  uploadArea?.addEventListener('click', () => fileInput?.click());
  
  // Botones de acciones
  document.getElementById('btn-descargar')?.addEventListener('click', descargarConstancia);
  document.getElementById('btn-eliminar')?.addEventListener('click', eliminarConstancia);
  
  // Cerrar modal al hacer clic fuera
  document.getElementById('modal-subir-constancia')?.addEventListener('click', function(e) {
    if (e.target === this) cerrarModal();
  });
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

async function subirConstancia() {
  if (!archivoSeleccionado) return;
  
  try {
    // Mostrar loading
    const btnConfirmar = document.getElementById('confirmar-subida');
    const textoOriginal = btnConfirmar.innerHTML;
    btnConfirmar.innerHTML = '<i class="ri-loader-4-line" style="animation: spin 1s linear infinite;"></i> Subiendo...';
    btnConfirmar.disabled = true;
    
    // Convertir archivo a base64 para almacenar en localStorage
    const base64 = await convertirABase64(archivoSeleccionado);
    
    const constanciaData = {
      nombre: archivoSeleccionado.name,
      tamaño: archivoSeleccionado.size,
      tipo: archivoSeleccionado.type,
      fechaCarga: new Date().toISOString(),
      contenido: base64
    };
    
    // Guardar en localStorage
    localStorage.setItem('constancia_fiscal', JSON.stringify(constanciaData));
    
    setTimeout(() => {
      mostrarAlerta('Éxito', 'Constancia subida correctamente', 'success');
      cerrarModal();
      mostrarConstancia(constanciaData);
    }, 1000);
    
  } catch (error) {
    console.error('Error al subir constancia:', error);
    mostrarAlerta('Error', 'Error al subir la constancia', 'error');
  }
}

function convertirABase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function verificarConstanciaExistente() {
  const constanciaGuardada = localStorage.getItem('constancia_fiscal');
  
  if (constanciaGuardada) {
    try {
      const constanciaData = JSON.parse(constanciaGuardada);
      mostrarConstancia(constanciaData);
    } catch (error) {
      console.error('Error al cargar constancia:', error);
      mostrarEstadoSinConstancia();
    }
  } else {
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
  
  // Cargar PDF en iframe
  const iframe = document.getElementById('pdf-iframe');
  iframe.src = constanciaData.contenido;
}

function mostrarEstadoSinConstancia() {
  document.getElementById('pdf-container').style.display = 'none';
  document.getElementById('no-constancia').style.display = 'block';
}

function descargarConstancia() {
  const constanciaGuardada = localStorage.getItem('constancia_fiscal');
  
  if (constanciaGuardada) {
    try {
      const constanciaData = JSON.parse(constanciaGuardada);
      
      const link = document.createElement('a');
      link.href = constanciaData.contenido;
      link.download = constanciaData.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      mostrarAlerta('Éxito', 'Constancia descargada correctamente', 'success');
    } catch (error) {
      console.error('Error al descargar:', error);
      mostrarAlerta('Error', 'Error al descargar la constancia', 'error');
    }
  }
}

function eliminarConstancia() {
  if (confirm('¿Estás seguro de que deseas eliminar la constancia? Esta acción no se puede deshacer.')) {
    localStorage.removeItem('constancia_fiscal');
    mostrarEstadoSinConstancia();
    mostrarAlerta('Éxito', 'Constancia eliminada correctamente', 'success');
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