# Turnow — checklist de pendientes

**Actualizado:** 18 de noviembre de 2026
**Propósito:** tener a mano el estado y los próximos pasos del producto. Las casillas marcan trabajo pendiente, no tareas ya realizadas.

## Estado actual

- [x] Proyecto Next.js/TypeScript inicializado y prototipo visual existente.
- [x] Documentos base creados: `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md` y `docs/DATA_MODEL.md`.
- [x] Esquema y migraciones (`0000`–`0009`) aplicadas a Supabase de desarrollo.
- [x] Rol runtime `turnow_app` conectado con permisos limitados; `db:ping` verificado en runtime y migración.
- [x] Restricciones de integridad de agenda, snapshots de reservas y bloqueo asesorado por negocio.
- [x] Soporte de varias sedes: `locations`, `professional_locations`, agendas y reservas por sede, y protección contra solapamientos de un profesional entre sedes.
- [x] Modelo de membresías preparado para una cuenta de dueño por negocio y una cuenta operativa compartida por sede, con límites de rol y sede en base de datos.
- [x] Login por email/contraseña integrado con Supabase SSR, renovación de sesión, logout, recuperación de contraseña y dashboard protegido por membresía.
- [x] Alta inicial local transaccional preparada para crear un negocio, sus sedes y la membresía del dueño con `npm run setup:business`.
- [x] Pruebas de PostgreSQL: 16/16 pasan; typecheck y build pasan. Lint pasa con 5 advertencias preexistentes del prototipo.
- [x] Prototipo actualizado con selección de sede, agenda filtrada por sede y reservas manuales/reprogramaciones entre sedes; e2e de Playwright pasa.
- [x] Alta inicial completada en desarrollo: negocio `peluqueria-de-hombres`, tres sedes (`urquiza`, `febrero`, `roca`) y membresía de dueño verificada.
- [x] El dueño ingresa con Supabase Auth y llega a `/dashboard` con alcance de negocio.
- [x] Panel del dueño persistido y validado: sedes, servicios, profesionales, horarios y reglas, con recorrido E2E y revisión visual.
- [x] Editor de textos, contacto, redes e identidad de la página pública implementado; queda oculto para el MVP con `NEXT_PUBLIC_PAGE_EDITOR_ENABLED=false` y se retoma después del piloto.
- [x] Agenda operativa conectada a datos reales; la página pública permite reservar y cancelar con código privado.
- [ ] Falta configurar SMTP propio y probar recuperación de contraseña. Las tres cuentas operativas de desarrollo ya están creadas y vinculadas por sede.

## 1. Cerrar decisiones de producto

- [ ] Validar con dueños de barberías/salones el problema, el flujo y las funciones imprescindibles del MVP.
- [ ] Confirmar el alcance inicial: varias sedes, un dueño, una credencial operativa compartida por sede, profesionales sin cuenta individual, sin pagos online y sin WhatsApp automático.
- [ ] Definir valores iniciales de anticipación mínima, días máximos para reservar y plazo de cancelación.
- [ ] Validar cómo se asigna un profesional cuando se elige “Cualquier profesional disponible”.
- [ ] Definir qué ve el cliente si se suspende un negocio o una sede y cómo se gestionan sus reservas existentes.
- [ ] Definir si un profesional necesita un margen de traslado al trabajar en sedes distintas; el MVP solo impide solapamientos horarios.
- [ ] Confirmar que servicios, precios, duraciones y políticas se mantienen idénticos en todas las sedes, y cómo se comunica esa regla al dueño.
- [ ] Acordar reglas comerciales del piloto: precio, soporte, conservación y baja de datos.
- [ ] Decidir qué avisos son necesarios para el piloto; mantener mensajería automatizada fuera del alcance hasta decidir canal y costo.

**Criterio de cierre:** `PRODUCT.md` refleja decisiones confirmadas y separa claramente MVP, etapas posteriores y temas aún abiertos.

## 2. Definir diseño y frontend antes de conectar reservas

- [x] Revisar el prototipo actual y decidir qué partes se conservan, ajustan o reemplazan.
- [x] Definir arquitectura de navegación y mapa de pantallas para público, cancelación y panel del dueño.
- [x] Diseñar primero las pantallas clave en móvil y escritorio:
  - [x] Bienvenida pública del negocio y selección de sede.
  - [x] Selección de servicio, profesional, fecha y horario en la sede elegida.
  - [x] Datos, revisión y confirmación de reserva con sede y profesional.
  - [x] Cancelación con código privado.
  - [x] Inicio del panel y agenda del dueño con filtro por sede.
  - [x] Configuración del negocio, sedes, servicios, profesionales y horarios.
- [ ] Definir cómo se muestra una sede en un enlace directo y cómo se permite cambiarla sin perder el recorrido.
- [x] Resolver navegación del panel en móvil y escritorio; definir lista cronológica móvil para agenda y vista general multisede.
- [ ] Acordar identidad visual de Turnow y sistema base: tipografía, color, espaciado, controles, estados y componentes.
- [POSTERGADO] Definir cómo se personaliza la marca de cada negocio sin permitir estilos arbitrarios.
- [] Diseñar estados vacíos, carga, error, sin disponibilidad, conflicto, guardado y éxito.
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
- [x] Diseñar inicio de sesión, cierre de sesión y recuperación de acceso; queda probar la expiración de sesión en Supabase.
- [x] Elegir email y contraseña como método inicial.
- [x] Implementar cliente de Supabase Auth del servidor, cookies SSR y renovación de sesión.
- [x] Proteger `/dashboard` y resolver la membresía del usuario en el servidor.
- [x] Verificar Site URL, Redirect URL y proveedor Email en Supabase; el login del dueño funciona en desarrollo.
- [ ] Configurar SMTP propio y probar el correo de recuperación antes del piloto.
- [x] Implementar de forma transaccional la creación del negocio, todas sus sedes y su dueño.
- [x] Crear y vincular una cuenta operativa compartida por sede en desarrollo; queda implementar la interfaz de invitación y revocación, y probar permisos en la agenda real.
- [ ] Definir flujo para dueño que pierde acceso, negocio suspendido y eliminación/cambio de propietario.
- [ ] Probar permisos: un dueño no puede consultar ni modificar datos de otro negocio.

