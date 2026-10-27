const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): void {
  if (!imageTypes.includes(file.type)) throw new Error('Formato no soportado. Usa JPG, PNG o WEBP.');
  if (!file.size) throw new Error('El archivo de imagen esta vacio.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La foto supera 20 MB. Selecciona una imagen mas pequena.');
}

export async function optimizeImage(file: File): Promise<string> {
  validateImageFile(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la foto. Seleccionala nuevamente.'));
    reader.onabort = () => reject(new Error('La lectura de la foto fue interrumpida.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La foto no se puede abrir. Prueba otra imagen JPG, PNG o WEBP.'));
      img.onload = () => {
        try {
          if (!img.width || !img.height) throw new Error('La imagen no tiene dimensiones validas.');
          const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('No se pudo procesar la foto.');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const result = canvas.toDataURL('image/webp', 0.75);
          if (!result.startsWith('data:image/') || result.length > 2 * 1024 * 1024) throw new Error('La imagen sigue siendo demasiado grande. Prueba una foto mas pequena.');
          resolve(result);
        } catch (error) { reject(error); }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
