import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = "temple-seva-platform";

if (getApps().length === 0) {
  initializeApp({ projectId: PROJECT_ID });
}

const auth = getAuth();
const db = getFirestore();

(async () => {
  console.log("=== MANA GUDI SUPER ADMIN BOOTSTRAP INSPECTION ===");
  console.log(`Target Firebase Project: ${PROJECT_ID}\n`);

  try {
    // List users from Firebase Auth
    const listUsersResult = await auth.listUsers(100);
    console.log(`Found ${listUsersResult.users.length} Firebase Auth user(s):`);

    for (const u of listUsersResult.users) {
      console.log(`  - UID: ${u.uid} | Email: ${u.email} | DisplayName: ${u.displayName}`);

      // Check if document exists in Firestore /admin_users/{uid}
      const adminDoc = await db.doc(`admin_users/${u.uid}`).get();
      if (adminDoc.exists) {
        console.log(`    ✓ Firestore admin_users/${u.uid} document EXISTS:`, JSON.stringify(adminDoc.data()));
      } else {
        console.log(`    ❌ Firestore admin_users/${u.uid} document MISSING! Creating SUPER_ADMIN document...`);

        // Perform safe one-time SUPER_ADMIN document assignment
        const docPayload = {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          displayName: u.displayName || u.email?.split("@")[0] || "Super Administrator",
          email: u.email || "",
          createdBy: "BOOTSTRAP_ASSIGNMENT",
          createdAt: Timestamp.now(),
        };

        await db.doc(`admin_users/${u.uid}`).set(docPayload);
        console.log(`    🟢 Created SUPER_ADMIN document for UID ${u.uid}:`, JSON.stringify(docPayload));
      }
    }
  } catch (error) {
    console.error("Error inspecting/bootstrapping users:", error);
  }
})();
