import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GoogleAnalytics = () => {
    const location = useLocation();

    // The script is now loaded in index.html
    // We only need to track page views on route changes

    useEffect(() => {
        if (window.gtag) {
            window.gtag('config', 'G-T0RE7K9LGR', {
                page_path: location.pathname + location.search,
            });
        }
    }, [location]);

    return null;
};

export default GoogleAnalytics;
