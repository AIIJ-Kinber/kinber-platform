// frontend/src/lib/google-picker-loader.ts

// Simple global typings so TypeScript doesn't complain
declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

// We keep one shared Promise so loader runs only once
let pickerReadyPromise: Promise<any> | null = null;

export function loadGooglePicker(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available (SSR)."));
  }

  // If already loading/loaded, reuse the same promise
  if (pickerReadyPromise) return pickerReadyPromise;

  pickerReadyPromise = new Promise((resolve, reject) => {
    const onPickerReady = () => {
      const picker = window.google?.picker;
      if (!picker) {
        console.error("google.picker is still undefined after gapi.load.");
        reject(new Error("google.picker is undefined after gapi.load."));
        return;
      }
      console.log("✅ Google Picker is ready:", picker);
      resolve(picker);
    };

    const onGapiLoaded = () => {
      if (!window.gapi) {
        reject(new Error("gapi loaded but window.gapi is missing."));
        return;
      }

      console.log("✅ gapi script loaded. Calling gapi.load('client:picker')");

      window.gapi.load("client:picker", () => {
        try {
          // At this point google.picker *should* be attached
          onPickerReady();
        } catch (err) {
          console.error("Error inside gapi.load('client:picker'):", err);
          reject(err);
        }
      });
    };

    const loadGapiScript = () => {
      // If gapi already exists, just continue
      if (window.gapi) {
        console.log("ℹ️ gapi already present. Skipping script injection.");
        onGapiLoaded();
        return;
      }

      // Check if a script tag already exists
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://apis.google.com/js/api.js"]'
      );

      if (existingScript) {
        console.log("ℹ️ Reusing existing gapi script element.");
        existingScript.addEventListener("load", onGapiLoaded, { once: true });
        existingScript.addEventListener("error", () => {
          reject(new Error("Existing gapi script failed to load."));
        });
        return;
      }

      // Otherwise inject a fresh script
      console.log("📥 Injecting gapi script…");

      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.async = true;
      script.defer = true;

      script.onload = onGapiLoaded;
      script.onerror = () => {
        console.error("❌ Failed to load gapi script.");
        reject(new Error("Failed to load gapi script."));
      };

      document.head.appendChild(script);
    };

    loadGapiScript();
  });

  return pickerReadyPromise;
}
