# Panel privado

`/dashboard` es la agenda diaria autenticada. Resuelve la membresía exclusivamente en el servidor; el dueño consulta sus sedes y el operador queda limitado a la sede asignada en la membresía. La agenda consulta reservas persistidas y las acciones privadas vuelven a autorizar el negocio y la sede en el servidor.

## Alcance terminado

- Agenda diaria como portada, con navegación de fecha, filtro de sede para el dueño y filtro de profesional.
- Alta manual basada en horarios disponibles por sede, servicio, profesional y fecha. "Cualquier profesional" elimina horas duplicadas y al confirmar asigna al profesional disponible con menor carga diaria.
- El cálculo cruza horarios de sede y profesional, turnos partidos, excepciones cerradas/personalizadas, duración, margen, intervalo, anticipación, horizonte y ocupaciones del profesional entre sedes.
- El servidor vuelve a calcular el slot dentro de la transacción y bajo el bloqueo de agenda antes de guardar; horarios elegidos no quedan reservados mientras se completa el formulario.
- La página pública por `/{slug}` usa datos activos del negocio; el dueño puede habilitar/deshabilitar reservas y copiar el enlace. El estado inicial permanece deshabilitado.
- La reserva pública guarda clave de idempotencia, snapshots, ocupación, evento y código de cancelación en la misma transacción. El código tiene alta entropía, se cifra para recuperar una confirmación reintentada y se busca mediante hash.
- La consulta/cancelación requiere el código privado, pide confirmación explícita y aplica el plazo guardado en el turno; la cancelación libera la ocupación sin borrar el historial.
- Intentos públicos de consulta, reserva y cancelación se limitan por negocio e identificador de cliente con contadores persistentes; el identificador se guarda hasheado.
- Los snapshots de servicio, duración, precio y condiciones quedan en el turno; las ocupaciones se crean en la misma transacción y bloquean solapamientos.
- Detalle de atención, reprogramación, cancelación y registro de asistencia/ausencia.
- Reprogramación del dueño entre sedes, profesionales, fechas y horarios disponibles. El operador queda limitado a su sede. La operación conserva duración y margen contractual, actualiza snapshots de sede/zona horaria, mueve la ocupación y registra el cambio en el historial.
- Cobros manuales por turno en efectivo, transferencia, tarjeta u otro medio. Las correcciones revierten el asiento anterior y agregan otro, sin borrar el historial.
- La configuración sigue disponible desde el menú; si falta una asignación o un servicio se muestra el acceso correspondiente, sin ocultar la agenda.
- Sedes: alta, edición, estado y sede principal.
- Catálogo compartido: servicios, duración, precio y visibilidad.
- Profesionales, asignaciones a sedes y servicios.
- Horarios de sede y por profesional, incluidos turnos partidos.
- En la pestaña **Excepciones y bloqueos**, el dueño puede cerrar una fecha o definir un horario especial para una sede, y crear/eliminar bloqueos de un profesional. Si hay turnos afectados, se muestra el conteo y hace falta una segunda confirmación; los turnos no se cancelan ni notifican automáticamente.
- La agenda marca **Fuera de horario** los turnos confirmados afectados por un cierre, un horario especial o un bloqueo profesional. La disponibilidad pública y manual excluye cierres y bloqueos.
- Reglas de reserva y cancelación.
- Textos, contacto y enlaces de la página pública: implementados, pero el editor queda oculto para el MVP con `NEXT_PUBLIC_PAGE_EDITOR_ENABLED=false`. La página pública sigue disponible con la presentación guardada o predeterminada; la habilitación de reservas online se controla desde Configuración.

Los cambios se guardan de forma explícita. Los redirects de guardado llevan una versión única para evitar vistas obsoletas al volver a la misma URL. Los registros que pueden estar referenciados por reservas futuras se desactivan en lugar de eliminarse.

## Diseño y comportamiento responsive

El panel usa rail azul oscuro, fondo mineral, Manrope, líneas capilares y numeración editorial. En móvil la navegación se vuelve una grilla compacta; en Horarios se muestra primero la lista de ámbitos al entrar y el editor al elegir uno. Las tabs de sede informan si tienen horario, y los controles de horario conservan objetivos táctiles de 44 px.

## Validación

La vista del calendario es una implementación propia ajustada al panel; no agrega una dependencia de calendario genérica ni sincroniza Google Calendar. Las horas se muestran en la zona horaria configurada de la sede.

Las pruebas unitarias del motor están en `src/server/business/availability-engine.test.ts`. Las pruebas de integración PostgreSQL requieren Docker. El E2E `node tests/e2e/panel.mjs` necesita su negocio de prueba y `PANEL_TEST_FILE`; cubre reservas públicas y manuales, excepciones y bloqueos con confirmación, reprogramación entre sedes, snapshots, historial y responsive.
