// Utility to suppress ResizeObserver errors from Monaco Editor
export const suppressResizeObserverErrors = () => {
  // Store original console.error
  const originalError = console.error;
  
  console.error = (...args) => {
    // Suppress ResizeObserver errors
    if (args[0]?.includes?.('ResizeObserver loop completed with undelivered notifications')) {
      return;
    }
    // Call original console.error for other errors
    originalError.apply(console, args);
  };

  // Also handle window error events
  const handleError = (event) => {
    if (event.message?.includes('ResizeObserver loop completed with undelivered notifications')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return false;
    }
  };

  window.addEventListener('error', handleError);
  
  return () => {
    console.error = originalError;
    window.removeEventListener('error', handleError);
  };
};