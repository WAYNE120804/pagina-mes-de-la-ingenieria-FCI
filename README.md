# Plantilla Programa

Plantilla base para crear nuevos programas con frontend React/Vite/Tailwind y backend Express/TypeScript.

## Estructura

- `frontend`: interfaz base con layout, tema visual y componentes comunes.
- `backend`: API Express minima con middlewares compartidos y endpoint de salud.
- `deploy`: archivos base para despliegue con Caddy y Docker.

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

## Punto de partida

La plantilla no incluye reglas de negocio, autenticacion, modelos ni pantallas especificas. Agrega los nuevos modulos desde `frontend/src/pages`, `backend/src/modules` y `backend/prisma/schema.prisma`.
