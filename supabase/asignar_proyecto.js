import { supabase } from './db.js';

export async function insertarAsignacion({ id_trabajador, id_proyecto }) {
  return await supabase
    .from('asignar_proyecto')
    .insert([{ id_trabajador, id_proyecto }]);
}












