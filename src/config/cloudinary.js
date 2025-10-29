// config/cloudinary.js
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// --- Cloudinary credentials ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- Dynamic Cloudinary storage ---
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folderMap = {
      nin: "nin-documents",
      photos: "talent-photos",
      portfolio: "talent-portfolio",
      adMedia: "ad-media",
    };

    const folder = folderMap[file.fieldname] || "uploads";

    const isVideo = file.mimetype.startsWith("video/");
    const isImage = file.mimetype.startsWith("image/");
    const isPDF = file.mimetype === "application/pdf";

    const resourceType = isVideo ? "video" : "auto";
    const format = isVideo ? "mp4" : isPDF ? "pdf" : "jpg";

    const params = {
      folder,
      format,
      resource_type: resourceType,
      allowed_formats: ["jpg", "jpeg", "png", "pdf", "mp4", "mov", "avi"],
    };

    if (isImage) {
      params.transformation = [
        { width: 1200, height: 1200, crop: "limit", quality: "auto" },
      ];
    }

    return params;
  },
});

// --- Multer setup ---
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];

    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type. Only images, PDFs, and videos allowed."));
  },
});

module.exports = { cloudinary, upload };
