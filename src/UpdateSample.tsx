import Header from "./Header";
import React, { useState, useEffect } from "react";
import { db, storage } from "./firebase";
import {
  setDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { deleteObject } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import "./styles.css";

const ImagePreview = ({ src }: { src: string | null }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  if (!show || !src) return null;

  return (
    <img
      src={src}
      alt="Preview"
      className="upload-sample-image"
      loading="lazy"
    />
  );
};

const UpdateSample = () => {
  const site = sessionStorage.getItem("loggedInSite") || "kajang";
  const navigate = useNavigate();
  const [brand, setBrand] = useState("");
  const [mfg, setMfg] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [packSize, setPackSize] = useState("");
  const [sampleDate, setSampleDate] = useState("");
  const [by, setBy] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [newSampleData, setNewSampleData] = useState<any>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedSample, setSelectedSample] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [editSample, setEditSample] = useState<any>(null);

  useEffect(() => {
    const savedBy = sessionStorage.getItem("userName");
    if (savedBy) setBy(savedBy.toUpperCase());
  }, []);

  useEffect(() => {
    document.getElementById("barcode")?.focus();
  }, []);

  const handleUpload = async () => {
    if (
      !brand ||
      !image ||
      !description ||
      !mfg ||
      !batchNumber ||
      !packSize ||
      !sampleDate ||
      !by
    ) {
      alert("Please fill in all required fields and select an image.");
      return;
    }

    setLoading(true); // ✅ Start loading

    try {
      const folderName = description.replace(/\s+/g, "_").toLowerCase();
      const brandName = brand.replace(/\s+/g, "_").toLowerCase();
      const docId = `${description}_${barcode}`
        .replace(/\s+/g, "_")
        .toLowerCase();

      // ⬇️ Upload image here
      const imageRef = ref(storage, `${brandName}/${folderName}/${image.name}`);
      await uploadBytes(imageRef, image);
      const imageUrl = await getDownloadURL(imageRef);

      // Save sample
      const newSample = {
        brand,
        mfg,
        batchNumber,
        packSize,
        barcode: barcode.trim(), // ✅ Trimmed
        description,
        imageUrl,
        uploadedAt: new Date(),
        status: "Available",
        sampleDate,
        by,
      };

      const samplesRef = collection(
        db,
        `users/${site}/fg_samples/${brandName}/samples`
      );
      const q = query(
        samplesRef,
        where("description", "==", description),
        where("barcode", "==", barcode)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setPendingDocId(docId);
        setNewSampleData({ newSample, brandName });
        setShowOverwriteWarning(true);
      } else {
        const brandDocRef = doc(db, `users/${site}/fg_samples/${brandName}`);
        await setDoc(brandDocRef, { brand: brandName }, { merge: true });

        await setDoc(
          doc(db, `users/${site}/fg_samples/${brandName}/samples/${docId}`),
          newSample
        );
        finishUpload();
      }
    } catch (error: any) {
      alert("Upload failed: " + error.message);
      console.error(error);
    }

    setLoading(false); // ✅ End loading
  };

  const confirmOverwrite = async () => {
    if (pendingDocId && newSampleData) {
      const { newSample, brandName } = newSampleData;
      await setDoc(
        doc(
          db,
          `users/${site}/fg_samples/${brandName}/samples/${pendingDocId}`
        ),
        newSample
      );
      setShowOverwriteWarning(false);
      finishUpload();
    }
  };

  const finishUpload = () => {
    resetForm();
    setSuccessMessage("Sample uploaded successfully!");
    setTimeout(() => setSuccessMessage(""), 2000);
    setLoading(false);
  };

  const resetForm = () => {
    setBrand("");
    setMfg("");
    setBatchNumber("");
    setPackSize("");
    setBarcode("");
    setDescription("");
    setImage(null);
    setImagePreview(null);
    setSampleDate("");
    setBy("");
    setLoading(false); // ✅ important
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // ⛔ skip resizing
      setImage(file);

      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const resizeImage = (
    file: File,
    maxWidth: number,
    maxHeight: number
  ): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
            });
            resolve(resizedFile);
          }
        }, file.type);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    const results: any[] = [];
    const brands = await getDocs(collection(db, `users/${site}/fg_samples`));
    for (const brand of brands.docs) {
      const brandName = brand.id;
      const samplesRef = collection(
        db,
        `users/${site}/fg_samples/${brandName}/samples`
      );
      const q = query(
        samplesRef,
        where("barcode", ">=", searchQuery),
        where("barcode", "<=", searchQuery + "\uf8ff")
      );
      const snapshot = await getDocs(q);
      snapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });
    }
    setSearchResults(results);
  };

  const populateEditFields = (sample: any) => {
    setBrand(sample.brand);
    setMfg(sample.mfg);
    setBatchNumber(sample.batchNumber);
    setPackSize(sample.packSize);
    setSampleDate(sample.sampleDate);
    setBy(sample.by);
    setBarcode(sample.barcode);
    setDescription(sample.description);
    setImagePreview(sample.imageUrl);
    setPendingDocId(
      `${sample.description}_${sample.barcode}`
        .replace(/\s+/g, "_")
        .toLowerCase()
    );
    setNewSampleData({
      newSample: sample,
      brandName: sample.brand.replace(/\s+/g, "_").toLowerCase(),
    });
  };

  return (
    <div className="update-sample-container">
      <Header />
      <h1 className="title">FG Sample Update</h1>
      <div className="update-layout-wrapper">
        {/* LEFT SECTION - IMAGE & CHOOSE IMAGE */}
        <div className="upload-left-section">
          <div className="custom-upload-box">
            <input type="file" id="fileInput" onChange={handleImageChange} />
            {!image && (
              <label htmlFor="fileInput" className="custom-upload-label">
                Click to choose image
              </label>
            )}
            {image && <ImagePreview src={imagePreview} />}
          </div>
        </div>

        {/* RIGHT SECTION - INPUTS + BUTTONS */}
        <div className="form-right-section">
          <div className="input-group">
            <input
              className="input-field"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="MFG"
              value={mfg}
              onChange={(e) => setMfg(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Batch Number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="Pack Size"
              value={packSize}
              onChange={(e) => setPackSize(e.target.value)}
            />
          </div>

          <div className="input-group">
            <input
              className="input-field"
              placeholder="Sample Date"
              value={sampleDate}
              onChange={(e) => setSampleDate(e.target.value)}
            />
            <input
              className="input-field"
              placeholder="By"
              value={by}
              onChange={(e) => setBy(e.target.value)}
            />
            <input
              id="barcode"
              className="input-field barcode"
              placeholder="Barcode"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
            />
          </div>

          <div className="input-group full-width">
            <input
              className="input-field description"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="button-pair-center">
            <button
              className="btn-upload"
              onClick={handleUpload}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner-centered">
                  <div className="spinner"></div>
                  <span>Uploading...</span>
                </div>
              ) : (
                "Upload Sample"
              )}
            </button>
            <button className="btn-clear" onClick={resetForm}>
              Clear
            </button>
          </div>
        </div>
      </div>
      {/* ✅ FIXED BUTTON FOOTER - Not conditional */}
      <div className="fixed-button-footer">
        <button className="btn-return" onClick={() => navigate("/")}>
          ← Back to Home
        </button>
        <button
          className="btn-search"
          onClick={() => {
            setSearchQuery("");
            setSearchResults([]);
            setShowSearchModal(true);
          }}
        >
          Search
        </button>
      </div>
      {successMessage && (
        <div className="success-modal">
          <div className="success-box">
            <div className="icon-check">✅</div>
            <h2>{successMessage}</h2>
          </div>
        </div>
      )}
      {showOverwriteWarning && (
        <div className="warning-modal">
          <div className="warning-box">
            <h2>⚠️ Duplicate Sample Detected</h2>
            <p>An item with the same description and barcode already exists.</p>
            <p>
              Do you want to <strong>overwrite</strong> it?
            </p>
            <div className="warning-buttons">
              <button onClick={confirmOverwrite} className="btn-overwrite">
                Yes, Update
              </button>
              <button
                onClick={() => {
                  setShowOverwriteWarning(false);
                  setLoading(false);
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🔍 Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay">
          <div
            className="modal-box"
            style={{ minWidth: "500px", maxWidth: "960px" }}
          >
            <h2>Search FG Sample</h2>
            <input
              type="text"
              className="input-field"
              placeholder="Enter barcode"
              value={searchQuery}
              autoFocus
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  const value = searchQuery.trim();

                  if (!value) return;

                  const results: any[] = [];
                  const brands = await getDocs(
                    collection(db, `users/${site}/fg_samples`)
                  );

                  for (const brand of brands.docs) {
                    const brandName = brand.id;
                    const samplesRef = collection(
                      db,
                      `FG_Samples/${brandName}/samples`
                    );

                    // Convert to lowercase for consistent search
                    const q = query(
                      samplesRef,
                      where("barcode", ">=", value),
                      where("barcode", "<=", value + "\uf8ff")
                    );

                    const snapshot = await getDocs(q);
                    snapshot.forEach((doc) => {
                      results.push({ id: doc.id, ...doc.data() });
                    });
                  }

                  setSearchResults(results);

                  // If only one result, open it immediately
                  if (results.length === 1) {
                    setSelectedSample(results[0]);
                    setShowPreviewModal(true);
                    setShowSearchModal(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }
                }
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "20px",
                gap: "12px",
              }}
            >
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                Close
              </button>
              <button className="btn-upload" onClick={handleSearch}>
                Search
              </button>
            </div>

            {searchResults.map((item) => (
              <div
                key={item.id}
                className="search-item"
                onClick={() => {
                  setSelectedSample(item);
                  setShowPreviewModal(true);
                  setShowSearchModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
              >
                <div>
                  <strong>{item.description}</strong>
                </div>
                <div style={{ fontSize: "14px", color: "#ccc" }}>
                  Batch: {item.batchNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 📷 Preview Modal */}
      {showPreviewModal && selectedSample && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "800px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <img
                src={selectedSample.imageUrl}
                alt="Sample"
                width="300"
                style={{ borderRadius: "12px" }}
              />
              <div style={{ flex: 1 }}>
                <p>
                  <strong>Brand:</strong> {selectedSample.brand}
                </p>
                <p>
                  <strong>Description:</strong> {selectedSample.description}
                </p>
                <p>
                  <strong>Batch Number:</strong> {selectedSample.batchNumber}
                </p>
                <p>
                  <strong>Pack Size:</strong> {selectedSample.packSize}
                </p>
                <p>
                  <strong>Sample Date:</strong> {selectedSample.sampleDate}
                </p>
                <p>
                  <strong>By:</strong> {selectedSample.by}
                </p>
                <p>
                  <strong>MFG:</strong> {selectedSample.mfg}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "20px",
                    gap: "12px",
                  }}
                >
                  <button
                    className="btn-cancel"
                    onClick={() => setShowPreviewModal(false)}
                  >
                    Close
                  </button>
                  <button
                    className="btn-upload"
                    onClick={() => {
                      setEditSample({ ...selectedSample });
                      setShowEditModal(true);
                      setShowPreviewModal(false);
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && editSample && (
        <div className="modal-overlay">
          <div className="modal-box scrollable" style={{ maxWidth: "1024px" }}>
            <h2>Edit FG Sample</h2>
            <div style={{ display: "flex", gap: "24px" }}>
              {/* Left side image + file */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flex: "1 1 40%",
                }}
              >
                <img
                  src={editSample.imageUrl || ""}
                  alt="Preview"
                  width="320"
                  style={{ marginBottom: "12px", borderRadius: "12px" }}
                />
                <label className="custom-upload-label">
                  Choose File
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setNewImageFile(file);
                        const preview = URL.createObjectURL(file);
                        setEditSample((prev: any) => ({
                          ...prev,
                          imageUrl: preview,
                        }));
                      }
                    }}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {/* Right side fields */}
              <div style={{ flexGrow: 1 }}>
                <input
                  className="input-field"
                  value={editSample.brand || ""}
                  onChange={(e) =>
                    setEditSample({ ...editSample, brand: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.mfg || ""}
                  onChange={(e) =>
                    setEditSample({ ...editSample, mfg: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.batchNumber || ""}
                  onChange={(e) =>
                    setEditSample({
                      ...editSample,
                      batchNumber: e.target.value,
                    })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.packSize || ""}
                  onChange={(e) =>
                    setEditSample({ ...editSample, packSize: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.sampleDate || ""}
                  onChange={(e) =>
                    setEditSample({ ...editSample, sampleDate: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.by || ""}
                  onChange={(e) =>
                    setEditSample({ ...editSample, by: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  value={editSample.description || ""}
                  onChange={(e) =>
                    setEditSample({
                      ...editSample,
                      description: e.target.value,
                    })
                  }
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginTop: "20px",
                    gap: "12px",
                  }}
                >
                  <button
                    className="btn-cancel"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-upload"
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const brandName = editSample.brand
                          .replace(/\s+/g, "_")
                          .toLowerCase();
                        const folderName = editSample.description
                          .replace(/\s+/g, "_")
                          .toLowerCase();
                        const docId =
                          `${editSample.description}_${editSample.barcode}`
                            .replace(/\s+/g, "_")
                            .toLowerCase();

                        const sampleRef = doc(
                          db,
                          `users/${site}/fg_samples/${brandName}/samples/${docId}`
                        );

                        let imageUrl = editSample.imageUrl;

                        // ⬆️ If new image selected, upload & replace
                        if (newImageFile) {
                          // 🗑 Delete old image
                          if (
                            editSample.imageUrl?.includes(
                              "firebasestorage.googleapis.com"
                            )
                          ) {
                            const pathMatch = decodeURIComponent(
                              editSample.imageUrl
                                .split("/o/")[1]
                                ?.split("?")[0] || ""
                            );
                            if (pathMatch) {
                              const oldRef = ref(storage, pathMatch);
                              await deleteObject(oldRef).catch((err) =>
                                console.warn(
                                  "Old image not found/deleted:",
                                  err
                                )
                              );
                            }
                          }

                          // 🆕 Upload new image
                          const imageRef = ref(
                            storage,
                            `${brandName}/${folderName}/${newImageFile.name}`
                          );
                          await uploadBytes(imageRef, newImageFile);
                          imageUrl = await getDownloadURL(imageRef);
                        }

                        // 🔄 Update Firestore
                        await setDoc(
                          sampleRef,
                          {
                            brand: editSample.brand.trim(),
                            mfg: editSample.mfg.trim(),
                            batchNumber: editSample.batchNumber.trim(),
                            packSize: editSample.packSize.trim(),
                            sampleDate: editSample.sampleDate.trim(),
                            by: editSample.by.trim(),
                            barcode: editSample.barcode.trim(), // ✅ important
                            description: editSample.description.trim(),
                            imageUrl,
                            updatedAt: new Date(),
                          },
                          { merge: true }
                        ); // ✅ important!

                        setSuccessMessage("Sample updated successfully!");
                        setShowEditModal(false);
                        setTimeout(() => setSuccessMessage(""), 2500);
                        setNewImageFile(null);
                      } catch (err) {
                        console.error("Update failed", err);
                        alert("Failed to update sample");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {loading ? (
                      <div className="spinner-centered">
                        <div className="spinner"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>Uploading image...</p>
        </div>
      )}
      {successMessage && (
        <div className="success-modal" style={{ zIndex: 9999 }}>
          <div className="success-box">
            <div className="icon-check">✅</div>
            <h2>{successMessage}</h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateSample;
