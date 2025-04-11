import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

const Login = () => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [line, setLine] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  // ✅ Auto redirect if already logged in
  useEffect(() => {
    const storedSite = sessionStorage.getItem("loggedInSite");
    if (storedSite) {
      navigate(`/?site=${storedSite}`);
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim().toLowerCase();

    // ✅ Detect site from user ID
    let detectedSite = "";
    if (trimmedName.startsWith("mqtkajang")) {
      detectedSite = "kajang";
    } else if (trimmedName.startsWith("mqtsubang")) {
      detectedSite = "subang";
    } else {
      showError("Invalid user ID. Use MQTKAJANG or MQTSUBANG.");
      return;
    }

    try {
      const userRef = doc(db, "users", trimmedName);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showError("User not found");
        return;
      }

      const userData = userSnap.data();
      if (userData.password !== password) {
        showError("Incorrect password");
        return;
      }

      // ✅ Store session and site info
      localStorage.setItem(`loggedIn_${detectedSite}`, "true");
      sessionStorage.setItem("site", detectedSite);
      sessionStorage.setItem("loggedInSite", detectedSite);
      sessionStorage.setItem("userName", trimmedName);
      sessionStorage.setItem("userLine", line);

      navigate(`/?site=${detectedSite}`);
    } catch (err) {
      console.error("Login failed", err);
      showError("Login error. Please try again.");
    }
  };

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(""), 2500);
  };

  return (
    <div className="login-page responsive-bg">
      <div className="login-card">
        <h2 className="login-title">FG Sample Tracker</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Enter name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="login-input"
          />
          <input
            type="text"
            placeholder="Enter line"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            className="login-input"
          />
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
          <button type="submit" className="btn-action btn-home">
            Login
          </button>
        </form>
      </div>

      {error && (
        <div className="error-modal-overlay">
          <div className="error-modal">
            <h3 className="error-title">LOGIN ERROR</h3>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
