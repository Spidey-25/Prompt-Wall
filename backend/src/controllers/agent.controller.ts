import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';

export class AgentController {
  /**
   * POST /api/agent/run
   * Proxy to the Python LangGraph agent.
   */
  public static async runAgent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body as { message?: string };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ success: false, error: 'message is required and must be a non-empty string' });
        return;
      }

      const result = await PythonService.runAgent({ message: message.trim() });
      res.status(result.success ? 200 : 502).json(result);
    } catch (error) {
      next(error);
    }
  }
}
