import Konva from "konva";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { BoardDocument, BoardNode } from "../../../utils/board";
import { boardEditorZh } from "../../../i18n/board-editor";
import {
  fitView,
  limit,
  mergeGeometry,
  normalRotation,
  sameGeometry,
  strokeNode,
  zoomView,
  type Point,
  type View,
} from "../utils/stage-geometry";
import { StageImages, updateGroup } from "../utils/stage-nodes";

export type BoardStageHandle = { fit(): void; zoom(factor: number): void };
export type BoardStageProps = {
  document: BoardDocument;
  assetUrls: Record<string, string>;
  selectedId: string | null;
  tool: "select" | "pen";
  ink: string;
  penSize: number;
  onSelect(id: string | null): void;
  onCommit(document: BoardDocument): void;
};
type Movement = {
  mode: "pan" | "move" | "pen" | "transform";
  start: Point;
  view: View;
  node?: BoardNode;
  points?: Point[];
  group?: Konva.Group;
};
type Pinch = { distance: number; center: Point; view: View };
type Engine = {
  sync(): void;
  fit(): void;
  zoom(factor: number): void;
  destroy(): void;
};

/** React 只负责工具状态；手势、选中框和帧内绘制留在命令式画布。 */
export const BoardStage = forwardRef<BoardStageHandle, BoardStageProps>(
  function BoardStage(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      latest = useRef(props),
      engine = useRef<Engine | null>(null);
    latest.current = props;
    useImperativeHandle(
      ref,
      () => ({
        fit: () => engine.current?.fit(),
        zoom: (factor) => engine.current?.zoom(factor),
      }),
      [],
    );
    useEffect(() => {
      if (!host.current) return;
      engine.current = createEngine(host.current, () => latest.current);
      return () => {
        engine.current?.destroy();
        engine.current = null;
      };
    }, []);
    useEffect(() => {
      engine.current?.sync();
    }, [
      props.document,
      props.assetUrls,
      props.selectedId,
      props.tool,
      props.ink,
      props.penSize,
    ]);
    return (
      <div
        ref={host}
        className="board-stage"
        role="application"
        aria-label={boardEditorZh.stageLabel}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          touchAction: "none",
          overflow: "hidden",
        }}
      />
    );
  },
);

