import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Header from "./Header";
import Home from "./Home";
import UpdateSample from "./UpdateSample";
import TakeSample from "./TakeSample";
import ReturnSample from "./ReturnSample";
import ReportPage from "./ReportPage";
import Login from "./Login";

const NotFound = () => (
  <h2 style={{ textAlign: "center", marginTop: "50px" }}>
    404 - Page Not Found
  </h2>
);

// ✅ Protected Pages
const ProtectedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const sessionSite = sessionStorage.getItem("loggedInSite");
  const isLoggedIn = localStorage.getItem(`loggedIn_${sessionSite}`);

  useEffect(() => {
    if (!isLoggedIn || !sessionSite) {
      navigate("/login");
    }
  }, [isLoggedIn, sessionSite, navigate]);

  return (
    <>
      <Header
        onLogout={() => {
          if (sessionSite) {
            localStorage.removeItem(`loggedIn_${sessionSite}`);
          }
          sessionStorage.clear();
          navigate("/login");
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/update" element={<UpdateSample />} />
        <Route path="/take" element={<TakeSample />} />
        <Route path="/return" element={<ReturnSample />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
};

export default App;
