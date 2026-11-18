# Sistema de Ventas y Gestión Comercial — Segundo Parcial

**Materia:** Programación IV — TUP 2026  
**Alumno:** Mikael Paz  
**Legajo:** 61732  

---

## 1. Descripción de la Aplicación

Aplicación web integral para la gestión comercial y mostrador de ventas de un comercio minorista/mayorista. El sistema resuelve en tiempo real:

1. **Ventas y Facturación:** Borrador interactivo de venta, altas de clientes sobre la marcha, validación atómica de existencias, cálculo automático de subtotales/totales y emisión de comprobantes inmutables.
2. **Productos y Stock:** Catálogo con código único, precios en centavos enteros, stock actual y auditoría de movimientos de almacén (diferenciando ingresos iniciales, ajustes manuales y salidas por ventas).
3. **Clientes y Cuentas Corrientes:** Control de clientes, cálculo en tiempo real del saldo adeudado y registro de cobranzas parciales o totales (con validación de límite de deuda).
4. **Usuarios y Permisos:** Autenticación por sesión protegida con cookie `HttpOnly`, contraseñas hasheadas (`scrypt`) y control de accesos basado en roles (**Administrador** y **Operador**).

---

## 2. Tecnologías Utilizadas

- **Frontend:** React 18 SPA con diseño moderno, componentes reactivos en tiempo real y soporte para impresión de comprobantes.
- **Backend:** Node.js con TypeScript y Express.
- **Base de Datos y Persistencia:** SQLite con modo WAL (Write-Ahead Logging) y claves foráneas activas, administrado a través de **Drizzle ORM** y `better-sqlite3`.
- **Seguridad:** Cifrado de contraseñas mediante derivación de claves `scrypt` con salt aleatorio (`node:crypto`), cookies de sesión `HttpOnly` y protección de rutas con validación de roles en el servidor.

---

## 3. Instrucciones de Instalación y Ejecución Local

### Requisitos previos
- Node.js versión 20 o superior.
- npm.

### Pasos

1. Situarse en la carpeta del proyecto:
   ```bash
   cd "practicos/61732 - Paz Mikael/parcial2"
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Inicializar y poblar la base de datos con los datos de prueba:
   ```bash
   npm run seed
   ```

4. Iniciar el servidor en modo desarrollo:
   ```bash
   npm run dev
   ```

5. Abrir el navegador en:
   ```
   http://localhost:3000
   ```

---

## 4. Credenciales de Acceso para Evaluación

| Perfil | Correo / Acceso | Contraseña | Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador** | `ana@ejemplo.com` | `admin123` | Acceso total + Gestión de usuarios |
| **Operador** | `lucia@ejemplo.com` | `operador123` | Ventas, catálogo, movimientos, clientes y pagos |
| **Inactivo** | `carlos@ejemplo.com` | `clave123` | Acceso denegado (usuario desactivado) |

---

## 5. Arquitectura y Reglas de Negocio Clave

- **Manejo de Moneda:** Todos los importes en base de datos y en la API REST se transmiten y almacenan como **centavos enteros** (ej. `$ 6.500,00` = `650000`) para evitar errores de redondeo inherentes a los números de punto flotante de IEEE 754.
- **Transaccionalidad Atómica:** Las operaciones críticas (como confirmar una venta o asentar un pago) se ejecutan dentro de una transacción `sqlite.transaction()`. Si una sola línea de producto carece de stock suficiente, la transacción se aborta inmediatamente, garantizando que no se descuenten unidades ni se genere deuda inconsistente.
- **Inmutabilidad de Comprobantes:** Los comprobantes de venta guardan copias históricas congeladas de la descripción del producto, el precio unitario y los datos del cliente al momento exacto de la operación. Posteriores modificaciones de precios en el catálogo no alteran el pasado.

---

## 6. Funcionalidades Implementadas

- [x] Autenticación con inicio y cierre de sesión.
- [x] Perfil de administrador y operador con verificación estricta en servidor.
- [x] CRUD y búsqueda de productos por código y nombre.
- [x] Bajas lógicas (activo/inactivo) en productos y usuarios.
- [x] Ajustes manuales de stock (entradas y salidas con motivo).
- [x] Historial detallado de movimientos de inventario.
- [x] CRUD de clientes y búsqueda por nombre o DNI/CUIT.
- [x] Cálculo derivado del saldo adeudado en cuenta corriente.
- [x] Cobranzas con validación que impide pagar más del saldo adeudado.
- [x] Borrador de venta interactivo con agregar/quitar ítems y cambio de cantidades.
- [x] Alta rápida de cliente desde la venta sin perder los productos cargados.
- [x] Formas de pago: Contado, Tarjeta y Cuenta Corriente.
- [x] Asignación atómica de número de comprobante único.
- [x] Vista e impresión de ticket/comprobante de venta (`window.print()`).

