import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

async function sendWorkbook(res: Response, workbook: any, filename: string) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

export async function exportDailyStock(req: Request, res: Response) {
  try {
    const workbook = await ReportService.generateDailyStockWorkbook();
    const today = new Date().toISOString().slice(0, 10);
    await sendWorkbook(res, workbook, `estado-stock-${today}.xlsx`);
  } catch (error) {
    console.error('Error exportando stock:', error);
    res.status(500).json({ error: 'Error al generar el reporte de stock' });
  }
}

export async function exportSalesConsolidated(req: Request, res: Response) {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const workbook = await ReportService.generateSalesConsolidatedWorkbook(from, to);
    await sendWorkbook(res, workbook, `consolidado-ventas-${from ?? 'inicio'}_a_${to ?? 'hoy'}.xlsx`);
  } catch (error) {
    console.error('Error exportando ventas:', error);
    res.status(500).json({ error: 'Error al generar el consolidado de ventas' });
  }
}

export async function exportSellerPerformance(req: Request, res: Response) {
  try {
    const from = typeof req.query.from === 'string' ? req.query.from : undefined;
    const to = typeof req.query.to === 'string' ? req.query.to : undefined;
    const workbook = await ReportService.generateSellerPerformanceWorkbook(from, to);
    await sendWorkbook(res, workbook, `desempeno-vendedores-${from ?? 'inicio'}_a_${to ?? 'hoy'}.xlsx`);
  } catch (error) {
    console.error('Error exportando desempeño:', error);
    res.status(500).json({ error: 'Error al generar el reporte de desempeño' });
  }
}