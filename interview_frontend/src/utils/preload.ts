import { initializeModel } from './modelLoader';

// Define the requestIdleCallback types since they're not included in lib.dom.d.ts
interface RequestIdleCallbackHandle {
  readonly timeout: number;
}

interface RequestIdleCallbackOptions {
  timeout: number;
}

interface RequestIdleCallbackDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: RequestIdleCallbackDeadline) => void,
      opts?: RequestIdleCallbackOptions
    ) => RequestIdleCallbackHandle;
    cancelIdleCallback: (handle: RequestIdleCallbackHandle) => void;
  }
}

// Start loading the model as soon as possible
export const preloadModel = () => {
  const schedulePreload = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout: 3000 });
    } else {
      setTimeout(callback, 1);
    }
  };

  schedulePreload(() => {
    initializeModel().catch(error => {
      console.warn('Model preload failed:', error);
    });
  });
};

// Check if the browser supports required features
export const checkBrowserSupport = (): { supported: boolean; reason?: string } => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { 
      supported: false, 
      reason: 'Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.' 
    };
  }

  if (!window.WebGLRenderingContext) {
    return { 
      supported: false, 
      reason: 'Your browser does not support WebGL, which is required for face detection.' 
    };
  }

  return { supported: true };
};