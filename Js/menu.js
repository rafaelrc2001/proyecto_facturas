// Lógica para el botón de cerrar sesión
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('Sesión cerrada.');
            window.location.href = '../../index.html';
        });
    }

    // Submenú animado con click
    const submenuToggles = document.querySelectorAll(".submenu-toggle");
    submenuToggles.forEach(toggle => {
        toggle.addEventListener("click", function(e) {
            e.preventDefault();
            const parent = toggle.closest(".has-submenu");
            parent.classList.toggle("open");
        });
    });

    // Abrir submenú automáticamente según la URL
    const path = window.location.pathname;
    const registrarMenu = document.querySelector('.has-submenu');
    if (registrarMenu) {
        if (
            path.includes('/proyectos/proyectos.html') ||
            path.includes('/trabajador/trabajador.html')
        ) {
            registrarMenu.classList.add('open');
        }
        // Marcar activo en submenú
        const proyectoLink = registrarMenu.querySelector('a[href*="proyectos.html"]');
        const trabajadorLink = registrarMenu.querySelector('a[href*="trabajador.html"]');
        if (proyectoLink) proyectoLink.classList.remove('active');
        if (trabajadorLink) trabajadorLink.classList.remove('active');
        if (path.includes('/proyectos/proyectos.html') && proyectoLink) {
            proyectoLink.classList.add('active');
        }
        if (path.includes('/trabajador/trabajador.html') && trabajadorLink) {
            trabajadorLink.classList.add('active');
        }
    }

    // Botón para colapsar sidebar
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('compact');
        });
    }
});

// Lógica para el botón de avatar
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('avatar-btn');
    let modal = document.getElementById('avatar-modal');

    // Si no existe el modal en el HTML, lo creamos para asegurar que funcione
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'avatar-modal';
        modal.className = 'modal';
        modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2000;align-items:center;justify-content:center;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:8px;width:320px;max-width:90%;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,0.2);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <h3 style="margin:0;font-size:1.1rem;color:#003B5C;">Hola</h3>
                    <button id="close-avatar-modal" aria-label="Cerrar" style="background:none;border:0;font-size:1.3rem;cursor:pointer;color:#666;">&times;</button>
                </div>
                <div style="font-size:0.95rem;color:#333;"><p>Hola</p></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    if (!btn || !modal) return;

    const closeBtn = document.getElementById('close-avatar-modal');

    btn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });

    closeBtn && closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // cerrar al clicar fuera del contenido
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // cerrar con Escape
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.style.display = 'none';
    });
});

// Toggle para mostrar/ocultar contraseñas del modal (usa iconos tipo 'ri-...')
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.pw-toggle');
  if (!btn) return;
  const targetId = btn.getAttribute('data-target');
  if (!targetId) return;
  const input = document.getElementById(targetId);
  if (!input) return;

  // alternar tipo
  const wasPassword = input.type === 'password';
  input.type = wasPassword ? 'text' : 'password';

  // actualizar icono (usa clases tipo Remix Icon: ri-eye-line / ri-eye-off-line)
  const nowShown = input.type === 'text';
  // botón sin fondo, icono en color naranja (hereda color desde el button)
  btn.innerHTML = `<i class="${nowShown ? 'ri-eye-off-line' : 'ri-eye-line'}" style="font-size:16px;line-height:0;color:inherit;"></i>`;

  // accesibilidad
  btn.setAttribute('aria-pressed', String(nowShown));
  btn.setAttribute('title', nowShown ? 'Ocultar contraseña' : 'Mostrar contraseña');

  btn.classList.toggle('pw-toggle-active', nowShown);
});

// Asegúrate de tener supabase importado al inicio del archivo:
// import { supabase } from '../supabase/db.js';

/*
// DEBUG rápido: confirma carga del script
console.log('menu.js cargado');
try { if (typeof window !== 'undefined') alert('menu.js cargado'); } catch(e){ /* evitar crash si alert bloqueado *\/ }

// Listener delegado para capturar submit aunque el form sea inyectado dinámicamente
document.addEventListener('submit', async (ev) => {
  const form = ev.target;
  if (!form || form.id !== 'avatar-config-form') return;
  ev.preventDefault();
  console.log('avatar-config-form submit capturado');
  alert('Submit capturado'); // te debería aparecer

  const inputUsuario = document.getElementById('cfg-usuario');
  const inputCurrent = document.getElementById('cfg-current-password');
  const inputPass = document.getElementById('cfg-password');
  const inputPass2 = document.getElementById('cfg-password2');
  const msg = document.getElementById('cfg-msg');

  console.log({ inputUsuario, inputCurrent, inputPass, inputPass2, msg });

  if (!inputUsuario) {
    alert('No se encontró cfg-usuario');
    return;
  }

  const nuevoUsuario = (inputUsuario.value || '').trim();
  const currentPass = inputCurrent ? (inputCurrent.value || '').trim() : '';
  const pass = inputPass ? (inputPass.value || '').trim() : '';
  const pass2 = inputPass2 ? (inputPass2.value || '').trim() : '';

  // Validaciones visuales rápidas
  if (!nuevoUsuario) { alert('Usuario vacío'); if (msg) msg.textContent = 'Usuario vacío'; return; }
  if (pass || pass2) {
    if (pass !== pass2) { alert('Las contraseñas no coinciden'); if (msg) msg.textContent = 'Las contraseñas no coinciden'; return; }
    if (pass.length < 6) { alert('La contraseña debe tener >=6 caracteres'); if (msg) msg.textContent = 'La contraseña debe tener >=6 caracteres'; return; }
    if (!currentPass) { alert('Ingresa la contraseña actual para cambiar la contraseña'); if (msg) msg.textContent = 'Ingrese contraseña actual'; return; }
  }

  // aquí puedes llamar a la función existente de actualización (si la tienes expuesta)
  // await actualizarUsuarioDesdeMenu({ nuevoUsuario, currentPass, pass });
  alert('Validación OK — ahora ejecuta la actualización');
});
*/

