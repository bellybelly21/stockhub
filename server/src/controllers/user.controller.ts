import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async create(req: Request, res: Response) {
    try {
      const user = await UserService.createUser(req.body);
      return res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: user,
      });
    } catch (error: any) {
      if (error.message.includes('ya se encuentra registrado')) {
        return res.status(400).json({ success: false, error: error.message });
      }
      console.error('[UserController Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async getAll(_req: Request, res: Response) {
    try {
      const users = await UserService.getAllUsers();
      return res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('[UserController Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as {id: string};
      const user = await UserService.updateUser(id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: user,
      });
    } catch (error: any) {
      if (error.message.includes('no encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      console.error('[UserController Error]:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }
}