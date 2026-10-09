import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!signature || !appSecret) {
      return NextResponse.json({ error: 'Firma o secreto no configurado' }, { status: 401 });
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(bodyText).digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
    }

    const body = JSON.parse(bodyText);

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.value && change.value.messages && change.value.messages[0]) {
            const message = change.value.messages[0];
            const senderPhone = message.from;
            
            if (message.type === 'text' && message.text && message.text.body) {
              const text = message.text.body.trim().toLowerCase();

              if (text === 'hola') {
                await sendWhatsAppMessage(senderPhone, 'Hola profesor, ¿qué equipo necesitas?');
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

async function sendWhatsAppMessage(to: string, messageBody: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';

  if (!token || !phoneNumberId) {
    console.error('Credenciales de WhatsApp no configuradas.');
    return;
  }

  const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to: to,
    text: { body: messageBody },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Error enviando mensaje de WhatsApp:', errorData);
  }
}
