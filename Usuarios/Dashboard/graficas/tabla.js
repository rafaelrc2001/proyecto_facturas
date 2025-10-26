import { supabase } from '../../../supabase/db.js';
import { getIdTrabajador, isAdmin } from '../../../supabase/auth.js';

/**
 * Carga registros desde Supabase y renderiza la tabla resumen en #tabla-resumen
 * Opciones: { limit } - número máximo de filas a traer (por defecto 200)
 */
export async function cargarTablaSupabase({ limit = 200, projectId = null } = {}) {
  try {
    const cont = document.getElementById('tabla-resumen');
    if (!cont) {
      console.warn('#tabla-resumen no encontrado en el DOM.');
      return;
    }

    // Si piden un projectId explícito, úsalo
    if (projectId) {
      let query = supabase
        .from('registro')
        .select('id_registro, establecimiento, pago, importe, id_proyecto')
        .order('id_registro', { ascending: false })
        .limit(limit)
        .eq('id_proyecto', projectId)
        .eq('visibilidad', true)
        .eq('liberar', false);

      const { data, error } = await query;
      if (error) { console.error('Error al leer registros para la tabla (projectId):', error); cont.innerHTML = '<div class="table-empty">Error cargando registros.</div>'; return; }
      renderRows(data);
      return;
    }

    // Si es trabajador, limitar a proyectos asignados y visibles
    const idTrabajador = getIdTrabajador();
    let query = supabase
      .from('registro')
      .select('id_registro, establecimiento, pago, importe, id_proyecto')
      .order('id_registro', { ascending: false })
      .limit(limit);

    if (idTrabajador && !isAdmin()) {
      // obtener asignaciones
      const { data: asigns, error: asignErr } = await supabase
        .from('asignar_proyecto')
        .select('id_proyecto')
        .eq('id_trabajador', Number(idTrabajador));
      if (asignErr) { console.error('Error cargando asignaciones:', asignErr); cont.innerHTML = '<div class="table-empty">Error cargando registros.</div>'; return; }
      const ids = (asigns || []).map(a => Number(a.id_proyecto));
      if (!ids.length) { cont.innerHTML = '<div class="table-empty">No hay registros disponibles.</div>'; return; }

      // limitar sólo a proyectos visibles entre los asignados
      const { data: visibleProjs, error: visErr } = await supabase
        .from('proyecto')
        .select('id_proyecto')
        .in('id_proyecto', ids)
        .eq('visibilidad', true)
        .eq('liberar', false);
      if (visErr) { console.error('Error cargando proyectos visibles:', visErr); cont.innerHTML = '<div class="table-empty">Error cargando registros.</div>'; return; }
      const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
      if (!visibleIds.length) { cont.innerHTML = '<div class="table-empty">No hay registros disponibles.</div>'; return; }

      query = query.in('id_proyecto', visibleIds);
    }

    const { data, error } = await query;
    if (error) { console.error('Error al leer registros para la tabla desde Supabase:', error); cont.innerHTML = '<div class="table-empty">Error cargando registros.</div>'; return; }
    if (!data || data.length === 0) { cont.innerHTML = '<div class="table-empty">No hay registros disponibles.</div>'; return; }

    function renderRows(dataRows) {
      const esc = s => {
        if (s === null || s === undefined) return '';
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      };
      const rowsHtml = dataRows.map(row => {
        const establecimiento = esc(row.establecimiento || 'Desconocido');
        const pago = esc(row.pago || 'Desconocido');
        const importeNum = parseFloat(String(row.importe).replace(',', '.')) || 0;
        const importe = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(importeNum);
        return `
          <div class="table-row" style="display:grid;grid-template-columns:1fr 220px 140px;gap:12px;padding:12px 10px;border-bottom:1px solid #f4f6f7;align-items:center;">
            <div class="cell-establecimiento" style="color:#08384b;font-weight:600;">${establecimiento}</div>
            <div class="cell-pago" style="color:#276080;">${pago}</div>
            <div class="cell-importe" style="text-align:right;color:#003B5C;font-weight:700;">${importe}</div>
          </div>
        `;
      }).join('');
      cont.innerHTML = rowsHtml;
    }

    renderRows(data);
  } catch (err) {
    console.error('Exception cargando tabla desde Supabase:', err);
    const cont = document.getElementById('tabla-resumen');
    if (cont) cont.innerHTML = '<div class="table-empty">Error al cargar tabla.</div>';
  }
}

// Auto-inicializa cuando el DOM esté listo (opcional)
document.addEventListener('DOMContentLoaded', () => {
  // comentar si prefieres llamar cargarTablaSupabase() desde dashboard.js
  cargarTablaSupabase();
});