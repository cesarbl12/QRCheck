# QRCheck

Sistema de control de asistencia por código QR. Una tablet montada en pared (en modo
kiosko) corre una PWA en modo "escáner" donde los empleados escanean su gafete QR para
registrar su entrada y salida automáticamente. Un panel de administración aparte permite
gestionar empleados y consultar la asistencia.

## ¿Qué hace el sistema?

- **Autenticación por rol**: dos tipos de usuario, `ADMIN` (panel de gestión) y `SCANNER`
  (la tablet de pared), cada uno con acceso solo a lo que le corresponde.
- **Registro de empleados**: nombre, puesto, contacto, RFC y foto (se puede subir desde
  archivo o tomar con la cámara). Se pueden editar o desactivar (baja lógica, conserva su
  historial de asistencias).
- **Gafete con QR**: al registrar un empleado se genera un código QR único (y revocable)
  que sirve como credencial física. Se puede imprimir un gafete con foto, nombre, puesto
  y QR (el RFC no aparece en el gafete impreso).
- **Escaneo de asistencia**: la pantalla del escáner solo muestra la cámara enmarcada en
  un recuadro; al escanear un gafete, el sistema decide automáticamente si es una entrada
  o una salida según el último registro del empleado ese día (alternancia automática, sin
  botones que elegir).
- **Horario opcional**: cada empleado puede tener una hora de entrada/salida asignada;
  si la tiene, el sistema calcula puntualidad y horas extra. Si no, solo se registran los
  horarios crudos.
- **Dashboard de asistencia**: tarjetas con totales (horas trabajadas, tardanzas, jornadas
  sin cerrar) y un resumen por empleado, organizado por catorcena (periodos de 14 días
  configurables desde la interfaz, con navegación para consultar catorcenas anteriores).
- **Registro detallado**: bitácora completa de cada escaneo, filtrable por empleado y
  rango de fechas, independiente del periodo de catorcena.

## Stack técnico

- **Backend**: NestJS + TypeScript, PostgreSQL vía Prisma ORM, autenticación JWT.
- **Frontend**: React + Vite, PWA instalable (`vite-plugin-pwa`), `html5-qrcode` para el
  escaneo.
- **Infraestructura local**: PostgreSQL vía Docker Compose.

## Estructura del repo

```
backend/     API NestJS (auth, empleados, asistencia, configuración)
frontend/    PWA en React (login, escáner, panel de administración)
docker-compose.yml   PostgreSQL para desarrollo local
```

## Cómo correrlo localmente

1. Levantar PostgreSQL:
   ```bash
   docker compose up -d
   ```
2. Backend:
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run start:dev
   ```
3. Frontend (en otra terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
4. Abrir `http://localhost:5173`.

Cada carpeta (`backend/`, `frontend/`) tiene su propio `.env.example` con las variables
necesarias.

## Credenciales de desarrollo

Generadas por `npx prisma db seed` a partir de las variables `ADMIN_USERNAME` /
`ADMIN_PASSWORD` / `SCANNER_USERNAME` / `SCANNER_PASSWORD` en `backend/.env`:

| Rol | Usuario | Contraseña |
|---|---|---|
| Admin | `admin` | `admin123` |
| Escáner | `scanner-tablet-1` | `scanner123` |

> Estas son credenciales de desarrollo. Antes de usar el sistema en producción, cambia
> `ADMIN_PASSWORD`, `SCANNER_PASSWORD` y `JWT_SECRET` en `backend/.env` y vuelve a correr
> el seed.

## Estado

Autenticación, gestión de empleados (con RFC y foto), gafetes QR, escaneo con alternancia
automática, y dashboard de asistencia con catorcenas ya están implementados y probados
localmente. Pendiente: despliegue a producción.
