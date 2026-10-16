import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/lib/session";
import { getClient } from "@/app/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  let client;
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const { estado } = await request.json();
    if (
      !["aprobada", "rechazada"].includes(estado) ||
      !/^[1-9]\d*$/.test(params.id)
    )
      return NextResponse.json(
        { error: "Selecciona aprobar o rechazar una solicitud válida." },
        { status: 400 },
      );
    client = await getClient();
    await client.query("BEGIN");
    const current = await client.query(
      "SELECT id, estado_registro FROM usuarios WHERE id = $1 AND role = 'profesor' AND oculto = false FOR UPDATE",
      [params.id],
    );
    if (!current.rows.length) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Solicitud de cuenta no encontrada." },
        { status: 404 },
      );
    }
    if (current.rows[0].estado_registro !== "pendiente") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Esta solicitud ya fue procesada. Actualiza la bandeja." },
        { status: 409 },
      );
    }
    await client.query(
      "UPDATE usuarios SET estado_registro = $1, activo = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [estado, estado === "aprobada", params.id],
    );
    await client.query(
      `INSERT INTO notificaciones_whatsapp (usuario_id, numero_telefono, mensaje, tipo, referencia_id, estado)
      VALUES ($1, '-', $2, $3, $1, 'pendiente')`,
      [
        params.id,
        estado === "aprobada"
          ? "Tu solicitud de cuenta fue aprobada. Ya puedes ingresar con tu DNI y la contraseña que elegiste al registrarte."
          : "Administración rechazó tu solicitud de cuenta. Contacta al colegio si necesitas revisar tus datos.",
        estado === "aprobada" ? "cuenta_aprobada" : "cuenta_rechazada",
      ],
    );
    await client.query("COMMIT");
    return NextResponse.json({
      message:
        estado === "aprobada"
          ? "Cuenta aprobada. El docente ya puede iniciar sesión."
          : "Solicitud de cuenta rechazada.",
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Error al revisar solicitud de cuenta:", error);
    return NextResponse.json(
      { error: "No pudimos guardar la respuesta. Intenta nuevamente." },
      { status: 503 },
    );
  } finally {
    client?.release();
  }
}
