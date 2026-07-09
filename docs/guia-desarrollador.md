# Guia del desarrollador

Esta guia explica como esta organizado el proyecto, como se conectan frontend,
backend y base de datos, que flujos tienen reglas especiales y que revisar antes
de modificar codigo en produccion.

## Objetivo del sistema

La aplicacion gestiona y publica el Mes de la Ingenieria FCI. Tiene dos caras:

- Panel publico: agenda, charlas, talleres, torneos, formularios publicos y QR.
- Panel administrativo: usuarios, roles, espacios, eventos, asistencia, torneos,
  hackathon, notificaciones, reportes, configuracion y auditoria.

La arquitectura esta pensada para correr en Ubuntu Server con Docker Compose:

- `frontend`: React + Vite + Tailwind, servido por Nginx.
- `backend`: Express + TypeScript + Prisma.
- `postgres`: PostgreSQL 16 con volumen persistente.
- `caddy`: proxy publico. En este repo esta configurado en HTTP por el puerto
  `HTTP_PORT`; si se usa dominio/HTTPS, ajustar `deploy/Caddyfile`.

## Estructura de carpetas

```text
backend/
  prisma/
    schema.prisma                 Modelo de datos Prisma.
    migrations/                   Migraciones versionadas. Nunca editar una migracion ya aplicada.
    seed.ts                       Datos base: roles, permisos, admin inicial.
  src/
    app.ts                        Configura Express, middlewares y rutas.
    index.ts                      Arranque del servidor.
    config/env.ts                 Variables de entorno.
    lib/                          Prisma, errores, auth token, password, logger.
    middlewares/                  Auth, validacion, seguridad, error handler.
    modules/<dominio>/            Controller, routes, schemas y service por dominio.
    routes/index.ts               Montaje de rutas bajo /api.
    utils/                        Helpers compartidos.

frontend/
  src/
    api/                          Cliente HTTP y contratos por modulo.
    components/                   Layout y componentes comunes.
    context/                      Auth y configuracion global.
    pages/                        Pantallas publicas y administrativas.
    utils/                        Fechas y etiquetas.

deploy/
  Caddyfile                       Proxy hacia frontend/backend.
  .env.production.example         Plantilla de variables de produccion.
  README.md                       Pasos de despliegue en Ubuntu Server.

docs/
  fases-implementacion.md         Historial funcional por fases.
  guia-desarrollador.md           Esta guia.
```

## Backend: patron por modulo

Cada dominio sigue este patron:

- `*.routes.ts`: define rutas, permisos y validacion.
- `*.schemas.ts`: valida `params`, `query` y `body` con Zod.
- `*.controller.ts`: traduce HTTP a llamadas de servicio y respuesta JSON.
- `*.service.ts`: concentra reglas de negocio y consultas Prisma.

Ejemplo: torneos.

```text
tournament.routes.ts     POST /api/tournaments, GET /api/tournaments/:id/fixture
tournament.schemas.ts    createTournamentSchema, createMatchSchema, publicTournamentRegistrationSchema
tournament.controller.ts createTournament(req, res), publicRegisterTournament(req, res)
tournament.service.ts    reglas de cupos, equipos, fixtures, resultados y rankings
```

Regla practica: si el cambio afecta negocio, normalmente debe vivir en
`service.ts`; si solo cambia validacion de entrada, va en `schemas.ts`; si solo
cambia la URL o permisos, va en `routes.ts`.

## Mapa de metodos principales

### `events.service.ts`

| Metodo | Responsabilidad | Cuidado al cambiar |
| --- | --- | --- |
| `listEvents` | Lista agenda administrativa con filtros y paginacion. | Mantener `onlyActive`; no mostrar eliminados suaves. |
| `listPublicEvents` | Publica eventos `PUBLISHED` y `FINISHED`, agrega links publicos. | Solo `WORKSHOP` tiene inscripcion; asistencia depende de tipos permitidos. |
| `createEvent` | Crea actividades de agenda. | Bloquea `COMPETITION`; las competencias se crean como torneos. |
| `updateEvent` | Actualiza agenda y valida choque de espacios. | Si se cambia horario/lugar, conservar `assertVenueAvailability`. |
| `deleteEvent` | Eliminacion suave con auditoria. | No borrar fisicamente porque asistencias/reportes dependen del evento. |
| `addResponsible` / `removeResponsible` | Gestiona responsables del evento. | Validar usuarios existentes y auditar cambios. |