**Criterio de cierre:** un dueño y un operador pueden autenticarse con sus cuentas vinculadas; el dueño accede a su negocio y cada operador solo a su sede.

## 5. Construir el frontend con datos simulados y validarlo

- [x] Convertir el diseño aprobado en componentes y pantallas responsive, inicialmente con datos de ejemplo.
- [x] Completar primero la página pública, el selector de sede y la estructura del panel sin lógica de reserva real.
- [x] Implementar las interacciones visuales y los estados definidos en diseño.
- [ ] Verificar contenidos largos, falta de logo/foto, datos opcionales vacíos, sedes sin dirección y distintos tamaños de pantalla.
- [x] Hacer revisión visual y de accesibilidad en navegador.
- [ ] Validar tareas con potenciales clientes y dueños; registrar problemas antes de conectar persistencia.

**Criterio de cierre:** los usuarios pueden recorrer el prototipo y entender las acciones sin explicación externa.

## 6. Implementar configuración del negocio

- [x] Crear y editar textos públicos, contacto, enlaces e identidad; el editor queda oculto para el MVP y la publicación queda para la siguiente etapa.
- [x] Crear y editar sedes, dirección, contacto y estado; definir la sede principal. La zona horaria del negocio es visible y no editable desde runtime.
- [x] Asignar profesionales a una o más sedes y retirar asignaciones sin borrar registros existentes.
- [x] Crear y editar servicios, duración, precio y visibilidad (catálogo compartido entre sedes).
- [x] Crear y editar profesionales y servicios que ofrecen.
- [x] Configurar horarios de cada sede y horarios independientes por profesional en cada sede, incluidos turnos partidos.
- [x] Configurar excepciones de sede y bloqueos de profesionales con confirmación si afectan turnos; las reglas de reserva/cancelación se editan desde Configuración.
- [x] Añadir guardado explícito, estados de éxito y previsualización de textos públicos; el editor queda oculto para el MVP y los impactos sobre reservas se completarán con la agenda.
- [x] Implementar la página pública por slug con datos persistidos, sedes/servicios/profesionales activos y habilitación explícita del dueño.
- [ ] Probar permisos y aislamiento por negocio y sede para cada operación, incluyendo parámetros manipulados por el cliente.

**Criterio de cierre:** un dueño puede completar la configuración y publicar una página válida sin editar datos directamente en la base.

## 7. Implementar agenda y reservas reales (después del diseño)

- [x] Especificar y probar el núcleo puro del motor de disponibilidad antes de conectarlo a la interfaz.
- [x] Calcular slots por zona horaria, horarios de sede/profesional, excepciones cerradas/personalizadas, servicio, ocupaciones, intervalo, margen, anticipación y horizonte.
- [x] Ofrecer slots de profesionales elegibles; en la reserva manual del panel, “Cualquier profesional” muestra horas sin duplicar y la confirmación elige el profesional con menor carga del día.
- [x] Confirmar turnos manuales en una transacción: volver a validar reglas/disponibilidad bajo bloqueo y crear la ocupación de calendario.
- [x] Preservar snapshots de precio, duración, sede y condiciones en turnos manuales y públicos; el E2E verifica que editar catálogo/reglas no los altera.
- [x] Hacer idempotente la reserva pública mediante clave y hash de solicitud; el E2E repite exactamente la acción y comprueba que no duplica el turno.
- [x] Crear código privado aleatorio de alta entropía, hash de búsqueda, cifrado AES-256-GCM para recuperación idempotente y límite persistente de intentos.
- [x] Implementar consulta/cancelación con confirmación explícita, plazo contractual, estado repetido y liberación de la ocupación.
- [x] Completar agenda del dueño con reprogramación entre sedes y bloqueos manuales; el E2E valida snapshots, ocupación, eventos y marca “Fuera de horario”.
- [ ] Completar prueba de dos clientes simultáneos con claves de idempotencia distintas; ya se verificaron el reintento idempotente y el rechazo de un slot enviado después de ocuparse.
- [x] Probar que cambios de catálogo y reglas no alteran snapshots confirmados.
- [x] Conectar reserva, confirmación y cancelación a la interfaz; E2E cubre escritorio/móvil, estados principales y reserva con “Cualquier profesional”.

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
- [ ] Reactivar la edición de la página pública con `NEXT_PUBLIC_PAGE_EDITOR_ENABLED=true` y validar textos, contacto, redes e identidad.

## Orden sugerido inmediato

1. [x] Crear y confirmar las cuentas Auth operativas por sede y vincular sus membresías.
2. [x] Confirmar el E2E de configuración y agenda contra Supabase, incluidas excepciones, bloqueos y reprogramación multisede.
3. [x] Implementar reserva pública idempotente y cancelación con código privado sobre el motor compartido; E2E completo contra Supabase.
4. [x] Añadir publicación por slug con habilitación explícita del dueño; el negocio real sigue deshabilitado hasta su aprobación.
5. [ ] Completar SMTP, recuperación de contraseña, despliegue y operación del piloto.

> **Regla de avance:** no empezar el motor ni conectar reservas a producción hasta que los flujos y estados de interfaz hayan sido definidos y revisados. Las pruebas automatizadas de lógica pueden prepararse antes sin reemplazar la validación del diseño.
