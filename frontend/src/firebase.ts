import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);

// Force Firestore onto its long-polling transport instead of the default
// streaming WebChannel. A one-shot getDocs/getDoc opens a WebChannel "Listen"
// stream, and on networks/proxies that buffer streaming responses (common on
// mobile, VPNs, and some ISPs) that stream stalls ~30–60s before it delivers
// the snapshot or falls back — which showed up here as a season switch taking
// 30–40s to load while the REST-based season counts returned instantly.
// Long-polling uses discrete HTTP requests that don't stall behind buffering,
// trading a little streaming efficiency for a reliably fast first read.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);

export const authReady: Promise<void> = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      unsubscribe();
      resolve();
    }
  });
  signInAnonymously(auth).catch((err) => {
    console.error("Anonymous auth failed:", err);
    resolve();
  });
});

export default app;
