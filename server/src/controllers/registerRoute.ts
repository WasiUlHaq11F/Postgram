import express from "express"
import bcrypt from "bcrypt"
import { User } from "../entities/User"



const registerRouter = express.Router();



registerRouter.post('/', async (req,res) => {
    const {email,password} = req.body


    // hashing the password.
    const saltRounds = 8;
    const hashedPassword = await bcrypt.hash(password,saltRounds);
    const user = new User();
    user.email = email;
    user.password = hashedPassword
    await user.save();
   res.json({
    "User Email" : email,
    "User Password": password
   })
})

export {registerRouter}