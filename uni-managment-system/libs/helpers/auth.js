import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function onUserChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) return callback(null);
    const user = await getDoc(doc(db, "users", user.uid));
    const profile = user.exists() ? { uid: user.uid, email: user.email, ...user.data() } : { uid: user.uid, email: user.email, role: "student" };
    callback(profile);
  });
}
