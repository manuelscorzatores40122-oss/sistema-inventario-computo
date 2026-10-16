import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/lib/session";
import { query } from "@/app/lib/db";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request, true);
    if (session.response) return session.response;
    const result =
      await query(`SELECT id, nombre, apellido, dni, email, telefono, correo_personal,
      area, estado_registro, fecha_creacion, updated_at FROM usuarios
      WHERE role = 'profesor' AND oculto = false AND estado_registro IS NOT NULL
      ORDER BY CASE WHEN estado_registro = 'pendiente' THEN 0 ELSE 1 END, fecha_creacion DESC`);
    return NextResponse.json(
      { cuentas: result.rows },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Error al consultar solicitudes de cuenta:", error);
    return NextResponse.json(
      {
        error:
          "No pudimos cargar las solicitudes de cuenta. Vuelve a intentarlo.",
      },
      { status: 503 },
    );
  }
}
