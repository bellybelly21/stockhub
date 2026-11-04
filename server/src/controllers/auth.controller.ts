import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const getCookieOptions = () => ({
  httpOnly: true,
  // En producción (Railway) será true, en local será false
  secure: process.env.NODE_ENV === 'production',
  // En producción necesita 'none' para cross-domain, en local usa 'lax'
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
});

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);

      res.cookie('refreshToken', result.rawRefreshToken, {
        ...getCookieOptions(),
        maxAge: result.EIGHT_HOURS_MS,
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
      const rawRefreshToken = req.cookies?.refreshToken;
      if (!rawRefreshToken) {
        return res.status(200).json({ success: false, authenticated: false });
      }

      const result = await AuthService.refresh(rawRefreshToken);

      res.cookie('refreshToken', result.rawRefreshToken, {
        ...getCookieOptions(),
        maxAge: result.EIGHT_HOURS_MS,
      });

      return res.status(200).json({
        success: true,
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      res.clearCookie('refreshToken', getCookieOptions());
      
      if (error.message === 'Alerta de seguridad: Sesión comprometida') {
        return res.status(403).json({ success: false, error: error.message });
      }
      // Para token no encontrado, expirado o inactivo, simplemente negamos la autenticación
      return res.status(200).json({ success: false, authenticated: false });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
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