// Use the Vercel backend URL for all environments
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    const port = window.location.port;

    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '5000') {
        return 'http://127.0.0.1:5000';
    }
    return '';
};