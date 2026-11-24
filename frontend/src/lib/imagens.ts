/**
 * Reduz fotos (principalmente de celular, que passam fácil de 4 MB) antes do envio:
 * maior lado com até 1600 px, JPEG com qualidade 85%. PNG continua PNG (mantém transparência).
 * Se algo falhar, devolve o arquivo original.
 */
export async function comprimirImagem(arquivo: File, maxLado = 1600, qualidade = 0.85): Promise<File> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif" || arquivo.type === "image/svg+xml") {
    return arquivo;
  }

  try {
    const imagem = await carregar(arquivo);
    const largura = "naturalWidth" in imagem ? imagem.naturalWidth : imagem.width;
    const altura = "naturalHeight" in imagem ? imagem.naturalHeight : imagem.height;
    const escala = Math.min(1, maxLado / Math.max(largura, altura));
    const ehPng = arquivo.type === "image/png";

    // Já é pequena: não mexe
    if (escala === 1 && arquivo.size <= 1.5 * 1024 * 1024) return arquivo;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(altura * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    if (!ehPng) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height);

    const tipo = ehPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));
    if (!blob || blob.size >= arquivo.size) return arquivo;

    const nome = arquivo.name.replace(/\.[^.]+$/, "") + (ehPng ? ".png" : ".jpg");
    return new File([blob], nome, { type: tipo, lastModified: Date.now() });
  } catch {
    return arquivo;
  }
}

async function carregar(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      // respeita a rotação gravada pela câmera (EXIF)
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      // cai para <img>
    }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise<HTMLImageElement>((ok, erro) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = erro;
      img.src = url;
    });
  } finally {
    // a imagem já foi decodificada no onload
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function comprimirVarias(arquivos: File[]): Promise<File[]> {
  return Promise.all(arquivos.map((a) => comprimirImagem(a)));
}
