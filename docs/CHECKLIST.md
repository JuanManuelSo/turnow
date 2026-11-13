# Turnow — checklist de pendientes

**Actualizado:** 13 de noviembre de 2026  
**Propósito:** tener a mano el estado y los próximos pasos del producto. Las casillas marcan trabajo pendiente, no tareas ya realizadas.

## Estado actual

- [x] Proyecto Next.js/TypeScript inicializado y prototipo visual existente.
- [x] Documentos base creados: `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md` y `docs/DATA_MODEL.md`.
- [x] Esquema de 19 tablas y cuatro migraciones (`0000`–`0003`) aplicadas a Supabase de desarrollo.
- [x] Rol runtime `turnow_app` conectado con permisos limitados; `db:ping` verificado en runtime y migración.
- [x] Restricciones de integridad de agenda, snapshots de reservas y bloqueo asesorado por negocio.
- [x] Soporte de varias sedes: `locations`, `professional_locations`, agendas y reservas por sede, y protección contra solapamientos de un profesional entre sedes.
- [x] Pruebas de PostgreSQL: 15/15 pasan; typecheck y build pasan. Lint pasa con 5 advertencias preexistentes del prototipo.
- [x] Prototipo actualizado con selección de sede, agenda filtrada por sede y reservas manuales/reprogramaciones entre sedes; e2e de Playwright pasa.
- [ ] Todavía no hay frontend de producto validado ni recorrido de reservas conectado a datos reales.
- [ ] Todavía no está configurado el flujo de Supabase Auth ni existe alta de dueño/negocio en la aplicación.

## 1. Cerrar decisiones de producto

- [ ] Validar con dueños de barberías/salones el problema, el flujo y las funciones imprescindibles del MVP.
- [ ] Confirmar el alcance inicial: varias sedes, un dueño, profesionales sin cuenta, sin pagos online y sin WhatsApp automático.
- [ ] Definir valores iniciales de anticipación mínima, días máximos para reservar y plazo de cancelación.
- [ ] Validar cómo se asigna un profesional cuando se elige “Cualquier profesional disponible”.
- [ ] Definir qué ve el cliente si se suspende un negocio o una sede y cómo se gestionan sus reservas existentes.
- [ ] Definir si un profesional necesita un margen de traslado al trabajar en sedes distintas; el MVP solo impide solapamientos horarios.
- [ ] Confirmar que servicios, precios, duraciones y políticas se mantienen idénticos en todas las sedes, y cómo se comunica esa regla al dueño.
- [ ] Acordar reglas comerciales del piloto: precio, soporte, conservación y baja de datos.
- [ ] Decidir qué avisos son necesarios para el piloto; mantener mensajería automatizada fuera del alcance hasta decidir canal y costo.

**Criterio de cierre:** `PRODUCT.md` refleja decisiones confirmadas y separa claramente MVP, etapas posteriores y temas aún abiertos.

## 2. Definir diseño y frontend antes de conectar reservas

- [ ] Revisar el prototipo actual y decidir qué partes se conservan, ajustan o reemplazan.
- [ ] Definir arquitectura de navegación y mapa de pantallas para público, cancelación y panel del dueño.
- [ ] Diseñar primero las pantallas clave en móvil y escritorio:
  - [ ] Bienvenida pública del negocio y selección de sede.
  - [ ] Selección de servicio, profesional, fecha y horario en la sede elegida.
  - [ ] Datos, revisión y confirmación de reserva con sede y profesional.
  - [ ] Cancelación con código privado.
  - [ ] Inicio del panel y agenda del dueño con filtro por sede.
  - [ ] Configuración del negocio, sedes, servicios, profesionales y horarios.
- [ ] Definir cómo se muestra una sede en un enlace directo y cómo se permite cambiarla sin perder el recorrido.
- [ ] Resolver navegación del panel en móvil y escritorio; definir lista cronológica móvil para agenda y vista general multisede.
- [ ] Acordar identidad visual de Turnow y sistema base: tipografía, color, espaciado, controles, estados y componentes.
- [ ] Definir cómo se personaliza la marca de cada negocio sin permitir estilos arbitrarios.
- [ ] Diseñar estados vacíos, carga, error, sin disponibilidad, conflicto, guardado y éxito.
- [ ] Revisar accesibilidad: teclado, foco, contraste, etiquetas, lectores de pantalla, zoom y movimiento reducido.
- [ ] Probar el prototipo con al menos dos identidades de negocio y validar las pantallas de referencia.
- [ ] Actualizar `docs/DESIGN.md` con decisiones y flujos acordados.

