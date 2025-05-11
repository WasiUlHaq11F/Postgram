import express, { Request, Response } from 'express';
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
  const token = req.cookies.jwt;
  // console.log('JWT Token:', token); // See if token exists
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

// DELETE comment
commentRouter.delete('/:commentId', async (req: Request, res: Response): Promise<any> => {
  try {
    const commentId = parseInt(req.params.commentId);
    console.log(`Attempting to delete comment ID: ${commentId}`);
    
    // Check if cookies are being received
    console.log('Cookies received:', req.cookies);
    
    const user = await getUserFromToken(req);
    console.log('User from token:', user ? `ID: ${user.user_id}, Email: ${user.email}` : 'No user found');
    
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const comment = await Comment.findOne({
      where: { id: commentId },
      relations: ['author', 'post'],
    });
    
    console.log('Comment found:', comment ? `ID: ${comment.id}, Author ID: ${comment.author.user_id}` : 'No comment found');
    
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    console.log(`Comparing user ID ${user.user_id} with comment author ID ${comment.author.user_id}`);
    if (comment.author.user_id !== user.user_id) {
      console.log('User ID mismatch - not the comment owner');
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    console.log('Proceeding with comment deletion');
    await getRepository(Comment).remove(comment);
    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
});

export default commentRouter;
