import React, { createContext, useContext, useState, useEffect } from 'react';
import { isMobile as initialIsMobile } from 'react-device-detect';

const LayoutContext = createContext();

export function LayoutProvider({ children }) {
    // Deteksi awal dari User Agent, atau fallback jika lebar layar desktop di-resize < 768px
    const [isMobile, setIsMobile] = useState(initialIsMobile || window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <LayoutContext.Provider value={{ isMobile }}>
            {children}
        </LayoutContext.Provider>
    );
}

export const useLayout = () => useContext(LayoutContext);