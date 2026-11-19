# Guía Técnica para la Defensa del Segundo Parcial
## Sistema de Ventas y Gestión Comercial

**Alumno:** Mikael Paz (Legajo: 61732)  
**Cátedra:** Programación IV — TUP 2026  

---

## 1. Resumen Ejecutivo del Proyecto

El sistema es una solución comercial orientada a mostradores de venta que unifica el control de existencias, facturación, cuentas corrientes y perfiles de usuario. 

Fue diseñado bajo una arquitectura multicapa desacoplada:
- **Capa de Presentación:** SPA construida en **React**, reactiva, modular y con separación de estados (borrador de venta local vs. datos remotos del servidor).
- **Capa de Negocio y API:** **Express** con **TypeScript**, responsable de validar stock, roles, consistencia contable y reglas de autorización en cada solicitud.
- **Capa de Persistencia:** **SQLite** de alto rendimiento con **Drizzle ORM**, utilizando transacciones atómicas `ACID` y modo WAL (*Write-Ahead Logging*).

---

## 2. Decisiones Técnicas y de Diseño (¿Por qué se hizo así?)

### 2.1. ¿Por qué importes en centavos enteros (`precioVentaCentavos`)?
En JavaScript y la mayoría de los lenguajes, los números con coma flotante usan el estándar **IEEE 754**. Operaciones como `0.1 + 0.2` dan como resultado `0.30000000000000004`. En un sistema contable y de facturación, los errores de redondeo acumulados generan descuadres graves.  
*Solución implementada:* Se almacena y opera siempre en **centavos enteros** (ej. `$ 100,50` = `10050`). La interfaz solo realiza la división por 100 con fines visuales.

### 2.2. ¿Por qué transacciones atómicas en la venta y los pagos?
Al confirmar una venta ocurren 4 pasos críticos:
1. Validar existencias actuales.
2. Asignar el número correlativo de comprobante.
3. Descontar stock e insertar los movimientos de salida.
4. Generar el comprobante histórico con sus detalles.

Si alguno de estos pasos fallara a mitad de camino (por ejemplo, corte de energía o falta de stock en el segundo ítem), una base de datos sin transacciones dejaría comprobantes a medio crear o stock descontado sin venta. Gracias a `sqlite.transaction()`, si cualquier paso arroja una excepción, **toda la operación se revierte por completo (Rollback)**.

### 2.3. ¿Por qué inmutabilidad en los comprobantes de venta?
Un error común es guardar en el detalle de venta solo el `producto_id` y al consultar la factura hacer un `JOIN` con la tabla `productos` para obtener el nombre y el precio actual. Si al mes siguiente el precio del café sube de $ 5.000 a $ 8.000, los comprobantes del mes anterior se alterarían solos, arruinando los balances contables.  
*Solución implementada:* La tabla `detalles_venta` guarda una **fotocopia histórica** (`descripcion`, `precio_unitario_centavos` y `subtotal_centavos`) de cada ítem tal como existía en el instante exacto de la venta.

### 2.4. ¿Por qué el saldo de cuenta corriente es calculado y no una columna fija?
Guardar una columna `saldo` en la tabla `clientes` y sumar o restar manualmente en cada operación es susceptible a desincronizaciones por operaciones concurrentes.  
*Solución implementada:* El saldo es un **valor derivado**:
$$\text{Saldo} = \sum(\text{Ventas en Cuenta Corriente}) - \sum(\text{Pagos Registrados})$$
Se calcula dinámicamente o dentro de transacciones de pago, garantizando consistencia absoluta.

### 2.5. ¿Por qué `scrypt` para las contraseñas?
Las funciones de hash simples como MD5 o SHA-256 son demasiado veloces, lo que permite ataques de fuerza bruta mediante tablas arcoíris. Se utilizó el módulo nativo `node:crypto` con el algoritmo de derivación de claves **`scrypt`** y un *salt* criptográfico aleatorio de 16 bytes por cada usuario.

---

## 3. Estructura de Datos (Tablas y Relaciones)

