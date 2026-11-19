import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const screenshot = async name => {
  if (process.env.SAVE_REVIEW_SHOTS !== '1') return;
  await mkdir('.impeccable/review', { recursive: true });
  await page.evaluate(async () => { window.scrollTo(0, 0); await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true, animations: 'disabled' });
};
const button = name => page.getByRole('button', { name, exact: true });
async function stepperColors(currentStep) {
  const indicators = await page.locator('.stepper-track button > span').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color, border: style.borderColor };
  }));
  for (let index = 0; index < indicators.length; index++) {
    const expected = index < currentStep ? 'rgb(33, 110, 78)' : index === currentStep ? 'rgb(175, 36, 51)' : 'rgb(255, 255, 255)';
    assert.equal(indicators[index].background, expected, `Step ${index + 1} background at ${currentStep + 1}`);
    if (index <= currentStep) assert.equal(indicators[index].foreground, 'rgb(255, 255, 255)', `Step ${index + 1} contrast at ${currentStep + 1}`);
    if (index < currentStep) assert.equal(indicators[index].border, expected, `Completed step ${index + 1} border`);
  }
}
async function noOverflow() {
  const overflow = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('body *')]
      .filter(element => element.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 8)
      .map(element => ({ tag: element.tagName, className: typeof element.className === 'string' ? element.className : '', right: Math.round(element.getBoundingClientRect().right) })),
  }));
  assert(overflow.document <= overflow.viewport, `Horizontal overflow at ${overflow.viewport}px: ${JSON.stringify(overflow.elements)}`);
}
await page.goto(process.env.PROTOTYPE_URL || 'http://localhost:3000');
const bookingToday = await page.evaluate(() => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
});
await page.getByRole('heading', { name: /No es moda\.\.\. es estilo\./ }).waitFor();
assert(await page.locator('.brand-mark img').first().isVisible(), 'Brand logo is visible in the header');
assert.equal(await page.locator('.header-caption').count(), 0, 'Header has no redundant category caption');
assert.equal(await page.locator('.prototype-bar, .palette-demo').count(), 0, 'Customer home stays free of prototype controls');
assert.equal(await page.locator('.visit-emblem').count(), 0, 'Brand mark is not repeated in the location panel');
await page.getByRole('heading', { name: 'Horarios de ejemplo' }).waitFor();
await page.getByText('341 555 0100').waitFor();
await page.getByText('@estudionorte').waitFor();
for (const address of ['Urquiza 1526', '3 de Febrero 2464', 'Presidente Roca 274']) {
  const link = page.getByRole('link', { name: `Ver ${address} en Google Maps (abre una pestaña nueva)` });
  assert.equal(new URL(await link.getAttribute('href')).searchParams.get('query'), `${address}, Rosario, Santa Fe, Argentina`);
  assert.equal(await link.getAttribute('target'), '_blank');
}
await page.evaluate(() => document.fonts.ready);
await screenshot('desktop');
await noOverflow();
await page.setViewportSize({ width: 1024, height: 768 });
await screenshot('tablet');
await noOverflow();
await page.setViewportSize({ width: 390, height: 844 });
await screenshot('mobile-brand');
await noOverflow();
await page.setViewportSize({ width: 320, height: 900 });
await noOverflow();
await page.setViewportSize({ width: 1440, height: 1000 });
const labUrl = new URL(page.url());
labUrl.searchParams.set('lab', '1');
await page.goto(labUrl.toString());
await page.getByRole('heading', { name: /No es moda\.\.\. es estilo\./ }).waitFor();
await button('Reservar turno').click();
await stepperColors(0);
await button('Continuar').click();
await stepperColors(1);
await page.setViewportSize({ width: 390, height: 844 });
await stepperColors(1);
await page.setViewportSize({ width: 1440, height: 1000 });
await page.getByRole('button', { name: /Urquiza 1526/ }).click();
assert.equal(await page.getByRole('button', { name: /Renata Funes/ }).count(), 0, 'Only staff assigned to selected location are shown');
await screenshot('desktop-sede-profesional');
await button('Continuar').click();
const dateInput = page.getByLabel('Elegir fecha');
assert.equal(await dateInput.getAttribute('min'), bookingToday, 'Calendar starts from today in Rosario');
assert((await dateInput.inputValue()) >= bookingToday, 'Default booking date is not in the past');
assert.equal(await page.locator('.day-strip button').first().getAttribute('aria-label'), await page.evaluate(date => new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date + 'T12:00:00')), bookingToday), 'Quick date strip pivots on today');
assert.equal(await button('09:00').count(), 1, 'Combined availability contains each slot once');
await page.getByRole('button', { name: /Sede y profesional/ }).first().click();
await page.getByRole('button', { name: /Julia Moreno/ }).click();
await button('Continuar').click();
assert(await button('09:00 Reservado').isDisabled(), 'Booked time stays visible at Urquiza');
await page.getByRole('button', { name: /Sede y profesional/ }).first().click();
await page.getByRole('button', { name: /Presidente Roca 274/ }).click();
assert.equal(await page.getByRole('button', { name: /Julia Moreno/ }).count(), 0, 'Changing location clears ineligible staff');
assert.equal(await page.getByRole('button', { name: /Renata Funes/ }).count(), 1);
await button('Continuar').click();
assert(await button('09:00').isEnabled(), 'New location has its own staff and availability');
await page.getByRole('button', { name: /Sede y profesional/ }).first().click();
await page.getByRole('button', { name: /Urquiza 1526/ }).click();
await button('Continuar').click();
await button('10:30').click();
await page.getByRole('button', { name: /Sede y profesional/ }).first().click();
await page.getByRole('button', { name: /Presidente Roca 274/ }).click();
assert.equal(await page.locator('.booking-summary dt').filter({ hasText: 'Día y horario' }).count(), 0, 'Date and time stay out of the summary until that step');
await page.getByRole('button', { name: /Urquiza 1526/ }).click();
await button('Continuar').click();
assert(await page.locator('.booking-summary').getByText('Todavía sin elegir').isVisible(), 'Changing location clears selected time');
await button('10:30').click();
await screenshot('desktop-horario');
await button('Continuar').click();
await page.getByLabel('Nombre y apellido').fill('Sofía Prueba');
await page.getByLabel('Teléfono con código de área').fill('3415550123');
await button('Continuar').click();
 await page.getByRole('heading', { name: 'Revisá tu turno.' }).waitFor();
 assert.equal(await page.locator('.review-content .summary-edit').count(), 0, 'Review has no edit buttons');
 assert(await page.locator('.review-customer').getByText('Sofía Prueba').isVisible(), 'Review shows customer data');
 for (const width of [1440, 390]) {
   await page.setViewportSize({ width, height: 1000 });
   const contactLayout = await page.evaluate(() => {
     const box = selector => document.querySelector(selector).getBoundingClientRect();
     return {
       heading: box('#review-customer-heading').top,
       name: box('.review-customer-list div:first-child dt').top,
       phone: box('.review-customer-list div:last-child dt').top,
       detailLabel: box('.review-details .summary-row dt').left,
        detailValue: box('.review-details .summary-row dd').right,
        totalValue: box('.review-details .summary-total dd').right,
        nameLabel: box('.review-customer-list div:first-child dt').left,
        nameValue: box('.review-customer-list div:first-child dd').right,
        phoneLabel: box('.review-customer-list div:last-child dt').left,
        phoneValue: box('.review-customer-list div:last-child dd').right,
     };
   });
   assert(contactLayout.heading < contactLayout.name && contactLayout.name < contactLayout.phone, `Contact heading and rows are stacked at ${width}px`);
    for (const [contact, detail] of [['nameLabel', 'detailLabel'], ['phoneLabel', 'detailLabel'], ['nameValue', 'detailValue'], ['phoneValue', 'detailValue']]) {
      assert(Math.abs(contactLayout[contact] - contactLayout[detail]) < 2, `Contact ${contact} aligns with booking details at ${width}px`);
    }
    assert(Math.abs(contactLayout.totalValue - contactLayout.detailValue) < 2, `Total aligns with booking details at ${width}px`);
    const detailsAligned = await page.locator('.review-details .summary-row dd').evaluateAll(values => {
      const right = values[0].closest('.summary-list').getBoundingClientRect().right;
      return values.every(value => Math.abs(value.getBoundingClientRect().right - right) < 2);
    });
    assert(detailsAligned, `Every booking detail aligns to the right edge at ${width}px`);
    if (width === 1440) {
      const sidebarAligned = await page.locator('.booking-summary .summary-row dd').evaluateAll(values => {
        const right = values[0].closest('.summary-list').getBoundingClientRect().right;
        return values.every(value => Math.abs(value.getBoundingClientRect().right - right) < 2);
      });
      assert(sidebarAligned, 'Tu visita values align to the right edge');
    }
 }
 await page.setViewportSize({ width: 1440, height: 1000 });
