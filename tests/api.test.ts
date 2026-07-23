import { describe, it, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import db from '../src/database/sqlite';

describe('APP-CONTRATOS API Test Suite', () => {
  const testContractCode = `TEST-CON-${Date.now()}`;

  afterAll((done) => {
    if (db) {
      db.close(() => done());
    } else {
      done();
    }
  });

  describe('GET /api/health', () => {
    it('debe responder con estado 200 y la estructura del sistema', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('databases');
    });
  });

  describe('GET /api/docs', () => {
    it('debe servir la documentación Swagger UI', async () => {
      const response = await request(app).get('/api/docs/');
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/contratos (Creación y Validación)', () => {
    it('debe fallar la validación si faltan campos requeridos (Zod 422)', async () => {
      const response = await request(app).post('/api/contratos').send({
        nombre_contrato: 'Contrato Incompleto',
      });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('details');
    });

    it('debe fallar si fecha_fin es anterior a fecha_inicio', async () => {
      const response = await request(app).post('/api/contratos').send({
        codigo_nomenclatura: 'INVALID-DATE-001',
        nombre_contrato: 'Contrato con Fechas Erróneas',
        contraparte: 'Empresa Test',
        fecha_inicio: '2026-12-31',
        fecha_fin: '2026-01-01',
        monto: 100,
        ubicacion_pc: 'C:\\test.pdf',
      });

      expect(response.status).toBe(422);
      expect((response.body as any).error).toContain('Validación fallida');
    });

    it('debe crear un contrato exitosamente', async () => {
      const payload = {
        codigo_nomenclatura: testContractCode,
        nombre_contrato: 'Contrato de Prueba Automatizada',
        contraparte: 'Proveedor Jest S.A.',
        tipo_contrato: 'Proveedor / Insumos',
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-12-31',
        monto: 5000,
        moneda: 'USD',
        estado: 'ACTIVO',
        ubicacion_pc: 'C:\\Contratos\\Test.pdf',
        observaciones: 'Creado desde tests de Jest',
      };

      const response = await request(app).post('/api/contratos').send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('data');
      expect((response.body as any).data.codigo_nomenclatura).toBe(testContractCode);
    });
  });

  describe('GET /api/contratos (Listado, Paginación, Filtros y Búsqueda)', () => {
    it('debe obtener listado paginado de contratos', async () => {
      const response = await request(app).get('/api/contratos?page=1&limit=5');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray((response.body as any).data)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 5);
    });

    it('debe filtrar contratos por término de búsqueda', async () => {
      const response = await request(app).get(`/api/contratos?search=${testContractCode}`);

      expect(response.status).toBe(200);
      expect((response.body as any).data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/contratos/:codigo', () => {
    it('debe obtener un contrato existente por su código', async () => {
      const response = await request(app).get(`/api/contratos/${testContractCode}`);

      expect(response.status).toBe(200);
      expect((response.body as any).data.codigo_nomenclatura).toBe(testContractCode);
    });

    it('debe retornar 404 para un contrato no existente', async () => {
      const response = await request(app).get('/api/contratos/CODIGO-INEXISTENTE-999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/contratos/:codigo', () => {
    it('debe actualizar el contrato correctamente', async () => {
      const response = await request(app)
        .put(`/api/contratos/${testContractCode}`)
        .send({
          nombre_contrato: 'Contrato de Prueba Actualizado',
          monto: 7500,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/contratos/:codigo', () => {
    it('debe eliminar el contrato correctamente', async () => {
      const response = await request(app).delete(`/api/contratos/${testContractCode}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/extraer-oc', () => {
    it('debe procesar y extraer sugerencia de datos de una OC', async () => {
      const response = await request(app).post('/api/extraer-oc').send({
        filename: 'Orden_Compra_1234.pdf',
        contentText: 'PROVEEDOR: Insumos Globales S.A. MONTO: $12,500.00 OC-9876',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('codigo_nomenclatura');
      expect((response.body as any).contraparte).toBe('Insumos Globales S.A.');
      expect((response.body as any).monto).toBe(12500);
    });
  });

  describe('POST /api/abrir-ubicacion', () => {
    it('debe fallar si no se envía la ubicación (400)', async () => {
      const response = await request(app).post('/api/abrir-ubicacion').send({});

      expect(response.status).toBe(422);
    });
  });
});
