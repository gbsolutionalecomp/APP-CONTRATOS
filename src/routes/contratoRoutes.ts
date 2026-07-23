import { Router } from 'express';
import { contratoController } from '../controllers/contratoController';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  contratoSchema,
  updateContratoSchema,
  contratoQuerySchema,
  extraerOcSchema,
  abrirUbicacionSchema,
} from '../schemas/contrato.schema';
import { mutationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/contratos', validateQuery(contratoQuerySchema), contratoController.getContratos);
router.get('/contratos/:codigo', contratoController.getContratoByCodigo);

router.post(
  '/contratos',
  mutationRateLimiter,
  validateBody(contratoSchema),
  contratoController.createContrato
);

router.put(
  '/contratos/:codigo',
  mutationRateLimiter,
  validateBody(updateContratoSchema),
  contratoController.updateContrato
);

router.delete('/contratos/:codigo', mutationRateLimiter, contratoController.deleteContrato);

router.post('/extraer-oc', validateBody(extraerOcSchema), contratoController.extraerOc);
router.post(
  '/abrir-ubicacion',
  validateBody(abrirUbicacionSchema),
  contratoController.abrirUbicacion
);

export default router;
