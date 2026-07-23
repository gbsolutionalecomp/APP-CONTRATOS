import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/env';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import contratoRoutes from './routes/contratoRoutes';
import healthRoutes from './routes/healthRoutes';
import { swaggerSpec } from './docs/swagger';

const app: Application = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Permitir assets estáticos y Swagger UI inline UI resources
  })
);

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(globalRateLimiter);

// Payload parser with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api', healthRoutes);
app.use('/api', contratoRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
