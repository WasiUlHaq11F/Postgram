import  { useEffect } from "react";
import { useAuth } from "../context/AuthContext"; // Make sure path is correct
import '../index.css'

function Navbar() {
  
  const { user, logout } = useAuth();

  // Debug user data when component mounts and when user changes
  useEffect(() => {
    console.log("Navbar mounted, auth state:", { user });
    
    // Check localStorage directly
    const localStorageUser = localStorage.getItem('user');
    // console.log("User from localStorage:", localStorageUser);
    
    if (localStorageUser) {
      try {
        const parsedUser = JSON.parse(localStorageUser);
        console.log("Parsed user:", parsedUser);
        console.log("Email from parsed user:", parsedUser.email);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, [user]);

  function handleLogOut() {
    console.log("Logout clicked");
    logout();
  }

  const toggleTheme = () => {
    document.body.classList.toggle('light');
  };

  return (
    <div className="flex  w-full p-4 justify-between">
      <h1 className="text-5xl">Postgram</h1>

      <div className="flex flex-col items-end">    
      <button className="rounded-md mb-2 p-2 bg-blue-500 text-black cursor-pointer" onClick={toggleTheme}>
                Toggle Theme
          </button> 
        {user && 
          <>
            <p className="text-center mt-3">
              {user.email || "No email found"}
            </p>

            <button
              onClick={handleLogOut}
              className="p-2 mt-2 rounded-lg text-center bg-red-500 text-black cursor-pointer"
            >
              Log Out
            </button>
          </>
       }
      </div>
    </div>
  );
}

export default Navbar;