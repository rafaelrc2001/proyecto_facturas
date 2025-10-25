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












