# Sistema de Gestión Comercial y Ventas

Sistema web para gestión comercial, mostrador de ventas, stock, cuentas corrientes y control de accesos.

## Tecnologías Principales

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Lucide Icons, Chart.js.
- **Backend & API:** Next.js Route Handlers (`src/app/api/`) organizados por servicios de dominio (`src/services/`).
- **Base de Datos & ORM:** SQLite / Turso con **Drizzle ORM**.
- **Autenticación & Seguridad:** JWT (`jose`), contraseñas con hash (`scrypt` nativo) y cookies `HttpOnly`.

---

## Estructura del Backend y Proyecto

```text
src/
├── app/                  # Rutas de interfaz y Endpoints API (Next.js App Router)
│   ├── api/              # Controladores REST: auth, categorias, clientes, pagos, productos, usuarios, ventas
│   ├── clientes/         # Pantalla de gestión de clientes y cuentas corrientes
│   ├── login/            # Autenticación y acceso
│   ├── productos/        # Catálogo, inventario y movimientos
│   ├── usuarios/         # Administración de usuarios del sistema
│   └── ventas/           # Mostrador de ventas y emisión de comprobantes
├── components/           # Componentes UI reutilizables (Sidebar, Header, Layout)
├── context/              # Contextos globales de React (AuthContext)
├── db/                   # Esquemas Drizzle, cliente de conexión y scripts de migración/seed
│   ├── schema.ts         # Definición de tablas y relaciones Drizzle
│   ├── deploy.ts         # Script de despliegue automático de migraciones
│   └── datos-prueba.ts   # Datos de prueba para inicializar el sistema
├── lib/                  # Utilidades compartidas (auth, formateo en centavos, sesiones, respuestas API)
└── services/             # Lógica de negocio pura desacoplada del framework web
    ├── categorias.service.ts
    ├── clientes.service.ts
    ├── facturas.service.ts
    ├── pagos.service.ts
    ├── productos.service.ts
    ├── stock.service.ts
    ├── tablero.service.ts
    └── usuarios.service.ts
```

---

## Cómo Ejecutar el Proyecto

### 1. Variables de Entorno
Asegurarse de tener configurado el archivo `.env` (puede copiarse de `.env.example`):
```env
DATABASE_URL="file:local.db"
SESSION_SECRET="clave-secreta-de-al-menos-32-caracteres"
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Migraciones y Base de Datos
```bash
npm run db:deploy
```

### 4. Iniciar en Desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Credenciales de Prueba:
- **Administrador:** `admin@comercio.com` / `admin123`
- **Vendedor:** `vendedor@comercio.com` / `vendedor123`

