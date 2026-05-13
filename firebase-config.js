/**
 * Configuración de Firebase - Catálogo CQ
 */

const firebaseConfig = {
    apiKey: "AIzaSyCigaUH7N0tRgejgAE3JiycbAJNO5iFW34",
    authDomain: "catalogo-cq.firebaseapp.com",
    projectId: "catalogo-cq",
    storageBucket: "catalogo-cq.firebasestorage.app",
    messagingSenderId: "179165199890",
    appId: "1:179165199890:web:f62e7ca48040cc8df4e2cb",
    measurementId: "G-HSJDC8S7ST"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
window.FS = db;
window.FStorage = storage;
console.log("🔥 Firebase Conectado Correctamente");
