// analytics.js
export function trackPageView(path, title) {
    if (!window.gtag) return;
    window.gtag('event', 'page_view', {
        page_title: title || document.title,
        page_path: path,
        page_location: window.location.origin + path,
        debug_mode: process.env.NODE_ENV !== 'production'
    });
}
