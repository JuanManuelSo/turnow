# Arquitectura: plataforma SaaS de turnos

Estado: arquitectura propuesta para el MVP. No representa funcionalidades ya implementadas.

Referencias: `PRODUCT.md` define alcance y reglas; `DESIGN.md` define experiencia y dirección visual. El detalle de tablas y relaciones se desarrollará en `DATA_MODEL.md`.

## 1. Objetivos

- Una aplicación configurable para múltiples negocios con datos aislados.
- Reservas automáticas confiables, incluso ante solicitudes simultáneas.
- Desarrollo y operación simples para un equipo pequeño.
- Separación clara entre interfaz, reglas de negocio y persistencia.
- Evolución hacia recursos reservables y comunicaciones sin implementar toda esa complejidad inicialmente.

## 2. Arquitectura general

Monolito modular en Next.js: página pública, panel y operaciones del servidor dentro de un proyecto y despliegue principal.

```text
Navegador
  ├── Página pública y reserva
  └── Panel autenticado
             │
             ▼
Next.js
  ├── Rutas, componentes y formularios
  ├── Server Actions / Route Handlers
  ├── Autenticación, autorización y validación
  └── Casos de uso por módulo
             │
             ▼
Drizzle + PostgreSQL en Supabase

Servicios complementarios
  ├── Supabase Auth
  ├── Supabase Storage
  └── Mensajería y ejecución programada, cuando se incorporen
```

No se necesita una API independiente para la primera entrega. Las carpetas existentes `frontend/` y `backend/` se revisarán antes de reorganizarlas; cualquier contenido se conservará o migrará explícitamente.

## 3. Stack y decisiones

| Componente | Elección | Motivo |
| --- | --- | --- |
| Entorno | Node.js LTS compatible con Next.js | Soporte y estabilidad |
| Gestor de paquetes | npm | Gestor ya utilizado por el prototipo; un único package-lock.json |
| Aplicación | Next.js + TypeScript estricto | Interfaz y servidor en un mismo proyecto |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles y temas configurables |
| Validación | Zod | Validación de entradas en el servidor y reutilización en formularios |
| Base de datos | PostgreSQL administrado en Supabase | Transacciones, integridad y restricciones temporales |
| Consultas y migraciones | Drizzle ORM + SQL versionado | Tipado y acceso explícito a funcionalidades de PostgreSQL |
| Autenticación | Supabase Auth | Gestión de sesiones e identidad |
| Archivos | Supabase Storage | Logos e imágenes |
| Hosting propuesto | Vercel | Despliegue de Next.js |
| Pruebas | Vitest + Playwright | Lógica, integración y recorridos |
| CI | GitHub Actions | Verificaciones antes de integrar cambios |
| Observabilidad | Logs estructurados; Sentry al desplegar | Diagnóstico de fallos |

Las versiones exactas se elegirán al inicializar, verificando compatibilidad, y se fijarán mediante el lockfile y la configuración del entorno.

### Drizzle frente a Prisma

Se propone Drizzle como única capa ORM. El motor requiere restricciones de exclusión de PostgreSQL y transacciones explícitas, por lo que habrá SQL especializado independientemente del ORM.

Prisma es una alternativa válida y puede usar migraciones SQL personalizadas. No se incorpora junto con Drizzle: mantener dos capas de persistencia no aporta valor al MVP. Esta elección puede revisarse antes de crear las primeras migraciones si existe preferencia del equipo por Prisma.

## 4. Organización del proyecto

```text
docs/
public/
src/
  app/
    (public)/       # /b/[slug] y flujo público
    (auth)/         # Login y recuperación
    (dashboard)/   # /dashboard y configuración
    api/           # Endpoints, webhooks y tareas cuando sean necesarios
  components/
    ui/
    layout/
  modules/
    businesses/
    services/
    professionals/
    availability/
    appointments/
  server/
    auth/
    db/
  lib/
drizzle/
tests/
  integration/
  e2e/
```

- Las rutas coordinan presentación y llamadas a casos de uso; no contienen el motor de disponibilidad.
- Los módulos agrupan validaciones, reglas, operaciones y consultas propias.
- La lógica de dominio pura no depende de React ni de Next.js.
- Los archivos con acceso privilegiado se marcan como exclusivos del servidor.
- `lib/` contiene utilidades realmente compartidas, no toda la lógica de negocio.
- Las carpetas se crean cuando tengan contenido útil.
- Las pruebas unitarias pueden vivir junto a las reglas que verifican.

