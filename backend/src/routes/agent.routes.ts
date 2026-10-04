import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';

const router = Router();

/**
 * POST /api/agent/run
 *
 * Body:   { "message": "Compare the vendor quotations." }
 * Reply:  { success, response, retrieved_context, tool_used, tool_result }
 */
router.post('/run', AgentController.runAgent);

export default router;
