export function validateAccountInput(body: Record<string, unknown>, publicRegistration = false): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Completa los datos del formulario.';
  const identifier = body.dni || body.email;
  if (typeof identifier !== 'string' || !identifier.trim() || identifier.trim().length > 255) return 'Indica un DNI o usuario válido.';
  if (publicRegistration && !/^\d{8}$/.test(identifier.trim())) return 'El DNI debe contener exactamente 8 números.';
  for (const [key, label] of [['nombre', 'nombres'], ['apellido', 'apellidos']]) {
    if (typeof body[key] !== 'string' || !(body[key] as string).trim() || (body[key] as string).trim().length > 255) return `Completa tus ${label} (hasta 255 caracteres).`;
  }
  const password = body.password || (publicRegistration ? '' : identifier);
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) return 'La contraseña debe contener entre 6 y 128 caracteres.';
  if (new TextEncoder().encode(password).length > 72) return 'La contraseña es demasiado larga: admite hasta 72 bytes (las tildes y emojis ocupan más espacio).';
  if (body.telefono != null && (typeof body.telefono !== 'string' || body.telefono.trim().length > 20)) return 'El teléfono admite hasta 20 caracteres. Revisa el número ingresado.';
  if (body.area != null && (typeof body.area !== 'string' || body.area.trim().length > 255)) return 'El área o asignatura admite hasta 255 caracteres.';
  if (body.correo_personal != null && (typeof body.correo_personal !== 'string' || body.correo_personal.trim().length > 255 ||
      (body.correo_personal.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo_personal.trim())))) return 'Indica un correo personal válido.';
  return null;
}
