/**
 * Configuración de StPageFlip para Catálogo CQ
 */

const Flipbook = {
    instance: null,

    init: (pages) => {
        const container = document.getElementById('flipbook');
        if (!container || window.innerWidth < 768) return;

        // Limpiar contenedor
        container.innerHTML = '';
        
        // Agregar páginas
        pages.forEach(html => {
            const page = document.createElement('div');
            page.className = 'page';
            page.innerHTML = html;
            container.appendChild(page);
        });

        // Inicializar StPageFlip
        Flipbook.instance = new St.PageFlip(container, {
            width: 500, // base page width
            height: 700, // base page height
            size: "stretch",
            minWidth: 315,
            maxWidth: 1000,
            minHeight: 420,
            maxHeight: 1350,
            maxShadowOpacity: 0.5,
            showCover: true,
            mobileScrollSupport: false
        });

        Flipbook.instance.loadFromHTML(document.querySelectorAll('.page'));

        // Eventos
        Flipbook.instance.on('flip', (e) => {
            document.getElementById('fb-page-current').textContent = e.data + 1;
        });

        document.getElementById('fb-page-total').textContent = Flipbook.instance.getPageCount();

        document.getElementById('fb-prev').addEventListener('click', () => {
            Flipbook.instance.flipPrev();
        });

        document.getElementById('fb-next').addEventListener('click', () => {
            Flipbook.instance.flipNext();
        });
    }
};

window.Flipbook = Flipbook;
