import { BaseEntity, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Column, Unique } from "typeorm";
import { User } from "./User";
import { Post } from "./Post";

@Entity('likes')
@Unique(['user_id', 'post_id'])  // Ensure a user can only like a post once
export class Like extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column()
  user_id: number;

  @ManyToOne(() => Post, (post) => post.likes)
  @JoinColumn({ name: "post_id" })
  post: Post;

  @Column()
  post_id: number;

  @CreateDateColumn()
  created_at: Date;
}
