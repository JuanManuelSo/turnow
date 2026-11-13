# Turnow

Plataforma SaaS de turnos configurable por negocio.

## Estado

Prototipo navegable Next.js con datos ficticios y estado local. Incluye bienvenida, reserva, cancelación, agenda del dueño y personalización. No se conecta a servicios reales.

## Ejecutar el prototipo

Requisito: Node.js 24 LTS y npm. Se utiliza `package-lock.json` como único lockfile.

```sh
npm ci
npm run dev
```

Abrir http://localhost:3000. `npm run build` compila producción. `npm run test:prototype` prueba los recorridos con Playwright y Microsoft Edge, con el servidor iniciado.

Ver [recorridos, simulaciones y validaciones pendientes](docs/PROTOTYPE.md).

## Base de desarrollo

Next.js 16, React 19 y TypeScript estricto. Dependencias preparadas para Supabase Auth/Storage, PostgreSQL con Drizzle, Zod, Tailwind CSS 4, ESLint y Vitest.

- `npm run lint`: análisis estático.
- `npm run typecheck`: comprobación de tipos.
- `npm run build`: compilación de producción.
- `npm test`: pruebas Vitest; las de integración requieren Docker activo.
- `npm run test:db`: pruebas del esquema sobre PostgreSQL 17 descartable, sin conectar a Supabase.
- `npm run db:generate`: generar migraciones locales desde el esquema Drizzle.
- `npm run db:check`: verificar metadatos de migraciones.
- `npm run test:prototype`: recorridos existentes con el servidor local iniciado y Edge instalado.

Tailwind está disponible sin Preflight para preservar los estilos del prototipo. `components.json` prepara las rutas de shadcn/ui; sus componentes y tokens se incorporarán conforme se implementen pantallas reales.

ESLint conserva advertencias de efectos React en tres archivos del prototipo. La regla `set-state-in-effect` continúa siendo error para los demás archivos. ESLint 9 se mantiene por compatibilidad con los plugins de la configuración de Next.js; revisar su actualización cuando esos plugins admitan ESLint 10.

`.env.example` documenta las variables. Los valores reales van en `.env.local`. No se necesitan credenciales para ejecutar el prototipo. El esquema Drizzle tiene 19 tablas y las cuatro migraciones están aplicadas al proyecto Supabase de desarrollo. Incluye sedes, profesionales asignados por sede y reservas con ubicación. `DATABASE_URL` usa el usuario runtime `turnow_app`, miembro de `turnow_runtime`.

`npm run db:ping -- --migration` verifica la conexión administrativa sin modificar datos. `npm run db:ping` verifica la conexión runtime y rechaza roles privilegiados.

Ver [instrucciones de migraciones y permisos](drizzle/README.md). `npm run db:migrate` aplica las migraciones a `DATABASE_MIGRATION_URL`; no se ejecuta automáticamente.

## Documentación

- [Producto](docs/PRODUCT.md)
- [Diseño](docs/DESIGN.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Checklist de pendientes](docs/CHECKLIST.md)

## Estructura

```text
docs/                    Definiciones del proyecto
public/                  Archivos públicos de la aplicación
src/
  app/                   Rutas públicas, autenticación, panel y endpoints
  components/            Componentes de interfaz y estructuras compartidas
  modules/               Reglas y operaciones agrupadas por dominio
  server/                Autenticación y acceso a datos exclusivos del servidor
  lib/                   Utilidades compartidas
drizzle/                 Migraciones de base de datos
tests/
  integration/           Pruebas de persistencia, aislamiento y concurrencia
  e2e/                   Pruebas de recorridos completos
```

Los archivos `.gitkeep` mantienen las carpetas vacías en control de versiones y pueden retirarse cuando tengan contenido.

La aplicación Next.js está inicializada en la raíz. Los grupos de rutas existentes se conservan para la implementación futura; el prototipo se sirve desde `src/app/page.tsx`.

## Carpetas preexistentes

`frontend/` contiene configuraciones de herramientas de diseño y agentes. Se conserva su contenido. `backend/` también se conserva. La arquitectura propuesta utiliza `src/` para la aplicación y su servidor, sin requerir aplicaciones independientes en esas carpetas.

## Próximos pasos

1. Validar el prototipo con clientes y dueños antes de implementar persistencia real.
2. Definir y validar diseño del selector de sede y agenda por sede con el prototipo simulado.
3. Configurar Supabase Auth para el alta y acceso del dueño.
4. Implementar configuración del negocio y el motor de disponibilidad por sede sobre el esquema migrado.

Las cuentas de servicios, secretos y datos reales no deben incorporarse al repositorio.
