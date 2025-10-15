import { supabase } from './db.js';

export async function insertarTrabajador({ nombre, puesto, idEmpleado, correo, usuario, contrasena }) {
  return await supabase
    .from('trabajador')
    .insert([{ nombre, puesto, id_empleado: idEmpleado, correo, usuario, contrasena }]);
}

export async function obtenerTrabajadores() {
  return await supabase
    .from('trabajador')
    .select('*');
}

export async function eliminarTrabajador(id) {
  return await supabase
    .from('trabajador')
    .delete()
    .eq('id_trabajador', id);
}

export async function actualizarTrabajador(id_trabajador, { nombre, puesto, idEmpleado, correo, usuario, contrasena }) {
  return await supabase
    .from('trabajador')
    .update({ nombre, puesto, id_empleado: idEmpleado, correo, usuario, contrasena })
    .eq('id_trabajador', id_trabajador); // usa id_trabajador
}