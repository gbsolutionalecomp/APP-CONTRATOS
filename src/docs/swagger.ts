import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'APP-CONTRATOS API Documentación',
      version: '1.0.0',
      description:
        'Sistema de Gestión de Contratos con conmutación por error automática (Supabase Cloud ↔ SQLite Local)',
      contact: {
        name: 'GBS Solutions',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'Servidor API',
      },
    ],
    components: {
      schemas: {
        Contrato: {
          type: 'object',
          required: ['codigo_nomenclatura', 'nombre_contrato', 'contraparte', 'ubicacion_pc'],
          properties: {
            codigo_nomenclatura: { type: 'string', example: 'CON-2026-001' },
            nombre_contrato: { type: 'string', example: 'Contrato de Servicios TI' },
            contraparte: { type: 'string', example: 'Proveedor Tech S.A.' },
            tipo_contrato: { type: 'string', example: 'Proveedor / Insumos' },
            fecha_inicio: { type: 'string', format: 'date', example: '2026-01-01' },
            fecha_fin: { type: 'string', format: 'date', example: '2026-12-31' },
            monto: { type: 'number', example: 12000.5 },
            moneda: { type: 'string', example: 'USD' },
            estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'FINALIZADO', 'PENDIENTE'], example: 'ACTIVO' },
            ubicacion_pc: { type: 'string', example: 'C:\\Contratos\\CON-2026-001.pdf' },
            observaciones: { type: 'string', example: 'Renovación automática' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            error: { type: 'string', example: 'Mensaje de error' },
            details: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
