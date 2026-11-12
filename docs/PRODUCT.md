# Producto: plataforma SaaS de turnos adaptable a distintos negocios

Estado: visión del producto y propuesta inicial de entregas, pendiente de validación.

Este documento define el producto y sus reglas. Las decisiones propuestas se distinguen de los requisitos confirmados; las tecnologías y el esquema de base de datos se documentarán por separado.

## 1. Objetivo

Permitir que negocios y profesionales que trabajan con reservas reciban turnos online, configuren sus propias reglas y administren su operación desde un panel sencillo. El mercado inicial es Rosario, con posibilidad de expansión a otras localidades.

El producto será un SaaS: cada negocio tendrá una página pública configurable y un panel privado con sus propios datos. La configuración debe permitir incorporar otros negocios sin desarrollar una aplicación diferente para cada uno.

### Propuesta de valor

“Tus clientes eligen un horario y reservan solos; vos organizás la agenda de tu equipo desde un solo lugar”.

### Visión y adaptación por rubro

El sistema debe adaptarse mediante configuración: identidad visual, servicios, agendas, reglas, datos solicitados y comunicaciones. Cada negocio administra su versión del turnero sin necesitar cambios de código específicos.

| Tipo de negocio | Qué se reserva | Configuración relevante |
| --- | --- | --- |
| Barbería o peluquería | Servicio con un profesional | Duración, profesional, horarios individuales |
| Belleza | Servicio con profesional y, eventualmente, equipo o cabina | Duración, márgenes, recursos necesarios |
| Consultorio | Atención con un profesional | Especialidad, horarios e instrucciones de asistencia |
| Canchas deportivas | Uso de un espacio | Cancha, duración, horario y eventualmente precio por franja |

Estos ejemplos representan la dirección del producto, no una promesa de soporte completo en la primera entrega. Los flujos específicos se habilitarán por etapas.

### Conceptos comunes

- **Negocio:** cuenta compradora del SaaS, con datos, configuración y acceso propios.
- **Servicio:** lo que se ofrece, con duración, precio e instrucciones.
- **Agenda reservable:** disponibilidad de una persona o un recurso que puede ocuparse.
- **Profesional:** persona que presta servicios y tiene horarios propios.
- **Recurso:** espacio o equipo cuya disponibilidad puede limitar las reservas.
- **Reserva:** asignación de un servicio y de la capacidad necesaria durante un intervalo.
- **Reglas:** condiciones que determinan cuándo se puede reservar, cancelar o modificar.
- **Plantilla de rubro:** conjunto de valores iniciales y textos que facilita configurar un negocio; no es una aplicación separada.

La primera entrega implementará agendas por profesional. Las agendas de recursos y la combinación de profesional más recurso se incorporarán en etapas posteriores. Esta distinción evita confundir adaptación visual con soporte real de las reglas de un rubro.

### Principios de producto

- Configuración autónoma y comprensible para el dueño.
- Reserva rápida desde celular, sin cuenta obligatoria para el cliente.
- Confirmación automática basada en disponibilidad real.
- Una misma plataforma para todos los negocios, con aislamiento de datos.
- Personalización guiada para mantener una experiencia clara y consistente.
- Entregas pequeñas que aporten valor, preservando la visión general del sistema.

## 2. Usuarios y permisos

### Administrador de la plataforma

- Da de alta negocios y la cuenta de su dueño.
- Administra el estado de acceso del negocio.
- Acompaña la configuración inicial.
- En el MVP, el alta y el cobro de la suscripción pueden gestionarse manualmente.

### Dueño del negocio

- Accede únicamente a la información de su negocio.
- Configura página pública, servicios, profesionales, horarios y reglas.
- Consulta y administra la agenda de todo su equipo.
- Crea reservas manuales y bloquea horarios.
- Registra asistencia y ausencia de clientes.

### Profesional

- Es una persona configurable dentro del negocio, con servicios y agenda propios.
- No tiene acceso individual al panel en el MVP.

### Cliente

- Consulta información del negocio y disponibilidad.
- Reserva sin crear una cuenta.
- Recibe un código para consultar y cancelar su reserva.

## 3. Etapas y alcance de entrega

