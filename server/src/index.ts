
import express from "express"
import { createConnection } from "typeorm"
import { User } from "./entities/User"
import { Post } from "./entities/Post"
import { Comment } from "./entities/Comment"
import { registerRouter } from "./controllers/registerRoute"
import cors from "cors"
import { loginRouter } from "./routes/loginRoute"
import { postRouter } from "./controllers/postContoller"
import commentRouter from "./controllers/commentController"
import { logoutRouter } from "./controllers/logoutcontroller"
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
            entities:[User,Post,Comment],
            synchronize: true,
        })

        app.use(cors( { 
            origin: " http://localhost:5173",
            credentials: true
        }))
        app.use(express.json())
        app.use('/register',registerRouter)
        app.use('/login',loginRouter)
        app.use('/comments',commentRouter)
        app.use('/posts',postRouter)
        app.use('/logout',logoutRouter)
        console.log("Connected to Postgres")
        app.listen(8000, () => {
            console.log("Server running on Port 8000");
        })
    }
    catch(error){
        console.error("Unable to connect to databse")
        console.log(error)
    }

}

main()