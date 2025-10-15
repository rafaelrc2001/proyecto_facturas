// Reemplaza esta URL por la de tu webhook n8n
const N8N_WEBHOOK_URL = 'https://tu-n8n-url/webhook/correo';

export async function enviarDatosCorreo({ nombre, correo, usuario, mensaje }) {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre,
        correo,
        usuario,
        mensaje
      })
    });
    if (!response.ok) throw new Error('Error al enviar datos a n8n');
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}