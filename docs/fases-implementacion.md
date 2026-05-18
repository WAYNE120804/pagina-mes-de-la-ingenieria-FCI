# Fases de implementacion - Semana de Ingenieria

Este orden asume que PostgreSQL y `.env` ya estan configurados. La primera entrega tecnica debe cerrar Prisma: modelo, migracion y cliente generado.

## Fase 1 - Base tecnica

Objetivo: dejar el backend listo para construir modulos reales.

- Estado: completada.
- Definido `backend/prisma/schema.prisma`.
- Ejecutada migracion inicial contra la base de datos.
- Generado Prisma Client.
- Creados seeds minimos: roles, permisos, programas, espacios.
- Validado health check y conexion a PostgreSQL.

Comandos esperados:

```bash
cd backend
npm run prisma:migrate
npm run prisma:generate
npm run build
```

## Fase 2 - Autenticacion, usuarios y roles

Objetivo: permitir acceso seguro al panel.

- Estado: completada.
- Login, logout y refresh token implementados.
- Hash de contrasenas con bcrypt.
- Middleware `authMiddleware`, `roleMiddleware` y `permissionMiddleware`.
- CRUD backend de usuarios.
- Pantalla frontend de login, rutas protegidas y listado de usuarios.
- Auditoria de login, logout, creacion, actualizacion y eliminacion de usuarios.

Entidades principales:

- `User`
- `Role`
- `Permission`
- `UserRoleAssignment`
- `RefreshSession`
- `AcademicProgram`
- `AuditLog`

## Fase 3 - Eventos, charlas y asistencia

Objetivo: administrar la agenda academica y registrar asistencia.

- Estado: fase 3A, 3B y 3C completadas.
- CRUD backend de eventos generales y especificos.
- CRUD backend de espacios con capacidad.
- Asignacion backend de responsables por evento.
- CRUD backend de ponentes y charlas.
- Registro manual de asistencia desde backend y frontend.
- Preregistro de asistencia con QR y codigo temporal.
- Escaneo/validacion por QR o codigo temporal.
- Endpoint SVG para renderizar QR.
- Estadisticas de asistencia por evento.
- Prevencion de asistencia duplicada por usuario o correo.
- Validacion de capacidad maxima del evento.
- Frontend para espacios, eventos, charlas, asistencia, QR, escaneo y metricas.
- Edicion y eliminacion desde frontend para espacios, eventos, ponentes y charlas.
- Filtros administrativos en eventos, espacios y charlas.
- Vista detalle de evento con asistentes, charla asociada y responsables.
- Asignacion de responsables desde frontend.
- Certificado HTML imprimible para asistencias confirmadas.
- Fase 3D: formularios publicos para asistencia de charlas y talleres.
- Fase 3D: formulario publico de inscripcion previa para talleres.
- Fase 3D: QR y link publico generados desde el modulo de asistencia.
- Fase 3D: asistencia publica disponible desde 30 minutos antes hasta 30 minutos despues del horario del evento.
- Fase 3D: registro de nombre, codigo o cedula y cargo: estudiante, profesor, administrativo, graduado u otro.
- Fase 3D: en talleres, si el asistente ya estaba inscrito puede confirmar por codigo o cedula; si no estaba inscrito, se registra y queda confirmado.
- Pendiente futuro: certificados en PDF y diseno final de impresion institucional.

Entidades principales:

- `Event`
- `Venue`
- `EventResponsible`
- `SpeakerProfile`
- `Talk`
- `Attendance`

## Fase 4 - Torneos deportivos

Objetivo: soportar inscripciones, partidos y tablas automaticas.