## 5. Límites entre cliente y servidor

- Server Components para obtener datos y renderizar contenido cuando sea apropiado.
- Client Components para selección interactiva, formularios, agenda y vista previa.
- Server Actions para operaciones internas de los formularios.
- Route Handlers para interfaces HTTP explícitas, webhooks y tareas programadas.
- Ambos adaptadores llaman a los mismos casos de uso; no duplican reglas.
- Toda operación valida entradas y permisos en el servidor, aunque ya exista validación visual.
- El navegador nunca accede a credenciales de PostgreSQL ni a claves privilegiadas.
- La base de datos es la autoridad final sobre disponibilidad y confirmación.

## 6. Autenticación y aislamiento entre negocios

Supabase Auth identifica al dueño. Una membresía vincula su usuario con el negocio que puede administrar. El MVP permite una cuenta de dueño por negocio; la relación deja lugar a futuros roles.

### Autorización

- Verificar la identidad con las APIs de servidor recomendadas por Supabase.
- Resolver permisos desde membresías persistidas, no desde un `business_id` enviado por el navegador.
- Cada operación privada debe autorizar su negocio y objeto concreto.
- Resolver el negocio público mediante su slug, permitiendo solo información pública y acciones expresamente expuestas.
- Usar claves y relaciones compuestas cuando corresponda para impedir referencias entre entidades de distintos negocios.

### Acceso a PostgreSQL

Drizzle utiliza una conexión de servidor con rol de privilegios limitados. El rol de migraciones es independiente y no se utiliza en solicitudes de usuarios.

El MVP no realiza consultas de negocio desde el navegador mediante la Data API de Supabase. Las tablas internas se ubican en un esquema no expuesto por esa API y se revisan sus permisos. El aislamiento entre negocios se aplica obligatoriamente en la capa de casos de uso y consultas, y se verifica con pruebas de integración.

La sesión de Supabase Auth no se transmite automáticamente a una conexión Drizzle. No se asumirá que las políticas basadas en `auth.uid()` protegen esas consultas. Si se agrega RLS como defensa adicional, se deberá diseñar y probar su contexto transaccional con el rol de ejecución antes de considerarla una garantía.

Las operaciones administrativas de plataforma se mantienen separadas y restringidas. El alta inicial puede ser manual, sin construir un panel comercial completo.

## 7. Modelo de dominio inicial

Entidades previstas:

- Negocios, configuración pública y reglas operativas.
- Membresías de administradores.
- Servicios compartidos por el negocio y profesionales.
- Sedes y relación de profesionales asignados a cada sede.
- Relación de servicios habilitados por profesional, compartida entre sedes.
- Horarios semanales y excepciones por fecha.
- Clientes dentro de cada negocio.
- Reservas, ocupaciones de agenda y bloqueos.
- Historial de cambios relevantes.

Precio y duración se copian a la reserva para preservar lo acordado. Los importes se representan mediante unidades monetarias menores enteras y moneda explícita, evitando números de punto flotante.

Las agendas por recurso se incorporarán después. No se simularán canchas como profesionales ni se construirá desde el inicio un motor universal de recursos combinables.

## 8. Fechas y cálculo de disponibilidad

- Cada sede tiene una zona horaria IANA; valor inicial propuesto: `America/Argentina/Buenos_Aires`. La zona horaria del negocio sirve como valor inicial al crear sedes.
- Inicio y fin de reservas se almacenan como instantes en columnas `timestamptz`.
- Horarios recurrentes se expresan mediante día de semana y horas locales del negocio.
- Las excepciones se aplican a fechas locales del negocio.
- El servidor genera intervalos válidos con una biblioteca compatible con zonas horarias; no depende de la zona del equipo o del navegador.
- Los intervalos son semiabiertos: `[inicio, fin)`, permitiendo que uno comience cuando termina otro.
- Se diferencia duración del servicio, intervalo entre inicios y margen adicional de ocupación.

El cálculo recibe una sede explícita y combina horario de esa sede, horario del profesional en esa sede, servicio habilitado, excepciones, ocupaciones, margen, anticipación mínima y horizonte de reserva. Los servicios, precios y políticas de reserva son del negocio y se comparten entre sedes.

La disponibilidad se calcula para rangos acotados; no se materializan todos los horarios posibles por adelantado. El MVP evita caché persistente de disponibilidad. La información pública de marca puede cachearse con invalidación al editarse.

