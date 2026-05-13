/**
 * Autenticación simple para Catálogo CQ
 */

const Auth = {
    USUARIO_CORRECTO: 'admin',
    PASSWORD_CORRECTO: 'cq2026',

    /**
     * Verifica las credenciales e inicia sesión
     */
    login: (usuario, password) => {
        if (usuario === Auth.USUARIO_CORRECTO && password === Auth.PASSWORD_CORRECTO) {
            sessionStorage.setItem('cq_sesion', 'activa');
            return true;
        }
        return false;
    },

    /**
     * Comprueba si el usuario está autenticado
     */
    isLoggedIn: () => {
        return sessionStorage.getItem('cq_sesion') === 'activa';
    },

    /**
     * Cierra la sesión
     */
    logout: () => {
        sessionStorage.removeItem('cq_sesion');
        window.location.href = 'login.html';
    },

    /**
     * Redirige al login si no hay sesión
     */
    checkAuth: () => {
        if (!Auth.isLoggedIn() && !window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }
};

window.Auth = Auth;
