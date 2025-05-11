import { User } from "../entities/User"
import jwt from "jsonwebtoken"
import express from "express"
import bcrypt from "bcrypt"
import { getRepository } from "typeorm";
import * as dotenv from 'dotenv';
dotenv.config();

const loginRouter = express.Router();



loginRouter.post('/',async (req,res): Promise<any> => {

    const {email,password} = req.body

   try{

        const userRepo = getRepository(User);
        const user = await userRepo.findOne({
            where: {email}
        });
        if(!user){
            return res.status(404).json({
                "message": "User not Found"
            })
        }

        // match passwords.

        const isMatch = bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(404).json({
                "message": "Error! User not found"
            })
        }


        //setup jwts. 
        const secret = process.env.JWT_SECRET as string
        const token = jwt.sign({userid:user.user_id}, secret, {expiresIn:'1hr'})

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        });
    return res.status(200).json({
        "success": true,
         user : {
            user_id: user.user_id,
            email: user.email
         }
    })


   }catch(error){
    console.error("Error: ", error)
    return res.status(500).json({
        "message ": "Login Failed, Internal Server Error!"
    })
   }

})


export {loginRouter,}