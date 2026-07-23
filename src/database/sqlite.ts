import sqlite3 from 'sqlite3';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let db: sqlite3.Database | null = null;

if (!config.isVercel) {
  try {
    const sqliteVerbose = sqlite3.verbose();
    db = new sqliteVerbose.Database(config.databasePath, (err) => {
      if (err) {
        logger.error('Error al conectar con SQLite:', err.message);
      } else {
        logger.info('Conectado exitosamente a la base de datos SQLite.');
      }
    });

    db.serialize(() => {
      db?.run(
        `CREATE TABLE IF NOT EXISTS contratos (
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
        )`,
        (err) => {
          if (err) {
            logger.error('Error al verificar/crear tabla contratos:', err.message);
          } else {
            logger.info('Tabla "contratos" verificada/creada correctamente en SQLite.');
          }
        }
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`SQLite no disponible en este entorno: ${message}`);
  }
}

export default db;
