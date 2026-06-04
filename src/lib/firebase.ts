import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  console.warn("Could not enable offline persistence:", err);
});

export const auth = getAuth(app);

// Test connection
async function testConnection() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('isGuestMode') === 'true') {
      return;
    }
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