## 9. Garantías contra superposiciones

### Ocupación unificada

Propuesta: una tabla de ocupaciones activas de agenda representa tanto reservas como bloqueos. Cada registro incluye negocio, profesional, rango temporal y tipo de ocupación, con relación a la reserva cuando corresponda.

Una restricción de exclusión GiST impide que rangos activos del mismo negocio y profesional se superpongan, aun si las ocupaciones pertenecen a sedes distintas. La sede se conserva para consultar agenda y validar asignación, pero no forma parte de la clave de exclusión. Así un profesional que trabaja en varias sedes no puede tener dos turnos simultáneos.

Las cancelaciones desactivan la ocupación dentro de la misma transacción que actualiza la reserva. El historial de la reserva se conserva. Las restricciones exactas se detallarán en `DATA_MODEL.md`.

### Cambios simultáneos de reglas y agenda

La exclusión temporal no impide por sí sola reservar mientras se modifica un horario. Las operaciones que cambian disponibilidad deben compartir un protocolo de bloqueo transaccional.

Para el MVP se utiliza un bloqueo transaccional asesorado de PostgreSQL (`pg_advisory_xact_lock`) derivado del identificador del negocio dentro de las transacciones cortas de confirmación, cancelación, reprogramación, bloqueo y edición de reglas de agenda. Tras obtener el bloqueo se vuelven a leer y validar las reglas relevantes.

El helper está en `src/server/db/locks.ts`. Se eligió un bloqueo asesorado en lugar de `SELECT FOR UPDATE` sobre la fila del negocio para no otorgar al usuario runtime permiso de actualización sobre esa fila. El bloqueo se libera automáticamente al confirmar o revertir la transacción.

Esto serializa las escrituras de agenda de un mismo negocio y simplifica la corrección inicial. No bloquea otros negocios ni la consulta pública de disponibilidad. Se podrá reemplazar por bloqueos más específicos si las métricas justifican optimizarlo.

No se ejecutan llamadas a proveedores externos mientras se mantiene el bloqueo.

### Confirmación

1. Validar entradas, límites de uso y negocio activo.
2. Iniciar transacción y obtener el bloqueo de agenda.
3. Verificar una clave de idempotencia para reconocer reintentos.
4. Volver a leer reglas, servicio y candidatos.
5. Validar disponibilidad actual.
6. Para “cualquier profesional”, elegir un candidato disponible en orden estable.
7. Crear reserva, ocupación e historial.
8. Registrar eventos de comunicación cuando exista ese módulo.
9. Confirmar la transacción y responder con la reserva persistida.

La clave de idempotencia es única por negocio y operación y se vincula al contenido de la solicitud. Reutilizarla con otros datos es un conflicto, no una reserva nueva.

Reprogramar actualiza reserva y ocupación en una misma transacción. Si falla, se conserva el turno original. Los conflictos de disponibilidad se devuelven como resultados esperados de negocio, sin mostrar errores SQL al cliente.

## 10. Código privado de cancelación

- Generar códigos mediante un generador criptográficamente seguro, con suficiente entropía y formato legible.
- Guardar una representación de verificación, evitando códigos en logs y herramientas de analítica.
- Validar código y negocio, limitar intentos y devolver información mínima de la reserva.
- Consultar el turno no lo cancela; la cancelación requiere una acción explícita.
- Aplicar plazos, estados e integridad dentro de una transacción.
- Permitir reintentos de cancelación sin efectos duplicados.

La respuesta idempotente a una confirmación debe poder volver a presentar el código. Antes de implementar se definirá su recuperación segura: por ejemplo, conservarlo cifrado con clave de servidor además de su hash de verificación. No se resolverá almacenándolo en texto plano ni generando uno nuevo en cada reintento.

## 11. Identidad visual y archivos

- Configuración visual estructurada, validada y versionable; no CSS o HTML arbitrarios.
- Tokens semánticos se traducen a variables CSS dentro del ámbito de cada página pública.
- Fuentes y variantes permitidas desde un catálogo controlado inicialmente.
- Textos se renderizan como contenido seguro; enlaces se validan por protocolo permitido.
- Logos e imágenes se guardan en Storage con límites de tamaño y formatos admitidos.
- Las cargas requieren autorización sobre el negocio y políticas de acceso apropiadas.
- Solo los archivos destinados a publicación son públicos.
- Vista previa local de cambios; guardar publica explícitamente la configuración e invalida la caché correspondiente.

## 12. Comunicaciones y tareas programadas

