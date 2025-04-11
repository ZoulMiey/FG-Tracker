import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./styles.css";

const Home = () => {
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const navigate = useNavigate();
  const site = sessionStorage.getItem("loggedInSite") || "kajang";

  const totalItems = samples.length;
  const takenItems = samples.filter((s) => s.status === "Taken").length;
  const returnedItems = totalItems - takenItems;

  const fetchSamples = async () => {
    try {
      setLoading(true);
      const results: any[] = [];

      const brandDocs = await getDocs(
        collection(db, `users/${site}/fg_samples`)
      );
      for (const brandDoc of brandDocs.docs) {
        const brandName = brandDoc.id;

        const samplesSnapshot = await getDocs(
          collection(db, `users/${site}/fg_samples/${brandName}/samples`)
        );

        samplesSnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() });
        });
      }

      setSamples(results);
    } catch (error) {
      console.error("Error fetching samples:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [site]);

  const handleAdminLogin = () => {
    if (adminPassword === "12345") {
      setLoginError("");
      closeLoginModal();
      navigate("/update");
    } else {
      setLoginError("Incorrect password.");
    }
  };

  const openLoginModal = () => {
    setAdminPassword("");
    setLoginError("");
    setShowLoginModal(true);
  };

  const closeLoginModal = () => {
    setAdminPassword("");
    setLoginError("");
    setShowLoginModal(false);
  };

  return (
    <div className="homepage-container responsive-bg">
      <div className="main-content">
        <h1 className="title">FG Reference Sample</h1>

        <div className="counter-container">
          <div className="counter-item">
            <div className="counter-box">
              <span className="counter-number">{totalItems}</span>
            </div>
            <p className="counter-label">Total Items</p>
          </div>
          <div className="counter-item">
            <div className="counter-box">
              <span className="counter-number">{takenItems}</span>
            </div>
            <p className="counter-label">Taken</p>
          </div>
          <div className="counter-item">
            <div className="counter-box">
              <span className="counter-number">{returnedItems}</span>
            </div>
            <p className="counter-label">Returned</p>
          </div>
        </div>

        <div className="button-container">
          <Link to="/take">
            <button className="btn-action btn-home">Search</button>
          </Link>
          <button className="btn-action btn-update" onClick={openLoginModal}>
            Update
          </button>
          <Link to="/report">
            <button className="btn-action btn-download">Record</button>
          </Link>
        </div>
      </div>

      {/* Admin Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={closeLoginModal}>
          <div
            className="modal-content form-modal login-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Admin Login</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAdminLogin();
              }}
            >
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="search-bar"
              />
              {loginError && (
                <p style={{ color: "red", marginTop: "10px" }}>{loginError}</p>
              )}

              <div className="login-button-group">
                <button type="submit" className="btn-action btn-take">
                  Submit
                </button>
                <button
                  type="button"
                  className="btn-action btn-close"
                  onClick={closeLoginModal}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
