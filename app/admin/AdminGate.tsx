"use client";

import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { firebaseClientConfigured, getFirebaseAuth, googleAuthProvider } from "../../lib/firebase/client";
import { AdminStudio } from "./AdminStudio";

const administratorEmail = (process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL || "goldensparkbh@gmail.com").toLowerCase();

export function AdminGate() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(firebaseClientConfigured);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!firebaseClientConfigured) return;
    return onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setAuthorized(null);
        setLoading(false);
        return;
      }
      const token = await nextUser.getIdTokenResult(true);
      setAuthorized(token.claims.admin === true || nextUser.email?.toLowerCase() === administratorEmail);
      setLoading(false);
    });
  }, []);

  async function handleSignIn() {
    setLoading(true);
    setMessage("");
    try {
      await signInWithPopup(getFirebaseAuth(), googleAuthProvider);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  if (!firebaseClientConfigured) {
    return <AdminNotice title="Firebase setup required" body="The site is ready for Firebase. Add the Firebase web app configuration to the deployment environment to activate Authentication, Firestore, and Storage." />;
  }

  if (loading) return <AdminNotice title="Opening content studio…" body="Checking your secure Firebase session." />;

  if (!user) {
    return <main className="admin-auth-shell"><section className="admin-auth-card"><Link className="brand admin-auth-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link><p className="micro-label">Secure administration</p><h1>Sign in to manage Fikra in Action.</h1><p>Use the Google account that has been granted the Firebase administrator role.</p><button onClick={handleSignIn} disabled={loading}>Continue with Google <span>→</span></button>{message && <div className="status-message">{message}</div>}<Link className="admin-back-link" href="/">← Return to the website</Link></section></main>;
  }

  if (!authorized) {
    return <main className="admin-auth-shell"><section className="admin-auth-card"><p className="micro-label">Access restricted</p><h1>This account is not an administrator.</h1><p>{user.email} is signed in, but it is not approved to manage this website.</p><button onClick={() => signOut(getFirebaseAuth())}>Use another account</button></section></main>;
  }

  return <AdminStudio user={{ name: user.displayName || user.email || "Administrator", email: user.email || "" }} onSignOut={() => signOut(getFirebaseAuth())} />;
}

function AdminNotice({ title, body }: { title: string; body: string }) {
  return <main className="admin-auth-shell"><section className="admin-auth-card"><Link className="brand admin-auth-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link><p className="micro-label">Firebase platform</p><h1>{title}</h1><p>{body}</p><Link className="admin-back-link" href="/">← Return to the website</Link></section></main>;
}
