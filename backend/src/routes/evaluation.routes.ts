import { Router } from 'express';
import { EvaluationController } from '../controllers/evaluation.controller';

const router = Router();

/**
 * POST /api/evaluation/run
 * Trigger a full LangGraph evaluation suite run.
 */
router.post('/run', EvaluationController.runEvaluation);

/**
 * GET /api/evaluation/latest
 * Return the latest cached evaluation results.
 */
router.get('/latest', EvaluationController.getLatestEvaluation);

export default router;
