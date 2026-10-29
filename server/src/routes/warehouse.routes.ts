import { Router } from 'express';
import { prisma } from '../db/client';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// GET /api/warehouses
router.get('/', requireAuth, async (req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
    });
    return res.json({ success: true, data: warehouses });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/warehouses
router.post('/', requireAuth, async (req, res) => {
    try {
      const { name, location } = req.body;
      const warehouse = await prisma.warehouse.create({
        data: { 
          name, 
          location 
        },
      });
      return res.status(201).json({ success: true, data: warehouse });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

export default router;