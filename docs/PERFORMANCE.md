# Performance de la reserva pública

## Navegación del dashboard

- Cada sección tiene un `loading.tsx` ligero que reutiliza `PageSkeleton` (agenda, listas, horarios y configuración). El markup se renderiza en servidor: no añade hooks, peticiones ni temporizadores de carga. La animación CSS respeta movimiento reducido.
- Los límites de carga permiten precargar el fallback de las rutas dinámicas y mantener el layout interactivo entre secciones. La primera carga todavía puede esperar a la autenticación del layout.
- `getBusinessShell` usa `React.cache` para deduplicar la consulta dentro del mismo render del servidor. La agenda reutiliza esa lectura, sin introducir una caché persistente de datos del negocio.
- Profesionales, servicios, turnos y cabeceras de horarios se consultan en paralelo una vez resuelta la sede. Se conservan los filtros de negocio, sede y fecha.
- Verificar la latencia real con `npm run build` y `npm start`: el modo desarrollo incluye compilación bajo demanda y no representa la precarga de producción. Vercel puede mejorar este tramo; la región de las funciones debe estar cerca de la base de datos. No hay todavía una medición antes/después autenticada de esta optimización del dashboard.

## Reserva pública

Medición hecha desde Argentina contra Supabase en `us-east-1`, con
`next start` (build de producción) y Microsoft Edge headless. El recorrido abre
la página pública, entra al wizard y cambia de fecha; **no crea turnos**.

Reproducir:

```powershell
npm run build
npm start
npm run test:perf -- http://localhost:3000 3
```

La primera corrida incluye el arranque en frío de las conexiones. Las
siguientes muestran el estado caliente.

## Qué se optimizó

1. **Lookup liviano del negocio**: la disponibilidad ya no carga la página
   pública completa; resuelve el negocio en una sola consulta.
2. **Rate limit en una sentencia SQL**: CTE con `prior`, `upsert` y `cleanup`,
   sin transacción ni viaje extra.
3. **Autorización + rate limit juntos**: `consumePublicAvailabilityAttempt`
   resuelve el negocio y consume el intento en una sola consulta.
4. **Disponibilidad en paralelo**: configuración, candidatos, horarios,
   excepciones y ocupaciones se piden con `Promise.all`; las ocupaciones usan
   una subquery de candidatos.
5. **Prepared statements**: el cliente usa el session pooler (5432) y fuerza
   `prepare` en las consultas de Drizzle. Con el transaction pooler cada
   consulta parametrizada costaba dos round trips (describe + execute).
6. **Pool**: `max: 5`, `idle_timeout: 60` para sostener las conexiones y los
   statements preparados entre cambios de fecha.

## Números observados

Latencia de red cruda desde esta máquina a `us-east-1`:

| Operación | Antes (6543, `prepare: false`) | Después (5432, prepared) |
| --- | ---: | ---: |
| `select 1` sin parámetros | 160–200 ms | 160–200 ms |
| Consulta parametrizada | 330–410 ms | 155–245 ms |
| Handshake de conexión nueva | ~1.9–2.0 s | ~0.2–2.0 s (según red) |

Reserva pública, estado caliente:

| Escenario | Antes | Después |
| --- | ---: | ---: |
| Primer cambio de fecha | ~1.05–1.30 s | ~0.40–0.80 s |
| Cambios siguientes | ~1.0–1.3 s | ~0.40–0.80 s |
| Primera disponibilidad tras cargar la página | ~2.8 s (frío) / ~1.1 s (caliente) | ~2.7 s (frío) / ~0.62–0.72 s (caliente) |

Desglose del último tramo optimizado (medido con logs temporales):

- Autorización + rate limit: ~170–520 ms.
- Disponibilidad (5 consultas en paralelo): ~180–290 ms.

La varianza restante es de red/Supabase. El próximo salto es la región: con
São Paulo el round trip esperado baja a decenas de milisegundos, por lo que un
cambio de fecha debería quedar alrededor de **100–200 ms** caliente.

## Notas

- El transaction pooler (6543) sigue siendo la opción segura para serverless
  con muchas instancias. En ese caso el código desactiva prepared statements
  solo; la latencia vuelve al orden de 1 s desde Argentina.
- `npm run test:perf` no modifica turnos, sedes, servicios ni profesionales.
  Sólo consulta disponibilidad y actualiza contadores de rate limit.
- Para comparar regiones, repetir la misma medición con el mismo hardware y la
  misma red; no comparar una corrida fría con una caliente.
