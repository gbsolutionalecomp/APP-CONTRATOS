CREATE TABLE IF NOT EXISTS contratos (
    codigo_nomenclatura TEXT PRIMARY KEY,
    nombre_contrato TEXT NOT NULL,
    contraparte TEXT NOT NULL,
    tipo_contrato TEXT NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    monto NUMERIC DEFAULT 0,
    moneda VARCHAR(10) DEFAULT 'USD',
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    ubicacion_pc TEXT NOT NULL,
    observaciones TEXT,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
