import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

// Get bookings for a room in a date range
export async function getRoomBookings(roomId, startISO, endISO) {
  const q = query(
    collection(db, "bookings"),
    where("roomId", "==", roomId),
    where("dateISO", ">=", startISO),
    where("dateISO", "<=", endISO),
    orderBy("dateISO")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Time overlap helper
export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return !(aEnd <= bStart || aStart >= bEnd);
}
