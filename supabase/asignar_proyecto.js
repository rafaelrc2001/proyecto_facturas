import { supabase } from './db.js';

// Nueva función para asignar proyecto a trabajador
export async function asignarProyectoATrabajador(id_proyecto, id_trabajador) {
  // Verifica si ya existe una asignación para ese proyecto
  const { data: asignacionExistente, error } = await supabase
    .from('asignar_proyecto')
    .select('*')
    .eq('id_proyecto', id_proyecto)
    .single();

  if (asignacionExistente) {
    // Actualiza el trabajador asignado
    return await supabase
      .from('asignar_proyecto')
      .update({ id_trabajador })
      .eq('id_proyecto', id_proyecto);
  } else {
    // Inserta nueva asignación
    return await supabase
      .from('asignar_proyecto')
      .insert([{ id_trabajador, id_proyecto }]);
  }
}












