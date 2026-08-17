"use client";

/**
 * Browser-side Firebase singletons.
 *
 * The client SDK is the ONLY data path in this application, which is a
 * deliberate choice: there is no privileged server tier that could be tricked
 * into performing an action on a caller's behalf. Every read and write is
 * evaluated by the security rules against the caller's own identity.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseConfig, useEmulators } from "./config";

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let emulatorsConnected = false;

export function firebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return cachedApp;
}

export function db(): Firestore {
  if (cachedDb) return cachedDb;

  // A persistent cache keeps the public transparency pages readable on the
  // patchy mobile connections these villagers actually have, and cuts repeat
  // Firestore reads (and therefore cost) on navigation.
  cachedDb = initializeFirestore(firebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  if (useEmulators && !emulatorsConnected) {
    connectFirestoreEmulator(cachedDb, "127.0.0.1", 8080);
    emulatorsConnected = true;
  }
  return cachedDb;
}

export function auth(): Auth {
  const instance = getAuth(firebaseApp());
  if (useEmulators) {
    connectAuthEmulator(instance, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  // Sessions survive a page refresh, so a volunteer is not logged out mid-task.
  void setPersistence(instance, browserLocalPersistence);
  return instance;
}

export function storage(): FirebaseStorage {
  const instance = getStorage(firebaseApp());
  if (useEmulators) {
    connectStorageEmulator(instance, "127.0.0.1", 9199);
  }
  return instance;
}
