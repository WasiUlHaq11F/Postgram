import {Column, BaseEntity, PrimaryGeneratedColumn, Entity, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne, OneToMany} from "typeorm"
import { Post } from "./Post"
import { User } from "./User"



@Entity('comments')
export class Comment extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    body: string

    @CreateDateColumn()
    created_at: Date

    @UpdateDateColumn()
    updated_at: Date

    @ManyToOne(() => Post, post => post.comments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "post_id" })
    post: Post;



    @ManyToOne(
        () => User,
        user => user.comments
    )
    author:User


    @Column({ nullable: true })
    parentId: number | null;
    @ManyToOne(() => Comment, comment => comment.replies, { nullable: true })
    parent: Comment;
  
    // Relation to child comments (replies)
    @OneToMany(() => Comment, comment => comment.parent)
    replies: Comment[];


}