**Criterio de cierre:** pantallas y estados revisados antes de conectar el flujo de reservas a la base de datos.

## 3. Completar preparación técnica y operación

- [ ] Verificar que el proyecto Supabase utilizado sea el entorno de desarrollo y documentar cómo distinguirlo de producción.
- [ ] Definir proceso de creación y protección del proyecto Supabase de producción; no mezclar sus credenciales con desarrollo.
- [ ] Documentar almacenamiento de secretos por entorno y comprobar que nunca entren al repositorio o logs.
- [ ] Definir estrategia de copias de seguridad y restauración, y quién será responsable de probarla.
- [ ] Definir procedimiento de migraciones: generar, revisar SQL, probar en PostgreSQL local, aplicar a desarrollo y luego a producción.
- [ ] Confirmar límites y configuración del pooler para el despliegue elegido.
- [ ] Definir hosting y dominios para desarrollo, preview y producción (Vercel está propuesto, no debe darse por configurado).
- [ ] Configurar CI para typecheck, lint, pruebas y build antes de integrar cambios.
- [ ] Definir observabilidad mínima: logs sin datos sensibles, alertas y seguimiento de errores.
- [ ] Revisar requisitos de privacidad y retención de datos personales antes del piloto.

**Criterio de cierre:** se puede desplegar y actualizar un entorno sin usar credenciales de desarrollo ni hacer cambios manuales no documentados.

## 4. Configurar Supabase Auth y ciclo de vida del negocio

- [ ] Definir quién crea negocios en el piloto: alta manual administrativa o registro de dueño.
- [ ] Diseñar inicio de sesión, cierre de sesión, recuperación de acceso y expiración de sesión.
- [ ] Decidir si el acceso será por email y contraseña, enlace mágico u otro método disponible.
- [ ] Implementar cliente de Supabase Auth del servidor y manejo seguro de cookies/sesiones.
- [ ] Proteger rutas del panel y verificar membresía del dueño en cada operación privada.
- [ ] Implementar de forma transaccional la creación o vinculación del negocio, su sede principal y su dueño.
- [ ] Definir flujo para dueño que pierde acceso, negocio suspendido y eliminación/cambio de propietario.
- [ ] Probar permisos: un dueño no puede consultar ni modificar datos de otro negocio.

**Criterio de cierre:** un dueño puede entrar al panel de forma segura y solo acceder a su negocio.

## 5. Construir el frontend con datos simulados y validarlo

- [ ] Convertir el diseño aprobado en componentes y pantallas responsive, inicialmente con datos de ejemplo.
- [ ] Completar primero la página pública, el selector de sede y la estructura del panel sin lógica de reserva real.
- [ ] Implementar las interacciones visuales y los estados definidos en diseño.
- [ ] Verificar contenidos largos, falta de logo/foto, datos opcionales vacíos, sedes sin dirección y distintos tamaños de pantalla.
- [ ] Hacer revisión visual y de accesibilidad en navegador.
- [ ] Validar tareas con potenciales clientes y dueños; registrar problemas antes de conectar persistencia.

**Criterio de cierre:** los usuarios pueden recorrer el prototipo y entender las acciones sin explicación externa.

## 6. Implementar configuración del negocio

- [ ] Crear y editar información pública, identidad y enlaces.
- [ ] Crear y editar sedes, dirección, contacto, zona horaria y estado; definir la sede principal.
- [ ] Asignar profesionales a una o más sedes y retirar asignaciones sin romper reservas existentes.
- [ ] Crear y editar servicios, duración, precio y visibilidad (catálogo compartido entre sedes).
- [ ] Crear y editar profesionales y servicios que ofrecen.
- [ ] Configurar horarios de cada sede y horarios independientes por profesional en cada sede, incluidos turnos partidos.
- [ ] Configurar excepciones, ausencias, márgenes, intervalos y reglas de reserva/cancelación.
- [ ] Añadir previsualización y guardado explícito; advertir impactos sobre reservas existentes.
- [ ] Implementar la página pública por slug con datos persistidos y sedes activas.
- [ ] Probar permisos y aislamiento por negocio para cada operación.