Se implementarán conforme a la etapa acordada en `PRODUCT.md`. La confirmación en pantalla no depende de ellas.

### Diseño previsto

- Patrón de outbox: la transacción de reserva registra un evento durable.
- Un ejecutor separado de la solicitud procesa envíos y reintentos.
- Cada envío tiene una clave de deduplicación y estados propios.
- Los recordatorios tienen fecha prevista y se vinculan a la versión de la reserva.
- Antes de enviar, verificar que el turno siga vigente y corresponda a esa versión.
- Cancelar invalida recordatorios pendientes; reprogramar los reemplaza.
- Las tareas se reclaman de forma transaccional para evitar procesamiento concurrente duplicado.

No depender de procesos en segundo plano iniciados sin espera desde una función web. El programador y proveedor de ejecución se elegirán según el hosting y el volumen real.

Email y WhatsApp se integrarán mediante adaptadores. Los webhooks deberán verificar autenticidad y procesarse idempotentemente. No se promete entrega exactamente una vez si el proveedor no ofrece esa garantía. Un mensaje ya entregado al proveedor puede no ser recuperable ante una cancelación simultánea.

## 13. Entornos, migraciones y operación

- Entornos separados: desarrollo, pruebas/preview y producción.
- Nunca ejecutar pruebas destructivas ni previews contra la base productiva.
- `.env.example` documenta variables sin valores secretos; los archivos reales quedan fuera de Git.
- Conexión de runtime mediante pooler compatible con el driver y modo de transacciones elegido; conexión de migración separada cuando sea necesaria.
- Migraciones versionadas y revisadas, ejecutadas como paso controlado, no al atender solicitudes.
- Datos de ejemplo sintéticos e independientes de clientes reales.
- Elegir regiones de aplicación y base de datos cercanas entre sí y adecuadas al público inicial.
- Verificar capacidades y retención de backups del plan contratado, y documentar restauración antes del lanzamiento.

## 14. Verificación y observabilidad

### Pruebas necesarias

- Unitarias: intervalos, duraciones, márgenes, horarios partidos y plazos.
- Integración sobre PostgreSQL real: exclusión temporal, rollback e idempotencia.
- Concurrencia: dos reservas del mismo horario, reserva frente a bloqueo y reserva frente a cambio de horario.
- Aislamiento: lectura y modificación cruzadas entre negocios rechazadas.
- E2E: configuración básica, reserva, cancelación y operación manual del dueño.
- Cuando existan comunicaciones: cancelación/reprogramación invalidan recordatorios y reintentos no generan envíos innecesarios.

### CI

Instalación con lockfile, lint, chequeo de tipos, pruebas relevantes y build. Las migraciones deben poder aplicarse sobre una base de prueba limpia.

### Operación

- Logs estructurados con identificador de solicitud, resultado y duración.
- Excluir códigos privados, credenciales y datos personales innecesarios.
- Registrar fallos inesperados y diferenciar conflictos normales de disponibilidad.
- Medir latencia de disponibilidad y confirmación, errores y, más adelante, fallos de mensajería.
- Límites de uso respaldados por almacenamiento compartido en despliegues con varias instancias; no depender exclusivamente de memoria local.

## 15. Secuencia de implementación

1. Revisar archivos existentes y herramientas instaladas.
2. Inicializar Next.js, TypeScript, npm, Git y configuración de entorno.
3. Definir `DATA_MODEL.md` y primeras migraciones.
4. Configurar base de datos, autenticación y autorización por negocio.
5. Implementar servicios, profesionales y horarios.
6. Construir motor de disponibilidad y confirmación transaccional con pruebas de concurrencia.
7. Conectar el flujo público y el panel básico.
8. Agregar cancelación, reprogramación, bloqueos y personalización.
9. Validar despliegue, recuperación y piloto.

## 16. Decisiones pendientes antes de cada integración

- Confirmar proveedor/plan, región y presupuestos de infraestructura.
- Validar preferencia de ORM antes de generar migraciones; propuesta actual: Drizzle.
- Elegir biblioteca de fechas y driver PostgreSQL compatibles con el entorno.
- Definir parámetros y gestión de claves para códigos privados e idempotencia.
- Definir el comportamiento de negocios suspendidos y reservas existentes.
- Elegir canal inicial, proveedor y ejecutor de comunicaciones cuando se priorice el módulo.

Estas decisiones no impiden preparar el repositorio y el esqueleto de aplicación.
