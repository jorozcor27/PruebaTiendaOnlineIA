-- SCRIPT PARA SUPABASE (POSTGRESQL) - SISTEMA DE TIENDA ONLINE
-- ATENCIÓN: Copia y pega todo este script en el SQL Editor de tu panel de Supabase y dale a "Run".

-- ==============================================================================
-- 1. ESTRUCTURA BASE EXISTENTE (Roles, Estados, Usuarios)
-- ==============================================================================
-- Si estas tablas ya existen en tu base de datos (como vimos en la imagen), 
-- los comandos "IF NOT EXISTS" evitarán que den error y no borrarán tu información actual.

CREATE TABLE IF NOT EXISTS rol (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS estado (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id), -- Enlace al usuario de Autenticación nativa de Supabase
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    rol_id INT REFERENCES rol(id),
    estado_id INT REFERENCES estado(id),
    created_at TIMESTAMP DEFAULT now()
);

-- ==============================================================================
-- 2. NUEVAS TABLAS PARA LA TIENDA ONLINE
-- ==============================================================================

-- Tabla de Categorías: Almacena los grupos para organizar los productos (Ej: Ropa, Electrónica)
CREATE TABLE IF NOT EXISTS categoria (
    id SERIAL PRIMARY KEY, -- ID numérico autoincremental
    nombre VARCHAR(100) NOT NULL, -- Nombre descriptivo
    descripcion TEXT -- Explicación opcional de la categoría
);

-- Tabla de Productos: Almacena el catálogo o inventario de la tienda
CREATE TABLE IF NOT EXISTS producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID único generado automáticamente
    nombre VARCHAR(200) NOT NULL, -- Nombre del producto que verá el cliente
    descripcion TEXT, -- Detalles, características, etc.
    precio NUMERIC(10, 2) NOT NULL, -- Precio del producto permitiendo 2 decimales (Ej: 99.99)
    stock INT NOT NULL DEFAULT 0, -- Cantidad disponible en bodega
    imagen_url VARCHAR(500), -- Enlace directo a la foto (Puedes subir imágenes a Supabase Storage y poner la URL aquí)
    categoria_id INT REFERENCES categoria(id), -- Vinculación con la tabla de categorías
    created_at TIMESTAMP DEFAULT now() -- Fecha en que se subió el producto
);

-- Tabla de Pedidos: Representa la cabecera (información general) de una compra
CREATE TABLE IF NOT EXISTS pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ID del recibo / factura
    usuario_id UUID REFERENCES usuario(id), -- Cliente registrado que realizó la compra
    fecha TIMESTAMP DEFAULT now(), -- Fecha y hora exactas de la compra
    total NUMERIC(10, 2) NOT NULL, -- Cuánto costó el total del pedido
    estado VARCHAR(50) DEFAULT 'Pendiente' -- Estado logístico: 'Pendiente', 'Preparando', 'Enviado', 'Entregado'
);

-- Tabla de Detalle de Pedidos: Guarda qué productos exactamente lleva el pedido anterior
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedido(id) ON DELETE CASCADE, -- Si se elimina el pedido padre, se borran sus productos
    producto_id UUID REFERENCES producto(id), -- El producto que se está comprando
    cantidad INT NOT NULL, -- Cuántas unidades de este producto lleva
    precio_unitario NUMERIC(10, 2) NOT NULL -- IMPORTANTE: Se guarda el precio en el momento de la compra para que el historial no se afecte si el precio cambia en el futuro
);

-- ==============================================================================
-- 3. INSERCIÓN DE DATOS DE PRUEBA INICIALES (MOCK DATA)
-- ==============================================================================

-- Si necesitas un rol 'Cliente', puedes insertarlo manualmente:
-- INSERT INTO rol (id, nombre) VALUES (3, 'Cliente');

-- Insertamos dos categorías de ejemplo para empezar a probar
INSERT INTO categoria (nombre, descripcion) VALUES 
('Electrónica', 'Dispositivos y gadgets tecnológicos de última generación'),
('Ropa', 'Prendas de vestir para hombre y mujer');

-- Insertamos dos productos de prueba amarrando dinámicamente sus categorías
INSERT INTO producto (nombre, descripcion, precio, stock, imagen_url, categoria_id) VALUES
('Auriculares Inalámbricos', 'Auriculares Bluetooth con cancelación de ruido.', 89.99, 25, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', (SELECT id FROM categoria WHERE nombre = 'Electrónica' LIMIT 1)),
('Camiseta Casual Negra', 'Camiseta de algodón 100% ideal para uso diario.', 15.50, 50, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', (SELECT id FROM categoria WHERE nombre = 'Ropa' LIMIT 1));

-- NOTA DE SEGURIDAD (RLS): 
-- Al correr este script en Supabase, recuerda ir a "Authentication" -> "Policies" y 
-- asegurarte de tener políticas que permitan hacer SELECT a la tabla "producto" y "categoria"
-- para que el frontend pueda mostrarlos a los usuarios. Si estás en modo desarrollo rápido,
-- puedes desactivar el RLS (Row Level Security) temporalmente en esas tablas.
