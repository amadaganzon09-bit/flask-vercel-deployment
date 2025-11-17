// Determine the base URL based on the current environment
const getBaseUrl = () => {
    // If we're in a browser environment
    if (typeof window !== 'undefined') {
        // For development, use localhost:5000
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000';
        }
        // For production, use the current domain
        return window.location.origin;
    }
    // Default for server-side or other environments
    return 'http://localhost:5000';
};

const BASE_URL = getBaseUrl();

// Export the configuration
const config = {
    BASE_URL: BASE_URL
};

export default config;