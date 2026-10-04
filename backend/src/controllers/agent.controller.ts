import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';
import { ClaudeService } from '../services/claude.service';

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

  public static async runSecureChat(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { message } = req.body as { message?: string };
        if (!message || typeof message !== 'string' || !message.trim()) {
          res.status(400).json({ success: false, error: 'message is required and must be a non-empty string' });
          return;
        }

        const pipeline = await PythonService.runAgent({ message: message.trim() });
        if (!pipeline.success) {
          res.status(502).json({ success: false, error: pipeline.error || 'Security pipeline failed.' });
          return;
        }

        const firewall = pipeline.firewall_result || {};
        const guard = pipeline.action_guard_result || {};
        const safe =
          !pipeline.threat_detected &&
          !pipeline.action_blocked &&
          firewall.status === 'CLEAN' &&
          guard.decision !== 'BLOCK' &&
          guard.decision !== 'ASK_HUMAN';

        if (!safe) {
          res.status(403).json({
            success: false,
            error: 'Request did not pass the PromptWall security pipeline.',
            pipeline,
          });
          return;
        }

        const approvedTask =
          pipeline.scope?.raw_user_request?.trim() || message.trim();
        const chat = await ClaudeService.answerFromApprovedContext(
          pipeline.retrieved_context || [],
          approvedTask
        );
        if (!chat.success) {
          res.status(502).json({ success: false, error: chat.error, pipeline });
          return;
        }

        res.json({ success: true, answer: chat.answer, pipeline });
      } catch (error) {
        next(error);
      }
    }
}
