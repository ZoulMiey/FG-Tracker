import Header from "./Header";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./styles.css";

const ReturnSample = () => {
  const site = sessionStorage.getItem("loggedInSite") || "kajang";
  const [name, setName] = useState("");
  const [line, setLine] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const navigate = useNavigate();

  const fetchSamples = async () => {
    try {
      const brandDocs = await getDocs(
        collection(db, `users/${site}/fg_samples`)
      );
      let allSamples: any[] = [];

      for (const brandDoc of brandDocs.docs) {
        const brandName = brandDoc.id;
        const samplesSnap = await getDocs(
          collection(db, `users/${site}/fg_samples/${brandName}/samples`)
        );

        const sampleData = samplesSnap.docs.map((doc) => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data(),
        }));

        allSamples = allSamples.concat(sampleData);
      }

      setSamples(allSamples);
    } catch (error) {
      console.error("Error fetching site-specific samples:", error);
    }
  };

  useEffect(() => {
    fetchSamples();
  }, [site]);

  useEffect(() => {
    const savedName = sessionStorage.getItem("userName");
    const savedLine = sessionStorage.getItem("userLine");

    if (savedName) setName(savedName);
    if (savedLine) setLine(savedLine);
  }, []);

  const filteredSamples = searchQuery
    ? samples.filter(
        (s) =>
          s.mfg?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleReturnSubmit = async () => {
    if (!name.trim() || !line.trim()) {
      setFormError("Please enter Name and Line before proceeding.");
      return;
    }

    sessionStorage.setItem("userName", name.trim());
    sessionStorage.setItem("userLine", line.trim());

    if (!selectedSample) {
      setFormError("No sample selected.");
      return;
    }

    try {
      const now = new Date();
      const formattedDate = now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const formattedTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      await updateDoc(selectedSample.ref, {
        status: "Available",
        name: "",
        line: "",
        date: "",
        time: "",
        returnedBy: name,
        returnLine: line,
        returnDate: formattedDate,
        returnTime: formattedTime,
        timestamp: serverTimestamp(),
      });

      setSuccessMessage("Sample returned successfully!");
      setFormError("");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      console.error("Error returning sample:", error);
      setFormError("Error returning sample. Please try again.");
    }
  };

  return (
    <div className="sample-container">
      <Header />
      <h1 className="title">Return FG Sample</h1>
      <div className="input-group">
        <input
          className="input-field"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Line"
          value={line}
          onChange={(e) => setLine(e.target.value)}
        />
      </div>
      <input
        className="input-field full-width"
        placeholder="Search MFG, Batch Number, Description or Brand..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <ul className="search-results">
          {filteredSamples.length > 0 ? (
            filteredSamples.map((sample) => (
              <li
                key={sample.id}
                className="search-item"
                onClick={() => setSelectedSample(sample)}
              >
                <span>
                  <strong>{sample.brand?.toUpperCase() || "NO BRAND"}</strong> —{" "}
                  {sample.mfg} - {sample.batchNumber} - {sample.description}
                </span>
              </li>
            ))
          ) : (
            <li className="no-results">No results found</li>
          )}
        </ul>
      )}
      {formError && <p className="error-message">{formError}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
      <div className="button-container">
        <button className="btn-action btn-return" onClick={handleReturnSubmit}>
          Confirm Return
        </button>
        <button
          className="btn-action btn-take"
          onClick={() => navigate(`/?site=${site}`)}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ReturnSample;