La visión incluye reservas, adaptación por rubro, edición del turnero, avisos y recordatorios. Las siguientes etapas son una propuesta de priorización; las funcionalidades futuras siguen siendo parte del producto.

### Etapa 1: MVP operativo

### Incluido

- Múltiples negocios con datos y permisos aislados.
- Una sucursal y una cuenta de dueño por negocio.
- Página pública con enlace propio.
- Servicios, profesionales y horarios configurables.
- Disponibilidad por profesional y disponibilidad combinada.
- Reserva automática sin registro del cliente.
- Cancelación mediante código privado.
- Agenda del dueño, reservas manuales y reprogramación desde el panel.
- Bloqueos, ausencias y excepciones de horarios.
- Personalización básica y métricas operativas sencillas.

### Etapa 2: comunicación y mayor autonomía

- Avisos transaccionales por canales externos: confirmación, cancelación y reprogramación.
- Recordatorios automáticos configurables.
- Historial de envíos y estado de entrega cuando el proveedor lo permita.
- Plantillas iniciales por rubro y mayor personalización guiada.
- Reprogramación autónoma del cliente.
- Campos adicionales de reserva definidos por el negocio.

El canal inicial de mensajería y la posibilidad de adelantar estas funciones al MVP quedan pendientes de decisión. Email y WhatsApp deben evaluarse según uso, costo y requisitos de integración.

### Etapa 3: ampliación de modalidades

- Reserva directa de recursos, como canchas.
- Disponibilidad conjunta de profesional y recurso, como una cabina o equipo.
- Precios por franja y reservas recurrentes.
- Sucursales, accesos individuales del equipo y permisos.
- Señas, pagos e integraciones con calendarios.

### Funcionalidades fuera de la primera entrega

- Canchas, clases grupales y reservas con cupos.
- Gestión de sillas, cabinas o equipos como recursos compartidos.
- Varias sucursales.
- Cuentas y permisos individuales para empleados.
- Varios servicios en una misma reserva.
- Precios o duraciones diferentes por profesional para un mismo servicio.
- Pagos, señas, facturación y cobro automático de la suscripción.
- Recordatorios automáticos por WhatsApp y sincronización con calendarios externos.
- Lista de espera, reservas recurrentes y promociones.
- Editor visual libre, dominios propios y landing personalizada incluida.
- Reprogramación autónoma del cliente: inicialmente podrá cancelar y hacer otra reserva.

La landing personalizada podrá ofrecerse como servicio adicional y enlazar a la página de reservas existente.

## 4. Página pública del negocio

### Bienvenida

Debe ser breve, clara y diseñada primero para celular.

Contenido configurable:

- Nombre del negocio.
- Logo y color principal.
- Descripción breve.
- Dirección y enlace a un mapa.
- Contacto y enlace a WhatsApp, si corresponde.
- Enlaces a redes sociales.
- Horarios generales del local, si se decide mostrarlos.
- Indicaciones útiles para asistir.

Acciones principales:

1. **Reservar turno**: acción visualmente predominante.
2. **Cancelar turno**: acceso visible al ingreso del código de reserva.

Los campos opcionales vacíos no deben generar secciones incompletas. Los horarios generales del local son informativos y delimitan la operación, pero no representan por sí solos la disponibilidad de cada profesional.

### Herramienta de edición del turnero

El dueño debe poder modificar la presentación y las reglas desde su panel, sin editar código.

| Área editable | Opciones | Entrega propuesta |
| --- | --- | --- |
| Identidad | Nombre, logo y color principal | MVP |
| Información | Descripción, contacto, ubicación y redes | MVP |
| Oferta | Servicios, duración, precios y visibilidad | MVP |
| Equipo | Profesionales y servicios que ofrecen | MVP |
| Agenda | Días, horarios, descansos, excepciones y márgenes | MVP |
| Reserva | Anticipación, horizonte, elección de profesional y cancelación | MVP |
| Presentación | Mostrar u ocultar información opcional y previsualizar | MVP |
| Formulario | Campos adicionales, etiquetas y obligatoriedad | Etapa 2 |
| Comunicaciones | Canales, recordatorios y textos permitidos | Etapa 2 |
| Plantillas | Configuración inicial y vocabulario por rubro | Etapa 2 |
| Recursos | Espacios, equipos y reglas de capacidad | Etapa 3 |

