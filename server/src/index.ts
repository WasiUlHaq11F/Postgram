import express from "express"
import { createConnection, Like } from "typeorm"
import { User } from "./entities/User"
import { Post } from "./entities/Post"
import { Comment } from "./entities/Comment"
import { registerRouter } from "./controllers/registerRoute"
import cors from "cors"
import { loginRouter } from "./routes/loginRoute"
import { postRouter } from "./controllers/postContoller"
import commentRouter from "./controllers/commentController"
import { logoutRouter } from "./controllers/logoutcontroller"
import cookieParser from "cookie-parser"
import { authenticateUser } from "./middleware/authenticateUser"; // Correct import path

const main = async () => {
    const app = express()

    try{
        createConnection({
            type: "postgres",
            host: "localhost",
            port: 5432,
            database: "Postgram",
            username: "postgres",
            password: "1234567",
            entities:[User,Post,Comment,Like],
            synchronize: true,
        })

        app.use(cors({ 
            origin: "http://localhost:5173", // Removed the space before the URL
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE'], // Include all methods you use
            allowedHeaders: ['Content-Type', 'Authorization']
        }))
        
        app.use(cookieParser())
        app.use(express.json())
        
  
        // Public routes
        app.use('/register', registerRouter)
        app.use('/login', loginRouter)
        app.use('/logout', logoutRouter)
        
        // Protected routes - apply authentication middleware
        app.use('/comments', authenticateUser, commentRouter)  
        app.use('/posts', authenticateUser, postRouter) 
        
        console.log("Connected to Postgres")
        app.listen(8000, () => {
            console.log("Server running on Port 8000");
        })
    }
    catch(error){
        console.error("Unable to connect to database")
        console.log(error)
    }
}

main()