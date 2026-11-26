import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.cookie('refreshToken', result.rawRefreshToken, {
        ...getCookieOptions(),
        maxAge: result.expiresInMs,
      });

      return res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      if (error.message === 'Credenciales inválidas') {
        return res.status(401).json({ success: false, error: error.message });
      }
      console.error('[Auth Error - Login]:', error);
      return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ success: false, error: 'Falta cabecera anti-CSRF' });
      }

      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        return res.status(401).json({
          success: false,
          authenticated: false,
          error: 'No existe sesión activa',
        });
      }

      const result = await AuthService.refresh(rawRefreshToken);

      res.cookie('refreshToken', result.rawRefreshToken, {
        ...getCookieOptions(),
        maxAge: result.expiresInMs,
      });

      return res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      res.clearCookie('refreshToken', getCookieOptions());

      if (
        error.message === 'Alerta de seguridad: Sesión comprometida' ||
        error.message.includes('Jornada')
      ) {
        return res.status(403).json({ success: false, error: error.message });
      }

      return res.status(401).json({
        success: false,
        authenticated: false,
        error: 'Sesión inválida o expirada',
      });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        return res.status(403).json({ success: false, error: 'Falta cabecera anti-CSRF' });
      }

      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }
    } catch (error) {
      console.error('[Auth Error - Logout]:', error);
    } finally {
      res.clearCookie('refreshToken', getCookieOptions());
      return res.status(200).json({ success: true });
    }
  }
}