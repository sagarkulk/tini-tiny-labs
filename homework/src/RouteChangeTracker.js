import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from './analytics';

export default function RouteChangeTracker({ base = '' }) {
    const location = useLocation();

    useEffect(() => {
        const path =
            base.replace(/\/$/, '') +
            location.pathname +
            location.search +
            location.hash;

        trackPageView(path); // <-- sends event to GA4
    }, [location, base]);

    return null;
}
