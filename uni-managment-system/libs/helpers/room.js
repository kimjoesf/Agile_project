import { db } from "../firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

// Get ALL rooms (professor/admin)
export async function getAllRooms() {
  const snap = await getDocs(collection(db, "rooms"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Get rooms for students based on enrollments
export async function getStudentRooms(studentId) {
  const enDoc = await getDoc(doc(db, "enrollments", studentId));
  if (!enDoc.exists()) return [];

  const { courses = [] } = enDoc.data();
  const roomIds = new Set();

  for (const courseId of courses) {
    const cr = await getDoc(doc(db, "courseRooms", courseId));
    if (cr.exists() && cr.data().roomId) roomIds.add(cr.data().roomId);
  }

  const rooms = [];
  for (const id of roomIds) {
    const r = await getDoc(doc(db, "rooms", id));
    if (r.exists()) rooms.push({ id: r.id, ...r.data() });
  }

  return rooms;
}