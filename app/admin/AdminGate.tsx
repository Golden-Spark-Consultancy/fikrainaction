"use client";

import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { firebaseClientConfigured, getFirebaseAuth } from "../../lib/firebase/client";
import { AdminStudio } from "./AdminStudio";

const administratorEmail = (process.env.NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL || "goldensparkbh@gmail.com").toLowerCase();

export function AdminGate() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(firebaseClientConfigured);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
      const role = typeof token.claims.role === "string" ? token.claims.role : "";
      setAuthorized(
        token.claims.admin === true ||
          role === "owner" ||
          role === "administrator" ||
          role === "editor" ||
          role === "author" ||
          role === "moderator" ||
          nextUser.email?.toLowerCase() === administratorEmail,
      );
      setLoading(false);
    });
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    } catch (error) {
      setMessage(getSignInErrorMessage(error));
      setLoading(false);
    }
  }

  if (!firebaseClientConfigured) {
    return <AdminNotice title="Firebase setup required" body="The site is ready for Firebase. Add the Firebase web app configuration to the deployment environment to activate Authentication, Firestore, and Storage." />;
  }

  if (loading) return <AdminNotice title="Opening content studio…" body="Checking your secure Firebase session." />;

  if (!user) {
    return <main className="admin-auth-shell"><section className="admin-auth-card"><Link className="brand admin-auth-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link><p className="micro-label">Secure administration</p><h1>Sign in to manage Fikra in Action.</h1><p>Enter your approved administrator email address and password.</p><form className="admin-login-form" onSubmit={handleSignIn}><label htmlFor="admin-email">Email address</label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="submit" disabled={loading}>Sign in <span>→</span></button></form>{message && <div className="status-message" role="alert">{message}</div>}<Link className="admin-back-link" href="/">← Return to the website</Link></section></main>;
  }

  if (!authorized) {
    return <main className="admin-auth-shell"><section className="admin-auth-card"><p className="micro-label">Access restricted</p><h1>This account is not an administrator.</h1><p>{user.email} is signed in, but it is not approved to manage this website.</p><button onClick={() => signOut(getFirebaseAuth())}>Use another account</button></section></main>;
  }

  return <AdminStudio user={{ name: user.displayName || user.email || "Administrator", email: user.email || "" }} onSignOut={() => signOut(getFirebaseAuth())} />;
}

function AdminNotice({ title, body }: { title: string; body: string }) {
  return <main className="admin-auth-shell"><section className="admin-auth-card"><Link className="brand admin-auth-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link><p className="micro-label">Firebase platform</p><h1>{title}</h1><p>{body}</p><Link className="admin-back-link" href="/">← Return to the website</Link></section></main>;
}

function getSignInErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    const code = String(error.code);
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") return "The email address or password is incorrect.";
    if (code === "auth/user-disabled") return "This administrator account has been disabled.";
    if (code === "auth/too-many-requests") return "Too many attempts. Please wait before trying again.";
  }
  return "Unable to sign in. Please try again.";
}
