import { db } from "../firebase";
import { collection, doc, getDocs,getDoc, updateDoc, addDoc, Timestamp,where,query} from "firebase/firestore";
import { getRoomBookings, intervalsOverlap } from "./bookings";

export async function getPendingRequests() {
  const q = query(collection(db, "roomRequests"), where("status", "==", "pending"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function approveRequest(requestId, adminId) {
  const rqRef = doc(db, "roomRequests", requestId);
  const rqSnap = await getDoc(rqRef);

  if (!rqSnap.exists()) throw new Error("Not found");

  const rq = rqSnap.data();

  const bookings = await getRoomBookings(rq.roomId, rq.dateISO, rq.dateISO);
  const conflict = bookings.some(
    (b) => b.status !== "cancelled" && intervalsOverlap(rq.startTime, rq.endTime, b.startTime, b.endTime)
  );

  if (conflict) throw new Error("Time conflict");

  const bookingRef = await addDoc(collection(db, "bookings"), {
    ...rq,
    status: "active",
    createdAt: Timestamp.now(),
  });

  await updateDoc(rqRef, {
    status: "approved",
    approvedBy: adminId,
    bookingId: bookingRef.id,
    approvedAt: Timestamp.now(),
  });

  return bookingRef.id;
}

export async function rejectRequest(requestId, adminId, reason = "") {
  await updateDoc(doc(db, "roomRequests", requestId), {
    status: "rejected",
    rejectedBy: adminId,
    rejectedAt: Timestamp.now(),
    reason,
  });
}
