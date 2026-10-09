import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareImage, exportBoardPng } from "./board-images";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function rendering(
  options: {
    width?: number;
    height?: number;
    blob?: Blob | null;
    decodeFails?: boolean;
    readerFails?: boolean;
  } = {},
) {
  const close = vi.fn(),
    drawImage = vi.fn(),
    click = vi.fn();
  const bitmap = {
    width: options.width ?? 4000,
    height: options.height ?? 2000,
    close,
  };
  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ drawImage }),
    toBlob: (done: (value: Blob | null) => void) =>
      done(
        options.blob === undefined
          ? new Blob(["png"], { type: "image/png" })
          : options.blob,
      ),
  };
  const anchor = { href: "", download: "", click };
  vi.stubGlobal("document", {
    createElement: (tag: string) => (tag === "canvas" ? canvas : anchor),
  });
  const createObjectURL = vi
      .fn()
      .mockReturnValueOnce("blob:svg")
      .mockReturnValueOnce("blob:png"),
    revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode() {
        return options.decodeFails
          ? Promise.reject(new Error("decode"))
          : Promise.resolve();
      }
    },
  );
  vi.stubGlobal(
    "XMLSerializer",
    class {
      serializeToString() {
        return "<svg />";
      }
    },
  );
  vi.stubGlobal(
    "FileReader",
    class {
      result = "data:image/png;base64,AA==";
      onload?: () => void;
      onerror?: () => void;
      readAsDataURL() {
        if (options.readerFails) this.onerror?.();
        else this.onload?.();
      }
    },
  );
  const embedded = {
    getAttribute: () => "blob:private",
    setAttribute: vi.fn(),
  };
  const ignored = { getAttribute: () => null, setAttribute: vi.fn() };
  const clone = {
    setAttribute: vi.fn(),
    querySelectorAll: () => [embedded, ignored],
  };
  const svg = {
    cloneNode: () => clone,
    viewBox: { baseVal: { width: 1600, height: 1000 } },
  } as unknown as SVGSVGElement;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(new Blob(["image"]))),
  );
  return {
    bitmap,
    canvas,
    anchor,
    close,
    click,
    drawImage,
    createObjectURL,
    revokeObjectURL,
    svg,
    embedded,
  };
}
const file = (type = "image/png", size = 20) => ({ type, size }) as File;
describe("图片处理与导出", () => {
  it("拒绝非位图及过大文件，不尝试解码", async () => {
    rendering();
    await expect(prepareImage(file("image/svg+xml"))).rejects.toThrow("3 MB");
    await expect(prepareImage(file("image/png", 3145729))).rejects.toThrow(
      "3 MB",
    );
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
  it("缩小长边到 2000，保持比例并释放位图", async () => {
    const f = rendering();
    await prepareImage(file());
    expect([f.canvas.width, f.canvas.height]).toEqual([2000, 1000]);
    expect(f.drawImage).toHaveBeenCalledWith(f.bitmap, 0, 0, 2000, 1000);
    expect(f.close).toHaveBeenCalledOnce();
  });
  it("小图不放大；解码失败提供错误", async () => {
    const f = rendering({ width: 20, height: 10 });
    await prepareImage(file());
    expect([f.canvas.width, f.canvas.height]).toEqual([20, 10]);
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("bad")),
    );
    await expect(prepareImage(file())).rejects.toThrow("无法读取");
  });
  it("拒绝超大像素与失败或超限的重新编码，均释放位图", async () => {
    for (const options of [
      { width: 8001 },
      { height: 8001 },
      { blob: null },
      { blob: new Blob([new Uint8Array(3145729)]) },
    ]) {
      const f = rendering(options);
      await expect(prepareImage(file())).rejects.toThrow();
      expect(f.close).toHaveBeenCalledOnce();
    }
  });
  it("导出将私密 Blob 内嵌并清理两种临时 URL", async () => {
    vi.useFakeTimers();
    const f = rendering();
    await exportBoardPng(f.svg, "周末/书桌");
    expect(f.embedded.setAttribute).toHaveBeenCalledWith(
      "href",
      "data:image/png;base64,AA==",
    );
    expect(f.anchor.download).toBe("周末_书桌.png");
    expect(f.click).toHaveBeenCalledOnce();
    expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
    await vi.advanceTimersByTimeAsync(1000);
    expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:png");
  });
  it("导出解码或生成失败清理 SVG URL；读取失败不创建 URL", async () => {
    for (const options of [{ decodeFails: true }, { blob: null }]) {
      const f = rendering(options);
      await expect(exportBoardPng(f.svg, "")).rejects.toThrow();
      expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
      expect(f.click).not.toHaveBeenCalled();
    }
    const f = rendering({ readerFails: true });
    await expect(exportBoardPng(f.svg, "")).rejects.toThrow("导出图片失败");
    expect(f.createObjectURL).not.toHaveBeenCalled();
  });
  it("空名称使用默认文件名", async () => {
    vi.useFakeTimers();
    const f = rendering();
    await exportBoardPng(f.svg, "");
    expect(f.anchor.download).toBe("我的画布.png");
    await vi.advanceTimersByTimeAsync(1000);
  });
  it("导出中身份变化取消下载且释放临时SVG URL", async () => {
    const f = rendering();
    let active = true;
    vi.stubGlobal(
      "Image",
      class {
        src = "";
        async decode() {
          active = false;
        }
      },
    );
    await expect(
      exportBoardPng(f.svg, "私密作品", () => active),
    ).rejects.toThrow("导出已取消");
    expect(f.click).not.toHaveBeenCalled();
    expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
    const early = rendering();
    await expect(
      exportBoardPng(early.svg, "作品", () => false),
    ).rejects.toThrow("导出已取消");
    expect(early.createObjectURL).not.toHaveBeenCalled();
    expect(early.click).not.toHaveBeenCalled();
  });
  it("最终下载前取消也清理已创建PNG URL", async () => {
    const f = rendering();
    let active = true;
    f.createObjectURL
      .mockReset()
      .mockReturnValueOnce("blob:svg")
      .mockImplementationOnce(() => {
        active = false;
        return "blob:png";
      });
    await expect(
      exportBoardPng(f.svg, "私密作品", () => active),
    ).rejects.toThrow("导出已取消");
    expect(f.click).not.toHaveBeenCalled();
    expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:png");
    expect(f.revokeObjectURL).toHaveBeenCalledWith("blob:svg");
  });
});
