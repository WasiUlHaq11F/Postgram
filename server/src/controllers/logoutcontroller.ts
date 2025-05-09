// Add this to your Express backend routes
import express from "express";
const logoutRouter = express.Router();

logoutRouter.post('/', async (req, res): Promise<any> => {
  // Clear the JWT cookie
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.status(200).json({ message: "Logged out successfully" });
});

export { logoutRouter };