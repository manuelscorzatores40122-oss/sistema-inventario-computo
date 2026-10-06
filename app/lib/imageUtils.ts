export async function optimizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validar tipo
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return reject(new Error('Formato no soportado. Usa JPG, PNG o WEBP.'));
    }
    // Validar peso max 5MB (5 * 1024 * 1024 = 5242880)
    if (file.size > 5242880) {
      return reject(new Error('La imagen excede el límite de 5MB.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Reducir si es mayor a 1000px
        if (width > 1000 || height > 1000) {
          if (width > height) {
            height = Math.round((height * 1000) / width);
            width = 1000;
          } else {
            width = Math.round((width * 1000) / height);
            height = 1000;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'));
        
        ctx.drawImage(img, 0, 0, width, height);
        // Exportar a webp con 75% de calidad
        resolve(canvas.toDataURL('image/webp', 0.75));
      };
      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