function createEngine(
  host: HTMLDivElement,
  current: () => BoardStageProps,
): Engine {
  Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  Konva.autoDrawEnabled = false;
  const stage = new Konva.Stage({
    container: host,
    width: Math.max(host.clientWidth, 1),
    height: Math.max(host.clientHeight, 1),
  });
  const scene = new Konva.Layer(),
    interaction = new Konva.Layer();
  const background = new Konva.Rect({
    listening: false,
    perfectDrawEnabled: false,
  });
  const transformer = new Konva.Transformer({
    anchorSize: 24,
    anchorCornerRadius: 12,
    anchorStyleFunc: (anchor) => anchor.hitStrokeWidth(20),
    borderStroke: "#3676E8",
    anchorStroke: "#3676E8",
    anchorFill: "#FFFFFF",
    rotateAnchorOffset: 36,
    flipEnabled: false,
    padding: 0,
    enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
    boundBoxFunc: (oldBox, newBox) =>
      Math.abs(newBox.width) < 12 || Math.abs(newBox.height) < 12
        ? oldBox
        : newBox,
  });
  const draft: Konva.Line = new Konva.Line({
    listening: false,
    lineCap: "round",
    lineJoin: "round",
    perfectDrawEnabled: false,
  });
  stage.add(scene, interaction);
  scene.add(background);
  interaction.add(draft, transformer);
  const groups = new Map<string, Konva.Group>(),
    previous = new Map<string, BoardNode>(),
    previousUrls = new Map<string, string | undefined>();
  const pointers = new Map<number, Point>();
  let alive = true,
    frame = 0,
    sceneDirty = false,
    draftDirty = false,
    movement: Movement | null = null,
    pinch: Pinch | null = null;
  let cancelTransform = false,
    initialTransform: BoardNode | null = null,
    docSize = "";
  const images = new StageImages((url) => {
    if (!alive) return;
    let dirty = false;
    current().document.nodes.forEach((node) => {
      const group = groups.get(node.id);
      if (
        group &&
        node.kind === "image" &&
        current().assetUrls[node.assetId!] === url
      ) {
        updateGroup(group, node, url, images);
        dirty ||= group.getLayer() === scene;
      }
    });
    requestDraw(dirty);
  });
  const view = (): View => ({
    x: stage.x(),
    y: stage.y(),
    scale: stage.scaleX(),
  });
  function requestDraw(full = false) {
    sceneDirty ||= full;
    if (frame || !alive) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!alive) return;
      if (draftDirty && movement?.mode === "pen")
        draft.points(movement.points!.flatMap((point) => [point.x, point.y]));
      draftDirty = false;
      if (sceneDirty) {
        scene.draw();
        sceneDirty = false;
      }
      interaction.draw();
    });
  }
  function setView(next: View) {
    stage.position(next);
    stage.scale({ x: next.scale, y: next.scale });
    requestDraw(true);
  }
  function fit() {
    const doc = current().document;
    setView(fitView(stage.width(), stage.height(), doc.width, doc.height));
  }
  function sync() {
    if (!alive) return;
    const props = current(),
      doc = props.document,
      ids = new Set(doc.nodes.map((node) => node.id));
    const activeUrls = new Set(
      doc.nodes
        .filter((node) => node.assetId && props.assetUrls[node.assetId])
        .map((node) => props.assetUrls[node.assetId!]),
    );
    images.retain(activeUrls);
    let dirty = false,
      sceneIndex = 1;
    for (const [id, group] of groups)
      if (!ids.has(id)) {
        dirty ||= group.getLayer() === scene;
        group.destroy();
        groups.delete(id);
        previous.delete(id);
        previousUrls.delete(id);
      }
    doc.nodes.forEach((node) => {
      let group = groups.get(node.id);
      if (!group) {
        group = new Konva.Group();
        groups.set(node.id, group);
        scene.add(group);
        dirty = true;
      }
      const url = node.assetId ? props.assetUrls[node.assetId] : undefined;
      if (previous.get(node.id) !== node || previousUrls.get(node.id) !== url) {
        dirty ||= group.getLayer() === scene;
        updateGroup(group, node, url, images);
        previous.set(node.id, node);
        previousUrls.set(node.id, url);
      }
      const wanted =
        movement?.group === group || initialTransform?.id === node.id
          ? interaction
          : scene;
      if (group.getLayer() !== wanted) {
        group.moveTo(wanted);
        dirty = true;
      }
      if (group.getLayer() === scene) {
        if (group.zIndex() !== sceneIndex) dirty = true;
        group.zIndex(sceneIndex++);
      }
    });
    dirty ||=
      background.width() !== doc.width ||
      background.height() !== doc.height ||
      background.fill() !== doc.background;
    background.setAttrs({
      width: doc.width,
      height: doc.height,
      fill: doc.background,
    });
    transformer.nodes(
      props.selectedId && groups.has(props.selectedId)
        ? [groups.get(props.selectedId)!]
        : [],
    );
    transformer.visible(props.tool === "select");
    transformer.moveToTop();
    host.style.cursor = props.tool === "pen" ? "crosshair" : "default";
    const size = `${doc.width}:${doc.height}`;
    if (size !== docSize) {
      docSize = size;
      fit();
    }
    requestDraw(dirty);
  }
  function screen(event: PointerEvent): Point {
    const rect = host.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  function world(point: Point): Point {
    const doc = current().document;
    return {
      x: limit((point.x - stage.x()) / stage.scaleX(), 0, doc.width),
      y: limit((point.y - stage.y()) / stage.scaleY(), 0, doc.height),
    };
  }
  function targetGroup(point: Point): Konva.Group | null {
    let hit: Konva.Node | null = stage.getIntersection(point);
    while (hit && hit !== stage) {
      if (hit.getAttr("boardNodeId")) return hit as Konva.Group;
      hit = hit.getParent();
    }
    return null;
  }
  function isTransform(point: Point) {
    let hit: Konva.Node | null = stage.getIntersection(point);
    while (hit) {
      if (hit === transformer) return true;
      hit = hit.getParent();
    }
    return false;
  }
  function restore(node: BoardNode, group: Konva.Group) {
    updateGroup(
      group,
      node,
      node.assetId ? current().assetUrls[node.assetId] : undefined,
      images,
    );
    returnGroup(group, node.id);
  }
  function returnGroup(group: Konva.Group, id: string) {
    group.moveTo(scene);
    group.zIndex(
      Math.max(
        1,
        current().document.nodes.findIndex((node) => node.id === id) + 1,
      ),
    );
    transformer.forceUpdate();
    requestDraw(true);
  }
  function cancelMovement() {
    if (movement?.node && movement.group)
      restore(movement.node, movement.group);
    movement = null;
    draftDirty = false;
    draft.points([]);
    if (transformer.isTransforming()) {
      cancelTransform = true;
      transformer.stopTransform();
      if (initialTransform)
        restore(initialTransform, groups.get(initialTransform.id)!);
      initialTransform = null;
    }
    requestDraw(true);
  }
  function pinchState(): Pinch {
    const [a, b] = [...pointers.values()];
    return {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view: view(),
    };
  }
  function down(event: PointerEvent) {
    if (event.button !== 0) return;
    const point = screen(event);
    pointers.set(event.pointerId, point);
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      /* 浏览器已释放指针时不建立手势。 */
    }
    if (pointers.size > 1) {
      cancelMovement();
      pinch = pinchState();
      transformer.listening(false);
      requestDraw();
      event.preventDefault();
      return;
    }
    const props = current();
    if (props.tool === "select" && isTransform(point)) {
      movement = { mode: "transform", start: point, view: view() };
      return;
    }
    if (props.tool === "pen") {
      if (props.document.nodes.length >= 100) return;
      props.onSelect(null);
      movement = {
        mode: "pen",
        start: point,
        view: view(),
        points: [world(point)],
      };
      draft.setAttrs({
        stroke: props.ink,
        strokeWidth: props.penSize / 4,
        points: [],
      });
    } else {
      const group = targetGroup(point),
        node = props.document.nodes.find(
          (node) => node.id === group?.getAttr("boardNodeId"),
        );
      props.onSelect(node?.id ?? null);
      if (node && group) {
        group.moveTo(interaction);
        group.moveToTop();
        transformer.moveToTop();
        movement = { mode: "move", start: point, view: view(), node, group };
        requestDraw(true);
      } else movement = { mode: "pan", start: point, view: view() };
    }
    event.preventDefault();
  }
  function move(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    const point = screen(event);
    pointers.set(event.pointerId, point);
    if (pinch && pointers.size >= 2) {
      const next = pinchState(),
        zoomed = zoomView(
          pinch.view,
          pinch.center,
          next.distance / pinch.distance,
        );
      setView({
        ...zoomed,
        x: zoomed.x + next.center.x - pinch.center.x,
        y: zoomed.y + next.center.y - pinch.center.y,
      });
      event.preventDefault();
      return;
    }
    if (pinch || !movement) return;
    const dx = point.x - movement.start.x,
      dy = point.y - movement.start.y;
    if (movement.mode === "pan")
      setView({
        ...movement.view,
        x: movement.view.x + dx,
        y: movement.view.y + dy,
      });
    else if (movement.mode === "move") {
      const node = movement.node!,
        doc = current().document;
      movement.group!.position({
        x:
          limit(
            node.x + dx / stage.scaleX(),
            0,
            Math.max(0, doc.width - node.width),
          ) +
          node.width / 2,
        y:
          limit(
            node.y + dy / stage.scaleY(),
            0,
            Math.max(0, doc.height - node.height),
          ) +
          node.height / 2,
      });
      transformer.forceUpdate();
      requestDraw();
    } else if (movement.mode === "pen") {
      const next = world(point),
        last = movement.points!.at(-1)!;
      if (
        Math.hypot(next.x - last.x, next.y - last.y) * stage.scaleX() >= 1.5 &&
        movement.points!.length < 2000
      )
        movement.points!.push(next);
      draftDirty = true;
      requestDraw();
    }
    event.preventDefault();
  }
  function commitNode(node: BoardNode, group: Konva.Group) {
    const doc = current().document,
      width = limit(node.width * Math.abs(group.scaleX()), 1, doc.width),
      height = limit(node.height * Math.abs(group.scaleY()), 1, doc.height);
    const latestNode = doc.nodes.find((item) => item.id === node.id);
    if (!latestNode) return;
    const fontSize = ["text", "note", "stroke"].includes(node.kind)
      ? limit(
          node.fontSize * Math.sqrt(Math.abs(group.scaleX() * group.scaleY())),
          8,
          120,
        )
      : node.fontSize;
    const patch: BoardNode = {
      ...node,
      width,
      height,
      fontSize,
      x: limit(group.x() - width / 2, 0, doc.width - width),
      y: limit(group.y() - height / 2, 0, doc.height - height),
      rotation: normalRotation(group.rotation()),
    };
    if (sameGeometry(node, patch)) return;
    const merged = mergeGeometry(latestNode, node, patch);
    current().onCommit({
      ...doc,
      nodes: doc.nodes.map((item) => (item.id === node.id ? merged : item)),
    });
  }
  function up(event: PointerEvent) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (host.hasPointerCapture(event.pointerId))
      host.releasePointerCapture(event.pointerId);
    if (pinch) {
      if (!pointers.size) {
        pinch = null;
        movement = null;
        transformer.listening(true);
        requestDraw();
      }
      return;
    }
    const gesture = movement;
    movement = null;
    draftDirty = false;
    if (!gesture) return;
    if (event.type === "pointercancel") {
      if (gesture.node && gesture.group) restore(gesture.node, gesture.group);
      if (gesture.mode === "transform") {
        cancelTransform = true;
        transformer.stopTransform();
        if (initialTransform)
          restore(initialTransform, groups.get(initialTransform.id)!);
        initialTransform = null;
      }
      draft.points([]);
      requestDraw(true);
      return;
    }
    if (gesture.mode === "move" && gesture.node && gesture.group) {
      commitNode(gesture.node, gesture.group);
      returnGroup(gesture.group, gesture.node.id);
    }
    if (gesture.mode === "pen") {
      draft.points([]);
      const doc = current().document;
      if (gesture.points!.length >= 2 && doc.nodes.length < 100) {
        const node = strokeNode(
          gesture.points!,
          current().ink,
          current().penSize,
        );
        current().onCommit({ ...doc, nodes: [...doc.nodes, node] });
        current().onSelect(node.id);
      }
      requestDraw();
    }
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    setView(
      zoomView(
        view(),
        { x: event.clientX - rect.left, y: event.clientY - rect.top },
        Math.exp(-event.deltaY * 0.002),
      ),
    );
  }
  function abandon() {
    cancelMovement();
    pointers.clear();
    pinch = null;
    transformer.listening(true);
    requestDraw();
  }
  function lost(event: PointerEvent) {
    if (pointers.has(event.pointerId)) abandon();
  }
  function hidden() {
    if (window.document.visibilityState === "hidden") abandon();
  }
  transformer.on("transformstart", () => {
    if (pinch || pointers.size > 1) {
      cancelTransform = true;
      transformer.stopTransform();
      return;
    }
    cancelTransform = false;
    initialTransform =
      current().document.nodes.find(
        (node) => node.id === current().selectedId,
      ) ?? null;
    if (initialTransform) {
      groups.get(initialTransform.id)!.moveTo(interaction);
      transformer.moveToTop();
      requestDraw(true);
    }
  });
  transformer.on("transform", () => requestDraw());
  transformer.on("transformend", () => {
    if (!cancelTransform && !pinch && initialTransform) {
      const group = groups.get(initialTransform.id)!;
      commitNode(initialTransform, group);
      returnGroup(group, initialTransform.id);
    }
    initialTransform = null;
    cancelTransform = false;
    requestDraw(true);
  });
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);
  host.addEventListener("wheel", wheel, { passive: false });
  host.addEventListener("lostpointercapture", lost);
  window.addEventListener("blur", abandon);
  window.document.addEventListener("visibilitychange", hidden);
  const observer = new ResizeObserver(() => {
    stage.size({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
    });
    fit();
  });
  observer.observe(host);
  sync();
  return {
    sync,
    fit,
    zoom: (factor) =>
      setView(
        zoomView(
          view(),
          { x: stage.width() / 2, y: stage.height() / 2 },
          factor,
        ),
      ),
    destroy() {
      alive = false;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      host.removeEventListener("lostpointercapture", lost);
      host.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", abandon);
      window.document.removeEventListener("visibilitychange", hidden);
      images.destroy();
      stage.destroy();
    },
  };
}
