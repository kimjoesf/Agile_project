import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export async function getStudentEnrollment(studentId) {
  const snap = await getDoc(doc(db, "enrollments", studentId));
  if (!snap.exists()) return null;
  return snap.data();
}