### `attendance.service.ts`

| Metodo | Responsabilidad | Cuidado al cambiar |
| --- | --- | --- |
| `getActiveEvent` | Resuelve evento por UUID, slug o titulo slugificado. | Mantener compatibilidad con links QR ya generados. |
| `assertCapacity` | Evita superar cupos. | Cuenta `REGISTERED` y `CHECKED_IN`; no contar cancelados. |
| `assertNoDuplicate` | Evita registros repetidos por usuario, correo o identificador. | Si cambia identificador, revisar formularios publicos y admin. |
| `createAttendance` | Registro manual/admin de asistencia. | Auditar y generar QR/codigo temporal. |
| `scanAttendance` | Marca asistencia desde QR. | Debe validar token y estado. |
| `getPublicEventForm` | Devuelve datos del formulario publico. | Registro solo para talleres; check-in para tipos permitidos. |
| `publicRegisterAttendance` | Preinscripcion publica de talleres. | No abrir a otros tipos sin definir flujo de cupos y correos. |
| `publicCheckInAttendance` | Check-in publico por ventana de tiempo. | Mantener ventana para evitar registros fuera de horario. |
| `getAttendanceCertificateHtml` | Genera certificado imprimible. | Solo para `CHECKED_IN`. |

### `tournament.service.ts`

| Metodo | Responsabilidad | Cuidado al cambiar |
| --- | --- | --- |
| `normalizeInput` | Aplica defaults y restricciones por disciplina. | Actualizar aqui al agregar deportes o modos. |
| `createTournament` | Crea torneo/competencia con reglas normalizadas. | Usar para competencias creadas desde Eventos. |
| `updateTournament` | Actualiza torneo sin borrar campos no enviados. | Revisar merge al cambiar disciplina/modo. |
| `resolveTournamentByPublicKey` | Resuelve torneo por UUID, nombre o slug. | Mantener para no romper links publicos existentes. |
| `getTournamentForRegistration` | Valida que el torneo acepte inscripciones. | `FINISHED` y `CANCELLED` no deben recibir registros. |
| `normalizeTeamMembers` | Normaliza miembros libres, usuarios existentes o miembros editados. | Mantener validacion de duplicados internos. |
| `ensureTeamMembersAreNotInAnotherTeam` | Evita que una persona este en dos equipos del mismo torneo. | Compara userId, email e identificador. |
| `ensureVideoGameRestriction` | Limita participacion en torneos de videojuegos. | Si se agregan restricciones globales, seguir este patron. |
| `publicRegisterTournament` | Registro publico de equipos o participantes. | No aceptar logos publicos; equipos quedan `logoUrl: null`. |
| `generateGroups` | Distribuye equipos/participantes en grupos. | No regenerar sin entender impacto sobre standings y matches. |
| `generateFixture` | Crea partidos segun formato. | No sobrescribir partidos en vivo/finalizados. |
| `scoreMatch` / `closeMatch` | Guarda marcadores y ganador. | Debe recalcular standings y respetar empates permitidos. |
| `refreshStandings` | Recalcula tabla/ranking desde partidos. | Usar despues de cambios masivos o correcciones manuales. |
| `exportTournamentExcel` | Exporta inscripciones, tabla y partidos. | Revisar columnas si cambia modelo publico/admin. |

### Frontend administrativo

| Archivo | Responsabilidad | Cuidado al cambiar |
| --- | --- | --- |
| `EventsPage.tsx` | CRUD de eventos, ponentes para charlas/talleres, QR asistencia. | `COMPETITION` crea torneo, no evento. |
| `TournamentsPage.tsx` | CRUD de torneos, equipos, participantes, fixture, resultados. | Mantener defaults de deporte alineados con backend. |
| `AttendancePage.tsx` | Gestion administrativa de asistencia. | Respetar estados y certificado solo confirmado. |
| `SettingsPage.tsx` | Configuracion publica del sitio. | Logo del sitio no es logo de equipo. |
| `UsersPage.tsx` | Usuarios, roles y permisos. | Cambios de permisos deben sincronizarse con seed/backend. |

### Frontend publico