El flujo de edición permite cargar cambios, validarlos, previsualizar y guardar explícitamente. Los cambios que afecten turnos existentes deben mostrar su impacto antes de aplicarse. Guardar contenido visual no modifica reservas.

La interfaz pública se adapta a la configuración: si hay un único profesional, puede omitirse su selección; si hay varios, puede ofrecerse elección específica y la opción de cualquiera disponible. No se muestran pasos vacíos o innecesarios.

### Criterios de diseño del producto

- Dos experiencias coherentes: página pública orientada a reservar y panel orientado a gestionar.
- Jerarquía visual que prioriza reservar, consultar disponibilidad y administrar la agenda.
- Diseño responsive, accesible y con formularios breves.
- Componentes y plantillas compartidos con identidad configurable por negocio.
- Vista previa para verificar la presentación antes de compartir el enlace.

Los componentes concretos, wireframes, tipografía, espaciados y comportamiento visual detallado se definirán en `DESIGN.md`.

## 5. Flujo de reserva

1. El cliente entra al enlace del negocio y selecciona **Reservar turno**.
2. Elige un servicio; ve su duración prevista y el precio si el negocio lo publica.
3. Elige un profesional o **Cualquier profesional disponible**.
4. Elige un día y un horario disponible.
5. Completa nombre y teléfono. El email será opcional si se incorpora como canal de confirmación.
6. Revisa servicio, profesional o modalidad de asignación, fecha, hora, precio visible y política de cancelación.
7. Confirma la reserva.
8. El sistema vuelve a validar la disponibilidad y guarda la reserva.
9. Se muestra la confirmación con el profesional asignado, los datos del turno y un código privado que puede copiar.

La reserva queda confirmada únicamente cuando se guarda correctamente. No requiere aprobación del dueño ni depende del envío de un mensaje.

### Profesional específico

Se muestran únicamente los horarios en los que el profesional seleccionado puede realizar el servicio completo.

### Cualquier profesional disponible

- Se ofrece la unión de los horarios de los profesionales habilitados para el servicio.
- Un horario compartido por varios profesionales se muestra una sola vez.
- La interfaz explica que se asignará un profesional disponible al confirmar.
- Al confirmar, se asigna exactamente un profesional que siga disponible.
- Si un profesional se ocupa durante el proceso, se puede asignar otro habilitado para ese mismo horario.
- Si ninguno sigue disponible, la reserva no se crea y se ofrecen horarios actualizados.
- La confirmación siempre identifica al profesional asignado.
- Propuesta inicial de asignación: orden estable configurable de los profesionales; el balanceo de carga queda fuera del MVP.

## 6. Cancelación mediante código

### Flujo

1. El cliente pulsa **Cancelar turno** en la página del negocio.
2. Ingresa el código recibido al reservar.
3. Si es válido, ve un resumen mínimo del turno y si aún puede cancelarlo.
4. Confirma explícitamente la cancelación.
5. La reserva queda cancelada y su horario vuelve a estar disponible cuando corresponda.

### Reglas

- El código es privado, aleatorio, no secuencial y suficientemente difícil de adivinar.
- Se vincula a una reserva y se valida dentro del negocio correspondiente.
- No se permite buscar reservas por nombre o teléfono públicamente.
- Se limitan los intentos de ingreso para evitar búsquedas masivas de códigos.
- El resumen no expone datos de contacto completos del cliente.
- La página informa al reservar que el código debe guardarse para cancelar.
- Una cancelación repetida no produce errores ni cambios adicionales: informa que el turno ya está cancelado.
- Un código inválido muestra un mensaje claro sin revelar reservas de otras personas.
- Si venció el plazo permitido, se muestra cómo contactar al negocio.
- Si el cliente pierde el código, debe contactar al negocio; el dueño podrá cancelar desde el panel tras verificar la solicitud.
- El cliente no puede cancelar una reserva pasada, atendida o marcada como ausencia.

La longitud y el formato del código se resolverán en el diseño técnico, equilibrando facilidad de uso y resistencia a intentos de adivinación. No se utilizará un PIN corto como única credencial.

## 7. Reglas de agenda y disponibilidad

