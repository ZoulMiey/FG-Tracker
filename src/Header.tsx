import React from "react";
import { useNavigate } from "react-router-dom";
import "./Header.css";

const Header = ({ onLogout }: { onLogout?: () => void }) => {
  const navigate = useNavigate();

  // ✅ Get site from session storage (centralized control)
  const site = sessionStorage.getItem("loggedInSite") || "";
  const displaySite =
    site.charAt(0).toUpperCase() + site.slice(1).toLowerCase();

  const handleLogout = () => {
    if (site) {
      localStorage.removeItem(`loggedIn_${site}`);
    }
    sessionStorage.clear(); // ✅ clear all site-related session
    navigate("/login"); // no need for `?site=`, handled in Login
    if (onLogout) onLogout(); // optional external hook
  };

  return (
    <header className="fixed-header">
      <div className="header-left">
        <img src="/logo.png" alt="Logo" className="header-logo" />
        <span className="company-name">Manufacturing Quality Team</span>
      </div>

      {site && (
        <div className="header-site-info">
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
          Logged in as: <strong>{displaySite}</strong>
        </div>
      )}
    </header>
  );
};

export default Header;
