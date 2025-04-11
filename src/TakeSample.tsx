import Header from "./Header";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import "./styles.css";

const formatDate = (input: string) => {
  if (!input || input === "-") return "-";
  const date = new Date(input);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const TakeSample = () => {
  const site = sessionStorage.getItem("loggedInSite") || "kajang";
  const [searchQuery, setSearchQuery] = useState("");
  const [samples, setSamples] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [name, setName] = useState(
    () => sessionStorage.getItem("userName") || ""
  );
  const [line, setLine] = useState(
    () => sessionStorage.getItem("userLine") || ""
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const navigate = useNavigate();
  const lastQueryRef = useRef("");

  const fetchSamples = async () => {
    try {
      const brandCollections = await getDocs(
        collection(db, `users/${site}/fg_samples`)
      );
      let allSamples: any[] = [];

      for (const brandDoc of brandCollections.docs) {
        const brandName = brandDoc.id;
        const samplesSnapshot = await getDocs(
          collection(db, `users/${site}/fg_samples/${brandName}/samples`)
        );

        const samples = samplesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ref: doc.ref,
          ...doc.data(),
        }));

        allSamples = allSamples.concat(samples);
      }

      setSamples(allSamples);
    } catch (error) {
      console.error("Error fetching site-specific samples:", error);
    }
  };

  useEffect(() => {
    if (site) fetchSamples();
  }, [site]); // ✅ include `site` as dependency

  useEffect(() => {
    if (!searchQuery) return;

    const keywords = searchQuery.toLowerCase().split(" ");
    const matchedSamples = samples.filter((s) => {
      const combined = [
        s.id,
        s.barcode,
        s.mfg,
        s.batchNumber,
        s.description,
        s.brand,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return keywords.every((kw) => combined.includes(kw));
    });

    const isBarcode = samples.some(
      (s) =>
        s.barcode &&
        keywords.length === 1 &&
        s.barcode.toLowerCase() === keywords[0]
    );

    if (matchedSamples.length === 1 && isBarcode) {
      setSelectedSample(matchedSamples[0]);
    } else {
      setSelectedSample(null);
    }

    setIsSubmitted(false);
    setShowTakeModal(false);
    setShowReturnModal(false);
    lastQueryRef.current = searchQuery;

    // 💡 Smooth scroll to top when typing
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchQuery, samples]);

  const filteredSamples = searchQuery
    ? samples.filter((s) => {
        const keywords = searchQuery.toLowerCase().split(" ");
        const combined = [
          s.id,
          s.barcode,
          s.mfg,
          s.batchNumber,
          s.description,
          s.brand,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return keywords.every((kw) => combined.includes(kw));
      })
    : [];

  const handleTakeSubmit = async () => {
    if (!name.trim() || !line.trim()) {
      setError("Name and Line are required.");
      return;
    }

    sessionStorage.setItem("userName", name.trim());
    sessionStorage.setItem("userLine", line.trim());

    if (!selectedSample) return;
    try {
      await updateDoc(selectedSample.ref, {
        status: "Taken",
        takenBy: name.trim(),
        line: line.trim(),
        date: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        timestamp: serverTimestamp(),
      });

      setName("");
      setLine("");
      setError("");
      setSearchQuery("");
      setSuccessMessage("Sample successfully taken!");
      setShowTakeModal(false);
      setIsSubmitted(true);

      const updatedDoc = await getDoc(selectedSample.ref);
      if (updatedDoc.exists()) {
        setSelectedSample({
          id: updatedDoc.id,
          ref: selectedSample.ref,
          ...(updatedDoc.data() as Record<string, any>),
        });
      }

      await fetchSamples();
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error) {
      console.error("Error updating sample:", error);
    }
  };

  const handleReturnSubmit = async () => {
    if (!name.trim() || !line.trim()) {
      setError("Name and Line are required.");
      return;
    }

    sessionStorage.setItem("userName", name.trim());
    sessionStorage.setItem("userLine", line.trim());

    if (!selectedSample) return;
    try {
      await updateDoc(selectedSample.ref, {
        status: "Available",
        returnBy: name.trim(),
        returnLine: line.trim(),
        returnDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        returnTime: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        timestamp: serverTimestamp(),
      });

      setName("");
      setLine("");
      setError("");
      setSearchQuery("");
      setSuccessMessage("Sample successfully returned!");
      setShowReturnModal(false);
      setIsSubmitted(true);

      const updatedDoc = await getDoc(selectedSample.ref);
      if (updatedDoc.exists()) {
        setSelectedSample({
          id: updatedDoc.id,
          ref: selectedSample.ref,
          ...(updatedDoc.data() as Record<string, any>),
        });
      }

      await fetchSamples();
      setTimeout(() => setSuccessMessage(""), 2000);
    } catch (error) {
      console.error("Error returning sample:", error);
    }
  };

  return (
    <div
      className={`take-sample-container page-with-header ${
        !searchQuery ? "center-on-load" : ""
      }`}
    >
      <Header />
      {successMessage && (
        <div className="success-toast center">
          <div className="toast-content">
            <span className="check-icon">✅</span>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
      <h1 className="title">FG Sample</h1>
      <div className="search-container">
        <input
          className="search-bar"
          type="text"
          placeholder="Search MFG, Batch Number, Description, Brand or Barcode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
        {searchQuery && (
          <button
            className="btn-clear"
            onClick={() => {
              setSearchQuery("");
              setSelectedSample(null);
              setIsSubmitted(false);
              setShowTakeModal(false);
              setShowReturnModal(false);
            }}
          >
            Clear
          </button>
        )}
      </div>
      {searchQuery && (
        <div className="search-results-container">
          <ul className="search-results">
            {filteredSamples.length > 0 &&
              filteredSamples.map((sample) => (
                <li
                  key={sample.id}
                  className="search-item"
                  onClick={() => {
                    setSelectedSample(sample);
                    setIsSubmitted(false);
                  }}
                >
                  <span>
                    <strong>{sample.brand?.toUpperCase() || "NO BRAND"}</strong>
                    {" — "}
                    {sample.mfg} - {sample.batchNumber} - {sample.description}
                    {sample.packSize ? ` (${sample.packSize})` : ""}
                  </span>
                  <div className="status-button-container">
                    <span
                      className={`status ${
                        sample.status === "Taken"
                          ? "text-taken"
                          : "text-available"
                      }`}
                    >
                      {sample.status === "Taken" ? "TAKEN" : "AVAILABLE"}
                    </span>
                  </div>
                </li>
              ))}
            {filteredSamples.length === 0 && (
              <li className="no-results">No results found</li>
            )}
          </ul>
        </div>
      )}
      {selectedSample && (
        <div className="modal-overlay" onClick={() => setSelectedSample(null)}>
          <div
            className="modal-content modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-left">
              <img
                src={selectedSample.imageUrl || "/placeholder.png"}
                alt="Sample"
                className="modal-image"
              />
            </div>
            <div className="modal-right">
              <div
                className="modal-right"
                style={{
                  maxHeight: "80vh",
                  overflowY: "auto",
                  flex: 1,
                  padding: "0 16px",
                  minWidth: "320px",
                }}
              >
                <h2 className="modal-title">{selectedSample.description}</h2>
                <div className="modal-info align-labels">
                  <p>
                    <span className="label">Brand:</span>
                    <span className="value">{selectedSample.brand || "-"}</span>
                  </p>
                  <p>
                    <span className="label">MFG:</span>
                    <span className="value">{selectedSample.mfg}</span>
                  </p>
                  <p>
                    <span className="label">Batch No:</span>
                    <span className="value">{selectedSample.batchNumber}</span>
                  </p>
                  <p>
                    <span className="label">Pack Size:</span>
                    <span className="value">{selectedSample.packSize}</span>
                  </p>
                  {selectedSample.by && (
                    <p>
                      <span className="label">By:</span>
                      <span className="value">{selectedSample.by}</span>
                    </p>
                  )}

                  {selectedSample.status === "Taken" && (
                    <>
                      <div className="taken-info-block">
                        <p>
                          <span className="label">Taken By:</span>
                          <span className="value">
                            {selectedSample.takenBy || "-"}
                          </span>
                        </p>
                        <p>
                          <span className="label">Line:</span>
                          <span className="value">
                            {selectedSample.line || "-"}
                          </span>
                        </p>
                        <p>
                          <span className="label">Date:</span>
                          <span className="value">
                            {selectedSample.date || "-"}
                          </span>
                        </p>
                        <p>
                          <span className="label">Time:</span>
                          <span className="value">
                            {selectedSample.time || "-"}
                          </span>
                        </p>
                      </div>
                    </>
                  )}

                  <p>
                    <span className="label">Status:</span>
                    <span
                      className={`value status ${
                        selectedSample.status === "Taken"
                          ? "text-taken"
                          : "text-available"
                      }`}
                    >
                      {selectedSample.status}
                    </span>
                  </p>
                </div>
                <div className="modal-buttons">
                  {!isSubmitted && selectedSample.status === "Available" && (
                    <button
                      className="btn-action btn-take"
                      onClick={() => setShowTakeModal(true)}
                    >
                      Take
                    </button>
                  )}
                  {!isSubmitted && selectedSample.status === "Taken" && (
                    <button
                      className="btn-action btn-return"
                      onClick={() => setShowReturnModal(true)}
                    >
                      Return
                    </button>
                  )}
                  <button
                    className="btn-action btn-close"
                    onClick={() => setSelectedSample(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          {successMessage && (
            <div className="success-toast center">
              <div className="toast-content">
                <span className="check-icon">✅</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}
        </div>
      )}
      {showTakeModal && (
        <div className="modal-overlay" onClick={() => setShowTakeModal(false)}>
          <div
            className="modal-content form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Take Sample</h2>
            <input
              className="search-bar"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
            />
            <input
              className="search-bar"
              placeholder="Enter Line"
              value={line}
              onChange={(e) => setLine(e.target.value.toUpperCase())}
            />
            {error && <p>{error}</p>}
            <button className="btn-action btn-take" onClick={handleTakeSubmit}>
              Submit
            </button>
          </div>
        </div>
      )}
      {showReturnModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowReturnModal(false)}
        >
          <div
            className="modal-content form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Return Sample</h2>
            <input
              className="search-bar"
              placeholder="Enter Name"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
            />
            <input
              className="search-bar"
              placeholder="Enter Line"
              value={line}
              onChange={(e) => setLine(e.target.value.toUpperCase())}
            />
            {error && <p>{error}</p>}
            <button
              className="btn-action btn-return"
              onClick={handleReturnSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      )}
      {!selectedSample && !showTakeModal && !showReturnModal && (
        <button
          className="btn-action back-fixed fade-in"
          onClick={() => navigate("/")} // ✅ remove ?site
          style={{ pointerEvents: "auto" }}
        >
          Back to Home
        </button>
      )}
    </div>
  );
};

export default TakeSample;
