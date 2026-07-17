"use client";

import { getFirebaseAuth } from "./client";

export async function firebaseAuthorizedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sign in is required.");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
