import {Column, BaseEntity, PrimaryGeneratedColumn, Entity, OneToMany} from "typeorm"
import {Post} from "../entities/Post"
import { Comment } from "./Comment"
@Entity('user')
export class User extends BaseEntity {

    @PrimaryGeneratedColumn()
    user_id: number

    @Column()
    password: string

    @Column({
        unique:true
    })
    email: string


    // relationships. 
    // A user has One to Many relation with a Post. 

    @OneToMany(
        () => Post,
        post=> post.author
    )
    posts: Post[]


    @OneToMany(
        () => Comment,
        comment => comment.author
    )
    comments: Comment[]
}