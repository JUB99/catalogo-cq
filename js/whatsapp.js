/**
 * Generador de Mensajes WhatsApp - Catálogo CQ
 */

const WhatsApp = {
    /**
     * Genera el enlace de WhatsApp con el pedido formateado
     * @param {Array} items - Los items del carrito
     * @param {Object} config - La configuración de la tienda
     */
    enviarPedido: (items, config) => {
        if (items.length === 0) return;

        const { whatsapp, nombreTienda } = config;
        
        if (!whatsapp || whatsapp.trim() === "") {
            alert("⚠️ Por favor, configura tu número de WhatsApp en la sección 'Configuración' del Panel Admin.");
            return;
        }

        // Limpiar el número: dejar solo dígitos
        const cleanPhone = whatsapp.replace(/\D/g, '');

        let total = 0;
        let listaProductos = '';

        items.forEach((item, index) => {
            const subtotal = item.precio * item.cantidad;
            total += subtotal;
            
            listaProductos += `${index + 1}. *${item.nombre}*\n`;
            listaProductos += `   • Talla: ${item.talla}\n`;
            listaProductos += `   • Color: ${item.color}\n`;
            listaProductos += `   • Cantidad: ${item.cantidad}\n`;
            listaProductos += `   • Precio: ${Utils.formatCurrency(item.precio)} c/u\n`;
            listaProductos += `   • Subtotal: ${Utils.formatCurrency(subtotal)}\n\n`;
        });

        const mensaje = `¡Hola! Quiero hacer un pedido en *${nombreTienda || 'Catálogo CQ'}* 🏃‍♀️\n\n` +
                        `📦 *MI PEDIDO:*\n\n` +
                        `${listaProductos}` +
                        `💰 *TOTAL: ${Utils.formatCurrency(total)}*\n\n` +
                        `Quedo atenta/o a la confirmación. ¡Gracias!`;

        const encodedMensaje = encodeURIComponent(mensaje);
        const url = `https://wa.me/${cleanPhone}?text=${encodedMensaje}`;
        
        window.open(url, '_blank');
    }
};

window.WhatsApp = WhatsApp;
