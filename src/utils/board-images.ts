export async function prepareImage(file: File): Promise<Blob> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 3 * 1024 * 1024
  )
    throw new Error("请选择 3 MB 以内的 PNG、JPEG 或 WebP 图片");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("这张图片无法读取，请换一张");
  });
  try {
    if (bitmap.width > 8000 || bitmap.height > 8000)
      throw new Error("图片尺寸过大，请先裁剪到 8000 像素以内");
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, file.type, 0.86),
    );
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error("图片处理后仍超过 3 MB，请缩小图片");
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function exportBoardPng(svg: SVGSVGElement, title: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  for (const image of Array.from(clone.querySelectorAll("image"))) {
    const href = image.getAttribute("href");
    if (!href?.startsWith("blob:")) continue;
    const blob = await (await fetch(href)).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("导出图片失败"));
      reader.readAsDataURL(blob);
    });
    image.setAttribute("href", data);
  }
  const view = svg.viewBox.baseVal;
  clone.setAttribute("width", String(view.width));
  clone.setAttribute("height", String(view.height));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml",
    }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = view.width;
    canvas.height = view.height;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("导出失败");
    const output = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = output;
    anchor.download = `${title.replace(/[\\/:*?"<>|]/g, "_") || "我的画布"}.png`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(output), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}