// Manejador async para el formulario de configuración (evita usar await en top-level)
(function attachAvatarFormHandler() {
  const form = document.getElementById('avatar-config-form');
  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();

    const inputUsuario = document.getElementById('cfg-usuario');
    const inputCurrent = document.getElementById('cfg-current-password');
    const inputPass = document.getElementById('cfg-password');
    const inputPass2 = document.getElementById('cfg-password2');
    const msg = document.getElementById('cfg-msg');
    const btnSave = document.getElementById('cfg-save');

    if (!inputUsuario || !inputCurrent || !inputPass || !inputPass2 || !msg) return;

    msg.style.color = '#c00';
    msg.textContent = '';

    const nuevoUsuario = (inputUsuario.value || '').trim();
    const currentPass = (inputCurrent.value || '').trim();
    const pass = (inputPass.value || '').trim();
    const pass2 = (inputPass2.value || '').trim();

    if (!nuevoUsuario) { msg.textContent = 'El usuario no puede quedar vacío.'; return; }
    if (pass || pass2) {
      if (pass !== pass2) { msg.textContent = 'Las contraseñas no coinciden.'; return; }
      if (pass.length < 6) { msg.textContent = 'La contraseña debe tener al menos 6 caracteres.'; return; }
    }

    if (pass && !currentPass) {
      msg.textContent = 'Ingrese su contraseña actual para cambiar la contraseña.'; return;
    }

    if (btnSave) { btnSave.disabled = true; btnSave.textContent = 'Guardando...'; }

    try {
      // obtener id de sesión desde localStorage
      const userRaw = localStorage.getItem('user');
      if (!userRaw) {
        alert('No hay sesión activa.'); // <-- alerta
        throw new Error('No hay sesión activa.');
      }
      const user = JSON.parse(userRaw);
      const posibleId = user.id ?? user.id_trabajador ?? user.id_usuario ?? user.id_user ?? null;
      if (!posibleId) {
        alert('No se encontró id de usuario en la sesión.'); // <-- alerta
        throw new Error('No se encontró id de usuario en sesión.');
      }

      const idVal = Number(posibleId);
      // Verificar registro actual en tabla login
      const { data: loginRow, error: selErr } = await supabase
        .from('login')
        .select('id, usuario, password')
        .eq('id', idVal)
        .single();

      if (selErr || !loginRow) {
        console.error('Error leyendo login:', selErr);
        alert('No se pudo leer datos de usuario.'); // <-- alerta
        msg.textContent = 'No se pudo leer datos de usuario.';
        return;
      }

      // Si se solicita cambio de contraseña, verificar contraseña actual (texto plano asumido)
      if (pass) {
        const stored = String(loginRow.password ?? '');
        if (stored !== currentPass) {
          alert('Contraseña actual incorrecta.'); // <-- alerta
          msg.textContent = 'Contraseña actual incorrecta.';
          return;
        }
      }

      // Preparar objeto de actualización
      const finalUpdate = {};
      if (nuevoUsuario) finalUpdate.usuario = nuevoUsuario;
      if (pass) finalUpdate.password = pass;

      if (Object.keys(finalUpdate).length === 0) {
        alert('No hay cambios para guardar.'); // <-- alerta
        msg.style.color = '#080';
        msg.textContent = 'No hay cambios para guardar.';
      } else {
        // indicar inicio de la operación
        // alert opcional: alert('Actualizando datos...');

        const { error: updErr } = await supabase
          .from('login')
          .update(finalUpdate)
          .eq('id', idVal);

        if (updErr) {
          console.error('Error actualizando login:', updErr);
          alert('Error al actualizar datos.'); // <-- alerta
          msg.style.color = '#c00';
          msg.textContent = 'Error al actualizar datos.';
          return;
        }

        // actualizar localStorage
        if (user) {
          user.nombre = nuevoUsuario || user.nombre;
          if (finalUpdate.usuario) user.usuario = finalUpdate.usuario;
          localStorage.setItem('user', JSON.stringify(user));
        }

        alert('Datos actualizados correctamente.'); // <-- alerta de éxito
        msg.style.color = '#080';
        msg.textContent = 'Datos actualizados correctamente.';
        setTimeout(() => {
          const modal = document.getElementById('avatar-modal');
          if (modal) modal.style.display = 'none';
        }, 900);
      }
    } catch (err) {
      console.error('Error actualizando usuario:', err);
      alert('Error al actualizar. Revisa la consola.'); // <-- alerta general
      msg.style.color = '#c00';
      msg.textContent = 'Error al actualizar. Revisa la consola.';
    } finally {
      if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Actualizar'; }
    }
  });
})();
