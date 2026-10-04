import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';

export class AuditController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, events: await PythonService.getAuditEvents() });
    } catch (error) {
      next(error);
    }
  }
}
