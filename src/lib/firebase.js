import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Konfigurasi Firebase dari akun afwan-996d4
const firebaseConfig = {
    apiKey: "AIzaSyAnx7FkdImX-YmNP3CN4Eb1JUygolRQC74",
    authDomain: "afwan-996d4.firebaseapp.com",
    projectId: "afwan-996d4",
    storageBucket: "afwan-996d4.firebasestorage.app",
    messagingSenderId: "746474535309",
    appId: "1:746474535309:web:8471abff54d53fce0a25c4",
    measurementId: "G-RK5P9WSJ4N",
    // Database URL biasanya otomatis, tapi jika error bisa ditambahkan manual di sini
    databaseURL: "https://afwan-996d4-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);
