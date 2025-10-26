import { supabase } from '../../../supabase/db.js';
import { getIdTrabajador, isAdmin } from '../../../supabase/auth.js';

async function cargarPastelDesdeSupabase(projectId = null) {
  try {
    // Prepara consulta con count exacto para obtener total fiable
    let query = supabase.from('registro').select('tipo', { count: 'exact' });

    // Si se especifica projectId usarlo directamente
    if (projectId) {
      query = query.eq('id_proyecto', projectId);
    } else {
      // Si es trabajador, limitar a proyectos asignados y visibles
      const idTrabajador = getIdTrabajador();
      if (idTrabajador && !isAdmin()) {
        const { data: asigns, error: asignErr } = await supabase
          .from('asignar_proyecto')
          .select('id_proyecto')
          .eq('id_trabajador', Number(idTrabajador));
        if (asignErr) { console.error('[pastel] error obteniendo asignaciones:', asignErr); return; }
        const ids = (asigns || []).map(a => Number(a.id_proyecto));
        if (!ids.length) {
          // Usuario sin proyectos asignados -> mostrar gráfico vacío
          renderPieWithData([], 0);
          return;
        }

        const { data: visibleProjs, error: visErr } = await supabase
          .from('proyecto')
          .select('id_proyecto')
          .in('id_proyecto', ids)
          .eq('visibilidad', true)
          .eq('liberar', false);
        if (visErr) { console.error('[pastel] error proyectos visibles:', visErr); return; }
        const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
        if (!visibleIds.length) {
          renderPieWithData([], 0);
          return;
        }

        query = query.in('id_proyecto', visibleIds);
      }
      // si no es trabajador o es admin, dejamos la query sin filtrar por proyecto (comportamiento previo)
    }

    const { data, error, count } = await query;
    if (error) { console.error('[pastel] error leyendo registros:', error); return; }

    // total preferente desde count (si Supabase lo retornó), si no, usar data.length
    let total = 0;
    try {
      // limitar total a proyectos asignados y visibles si el usuario es trabajador
      const idTrabajador = (typeof getIdTrabajador === 'function') ? getIdTrabajador() : null;
      const esAdmin = (typeof isAdmin === 'function') ? isAdmin() : false;

      if (idTrabajador && !esAdmin) {
        // obtener proyectos asignados
        const { data: asigns } = await supabase
          .from('asignar_proyecto')
          .select('id_proyecto')
          .eq('id_trabajador', Number(idTrabajador));

        const asignIds = (asigns || []).map(a => Number(a.id_proyecto));
        if (asignIds.length) {
          // filtrar solo visibles entre los asignados
          const { data: visibleProjs } = await supabase
            .from('proyecto')
            .select('id_proyecto')
            .in('id_proyecto', asignIds)
            .eq('visibilidad', true);
          const visibleIds = (visibleProjs || []).map(p => Number(p.id_proyecto));
          // contar solo filas de data que pertenezcan a visibleIds
          total = (data || []).filter(r => visibleIds.includes(Number(r.id_proyecto))).length;
        } else {
          total = 0;
        }
      } else {
        // admin / no usuario => usar count/data.length como antes
        total = (data && data.length) ? data.length : (typeof count === 'number' ? count : 0);
      }
    } catch (e) {
      console.error('[pastel] error calculando total por usuario:', e);
      total = (data && data.length) ? data.length : (typeof count === 'number' ? count : 0);
    }

    // construir conteo por tipo usando solo los registros obtenidos
    const conteo = {};
    (data || []).forEach(r => {
      const tipo = (r.tipo || 'Desconocido').toString().trim().toLowerCase();
      let tipoDisplay = 'Desconocido';
      
      if (tipo === 'cfdi') {
        tipoDisplay = 'CFDI';
      } else if (tipo === 'sin comprobante(ticket o nota)') {
        tipoDisplay = 'SIN COMPROBANTE';
      } else if (tipo !== 'desconocido') {
        tipoDisplay = tipo.toUpperCase();
      }
      
      conteo[tipoDisplay] = (conteo[tipoDisplay] || 0) + 1;
    });

    const palette = ['#003B5C', '#FF6F00', '#77ABB7', '#D9A400', '#1D3E53', '#FFC107'];
    const entries = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    const pieData = entries.map(([name, value], i) => ({ name, value, itemStyle: { color: palette[i % palette.length] } }));

    // reemplazar cálculo anterior de total por la suma de los valores de pieData
    const totalFromSlices = pieData.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

    // Renderizar la gráfica con ECharts (reemplaza o integra con tu código de render existente)
    function renderPieWithData(pieDataLocal, totalLocal) {
      const chartDom = document.getElementById('distribution-chart');
      if (!chartDom) return;
      const chart = echarts.init(chartDom);
      const option = {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: params => `<strong style="color:#003B5C">${params.name}</strong><br/>Cantidad: <strong>${params.value}</strong><br/><span style="color:#FF6F00">${params.percent}%</span>` },
        legend: { orient: 'horizontal', bottom: 8, left: 'center', itemGap: 14, itemHeight: 10, itemWidth: 12, textStyle: { color: '#276080', fontSize: 12 } },
        series: [{
          name: 'Tipos',
          type: 'pie',
          radius: ['50%', '70%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: '#003B5C', fontSize: 12 },
          labelLine: { length: 20, length2: 12 },
          itemStyle: { borderColor: '#fff', borderWidth: 2, borderRadius: 8 },
          data: pieDataLocal
        }],
        graphic: [{
          type: 'text',
          left: 'center',
          top: '45%',
          style: {
            text: String(totalLocal),
            fill: '#003B5C',
            fontSize: 20,
            fontWeight: 700,
            align: 'center'
          }
        }]
      };
      chart.setOption(option);
      window.distributionChartInstance = chart;
      window.addEventListener('resize', () => chart.resize());
    }

    // finalmente renderiza con los datos calculados usando totalFromSlices
    renderPieWithData(pieData, totalFromSlices);
  } catch (err) {
    console.error('[pastel] excepción:', err);
  }
}

// comentar / eliminar la auto-inicialización:
// document.addEventListener('DOMContentLoaded', () => {
//   cargarPastelDesdeSupabase();
//});

// Exportar la función como ya lo tienes
export { cargarPastelDesdeSupabase };