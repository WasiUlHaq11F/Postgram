import express, { Request, Response } from 'express';
import { Comment } from '../entities/Comment';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { getRepository } from 'typeorm';
import jwt from 'jsonwebtoken'; // Add jsonwebtoken to decode the token
import dotenv from "dotenv";

dotenv.config();
const commentRouter = express.Router();

// Get comments for a post
commentRouter.get('/:postId', async (req: Request, res: Response): Promise<any> => {
  const postId = parseInt(req.params.postId);
  
  try {
    // Find the post by postId
    const post = await Post.findOne({
      where: { id: postId },
      relations: ['comments', 'comments.author', 'comments.replies', 'comments.replies.author'],
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Return only top-level comments (those without a parent)
    const topLevelComments = post.comments.filter(comment => !comment.parent);
    
    return res.status(200).json(topLevelComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Create a comment or reply
commentRouter.post('/:postId', async (req: Request, res: Response): Promise<any> => {
  const postId = parseInt(req.params.postId);
  const { content, userId, parentId } = req.body;

  if (!content || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    // Find the post by postId
    const post = await Post.findOne({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Find the user from the userId in the request body
    const user = await User.findOne({ where: { user_id: userId } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new comment
    const newComment = new Comment();
    newComment.body = content;
    newComment.post = post;
    newComment.author = user;

    // If this is a reply, set the parent comment
    if (parentId) {
      const parentComment = await Comment.findOne({ where: { id: parentId } });
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      newComment.parent = parentComment;
    }

    // Save the comment to the database
    await newComment.save();

    // Fetch the complete comment with relations for the response
    const savedComment = await Comment.findOne({
      where: { id: newComment.id },
      relations: ['author', 'replies', 'replies.author'],
    });

    // Send the newly created comment back as a response
    return res.status(201).json(savedComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return res.status(500).json({ message: 'An error occurred while adding the comment' });
  }
});


commentRouter.delete('/:commentId', async (req, res): Promise<any> => {
  try {
    const commentId = parseInt(req.params.commentId);

    // Get the token from the Authorization header (Bearer token)
    const token = req.headers.authorization?.split(' ')[1]; // Extract token

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Decode the token and extract the userId (assuming userId is stored in the token)
    let decodedToken: any;
    try {
      const secret = process.env.JWT_SECRET as string
      decodedToken = jwt.verify(token,secret); // Replace with your JWT secret
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }

    const userId = decodedToken.userId; // Assuming the userId is stored in the token

    const commentRepository = getRepository(Comment);

    // Find the comment by ID
    const comment = await commentRepository.findOne({
      where: { id: commentId },
      relations: ['author', 'post'], // Load author and post relations
    });

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if the logged-in user is the author of the comment
    if (comment.author.user_id !== userId) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    // Delete the comment
    await commentRepository.remove(comment);

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
});


export default commentRouter;