### Servicios y duración

- Cada servicio tiene nombre, duración planificada, precio opcional y estado activo/inactivo.
- Precio y duración son comunes a los profesionales que ofrecen ese servicio en el MVP.
- Cada negocio configura sus duraciones e intervalos; por ejemplo, 15, 30 o 60 minutos. No existe un bloque de 30 minutos obligatorio para toda la plataforma.
- La duración real puede variar; el sistema reserva el bloque planificado y no desplaza automáticamente los siguientes turnos por retrasos.
- Si un servicio suele necesitar más tiempo, el dueño debe aumentar su duración planificada.
- La duración del servicio y el intervalo entre posibles inicios son conceptos separados.
- Se podrá configurar un margen adicional entre reservas; propuesta inicial: cero minutos.
- Una reserva conserva el precio y la duración acordados aunque luego se modifique el servicio.

### Horarios

- El local tiene horarios generales de apertura.
- Cada profesional tiene su propio horario semanal, contenido dentro de la apertura del negocio.
- Se admiten horarios partidos y días sin atención.
- Un profesional puede atender solo parte del horario de apertura del negocio.
- Las excepciones por fecha permiten ausencias, feriados y cambios puntuales.
- Los bloqueos manuales impiden nuevas reservas en sus intervalos.
- El servicio completo y su margen deben entrar en un intervalo habilitado, sin atravesar descansos ni ocupaciones.
- Un turno puede terminar exactamente cuando comienza el siguiente si no hay margen adicional.
- La zona horaria inicial del negocio es `America/Argentina/Buenos_Aires`.

### Reglas configurables de reserva

- Anticipación mínima para reservar.
- Cantidad máxima de días hacia adelante.
- Anticipación mínima para cancelar online.
- Intervalo entre posibles inicios y margen entre reservas.

Cada negocio debe revisar estos valores durante su configuración inicial. Los valores predeterminados de la plataforma están pendientes de definición.

### Integridad de la agenda

- Una reserva ocupa un profesional para un servicio durante un intervalo continuo.
- Un profesional no puede tener reservas activas superpuestas.
- Mirar o seleccionar un horario no lo retiene ni lo bloquea temporalmente.
- La confirmación debe impedir superposiciones incluso ante solicitudes simultáneas.
- Un doble envío de la misma confirmación no debe crear dos reservas.
- Las reservas manuales respetan las mismas reglas de disponibilidad que las públicas.
- No se permiten bloqueos que se superpongan con reservas existentes sin resolver antes esas reservas.
- Cambiar horarios o desactivar un profesional o servicio no cancela reservas existentes silenciosamente. El panel debe advertir sobre las reservas afectadas y permitir gestionarlas.
- Reprogramar es una operación completa: si el nuevo horario no puede reservarse, se conserva el original.

### Capacidad y recursos compartidos

El MVP calcula capacidad por profesional. Es adecuado para negocios donde cada profesional habilitado puede atender sin competir por recursos físicos limitados.

Cuando varias personas comparten menos espacios o equipos de los que podrían ocupar simultáneamente, la disponibilidad individual no es suficiente. Esa modalidad requiere controlar también el recurso compartido y se habilitará en la etapa correspondiente.

Para reservas de canchas u otros espacios, el recurso será la agenda principal y no será obligatorio asociar un profesional. Para servicios que requieren persona y recurso, ambos deberán estar disponibles durante todo el intervalo necesario.

## 8. Panel del dueño

### Inicio

- Agenda de hoy.
- Próximos turnos.
- Cantidad de reservas programadas para la semana, excluyendo canceladas.
- Cancelaciones y ausencias del período seleccionado.
- Acceso rápido a crear un turno y copiar el enlace público.

Las métricas deben indicar período y criterio de conteo. No se muestran ingresos cobrados, ya que el MVP no registra pagos.

### Agenda

- Vista diaria y semanal.
- Filtro por profesional.
- Detalle de servicio, cliente, contacto, duración y estado.
- Crear reserva manual con profesional, servicio y horario.
- Reprogramar o cancelar una reserva.
- Bloquear períodos sin atención.
- Marcar una reserva como atendida o ausencia.

### Configuración

