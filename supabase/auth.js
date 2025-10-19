export function getCurrentUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.error('auth:getCurrentUser parse error', e);
        return null;
    }
}

export function getIdTrabajador() {
    const id = localStorage.getItem('id_trabajador');
    return id ? String(id) : null;
}

export function isAdmin() {
    const u = getCurrentUser();
    return u && u.role === 'admin';
}

export function logoutAndRedirect(loginPath = '/index.html') {
    try {
        localStorage.removeItem('user');
        localStorage.removeItem('id_trabajador');
    } catch (e) {
        // ignore
    }
    window.location.href = loginPath;
}