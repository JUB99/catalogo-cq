/**
 * Admin CQ - Lógica del Panel Administrativo (V4 - Publicación Web)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Estado Global
    let currentColeccionId = null;
    let editingProductId = null;
    let editingColeccionId = null;
    let tempImages = [];
    let tempColImage = null;

    // 2. Elementos DOM
    const sidebarBtns = document.querySelectorAll('.nav-btn');
    const sectionTitle = document.getElementById('section-title');
    const sectionContent = document.getElementById('section-content');
    const headerAction = document.getElementById('header-action');
    
    // Modal Producto
    const modalProducto = document.getElementById('modal-producto');
    const formProducto = document.getElementById('form-producto');
    const imgPreviews = document.getElementById('image-previews');
    const imgInput = document.getElementById('prod-img-input');
    const dropzone = document.getElementById('image-dropzone');

    // 3. Inicio
    const init = async () => {
        setupEventListeners();
        switchSection('productos');
    };

    const setupEventListeners = () => {
        // Sidebar
        sidebarBtns.forEach(btn => {
            btn.onclick = () => switchSection(btn.getAttribute('data-section'));
        });

        // Modales
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.onclick = () => {
                modalProducto.classList.add('hidden');
                document.getElementById('modal-coleccion').classList.add('hidden');
            };
        });

        // Imágenes Producto
        if (dropzone) {
            dropzone.onclick = () => imgInput.click();
            imgInput.onchange = (e) => handleFiles(e.target.files);
            dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('bg-red-50', 'border-red-600'); };
            dropzone.ondragleave = () => dropzone.classList.remove('bg-red-50', 'border-red-600');
            dropzone.ondrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };
        }

        // Guardar Producto
        document.getElementById('btn-save-product').onclick = (e) => saveProduct(e);

        // Logout
        document.getElementById('btn-logout').onclick = () => Auth.logout();

        // Exportar / Importar
        document.getElementById('btn-export').onclick = async () => {
            const data = await Storage.exportarTodo();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_catalogo_${new Date().toISOString().slice(0,10)}.json`;
            a.click();
        };

        document.getElementById('btn-import').onclick = () => document.getElementById('import-input').click();
        document.getElementById('import-input').onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const text = await file.text();
                if (await Storage.importarTodo(text)) {
                    Utils.showToast('Datos importados correctamente');
                    renderSection(sidebarBtns[0].getAttribute('data-section'));
                }
            }
        };
    };

    window.switchSection = (section) => {
        sidebarBtns.forEach(btn => {
            if (btn.getAttribute('data-section') === section) {
                btn.classList.add('bg-red-600', 'text-white');
                btn.classList.remove('hover:bg-gray-800', 'text-gray-400');
            } else {
                btn.classList.remove('bg-red-600', 'text-white');
                btn.classList.add('hover:bg-gray-800', 'text-gray-400');
            }
        });

        renderSection(section);
    };

    const renderSection = async (section) => {
        sectionContent.innerHTML = '<div class="flex justify-center p-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div>';
        
        switch (section) {
            case 'productos':
                sectionTitle.textContent = 'Colecciones';
                if (currentColeccionId) {
                    const col = await Storage.getColeccionById(currentColeccionId);
                    sectionTitle.textContent = col.nombre;
                    document.getElementById('breadcrumbs').classList.remove('hidden');
                    document.getElementById('current-col-name').textContent = col.nombre;
                    
                    const prods = (await Storage.getProductos()).filter(p => p.coleccionId === currentColeccionId);
                    const activeCount = prods.filter(p => p.activo).length;

                    headerAction.innerHTML = `
                        <div class="flex flex-col items-end gap-2">
                            <div class="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Publicados:</span>
                                <span class="text-sm font-black ${activeCount >= 30 ? 'text-red-600' : 'text-green-600'}">${activeCount} / 30</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div id="bulk-actions" class="hidden flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                                    <button onclick="bulkToggleActive(true)" class="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-all">PUBLICAR</button>
                                    <button onclick="bulkToggleActive(false)" class="px-3 py-1 bg-gray-600 text-white text-[10px] font-bold rounded-lg hover:bg-gray-700 transition-all">OCULTAR</button>
                                    <button onclick="deleteSelectedProducts()" class="p-1.5 bg-white text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                <label class="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold cursor-pointer transition-all">
                                    <input type="checkbox" id="select-all-products" onchange="toggleSelectAll(this.checked)" class="w-4 h-4 accent-red-600">
                                    Todos
                                </label>
                                <button onclick="openProductModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-600/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                                    Agregar
                                </button>
                            </div>
                        </div>
                    `;
                    renderProductos();
                } else {
                    document.getElementById('breadcrumbs').classList.add('hidden');
                    headerAction.innerHTML = `
                        <button onclick="openColeccionModal()" class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            Crear Colección
                        </button>
                    `;
                    renderColecciones();
                }
                break;
            
            case 'categorias':
                sectionTitle.textContent = 'Categorías';
                headerAction.innerHTML = `
                    <button id="btn-add-cat" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                        Agregar Categoría
                    </button>
                `;
                renderCategorias();
                break;

            case 'carga-masiva':
                sectionTitle.textContent = 'Carga Masiva de Medios';
                headerAction.innerHTML = '';
                renderCargaMasiva();
                break;

            case 'configuracion':
                sectionTitle.textContent = 'Configuración';
                headerAction.innerHTML = '';
                renderConfiguracion();
                break;

            case 'publicar':
                sectionTitle.textContent = 'Compartir Catálogo';
                headerAction.innerHTML = '';
                renderPublicar();
                break;
        }
    };

    // 7. Lógica de Colecciones
    const renderColecciones = async () => {
        const colecciones = await Storage.getColecciones();

        if (colecciones.length === 0) {
            sectionContent.innerHTML = `
                <div class="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 mb-4">No tienes colecciones creadas todavía.</p>
                    <button class="text-red-600 font-bold hover:underline" onclick="openColeccionModal()">Crea tu primera colección</button>
                </div>
            `;
            return;
        }

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';
        for (const col of colecciones) {
            const imagenes = await Storage.getImagenesByProducto(col.id);
            const imgUrl = imagenes.length > 0 ? URL.createObjectURL(imagenes[0].blob) : '';
            
            html += `
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group">
                    <div onclick="enterColeccion('${col.id}')" class="aspect-[4/3] bg-gray-100 relative cursor-pointer overflow-hidden">
                        ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500">` : `
                            <div class="w-full h-full flex items-center justify-center text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            </div>
                        `}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                            <h4 class="text-xl font-bold text-white">${col.nombre}</h4>
                        </div>
                    </div>
                    <div class="p-4 flex gap-2">
                        <button onclick="openColeccionModal('${col.id}')" class="flex-1 py-2 bg-gray-50 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-100 transition-all">Editar</button>
                        <button onclick="deleteColeccion('${col.id}')" class="p-2 bg-gray-50 text-red-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        sectionContent.innerHTML = html;
    };

    window.enterColeccion = (id) => {
        currentColeccionId = id;
        renderSection('productos');
    };

    window.exitColeccion = () => {
        currentColeccionId = null;
        renderSection('productos');
    };

    window.openColeccionModal = async (id = null) => {
        editingColeccionId = id;
        const modal = document.getElementById('modal-coleccion');
        const title = document.getElementById('col-modal-title');
        const input = document.getElementById('col-nombre');
        const preview = document.getElementById('col-img-preview');
        
        input.value = '';
        preview.classList.add('hidden');
        tempColImage = null;

        if (id) {
            title.textContent = 'Editar Colección';
            const col = await Storage.getColeccionById(id);
            input.value = col.nombre;
            const imgs = await Storage.getImagenesByProducto(id);
            if (imgs.length > 0) {
                preview.classList.remove('hidden');
                preview.querySelector('img').src = URL.createObjectURL(imgs[0].blob);
            }
        } else {
            title.textContent = 'Crear Colección';
        }

        modal.classList.remove('hidden');
    };

    window.closeColModal = () => {
        document.getElementById('modal-coleccion').classList.add('hidden');
    };

    // Imágenes de Colección
    const colImgDropzone = document.getElementById('col-img-dropzone');
    const colImgInput = document.getElementById('col-img-input');
    if (colImgDropzone) {
        colImgDropzone.onclick = () => colImgInput.click();
        colImgInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                tempColImage = await Utils.compressImage(file);
                const preview = document.getElementById('col-img-preview');
                preview.classList.remove('hidden');
                preview.querySelector('img').src = URL.createObjectURL(tempColImage);
            }
        };
    }

    document.getElementById('btn-save-coleccion').onclick = async () => {
        const nombre = document.getElementById('col-nombre').value;
        if (!nombre) return;

        const colecciones = await Storage.getColecciones();
        const id = editingColeccionId || Utils.generateId();
        const col = { id, nombre, fecha: new Date().toISOString() };

        if (editingColeccionId) {
            const index = colecciones.findIndex(c => c.id === id);
            colecciones[index] = col;
        } else {
            colecciones.push(col);
        }

        Storage.saveColecciones(colecciones);

        if (tempColImage) {
            await Storage.deleteImagenesByProducto(id);
            await Storage.saveImagen({
                id: Utils.generateId(),
                productoId: id,
                blob: tempColImage,
                orden: 0,
                esPrincipal: true,
                type: 'image'
            });
        }

        Utils.showToast(editingColeccionId ? 'Colección actualizada' : 'Colección creada');
        closeColModal();
        renderColecciones();
    };

    window.deleteColeccion = async (id) => {
        if (confirm('¿Eliminar esta colección y TODOS sus productos? Esta acción no se puede deshacer.')) {
            const colecciones = (await Storage.getColecciones()).filter(c => c.id !== id);
            await Storage.saveColecciones(colecciones);
            
            // Eliminar productos vinculados
            let productos = await Storage.getProductos();
            const prodsToDelete = productos.filter(p => p.coleccionId === id);
            for (const p of prodsToDelete) {
                await Storage.deleteImagenesByProducto(p.id);
            }
            productos = productos.filter(p => p.coleccionId !== id);
            await Storage.saveProductos(productos);
            
            await Storage.deleteImagenesByProducto(id); // Imagen de portada
            Utils.showToast('Colección eliminada');
            renderColecciones();
        }
    };

    // 8. Lógica de Productos
    const renderProductos = async () => {
        const allProductos = await Storage.getProductos();
        const productos = allProductos.filter(p => p.coleccionId === currentColeccionId);
        const categorias = await Storage.getCategorias();

        if (productos.length === 0) {
            sectionContent.innerHTML = `
                <div class="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 mb-4">No hay productos en esta colección.</p>
                    <button class="text-red-600 font-bold hover:underline" onclick="openProductModal()">Agrega tu primer producto</button>
                </div>
            `;
            return;
        }

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">';

        for (const prod of productos) {
            const imagenes = await Storage.getImagenesByProducto(prod.id);
            const media = imagenes.length > 0 ? imagenes[0] : null;
            const url = media ? URL.createObjectURL(media.blob) : 'https://via.placeholder.com/400x500?text=Sin+Imagen';
            const isVideo = media && media.type === 'video';
            const cat = categorias.find(c => c.id === prod.categoria)?.nombre || 'Sin categoría';

            html += `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-all group relative">
                    <!-- Checkbox de selección -->
                    <div class="absolute top-3 right-3 z-10">
                        <input type="checkbox" data-id="${prod.id}" class="product-selector w-6 h-6 rounded-full border-2 border-white shadow-md accent-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity checked:opacity-100" onchange="updateSelectionState()">
                    </div>

                    <div class="aspect-[4/5] relative bg-gray-100 overflow-hidden">
                        ${isVideo
                            ? `<video src="${url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                               <div class="absolute bottom-2 right-2 bg-black/50 text-white text-[8px] px-2 py-1 rounded font-bold">VIDEO</div>`
                            : `<img src="${url}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
                        }
                        <div class="absolute top-3 left-3 flex gap-2">
                            ${!prod.activo ? '<span class="px-2 py-1 bg-gray-900/80 text-white text-[10px] font-bold uppercase rounded">Inactivo</span>' : ''}
                            ${!prod.stock ? '<span class="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase rounded">Agotado</span>' : ''}
                            ${prod.destacado ? '<span class="px-2 py-1 bg-yellow-500 text-white text-[10px] font-bold uppercase rounded">Destacado</span>' : ''}
                        </div>
                    </div>
                    <div class="p-5 flex-1 relative">
                        <div class="flex justify-between items-start mb-2">
                            <p class="text-[10px] font-bold text-red-600 uppercase tracking-widest">${cat}</p>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${prod.activo ? 'checked' : ''} onchange="toggleProductActive('${prod.id}', this.checked)" class="sr-only peer">
                                <div class="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                <span class="ml-2 text-[10px] font-bold ${prod.activo ? 'text-green-600' : 'text-gray-400'} uppercase">${prod.activo ? 'Público' : 'Oculto'}</span>
                            </label>
                        </div>
                        <h4 class="font-bold text-gray-800 line-clamp-1">${prod.nombre}</h4>
                        <div class="flex items-center gap-2 mt-2">
                            <span class="text-lg font-black text-gray-900">${Utils.formatCurrency(prod.precio_descuento || prod.precio)}</span>
                            ${prod.precio_descuento ? `<span class="text-xs text-gray-400 line-through">${Utils.formatCurrency(prod.precio)}</span>` : ''}
                        </div>
                    </div>
                    <div class="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                        <button onclick="editProduct('${prod.id}')" class="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Editar
                        </button>
                        <button onclick="duplicateProduct('${prod.id}')" class="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-600 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                        </button>
                        <button onclick="deleteProduct('${prod.id}')" class="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        sectionContent.innerHTML = html;
    };

    window.openProductModal = async () => {
        // Validar límite de 30 productos
        const allProds = await Storage.getProductos();
        const currentColProds = allProds.filter(p => p.coleccionId === currentColeccionId);
        
        if (currentColProds.length >= 30) {
            Utils.showToast('Límite alcanzado: Máximo 30 productos por colección', 'error');
            return;
        }

        editingProductId = null;
        document.getElementById('modal-title').textContent = 'Agregar Producto';
        formProducto.reset();
        tempImages = [];
        imgPreviews.innerHTML = '';
        modalProducto.classList.remove('hidden');
        await loadCategoriasSelect();
    };

    const loadCategoriasSelect = async () => {
        const select = document.getElementById('prod-categoria');
        const categorias = await Storage.getCategorias();
        select.innerHTML = '<option value="">Sin categoría</option>' + 
            categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    };

    const handleFiles = async (files) => {
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            const compressed = await Utils.compressImage(file);
            const id = Utils.generateId();
            tempImages.push({ id, blob: compressed, isNew: true });
            
            renderImagePreviews();
        }
    };

    const renderImagePreviews = () => {
        imgPreviews.innerHTML = '';
        tempImages.forEach((img, index) => {
            const url = URL.createObjectURL(img.blob);
            const div = document.createElement('div');
            div.className = 'relative aspect-square rounded-lg overflow-hidden border border-gray-200 group';
            div.innerHTML = `
                <img src="${url}" class="w-full h-full object-cover">
                <button type="button" onclick="removeTempImage('${img.id}')" class="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                ${index === 0 ? '<span class="absolute bottom-1 left-1 bg-gray-900/80 text-white text-[8px] font-bold px-1 rounded">PRINCIPAL</span>' : ''}
            `;
            imgPreviews.appendChild(div);
        });

        if (tempImages.length > 0) {
            new Sortable(imgPreviews, {
                animation: 150,
                onEnd: (evt) => {
                    const item = tempImages.splice(evt.oldIndex, 1)[0];
                    tempImages.splice(evt.newIndex, 0, item);
                    renderImagePreviews();
                }
            });
        }
    };

    window.removeTempImage = (id) => {
        tempImages = tempImages.filter(img => img.id !== id);
        renderImagePreviews();
    };

    const saveProduct = async (e) => {
        e.preventDefault();
        const formData = new FormData(formProducto);
        
        const nombre = formData.get('nombre');
        const precio = parseFloat(formData.get('precio'));
        
        if (!nombre || isNaN(precio)) {
            Utils.showToast('Por favor completa los campos obligatorios', 'error');
            return;
        }

        const id = editingProductId || Utils.generateId();
        
        const producto = {
            id,
            nombre,
            descripcion: formData.get('descripcion'),
            categoria: formData.get('categoria'),
            coleccionId: currentColeccionId,
            precio,
            precio_descuento: parseFloat(formData.get('precio_descuento')) || null,
            activo: document.getElementById('prod-activo').checked,
            stock: document.getElementById('prod-stock').checked,
            destacado: document.getElementById('prod-destacado').checked,
            tallas: document.getElementById('prod-tallas').value.split(',').map(s => s.trim()).filter(s => s),
            colores: document.getElementById('prod-colores').value.split(',').map(s => s.trim()).filter(s => s),
            fecha: new Date().toISOString()
        };

        const productos = await Storage.getProductos();
        if (editingProductId) {
            const index = productos.findIndex(p => p.id === id);
            productos[index] = producto;
        } else {
            productos.unshift(producto);
        }

        await Storage.saveProductos(productos);

        if (editingProductId) {
            await Storage.deleteImagenesByProducto(id);
        }

        for (let i = 0; i < tempImages.length; i++) {
            const img = tempImages[i];
            await Storage.saveImagen({
                id: img.id,
                productoId: id,
                blob: img.blob,
                orden: i,
                esPrincipal: i === 0
            });
        }

        Utils.showToast(editingProductId ? 'Producto actualizado' : 'Producto creado con éxito');
        modalProducto.classList.add('hidden');
        renderSection('productos');
    };

    window.editProduct = async (id) => {
        editingProductId = id;
        const prod = await Storage.getProductoById(id);
        if (!prod) return;

        document.getElementById('modal-title').textContent = 'Editar Producto';
        document.getElementById('prod-nombre').value = prod.nombre;
        document.getElementById('prod-descripcion').value = prod.descripcion;
        document.getElementById('prod-precio').value = prod.precio;
        document.getElementById('prod-precio-desc').value = prod.precio_descuento || '';
        document.getElementById('prod-activo').checked = prod.activo;
        document.getElementById('prod-stock').checked = prod.stock;
        document.getElementById('prod-destacado').checked = prod.destacado;
        document.getElementById('prod-tallas').value = prod.tallas.join(', ');
        document.getElementById('prod-colores').value = prod.colores.join(', ');

        await loadCategoriasSelect();
        document.getElementById('prod-categoria').value = prod.categoria || '';

        const imagenes = await Storage.getImagenesByProducto(id);
        tempImages = imagenes.map(img => ({ id: img.id, blob: img.blob, isNew: false }));
        renderImagePreviews();

        modalProducto.classList.remove('hidden');
    };

    window.duplicateProduct = async (id) => {
        const prod = await Storage.getProductoById(id);
        if (!prod) return;

        const newId = Utils.generateId();
        const newProd = { ...prod, id: newId, nombre: `${prod.nombre} (Copia)`, fecha: new Date().toISOString() };
        
        const productos = await Storage.getProductos();
        productos.unshift(newProd);
        await Storage.saveProductos(productos);

        const imagenes = await Storage.getImagenesByProducto(id);
        for (const img of imagenes) {
            await Storage.saveImagen({
                ...img,
                id: Utils.generateId(),
                productoId: newId
            });
        }

        Utils.showToast('Producto duplicado');
        renderProductos();
    };

    window.deleteProduct = async (id) => {
        if (confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
            const productos = (await Storage.getProductos()).filter(p => p.id !== id);
            await Storage.saveProductos(productos);
            await Storage.deleteImagenesByProducto(id);
            Utils.showToast('Producto eliminado');
            renderSection('productos');
        }
    };

    // --- Lógica de Selección Masiva ---
    window.toggleSelectAll = (checked) => {
        const selectors = document.querySelectorAll('.product-selector');
        selectors.forEach(s => s.checked = checked);
        updateSelectionState();
    };

    window.updateSelectionState = () => {
        const selected = document.querySelectorAll('.product-selector:checked');
        const bulkActions = document.getElementById('bulk-actions');
        
        if (selected.length > 0) {
            bulkActions.classList.remove('hidden');
        } else {
            bulkActions.classList.add('hidden');
            document.getElementById('select-all-products').checked = false;
        }
    };

    window.deleteSelectedProducts = async () => {
        const selected = document.querySelectorAll('.product-selector:checked');
        if (selected.length === 0) return;

        if (confirm(`¿Estás seguro de eliminar ${selected.length} productos seleccionados? Esta acción es irreversible.`)) {
            const idsToDelete = Array.from(selected).map(s => s.getAttribute('data-id'));
            let productos = await Storage.getProductos();
            
            for (const id of idsToDelete) {
                productos = productos.filter(p => p.id !== id);
                await Storage.deleteImagenesByProducto(id);
            }

            await Storage.saveProductos(productos);
            Utils.showToast(`${idsToDelete.length} productos eliminados`);
            renderSection('productos');
        }
    };

    window.bulkToggleActive = async (active) => {
        const selected = document.querySelectorAll('.product-selector:checked');
        if (selected.length === 0) return;

        const ids = Array.from(selected).map(s => s.getAttribute('data-id'));
        const allProds = await Storage.getProductos();
        
        if (active) {
            const alreadyActive = allProds.filter(p => p.coleccionId === currentColeccionId && p.activo && !ids.includes(p.id)).length;
            if (alreadyActive + ids.length > 30) {
                Utils.showToast(`Error: No puedes tener más de 30 productos públicos. Actualmente tienes ${alreadyActive}.`, 'error');
                return;
            }
        }

        ids.forEach(id => {
            const p = allProds.find(p => p.id === id);
            if (p) p.activo = active;
        });

        await Storage.saveProductos(allProds);
        Utils.showToast(active ? 'Productos publicados' : 'Productos ocultados');
        renderSection('productos');
    };

    window.toggleProductActive = async (id, active) => {
        const allProds = await Storage.getProductos();
        
        if (active) {
            const activeCount = allProds.filter(p => p.coleccionId === currentColeccionId && p.activo).length;
            if (activeCount >= 30) {
                Utils.showToast('Límite de 30 productos públicos alcanzado', 'error');
                renderSection('productos');
                return;
            }
        }

        const p = allProds.find(p => p.id === id);
        if (p) p.activo = active;
        await Storage.saveProductos(allProds);
        renderSection('productos');
    };

    // 8. Lógica de Categorías
    const renderCategorias = async () => {
        const categorias = await Storage.getCategorias();
        
        let html = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Nombre</th>
                            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Slug</th>
                            <th class="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
        `;

        if (categorias.length === 0) {
            html += `<tr><td colspan="3" class="px-6 py-10 text-center text-gray-400">No hay categorías registradas</td></tr>`;
        } else {
            categorias.forEach(cat => {
                html += `
                    <tr>
                        <td class="px-6 py-4 font-medium text-gray-800">${cat.nombre}</td>
                        <td class="px-6 py-4 text-gray-500 text-sm">${cat.slug}</td>
                        <td class="px-6 py-4 flex gap-2">
                            <button onclick="deleteCategoria('${cat.id}')" class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;

        sectionContent.innerHTML = html;

        document.getElementById('btn-add-cat').onclick = async () => {
            const nombre = prompt('Nombre de la nueva categoría:');
            if (nombre) {
                const categorias = await Storage.getCategorias();
                const slug = nombre.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
                categorias.push({ id: Utils.generateId(), nombre, slug });
                await Storage.saveCategorias(categorias);
                renderCategorias();
            }
        };
    };

    window.deleteCategoria = async (id) => {
        if (confirm('¿Eliminar esta categoría?')) {
            const categorias = (await Storage.getCategorias()).filter(c => c.id !== id);
            await Storage.saveCategorias(categorias);
            renderCategorias();
        }
    };

    // 9. Lógica de Carga Masiva
    const renderCargaMasiva = () => {
        sectionContent.innerHTML = `
            <div class="space-y-8">
                <div class="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center group hover:border-red-600 transition-all cursor-pointer" id="bulk-dropzone">
                    <div class="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800">Carga Masiva</h3>
                    <p class="text-gray-500 mt-2">Arrastra fotos o videos para crear productos automáticos</p>
                    <input type="file" id="bulk-input" multiple accept="image/*,video/*" class="hidden">
                </div>
                <div id="bulk-results" class="hidden space-y-6">
                    <div class="flex items-center justify-between">
                        <h4 class="text-lg font-bold text-gray-800">Archivos Detectados</h4>
                        <button id="btn-save-all-bulk" class="px-6 py-2 bg-green-600 text-white font-bold rounded-xl shadow-lg">Crear Productos</button>
                    </div>
                    <div id="bulk-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>
                <div id="bulk-loading" class="hidden flex flex-col items-center justify-center py-20">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
                    <p class="text-gray-500">Procesando...</p>
                </div>
            </div>
        `;

        const drop = document.getElementById('bulk-dropzone');
        const input = document.getElementById('bulk-input');
        drop.onclick = () => input.click();
        input.onchange = (e) => processBulkFiles(e.target.files);
    };

    const processBulkFiles = async (files) => {
        if (files.length === 0) return;
        const allProds = await Storage.getProductos();
        const currentColProds = allProds.filter(p => p.coleccionId === currentColeccionId);
        const availableSlots = 30 - currentColProds.length;

        if (availableSlots <= 0) {
            Utils.showToast('Colección llena', 'error');
            return;
        }

        document.getElementById('bulk-dropzone').classList.add('hidden');
        document.getElementById('bulk-loading').classList.remove('hidden');

        const detected = [];
        const total = Math.min(files.length, availableSlots);
        
        for (let i = 0; i < total; i++) {
            const f = files[i];
            const isVideo = f.type.startsWith('video/');
            const blob = isVideo ? f : await Utils.compressImage(f);
            const name = f.name.split('.')[0].replace(/[-_]/g, ' ');

            detected.push({
                id: Utils.generateId(),
                nombre: name.charAt(0).toUpperCase() + name.slice(1),
                precio: 0,
                blob,
                type: isVideo ? 'video' : 'image',
                selected: true
            });
        }

        document.getElementById('bulk-loading').classList.add('hidden');
        document.getElementById('bulk-results').classList.remove('hidden');
        renderBulkResults(detected);
    };

    const renderBulkResults = (media) => {
        const grid = document.getElementById('bulk-grid');
        grid.innerHTML = media.map((m, i) => `
            <div class="bg-white rounded-2xl border p-4">
                <div class="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                    ${m.type === 'image' ? `<img src="${URL.createObjectURL(m.blob)}" class="w-full h-full object-cover">` : `<video src="${URL.createObjectURL(m.blob)}" class="w-full h-full object-cover"></video>`}
                </div>
                <input type="text" value="${m.nombre}" onchange="window.bulkMedia[${i}].nombre = this.value" class="w-full px-2 py-1 border rounded mb-2 text-sm">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-bold">PRECIO:</span>
                    <input type="number" value="0" onchange="window.bulkMedia[${i}].precio = parseFloat(this.value)" class="flex-1 px-2 py-1 border rounded text-sm">
                </div>
            </div>
        `).join('');
        window.bulkMedia = media;

        document.getElementById('btn-save-all-bulk').onclick = async () => {
            const prods = await Storage.getProductos();
            const currentActive = prods.filter(p => p.coleccionId === currentColeccionId && p.activo).length;
            let canActivate = 30 - currentActive;

            for (const m of window.bulkMedia) {
                const active = canActivate > 0;
                const p = {
                    id: m.id,
                    nombre: m.nombre,
                    descripcion: '',
                    categoria: '',
                    coleccionId: currentColeccionId,
                    precio: m.precio,
                    precio_descuento: null,
                    activo: active,
                    stock: true,
                    destacado: false,
                    tallas: ['S', 'M', 'L', 'XL'],
                    colores: [],
                    fecha: new Date().toISOString()
                };
                if (active) canActivate--;
                prods.unshift(p);
                await Storage.saveImagen({ id: Utils.generateId(), productoId: p.id, blob: m.blob, orden: 0, esPrincipal: true, type: m.type });
            }
            await Storage.saveProductos(prods);
            Utils.showToast('Productos creados');
            switchSection('productos');
        };
    };

    // 10. Lógica de Configuración
    const renderConfiguracion = async () => {
        const config = await Storage.getConfig();
        sectionContent.innerHTML = `
            <div class="max-w-xl bg-white p-8 rounded-3xl border">
                <form id="form-config" class="space-y-6">
                    <div>
                        <label class="block text-sm font-bold mb-2">Nombre Tienda</label>
                        <input type="text" name="nombreTienda" value="${config.nombreTienda}" class="w-full px-4 py-2 border rounded-xl">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2">WhatsApp</label>
                        <input type="text" name="whatsapp" value="${config.whatsapp}" class="w-full px-4 py-2 border rounded-xl">
                    </div>
                    <button type="submit" class="w-full py-3 bg-red-600 text-white font-bold rounded-xl">Guardar</button>
                </form>
            </div>
        `;
        document.getElementById('form-config').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            await Storage.saveConfig({ ...config, nombreTienda: fd.get('nombreTienda'), whatsapp: fd.get('whatsapp') });
            Utils.showToast('Configuración guardada');
        };
    };

    // 11. Lógica de Publicación (GitHub Pages)
    const renderPublicar = () => {
        sectionContent.innerHTML = `
            <div class="max-w-2xl space-y-8">
                <div class="bg-blue-50 border border-blue-100 p-8 rounded-3xl">
                    <h3 class="text-blue-900 font-bold text-xl mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        ¿Cómo publicar tu catálogo gratis?
                    </h3>
                    <ol class="space-y-4 text-blue-800 text-sm list-decimal ml-4">
                        <li>Haz clic en el botón <b>"Generar Archivo de Catálogo"</b> abajo.</li>
                        <li>Se descargará un archivo llamado <code class="bg-blue-100 px-2 rounded">data.js</code>.</li>
                        <li>Copia ese archivo dentro de la carpeta <code class="bg-blue-100 px-2 rounded">js/</code> de tu proyecto.</li>
                        <li>Sube toda la carpeta a <b>GitHub Pages</b> o <b>Netlify</b>.</li>
                    </ol>
                </div>

                <div class="bg-white p-8 rounded-3xl border flex flex-col items-center text-center">
                    <div class="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </div>
                    <h4 class="font-bold text-gray-800 text-lg">Publicar Catálogo</h4>
                    <p class="text-gray-500 text-sm mb-8">Esto empaquetará todas tus fotos y productos en un solo archivo para que el cliente pueda verlos.</p>
                    
                    <button id="btn-publish-data" class="px-10 py-4 bg-green-600 text-white font-black italic rounded-2xl shadow-xl shadow-green-600/20 hover:scale-105 transition-all">
                        GENERAR ARCHIVO DE CATÁLOGO
                    </button>
                    
                    <div id="publish-loading" class="hidden mt-6 flex items-center gap-3 text-sm text-gray-500 font-bold">
                        <div class="animate-spin h-5 w-5 border-b-2 border-green-600 rounded-full"></div>
                        Procesando fotos... por favor espera.
                    </div>
                </div>
            </div>
        `;

        document.getElementById('btn-publish-data').onclick = async () => {
            const btn = document.getElementById('btn-publish-data');
            const loading = document.getElementById('publish-loading');
            
            btn.disabled = true;
            btn.classList.add('opacity-50');
            loading.classList.remove('hidden');

            try {
                const data = JSON.parse(await Storage.exportarTodo());
                // Envolvemos en una variable global para data.js
                const fileContent = `window.CQ_DATA = ${JSON.stringify(data)};`;
                
                const blob = new Blob([fileContent], { type: 'application/javascript' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'data.js';
                a.click();
                
                Utils.showToast('¡Archivo data.js generado! Cópialo en la carpeta js/');
            } catch (err) {
                console.error(err);
                Utils.showToast('Error al generar el archivo', 'error');
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-50');
                loading.classList.add('hidden');
            }
        };
    };

    init();
});
