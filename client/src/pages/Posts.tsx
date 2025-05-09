import axios from "axios";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { FaThumbsUp } from "react-icons/fa6";
import type { commentTypes, postTypes } from "../types/PostTypes";

function Posts() {
  const { user } = useAuth();

  const [post, setPost] = useState<postTypes[]>([]);

  const [comments, setComments] = useState<{ [key: number]: any[] }>({});

  const [editingPost, setEditingPost] = useState<postTypes | null>(null);

  const [editTitle, setEditTitle] = useState("");

  const [editBody, setEditBody] = useState("");

  const [likedPosts, setLikedPosts] = useState<number[]>([]);


  useEffect(() => {
    async function fetchallPosts() {
      try {
        const res = await axios.get("http://localhost:8000/posts");
        setPost(res.data);
      } catch (error) {
        console.error("Error");
        console.log(error);
      }
    }

    fetchallPosts();
  }, []);

  useEffect(() => {
    const fetchComments = async (postId: number) => {
      try {
        const res = await axios.get(`http://localhost:8000/comments/${postId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        // Update only the comments for this specific post
        setComments(prevComments => ({
          ...prevComments,
          [postId]: Array.isArray(res.data) ? res.data : []
        }));
      } catch (error) {
        console.error("Error fetching comments:", error);
      } 
    };

    // Fetch comments for each post
    post.forEach((post) => fetchComments(post.id));
  }, [post]); // Fetch comments when posts change



  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = Object.fromEntries(new FormData(form));
    try {
      const res = await axios.post("http://localhost:8000/posts", {
        title: formData.title,
        body: formData.body,
        user: user,
      });
      console.log("Response from the Server: ", res.data);
      setPost((prevPost) => [...prevPost, res.data]);
      console.log(post);
    } catch (error) {
      console.log("Error Uploading the Post");
      console.error(error);
    }
    form.reset();
  }

  async function handleEditPost(postId: number) {
    const postToEdit = post.find((p) => p.id === postId);
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
        }
      );

      setPost((prevPosts) =>
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
      alert("Error Updating the Post");
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setPost((prevPosts) => prevPosts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Error Deleting Post");
    }
  }

  async function handleLikePost(postId: number) {
    try {
      const response = await axios.post(
        `http://localhost:8000/posts/${postId}/like`,
        {
          user: user,
        }
      );

      // Update the post's like count
      setPost((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId ? { ...p, likesCount: response.data.likesCount } : p
        )
      );

      // Update the liked status in our local state
      if (response.data.liked) {
        setLikedPosts((prev) => [...prev, postId]);
      } else {
        setLikedPosts((prev) => prev.filter((id) => id !== postId));
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  }

  // Check if the current user has liked a post
  const isPostLiked = (postId: number) => {
    return likedPosts.includes(postId);
  };

   
  const handleDeleteComment = async (postId: number, commentId: number) => {
    try {
      const token = localStorage.getItem("token");
  
      if (!token) {
        alert("You need to be logged in to delete a comment.");
        return;
      }
  
      // Send DELETE request to the backend
      await axios.delete(`http://localhost:8000/comments/${commentId}`, {
        headers: {
          Authorization: `Bearer ${token}`, 
        },
      });
  
      // Update local state after deletion
      setComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(comment => comment.id !== commentId),
      }));
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert("Error Deleting Comment");
    }
  };

  const handleComments = async (e: React.FormEvent<HTMLFormElement>, postId: number, parentId: number | null = null) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const content = formData.get('content') as string;
  
    console.log("Adding comment to post:", postId, "with parentId:", parentId);
  
    try {
      const res = await axios.post(
        `http://localhost:8000/comments/${postId}`,
        { 
          content, 
          parentId,
          user // Pass the current user object
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
  
      console.log("Comment added successfully:", res.data);
      
      // Update the comments state with the new comment
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data],
      }));
  
      form.reset();
    } catch (error) {
      console.error("Error adding comment:", error);
      if (axios.isAxiosError(error)) {
        console.error("Response data:", error.response?.data);
      }
    }
  };
  

  const renderComments = (comments: commentTypes[], postId: number, parentId: number | null = null) => {
    // Filter comments that belong to the specified parent
    const filteredComments = comments.filter(comment => comment.parentId === parentId);
    
    console.log(`Rendering ${filteredComments.length} comments for parent:`, parentId);
    
    if (filteredComments.length === 0) {
      return null;
    }
    
    return filteredComments.map(comment => (
      <div key={comment.id} className="mt-3 border  rounded-lg p-4">
        <p className="text-sm text-orange-400">Author: {comment.author.email}</p>
        <p className="mt-2">{comment.body}</p>
        <button
          onClick={() => handleDeleteComment(postId, comment.id)}
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Delete Comment
        </button>
        {/* Reply form */}
        <form onSubmit={(e) => handleComments(e, postId, comment.id)}>
          <input 
            className="mt-2 bg-gray-500 p-3 rounded w-full" 
            type="text" 
            name="content" 
            placeholder="Reply to this comment" 
            required 
          />
          <button 
            type="submit" 
            className="mt-2 bg-orange-400 p-2 rounded-lg hover:bg-orange-500"
          >
            Reply
          </button>
        </form>
  
        {/* Render child comments (replies) with increased left margin */}
        <div className="ml-8 mt-3">
          {renderComments(comments, postId, comment.id)}
        </div>
      </div>
    ));
  };

  const posts = post.map((item) => (
    <div key={item.id} className="border border-1  m-4 p-4">
      {editingPost && editingPost.id === item.id ? (
        <div className="edit-form">
          <h2 className="text-2xl text-orange-400">Edit Post</h2>
          <div className="mt-4">
            <label className="text-orange-500" htmlFor="edit-title">
              Title:
            </label>
            <input
              className="w-full bg-gray-500 p-2 mt-1"
              type="text"
              id="edit-title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <label className="text-orange-500" htmlFor="edit-body">
              Body:
            </label>
            <textarea
              className="w-full bg-gray-500 p-2 mt-1"
              id="edit-body"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={handleSaveEdit}
              className="px-2 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-2 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-orange-400">Author: {item.authorEmail}</p>
          <h1 className="mt-4 text-3xl">Title: {item.title}</h1>
          <p className="mt-6 text-sm">Body: {item.body}</p>

          <div className="mt-6 flex gap-4">
            <button
              onClick={() => handleEditPost(item.id)}
              className="px-2 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Edit Post
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="px-2 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete Post
            </button>
            <button
              onClick={() => handleLikePost(item.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded ${
                isPostLiked(item.id)
                  ? "bg-orange-500 text-white hover:bg-orange-600"
                  : "bg-gray-600 text-white hover:bg-gray-700"
              }`}
            >
              <FaThumbsUp size={16} />
              <span>{item.likesCount}</span>
            </button>
          </div>
          <form className="flex flex-col mt-16" onSubmit={(e) => handleComments(e, item.id)}>
            <label className="text-orange-500" htmlFor="comment">
              Comments:
            </label>
            <input
              className="m-4 w-250 rounded-lg bg-blue-200 text-black rounded-lg p-4"
              type="text"
              name="content"
              id="comment"
              placeholder="Enter your comment"
              required
            />
            <button className="flex items-center justify-center rounded-lg cursor-pointer m-16 text-center mt-4  bg-blue-200 p-3">
              Add Comment
            </button>
          </form>
          <ul className="list-disc pl-5">
            {comments[item.id]?.map(
              (comment: {
                id: number;
                author: { email: string };
                body: string;
              }) => (
                <div  key={comment.id} className="mt-3 border-1 border-orange-300 rounded-lg p-4">
                  <p className="text-sm text-orange-400 mt-2">
                    Author: {comment.author.email}
                  </p>{" "}
                  <p className="mt-2 font-bold">{comment.body}</p>
                  <form onSubmit={(e) => handleComments(e, item.id, comment.id)}>
                    <input
                      className="m-4 bg-blue-200 text-black rounded-lg p-4"
                      type="text"
                      name="content"
                      placeholder="Reply to this comment"
                      required
                    />
                    <button type="submit" className="bg-orange-400 p-3 rounded-lg">Reply</button>
                  </form>
                  {/* Render replies (nested comments) */}
                  <div style={{ marginLeft: "20px" }}>
                    {renderComments(comments[item.id] || [], item.id, comment.id)}  
                    </div>
                </div>
              )
            )}
          </ul>

        </>
      )}
    </div>
  ));

  return (
    <div className="flex flex-col p-4 mt-16 font-bold text-white w-full">
      <form
        className="p-4 flex flex-col border-1 rounded-lg "
        onSubmit={handleSubmit}
      >
        <h1 className="text-white text-2xl text-center">Add a post</h1>

        <label className="text-orange-500" id="title" htmlFor="title">
          Title:
        </label>
        <input
          className="m-4 p-4 bg-blue-200 text-black rounded-lg "
          type="text"
          name="title"
          id="title"
          placeholder="Enter the title"
          required
        />

        <label className="mt-4 text-orange-500 text-lg" htmlFor="body">
          Body:
        </label>
        <textarea
          className="m-4 bg-blue-200 p-4 text-sm rounded-lg text-black"
          name="body"
          id="body"
          placeholder={`What's on your Mind....`}
          required
        />

        <button className="flex items-center justify-center rounded-lg cursor-pointer text-center mt-4 p-3 bg-blue-200">
          Add Post
        </button>
      </form>
      <h1 className="text-5xl text-orange-500 mt-16">Posts: </h1>
      {posts}
    </div>
  );
}

export default Posts;


