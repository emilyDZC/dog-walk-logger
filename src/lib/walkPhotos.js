import { db, storage } from "./firebase";
import { doc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function uploadWalkPhoto(uid, walkId, file) {
  const photoId = makeId();
  const ext = (file.type || "").includes("png") ? "png" : "jpg";
  const path = `users/${uid}/walks/${walkId}/photos/${photoId}.${ext}`;

  const objRef = storageRef(storage, path);

  await uploadBytes(objRef, file, {
    contentType: file.type || `image/${ext}`,
  });

  const url = await getDownloadURL(objRef);

  const walkRef = doc(db, "users", uid, "walks", walkId);
  await updateDoc(walkRef, {
    photos: arrayUnion({
      id: photoId,
      url,
      path,
      createdAt: new Date().toISOString(),
    }),
    updatedAt: serverTimestamp(),
  });

  return { id: photoId, url, path };
}