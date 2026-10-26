// Reglas de las imágenes adjuntas. Son las mismas que valida el back
// (subida.middleware.js y adjuntos.service.js); aquí se revisan antes de
// enviar para avisarle al usuario de inmediato.

export const TAMANO_MAXIMO_MB = 2;
export const MAXIMO_IMAGENES_POR_PASE = 10;

// Para el selector de archivos: solo deja elegir estos tipos
export const TIPOS_IMAGEN_ACEPTADOS = 'image/jpeg,image/png,image/webp';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Devuelve el problema de la imagen, o '' si está bien
export function revisarImagen(archivo: File): string {
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return archivo.name + ': solo se permiten imágenes JPG, PNG o WEBP.';
  }
  if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
    return archivo.name + ': pesa ' + formatearTamano(archivo.size) + ' (máximo ' + TAMANO_MAXIMO_MB + ' MB).';
  }
  return '';
}

// 1536000 → "1.5 MB"; 70 → "70 B"
export function formatearTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (bytes >= 1024) {
    return Math.round(bytes / 1024) + ' KB';
  }
  return bytes + ' B';
}
