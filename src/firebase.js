import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// ============================================================
//  FILL THIS IN WITH YOUR OWN FIREBASE CONFIG
// ------------------------------------------------------------
//  1. Go to https://console.firebase.google.com and create a project (free).
//  2. In the project, click the </> "Web" icon to register a web app.
//  3. Build -> Realtime Database -> Create Database (start in TEST mode,
//     or set the rules shown in the README).
//  4. Project settings (gear icon) -> General -> "Your apps" -> SDK setup
//     and configuration -> copy the firebaseConfig values into the object below.
//
//  NOTE: databaseURL is required for the Realtime Database and is easy to
//  miss — copy it exactly from your config (ends in .firebaseio.com or
//  .<region>.firebasedatabase.app).
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDPCSJl9-GDXbqDnZ_p5NHjcDWHW8dFSuQ",
  authDomain: "summer-burger-competition.firebaseapp.com",
  projectId: "summer-burger-competition",
  storageBucket: "summer-burger-competition.firebasestorage.app",
  databaseURL: "https://summer-burger-competition-default-rtdb.firebaseio.com/",
  messagingSenderId: "261474318835",
  appId: "1:261474318835:web:a25fad6e77325ba2c8ba86"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
