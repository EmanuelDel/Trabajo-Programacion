CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_nombre_unique` ON `categorias` (`nombre`);--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tipo_documento` text DEFAULT 'DNI' NOT NULL,
	`documento` text NOT NULL,
	`nombre` text NOT NULL,
	`domicilio` text,
	`telefono` text,
	`email` text,
	`habilitado_cuenta_corriente` integer DEFAULT true NOT NULL,
	`limite_credito_centavos` integer,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clientes_documento_unique` ON `clientes` (`documento`);--> statement-breakpoint
CREATE TABLE `detalles_factura` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`factura_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`descripcion` text NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_unitario_centavos` integer NOT NULL,
	`subtotal_centavos` integer NOT NULL,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `facturas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero` integer NOT NULL,
	`fecha` text NOT NULL,
	`usuario_id` integer NOT NULL,
	`cliente_id` integer,
	`cliente_nombre` text NOT NULL,
	`cliente_documento` text,
	`forma_pago` text NOT NULL,
	`total_centavos` integer NOT NULL,
	`pago_monto_centavos` integer,
	`vuelto_centavos` integer,
	`tarjeta_tipo` text,
	`tarjeta_marca` text,
	`tarjeta_ultimos_4` text,
	`estado` text DEFAULT 'EMITIDA' NOT NULL,
	`motivo_anulacion` text,
	`anulada_en` text,
	`anulada_por_usuario_id` integer,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`anulada_por_usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `facturas_numero_unique` ON `facturas` (`numero`);--> statement-breakpoint
CREATE TABLE `marcas_deploy` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`clave` text NOT NULL,
	`fecha` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marcas_deploy_clave_unique` ON `marcas_deploy` (`clave`);--> statement-breakpoint
CREATE TABLE `movimientos_stock` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`producto_id` integer NOT NULL,
	`tipo` text NOT NULL,
	`cantidad` integer NOT NULL,
	`existencia_resultante` integer NOT NULL,
	`motivo` text NOT NULL,
	`origen` text NOT NULL,
	`usuario_id` integer NOT NULL,
	`factura_id` integer,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`factura_id`) REFERENCES `facturas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pagos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`numero_recibo` integer NOT NULL,
	`fecha` text NOT NULL,
	`cliente_id` integer NOT NULL,
	`usuario_id` integer NOT NULL,
	`importe_centavos` integer NOT NULL,
	`medio` text NOT NULL,
	`observacion` text,
	FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pagos_numero_recibo_unique` ON `pagos` (`numero_recibo`);--> statement-breakpoint
CREATE TABLE `productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`descripcion` text NOT NULL,
	`categoria_id` integer NOT NULL,
	`precio_venta_centavos` integer NOT NULL,
	`existencia` integer DEFAULT 0 NOT NULL,
	`stock_minimo` integer DEFAULT 0 NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `productos_codigo_unique` ON `productos` (`codigo`);--> statement-breakpoint
CREATE TABLE `usuarios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`rol` text NOT NULL,
	`activo` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usuarios_email_unique` ON `usuarios` (`email`);