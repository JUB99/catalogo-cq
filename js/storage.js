/**
 * Gestión de almacenamiento Local (LS/IDB) y Nube (Firestore) para Catálogo CQ
 * Versión Híbrida: Guarda fotos en Firestore como Base64 para evitar plan Blaze.
 */

const Storage = {
    DB_NAME: 'CatalogoCQ_DB',
    DB_VERSION: 1,
    STORE_IMAGES: 'imagenes',

    isCloud: () => !!window.FS,

    initDB: () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(Storage.DB_NAME, Storage.DB_VERSION);
            request.onerror = () => reject('Error al abrir IndexedDB');
            request.onsuccess = (event) => resolve(event.target.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(Storage.STORE_IMAGES)) {
                    const store = db.createObjectStore(Storage.STORE_IMAGES, { keyPath: 'id' });
                    store.createIndex('productoId', 'productoId', { unique: false });
                }
            };
        });
    },

    // --- PRODUCTOS ---
    getProductos: async () => {
        if (Storage.isCloud()) {
            const snapshot = await window.FS.collection('productos').get();
            return snapshot.docs.map(doc => doc.data());
        }
        if (window.CQ_DATA && window.CQ_DATA.productos) return window.CQ_DATA.productos;
        const data = localStorage.getItem('cq_productos');
        return data ? JSON.parse(data) : [];
    },

    saveProductos: async (productos) => {
        if (Storage.isCloud()) {
            const batch = window.FS.batch();
            for (const p of productos) {
                const ref = window.FS.collection('productos').doc(p.id);
                batch.set(ref, p);
            }
            return batch.commit();
        }
        localStorage.setItem('cq_productos', JSON.stringify(productos));
    },

    getProductoById: async (id) => {
        if (Storage.isCloud()) {
            const doc = await window.FS.collection('productos').doc(id).get();
            return doc.exists ? doc.data() : null;
        }
        const productos = await Storage.getProductos();
        return productos.find(p => p.id === id);
    },

    // --- COLECCIONES ---
    getColecciones: async () => {
        if (Storage.isCloud()) {
            const snapshot = await window.FS.collection('colecciones').get();
            return snapshot.docs.map(doc => doc.data());
        }
        if (window.CQ_DATA && window.CQ_DATA.colecciones) return window.CQ_DATA.colecciones;
        const data = localStorage.getItem('cq_colecciones');
        return data ? JSON.parse(data) : [];
    },

    saveColecciones: async (colecciones) => {
        if (Storage.isCloud()) {
            const batch = window.FS.batch();
            for (const c of colecciones) {
                const ref = window.FS.collection('colecciones').doc(c.id);
                batch.set(ref, c);
            }
            return batch.commit();
        }
        localStorage.setItem('cq_colecciones', JSON.stringify(colecciones));
    },

    // --- CATEGORÍAS ---
    getCategorias: async () => {
        if (Storage.isCloud()) {
            const snapshot = await window.FS.collection('categorias').get();
            return snapshot.docs.map(doc => doc.data());
        }
        if (window.CQ_DATA && window.CQ_DATA.categorias) return window.CQ_DATA.categorias;
        const data = localStorage.getItem('cq_categorias');
        return data ? JSON.parse(data) : [];
    },

    saveCategorias: async (categorias) => {
        if (Storage.isCloud()) {
            const batch = window.FS.batch();
            for (const c of categorias) {
                const ref = window.FS.collection('categorias').doc(c.id);
                batch.set(ref, c);
            }
            return batch.commit();
        }
        localStorage.setItem('cq_categorias', JSON.stringify(categorias));
    },

    // --- CONFIGURACIÓN ---
    getConfig: async () => {
        if (Storage.isCloud()) {
            const doc = await window.FS.collection('config').doc('main').get();
            return doc.exists ? doc.data() : Storage.getDefaultConfig();
        }
        if (window.CQ_DATA && window.CQ_DATA.config) return window.CQ_DATA.config;
        const data = localStorage.getItem('cq_config');
        return data ? JSON.parse(data) : Storage.getDefaultConfig();
    },

    saveConfig: async (config) => {
        if (Storage.isCloud()) {
            return window.FS.collection('config').doc('main').set(config);
        }
        localStorage.setItem('cq_config', JSON.stringify(config));
    },

    getDefaultConfig: () => ({
        whatsapp: '',
        mensajeTemplate: '¡Hola! Quiero hacer un pedido de [PRODUCTO] en talla [TALLA]. Cantidad: [CANTIDAD]. Total: [PRECIO]',
        nombreTienda: 'Catálogo CQ',
        colorPrimario: '#E4002B',
        colorSecundario: '#1F2937'
    }),

    // --- IMÁGENES (Firestore Mode) ---
    saveImagen: async (imagenData) => {
        if (Storage.isCloud()) {
            // Convertir Blob a Base64 para guardarlo en Firestore
            const base64 = await Utils.blobToDataURL(imagenData.blob);
            
            // Guardar en Firestore (Colección 'imagenes')
            return window.FS.collection('imagenes').doc(imagenData.id).set({
                id: imagenData.id,
                productoId: imagenData.productoId,
                orden: imagenData.orden || 0,
                type: imagenData.type || 'image/jpeg',
                base64: base64, // Guardamos la data directamente
                isCloud: true
            });
        }
        const db = await Storage.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([Storage.STORE_IMAGES], 'readwrite');
            const store = transaction.objectStore(Storage.STORE_IMAGES);
            const request = store.put(imagenData);
            request.onsuccess = () => resolve(imagenData.id);
            request.onerror = () => reject('Error al guardar imagen');
        });
    },

    getImagenesByProducto: async (productoId) => {
        if (Storage.isCloud()) {
            const snapshot = await window.FS.collection('imagenes').where('productoId', '==', productoId).get();
            const imgs = snapshot.docs.map(doc => doc.data());
            return imgs.map(img => ({
                ...img,
                blob: Utils.dataURLtoBlob(img.base64)
            })).sort((a, b) => a.orden - b.orden);
        }
        
        if (window.CQ_DATA && window.CQ_DATA.imagenes) {
            const imgs = window.CQ_DATA.imagenes.filter(img => img.productoId === productoId);
            return imgs.map(img => ({ ...img, blob: Utils.dataURLtoBlob(img.blob) }));
        }

        const db = await Storage.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([Storage.STORE_IMAGES], 'readonly');
            const store = transaction.objectStore(Storage.STORE_IMAGES);
            const index = store.index('productoId');
            const request = index.getAll(productoId);
            request.onsuccess = () => resolve(request.result.sort((a, b) => a.orden - b.orden));
            request.onerror = () => reject('Error al obtener imágenes');
        });
    },

    deleteImagenesByProducto: async (productoId) => {
        if (Storage.isCloud()) {
            const snapshot = await window.FS.collection('imagenes').where('productoId', '==', productoId).get();
            const batch = window.FS.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            return batch.commit();
        }
        const db = await Storage.initDB();
        const imagenes = await Storage.getImagenesByProducto(productoId);
        return Promise.all(imagenes.map(img => {
            return new Promise((resolve) => {
                const transaction = db.transaction([Storage.STORE_IMAGES], 'readwrite');
                transaction.objectStore(Storage.STORE_IMAGES).delete(img.id).onsuccess = () => resolve();
            });
        }));
    },

    deleteProducto: async (id) => {
        if (Storage.isCloud()) {
            // Borrar el documento del producto en Firestore
            await window.FS.collection('productos').doc(id).delete();
            // Borrar sus imágenes
            await Storage.deleteImagenesByProducto(id);
            return;
        }
        // Local Mode
        const productos = (await Storage.getProductos()).filter(p => p.id !== id);
        localStorage.setItem('cq_productos', JSON.stringify(productos));
        await Storage.deleteImagenesByProducto(id);
    },

    getColeccionById: async (id) => {
        if (Storage.isCloud()) {
            const doc = await window.FS.collection('colecciones').doc(id).get();
            return doc.exists ? doc.data() : null;
        }
        const cols = await Storage.getColecciones();
        return cols.find(c => c.id === id);
    }
};

window.Storage = Storage;
