# AxPark

**Gestor inteligente de parqueaderos**, un producto de [Axons](https://axonsia.com).

AxPark registra automáticamente las placas de los vehículos que entran a un parqueadero con una cámara IP y visión por computador, calcula tarifas, gestiona mensualidades y entrega reportes de caja. Está pensado para varios parqueaderos a la vez: cada negocio tiene sus usuarios, tarifas, clientes y detectores aislados del resto.

🌐 **App:** https://axpark.axonsia.com

## Cómo funciona

```
 Parqueadero A                    Parqueadero B                 Nube
 ┌─────────────────────┐          ┌─────────────────────┐
 │ Cámara IP (RTSP)    │          │ Cámara IP (RTSP)    │
 │        │            │          │        │            │
 │ Detector (Python)   │          │ Detector (Python)   │      ┌──────────────────────────┐
 │ YOLOv8 + OCR placas ├── HTTPS ─┼─────────────────────┼─────▶│ API NestJS (Vercel)      │──▶ Postgres (Neon)
 │ clave del detector A│          │ clave del detector B│      └──────────────────────────┘
 └─────────────────────┘          └─────────────────────┘                  ▲
                                                                            │
                     Operadores y administradores ──▶ App Next.js (Vercel) ─┘
```

1. **El detector** corre en un PC del parqueadero, lee la cámara por RTSP, detecta el vehículo con YOLOv8 y lee la placa colombiana (carro `ABC123` o moto `ABC12D`).
2. Envía la placa a la API con **la clave de ese detector**. La API deduce de la clave a qué parqueadero pertenece, así que un detector nunca puede escribir en otro negocio.
3. **Si se cae internet**, el detector guarda las placas en una cola local y las reenvía al volver, con la hora real en que se vieron.
4. Los operadores ven en la app los vehículos dentro, registran salidas con cobro automático y descargan recibos en PDF.

## Funcionalidades

- **Multi-parqueadero:** cada negocio está aislado. Roles: admin de plataforma, admin del negocio y operador.
- **Detección de placas** con cámara IP: modo sin ventana para operar 24/7, reconexión automática y cola offline.
- **Detectores por parqueadero:** cada uno con su propia clave, revocable, y su estado en vivo (en línea, sin señal).
- **Parqueo activo** con tiempo transcurrido, costo estimado y alertas de vehículos con más de 24 h dentro.
- **Tarifas** por fracción, hora, medio día y día, distintas para carro y moto.
- **Mensualidades** con vencimientos, renovación y recibos en PDF.
- **Reportes y cierre de caja**, exportables a Excel y PDF.
- **Seguridad:** JWT en todas las rutas, aislamiento por negocio verificado en el backend y restablecimiento de contraseñas por el administrador.

## Tecnología

| Parte | Stack |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · Motion |
| Backend | NestJS 10 · TypeORM · PostgreSQL · JWT (Passport) · Swagger |
| Detector | Python · OpenCV · Ultralytics YOLOv8 · fast-plate-ocr |
| Infraestructura | Vercel (app y API) · Neon (Postgres) · GitHub Actions |

## Estructura

```
axpark/
├── frontend/   App web (Next.js)
└── backend/    API (NestJS) + detector de placas (Python)
    ├── src/                     Código de la API
    ├── src/database/migrations  Migraciones de la base de datos
    ├── detector_placas.py       Detector: cámara → vehículo → placa
    └── detector_api.py          Envío a la API, cola offline y latido
```

## Correr en local

Requisitos: Node.js 20+, Docker (para Postgres) y Python 3.11+ (solo para el detector).

```bash
# 1. Base de datos
docker run -d --name axpark-db -e POSTGRES_USER=axpark -e POSTGRES_PASSWORD=axpark \
  -e POSTGRES_DB=axpark -p 5432:5432 postgres:16

# 2. API (http://localhost:3000, documentación en /docs)
cd backend
cp .env.example .env      # DATABASE_URL=postgresql://axpark:axpark@localhost:5432/axpark
npm install
npm run start:dev

# 3. App (http://localhost:3001)
cd ../frontend
cp .env.example .env      # NEXT_PUBLIC_API_URL=http://localhost:3000
npm install
npm run dev
```

Para crear el primer usuario, define `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` en `backend/.env` antes de arrancar la API.

### Detector de placas

1. En la app, entra como admin a **Negocio → Detectores de placas → Nuevo detector** y copia la clave.
2. En el PC del parqueadero:

```bash
cd backend
pip install -r requirements.txt
# En backend/.env: PARKING_API_URL, DETECTOR_API_KEY, TAPO_USER y TAPO_PASS
python detector_placas.py --tapo 192.168.1.50 --sin-api   # probar la lectura sin registrar
python detector_placas.py --tapo 192.168.1.50 --headless  # producción: sin ventana, 24/7
```

## Producción

- **API:** `NODE_ENV=production` desactiva `synchronize` y aplica las migraciones al arrancar. La API no arranca si `JWT_SECRET` es débil o si falta `CORS_ORIGIN`.
- **Cambios de esquema:** `npm run migration:generate -- src/database/migrations/NombreDelCambio`, y luego añadir la clase a `MIGRATIONS` en `src/database/typeorm.config.ts`.

---

Hecho por [Axons](https://axonsia.com), automatización con IA en Cúcuta, Colombia.
