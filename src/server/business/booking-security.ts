import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const keyVersion = 1;

function encryptionKey() {
  const value = process.env.BOOKING_CODE_ENCRYPTION_KEY;
  if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new Error('BOOKING_CODE_ENCRYPTION_KEY debe contener 64 caracteres hexadecimales aleatorios.');
  }
  return Buffer.from(value, 'hex');
}

export function createCancellationCode() {
  return randomBytes(24).toString('base64url').toUpperCase();
}

export function hashCancellationCode(code: string) {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

export function encryptCancellationCode(code: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([iv, tag, encrypted]).toString('base64'), keyVersion };
}

export function decryptCancellationCode(ciphertext: string, version: number) {
  if (version !== keyVersion) throw new Error('La versión de la clave del código no está disponible.');
  const packed = Buffer.from(ciphertext, 'base64');
  if (packed.length < 29) throw new Error('El código de reserva guardado no es válido.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), packed.subarray(0, 12));
  decipher.setAuthTag(packed.subarray(12, 28));
  return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
}

export function hashBookingRequest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function hashRateLimitIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function isWithinCancellationWindow(startsAt: Date, noticeMinutes: number, now = new Date()) {
  return startsAt.getTime() - noticeMinutes * 60_000 > now.getTime();
}
