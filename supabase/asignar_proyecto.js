import { supabase } from './db.js';

export async function asignarProyectoATrabajador(id_proyecto, id_trabajador, id_viatico = null) {
  // Verifica si ya existe una asignación para ese proyecto
  const { data: asignacionExistente, error } = await supabase
    .from('asignar_proyecto')
    .select('*')
    .eq('id_proyecto', id_proyecto)
    .single();

  if (asignacionExistente) {
    // Actualiza el trabajador asignado y el responsable de viáticos
    return await supabase
      .from('asignar_proyecto')
      .update({ 
        id_trabajador,
        id_viatico 
      })
      .eq('id_proyecto', id_proyecto);
  } else {
    // Inserta nueva asignación
    return await supabase
      .from('asignar_proyecto')
      .insert([{ 
        id_proyecto, 
        id_trabajador,
        id_viatico 
      }]);
  }
}

// 🔥 ACTUALIZAR: Función para obtener proyectos por trabajador
export async function obtenerProyectosPorTrabajador(id_trabajador) {
  try {
    // Obtener asignaciones del trabajador
    const { data: asignaciones, error: errorAsign } = await supabase
      .from('asignar_proyecto')
      .select('id_proyecto')
      .eq('id_trabajador', id_trabajador);

    if (errorAsign) {
      console.error('Error obteniendo asignaciones:', errorAsign);
      return { data: [], error: errorAsign };
    }

    if (!asignaciones || asignaciones.length === 0) {
      return { data: [], error: null }; // No tiene proyectos asignados
    }

    const idsProyectos = asignaciones.map(a => a.id_proyecto);

    // 🔥 ACTUALIZAR: Obtener proyectos que estén visibles, NO liberados Y asignados al trabajador
    const { data: proyectos, error: errorProyectos } = await supabase
      .from('proyecto')
      .select('*')
      .in('id_proyecto', idsProyectos)
      .eq('visibilidad', true)      // Visibles
      .eq('liberar', false)         // NO liberados
      .order('nombre');

    return { data: proyectos || [], error: errorProyectos };
  } catch (error) {
    console.error('Error en obtenerProyectosPorTrabajador:', error);
    return { data: [], error };
  }
}

// 🔥 ACTUALIZAR: Verificar acceso considerando liberación
export async function trabajadorTieneAccesoAProyecto(id_trabajador, id_proyecto) {
  try {
    // Verificar que esté asignado Y que el proyecto no esté liberado
    const { data: asignacion, error: errorAsign } = await supabase
      .from('asignar_proyecto')
      .select('id_proyecto')
      .eq('id_trabajador', id_trabajador)
      .eq('id_proyecto', id_proyecto)
      .single();

    if (errorAsign || !asignacion) {
      return { tieneAcceso: false, error: errorAsign };
    }

    // Verificar que el proyecto no esté liberado
    const { data: proyecto, error: errorProyecto } = await supabase
      .from('proyecto')
      .select('liberar, visibilidad')
      .eq('id_proyecto', id_proyecto)
      .single();

    if (errorProyecto) {
      return { tieneAcceso: false, error: errorProyecto };
    }

    // Tiene acceso si está asignado, visible y NO liberado
    const tieneAcceso = proyecto.visibilidad && !proyecto.liberar;
    
    return { tieneAcceso, error: null };
  } catch (error) {
    return { tieneAcceso: false, error };
  }
}












