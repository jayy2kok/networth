import { useState, useEffect } from 'react';

export default function useIsMobile(breakpoint = 767) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    
    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    // Modern browsers support addEventListener on MediaQueryList
    mediaQuery.addEventListener('change', handleChange);
    
    // Set initial value in case it changed between initialization and mount
    setIsMobile(mediaQuery.matches);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [breakpoint]);

  return isMobile;
}
