# Prototipo navegable · Turnow

## Ejecución

`npm install` y `npm run dev`. Abrir http://localhost:3000.

`npm run build` verifica la compilación de producción. `npm run test:prototype` ejecuta los recorridos con Playwright y Microsoft Edge instalado, contra el servidor de desarrollo. Capturas en `.impeccable/review/`.

## Recorridos

- Bienvenida de **Peluquería de Hombres**, con el lema «No es moda... es estilo» y una recreación vectorial provisional del logo compartido (silueta con traje, corbata y barba sobre rojo, azul y blanco). Header solo con nombre, logo y cancelación. Las tres sedes se muestran como enlaces a Google Maps que abren otra pestaña; no se incrusta un mapa. La ubicación también muestra horarios, teléfono e Instagram como información estática de ejemplo; no son controles ni enlaces activos.
- Reserva de cinco pasos: servicio → sede y profesional (o cualquiera de esa sede) → día y horario → nombre y teléfono → revisión → confirmación con profesional asignado, dirección y código copiable. Sedes: Urquiza 1526, 3 de Febrero 2464 y Presidente Roca 274 (Rosario). Al cambiar de sede se restablecen el profesional y el horario elegidos.
- Cancelación: ingresar código → buscar y revisar → cancelar explícitamente → resultado. Los códigos cancelados informan ese estado.
- Panel del negocio: agenda diaria filtrada por sede y profesional, fecha, detalle, reserva manual, reprogramación —incluso entre sedes— y cancelación con confirmación. En móvil se muestra una lista cronológica, no una grilla reducida.
- Página pública: el editor de identidad (nombre, paleta, tipografía y descripción) queda oculto para el MVP; el código se conserva detrás de `NEXT_PUBLIC_PAGE_EDITOR_ENABLED`. La página pública y el botón para abrirla siguen disponibles.
- La identidad visual queda fija mientras el editor está oculto; no se muestran controles de paleta en la bienvenida. El laboratorio de estados queda fuera de la experiencia cliente y se activa solo con `?lab=1`.

## Escenarios de prueba

Con `?lab=1`, **Probar estados** permite activar falta de disponibilidad, ocupar el horario al confirmar, abrir una agenda vacía o restablecer los datos. Sin ese parámetro, la bienvenida no muestra controles de demostración.

El código `HOMBRES-7K9P-2M4X` corresponde a una reserva ficticia inicial. Cualquier código inexistente permite ver el error. Tras reservar, el código nuevo permite cancelar esa reserva.

Fecha de referencia congelada: **12 de noviembre de 2026**. Domingos sin atención; descanso de 13 a 14. Los servicios duran 30, 45 o 60 minutos. El selector combina horarios sin duplicarlos: los horarios ocupados permanecen visibles como **Reservado**, con estilo diferenciado y sin posibilidad de elegirlos. En «cualquier profesional» se marca reservado solo cuando nadie puede atender en esa sede durante el intervalo completo. La reserva manual y la reprogramación comparten esa lógica. Los cambios no modifican el turno original hasta guardar. Cada profesional de ejemplo está asignado a una sede: Julia, Tomás y Lucía en Urquiza; Emilia y Mateo en 3 de Febrero; Renata e Iván en Presidente Roca. Estas asignaciones son ficticias y se reemplazarán cuando se conozca el equipo real.

## Qué es simulado

- Todo ocurre en React y `localStorage`, solo en este navegador. Recargar conserva reservas e identidad; no hay backend, cuentas, autenticación, pagos ni servicios externos.
- Las reservas guardadas antes de agregar las sedes se asignan a Urquiza 1526 al cargarse en esta versión. El esquema de producción ya contempla sedes, profesionales por sede y reservas asociadas a ubicación; este prototipo sigue usando solo React y `localStorage`, sin conectarse a ese esquema.
- Confirmación en pantalla y breve espera simulada. No se envían emails, WhatsApp, SMS ni notificaciones reales.
- El conflicto se fuerza desde el laboratorio; no demuestra garantías reales de concurrencia entre clientes.
- El código es un identificador de demostración, no una credencial apta para producción. No hay control de intentos ni separación real entre negocios.
- Publicación es simulada. Los horarios, teléfono e Instagram visibles son datos ilustrativos y deben reemplazarse antes de publicar; se presentan como texto estático, sin llamadas ni enlaces a cuentas. Los enlaces de sedes y la dirección de la confirmación sí abren Google Maps en otra pestaña; no se carga ningún mapa dentro de la página.
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

Se conserva `DESIGN.md` como autoridad. Tokens semánticos y estilos operativos en `src/app/globals.css`; composición y responsive de la portada en `src/features/storefront/storefront.css`. Manrope en pesos 400–800, con la identidad rojo, azul tinta y blanco. Sin imágenes raster distribuidas.

Componentes reutilizables en `src/components/ui`: `Button`, `LinkButton`, `IconButton`, `Input`, `Select`, `Textarea`, `FormField`, `Choice`, `Brand` y `Empty`. La portada se compone desde `src/features/storefront`; identidad, sedes y catálogo inicial están en `src/config/business.ts`, mientras los datos ficticios de agenda y las reglas del prototipo quedan en `src/modules/prototype.ts`. Los iconos funcionales usan `lucide-react`; el logo de marca es SVG propio.

## Verificación realizada

- Compilación de producción y comprobación TypeScript.
- Recorridos automatizados completos en Edge/Playwright, incluyendo recuperación de conflicto conservando datos, cancelación por código inválido/válido, alta manual, reprogramación y cancelación administrativa.
- Escape cierra el diálogo y devuelve foco al turno que lo abrió.
- Vistas capturadas a 1440 px y 390 px; comprobaciones adicionales de desbordamiento de agenda a 320 y 768 px.
- La página pública sigue disponible sin el editor de identidad; el acceso al editor queda oculto para el MVP.
- Detector mecánico de diseño: sin hallazgos en su pasada.
- Revisión final y limitación de delegación registradas en `PROTOTYPE-REVIEW.md`. Los dos ajustes revisados quedaron resueltos (`ship`).

La revisión contrasta la implementación con la dirección existente de `DESIGN.md`; no la reemplaza. Quedan pendientes las pruebas con usuarios, lectores de pantalla y dispositivos físicos.
