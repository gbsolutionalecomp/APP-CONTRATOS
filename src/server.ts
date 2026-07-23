import app from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

function startServer(port: number): void {
  const server = app.listen(port, () => {
    logger.info(`\n======================================================`);
    logger.info(`  Servidor de Gestión de Contratos SQL Activo en:`);
    logger.info(`  👉 http://localhost:${port}`);
    logger.info(`  👉 Docs Swagger: http://localhost:${port}/api/docs`);
    logger.info(`======================================================\n`);
  });

  server.on('error', (err: { code?: string }) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`El puerto ${port} está ocupado. Intentando con el puerto ${port + 1}...`);
      startServer(port + 1);
    } else {
      logger.error('Error al iniciar el servidor:', err);
    }
  });
}

if (!config.isVercel && !config.isTest) {
  startServer(config.port);
}

export default app;
