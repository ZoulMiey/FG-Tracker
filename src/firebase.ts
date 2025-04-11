import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  listAll,
} from "firebase/storage";

// 🔥 Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB5AsoOjyVJNfL-9cUTjf-utqY3dlKlCMY",
  authDomain: "labtrack-db58e.firebaseapp.com",
  projectId: "labtrack-db58e",
  storageBucket: "labtrack-db58e.firebasestorage.app", // ✅ Corrected storage bucket
  messagingSenderId: "870826107088",
  appId: "1:870826107088:web:8f8cebd30b62ed4f9fbed5",
};

// ✅ Prevent duplicate Firebase initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * 📌 Upload Image to Firebase Storage
 * @param {File} file - The image file to upload
 * @param {string} description - FG sample description (used as folder name)
 * @returns {Promise<string>} - Image URL after successful upload
 */
const uploadImage = async (
  file: File,
  description: string
): Promise<string> => {
  if (!file) throw new Error("No file selected for upload!");

  try {
    const fileName = `${description}-${Date.now()}.jpg`; // Ensures unique names
    const storageRef = ref(storage, `FG_Samples/${description}/${fileName}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Upload progress tracking
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress.toFixed(2)}% done`);
        },
        (error) => reject(`Upload failed: ${error.message}`),
        async () => {
          // Get download URL once upload is complete
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("✅ Image uploaded successfully:", downloadURL);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error("🔥 Upload Error:", error);
    throw error;
  }
};

/**
 * 📌 Fetch Image URL by Description
 * @param {string} description - The FG sample description (folder name)
 * @returns {Promise<string|null>} - Image URL or null if not found
 */
const getImageUrl = async (description: string): Promise<string | null> => {
  try {
    const folderRef = ref(storage, `FG_Samples/${description}/`);
    const files = await listAll(folderRef);

    if (files.items.length > 0) {
      const latestFile = files.items[files.items.length - 1]; // Get the latest image
      return await getDownloadURL(latestFile);
    }
    return null;
  } catch (error) {
    console.error("⚠️ Error fetching image:", error);
    return null;
  }
};

// ✅ Export Firebase utilities
export {
  db,
  storage,
  uploadImage,
  getImageUrl,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
};
