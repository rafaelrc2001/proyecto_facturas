import { supabase } from './db.js';

export async function insertarProyecto({ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final }) {
  return await supabase
    .from('proyecto')
    .insert([{ cliente, nombre, descripción, ubicación, fecha_inicio, fecha_final }]);
}

export async function obtenerProyectos() {
  return await supabase
    .from('proyecto')
    .select('*');
}