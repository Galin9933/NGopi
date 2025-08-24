// Impor library yang dibutuhkan untuk Firebase Functions v1
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inisialisasi Firebase Admin SDK
admin.initializeApp();

// Buat shortcut untuk mengakses Firestore
const db = admin.firestore();

/**
 * Fungsi ini dijalankan setiap kali ada postingan yang DIBUAT atau DIHAPUS.
 * Tujuannya untuk memperbarui jumlah postingan (postCount) milik si pembuat post.
 */
exports.updateUserPostCount = functions.firestore
  .document("posts/{postId}")
  .onWrite(async (change, context) => {
    // Skenario 1: Postingan baru DIBUAT
    if (!change.before.exists && change.after.exists) {
      const postData = change.after.data();
      const userRef = db.collection("users").doc(postData.authorId);
      return userRef.update({
        postCount: admin.firestore.FieldValue.increment(1),
      });
    }
    // Skenario 2: Postingan DIHAPUS
    else if (change.before.exists && !change.after.exists) {
      const postData = change.before.data();
      const userRef = db.collection("users").doc(postData.authorId);
      const likesCount = (postData.likes || []).length;
      return userRef.update({
        postCount: admin.firestore.FieldValue.increment(-1),
        totalLikesReceived: admin.firestore.FieldValue.increment(-likesCount),
      });
    }
    return null;
  });

/**
 * Fungsi ini dijalankan setiap kali sebuah postingan DI-UPDATE.
 * Tujuannya untuk memperbarui total like yang diterima (totalLikesReceived).
 */
exports.updateLikesReceived = functions.firestore
  .document("posts/{postId}")
  .onUpdate(async (change, context) => {
    const beforeLikes = change.before.data().likes || [];
    const afterLikes = change.after.data().likes || [];

    if (beforeLikes.length === afterLikes.length) {
      return null;
    }

    const authorId = change.after.data().authorId;
    const userRef = db.collection("users").doc(authorId);
    const diff = afterLikes.length - beforeLikes.length;
    return userRef.update({
      totalLikesReceived: admin.firestore.FieldValue.increment(diff),
    });
  });

/**
 * Fungsi ini dijalankan setiap kali dokumen user DI-UPDATE.
 * Tujuannya untuk memperbarui total postingan yang disimpan (totalSavesReceived).
 */
exports.updateSavesReceived = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const beforeSaves = change.before.data().savedPosts || [];
    const afterSaves = change.after.data().savedPosts || [];

    if (beforeSaves.length === afterSaves.length) {
      return null;
    }

    const addedSaves = afterSaves.filter((id) => !beforeSaves.includes(id));
    const removedSaves = beforeSaves.filter((id) => !afterSaves.includes(id));
    const batch = db.batch();

    for (const postId of addedSaves) {
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        const authorId = postDoc.data().authorId;
        if (authorId) {
          const authorRef = db.collection("users").doc(authorId);
          batch.update(authorRef, {
            totalSavesReceived: admin.firestore.FieldValue.increment(1),
          });
        }
      }
    }

    for (const postId of removedSaves) {
      const postRef = db.collection("posts").doc(postId);
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        const authorId = postDoc.data().authorId;
        if (authorId) {
          const authorRef = db.collection("users").doc(authorId);
          batch.update(authorRef, {
            totalSavesReceived: admin.firestore.FieldValue.increment(-1),
          });
        }
      }
    }

    return batch.commit();
  });