| Archivo | Responsabilidad | Cuidado al cambiar |
| --- | --- | --- |
| `PublicLayout.tsx` | Navegacion publica y marca. | Agregar rutas nuevas aqui y en `App.tsx`. |
| `PublicHomePage.tsx` | Home, proximos eventos y resumen de torneos. | Las competencias creadas desde Eventos navegan a Torneos. |
| `PublicSchedulePage.tsx` | Agenda filtrada por tipo. | No asumir que todo tiene ponente o registro. |
| `PublicEventFormPage.tsx` | Registro/asistencia publica de eventos. | Validaciones reales tambien deben estar en backend. |
| `PublicTournamentsPage.tsx` | Centro publico de torneos, partidos y tablas. | Mantener compatible con torneos por equipo e individuales. |
| `PublicTournamentFormPage.tsx` | Inscripcion publica de torneos. | No reintroducir carga de logo de equipo sin cambiar backend. |

## Rutas principales

Todas las rutas backend se montan bajo `/api`.

| Prefijo | Modulo | Uso |
| --- | --- | --- |
| `/api/auth` | Auth | Login, refresh, logout, usuario actual. |
| `/api/users` | Users | Usuarios, roles y permisos. |
| `/api/venues` | Venues | Espacios fisicos y fotos. |
| `/api/events` | Events | Agenda administrativa. |
| `/api/speakers` | Speakers | Ponentes. |
| `/api/talks` | Talks | Datos academicos de charlas/talleres. |
| `/api/tournaments` | Tournaments | Torneos, inscripciones, partidos, tablas. |
| `/api/hackathon` | Hackathon | Equipos, entregables, evaluaciones. |
| `/api/notifications` | Notifications | Envios y registros de notificaciones. |
| `/api/settings` | Settings | Configuracion publica. |
| `/api/audit` | Audit | Bitacora de acciones. |
| `/api/public` | Public | Endpoints sin login para portal publico. |
| `/api/health` | Health | Estado del backend. |

Los endpoints de escritura publicos usan `publicWriteRateLimiter`.

## Autenticacion, permisos y auditoria

El backend usa JWT de acceso y refresh tokens. El middleware de autenticacion
carga el usuario autenticado y el middleware de permisos valida permisos como
`tournaments.read`, `tournaments.write`, `events.write`.

Cuando agregues una ruta administrativa:

1. Usa `authMiddleware`.
2. Agrega `permissionMiddleware('<modulo>.<accion>')`.
3. Valida entrada con `validateRequest`.
4. Registra auditoria en el servicio si crea, actualiza o elimina datos.
5. Si requiere nuevo permiso, actualiza `backend/prisma/seed.ts`.

Los servicios usan `createAuditLog` para guardar cambios relevantes. La auditoria
no reemplaza logs tecnicos; sirve para saber quien hizo cambios de negocio.

## Base de datos y Prisma

El modelo vive en `backend/prisma/schema.prisma`. Las migraciones versionadas
viven en `backend/prisma/migrations`.

Reglas importantes:

- Nunca uses `prisma db push` contra produccion.
- En produccion se usa `prisma migrate deploy`.
- Cada cambio en `schema.prisma` debe tener migracion.
- No edites migraciones que ya fueron aplicadas en una base real.
- Antes de desplegar migraciones, haz backup de PostgreSQL.
- Si agregas un enum, revisa frontend labels y cualquier Zod `nativeEnum`.

