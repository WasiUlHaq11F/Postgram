import { User } from "../entities/User";
import jwt from "jsonwebtoken";
import express from "express";
import bcrypt from "bcrypt";
import { getRepository } from "typeorm";
import * as dotenv from "dotenv";
dotenv.config();

const loginRouter = express.Router();

loginRouter.post('/', async (req, res): Promise<any> => {
  const { email, password } = req.body;

  try {
    const userRepo = getRepository(User);
    const user = await userRepo.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not Found" });
    }

    // **Make sure to await** bcrypt.compare
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // **Generate tokens** (use separate secrets if you like)
    const accessToken = jwt.sign(
      { userid: user.user_id },
      process.env.JWT_SECRET as string,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { userid: user.user_id },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: '7d' }
    );

    // **Set cookies for cross‑origin** on localhost
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,      
      sameSite: 'lax',   
      maxAge: 60 * 60 * 1000, 
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    return res.status(200).json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

export { loginRouter };
