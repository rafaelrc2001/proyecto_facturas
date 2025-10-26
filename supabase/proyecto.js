import { supabase } from './db.js';

export async function insertarProyecto({ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final }) {
  return await supabase
    .from('proyecto')
    .insert([{ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final }]);
}

// 🔥 ACTUALIZAR: Agregar filtro por liberar = false
export async function obtenerProyectos() {
  return await supabase
    .from('proyecto')
    .select('*')
    .eq('visibilidad', true)    // Solo los visibles
    .eq('liberar', false);      // Y que NO estén liberados
}

export async function eliminarProyecto(id) {
  return await supabase
    .from('proyecto')
    .update({ visibilidad: false }) // Oculta el proyecto
    .eq('id_proyecto', id);
}

export async function actualizarProyecto(id, { cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final }) {
  return await supabase
    .from('proyecto')
    .update({ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final })
    .eq('id_proyecto', id);
}

// Nueva función para actualizar solo el presupuesto
export async function actualizarPresupuestoProyecto(id_proyecto, nuevoPresupuesto) {
  // Primero obtener el presupuesto total actual
  const { data: proyectoActual, error: errorGet } = await supabase
    .from('proyecto')
    .select('presupuesto, presupuesto_total')
    .eq('id_proyecto', id_proyecto)
    .single();

  if (errorGet) {
    return { error: errorGet };
  }

  // Calcular el nuevo total
  const presupuestoTotalActual = parseFloat(proyectoActual.presupuesto_total || 0);
  const nuevoTotal = presupuestoTotalActual + parseFloat(nuevoPresupuesto);

  // Actualizar ambas columnas
  return await supabase
    .from('proyecto')
    .update({ 
      presupuesto: nuevoPresupuesto,  // El último presupuesto asignado
      presupuesto_total: nuevoTotal   // La suma acumulativa
    })
    .eq('id_proyecto', id_proyecto);
}

// 🔥 FUNCIÓN PARA LIBERAR PROYECTO (CORREGIDA):
export async function liberarProyecto(id_proyecto) {
  try {
    // Solo actualizar la columna liberar a true, SIN eliminar asignaciones
    const { data, error } = await supabase
      .from('proyecto')
      .update({ liberar: true })
      .eq('id_proyecto', id_proyecto);

    return { data, error };
  } catch (ex) {
    console.error('Error en liberarProyecto:', ex);
    return { error: ex };
  }
}

// 🔥 NUEVA FUNCIÓN: Obtener proyectos liberados (para admin)
export async function obtenerProyectosLiberados() {
  return await supabase
    .from('proyecto')
    .select('*')
    .eq('visibilidad', true)    // Solo los visibles
    .eq('liberar', true);       // Pero que SÍ estén liberados
}

// 🔥 NUEVA FUNCIÓN: Restaurar proyecto liberado
export async function restaurarProyecto(id_proyecto) {
  return await supabase
    .from('proyecto')
    .update({ liberar: false })
    .eq('id_proyecto', id_proyecto);
}