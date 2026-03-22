import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

function walksCol(uid) {
  return collection(db, "users", uid, "walks");
}

function walkDoc(uid, walkId) {
  return doc(db, "users", uid, "walks", walkId);
}

// ---- date helpers for datetime-local ----
export function dateToLocalInputValue(date) {
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function localInputValueToDate(value) {
  // value like "2026-03-22T14:30"
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export async function listWalks(uid) {
  const q = query(walksCol(uid), orderBy("startedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getWalk(uid, walkId) {
  const snap = await getDoc(walkDoc(uid, walkId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createWalk(uid, data) {
  const payload = {
    title: data.title ?? "",
    weather: data.weather ?? "",
    groundConditions: data.groundConditions ?? "",

    dogIds: Array.isArray(data.dogIds) ? data.dogIds : [],
    source: data.source ?? "manual",

    startedAt: data.startedAt ? Timestamp.fromDate(data.startedAt) : null,
    endedAt: data.endedAt ? Timestamp.fromDate(data.endedAt) : null,

    distanceMeters:
        data.distanceMeters === "" || data.distanceMeters == null
        ? null
        : Number(data.distanceMeters),

    description: data.description ?? "",

    // keep this even if you don't use ratings yet; harmless
    ratings: data.ratings ?? {},

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    photos: [],
  };

  const ref = await addDoc(walksCol(uid), payload);
  return ref.id;
}

export async function updateWalk(uid, walkId, data) {
  const payload = {
    title: data.title ?? "",
    weather: data.weather ?? "",
    groundConditions: data.groundConditions ?? "",

    dogIds: Array.isArray(data.dogIds) ? data.dogIds : [],

    startedAt: data.startedAt ? Timestamp.fromDate(data.startedAt) : null,
    endedAt: data.endedAt ? Timestamp.fromDate(data.endedAt) : null,

    distanceMeters:
        data.distanceMeters === "" || data.distanceMeters == null
        ? null
        : Number(data.distanceMeters),

    description: data.description ?? "",

    ratings: data.ratings ?? {},

    updatedAt: serverTimestamp(),
    };

  await updateDoc(walkDoc(uid, walkId), payload);
}

export async function removeWalk(uid, walkId) {
  await deleteDoc(walkDoc(uid, walkId));
}

export function defaultWalkTitle({ startedAt, dogNames = [] } = {}) {
  const date = startedAt instanceof Date ? startedAt : null;

  let timeOfDay = "walk";
  if (date) {
    const h = date.getHours();
    if (h < 12) timeOfDay = "morning walk";
    else if (h < 18) timeOfDay = "afternoon walk";
    else timeOfDay = "evening walk";
  }

  const cleanedNames = (dogNames || [])
    .map((n) => String(n).trim())
    .filter(Boolean);

  if (cleanedNames.length === 0) return timeOfDay;

  // Simple possessive handling:
  // - "Jess" -> "Jess's"
  // - "James" -> "James'"
  const possessive = (name) => (name.toLowerCase().endsWith("s") ? `${name}'` : `${name}'s`);

  if (cleanedNames.length === 1) {
    return `${possessive(cleanedNames[0])} ${timeOfDay}`;
  }

  if (cleanedNames.length === 2) {
    return `${cleanedNames[0]} & ${possessive(cleanedNames[1])} ${timeOfDay}`;
  }

  // 3+ dogs: "Muesli, Luna & Nori's morning walk"
  const allButLast = cleanedNames.slice(0, -1).join(", ");
  const last = cleanedNames[cleanedNames.length - 1];
  return `${allButLast} & ${possessive(last)} ${timeOfDay}`;
}