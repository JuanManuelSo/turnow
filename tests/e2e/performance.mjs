import { chromium } from '@playwright/test';

/**
 * Mide la reserva pública sin crear turnos: carga la página, abre el wizard y
 * cambia de fecha. Sirve para comparar regiones/poolers después de un deploy.
 *
 * Uso:
 *   node tests/e2e/performance.mjs [baseUrl] [runs]
 *
 * El servidor debe estar iniciado. La primera corrida incluye el arranque en
 * frío de las conexiones; las siguientes muestran el estado caliente.
 */

const baseUrl = process.argv[2] ?? process.env.BASE_URL ?? 'http://localhost:3000';
const runs = Number(process.argv[3] ?? process.env.RUNS ?? 2);
const slug = process.env.BUSINESS_SLUG ?? 'peluqueria-de-hombres';
const businessUrl = `${baseUrl.replace(/\/$/, '')}/${slug}`;

for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(businessUrl, { redirect: 'manual' });
    if (response.status < 500) break;
  } catch {
    // El servidor todavía no está listo.
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const results = [];

for (let run = 0; run < runs; run += 1) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const actionTimings = [];
  page.on('requestfinished', async request => {
    if (request.method() !== 'POST' || !request.headers()['next-action']) return;
    const response = await request.response();
    const timing = request.timing();
    if (response) {
      actionTimings.push({
        waitMs: Math.round(timing.responseStart - timing.requestStart),
        totalMs: Math.round(timing.responseEnd - timing.requestStart),
        status: response.status(),
      });
    }
  });

  const pageStart = Date.now();
  await page.goto(businessUrl, { waitUntil: 'networkidle', timeout: 120_000 });
  const pageMs = Date.now() - pageStart;
  await page.waitForTimeout(1000);

  for (let i = 0; i < 6; i += 1) {
    await page.getByRole('button', { name: 'Reservar turno', exact: true }).click();
    await page.waitForTimeout(400);
    if (await page.locator('#reservar').count()) break;
  }

  const booking = page.locator('#reservar');
  await booking.getByRole('heading', { name: /Eleg\u00ed un servicio/ }).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(200);
  await booking.locator('[role="group"][aria-label="Eleg\u00ed un servicio"] button').first().click();
  await page.waitForTimeout(200);
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: /Eleg\u00ed sede y profesional/ }).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(200);
  await booking.locator('[role="group"][aria-label="Eleg\u00ed una sede"] button').first().click();
  await page.waitForTimeout(200);
  const anyProfessional = booking.getByRole('button', { name: 'Cualquier profesional' });
  if (await anyProfessional.count()) await anyProfessional.click();
  else await booking.locator('[role="group"][aria-label="Eleg\u00ed un profesional"] button').first().click();
  await page.waitForTimeout(200);

  const initialStart = Date.now();
  await booking.getByRole('button', { name: 'Continuar' }).click();
  await booking.getByRole('heading', { name: /Eleg\u00ed d\u00eda y horario/ }).waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Consultando horarios\u2026'), null, { timeout: 120_000 });
  const initialMs = Date.now() - initialStart;
  await page.waitForTimeout(300);

  const dayButtons = booking.locator('[aria-label][aria-pressed]').filter({ has: page.locator('strong') });
  const dayCount = await dayButtons.count();
  const days = [];
  for (let i = 0; i < Math.min(dayCount, 5); i += 1) {
    const before = Date.now();
    await dayButtons.nth(i).click();
    await page.waitForFunction(() => !document.body.innerText.includes('Consultando horarios\u2026'), null, { timeout: 120_000 });
    const elapsed = Date.now() - before;
    const slots = await booking.locator('button.tabular-nums').count();
    const empty = await page.getByText('Este d\u00eda no tiene horarios disponibles').count();
    days.push({ day: i, elapsed, slots, empty: empty > 0 });
    await page.waitForTimeout(250);
  }

  results.push({ run, pageMs, initialMs, days, actionTimings });
  await page.close();
}

const warmDays = results.flatMap(result => result.days).filter(day => day.elapsed >= 150).map(day => day.elapsed);
const summary = {
  baseUrl,
  runs: results.map(result => ({
    run: result.run,
    pageMs: result.pageMs,
    initialMs: result.initialMs,
    days: result.days,
  })),
  warmDateChangeMs: warmDays.length
    ? {
        min: Math.min(...warmDays),
        median: warmDays.sort((a, b) => a - b)[Math.floor(warmDays.length / 2)],
        max: Math.max(...warmDays),
      }
    : null,
};

console.log(JSON.stringify(summary, null, 2));
await browser.close();
