import {Column, BaseEntity, PrimaryGeneratedColumn, Entity, CreateDateColumn, ManyToMany, JoinTable, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany} from "typeorm"
import { User } from "./User"
import { Comment } from "./Comment"

@Entity('posts')
export class Post extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    title: string 

    @Column()
    body: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    // relatiionships
    // A post has many to one relationship with the User. 

    @ManyToOne(
        () => User,
        user => user.posts
    )
    @JoinColumn({
        name: "user_id"
    })
    author:User


    @Column({ default: 0 })
    likesCount: number;
    
    @ManyToMany(() => User)
    @JoinTable({
        name: "post_likes",
        joinColumn: { name: "post_id", referencedColumnName: "id" },
        inverseJoinColumn: { name: "user_id", referencedColumnName: "user_id" }
    })
    likedBy: User[];
    

    @OneToMany(
        () => Comment,
        comment => comment.post
    )
    comments: Comment[]

}