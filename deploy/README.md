# Deploy en Ubuntu Server

La aplicacion queda contenida en cuatro servicios:

- `frontend`: compilacion React servida por Nginx.
- `backend`: API Node/Express con Prisma.
- `postgres`: base de datos persistente en el volumen `postgres_data`.
- `caddy`: proxy publico con HTTPS automatico para frontend y API.

## Requisitos del servidor

- Ubuntu Server 22.04 LTS, 24.04 LTS o una version soportada por Docker Engine.
- Docker Engine y el plugin Docker Compose instalados desde el repositorio oficial de Docker.
- Dos registros DNS apuntando a la IP publica de la VM: uno para la web y otro para el API.
- Puertos TCP `80` y `443` disponibles hacia Internet para que Caddy genere y renueve certificados HTTPS.
- Puerto `22` restringido a las IP desde las que administraras el servidor.

Guias oficiales:

- Docker Engine para Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- HTTPS automatico de Caddy: https://caddyserver.com/docs/automatic-https

## Antes de subir a GitHub

El backend aplica migraciones versionadas al iniciar. Toda modificacion de
`backend/prisma/schema.prisma` debe tener su migracion correspondiente dentro
de `backend/prisma/migrations/` y ambos deben ir al repositorio.

No subas claves ni contrasenas. El archivo real `deploy/.env.production` esta
ignorado por Git; solo se versiona el ejemplo.

## 1. Clonar y configurar

En la VM:

```bash
git clone https://github.com/USUARIO/REPOSITORIO.git semanaIngenieria26
cd semanaIngenieria26
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```

Reemplaza obligatoriamente:

- `APP_DOMAIN` y `API_DOMAIN`.
- `FRONTEND_VITE_API_URL`, usando `https://API_DOMAIN/api`.
- `POSTGRES_PASSWORD` y la misma clave codificada si contiene caracteres especiales en `BACKEND_DATABASE_URL`.
- `BACKEND_JWT_ACCESS_SECRET`, con una cadena aleatoria larga.
- `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD`.

Ejemplo para generar secretos:

```bash
openssl rand -base64 48
```

## 2. Primer despliegue

```bash
docker compose --env-file deploy/.env.production config
docker compose --env-file deploy/.env.production up -d --build
docker compose --env-file deploy/.env.production ps
```

`RUN_MIGRATIONS=true` ejecuta `prisma migrate deploy` al iniciar el backend.
Esto aplica solo migraciones subidas al repositorio y conserva los datos.

Para crear roles, permisos y el administrador inicial una sola vez:

```bash
docker compose --env-file deploy/.env.production exec backend npm run db:seed
```

No dejes `RUN_SEED=true` de forma permanente.

## 3. Actualizar la aplicacion

Antes de una actualizacion con cambios de base de datos, crea un respaldo.
Luego ejecuta:

```bash
git pull
docker compose --env-file deploy/.env.production up -d --build
docker compose --env-file deploy/.env.production ps
```

## 4. Respaldo y restauracion de PostgreSQL

Respaldo:

```bash
mkdir -p backups
docker compose --env-file deploy/.env.production exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backups/semana_ingenieria.sql
```

Restauracion sobre una base preparada:

```bash
cat backups/semana_ingenieria.sql | docker compose --env-file deploy/.env.production exec -T postgres sh -c 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'
```

## 5. Operacion y diagnostico

```bash
docker compose --env-file deploy/.env.production logs -f backend
docker compose --env-file deploy/.env.production logs -f caddy
docker compose --env-file deploy/.env.production restart backend
docker compose --env-file deploy/.env.production down
```

No uses `docker compose down -v` en produccion: elimina el volumen con la base
de datos.

## Seguridad a tener en cuenta

- Expone solamente `80` y `443`; PostgreSQL queda dentro de la red Docker.
- Haz respaldos antes de desplegar migraciones.
- Renueva claves si un archivo `.env` llega al repositorio por error.
- Revisa el firewall: Docker puede publicar puertos sin pasar por algunas reglas de `ufw`.
- Verifica despues del despliegue `https://APP_DOMAIN` y `https://API_DOMAIN/api/health`.
