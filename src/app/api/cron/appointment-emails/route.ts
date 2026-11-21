import { timingSafeEqual } from 'node:crypto';
import { processEmailNotificationQueue } from '@/server/email/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: 'Cron no configurado.' }, { status: 503 });
  }
  if (!authorized(request)) return Response.json({ error: 'No autorizado.' }, { status: 401 });

  try {
    const result = await processEmailNotificationQueue();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('No se pudo procesar la cola de emails de reservas.', error);
    return Response.json({ error: 'No se pudo procesar la cola.' }, { status: 500 });
  }
}
