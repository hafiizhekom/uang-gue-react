import { useState, useCallback } from 'react';

export const useToast = () => {
    const [toast, setToast] = useState({ 
        show: false, 
        message: '', 
        type: 'success', // success, error, warning, info
        errors: null 
    });

    const showToast = useCallback((message, type = 'success', errors = null) => {
        setToast({ show: true, message, type, errors });
        
        // Durasi 4 detik biar user sempat baca kalau error-nya panjang
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }));
        }, 4000);
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);

    return { toast, showToast, hideToast };
};