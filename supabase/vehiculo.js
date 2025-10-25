/**
 * Wrappers para la tabla `vehiculo` en Supabase.
 * Requiere la variable global `supabase` inicializada.
 */

import { supabase } from './db.js'; // <-- ya tienes esto

async function ensureClient() {
  if (!supabase) {
    throw new Error('supabase no está inicializado. Inicializa el cliente antes de usar estas funciones.');
  }
}

export async function createVehiculo({ modelo, marca, placas }) {
  await ensureClient();
  try {
    // usa maybeSingle para evitar errores si por alguna razón no devuelve objeto
    const res = await supabase
      .from('vehiculo')
      .insert([{ modelo, marca, placas }])
      .select()
      .maybeSingle();

    console.log('createVehiculo response:', res);
    const { data, error, status } = res;
    if (error) {
      console.error('createVehiculo error detalle:', { status, error, res });
      throw error;
    }
    // data puede ser null si la API no devolvió representación; manejar arriba
    return data;
  } catch (err) {
    console.error('createVehiculo error:', err);
    throw err;
  }
}

export async function updateVehiculo(id, { modelo, marca, placas }) {
  await ensureClient();
  try {
    // maybeSingle evita el PGRST116 si no hay filas retornadas
    const res = await supabase
      .from('vehiculo')
      .update({ modelo, marca, placas })
      .eq('id', id)
      .select()
      .maybeSingle();

    console.log('updateVehiculo response:', res);
    const { data, error } = res;
    if (error) {
      console.error('updateVehiculo error detalle:', { error, res });
      throw error;
    }
    if (!data) {
      // no se encontró la fila; devuelve null o lanza un error específico
      throw new Error(`No se encontró vehículo con id=${id}`);
    }
    return data;
  } catch (err) {
    console.error('updateVehiculo error:', err);
    throw err;
  }
}

/**
 * Eliminar vehículo por id.
 */
export async function deleteVehiculo(id) {
  await ensureClient();
  try {
    const { error } = await supabase
      .from('vehiculo')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteVehiculo error:', err);
    throw err;
  }
}

/**
 * Obtener todos los vehículos (orden descendente por id).
 */
export async function fetchVehiculos({ limit = 500 } = {}) {
  await ensureClient();
  try {
    const { data, error } = await supabase
      .from('vehiculo')
      .select('*')
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchVehiculos error:', err);
    throw err;
  }
}