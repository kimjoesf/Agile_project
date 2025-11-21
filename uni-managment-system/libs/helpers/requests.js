import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, addDoc, deleteDoc, updateDoc,Timestamp,query,where} from "firebase/firestore";
import { getRoomBookings, intervalsOverlap } from "./bookings";

export async function createRoomRequest({ roomId, professorId, courseId, dateISO, startTime, endTime }) {
  const r = await getDoc(doc(db, "rooms", roomId));
  if (!r.exists()) throw new Error("Room not found");
  if (r.data().maintenance) throw new Error("Room under maintenance");

  const bookings = await getRoomBookings(roomId, dateISO, dateISO);
  const conflict = bookings.some(
    (b) => b.status !== "cancelled" && intervalsOverlap(startTime, endTime, b.startTime, b.endTime)
  );
  if (conflict) throw new Error("Time conflict");

  const ref = await addDoc(collection(db, "roomRequests"), {
    roomId,
    professorId,
    courseId,
    dateISO,
    startTime,
    endTime,
    status: "pending",
    createdAt: Timestamp.now(),
  });

  return { id: ref.id };
}

// Get requests for a specific professor
export async function getProfessorRequests(professorId) {
  const q = query(collection(db, "roomRequests"), where("professorId", "==", professorId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function cancelRoomRequest(requestId, userId) {
  const rq = await getDoc(doc(db, "roomRequests", requestId));
  if (!rq.exists()) throw new Error("Not found");

  if (rq.data().professorId !== userId) throw new Error("Unauthorized");
  if (rq.data().status !== "pending") throw new Error("Only pending requests can be cancelled");

  await deleteDoc(doc(db, "roomRequests", requestId));

  return true;
}
