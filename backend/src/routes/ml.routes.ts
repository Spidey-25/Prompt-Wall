import { Router } from 'express';
import { MlController } from '../controllers/ml.controller';

const router = Router();
router.post('/predict', MlController.predict);
router.post('/feedback', MlController.feedback);

export default router;
