import express from "express"
import { Post } from "../entities/Post";
import { getRepository, getTreeRepository } from "typeorm";
import { User } from "src/entities/User";
import { Comment } from "../entities/Comment";
import jwt from 'jsonwebtoken'; 
const postRouter = express.Router();

postRouter.post('/',async (req,res) => {
    const {title,body,user} = req.body;

    // add this post to the Postgres 
    const post = new Post();
    post.title = title;
    post.body = body;
    post.author= user.user_id

   await post.save();

   const response = [post]
   .filter(post => post.author !== null)
   .map(post => ({
       id: post.id,
       title: post.title,
       body: post.body,
       authorEmail: post.author.email
   }));
    res.json(response);

 
    
})

postRouter.get('/', async (req,res) => {

    try{
    const postRepository = getRepository('Post');

    const posts = await postRepository.find({
        relations: ["author"],
        order: {created_at: "ASC"}
    });

    const response = posts
    .filter(post => post.author !== null)
    .map(post => ({
        id: post.id,
        title: post.title,
        body: post.body,
        authorEmail: post.author.email
    }));
     res.json(response);
    }catch(error){
        console.error("Error")
        console.log(error)
        res.status(500).json({
            "message ": "Server not responding..."
        })
    }
    
})

postRouter.put('/:id', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
        const postId = parseInt(req.params.id);
        const { title, body, user } = req.body;
        
        // Find the post by ID
        const postRepository = getRepository(Post);
        const post = await postRepository.findOne({
            where: { id: postId },
            relations: ["author"]
        });
        
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        // Optional: Check if the current user is the author
        if (post.author.user_id !== user.user_id) {
            return res.status(403).json({ message: "You can only edit your own posts" });
        }
        
        // Update the post
        post.title = title;
        post.body = body;
        await postRepository.save(post);
        
        // Return the updated post
        return res.json({
            id: post.id,
            title: post.title,
            body: post.body,
            authorEmail: post.author.email
        });
    } catch (error) {
        console.error("Error updating post:", error);
        return res.status(500).json({ message: "Failed to update post" });
    }
});

postRouter.post('/:id/like', async (req, res): Promise<any> => {
    try {
        const postId = parseInt(req.params.id);
        const { user } = req.body;
        
        // Find post and user
        const postRepository = getRepository("Post");
        const userRepository = getRepository("User");
        
        const post = await postRepository.findOne({
            where: { id: postId },
            relations: ["likedBy"]
        });
        
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        
        const currentUser = await userRepository.findOne({
            where: { user_id: user.user_id }
        });
        
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
        // Check if user already liked this post
        const alreadyLiked = post.likedBy.some((likedUser: User) => likedUser.user_id === currentUser.id);

        
        if (alreadyLiked) {
            // Unlike: Remove user from likedBy and decrement count
            post.likedBy = post.likedBy.filter((likedUser: User) => likedUser.user_id !== currentUser.id);
            post.likesCount = Math.max(0, post.likesCount - 1); // Ensure count doesn't go below 0
            await post.save();
            
            return res.json({
                id: post.id,
                likesCount: post.likesCount,
                liked: false
            });
        } else {
            // Like: Add user to likedBy and increment count
            post.likedBy.push(currentUser);
            post.likesCount += 1;
            await post.save();
            
            return res.json({
                id: post.id,
                likesCount: post.likesCount,
                liked: true
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Failed to like/unlike post" });
    }
});


// Delete a post
postRouter.delete('/:id', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const postId = parseInt(req.params.id);
      console.log(`Deleting post with id: ${postId}`);
      
      const postRepository = getRepository(Post);
      const commentRepository = getRepository(Comment);
      
      // First check if the post exists
      const post = await postRepository.findOne({ 
        where: { id: postId },
        relations: ['comments'] 
      });
      
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Delete all associated comments first
      // Use the proper TypeORM syntax: { post: { id: postId } }
      await commentRepository.delete({ post: { id: postId } }); 
      
      // Then delete the post itself
      await postRepository.remove(post);
      
      return res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({ message: 'Failed to delete post' });
    }
  });
    

export {postRouter}