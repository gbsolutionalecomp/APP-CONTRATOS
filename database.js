const path = require('path');

let db = null;

if (!process.env.VERCEL) {
    try {
        const sqlite3 = require('sqlite3').verbose();
        const dbPath = path.resolve(__dirname, 'contratos.db');
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error al conectar con SQLite:', err.message);
            } else {
                console.log('Conectado exitosamente a la base de datos SQLite.');
            }
        });

        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS contratos (
                    codigo_nomenclatura TEXT PRIMARY KEY,
                    nombre_contrato TEXT NOT NULL,
                    contraparte TEXT NOT NULL,
                    tipo_contrato TEXT NOT NULL,
                    fecha_inicio DATE,
                    fecha_fin DATE,
                    monto REAL DEFAULT 0,
                    moneda TEXT DEFAULT 'USD',
                    estado TEXT DEFAULT 'ACTIVO',
                    ubicacion_pc TEXT NOT NULL,
                    observaciones TEXT,
                    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error al crear tabla contratos:', err.message);
                } else {
                    console.log('Tabla "contratos" verificada/creada correctamente.');
                }
            });
        });
    } catch (err) {
        console.warn('SQLite no disponible en este entorno:', err.message);
    }
}

module.exports = db;
