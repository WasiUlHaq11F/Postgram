import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../entities/User';

dotenv.config();


declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const generateAccessToken = (userId: number) => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = '2m';
  return jwt.sign({ userid: userId }, secret, { expiresIn });
};

export const generateRefreshToken = (userId: number) => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  const expiresIn = '7d';
  return jwt.sign({ userid: userId }, secret, { expiresIn });
};

export const getUserFromToken = async (req: Request): Promise<User | null> => {
  const token = req.cookies.access_token;
  if (!token) {
    return null;
  }

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded: any = jwt.verify(token, secret);
    const user = await User.findOne({ where: { user_id: decoded.userid } });
    return user || null;
  } catch (error) {
    return null;
  }
};

export const authenticateUser = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  let user = await getUserFromToken(req);

  if (!user) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Unauthorized: No refresh token' });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    try {
      const decodedRefreshToken: any = jwt.verify(refreshToken, refreshSecret);
      user = await User.findOne({ where: { user_id: decodedRefreshToken.userid } });

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: Invalid refresh token' });
      }

      // Generate new access token and refresh token
      const newAccessToken = generateAccessToken(user.user_id);
      const newRefreshToken = generateRefreshToken(user.user_id);

      // Set the new tokens in cookies
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000, // 1 hour
      });
    } catch (refreshError) {
      return res.status(401).json({ message: 'Unauthorized: Failed to verify refresh token' });
    }
  }

  // Attach the user to the request object so routes can access it
  req.user = user;
  next();
};