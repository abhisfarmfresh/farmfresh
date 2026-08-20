/**
 * Abhis Farm Fresh - Cloudinary Upload Configuration Template
 */

const CLOUDINARY_CONFIG = {
  cloudName: "YOUR_CLOUDINARY_CLOUD_NAME",
  uploadPreset: "jpnbyoak",
  folder: "abhis/farmfresh"
};

// Cloudinary Unsigned Upload Helper
window.CloudinaryService = {
  async uploadImage(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    formData.append("folder", CLOUDINARY_CONFIG.folder);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      console.log("Cloudinary Upload Result:", data);
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      return null;
    }
  }
};