- Estado: fase 4A, 4B, 4C y 4D completadas.
- Fase 4A: modelo Prisma ajustado para competencias por equipos e individuales.
- Fase 4A: deportes previstos configurados: futbol, baloncesto, videojuegos, ping pong, ajedrez y robotica.
- Fase 4A: videojuegos separados por juego (`FIFA` y `CALL_OF_DUTY`) con grupo de restriccion para impedir doble inscripcion en la siguiente subfase.
- Fase 4A: CRUD backend de torneos con reglas base por deporte, modalidad, formato, limites y auditoria.
- Fase 4A: frontend `/torneos` para crear, editar, eliminar, filtrar y listar torneos con opciones en espanol.
- Fase 4B: inscripcion de equipos para futbol, baloncesto y robotica.
- Fase 4B: inscripcion individual para videojuegos, ping pong y ajedrez.
- Fase 4B: validacion de maximo de equipos, maximo de integrantes y maximo de participantes.
- Fase 4B: validacion de usuarios repetidos dentro de un mismo torneo.
- Fase 4B: bloqueo para que un participante no pueda inscribirse en FIFA y Call of Duty al mismo tiempo.
- Fase 4B: retiro de equipos y participantes desde backend y frontend.
- Fase 4C: generacion de grupos para formatos con fase de grupos.
- Fase 4C: asignacion automatica balanceada de equipos o participantes a grupos.
- Fase 4C: generacion automatica de cruces todos contra todos por grupo o por torneo.
- Fase 4C: generacion inicial de llaves para eliminacion directa segun cantidad de inscritos.
- Fase 4C: creacion manual de partidos y programacion basica.
- Fase 4C: vista visual de grupos, cruces e historial de partidos desde `/torneos`.
- Fase 4D: registro de marcador en vivo.
- Fase 4D: cierre de partidos con ganador automatico o empate cuando el deporte lo permite.
- Fase 4D: recalculo automatico de tablas de posiciones por equipos e individuales.
- Fase 4D: ranking por puntos, diferencia, puntos a favor y puntos en contra.
- Fase 4D: clasificacion automatica basica por ranking.
- Fase 4D: exportacion Excel `.xlsx` con ranking y partidos.
- Pendiente futuro: generacion automatica de semifinales/final a partir de clasificados y reportes PDF.

Entidades principales:

- `Tournament`
- `TournamentParticipant`
- `TournamentGroup`
- `Team`
- `TeamMember`
- `Match`
- `TournamentStanding`

## Fase 5 - Hackathon y evaluacion

Objetivo: gestionar retos, equipos, entregables, jurados y ranking.

- Estado: fase 5A y 5B completadas.
- Fase 5A: CRUD backend de hackathones con estado, descripcion y fechas.
- Fase 5A: CRUD backend de empresas para retos.
- Fase 5A: CRUD backend de retos por empresa asociados a un hackathon.
- Fase 5A: CRUD backend de equipos e integrantes del hackathon.
- Fase 5A: validacion de integrantes existentes, lider dentro del equipo y bloqueo de doble inscripcion en el mismo hackathon.
- Fase 5A: frontend `/hackathon` para crear, editar, eliminar, filtrar y gestionar hackathones, empresas, retos y equipos.
- Fase 5A: opciones visibles en espanol y auditoria de cambios principales.
- Fase 5B: CRUD backend de entregables por equipo.
- Fase 5B: tipos soportados: PDF, ZIP, repositorio GitHub, video, presentacion y otros.
- Fase 5B: validacion de enlaces URL y pertenencia del entregable al equipo/hackathon.
- Fase 5B: frontend para registrar, editar, abrir y eliminar entregables desde `/hackathon`.
- Fase 5B: eliminacion logica de entregables al eliminar equipos o hackathones.
- Pendiente futuro: subida fisica a S3/R2/MinIO y enlaces firmados.
- Pendiente 5C: rubricas, jurados y evaluaciones.
- Pendiente 5D: calculo automatico de puntajes, ranking y ganadores.
- Retos por empresa.
- Equipos e integrantes.
- Carga de entregables.
- Rubricas con pesos.
- Evaluacion por jurado.
- Calculo de puntaje final y ranking.

Entidades principales:

- `HackathonEvent`
- `Company`
- `HackathonChallenge`
- `HackathonTeam`
- `HackathonTeamMember`
- `HackathonDeliverable`
- `JurorProfile`
- `EvaluationCriterion`
- `Evaluation`
- `EvaluationScore`

## Fase 6 - Realtime y notificaciones

Objetivo: publicar cambios operativos en vivo.

- Socket.IO para marcadores.
- Asistencia en tiempo real.
- Ranking de hackathon.
- Notificaciones por websocket.
- Preparar cola para email/push si se necesita.

Entidades principales:

- `Notification`
- `NotificationRecipient`

Eventos sugeridos:

```txt
match:update
attendance:new
hackathon:score
notification:new
```

## Fase 7 - Reportes, archivos y cierre operativo

Objetivo: consolidar salida administrativa y almacenamiento.

- Exportacion PDF, Excel y CSV.
- Reportes de asistencia, ganadores, torneos y jurados.
- Integracion con S3 compatible, R2 o MinIO.
- Dashboard administrativo.
- Backups, logs, monitoreo y health checks avanzados.

Entidades principales:

- `StorageAsset`
- `ReportExport`
- `AuditLog`

## Prioridad recomendada para el MVP

1. Prisma + migracion inicial.
2. Autenticacion + usuarios + roles.
3. Eventos + asistencia.
4. Torneos deportivos.
5. Hackathon + evaluaciones.
6. Realtime, notificaciones y reportes.
