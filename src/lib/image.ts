// Compression des photos DANS LE NAVIGATEUR avant envoi : redimensionne à
// 1600 px maximum et encode en JPEG. Réduit fortement le poids envoyé sur
// une connexion mobile lente, et supprime les métadonnées (position GPS…).
const MAX_SIDE = 1600;
const QUALITY = 0.72;

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Compression impossible sur cet appareil.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
  if (!blob) throw new Error("Compression impossible sur cet appareil.");
  return blob;
}
