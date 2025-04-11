import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { saveAs } from "file-saver";
import Papa from "papaparse";
import "./styles.css";
import { useNavigate } from "react-router-dom";

const formatDate = (input: any) => {
  if (!input || input === "-") return "-";

  // Handle Firestore Timestamp
  if (typeof input === "object" && typeof input.toDate === "function") {
    input = input.toDate();
  }

  // Handle manually entered string in DD/MM/YYYY (like "08/04/2025")
  if (typeof input === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    return input; // already correct format
  }

  // Convert normal string or Date object
  const date = new Date(input);
  if (isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const ReportPage = () => {
  const navigate = useNavigate(); // ✅ Correct position inside component
  const site = sessionStorage.getItem("loggedInSite") || "kajang";
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
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
            ...doc.data(),
          }));

          allSamples = allSamples.concat(sampleData);
        }

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentSamples = allSamples
          .filter((s) => {
            if (!s.timestamp || !s.status) return false;
            const date = s.timestamp.toDate
              ? s.timestamp.toDate()
              : new Date(s.timestamp);
            return date >= oneWeekAgo;
          })
          .map((s) => {
            const timestampDate = s.timestamp.toDate
              ? s.timestamp.toDate()
              : new Date(s.timestamp);

            return {
              ...s,
              date: timestampDate.toISOString(),
              returnDateFormatted: formatDate(s.returnDate),
            };
          });

        const sorted = recentSamples.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setWeeklyData(sorted);
      } catch (error) {
        console.error("Error loading report:", error);
      }
      setLoading(false);
    };

    fetchReportData();
  }, [site]);

  const filteredData = weeklyData.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.mfg?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.batchNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()); // ✅ ADD THIS LINE

    const matchesStatus =
      !statusFilter ||
      item.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    const dataToExport = filteredData.map((s) => ({
      Date: s.date || "-",
      Time: s.time || "-",
      Status: s.status,
      MFG: s.mfg || "-",
      BatchNumber: s.batchNumber || "-",
      Description: s.description || "-",
      PackSize: s.packSize || "-",
      Name: s.name || "-",
      Line: s.line || "-",
      ReturnBy: s.returnBy || "-",
      ReturnLine: s.returnLine || "-",
      ReturnDate: s.returnDate || "-",
      ReturnTime: s.returnTime || "-",
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "weekly_fg_sample_report.csv");
    setSuccessMessage("CSV Report downloaded successfully!");
    setTimeout(() => setSuccessMessage(""), 2000);
  };

  return (
    <div className="report-container">
      <h1 className="title">FG Sample Record</h1>
      <h2 className="subtitle">
        Site: {site.charAt(0).toUpperCase() + site.slice(1)}
      </h2>

      <div className="search-container">
        <input
          type="text"
          className="search-bar"
          placeholder="Search MFG, Batch Number, or Description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="btn-clear" onClick={() => setSearchQuery("")}>
            Clear
          </button>
        )}
        {/* ✅ Move this inside */}
        <select
          className="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Taken">Taken</option>
          <option value="Available">Available</option>
        </select>
      </div>

      <div className="report-table-container">
        <div className="report-scroll-container">
          {filteredData.length === 0 && !loading ? (
            <p className="no-data">No data found for the past 7 days.</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>MFG</th>
                  <th>Batch Number</th>
                  <th>Brand</th>
                  <th>Description</th>
                  <th>Pack Size</th>
                  <th>Name</th>
                  <th>Line</th>
                  <th>Return By</th>
                  <th>Return Line</th>
                  <th>Return Date</th>
                  <th>Return Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      {item.status === "Taken" ? formatDate(item.date) : "-"}
                    </td>
                    <td>{item.status === "Taken" ? item.time || "-" : "-"}</td>
                    <td>
                      <span
                        className={
                          item.status === "Taken"
                            ? "status-taken"
                            : "status-available"
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>{item.mfg}</td>
                    <td>{item.batchNumber}</td>
                    <td>{item.brand || "-"}</td>
                    <td
                      style={{
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        maxWidth: "200px",
                        textAlign: "left",
                      }}
                    >
                      {item.description}
                    </td>
                    <td>{item.packSize}</td>
                    <td>
                      {item.status === "Taken" ? item.takenBy || "-" : "-"}
                    </td>
                    <td>{item.status === "Taken" ? item.line || "-" : "-"}</td>
                    <td>
                      {item.status === "Available" ? item.returnBy || "-" : "-"}
                    </td>
                    <td>
                      {item.status === "Available"
                        ? item.returnLine || "-"
                        : "-"}
                    </td>
                    <td>
                      {item.status === "Available"
                        ? item.returnDateFormatted
                        : "-"}
                    </td>
                    <td>
                      {item.status === "Available"
                        ? item.returnTime || "-"
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="button-container">
        <button
          className="btn-action btn-download"
          onClick={exportCSV}
          disabled={filteredData.length === 0 || loading}
        >
          {loading ? "Generating..." : "Download Report"}
        </button>
        <button className="btn-action btn-return" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
      </div>

      {successMessage && (
        <div className="success-toast center">
          <div className="toast-content">
            <svg
              className="check-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="white"
              width="28px"
              height="28px"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;
