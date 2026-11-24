import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

export const getAdminDashboard = async (_req: Request, res: Response): Promise<any> => {
  try {
    const data = await DashboardService.getAdminSummary();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Dashboard Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al cargar los datos del dashboard',
    });
  }
};