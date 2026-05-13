/**
 * Catálogo CQ - Lógica del Catálogo Público (V3 - Slider + Cantidades)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Estado Global
    let productos = [];
    let categorias = [];
    let config = {};
    let selectedColeccionId = null;
    let filteredProductos = [];
    let currentSlide = 0;
    
    let selectedTalla = null;
    let selectedColor = null;

    // 2. Elementos DOM
    const storeName = document.getElementById('store-name');
    const collectionsView = document.getElementById('collections-view');
    const collectionsGrid = document.getElementById('collections-grid');
    const desktopView = document.getElementById('desktop-view');
    const mobileView = document.getElementById('mobile-view');
    const btnBack = document.getElementById('btn-back-to-cols');
    const sliderTrack = document.getElementById('slider-track');
    const slideCurrent = document.getElementById('slide-current');
    const slideTotal = document.getElementById('slide-total');

    // 3. Inicio del Sistema
    const init = async () => {
        try {
            productos = (await Storage.getProductos()).filter(p => p.activo);
            categorias = await Storage.getCategorias();
            config = await Storage.getConfig();

            document.title = `${config.nombreTienda} - Catálogo`;
            if (storeName) storeName.textContent = config.nombreTienda.toUpperCase();

            setupBaseEvents();

            const colecciones = await Storage.getColecciones();
            if (colecciones.length > 0) {
                await renderColecciones();
            } else {
                filteredProductos = [...productos];
                await renderCatalogo();
            }
        } catch (err) {
            console.error("Error en Init:", err);
        }
    };

    const setupBaseEvents = () => {
        if (btnBack) {
            btnBack.onclick = () => {
                selectedColeccionId = null;
                renderColecciones();
            };
        }

        // Navegación Slider
        const btnPrev = document.getElementById('slide-prev');
        const btnNext = document.getElementById('slide-next');
        if (btnPrev) btnPrev.onclick = () => moveSlide(-1);
        if (btnNext) btnNext.onclick = () => moveSlide(1);

        // Botones Cantidad en Modal
        const btnQtyMinus = document.getElementById('btn-qty-minus');
        const btnQtyPlus = document.getElementById('btn-qty-plus');
        if (btnQtyMinus) btnQtyMinus.onclick = () => changeDetailQty(-1);
        if (btnQtyPlus) btnQtyPlus.onclick = () => changeDetailQty(1);

        // Teclado
        window.onkeydown = (e) => {
            if (e.key === 'ArrowLeft') moveSlide(-1);
            if (e.key === 'ArrowRight') moveSlide(1);
        };

        // Modal Detalle - Botón Cerrar
        document.querySelectorAll('.close-detail-modal').forEach(btn => {
            btn.onclick = () => {
                const box = document.getElementById('detail-modal-box');
                if (box) box.classList.add('translate-y-full');
                setTimeout(() => {
                    const modal = document.getElementById('modal-detalle');
                    if (modal) modal.classList.add('hidden');
                }, 500);
            };
        });

        // Carrito
        const btnCartOpen = document.getElementById('btn-cart-open');
        if (btnCartOpen) btnCartOpen.onclick = () => Carrito.abrir();

        // Botón Añadir al Carrito (en el modal de detalle)
        const btnAddToCart = document.getElementById('btn-add-to-cart');
        if (btnAddToCart) {
            btnAddToCart.onclick = () => {
                const id = btnAddToCart.getAttribute('data-id');
                const qty = parseInt(document.getElementById('detail-qty').textContent);
                const prod = productos.find(p => p.id === id);
                
                if (prod) {
                    // Validar si tiene tallas/colores y si están seleccionados
                    if (prod.tallas.length > 0 && !selectedTalla) {
                        Utils.showToast('Por favor selecciona una talla', 'error');
                        return;
                    }
                    if (prod.colores.length > 0 && !selectedColor) {
                        Utils.showToast('Por favor selecciona un color', 'error');
                        return;
                    }

                    // Obtener imagen principal para el carrito
                    Storage.getImagenesByProducto(id).then(imgs => {
                        const mainImg = imgs.length > 0 ? URL.createObjectURL(imgs[0].blob) : '';
                        const prodWithImg = { ...prod, imagen_principal: mainImg };
                        Carrito.agregar(prodWithImg, selectedTalla || '-', selectedColor || '-', qty);
                        
                        // Cerrar modal
                        document.querySelectorAll('.close-detail-modal')[0].click();
                    });
                }
            };
        }
    };

    window.changeDetailQty = (delta) => {
        const qtyEl = document.getElementById('detail-qty');
        let qty = parseInt(qtyEl.textContent) + delta;
        if (qty < 1) qty = 1;
        qtyEl.textContent = qty;
        updateDetailTotal();
    };

    const updateDetailTotal = () => {
        const qty = parseInt(document.getElementById('detail-qty').textContent);
        const priceText = document.getElementById('detail-precio').textContent;
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
        const totalEl = document.getElementById('detail-total');
        if (totalEl) totalEl.textContent = Utils.formatCurrency(price * qty);
    };

    // 4. Renderizado de Colecciones
    const renderColecciones = async () => {
        const colecciones = await Storage.getColecciones();
        if (collectionsView) collectionsView.classList.remove('hidden');
        if (desktopView) desktopView.classList.add('hidden');
        if (mobileView) mobileView.classList.add('hidden');
        if (btnBack) btnBack.classList.add('hidden');

        if (!collectionsGrid) return;
        collectionsGrid.innerHTML = '';

        for (const col of colecciones) {
            let imgUrl = '';
            try {
                const imgs = await Storage.getImagenesByProducto(col.id);
                if (imgs && imgs.length > 0) imgUrl = URL.createObjectURL(imgs[0].blob);
            } catch (e) {}

            const colCard = document.createElement('div');
            colCard.className = "group cursor-pointer animate-fade-in";
            colCard.onclick = () => openColeccion(col.id);
            colCard.innerHTML = `
                <div class="aspect-[4/5] bg-gray-200 rounded-[2.5rem] overflow-hidden relative shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                    ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-all duration-700">` : `
                        <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 italic font-bold text-4xl">CQ</div>
                    `}
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-10">
                        <h3 class="text-3xl font-black italic text-white tracking-tighter uppercase mb-2">${col.nombre}</h3>
                        <span class="text-red-500 font-bold text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">Entrar →</span>
                    </div>
                </div>
            `;
            collectionsGrid.appendChild(colCard);
        }
    };

    window.openColeccion = (id) => {
        selectedColeccionId = id;
        filteredProductos = productos.filter(p => p.coleccionId === id);
        currentSlide = 0;
        
        if (collectionsView) collectionsView.classList.add('hidden');
        if (btnBack) btnBack.classList.remove('hidden');
        
        renderCatalogo();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderCatalogo = async () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            renderMobile();
        } else {
            renderDesktop();
        }
    };

    const renderDesktop = async () => {
        if (desktopView) desktopView.classList.remove('hidden');
        if (mobileView) mobileView.classList.add('hidden');
        if (!sliderTrack) return;

        sliderTrack.innerHTML = '';
        const prods = filteredProductos;
        
        // 1. Portada del Slider
        const col = selectedColeccionId ? await Storage.getColeccionById(selectedColeccionId) : null;
        const coverSlide = document.createElement('div');
        coverSlide.className = "min-w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-20 text-center relative overflow-hidden";
        coverSlide.innerHTML = `
            <div class="relative z-10">
                <div class="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center font-bold italic text-white text-4xl mb-8 mx-auto shadow-2xl">CQ</div>
                <h1 class="text-6xl font-black italic tracking-tighter mb-4">${(col ? col.nombre : config.nombreTienda).toUpperCase()}</h1>
                <p class="text-red-500 font-bold tracking-[0.3em] uppercase text-sm mb-12">Desliza para ver los productos</p>
                <div class="flex items-center justify-center gap-4">
                    <button onclick="moveSlide(1)" class="px-10 py-4 bg-white text-gray-900 font-black italic rounded-full hover:bg-red-600 hover:text-white transition-all shadow-xl">EMPEZAR</button>
                </div>
            </div>
        `;
        sliderTrack.appendChild(coverSlide);

        // 2. Diapositivas de Productos
        for (const p of prods) {
            const imgs = await Storage.getImagenesByProducto(p.id);
            const media = imgs.length > 0 ? imgs[0] : null;
            const url = media ? URL.createObjectURL(media.blob) : '';
            const isVideo = media && media.type === 'video';

            const slide = document.createElement('div');
            slide.className = "min-w-full h-full flex items-center p-12 gap-12 bg-white";
            slide.innerHTML = `
                <div class="w-1/2 h-full rounded-[2rem] overflow-hidden shadow-2xl bg-gray-50 group/img relative cursor-pointer" onclick="openProductDetail('${p.id}')">
                    ${isVideo 
                        ? `<video src="${url}" class="w-full h-full object-cover" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>`
                        : `<img src="${url}" class="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700">`
                    }
                    <div class="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-all flex items-center justify-center">
                        <span class="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full text-xs font-bold shadow-lg opacity-0 group-hover/img:opacity-100 transition-all transform translate-y-4 group-hover/img:translate-y-0 text-gray-900">VER DETALLES</span>
                    </div>
                </div>
                <div class="w-1/2 space-y-6">
                    <p class="text-xs font-bold text-red-600 uppercase tracking-widest">${categorias.find(c => c.id === p.categoria)?.nombre || 'DEPORTE'}</p>
                    <h2 class="text-5xl font-black italic text-gray-900 tracking-tighter uppercase leading-none">${p.nombre}</h2>
                    <p class="text-gray-500 text-lg line-clamp-3">${p.descripcion || 'Diseño exclusivo para alto rendimiento.'}</p>
                    <div class="flex items-center gap-6 pt-4">
                        <span class="text-4xl font-black text-gray-900">${Utils.formatCurrency(p.precio)}</span>
                        ${p.precio_descuento ? `<span class="text-xl text-gray-300 line-through">${Utils.formatCurrency(p.precio)}</span>` : ''}
                    </div>
                    <button onclick="openProductDetail('${p.id}')" class="mt-8 px-12 py-5 bg-gray-900 text-white font-black italic text-xl tracking-tighter rounded-2xl shadow-xl hover:bg-red-600 transition-all flex items-center gap-4 active:scale-95 group">
                        LO QUIERO
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            `;
            sliderTrack.appendChild(slide);
        }

        updateSliderUI();
    };

    const moveSlide = (delta) => {
        const max = filteredProductos.length;
        currentSlide = Math.max(0, Math.min(currentSlide + delta, max));
        updateSliderUI();
    };

    const updateSliderUI = () => {
        if (!sliderTrack) return;
        const offset = currentSlide * 100;
        sliderTrack.style.transform = `translateX(-${offset}%)`;
        
        if (slideCurrent) slideCurrent.textContent = currentSlide + 1;
        if (slideTotal) slideTotal.textContent = filteredProductos.length + 1;
    };

    const renderMobile = async () => {
        if (mobileView) mobileView.classList.remove('hidden');
        if (desktopView) desktopView.classList.add('hidden');
        const grid = document.getElementById('mobile-products-grid');
        if (!grid) return;
        grid.innerHTML = '';

        for (const p of filteredProductos) {
            const imgs = await Storage.getImagenesByProducto(p.id);
            const url = imgs.length > 0 ? URL.createObjectURL(imgs[0].blob) : '';
            const item = document.createElement('div');
            item.className = "bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 flex flex-col animate-fade-in";
            item.onclick = () => openProductDetail(p.id);
            item.innerHTML = `
                <div class="aspect-[4/5] bg-gray-100 relative">
                    ${url ? `<img src="${url}" class="w-full h-full object-cover">` : ''}
                    ${!p.stock ? '<div class="absolute inset-0 bg-white/60 flex items-center justify-center"><span class="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full italic">AGOTADO</span></div>' : ''}
                </div>
                <div class="p-4">
                    <h4 class="text-xs font-bold text-gray-900 line-clamp-1 italic">${p.nombre}</h4>
                    <span class="font-black text-red-600 text-sm">${Utils.formatCurrency(p.precio)}</span>
                </div>
            `;
            grid.appendChild(item);
        }
    };

    window.openProductDetail = async (id) => {
        const prod = productos.find(p => p.id === id);
        if (!prod) return;

        selectedTalla = null;
        selectedColor = null;

        // Reset detail state
        const detailQty = document.getElementById('detail-qty');
        if (detailQty) detailQty.textContent = '1';
        
        // Asignar ID al botón de añadir
        const btnAdd = document.getElementById('btn-add-to-cart');
        if (btnAdd) btnAdd.setAttribute('data-id', id);
        
        document.getElementById('detail-nombre').textContent = prod.nombre;
        document.getElementById('detail-precio').textContent = Utils.formatCurrency(prod.precio_descuento || prod.precio);
        document.getElementById('detail-precio-old').textContent = prod.precio_descuento ? Utils.formatCurrency(prod.precio) : '';
        document.getElementById('detail-desc').textContent = prod.descripcion;
        document.getElementById('detail-cat').textContent = categorias.find(c => c.id === prod.categoria)?.nombre || 'DEPORTE';

        // Tallas
        const tallaCont = document.getElementById('selector-talla');
        const tallaList = document.getElementById('tallas-list');
        if (prod.tallas && prod.tallas.length > 0) {
            tallaCont.classList.remove('hidden');
            tallaList.innerHTML = prod.tallas.map(t => `
                <button onclick="selectTalla(this, '${t}')" class="px-4 py-2 border-2 border-gray-100 rounded-xl font-bold text-sm hover:border-red-600 transition-all">${t}</button>
            `).join('');
        } else {
            tallaCont.classList.add('hidden');
        }

        // Colores
        const colorCont = document.getElementById('selector-color');
        const colorList = document.getElementById('colores-list');
        if (prod.colores && prod.colores.length > 0) {
            colorCont.classList.remove('hidden');
            colorList.innerHTML = prod.colores.map(c => `
                <button onclick="selectColor(this, '${c}')" class="w-10 h-10 rounded-full border-4 border-gray-100 hover:border-red-600 transition-all shadow-inner" style="background-color: ${c}" title="${c}"></button>
            `).join('');
        } else {
            colorCont.classList.add('hidden');
        }

        const imgs = await Storage.getImagenesByProducto(id);
        const container = document.getElementById('detail-images');
        if (container) {
            container.innerHTML = imgs.map(img => `
                <div class="w-full h-full flex-shrink-0 snap-start bg-gray-100">
                    ${img.type === 'video' 
                        ? `<video src="${URL.createObjectURL(img.blob)}" class="w-full h-full object-contain" controls></video>`
                        : `<img src="${URL.createObjectURL(img.blob)}" class="w-full h-full object-contain">`}
                </div>
            `).join('');
        }

        updateDetailTotal();

        const modal = document.getElementById('modal-detalle');
        const box = document.getElementById('detail-modal-box');
        if (modal) modal.classList.remove('hidden');
        setTimeout(() => { if (box) box.classList.remove('translate-y-full'); }, 10);
    };

    window.selectTalla = (btn, talla) => {
        document.querySelectorAll('#tallas-list button').forEach(b => b.classList.remove('border-red-600', 'bg-red-50'));
        btn.classList.add('border-red-600', 'bg-red-50');
        selectedTalla = talla;
    };

    window.selectColor = (btn, color) => {
        document.querySelectorAll('#colores-list button').forEach(b => b.classList.remove('border-red-600'));
        btn.classList.add('border-red-600');
        selectedColor = color;
    };

    init();
});
