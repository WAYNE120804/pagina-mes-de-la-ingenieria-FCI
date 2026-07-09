# Mes de la Ingenieria FCI

Aplicacion web para gestionar y publicar el Mes de la Ingenieria de la Facultad de Ciencias e Ingenieria.

## Estructura

- `frontend`: panel publico y panel administrativo en React/Vite/Tailwind.
- `backend`: API Express/TypeScript con Prisma y PostgreSQL.
- `deploy`: archivos para despliegue en Ubuntu Server con Docker Compose, PostgreSQL y Caddy.

## Desarrollo

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

## Verificacion

```bash
cd frontend && npm run build
cd backend && npm run build
```

## Documentacion tecnica

- [Guia del desarrollador](docs/guia-desarrollador.md): arquitectura, modulos,
  flujos criticos, reglas de negocio, despliegue y checklists para cambios.
- [Fases de implementacion](docs/fases-implementacion.md): historial funcional
  por fases.

## Despliegue

Consulta [deploy/README.md](deploy/README.md) para publicar la aplicacion en Ubuntu Server.
