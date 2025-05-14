import express, { NextFunction, Request, Response } from 'express';
import { Comment } from '../entities/Comment';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { getRepository } from 'typeorm';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const commentRouter = express.Router();

// Helper to extract user from token in cookies
const getUserFromToken = async (req: Request): Promise<User | null> => {
  const token = req.cookies.access_token;
  console.log('JWT Token:', token); // See if token exists
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET as string;
    const decoded: any = jwt.verify(token, secret);
    console.log('Decoded JWT:', decoded); // See what's in the token
    console.log('Looking for user with user_id:', decoded.userid);
    
    const user = await User.findOne({ where: { user_id: decoded.userid } });
    console.log('Found user:', user); // Check if user was found
    return user || null;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
};
// GET comments for a post
commentRouter.get('/:postId', async (req: Request, res: Response): Promise<any> => {
  const postId = parseInt(req.params.postId);

  try {
    const post = await Post.findOne({
      where: { id: postId },
      relations: ['comments', 'comments.author', 'comments.replies', 'comments.replies.author'],
    });

    if (!post) return res.status(404).json({ message: 'Post not found' });

    const topLevelComments = post.comments.filter(comment => !comment.parent);
    return res.status(200).json(topLevelComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ message: 'Error fetching comments' });
  }
});

// POST create a comment or reply
commentRouter.post('/:postId', async (req: Request, res: Response): Promise<any> => {
  const postId = parseInt(req.params.postId);
  const { content, parentId } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const post = await Post.findOne({ where: { id: postId } });
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const user = await getUserFromToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized: Invalid token or user' });
    console.log('User before comment creation:', user);
    const newComment = new Comment();
    newComment.body = content;
    newComment.post = post;
    newComment.author = user;

    if (parentId) {
      const parentComment = await Comment.findOne({ where: { id: parentId } });
      if (!parentComment) return res.status(404).json({ message: 'Parent comment not found' });
      newComment.parent = parentComment;
    }

    await newComment.save();

    const savedComment = await Comment.findOne({
      where: { id: newComment.id },
      relations: ['author', 'replies', 'replies.author'],
    });

    return res.status(201).json(savedComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ message: 'An error occurred while adding the comment' });
  }
});

commentRouter.delete('/:commentId', async (req: Request, res: Response): Promise<any> => {
  try {
    const commentId = parseInt(req.params.commentId);
    console.log(`01: Attempting to delete comment ID: ${commentId}`);
    
    const user = await getUserFromToken(req);
    console.log('02: User from token:', user ? `ID: ${user.user_id}, Email: ${user.email}` : 'No user found');
    
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    // Load the comment with all its replies and nested relationships
    const comment = await Comment.findOne({
      where: { id: commentId },
      relations: ['author', 'post', 'replies', 'replies.author', 'replies.replies'],
    });
    
    console.log('03: Comment found:', comment ? `ID: ${comment.id}, Author ID: ${comment.author.user_id}` : 'No comment found');
    
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    console.log(`04: Comparing user ID ${user.user_id} with comment author ID ${comment.author.user_id}`);
    if (comment.author.user_id !== user.user_id) {
      console.log('05: User ID mismatch - not the comment owner');
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    // Check if it has replies
    if (comment.replies && comment.replies.length > 0) {
      console.log(`06: Comment has ${comment.replies.length} replies`);
      
      // Option 1: Recursively delete all replies
      const commentRepository = getRepository(Comment);
      
      // Create a function to recursively delete comments and their replies
      const deleteCommentAndReplies = async (commentToDelete: Comment) => {
        // Check if this comment has replies
        if (commentToDelete.replies && commentToDelete.replies.length > 0) {
          // Delete all replies first
          for (const reply of commentToDelete.replies) {
            await deleteCommentAndReplies(reply);
          }
        }
        
        // Then delete the comment itself
        await commentRepository.remove(commentToDelete);
      };
      
      // Start the recursive deletion
      await deleteCommentAndReplies(comment);
      
      // Option 2 (alternative): Just mark the comment as deleted but keep the structure
      // comment.body = "[This comment has been deleted]";
      // comment.isDeleted = true; // You would need to add this field to your Comment entity
      // await comment.save();
      
      return res.status(200).json({ message: 'Comment and all replies deleted successfully' });
    } else {
      // No replies, can delete directly
      console.log('06: Comment has no replies, deleting directly');
      await getRepository(Comment).remove(comment);
      return res.status(200).json({ message: 'Comment deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
});


const generateAccessToken = (userId: number) => {
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = '1h'; // You can adjust the expiration time here
  const token = jwt.sign({ userId }, secret, { expiresIn });
  return token;
};

// Function to generate a new refresh token
const generateRefreshToken = (userId: number) => {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  const expiresIn = '7d'; // You can adjust the expiration time for refresh token
  const refreshToken = jwt.sign({ userId }, secret, { expiresIn });
  return refreshToken;
};

const authenticateUser = async (req: Request, res: Response,next:NextFunction):Promise<any> => {
  let user = await getUserFromToken(req);

  if (!user) {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: 'Unauthorized: No refresh token' });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    try {
      const decodedRefreshToken: any = jwt.verify(refreshToken, refreshSecret);
      user = await User.findOne({ where: { user_id: decodedRefreshToken.userid } });
      
      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: Invalid refresh token' });
      }

      // Generate new access token and refresh token
      const newAccessToken = generateAccessToken(user.user_id);
      const newRefreshToken = generateRefreshToken(user.user_id);

      // Set the new tokens in cookies
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 1000, // 1 hour
      });

    } catch (refreshError) {
      return res.status(401).json({ message: 'Unauthorized: Failed to verify refresh token' });
    }
  }

  // Attach the user to the request object for further processing
  next();
};

export { authenticateUser };

export default commentRouter;
