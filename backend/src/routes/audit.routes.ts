import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';

const router = Router();
router.get('/', AuditController.list);
export default router;
