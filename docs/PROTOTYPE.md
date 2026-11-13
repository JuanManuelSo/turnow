# Prototipo navegable · Turnow

## Ejecución

`npm install` y `npm run dev`. Abrir http://localhost:3000.

`npm run build` verifica la compilación de producción. `npm run test:prototype` ejecuta los recorridos con Playwright y Microsoft Edge instalado, contra el servidor de desarrollo. Capturas en `.impeccable/review/`.

## Recorridos

- Bienvenida de **Estudio Norte**, peluquería ficticia en Rosario. Acción de reservar y acceso visible a cancelación.
- Reserva de cinco pasos: servicio → sede y profesional (o cualquiera de esa sede) → día y horario → nombre y teléfono → revisión → confirmación con profesional asignado, dirección y código copiable. Sedes: Urquiza 1526, 3 de Febrero 2464 y Presidente Roca 274 (Rosario). Al cambiar de sede se restablecen el profesional y el horario elegidos.
- Cancelación: ingresar código → buscar y revisar → cancelar explícitamente → resultado. Los códigos cancelados informan ese estado.
- Panel del negocio: agenda diaria filtrada por sede y profesional, fecha, detalle, reserva manual, reprogramación —incluso entre sedes— y cancelación con confirmación. En móvil se muestra una lista cronológica, no una grilla reducida.
- Página pública: nombre, paleta, tipografía y descripción con vista previa; publicar o descartar. Se avisa al salir con cambios pendientes.
- Alternar Mineral/Botánica en la bienvenida para comparar la misma estructura. El panel conserva su identidad azul.

## Escenarios de prueba

En **Probar estados** se puede activar falta de disponibilidad, ocupar el horario al confirmar, abrir una agenda vacía o restablecer los datos.

El código `NORTE-7K9P-2M4X` corresponde a una reserva ficticia inicial. Cualquier código inexistente permite ver el error. Tras reservar, el código nuevo permite cancelar esa reserva.

Fecha de referencia congelada: **12 de noviembre de 2026**. Domingos sin atención; descanso de 13 a 14. Los servicios duran 30, 45 o 60 minutos. El selector combina horarios sin duplicarlos: los horarios ocupados permanecen visibles como **Reservado**, con estilo diferenciado y sin posibilidad de elegirlos. En «cualquier profesional» se marca reservado solo cuando nadie puede atender en esa sede durante el intervalo completo. La reserva manual y la reprogramación comparten esa lógica. Los cambios no modifican el turno original hasta guardar. Cada profesional de ejemplo está asignado a una sede: Julia, Tomás y Lucía en Urquiza; Emilia y Mateo en 3 de Febrero; Renata e Iván en Presidente Roca. Estas asignaciones son ficticias y se reemplazarán cuando se conozca el equipo real.

## Qué es simulado

- Todo ocurre en React y `localStorage`, solo en este navegador. Recargar conserva reservas e identidad; no hay backend, cuentas, autenticación, pagos ni servicios externos.
- Las reservas guardadas antes de agregar las sedes se asignan a Urquiza 1526 al cargarse en esta versión. El esquema de producción ya contempla sedes, profesionales por sede y reservas asociadas a ubicación; este prototipo sigue usando solo React y `localStorage`, sin conectarse a ese esquema.
- Confirmación en pantalla y breve espera simulada. No se envían emails, WhatsApp, SMS ni notificaciones reales.
- El conflicto se fuerza desde el laboratorio; no demuestra garantías reales de concurrencia entre clientes.
- El código es un identificador de demostración, no una credencial apta para producción. No hay control de intentos ni separación real entre negocios.
- Publicación, redes y contacto son simulados y están identificados como tales. No se abren servicios externos.
- La política de cancelación de dos horas es texto de ejemplo y **no se aplica**. El reloj congelado facilita pruebas repetibles.
- Se implementan agendas de profesionales, no capacidad de canchas, cabinas ni recursos compartidos.
- La tipografía Manrope se sirve localmente. La segunda opción usa la fuente del dispositivo.

## Decisiones que requieren validación

1. ¿El cliente entiende que «cualquier profesional» asigna una persona recién al confirmar?
2. ¿Encuentra y guarda el código sin asistencia? Validar formato y recuperación con el negocio.
3. ¿La bienvenida comunica suficiente confianza sin fotos? ¿Cancelar se encuentra sin competir con reservar?
4. ¿Cinco pasos o datos y revisión combinados? Medir abandonos y tiempo en móvil.
5. ¿Lista cronológica y filtros alcanzan para la operación móvil? Validar agenda semanal por separado.
6. Confirmar anticipación, horizonte y plazo de cancelación antes de implementar reglas reales.
7. Validar tamaño, contraste y lectura de las dos paletas con negocios de otros rubros.
8. Definir canal transaccional, nombre final de plataforma, preferencias tipográficas y condiciones de privacidad.

## Sistema aplicado

Se conserva `DESIGN.md` como autoridad. Implementación de tokens semánticos en `src/app/globals.css`: fondo, superficies, textos, marca, selección, borde, foco y estados. La paleta pública se limita al contenedor del negocio y a su vista previa. Manrope en pesos 400–800, radios de controles 8 px y superficies 12–16 px. Sin imágenes ni assets raster distribuidos.

Componentes reutilizables: `Button`, `Choice`, `Brand`, `Empty`, `Summary`; recorridos separados en `PublicSite`, `BookingFlow`, `OwnerPanel` e `IdentityEditor`. Reglas y datos en `src/modules/prototype.ts`.

## Verificación realizada

- Compilación de producción y comprobación TypeScript.
- Recorridos automatizados completos en Edge/Playwright, incluyendo recuperación de conflicto conservando datos, cancelación por código inválido/válido, alta manual, reprogramación, cancelación administrativa y publicación.
- Escape cierra el diálogo y devuelve foco al turno que lo abrió.
- Vistas capturadas a 1440 px y 390 px; comprobaciones adicionales de desbordamiento de agenda a 320 y 768 px.
- Editor móvil con alternancia explícita entre edición y vista previa, conservando el borrador.
- Detector mecánico de diseño: sin hallazgos en su pasada.
- Revisión final y limitación de delegación registradas en `PROTOTYPE-REVIEW.md`. Los dos ajustes revisados quedaron resueltos (`ship`).

La revisión contrasta la implementación con la dirección existente de `DESIGN.md`; no la reemplaza. Quedan pendientes las pruebas con usuarios, lectores de pantalla y dispositivos físicos.
