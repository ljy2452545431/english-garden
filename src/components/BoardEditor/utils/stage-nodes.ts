import Konva from "konva";
import type { BoardNode } from "../../../utils/board";
type ImageEntry = {
  image: HTMLImageElement;
  source: CanvasImageSource | null;
  cancelled: boolean;
  started: boolean;
  done: boolean;
};
/** 预览缩小图片；原图由独立导出保留，不将巨幅解码图堆到移动端图层。 */
export class StageImages {
  private images = new Map<string, ImageEntry>();
  private waiting: (() => void)[] = [];
  private active = 0;
  constructor(private redraw: (url: string) => void) {}
  get(url: string): CanvasImageSource | null {
    const existing = this.images.get(url);
    if (existing) return existing.source;
    const image = new Image(),
      entry: ImageEntry = {
        image,
        source: null,
        cancelled: false,
        started: false,
        done: false,
      };
    this.images.set(url, entry);
    const complete = () => {
      if (entry.done) return;
      entry.done = true;
      this.active -= 1;
      this.drain();
    };
    image.onload = () => {
      if (entry.cancelled) {
        complete();
        return;
      }
      const ratio = Math.min(
        1,
        1024 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = window.document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      canvas
        .getContext("2d")
        ?.drawImage(image, 0, 0, canvas.width, canvas.height);
      entry.source = canvas;
      image.onload = null;
      image.onerror = null;
      image.src = "";
      complete();
      this.redraw(url);
    };
    image.onerror = () => {
      image.onload = null;
      image.onerror = null;
      complete();
    };
    this.waiting.push(() => {
      if (entry.cancelled) return;
      entry.started = true;
      this.active += 1;
      image.src = url;
    });
    this.drain();
    return null;
  }
  private drain() {
    while (this.active < 2 && this.waiting.length) this.waiting.shift()!();
  }
  retain(urls: Set<string>) {
    for (const [url, entry] of this.images)
      if (!urls.has(url)) {
        this.release(entry);
        this.images.delete(url);
      }
    this.drain();
  }
  private release(entry: ImageEntry) {
    entry.cancelled = true;
    if (entry.started && !entry.done) {
      entry.done = true;
      this.active -= 1;
    }
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.src = "";
    if (entry.source instanceof HTMLCanvasElement) {
      entry.source.width = 1;
      entry.source.height = 1;
    }
    entry.source = null;
  }
  destroy() {
    this.waiting = [];
    this.images.forEach((entry) => this.release(entry));
    this.images.clear();
  }
}
export function updateGroup(
  group: Konva.Group,
  node: BoardNode,
  url: string | undefined,
  images: StageImages,
) {
  group.destroyChildren();
  group.setAttrs({
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
    offsetX: node.width / 2,
    offsetY: node.height / 2,
    width: node.width,
    height: node.height,
    rotation: node.rotation,
    scaleX: 1,
    scaleY: 1,
    boardNodeId: node.id,
  });
  const w = node.width,
    h = node.height;
  group.add(
    new Konva.Rect({
      width: w,
      height: h,
      fill: "rgba(0,0,0,0)",
      listening: true,
      perfectDrawEnabled: false,
    }),
  );
  if (node.kind === "stroke")
    group.add(
      new Konva.Line({
        points: node.points.flatMap(([x, y]) => [x * w, y * h]),
        stroke: node.color,
        strokeWidth: node.fontSize / 4,
        lineCap: "round",
        lineJoin: "round",
        listening: false,
        perfectDrawEnabled: false,
      }),
    );
  else if (node.kind === "ellipse")
    group.add(
      new Konva.Ellipse({
        x: w / 2,
        y: h / 2,
        radiusX: w / 2,
        radiusY: h / 2,
        fill: node.fill,
        listening: false,
        perfectDrawEnabled: false,
      }),
    );
  else if (node.kind === "image") {
    const source = url ? images.get(url) : null;
    if (source) {
      const dimensions = source as HTMLCanvasElement,
        ratio = Math.min(w / dimensions.width, h / dimensions.height);
      group.add(
        new Konva.Image({
          image: source,
          x: (w - dimensions.width * ratio) / 2,
          y: (h - dimensions.height * ratio) / 2,
          width: dimensions.width * ratio,
          height: dimensions.height * ratio,
          listening: false,
          perfectDrawEnabled: false,
        }),
      );
    } else
      group.add(
        new Konva.Rect({
          width: w,
          height: h,
          fill: "#E5EBF2",
          listening: false,
        }),
      );
  } else {
    if (node.kind !== "text")
      group.add(
        new Konva.Rect({
          width: w,
          height: h,
          fill: node.fill,
          cornerRadius: node.kind === "note" ? 4 : 8,
          listening: false,
          perfectDrawEnabled: false,
        }),
      );
    if (node.kind === "text" || node.kind === "note") {
      const padding = node.kind === "note" ? 20 : 0;
      group.add(
        new Konva.Text({
          width: w,
          height: h,
          padding,
          text: node.text,
          fontSize: node.fontSize,
          fontFamily: "system-ui, sans-serif",
          fill: node.color,
          lineHeight: 1.35,
          wrap: "none",
          listening: false,
          perfectDrawEnabled: false,
        }),
      );
    }
  }
}
