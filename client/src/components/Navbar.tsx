import { useEffect } from "react";
import { useAuth } from "../context/AuthContext"; // Ensure path is correct
import '../index.css';

function Navbar() {
  const { user, logout } = useAuth();

  useEffect(() => {
    console.log("Navbar mounted, auth state:", { user });

    const localStorageUser = localStorage.getItem('user');
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

  const handleLogOut = () => {
    console.log("Logout clicked");
    logout();
  };

  const toggleTheme = () => {
    document.body.classList.toggle('light');
  };

  return (
    <nav className="w-full text-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-3xl font-bold">Postgram</h1>

      <div className="flex flex-col items-end space-y-2">
        <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition"
          onClick={toggleTheme}
        >
          Toggle Theme
        </button>

        {user && (
          <>
            <p className="text-sm">{user.email || "No email found"}</p>

            <button
              onClick={handleLogOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white transition"
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