Comandos utiles en desarrollo:

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run typecheck
npm run build
```

## Modelo mental de dominios

### Eventos

Un `Event` representa una actividad de agenda: charla, taller, actividad general,
ceremonia, hackathon u otro evento publicado en el cronograma.

Reglas especiales:

- `WORKSHOP` puede tener inscripcion previa publica.
- `TALK`, `ACADEMIC`, `WORKSHOP` y algunos flujos publicos tienen asistencia por QR.
- `COMPETITION` existe como opcion visual en el formulario administrativo, pero
  no debe persistirse como `Event`. Al seleccionarlo desde Eventos se crea un
  `Tournament`. El backend tambien bloquea guardar `EventType.COMPETITION` por API.

Por que: las competencias necesitan equipos, participantes, partidos, tablas,
resultados, inscripciones y exportaciones. Esa logica ya vive en Torneos.

### Charlas y talleres

Las charlas/talleres usan dos tablas:

- `Event`: fecha, hora, lugar, estado, descripcion.
- `Talk`: tema y ponente asociado.

En frontend, `EventsPage` muestra campos de ponente solo si el tipo es `TALK` o
`WORKSHOP`. Si agregas otro tipo con ponente, actualiza esa condicion y revisa
`TalksPage`.

### Asistencia

`Attendance` puede estar asociada a un usuario registrado o a datos libres
capturados por formulario publico.

Estados:

- `REGISTERED`: preinscrito.
- `CHECKED_IN`: asistencia confirmada.
- `CANCELLED`: registro cancelado.

El check-in publico esta limitado por ventana de tiempo:

- Abre 30 minutos antes del inicio.
- Cierra 30 minutos despues del fin.

El certificado solo se genera para asistencias `CHECKED_IN`.

### Torneos y competencias

`Tournament` maneja deportes/competencias, equipos, participantes, grupos,
partidos, rankings y exportacion.

Campos clave:

- `sport`: disciplina (`FUTBOL`, `MARATON_PROGRAMACION`, `CAPTURA_BANDERA`, etc.).
- `mode`: `TEAM` o `INDIVIDUAL`.
- `format`: `GROUPS`, `KNOCKOUT`, `ROUND_ROBIN`, `MIXED`.
- `status`: controla visibilidad y registro publico.
- `restrictionGroup`: restringe inscripciones incompatibles, usado para videojuegos.

Reglas especiales:

- `MARATON_PROGRAMACION` y `CAPTURA_BANDERA` son torneos por equipos.
- Torneos de videojuegos son individuales y requieren `videoGameTitle`.
- El registro publico de equipos no acepta logos. Nuevos equipos publicos quedan
  con `logoUrl: null`.
- Si se cambia una disciplina, revisa `normalizeInput`, labels de frontend,
  formularios publicos, exportacion y fixture.

Estados publicados:

- `REGISTRATION_OPEN`, `IN_PROGRESS`, `FINISHED` aparecen en el panel publico.
- `DRAFT` no se publica.
- `CANCELLED` no recibe inscripciones.

### Hackathon

El modulo de hackathon tiene su propio flujo de equipos, entregables y evaluacion.
No se debe mezclar con torneos salvo que explicitamente se quiera mover reglas
de negocio.

### Configuracion publica

`settings` controla marca, textos y logo del sitio publico. No confundir con
logos de equipos. El logo de sitio sigue existiendo; el logo de equipos en
registro publico de torneos fue retirado.

## Flujo: crear competencia desde Eventos

Pantalla: `frontend/src/pages/Events/EventsPage.tsx`.

1. El usuario abre "Nuevo evento".
2. Selecciona tipo `Competencia`.
3. La pantalla muestra aviso: no se guardara como evento.
4. El usuario define disciplina, formato y cupos de torneo.
5. Al guardar, frontend llama `createTournamentRequest`.
6. Se crea un `Tournament` con nombre, descripcion, lugar y horario capturados.
7. Se muestra mensaje: la competencia se creo en Torneos.
8. El backend bloquea cualquier intento directo de guardar `EventType.COMPETITION`
   como `Event`.

Esto evita duplicar la Maraton de programacion como evento y como torneo.

## Flujo: registro publico de torneo

Pantalla: `frontend/src/pages/Public/PublicTournamentFormPage.tsx`.
Endpoint: `POST /api/public/tournaments/:tournamentId/register`.

1. El formulario carga el torneo por id o slug.
2. Si el torneo es por equipos, pide nombre del equipo, cantidad de integrantes
   y capitan.
3. No pide ni envia logo.
4. El backend valida correos/codigos duplicados dentro de la inscripcion.
5. Valida cupos, maximo de integrantes y duplicados contra otros equipos.
6. Crea `Team` y `TeamMember`, con `status: APPROVED`.
7. Para torneos individuales, exige exactamente un participante.

Si cambias este flujo, revisa tambien:

- `publicTournamentRegistrationSchema`
- `publicRegisterTournament`
- `TournamentTeam.logoUrl`
- exportacion Excel de torneos
- componentes publicos que muestren miembros o equipos

## Flujo: asistencia publica

Rutas:

- `GET /api/public/events/:eventId/form`
- `GET /api/public/events/:eventId/form-qr.svg`
- `POST /api/public/events/:eventId/register`
- `POST /api/public/events/:eventId/check-in`

Detalles:

- `register` solo aplica para talleres (`WORKSHOP`).
- `check-in` aplica a tipos permitidos por `assertPublicEventType`.
- El endpoint acepta id, slug o slug derivado del titulo.
- El check-in crea registro si no existia y actualiza si ya existia.
- El QR contiene un link al formulario publico, no credenciales.

## Frontend

### Rutas publicas

En `frontend/src/App.tsx`:

- `/public`: home publica.
- `/public/cronograma`: agenda completa.
- `/public/charlas`: agenda filtrada por charlas.
- `/public/talleres`: agenda filtrada por talleres.
- `/public/competencias`: agenda filtrada por competencias si existieran.
- `/public/torneos`: centro de torneos.
- `/public/eventos/:eventId/inscripcion`: registro de taller.
- `/public/eventos/:eventId/asistencia`: check-in publico.
- `/public/torneos/:tournamentId/inscripcion`: registro publico de torneo.

### Panel administrativo

Las rutas administrativas estan protegidas por `ProtectedRoute` y se renderizan
dentro de `AppLayout`.

Si agregas una pantalla:

1. Crear pagina en `frontend/src/pages`.
2. Crear API client en `frontend/src/api` si hace falta.
3. Agregar ruta en `App.tsx`.
4. Agregar item de menu en `Sidebar.tsx`.
5. Agregar permisos en backend/seed si es un modulo nuevo.

### Cliente HTTP

`frontend/src/api/client.ts` configura Axios:

- `VITE_API_URL` define base URL.
- Si hay token, agrega `Authorization: Bearer ...`.
- `getApiErrorMessage` transforma errores Zod/API en mensajes legibles.

No llames `fetch` directo desde pantallas si ya existe un cliente en `api/`.
Mantener contratos centralizados reduce roturas.

### Labels

`frontend/src/utils/labels.ts` traduce enums a texto. Cada enum nuevo en Prisma
normalmente requiere label en frontend.

Checklist al agregar enum:

- `schema.prisma`
- migracion
- `npm run prisma:generate`
- labels frontend
- selects que usan `Object.keys(labels)`
- filtros publicos/administrativos
- validaciones especiales del service

## Backend: errores y respuestas

Los servicios lanzan `AppError(message, statusCode, code)`. El middleware de
errores responde JSON consistente. Usa codigos estables (`TEAM_LIMIT_REACHED`,
`COMPETITION_IS_TOURNAMENT`, etc.) para que frontend pueda diferenciar casos si
despues se necesita.

No retornes errores crudos de Prisma al usuario. Envuelve reglas esperadas con
`AppError`.

## Seguridad

- La base de datos no se publica fuera de Docker.
- Rutas administrativas requieren JWT y permisos.
- Formularios publicos tienen rate limit.
- Helmet/CORS se configuran en backend.
- El Caddyfile agrega cabeceras basicas de seguridad.
- No subir `.env.production`.
- No ejecutar `docker compose down -v` en produccion.

## Despliegue en Ubuntu Server

La guia operativa esta en `deploy/README.md`. Resumen:

```bash
git pull
docker compose --env-file deploy/.env.production up -d --build
docker compose --env-file deploy/.env.production ps
docker compose --env-file deploy/.env.production logs -f backend
```

Antes de migraciones:

```bash
mkdir -p backups
docker compose --env-file deploy/.env.production exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backups/semana_ingenieria.sql
```

Variables criticas:

- `RUN_MIGRATIONS=true`: aplica migraciones versionadas al iniciar backend.
- `RUN_SEED=false`: mantener falso salvo primer despliegue o seed intencional.
- `FRONTEND_VITE_API_URL=/api`: recomendado detras de Caddy.
- `BACKEND_CORS_ALLOWED_ORIGINS`: debe coincidir con dominio/IP publica.

## Como hacer cambios sin romper

### Cambio en base de datos

1. Editar `backend/prisma/schema.prisma`.
2. Crear migracion.
3. Ejecutar `npm run prisma:generate`.
4. Revisar servicios y schemas afectados.
5. Agregar/actualizar labels frontend si toca enums.
6. Correr `npx prisma validate`, typecheck y build.
7. En produccion, backup antes de desplegar.

### Nuevo endpoint

1. Crear schema Zod.
2. Crear funcion service.
3. Crear controller.
4. Agregar route con auth/permiso/validacion.
5. Agregar API client frontend.
6. Agregar auditoria si escribe datos.
7. Probar error y caso exitoso.

### Nuevo tipo de evento

1. Agregar enum/migracion.
2. Agregar label.
3. Definir si es agenda real o si debe mapear a otro dominio.
4. Revisar `EventsPage`, `PublicSchedulePage`, `PublicHomePage`.
5. Revisar `attendance.service.ts` si requiere QR/asistencia.
6. Revisar `talk.service.ts` si tendra ponente.

### Nueva disciplina de torneo

1. Agregar enum `Sport` y migracion.
2. Agregar label.
3. Actualizar `getDefaultMode`, `getDefaultRulePreset`, restricciones de modo.
4. Revisar `defaultFormatForSport` en frontend.
5. Revisar fixture, standings y si permite empate.
6. Revisar panel publico e iconos.
7. Revisar exportacion Excel.

### Cambios en formularios publicos

1. Cambiar frontend.
2. Cambiar schema publico backend.
3. Cambiar service publico.
4. Revisar rate limit y mensajes de error.
5. Confirmar que no se confia solo en frontend para bloquear campos.

## Comandos de verificacion

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

Backend:

```bash
cd backend
npm run prisma:generate
npx prisma validate
npm run typecheck
npm run build
```

Docker local/servidor:

```bash
docker compose --env-file deploy/.env.production config
docker compose --env-file deploy/.env.production up -d --build
docker compose --env-file deploy/.env.production ps
```

## Problemas comunes

### El frontend no ve cambios de API

Revisar `FRONTEND_VITE_API_URL`. En produccion se recomienda `/api`. Si se cambia
esta variable hay que reconstruir frontend porque Vite la inyecta en build.

### Prisma no reconoce un enum nuevo

Ejecutar:

```bash
cd backend
npm run prisma:generate
```

Si falla en produccion, revisar que la migracion este en Git y que
`RUN_MIGRATIONS=true`.

### Un formulario publico acepta datos que ya no deberia

No basta con quitar campos del frontend. Tambien hay que quitar o ignorar campos
en Zod/backend. Ejemplo actual: logos de equipos publicos se quitaron del form,
del request frontend, del schema publico y se guardan como `logoUrl: null`.

### No aparece una competencia publica

Las competencias creadas desde Eventos realmente son `Tournament`. Deben verse
en `/public/torneos`, no en `/public/competencias`, salvo que se cree un evento
real de otro tipo. Para publicarse, el torneo debe estar en `REGISTRATION_OPEN`,
`IN_PROGRESS` o `FINISHED`.

## Convenciones de codigo

- Mantener reglas de negocio en services.
- No duplicar validaciones complejas solo en frontend.
- Usar Zod para entradas.
- Usar Prisma con `deletedAt: null` o `onlyActive` para datos activos.
- Agregar auditoria en escrituras administrativas.
- Usar labels centralizados para enums.
- Evitar refactors grandes junto con cambios funcionales pequenos.
- Preferir cambios compatibles con datos existentes.

## Archivos que conviene leer antes de tocar cada area

Eventos:

- `backend/src/modules/events/event.service.ts`
- `backend/src/modules/events/event.schemas.ts`
- `frontend/src/pages/Events/EventsPage.tsx`
- `frontend/src/api/events.api.ts`

Asistencia:

- `backend/src/modules/attendance/attendance.service.ts`
- `backend/src/modules/attendance/attendance.schemas.ts`
- `frontend/src/pages/Attendance/AttendancePage.tsx`
- `frontend/src/pages/Public/PublicEventFormPage.tsx`

Torneos:

- `backend/src/modules/tournaments/tournament.service.ts`
- `backend/src/modules/tournaments/tournament.schemas.ts`
- `frontend/src/pages/Tournaments/TournamentsPage.tsx`
- `frontend/src/pages/Public/PublicTournamentFormPage.tsx`
- `frontend/src/pages/Public/PublicTournamentsPage.tsx`

Publico:

- `backend/src/modules/public/public.routes.ts`
- `frontend/src/pages/Public/PublicLayout.tsx`
- `frontend/src/pages/Public/PublicHomePage.tsx`
- `frontend/src/pages/Public/PublicSchedulePage.tsx`

Deploy:

- `docker-compose.yml`
- `deploy/README.md`
- `deploy/Caddyfile`
- `deploy/.env.production.example`
