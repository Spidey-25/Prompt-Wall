import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';

export class EvaluationController {
  /**
   * POST /api/evaluation/run
   * Trigger a fresh full evaluation suite through LangGraph.
   * This is a long-running operation (may take several minutes for all 19 tests).
   */
  public static async runEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PythonService.runEvaluation();
      res.status(result.success !== false ? 200 : 502).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/evaluation/latest
   * Fetch the latest cached evaluation results (or empty awaiting state if none run yet).
   */
  public static async getLatestEvaluation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await PythonService.getLatestEvaluation();
      res.status(result.success !== false ? 200 : 502).json(result);
    } catch (error) {
      next(error);
    }
  }
}
