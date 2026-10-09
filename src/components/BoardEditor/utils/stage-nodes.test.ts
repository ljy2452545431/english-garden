import { afterEach, expect, it, vi } from "vitest";
import { StageImages } from "./stage-nodes";
afterEach(() => vi.unstubAllGlobals());
it("两路解码、限制预览1024px、缓存复用且移除时释放", () => {
  class FakeCanvas {
    width = 0;
    height = 0;
    getContext() {
      return { drawImage() {} };
    }
  }
  const created: FakeImage[] = [];
  class FakeImage {
    src = "";
    naturalWidth = 2000;
    naturalHeight = 1000;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor() {
      created.push(this);
    }
  }
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("HTMLCanvasElement", FakeCanvas);
  vi.stubGlobal("window", {
    document: { createElement: () => new FakeCanvas() },
  });
  const ready = vi.fn(),
    cache = new StageImages(ready);
  cache.get("blob:a");
  cache.get("blob:b");
  cache.get("blob:c");
  expect(created.map((image) => image.src)).toEqual(["blob:a", "blob:b", ""]);
  created[0].onload!();
  expect(created[2].src).toBe("blob:c");
  const source = cache.get("blob:a") as unknown as FakeCanvas;
  expect(source.width).toBe(1024);
  expect(source.height).toBe(512);
  expect(created).toHaveLength(3);
  expect(ready).toHaveBeenCalledWith("blob:a");
  cache.retain(new Set(["blob:b", "blob:c"]));
  expect(source.width).toBe(1);
  cache.destroy();
  expect(
    created.every((image) => image.src === "" && image.onload === null),
  ).toBe(true);
});
