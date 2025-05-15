import axios from "axios";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaThumbsUp, FaTrash, FaReply, FaComment } from "react-icons/fa6";
import type { commentTypes, postTypes } from "../types/PostTypes";


function Posts() {
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState<postTypes[]>([]);
  const [comments, setComments] = useState<{ [key: number]: any[] }>({});
  const [editingPost, setEditingPost] = useState<postTypes | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [likedPostIds, setLikedPostIds] = useState<number[]>([]);
  const [showCommentForm, setShowCommentForm] = useState<{ [key: number]: boolean }>({});
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);


  // Fetch posts and liked posts data
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch posts
        const postsRes = await axios.get("http://localhost:8000/posts", {
          withCredentials:true
        });
        setPosts(postsRes.data);
  
        // Fetch liked posts
        if (user) {
          const likedPostsRes = await axios.get(`http://localhost:8000/posts/${user.user_id}/liked`, {
            withCredentials: true, 
          });
          // Extract just the IDs from the liked posts response
          const likedIds = likedPostsRes.data.map((post: any) => post.id);
          setLikedPostIds(likedIds);
        }
      } catch (error) {
        console.error("Error fetching posts or liked posts:", error);
      }
    }
  
    fetchInitialData();
  }, [refreshTrigger, isAuthenticated, user]); // Include user in dependency array to refetch when user changes

  // Fetch comments when posts change
  useEffect(() => {
    if (posts.length === 0) return;
  
    const fetchAllComments = async () => {
      const newComments = { ...comments };
      
      for (const p of posts) {
        try {
          const res = await axios.get(`http://localhost:8000/comments/${p.id}`, {
           withCredentials:true
          });
          newComments[p.id] = Array.isArray(res.data) ? res.data : [];
        } catch (error) {
          console.error("Error fetching comments:", error);
        }
      }
      
      setComments(newComments);
    };
  
    fetchAllComments();
  }, [posts]); 

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = Object.fromEntries(new FormData(form));
    try {
      await axios.post("http://localhost:8000/posts", {
        title: formData.title,
        body: formData.body,
        user: user,
      }, {
        withCredentials:true
      });
      
      // Trigger refresh instead of updating state directly
      setRefreshTrigger(prev => prev + 1);
      form.reset();
    } catch (error) {
      console.log("Error Uploading the Post");
      console.error(error);
    }
  }

  async function handleEditPost(postId: number) {
    const postToEdit = posts.find((p) => p.id === postId);
    if (postToEdit) {
      setEditingPost(postToEdit);
      setEditTitle(postToEdit.title);
      setEditBody(postToEdit.body);
    }
  }

  async function handleSaveEdit() {
    if (!editingPost) return;

    try {
      await axios.put(
        `http://localhost:8000/posts/${editingPost.id}`,
        {
          title: editTitle,
          body: editBody,
          user: user,
        },
        {
          withCredentials: true
        }
      );

      // Update the post locally
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === editingPost.id
            ? { ...p, title: editTitle, body: editBody }
            : p
        )
      );

      setEditingPost(null);
      setEditTitle("");
      setEditBody("");
    } catch (error) {
      console.error("Error updating post:", error);
    }
  }

  async function handleCancelEdit() {
    setEditingPost(null);
    setEditTitle("");
    setEditBody("");
  }

  async function handleDelete(postId: number) {
    try {
      await axios.delete(`http://localhost:8000/posts/${postId}`,
        {
          withCredentials:true
        }
      );
      // Remove the post locally without refetching
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  }

  async function handleLikePost(postId: number) {
    try {
      // Check if the post is already liked
      const isLiked = likedPostIds.includes(postId);
  
      const response = await axios.post(
        `http://localhost:8000/posts/${postId}/like`,
        {
          user: user,
        },
        {
          withCredentials: true,
        }
      );
  
      // Update the post likes count in the local state
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, likesCount: response.data.likesCount } : p
        )
      );
  
      // Update the likedPosts state
      if (response.data.liked && !isLiked) {
        // Like the post
        setLikedPostIds((prev) => [...prev, postId]);
      } else if (!response.data.liked && isLiked) {
        // Unlike the post
        setLikedPostIds((prev) => prev.filter((id) => id !== postId));
      }
    } catch (error) {
      console.error("Error liking/unliking post:", error);
    }
  }
  
  const isPostLiked = (postId: number) => {
    return likedPostIds.includes(postId);
  };

  const handleDeleteComment = async (postId: number, commentId: number) => {
    try {
      await axios.delete(`http://localhost:8000/comments/${commentId}`, {
       withCredentials: true
      });
      
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(comment => comment.id !== commentId),
      }));
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      if (error.response) {
        console.error("Status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
    }
  };

  const handleComments = async (e: React.FormEvent<HTMLFormElement>, postId: number, parentId: number | null = null) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get('content') as string;
  
    try {
      const res = await axios.post(
        `http://localhost:8000/comments/${postId}`,
        { 
          content, 
          parentId,
          user
        },
        {
         withCredentials:true
        }
      );
      
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data],
      }));
  
      form.reset();
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };
  
  const toggleCommentForm = (postId: number) => {
    setShowCommentForm(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderComments = (comments: commentTypes[], postId: number, parentId: number | null = null) => {
    const filteredComments = comments.filter(comment => comment.parentId === parentId);
    
    if (filteredComments.length === 0) {
      return null;
    }
    
    return filteredComments.map(comment => (
      <div key={comment.id} className="mt-4 border border-gray-700 rounded-lg p-4 bg-gray-800">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-indigo-400 font-medium">
            {comment.author.email}
          </p>
          <span className="text-xs text-gray-400">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        
        <p className="text-gray-200 mb-3">{comment.body}</p>
        
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            className="flex items-center gap-1 text-xs px-2 py-1 bg-indigo-900 text-indigo-200 rounded hover:bg-indigo-800 transition-colors"
          >
            <FaReply size={12} /> Reply
          </button>
          
          {user && comment.author.email === user.email && (
            <button
              onClick={() => handleDeleteComment(postId, comment.id)}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-red-900 text-red-200 rounded hover:bg-red-800 transition-colors"
            >
              <FaTrash size={12} /> Delete
            </button>
          )}
        </div>
        
        {replyingTo === comment.id && (
          <form 
            onSubmit={(e) => handleComments(e, postId, comment.id)}
            className="mt-3 flex flex-col gap-2"
          >
            <div className="relative">
              <input 
                className="w-full bg-gray-700 border border-gray-600 p-2 rounded text-white focus:outline-none focus:border-indigo-500 text-sm pl-3" 
                type="text" 
                name="content" 
                placeholder="Reply to this comment" 
                required 
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
              >
                Post Reply
              </button>
              <button 
                type="button"
                onClick={() => setReplyingTo(null)} 
                className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
  
        <div className="ml-6 pl-4 border-l border-gray-700 mt-3">
          {renderComments(comments, postId, comment.id)}
        </div>
      </div>
    ));
  };

  const postsList = posts.map((item) => (
    <div key={item.id} className="mb-8 bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {editingPost && editingPost.id === item.id ? (
        <div className="p-6">
          <h2 className="text-xl font-bold text-indigo-400 mb-4">Edit Post</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-300 mb-1" htmlFor="edit-title">
                Title
              </label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                type="text"
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-300 mb-1" htmlFor="edit-body">
                Content
              </label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                id="edit-body"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
              Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="p-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-indigo-400 font-medium">
                {item.authorEmail}
              </p>
              <span className="text-xs text-gray-400">
                {new Date().toLocaleDateString()}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">{item.title}</h2>
            <p className="text-gray-300 mb-6 whitespace-pre-wrap">{item.body}</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLikePost(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isPostLiked(item.id)
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/50"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <FaThumbsUp 
                  size={14} 
                  className={isPostLiked(item.id) ? "text-white" : "text-gray-400"} 
                />
                <span>{item.likesCount || 0}</span>
              </button>
              
              <button
                onClick={() => toggleCommentForm(item.id)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaComment size={14} />
                <span>Comment</span>
              </button>
              
              {user && item.authorEmail === user.email && (
                <>
                  <button
                    onClick={() => handleEditPost(item.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <span>Edit</span>
                  </button>
                  
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FaTrash size={14} />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          {showCommentForm[item.id] && (
            <form 
              className="px-6 py-4 bg-gray-800 border-t border-gray-700" 
              onSubmit={(e) => handleComments(e, item.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-grow">
                  <input
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    type="text"
                    name="content"
                    placeholder="Write a comment..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <FaComment size={14} />
                  Comment
                </button>
              </div>
            </form>
          )}
          
          {comments[item.id]?.length > 0 && (
            <div className="px-6 py-4 bg-gray-800 border-t border-gray-700">
              <div className="mb-3 flex items-center">
                <h3 className="text-lg font-medium text-white">Comments</h3>
                <span className="ml-2 text-sm bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded-full">
                  {comments[item.id]?.filter(c => !c.parentId).length}
                </span>
              </div>
              
              <div className="space-y-4">
                {renderComments(comments[item.id] || [], item.id, null)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  ));

  return (
    <div className="min-h-screen text-white w-full">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-10 bg-gray-900 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-white mb-6">Create a Post</h1>
            
            <form
              className="space-y-4"
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-sm font-medium text-indigo-300 mb-1" htmlFor="title">
                  Title
                </label>
                <input
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="text"
                  name="title"
                  id="title"
                  placeholder="Enter a title for your post"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-indigo-300 mb-1" htmlFor="body">
                  Content
                </label>
                <textarea
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  name="body"
                  id="body"
                  placeholder="What's on your mind?"
                  required
                />
              </div>
              
              <button 
                type="submit"
                className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
              >
                Publish Post
              </button>
            </form>
          </div>
        </div>
        
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-indigo-400">Posts</h2>
        </div>
        
        {posts.length === 0 ? (
          <div className="text-center py-16 bg-gray-900 rounded-xl">
            <p className="text-gray-400">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {postsList}
          </div>
        )}
      </div>
    </div>
  );
}

export default Posts;