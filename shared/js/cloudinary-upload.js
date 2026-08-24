/**
 * Abhis Farm Fresh — Cloudinary & Resilient Media Upload Service
 * Unsigned Cloudinary uploads with automatic client-side compression fallback
 */

(function(window) {
  'use strict';

  const DEFAULT_CONFIG = {
    cloudName: 'abhisfarmfresh',
    uploadPreset: 'jpnbyoak',
    folder: 'abhis/farmfresh'
  };

  const CloudinaryService = {
    /**
     * Get active Cloudinary settings (from Admin saved settings or default)
     */
    getConfig() {
      try {
        const stored = localStorage.getItem('aff_cloudinary_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.cloudName) return { ...DEFAULT_CONFIG, ...parsed };
        }
      } catch (e) {}

      if (window.CLOUDINARY_CONFIG && window.CLOUDINARY_CONFIG.cloudName) {
        return { ...DEFAULT_CONFIG, ...window.CLOUDINARY_CONFIG };
      }

      return DEFAULT_CONFIG;
    },

    /**
     * Convert/Compress file to lightweight Base64 Data URL (Fast Client-side fallback)
     */
    compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.82) {
      return new Promise((resolve, reject) => {
        if (!file || !(file instanceof Blob)) {
          return resolve(null);
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Export as WebP or JPEG
            let dataUrl = canvas.toDataURL('image/webp', quality);
            if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            resolve(dataUrl);
          };
          img.onerror = () => resolve(e.target.result);
          img.src = e.target.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    },

    /**
     * Upload an image file to Cloudinary with automatic resilient fallback
     */
    async uploadImage(file) {
      if (!file) return null;

      const config = this.getConfig();

      // 1. Prepare Cloudinary Upload Form
      const formData = new FormData();
      formData.append('file', file);
      if (config.uploadPreset) formData.append('upload_preset', config.uploadPreset);
      if (config.folder) formData.append('folder', config.folder);

      try {
        const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`;
        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (data && data.secure_url) {
          console.log('☁️ Successfully uploaded image to Cloudinary CDN:', data.secure_url);
          return data.secure_url;
        } else {
          console.warn('Cloudinary upload returned non-URL response, activating optimized fallback:', data);
        }
      } catch (cloudErr) {
        console.warn('Cloudinary direct network upload warning:', cloudErr.message);
      }

      // 2. High-Performance Client-Side Compressed Image Fallback
      console.log('📸 Generating optimized local data URL image...');
      try {
        const compressedDataUrl = await this.compressImage(file);
        return compressedDataUrl;
      } catch (fallbackErr) {
        console.error('Fallback image compression error:', fallbackErr);
        return null;
      }
    }
  };

  window.CloudinaryService = CloudinaryService;
  window.CLOUDINARY_CONFIG = DEFAULT_CONFIG;
})(typeof window !== 'undefined' ? window : this);
