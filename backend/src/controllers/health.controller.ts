import { Request, Response, NextFunction } from 'express';
import { PythonService } from '../services/python.service';

export class HealthController {
  public static getNodeHealth(_req: Request, res: Response): void {
    res.json({
      success: true,
      service: 'promptwall-node',
      status: 'running',
    });
  }

  public static async getPythonHealth(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const pythonHealth = await PythonService.getHealth();
      if (!pythonHealth.success) {
        res.status(503).json(pythonHealth);
        return;
      }
      res.json(pythonHealth);
    } catch (error) {
      next(error);
    }
  }
}
