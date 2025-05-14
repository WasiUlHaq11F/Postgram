import express from "express"
import { Post } from "../entities/Post";
import { getRepository, getTreeRepository } from "typeorm";
import { User } from "../entities/User";
import { Comment } from "../entities/Comment";
import jwt from 'jsonwebtoken'; 
const postRouter = express.Router();



const getUserFromToken = async (req: express.Request): Promise<User | null> => {
  const token = req.cookies.access_token
                 
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return null;
    }
    
    const decoded: any = jwt.verify(token, secret);
    console.log('Looking for user with user_id:', decoded.userid || decoded.user_id);
    
    const userId = decoded.userid || decoded.user_id;
    const user = await User.findOne({ where: { user_id: userId } });
    console.log('Found user:', user);
    return user || null;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
};



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
        authorEmail: post.author.email,
        likesCount: post.likesCount || 0 
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

postRouter.post('/:id/like', async (req, res):Promise<any> => {
    const postId = parseInt(req.params.id);
    const { user } = req.body;
  
    try {
      const postRepository = getRepository(Post);
      const userRepository = getRepository(User);
  
      const post = await postRepository.findOne({
        where: { id: postId },
        relations: ['likedBy'],
      });
  
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
  
      const currentUser = await userRepository.findOne({
        where: { user_id: user.user_id }
      });
  
      if (!currentUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const alreadyLiked = post.likedBy.some(
        (likedUser: User) => likedUser.user_id === currentUser.user_id
      );
  
      if (alreadyLiked) {
        // Unlike the post
        post.likedBy = post.likedBy.filter(
          (likedUser: User) => likedUser.user_id !== currentUser.user_id
        );
        post.likesCount = Math.max(0, post.likesCount - 1);
        await postRepository.save(post);
  
        return res.json({
          id: post.id,
          likesCount: post.likesCount,
          liked: false,
        });
      } else {
        // Like the post
        post.likedBy.push(currentUser);
        post.likesCount += 1;
        await postRepository.save(post);
  
        return res.json({
          id: post.id,
          likesCount: post.likesCount,
          liked: true,
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      return res.status(500).json({ message: 'Failed to like/unlike post' });
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

  postRouter.get('/:userId/liked', async (req, res): Promise<any> => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Find the user first
      const userRepository = getRepository(User);
      const user = await userRepository.findOne({
        where: { user_id: userId }
      });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Then find the liked posts separately
      const postRepository = getRepository(Post);
      const likedPosts = await postRepository
        .createQueryBuilder('post')
        .innerJoinAndSelect('post.likedBy', 'user', 'user.user_id = :userId')
        .leftJoinAndSelect('post.author', 'author')
        .setParameter('userId', userId)
        .getMany();
      
      // Map the posts to the desired format
      const formattedPosts = likedPosts.map(post => ({
        id: post.id,
        title: post.title,
        body: post.body,
        authorEmail: post.author ? post.author.email : null,
        likesCount: post.likesCount || 0,
        liked: true // Since these are specifically liked posts
      }));
      
      return res.json(formattedPosts);
    } catch (error) {
      console.error('Error fetching liked posts:', error);
      console.log(error.stack);
      return res.status(500).json({ message: 'Failed to fetch liked posts' });
    }
  });
  /**
   * Alternative implementation using direct query
   * This can be useful if the relationship isn't working properly
   */
  postRouter.get('/user/:userId/liked-alt', async (req, res):Promise<any> => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Query the join table directly 
      const postRepository = getRepository(Post);
      
      // Using queryBuilder to get posts liked by the user
      const likedPosts = await postRepository
        .createQueryBuilder('post')
        .innerJoinAndSelect(
          'post_likes', // Use your actual join table name here
          'pl',
          'pl.post_id = post.id'
        )
        .innerJoinAndSelect(
          'post.author',
          'author'
        )
        .where('pl.user_id = :userId', { userId })
        .getMany();
  
      if (!likedPosts.length) {
        return res.json([]);
      }
  
      // Map the posts to the desired format
      const response = likedPosts.map(post => ({
        id: post.id,
        title: post.title,
        body: post.body,
        authorEmail: post.author ? post.author.email : null,
        likesCount: post.likesCount || 0,
        liked: true
      }));
  
      return res.json(response);
    } catch (error) {
      console.error('Error fetching liked posts with alternative method:', error);
      console.log(error.stack); // Add stack trace for better debugging
      return res.status(500).json({ message: 'Failed to fetch liked posts' });
    }
  });
  
  // Add a debugging endpoint to check what's happening with the tables
  postRouter.get('/debug/like-tables', async (req, res):Promise<any> => {
    try {
      // Get the database connection from TypeORM
      const connection = getRepository(Post).manager.connection;
      
      // Get all tables in the database
      const tables = await connection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      // Check if your join table exists
      const joinTableName = "post_likes"; // or "posts_liked" if that's the actual name
      const tableExists = tables.some((t: { table_name: string }) => t.table_name === joinTableName);
      
      if (!tableExists) {
        return res.status(404).json({ 
          message: `Join table '${joinTableName}' does not exist`,
          allTables: tables.map((t: { table_name: string }) => t.table_name)
        });
      }
      
      // Query the join table structure
      const tableStructure = await connection.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${joinTableName}'
      `);
      
      // Get sample data from the join table
      const sampleData = await connection.query(`
        SELECT * FROM ${joinTableName} LIMIT 10
      `);
      
      return res.json({
        tableExists,
        tableName: joinTableName,
        structure: tableStructure,
        sampleData
      });
    } catch (error: any) {
      console.error('Error debugging like tables:', error);
      return res.status(500).json({ message: 'Failed to debug like tables', error: error.message });
    }
  });

export {postRouter}