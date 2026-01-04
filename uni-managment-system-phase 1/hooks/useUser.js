"use client"
import { useEffect, useState } from "react";
import { onUserChange } from "../libs/helpers/auth";

export function useUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = onUserChange((u) => setUser(u));
    return () => unsub && unsub();
  }, []);
  return user;
}