import { supabase } from '../supabase/db.js';

// Reemplaza esta URL por la de tu webhook n8n
const N8N_WEBHOOK_URL = 'https://tu-n8n-url/webhook/asignar-proyecto';

// Función para enviar datos a n8n cuando se asigna un proyecto
export async function enviarDatosAsignacion(id_trabajador, id_proyecto) {
  // 1. Consulta datos del trabajador
  const { data: trabajador, error: errorTrabajador } = await supabase
    .from('trabajador')
    .select('nombre, correo, usuario')
    .eq('id_trabajador', id_trabajador)
    .single();

  // 2. Consulta datos del proyecto
  const { data: proyecto, error: errorProyecto } = await supabase
    .from('proyecto')
    .select('nombre, fecha_inicio, fecha_final')
    .eq('id_proyecto', id_proyecto)
    .single();

  if (errorTrabajador || errorProyecto || !trabajador || !proyecto) {
    console.error('Error consultando datos en Supabase:', errorTrabajador || errorProyecto);
    return false;
  }

  // 3. Prepara los datos a enviar
  const datosEnviar = {
    nombreTrabajador: trabajador.nombre,
    correoTrabajador: trabajador.correo,
    usuarioTrabajador: trabajador.usuario,
    nombreProyecto: proyecto.nombre,
    fechaInicio: proyecto.fecha_inicio,
    fechaFin: proyecto.fecha_final
  };

  // 4. Muestra en consola lo que se va a enviar
  console.log('Datos enviados a n8n:', datosEnviar);

  // 5. Envía los datos a n8n
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosEnviar)
    });
    if (!response.ok) throw new Error('Error al enviar datos a n8n');
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}