- Datos públicos, logo, colores y enlaces.
- Servicios, precios, duración y visibilidad del precio.
- Profesionales y servicios que realiza cada uno.
- Horarios del negocio y de los profesionales.
- Ausencias, excepciones y reglas de reserva/cancelación.
- Vista previa de la página pública.

## 9. Estados de una reserva

| Estado | Significado |
| --- | --- |
| Confirmada | Reserva creada correctamente, sin aprobación pendiente |
| Cancelada | Anulada por el cliente o el negocio; deja de ocupar disponibilidad |
| Atendida | El dueño registró que el cliente fue atendido |
| Ausente | El dueño registró que el cliente no asistió |

- No existe estado pendiente de aprobación en el MVP.
- El paso del tiempo no marca automáticamente una reserva como atendida.
- Se conserva el historial de cancelaciones y reprogramaciones, incluyendo quién realizó la acción.
- El plazo de cancelación pública no impide que el dueño cancele desde el panel.
- Las correcciones administrativas de estado deben preservar el historial y no generar superposiciones.

## 10. Experiencia y requisitos de calidad

- Flujo público usable desde celular sin instalar aplicaciones.
- Formularios breves, etiquetas claras y errores junto al campo correspondiente.
- Navegación accesible por teclado y contraste legible.
- Estados explícitos de carga, falta de disponibilidad, reserva exitosa y conflicto de horario.
- Al perder un horario durante la confirmación, conservar los datos ingresados para facilitar un nuevo intento.
- Ningún negocio puede acceder a datos de otro, tampoco mediante direcciones o identificadores manipulados.
- Recopilar únicamente los datos necesarios para prestar el servicio.
- Las notificaciones futuras serán independientes del guardado de la reserva y podrán reintentarse.

### Avisos y recordatorios

Las comunicaciones son un módulo del producto. Se distinguen los avisos por un cambio de estado de los recordatorios programados antes del turno.

| Evento | Destinatario | Comportamiento esperado |
| --- | --- | --- |
| Reserva confirmada | Cliente | Resumen, ubicación, instrucciones y acceso privado de gestión |
| Nueva reserva | Negocio | Aviso según preferencias del dueño |
| Reserva cancelada | Cliente y negocio | Identificar el turno cancelado y actualizar la agenda |
| Reserva reprogramada | Cliente | Informar la nueva fecha y hora, reemplazando la información anterior |
| Próximo turno | Cliente | Recordatorio con anticipación configurada por el negocio |
| Problema de envío | Dueño | Mostrar el estado y permitir una acción cuando corresponda |

#### Configuración

- Activar o desactivar cada tipo de aviso y los canales disponibles.
- Definir con cuánta anticipación se envían recordatorios; por ejemplo, 24 horas antes.
- Personalizar instrucciones y textos dentro de plantillas con datos obligatorios de la reserva.
- Mostrar qué datos de contacto se necesitan según el canal elegido.
- Informar al cliente sobre las comunicaciones asociadas a su reserva.

#### Reglas de funcionamiento

- La confirmación en pantalla y el código privado forman parte del MVP.
- Los envíos externos y programados corresponden a la etapa de comunicaciones, salvo que se prioricen antes.
- Una falla de mensajería no anula una reserva confirmada.
- Cancelar un turno impide el envío de recordatorios pendientes de ese turno.
- Reprogramar invalida los recordatorios anteriores y calcula los nuevos.
- No se envía un recordatorio cuyo momento previsto ya pasó al crear la reserva.
- Los reintentos deben evitar mensajes duplicados en la medida que lo permita el canal.
- Se diferencia entre envío solicitado, aceptado por el proveedor, entregado y fallido cuando esa información exista; no se promete entrega por el solo hecho de solicitarla.
- Los mensajes operativos de reservas no implican consentimiento para publicidad.

## 11. Criterios de aceptación principales

