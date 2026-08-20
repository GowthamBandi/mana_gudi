import * as fs from "fs";
import * as path from "path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = "temple-seva-platform";

// Read token from Firebase CLI configstore on Windows
const userHome = process.env.USERPROFILE || process.env.HOME || "C:\\Users\\Gowtham";
const configPath = path.join(userHome, ".config", "configstore", "firebase-tools.json");

if (!fs.existsSync(configPath)) {
  console.error("Firebase CLI config not found at:", configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const tokens = config.tokens;
const accessToken = tokens?.access_token;

if (!accessToken) {
  console.error("No access token found in Firebase CLI config!");
  process.exit(1);
}

console.log("=== MANA GUDI PRODUCTION SUPER ADMIN BOOTSTRAP INSPECTION ===");
console.log(`Target Firebase Project: ${PROJECT_ID}`);
console.log("Firebase CLI Access Token Loaded Successfully.\n");

const app = initializeApp({
  credential: {
    getAccessToken: async () => ({
      access_token: accessToken,
      expires_in: 3600,
    }),
  },
  projectId: PROJECT_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

(async () => {
  try {
    // 1. List all Firebase Auth users
    const listUsersResult = await auth.listUsers(100);
    console.log(`Found ${listUsersResult.users.length} user(s) in Firebase Authentication:`);

    for (const u of listUsersResult.users) {
      console.log(`\n[User] Email: "${u.email}" | UID: "${u.uid}" | Verified: ${u.emailVerified}`);

      // 2. Check existing Firestore document at admin_users/{uid}
      const adminDocRef = db.doc(`admin_users/${u.uid}`);
      const adminDoc = await adminDocRef.get();

      if (adminDoc.exists) {
        console.log(`  ✓ Existing Firestore admin_users/${u.uid} document found:`);
        console.log(`    Data:`, JSON.stringify(adminDoc.data(), null, 2));
      } else {
        console.log(`  ⚠️ Firestore document admin_users/${u.uid} is MISSING!`);
        console.log(`  Creating required SUPER_ADMIN role document for UID "${u.uid}"...`);

        const payload = {
          role: "SUPER_ADMIN",
          status: "ACTIVE",
          displayName: u.displayName || u.email?.split("@")[0] || "Super Administrator",
          email: u.email || "",
          createdBy: "BOOTSTRAP_ASSIGNMENT",
          createdAt: Timestamp.now(),
        };

        await adminDocRef.set(payload);
        console.log(`  🟢 SUCCESSFULLY CREATED admin_users/${u.uid}:`);
        console.log(`    Data:`, JSON.stringify(payload, null, 2));
      }
    }
  } catch (error) {
    console.error("Error during authentication inspection:", error);
  }
})();
