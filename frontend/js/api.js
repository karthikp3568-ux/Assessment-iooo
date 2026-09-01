// Dynamic API base URL resolution:
// Priority: window.ENV > localStorage > same-origin /api/v1 > localhost fallback
//
// For deployment:
// - On Render: set localStorage.setItem('API_BASE_URL', 'https://your-backend.onrender.com/api/v1')
// - Or inject via window.ENV in a config script
// - Or use Netlify _redirects to proxy /api/* to your backend
const API_BASE_URL = (() => {
    // 1. Explicit environment config
    if (window.ENV?.API_BASE_URL) return window.ENV.API_BASE_URL;
    
    // 2. Saved in localStorage (set once from browser console)
    const stored = localStorage.getItem('API_BASE_URL');
    if (stored) return stored;
    
    // 3. If running on localhost, use localhost backend
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080/api/v1';
    }
    
    // 4. Production: assume backend is on same origin (works with Netlify _redirects proxy)
    //    OR the user can set API_BASE_URL in localStorage from the browser console
    return window.location.origin + '/api/v1';
})();


class ApiService {
    static async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // 3.5s network timeout to prevent hanging on sleeping/offline backends
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const config = {
            ...options,
            headers,
            signal: controller.signal
        };

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            clearTimeout(timeoutId);
            
            // Handle non-JSON responses gracefully
            let data;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred');
            }

            return data;
        } catch (error) {
            clearTimeout(timeoutId);
            console.error('API Error:', error);
            throw error;
        }
    }

    static async post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    static async get(endpoint) {
        return this.request(endpoint, {
            method: 'GET'
        });
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }
}