await button('Probar estados').click();
await page.getByLabel('Ocupar horario al confirmar').check();
await button('Confirmar turno').click();
await page.getByRole('alert').filter({ hasText: 'acaba de ocuparse' }).waitFor();
assert(await button('10:30 Reservado').isDisabled(), 'Conflict stays visible as reserved');
await screenshot('conflicto');
await button('11:30').click();
await button('Continuar').click();
assert.equal(await page.getByLabel('Nombre y apellido').inputValue(), 'Sofía Prueba');
await button('Continuar').click();
await button('Confirmar turno').click();
await page.getByRole('heading', { name: 'Tu turno está confirmado.' }).waitFor();
assert(await page.getByRole('link', { name: 'Ver Urquiza 1526 en Google Maps (abre una pestaña nueva)' }).isVisible(), 'Confirmation offers the selected location in Maps');
const code = await page.locator('.private-code code').innerText();
await button('Probar estados').click();
await screenshot('confirmacion');
await button('Volver al estudio').click();
await button('Cancelar turno').first().click();
await page.getByLabel('Código privado').fill('INVALIDO');
await button('Buscar turno').click();
await page.getByRole('alert').filter({ hasText: 'No encontramos ese código' }).waitFor();
await page.getByLabel('Código privado').fill(code);
await button('Buscar turno').click();
await screenshot('cancelacion');
await button('Cancelar este turno').click();
const cancellationDialog = page.getByRole('alertdialog', { name: '¿Cancelar este turno?' });
await cancellationDialog.waitFor();
assert(await cancellationDialog.getByText(/11:30/).isVisible(), 'Cancellation dialog shows the appointment time');
await cancellationDialog.getByRole('button', { name: 'Sí, cancelar turno' }).click();
await page.getByRole('heading', { name: 'Tu turno fue cancelado.' }).waitFor();
await button('Panel del negocio').click();
await screenshot('desktop-agenda');
await noOverflow();
await page.locator('.schedule-desktop .appointment').first().click();
await screenshot('detalle');
await page.keyboard.press('Escape');
assert(await page.locator('.schedule-desktop .appointment').first().evaluate(el => el === document.activeElement), 'Dialog returns focus');
await page.keyboard.press('Enter');
await button('Reprogramar turno').click();
await page.getByRole('combobox', { name: /^Horario/ }).selectOption('12:00');
await button('Guardar nuevo horario').click();
assert.equal(await page.locator('dialog[open]').count(), 0);
await button('Nuevo turno').click();
await page.getByLabel('Nombre y apellido').fill('Cliente Manual');
await page.getByLabel('Teléfono', { exact: true }).fill('3415559999');
await page.getByRole('combobox', { name: /^Horario/ }).selectOption('09:00');
await button('Crear turno').click();
await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Manual' }).click();
await button('Cancelar turno').click();
await button('Confirmar cancelación').click();
assert.equal(await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Manual' }).count(), 0);
await page.getByLabel('Sede de agenda').selectOption('roca');
await button('Nuevo turno').click();
await page.getByLabel('Nombre y apellido').fill('Cliente Roca');
await page.getByLabel('Teléfono', { exact: true }).fill('3415559999');
await page.getByRole('combobox', { name: /^Horario/ }).selectOption('09:00');
await button('Crear turno').click();
assert.equal(await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).count(), 1);
await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).click();
await button('Reprogramar turno').click();
await page.getByLabel('Sede del turno').selectOption('febrero');
assert.equal(await page.locator('dialog[open]').getByRole('combobox', { name: 'Profesional' }).inputValue(), 'emilia');
await page.getByRole('combobox', { name: /^Horario/ }).selectOption('09:00');
await button('Guardar nuevo horario').click();
await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).waitFor();
assert.equal(await page.getByLabel('Sede de agenda').inputValue(), 'febrero');
assert.equal(await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).count(), 1);
await page.getByLabel('Sede de agenda').selectOption('roca');
assert.equal(await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).count(), 0);
await page.getByLabel('Sede de agenda').selectOption('urquiza');
assert.equal(await page.locator('.schedule-desktop .appointment').filter({ hasText: 'Cliente Roca' }).count(), 0);
assert.equal(await button('Página pública').count(), 0, 'Page editor is hidden from the owner panel');
await button('Ver página pública').click();
await page.getByRole('link', { name: 'Peluquería de Hombres, ir al inicio' }).waitFor();
await page.setViewportSize({ width: 390, height: 844 });
await screenshot('mobile');
await noOverflow();
await button('Reservar turno').click();
await button('Continuar').click();
await page.getByRole('button', { name: /Urquiza 1526/ }).click();
await screenshot('mobile-sede-profesional');
await button('Continuar').click();
await button('14:00').click();
await screenshot('mobile-horario');
await noOverflow();
await button('Probar estados').click();
await page.getByLabel('Sin disponibilidad', { exact: true }).check();
await page.getByRole('heading', { name: 'Este día no tiene horarios disponibles' }).waitFor();
await screenshot('sin-disponibilidad');
await button('Ver próxima fecha disponible').click();
await button('Probar estados').click();
await button('Panel del negocio').click();
await screenshot('mobile-agenda');
await noOverflow();
assert(await page.locator('.schedule-mobile').isVisible());
assert(!(await page.locator('.schedule-desktop').isVisible()));
assert.equal(await button('Página pública').count(), 0, 'Page editor stays hidden on mobile');
const emptyAgendaDate = await page.evaluate(date => {
  const next = new Date(date + 'T12:00:00Z');
  next.setUTCDate(next.getUTCDate() + 7);
  return next.toISOString().slice(0, 10);
}, bookingToday);
await page.getByLabel('Fecha de agenda').fill(emptyAgendaDate);
await page.getByRole('heading', { name: 'Un día con espacio para nuevos turnos' }).waitFor();
await screenshot('agenda-vacia');
for (const width of [320, 768]) { await page.setViewportSize({ width, height: 900 }); await noOverflow(); }
assert.deepEqual(errors, []);
console.log('PASS: reservation, conflict recovery, cancellation, manual booking, reschedule, public page, empty states, responsive layouts.');
await browser.close();