1. Un dueño puede configurar su negocio, servicios, profesionales y horarios, y publicar su enlace.
2. La bienvenida muestra información configurada y los botones **Reservar turno** y **Cancelar turno**.
3. No se ofrecen reservas fuera del horario individual del profesional aunque el negocio esté abierto.
4. Un servicio de 30 minutos puede comenzar a las 13:30 y terminar a las 14:00 si no existe margen adicional ni otra ocupación.
5. Un servicio de 45 minutos no puede comenzar a las 13:30 si el profesional termina a las 14:00.
6. La modalidad **Cualquier profesional disponible** combina horarios sin duplicarlos y asigna un profesional al confirmar.
7. Dos clientes que intentan reservar simultáneamente el mismo profesional y horario no generan dos reservas superpuestas.
8. Si hay dos profesionales libres a la misma hora, se pueden confirmar dos reservas, una con cada profesional.
9. El cliente reserva sin cuenta y recibe un resumen y un código privado.
10. Una cancelación válida mediante código libera el horario y conserva el registro de la reserva.
11. Una cancelación fuera de plazo muestra el contacto del negocio y no cancela el turno.
12. Una reserva manual aparece en la agenda y deja de ofrecerse públicamente.
13. Un bloqueo o ausencia elimina los horarios afectados de la disponibilidad pública.
14. Una reprogramación fallida conserva la reserva original.
15. Un usuario de otro negocio no puede consultar ni modificar reservas ajenas.
16. Modificar un servicio no altera el precio ni la duración guardados en reservas anteriores.
17. Repetir una solicitud de confirmación por doble clic o reintento no duplica la reserva.

### Criterios de adaptación y comunicaciones

18. Dos negocios pueden publicar distinta identidad, servicios, duraciones y reglas sin cambios de código.
19. La vista previa refleja el contenido configurado y los campos opcionales ocultos no dejan secciones vacías.
20. Un negocio puede configurar intervalos de 15 minutos y otro de 60 minutos sin interferencia entre sus agendas.
21. En la etapa de comunicaciones, cancelar un turno impide que se envíe su recordatorio pendiente.
22. En la etapa de comunicaciones, reprogramar un turno actualiza el recordatorio y comunica el nuevo horario.
23. En la etapa de recursos, una cancha ocupada no puede reservarse simultáneamente por otro cliente.
24. En la etapa de recursos compartidos, un servicio solo se ofrece si están disponibles tanto el profesional como el recurso requerido.

## 12. Validación y métricas del piloto

### Preparación

- Confirmar que la modalidad operativa del negocio esté soportada y cargar servicios, duraciones, agendas y horarios reales.
- Acordar anticipación, horizonte de reserva y política de cancelación.
- Cargar la agenda existente antes de compartir el enlace para evitar conflictos con turnos tomados por otros medios.
- Probar una reserva, una cancelación, una reserva manual y una reprogramación con el dueño.

### Métricas

- Reservas online confirmadas por semana.
- Proporción de reservas online frente a manuales.
- Uso semanal del panel por el dueño.
- Cancelaciones y ausencias registradas.
- Conflictos de agenda reportados.
- Tiempo y dificultades para completar una reserva.
- Opinión del dueño sobre tiempo ahorrado y disposición a pagar.

Los objetivos numéricos se fijarán con datos del piloto. El objetivo inicial es que el negocio pueda utilizar el sistema con su agenda real, sin superposiciones y con menos coordinación manual.

## 13. Decisiones de producto pendientes

- Validar el orden de entrega de las modalidades por profesional, recurso y capacidad compartida.
- Definir las primeras plantillas de rubro y qué vocabulario podrá personalizarse.
- Validar la política propuesta de asignación cuando el cliente elige cualquier profesional.
- Definir valores predeterminados de anticipación, horizonte de reserva y cancelación.
- Elegir el canal inicial de avisos y recordatorios, sus costos y si se incluye en el MVP.
- Definir límites y tipos de campos adicionales del formulario de reserva.
- Definir qué ocurre con el enlace público si se suspende un negocio, preservando un canal para gestionar reservas existentes.
- Acordar precio comercial, soporte incluido y conservación de datos.

## 14. Próximos entregables

1. Validar alcance, etapas y reglas pendientes del producto con potenciales compradores.
2. Diseñar los flujos públicos y del panel; documentarlos en `DESIGN.md`.
3. Definir arquitectura y garantías de concurrencia en `ARCHITECTURE.md`.
4. Modelar entidades, relaciones y restricciones en `DATA_MODEL.md`.
5. Dividir la implementación en hitos verificables, empezando por configuración y primera reserva completa.
