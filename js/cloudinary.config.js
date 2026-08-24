/**
 * Abhis Farm Fresh - Generated Cloudinary Upload Service
 */

const CLOUDINARY_CONFIG = {
  "cloudName": "abhisfarmfresh",
  "uploadPreset": "jpnbyoak",
  "folder": "abhis/farmfresh"
};

window.CloudinaryService = {
  async uploadImage(file) {
    if (!file) return null;
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
      if (data.secure_url) {
        console.log("☁️ Image uploaded to Cloudinary:", data.secure_url);
        return data.secure_url;
      } else {
        console.warn("Cloudinary Response:", data);
        return null;
      }
    } catch (err) {
      console.error("Cloudinary Upload Error:", err);
      return null;
    }
  }
};
