import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

function dogsCol(uid) {
  return collection(db, "users", uid, "dogs");
}

function dogDoc(uid, dogId) {
  return doc(db, "users", uid, "dogs", dogId);
}

export async function listDogs(uid) {
  const q = query(dogsCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getDog(uid, dogId) {
  const snap = await getDoc(dogDoc(uid, dogId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createDog(uid, data) {
  const payload = {
    name: data.name ?? "",
    birthday: data.birthday ?? "", // store as YYYY-MM-DD string for MVP
    weight: data.weight ?? "", // store as string for MVP; can migrate to number later
    favourite_food: data.favourite_food ?? "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(dogsCol(uid), payload);
  return ref.id;
}

export async function updateDog(uid, dogId, data) {
  const payload = {
    name: data.name ?? "",
    birthday: data.birthday ?? "",
    weight: data.weight ?? "",
    favourite_food: data.favourite_food ?? "",
    updatedAt: serverTimestamp(),
  };
  await updateDoc(dogDoc(uid, dogId), payload);
}

export async function removeDog(uid, dogId) {
  await deleteDoc(dogDoc(uid, dogId));
}