**Criterio de cierre:** un dueño puede completar la configuración y publicar una página válida sin editar datos directamente en la base.

## 7. Implementar agenda y reservas reales (después del diseño)

- [ ] Especificar y probar el motor de disponibilidad antes de conectarlo a la interfaz.
- [ ] Calcular intervalos por zona horaria de la sede, horario de sede/profesional, servicio, excepciones, ocupaciones, intervalo y márgenes.
- [ ] Ofrecer disponibilidad por profesional dentro de la sede elegida y unión sin duplicados para “Cualquier profesional”.
- [ ] Confirmar la reserva en una transacción; volver a validar y asignar profesional al confirmar.
- [ ] Mantener idempotencia ante doble clic/reintento y preservar snapshots de precio, duración, sede y condiciones.
- [ ] Crear código privado de cancelación con suficiente entropía, almacenamiento seguro, limitación de intentos y sin filtrarlo en logs.
- [ ] Implementar cancelación con confirmación explícita y respeto del plazo.
- [ ] Implementar agenda del dueño con filtro por sede, reservas manuales, reprogramación —incluso entre sedes—, cancelación, bloqueos y estados atendida/ausente.
- [ ] Probar concurrencia: dos clientes compitiendo por un horario no producen superposición.
- [ ] Probar que cambios de catálogo u horarios no alteran acuerdos ya confirmados.
- [ ] Conectar los flujos a la interfaz solo cuando el diseño de estados y errores esté aprobado.

**Criterio de cierre:** recorrido de reserva y cancelación completo, probado en navegador y con garantías de base de datos.

## 8. Preparar piloto y lanzamiento

- [ ] Seleccionar uno o más negocios piloto y documentar sus reglas reales, incluidas sus sedes.
- [ ] Cargar agenda existente para evitar conflictos con turnos que se tomaron por otros medios.
- [ ] Ensayar reserva, cancelación, reserva manual, reprogramación entre sedes, ausencia y cambio de horario.
- [ ] Acordar soporte ante errores y canal de contacto con el dueño.
- [ ] Confirmar textos de privacidad y consentimiento aplicables a los datos recogidos.
- [ ] Definir métricas del piloto: reservas, uso del panel, conflictos, cancelaciones, ausencias y dificultades.
- [ ] Revisar resultados con los negocios y priorizar la siguiente etapa.

## 9. Más adelante (no bloquear el MVP)

- [ ] Avisos y recordatorios automáticos; elegir proveedor y canal antes de implementarlos.
- [ ] Reprogramación autónoma del cliente y campos configurables del formulario.
- [ ] Cuentas de empleados y permisos individuales.
- [ ] Precios, duraciones o políticas diferentes por sede.
- [ ] Pagos, señas, facturación o cobro automático.
- [ ] Recursos compartidos, canchas, clases grupales y reservas recurrentes.
- [ ] Lista de espera, promociones, dominios propios y editor libre.

## Orden sugerido inmediato

1. [ ] Cerrar las decisiones de producto que afectan pantallas y reglas, incluida la operación multisede.
2. [ ] Revisar el prototipo y definir pantallas/recorridos; actualizar `DESIGN.md`.
3. [ ] Aprobar una primera propuesta visual móvil y escritorio con datos simulados.
4. [ ] Completar el plan de entorno, despliegue, secretos y Auth.
5. [ ] Implementar y validar la interfaz antes de conectar la reserva real.
6. [ ] Implementar configuración del negocio y sus sedes; después, disponibilidad y reservas.

> **Regla de avance:** no empezar el motor ni conectar reservas a producción hasta que los flujos y estados de interfaz hayan sido definidos y revisados. Las pruebas automatizadas de lógica pueden prepararse antes sin reemplazar la validación del diseño.
