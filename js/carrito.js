/**
 * Gestión del Carrito de Compras - Catálogo CQ
 */

const Carrito = {
    items: [],

    init: () => {
        const saved = localStorage.getItem('cq_carrito');
        Carrito.items = saved ? JSON.parse(saved) : [];
        Carrito.updateUI();
        Carrito.setupEventListeners();
    },

    setupEventListeners: () => {
        document.getElementById('btn-cart-open').addEventListener('click', Carrito.abrir);
        document.getElementById('btn-cart-close').addEventListener('click', Carrito.cerrar);
        document.getElementById('btn-whatsapp-send').addEventListener('click', () => {
            // Abrir ventana inmediatamente para evitar bloqueo de popups
            const win = window.open('', '_blank');
            Storage.getConfig().then(config => {
                WhatsApp.enviarPedido(Carrito.items, config, win);
            });
        });
    },

    abrir: () => {
        document.getElementById('cart-drawer').classList.remove('translate-x-full');
    },

    cerrar: () => {
        document.getElementById('cart-drawer').classList.add('translate-x-full');
    },

    agregar: (producto, talla, color, cantidad) => {
        // Buscar si ya existe el mismo item (mismo id, talla y color)
        const existing = Carrito.items.find(item => 
            item.id === producto.id && item.talla === talla && item.color === color
        );

        if (existing) {
            existing.cantidad += cantidad;
        } else {
            Carrito.items.push({
                id: producto.id,
                nombre: producto.nombre,
                precio: producto.precio_descuento || producto.precio,
                talla,
                color,
                cantidad,
                imagen: producto.imagen_principal // URL temporal
            });
        }

        Carrito.save();
        Carrito.updateUI();
        Utils.showToast('Producto agregado al pedido');
        
        // Animación bounce en el ícono del carrito
        const btn = document.getElementById('btn-cart-open');
        btn.classList.add('animate-bounce');
        setTimeout(() => btn.classList.remove('animate-bounce'), 1000);
    },

    quitar: (index) => {
        Carrito.items.splice(index, 1);
        Carrito.save();
        Carrito.updateUI();
    },

    cambiarCantidad: (index, delta) => {
        Carrito.items[index].cantidad += delta;
        if (Carrito.items[index].cantidad < 1) {
            Carrito.quitar(index);
        } else {
            Carrito.save();
            Carrito.updateUI();
        }
    },

    save: () => {
        localStorage.setItem('cq_carrito', JSON.stringify(Carrito.items));
    },

    updateUI: () => {
        const count = Carrito.items.reduce((sum, item) => sum + item.cantidad, 0);
        document.getElementById('cart-count').textContent = count;

        const container = document.getElementById('cart-items');
        if (Carrito.items.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    </div>
                    <p class="text-gray-500 font-bold italic">TU CARRITO ESTÁ VACÍO</p>
                    <button onclick="Carrito.closeDrawer()" class="text-red-600 text-xs font-bold mt-2 hover:underline">SEGUIR COMPRANDO</button>
                </div>
            `;
            document.getElementById('cart-total').textContent = Utils.formatCurrency(0);
            return;
        }

        let html = '';
        let total = 0;

        Carrito.items.forEach((item, index) => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            html += `
                <div class="flex gap-4 group">
                    <div class="w-20 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src="${item.imagen}" class="w-full h-full object-cover">
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex justify-between items-start">
                            <h4 class="text-sm font-bold text-gray-900 truncate">${item.nombre}</h4>
                            <button onclick="Carrito.quitar(${index})" class="text-gray-300 hover:text-red-600">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <p class="text-[10px] text-gray-400 font-bold uppercase mt-1">Talla: ${item.talla} - Color: ${item.color.split(' ')[0]}</p>
                        <div class="flex items-center justify-between mt-3">
                            <div class="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-100">
                                <button onclick="Carrito.cambiarCantidad(${index}, -1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900">-</button>
                                <span class="w-6 text-center text-xs font-bold">${item.cantidad}</span>
                                <button onclick="Carrito.cambiarCantidad(${index}, 1)" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900">+</button>
                            </div>
                            <span class="font-black text-gray-900 text-sm">${Utils.formatCurrency(subtotal)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        document.getElementById('cart-total').textContent = Utils.formatCurrency(total);
    }
};

Carrito.init();
window.Carrito = Carrito;
