import Navbar from "./components/Navbar";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import Posts from "./pages/Posts";
import { BrowserRouter, Routes, Route, Navigate } from "react-router"; 
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";
import ThemeToggle from "./components/themeToggle";

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // FIXED: Use isAuthenticated instead of token
  const { isAuthenticated } = useAuth();
  
  console.log("ProtectedRoute check - isAuthenticated:", isAuthenticated);
  
  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to login");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user, isAuthenticated } = useAuth();
  useEffect(() => {
    console.log("Routes rendered with auth state:", { user, isAuthenticated });
    console.log("localStorage user:", localStorage.getItem('user'));
  }, [user, isAuthenticated]);


  
  return (
    <div className="flex flex-col items-center">

      <Navbar />
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<Auth />} />
        <Route path="/SignUp" element={<SignUp />} />
        <Route
          path="/posts"
          element={
            <ProtectedRoute>
              <Posts />
            </ProtectedRoute>
          }
        />
        {/* Route for unknown paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

    </div>
  );
}

function App() {

  return (
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
   
  );
}

export default App;