```
+---------------+        +------------------+
|   usuarios    |        |    productos     |
+---------------+        +------------------+
| id (PK)       |        | id (PK)          |
| nombre        |        | codigo (UNIQUE)  |
| acceso (UQ)   |        | nombre           |
| contrasenaHash|        | precioVentaCent  |
| administrador |        | stockActual      |
| activo        |        | activo           |
+-------+-------+        +--------+---------+
        |                         |
        +-------------+           |
        |             |           |
+-------v-------+   +-v-----------v----+   +-------------------+
|    ventas     |   | movimientos_stock|   |      clientes     |
+---------------+   +------------------+   +-------------------+
| id (PK)       |   | id (PK)          |   | id (PK)           |
| numero (UQ)   |   | productoId (FK)  |   | nombre            |
| fecha         |   | detalleVenta(FK) |   | documento         |
| clienteId(FK) |   | tipo (E/S)       |   | telefono          |
| clienteNombre |   | cantidad         |   | correo            |
| formaPago     |   | motivo           |   +---------+---------+
| totalCentavos |   | origen (V/M/I)   |             |
+-------+-------+   +------------------+             |
        |                                            |
+-------v-----------+                      +---------v---------+
|  detalles_venta   |                      |       pagos       |
+-------------------+                      +-------------------+
| id (PK)           |                      | id (PK)           |
| ventaId (FK)      |                      | clienteId (FK)    |
| productoId (FK)   |                      | fecha             |
| descripcion       |                      | importeCentavos   |
| cantidad          |                      | observacion       |
| precioUnitCent    |                      +-------------------+
| subtotalCent      |
+-------------------+
```

---

## 4. Preguntas Típicas del Profesor y Cómo Responderlas

### P1: "¿Qué pasa si dos operadores intentan vender al mismo tiempo la última unidad disponible de un producto?"
> **Respuesta:** *"El backend maneja la venta dentro de una transacción atómica de SQLite con comprobación previa del stock en la base de datos (`stockActual >= cantidad`). El primer operador que confirme descontará la unidad mediante un update condicional. Cuando la transacción del segundo operador intente verificar el stock disponible, verá que es 0 y el servidor rechazará la venta arrojando un error HTTP `409 Conflict` con código `STOCK_INSUFICIENTE`, sin generar comprobantes parciales ni deuda."*

### P2: "¿Por qué un cliente no puede pagar más de lo que debe?"
> **Respuesta:** *"Antes de insertar el registro en la tabla `pagos`, el servidor consulta dentro de la transacción la deuda total histórica de ese cliente (`total ventas en cta cte - pagos anteriores`). Si el importe ingresado supera esa diferencia, la API responde con código `409` (`PAGO_EXCEDE_SALDO`), garantizando que ninguna cuenta corriente quede con saldo negativo a favor en este modelo."*

### P3: "¿Cómo resolviste que al dar de alta un cliente nuevo en medio de una venta no se pierdan los productos cargados?"
> **Respuesta:** *"En el frontend de React, los productos seleccionados forman parte del estado del componente (`itemsVenta`). El botón '+ Nuevo cliente' abre una ventana modal emergente. Al enviar el formulario, el cliente se guarda en el servidor vía `POST /api/clientes`, la respuesta nos devuelve el cliente recién creado con su nuevo ID, y el estado local selecciona automáticamente ese ID en el combo de clientes, manteniendo intacto el array `itemsVenta` en memoria."*

### P4: "¿Dónde se validan los permisos de administrador y operador?"
> **Respuesta:** *"En el servidor, a través del middleware `requerirAdmin`. Aunque un operador intente saltearse la interfaz gráfica y enviar una petición directa con Postman a `POST /api/usuarios`, el middleware extrae el token de la cookie de sesión, busca al usuario en la base de datos y, si `administrador === false`, interrumpe inmediatamente el flujo respondiendo `403 Forbidden`."*

### P5: "¿Qué ocurre con los comprobantes antiguos si se desactiva un producto?"
> **Respuesta:** *"La baja es lógica (`activo = false`). El producto ya no aparece disponible en las opciones de venta del mostrador, pero su fila sigue existiendo en la tabla `productos` y todas las relaciones foráneas con los comprobantes emitidos en el pasado se mantienen 100% íntegras."*

