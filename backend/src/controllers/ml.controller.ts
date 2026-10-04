import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';

export class MlController {
  public static async predict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text } = req.body as { text?: string };
      if (!text?.trim()) {
        res.status(400).json({ success: false, error: 'text is required' });
        return;
      }
      res.json({ success: true, result: await PythonService.mlPredict(text) });
    } catch (error) {
      next(error);
    }
  }

  public static async feedback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, label } = req.body as { text?: string; label?: 'SAFE' | 'THREAT' };
      if (!text?.trim() || (label !== 'SAFE' && label !== 'THREAT')) {
        res.status(400).json({ success: false, error: 'text and label (SAFE or THREAT) are required' });
        return;
      }
      res.json({ success: true, result: await PythonService.mlFeedback(text, label) });
    } catch (error) {
      next(error);
    }
  }
}
