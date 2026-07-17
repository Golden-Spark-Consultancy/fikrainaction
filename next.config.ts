import type { NextConfig } from "next";

function firebaseWebConfig() {
  try {
    return process.env.FIREBASE_WEBAPP_CONFIG ? JSON.parse(process.env.FIREBASE_WEBAPP_CONFIG) as Record<string, string> : {};
  } catch {
    return {};
  }
}

const firebase = firebaseWebConfig();
const fikraFirebase = {
  apiKey: "AIzaSyA5cfoAFmnLXWqcopcFO5MSReVEKR-vlW0",
  authDomain: "fikra-e47d9.firebaseapp.com",
  projectId: "fikra-e47d9",
  storageBucket: "fikra-e47d9.firebasestorage.app",
  messagingSenderId: "288817097594",
  appId: "1:288817097594:web:cee950d52345f3420984c3",
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebase.apiKey || fikraFirebase.apiKey,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebase.authDomain || fikraFirebase.authDomain,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebase.projectId || fikraFirebase.projectId,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebase.storageBucket || fikraFirebase.storageBucket,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebase.messagingSenderId || fikraFirebase.messagingSenderId,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebase.appId || fikraFirebase.appId,
    NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL: process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL || "goldensparkbh@gmail.com",
  },
};

export default nextConfig;
