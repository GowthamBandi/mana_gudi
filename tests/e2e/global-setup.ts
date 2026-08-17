import { execSync } from "node:child_process";

/**
 * Resets the emulator to a known fixture before every local E2E run.
 *
 * Without this, records created by the workflow tests accumulate across runs
 * and push the seeded fixtures off the first page of the register — which
 * previously produced failures that looked like product bugs but were only
 * test-data drift. Deterministic fixtures make a red run mean something.
 *
 * Skipped when E2E_BASE_URL is set, so the live suite never touches production.
 */
export default async function globalSetup() {
  if (process.env.E2E_BASE_URL) {
    console.log("E2E_BASE_URL set — targeting a deployed site, skipping emulator reset");
    return;
  }

  const project = "temple-seva-platform";
  const firestore = `http://127.0.0.1:8080/emulator/v1/projects/${project}/databases/(default)/documents`;
  const auth = `http://127.0.0.1:9099/emulator/v1/projects/${project}/accounts`;

  try {
    await fetch(firestore, { method: "DELETE" });
    await fetch(auth, { method: "DELETE" });
  } catch (error) {
    throw new Error(
      `Could not reach the Firebase emulators. Start them with "npm run emulators" first.\n${String(error)}`,
    );
  }

  execSync("npm run seed", { stdio: "pipe" });
  console.log("Emulator reset and reseeded");
}
