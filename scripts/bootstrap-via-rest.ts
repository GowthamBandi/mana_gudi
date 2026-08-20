import * as fs from "fs";
import * as path from "path";

const PROJECT_ID = "temple-seva-platform";
const userHome = process.env.USERPROFILE || process.env.HOME || "C:\\Users\\Gowtham";
const configPath = path.join(userHome, ".config", "configstore", "firebase-tools.json");

if (!fs.existsSync(configPath)) {
  console.error("Firebase CLI config not found at:", configPath);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const accessToken = config.tokens?.access_token;

if (!accessToken) {
  console.error("No access token found in Firebase CLI config!");
  process.exit(1);
}

console.log("=== MANA GUDI PRODUCTION SUPER ADMIN BOOTSTRAP INSPECTION ===");
console.log(`Target Firebase Project: ${PROJECT_ID}`);
console.log("Firebase CLI Access Token Loaded Successfully.\n");

(async () => {
  try {
    // 1. Fetch existing documents from Firestore /admin_users
    console.log("Querying Firestore collection: /admin_users ...");
    const listRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const listData = await listRes.json();
    console.log("Firestore /admin_users documents HTTP Status:", listRes.status);

    if (listRes.ok && listData.documents) {
      console.log(`Found ${listData.documents.length} existing admin document(s) in Firestore:`);
      for (const doc of listData.documents) {
        const docName = doc.name.split("/").pop();
        console.log(`  - Document ID (UID): ${docName}`);
        console.log(`    Fields:`, JSON.stringify(doc.fields, null, 2));
      }
    } else {
      console.log("Firestore /admin_users returned:", JSON.stringify(listData, null, 2));
    }

    // 2. Fetch users from Firebase Identity Toolkit API (Firebase Auth)
    console.log("\nQuerying Firebase Authentication users ...");
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?maxResults=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const authData = await authRes.json();
    console.log("Firebase Auth Users HTTP Status:", authRes.status);

    if (authRes.ok && authData.users) {
      console.log(`Found ${authData.users.length} Firebase Auth user(s):`);
      for (const u of authData.users) {
        const uid = u.localId;
        const email = u.email;
        const displayName = u.displayName || email?.split("@")[0] || "Super Administrator";
        console.log(`  - Auth UID: "${uid}" | Email: "${email}"`);

        // Check if admin_users/{uid} document exists
        const getDocRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users/${uid}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (getDocRes.ok) {
          const docData = await getDocRes.json();
          console.log(`    ✓ Firestore admin_users/${uid} document EXISTS:`);
          console.log(`      Fields:`, JSON.stringify(docData.fields, null, 2));
        } else {
          console.log(`    ❌ Firestore admin_users/${uid} document MISSING! Creating SUPER_ADMIN role document...`);

          const nowIso = new Date().toISOString();
          const patchRes = await fetch(
            `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/admin_users/${uid}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fields: {
                  role: { stringValue: "SUPER_ADMIN" },
                  status: { stringValue: "ACTIVE" },
                  displayName: { stringValue: displayName },
                  email: { stringValue: email || "" },
                  createdBy: { stringValue: "BOOTSTRAP_ASSIGNMENT" },
                  createdAt: { timestampValue: nowIso },
                },
              }),
            }
          );

          if (patchRes.ok) {
            const createdDoc = await patchRes.json();
            console.log(`    🟢 SUCCESSFULLY CREATED Firestore document admin_users/${uid}:`);
            console.log(`      Fields:`, JSON.stringify(createdDoc.fields, null, 2));
          } else {
            console.error(`    🔴 FAILED to create document:`, await patchRes.text());
          }
        }
      }
    } else {
      console.log("Firebase Auth returned:", JSON.stringify(authData, null, 2));
    }
  } catch (e) {
    console.error("Error during REST bootstrap inspection:", e);
  }
})();
