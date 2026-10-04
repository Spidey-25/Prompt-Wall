import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

router.get('/health', HealthController.getNodeHealth);
router.get('/health/python', HealthController.getPythonHealth);

export default router;
