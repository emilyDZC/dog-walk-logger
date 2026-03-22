import { db, storage } from "./firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadDogPhoto(uid, dogId, file) {
  // Store under a stable path; overwrite is fine (latest photo wins)
  const path = `users/${uid}/dogs/${dogId}/profile.jpg`;
  const objRef = storageRef(storage, path);

  await uploadBytes(objRef, file, {
    contentType: file.type || "image/jpeg",
  });

  const url = await getDownloadURL(objRef);

  // Save URL + storage path on the dog doc
  const dogRef = doc(db, "users", uid, "dogs", dogId);
  await updateDoc(dogRef, {
    photoUrl: url,
    photoPath: path,
    updatedAt: serverTimestamp(),
  });

  return { photoUrl: url, photoPath: path };
}