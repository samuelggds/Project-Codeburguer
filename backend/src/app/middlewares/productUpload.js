import multer from "multer";
import { extname } from "path";

const extensions = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

const upload = multer({
  storage: multer.memoryStorage(),
  // Busboy emits partsLimit when it reaches the boundary after the last part.
  // Allow that boundary in addition to five fields and one image.
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, parts: 7 },
  fileFilter(request, file, callback) {
    if (!extensions[file.mimetype]?.includes(extname(file.originalname).toLowerCase())) {
      return callback(new Error("Envie uma imagem PNG, JPEG ou WebP"));
    }
    return callback(null, true);
  },
}).single("file");

export default function productUpload(request, response, next) {
  upload(request, response, (error) => {
    if (!error) return next();
    return response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
      error: error.code === "LIMIT_FILE_SIZE"
        ? "A imagem deve ter no máximo 5 MB"
        : error instanceof multer.MulterError ? "Upload inválido: envie somente uma imagem no campo file" : error.message,
    });
  });
}
