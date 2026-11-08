import { mkdir, writeFile, unlink } from "fs/promises";
import { resolve } from "path";
import { randomUUID } from "crypto";

const uploadDirectory = resolve(__dirname, "..", "..", "..", "uploads");
const imageExtensions = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

export function isSupportedImage(file) {
  const buffer = file?.buffer;
  if (!Buffer.isBuffer(buffer)) return false;
  if (file.mimetype === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === "image/jpeg") return buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (file.mimetype === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function saveProductImage(file) {
  const filename = randomUUID() + imageExtensions[file.mimetype];
  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(resolve(uploadDirectory, filename), file.buffer, { flag: "wx" });
  return filename;
}

export async function discardNewProductImage(filename) {
  if (!filename) return;
  try {
    await unlink(resolve(uploadDirectory, filename));
  } catch (error) {
    if (error.code !== "ENOENT") console.error("Erro ao remover novo upload não salvo", error);
  }
}
