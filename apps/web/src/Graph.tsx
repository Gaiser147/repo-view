import { scenePosition } from "../../../packages/core/src/scene-position";
import {
  nearestScreenNode,
  type ScreenNode,
} from "../../../packages/core/src/picking";
import {
  spatialGraph,
  zoomLevel,
  type DetailLevel,
} from "../../../packages/core/src/spatial";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Layout, Vec3 } from "../../../packages/core/src/index";
import { layoutGraph } from "../../../packages/core/src/layout";
import { useRepo } from "./state";
import { useHover, graphCanvas } from "./hover";
import { inks, mixHex, authorColor, groupColor } from "./colors";
import { fileComplexity } from "../../../packages/core/src/insights";
// Drafting marks: a stroked circle with a centre dot on a paper-filled disc. mark=1 draws a scalloped revision cloud.
const vertex = `attribute float size; attribute float alpha; attribute float mark; attribute vec3 tint; varying vec3 vTint; varying float vAlpha; varying float vMark; varying float vPx; void main(){ vTint=tint; vAlpha=alpha; vMark=mark; vec4 mv=modelViewMatrix*vec4(position,1.); float px=clamp(size*260./-mv.z,3.,56.)*(mark>.5?1.7:1.); vPx=px; gl_PointSize=px; gl_Position=projectionMatrix*mv; }`;
const fragment = `uniform vec3 uGround; varying vec3 vTint; varying float vAlpha; varying float vMark; varying float vPx; void main(){ vec2 q=gl_PointCoord-vec2(.5); float d=length(q)*2.; if(d>1.)discard; float aa=2.2/max(vPx,3.); float r=vMark>.5?.58:1.; float ring=smoothstep(r*.74-aa,r*.74,d)*(1.-smoothstep(r*.88,r*.88+aa,d)); float dotc=1.-smoothstep(r*.26,r*.26+aa,d); float paper=1.-smoothstep(r*.7,r*.7+aa,d); float cloud=0.; if(vMark>.5){ float a=atan(q.y,q.x); float s=.86+.07*abs(sin(a*5.)); cloud=smoothstep(s-.09-aa,s-.09,d)*(1.-smoothstep(s,s+aa,d)); } float ink=max(max(ring,dotc),cloud); float alpha=max(ink,paper*.92)*vAlpha; if(alpha<.01)discard; gl_FragColor=vec4(mix(uGround,vTint,ink),alpha); }`;
class GraphBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="graph-fallback">
        <h2>Spatial view unavailable</h2>
        <p>
          Your browser could not start WebGL. Explore the same repository using
          Files and the Inspector.
        </p>
        <button onClick={() => useRepo.getState().set({ filesOpen: true })}>
          Open files
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Cloud({ layout }: { layout: Layout }) {
  const {
      snapshot,
      previousSnapshot,
      selectedId,
      focus,
      hiddenGroups,
      isolateFocus,
      view,
      color,
      metric,
      paused,
      lowPower,
      reducedMotion,
      layerRules,
      layout: mode,
      theme,
      lens,
      history,
    } = useRepo(),
    groups = useMemo(
      () =>
        snapshot.nodes.filter((n) => n.kind === "package").map((n) => n.group),
      [snapshot],
    );
  const { camera, controls, gl, size } = useThree(),
    points = useRef<THREE.Points>(null),
    lines = useRef<THREE.LineSegments>(null),
    labels = useRef<Record<string, THREE.Group | null>>({}),
    transition = useRef(0),
    focusT = useRef(0),
    clock = useRef(0),
    frames = useRef({ time: 0, count: 0 }),
    dirty = useRef(true);
  const hidden = useMemo(
    () =>
      new Set([
        ...hiddenGroups,
        ...(isolateFocus && focus ? groups.filter((g) => g !== focus) : []),
      ]),
    [hiddenGroups, isolateFocus, focus, groups],
  );
  const selected = snapshot.nodes.find((n) => n.id === selectedId),
    [detail, setDetail] = useState<DetailLevel>("files");
  const ghostIds = useMemo(
    () => new Set(useRepo.getState().diff?.removed ?? []),
    [snapshot],
  );
  const ghostStart = useRef(performance.now());
  useEffect(() => {
    ghostStart.current = performance.now();
  }, [snapshot]);
  const spatial = useMemo(
    () => spatialGraph(snapshot, detail, focus, selectedId, view, [...hidden]),
    [snapshot, detail, focus, selectedId, view, hidden],
  );
  const nodes = useMemo(
    () => [
      ...spatial.nodes,
      ...(detail === "packages"
        ? []
        : (previousSnapshot?.nodes.filter(
            (n) =>
              n.kind === "file" && ghostIds.has(n.id) && !hidden.has(n.group),
          ) ?? [])),
    ],
    [spatial, previousSnapshot, ghostIds, detail, hidden],
  );
  const index = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const links = spatial.edges;
  const total = nodes.length;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(total * 3), 3),
    );
    g.setAttribute(
      "tint",
      new THREE.BufferAttribute(new Float32Array(total * 3), 3),
    );
    g.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(total), 1),
    );
    g.setAttribute(
      "alpha",
      new THREE.BufferAttribute(new Float32Array(total).fill(1), 1),
    );
    g.setAttribute(
      "mark",
      new THREE.BufferAttribute(new Float32Array(total), 1),
    );
    return g;
  }, [total]);
  const signalGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(24 * 3), 3),
    );
    g.setAttribute(
      "tint",
      new THREE.BufferAttribute(
        new Float32Array(
          Array.from({ length: 72 }, (_, i) => [0.3, 1, 0.8][i % 3]),
        ),
        3,
      ),
    );
    g.setAttribute(
      "size",
      new THREE.BufferAttribute(new Float32Array(24).fill(0), 1),
    );
    g.setAttribute(
      "alpha",
      new THREE.BufferAttribute(new Float32Array(24).fill(1), 1),
    );
    g.setAttribute("mark", new THREE.BufferAttribute(new Float32Array(24), 1));
    return g;
  }, []);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(links.length * 6), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(links.length * 6), 3),
    );
    return g;
  }, [links]);
  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );
  useEffect(() => () => signalGeo.dispose(), [signalGeo]);
  useEffect(() => {
    const c = new THREE.Color(inks[theme].select),
      t = signalGeo.attributes.tint.array as Float32Array;
    for (let i = 0; i < 24; i++) t.set([c.r, c.g, c.b], i * 3);
    signalGeo.attributes.tint.needsUpdate = true;
  }, [theme, signalGeo]);
  useEffect(() => () => lineGeo.dispose(), [lineGeo]);
  useEffect(() => {
    const canvas = gl.domElement,
      down = new Map<number, { x: number; y: number }>();
    let multi = false;
    const start = (event: PointerEvent) => {
      if (event.target !== canvas || event.button > 0) return;
      down.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (down.size > 1) multi = true;
    };
    const cancel = (event: PointerEvent) => {
      down.delete(event.pointerId);
      if (!down.size) multi = false;
    };
    const nearest = (x: number, y: number, radius: number) => {
      const rect = canvas.getBoundingClientRect(),
        p = new THREE.Vector3(),
        positions = geo.attributes.position.array as Float32Array,
        alpha = geo.attributes.alpha.array as Float32Array,
        candidates: ScreenNode[] = [];
      for (let i = 0; i < nodes.length; i++) {
        if (ghostIds.has(nodes[i].id) || alpha[i] < 0.1) continue;
        p.fromArray(positions, i * 3).project(camera);
        candidates.push({
          id: nodes[i].id,
          x: rect.left + ((p.x + 1) * rect.width) / 2,
          y: rect.top + ((1 - p.y) * rect.height) / 2,
          z: p.z,
        });
      }
      return nearestScreenNode(x, y, candidates, radius);
    };
    const end = (event: PointerEvent) => {
      const first = down.get(event.pointerId),
        wasMulti = multi;
      cancel(event);
      if (
        !first ||
        wasMulti ||
        event.target !== canvas ||
        Math.hypot(event.clientX - first.x, event.clientY - first.y) > 8
      )
        return;
      useHover.getState().set(null);
      useRepo
        .getState()
        .select(
          nearest(
            event.clientX,
            event.clientY,
            event.pointerType === "touch" ? 26 : 16,
          ),
        );
    };
    let frame = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || down.size) {
        if (useHover.getState().id) useHover.getState().set(null);
        return;
      }
      cancelAnimationFrame(frame);
      const { clientX: x, clientY: y } = event;
      frame = requestAnimationFrame(() => {
        const id = nearest(x, y, 14),
          rect = canvas.getBoundingClientRect();
        useHover.getState().set(id, x - rect.left, y - rect.top);
        canvas.style.cursor = id ? "pointer" : "";
      });
    };
    const leave = () => {
      cancelAnimationFrame(frame);
      useHover.getState().set(null);
    };
    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, [nodes, geo, gl, camera, ghostIds]);
  const nodeLabels = useRef<Record<string, THREE.Group | null>>({});
  const coarse = useMemo(() => matchMedia("(pointer: coarse)").matches, []);
  const [packageLabels, setPackageLabels] = useState<string[]>([]),
    lastPackageLabels = useRef("");
  const [labelIds, setLabelIds] = useState<string[]>([]),
    lastLabels = useRef("");
  const ink = inks[theme];
  const colors = useMemo(
    () => groups.map((g) => new THREE.Color(groupColor(g, groups, theme))),
    [groups, theme],
  );
  const complexityByFile = useMemo(() => fileComplexity(snapshot), [snapshot]);
  const hotScore = useMemo(() => {
    const scores = new Map<string, number>();
    let max = 0;
    for (const n of snapshot.nodes)
      if (n.kind === "file") {
        const c = complexityByFile.get(n.id) ?? 0,
          changes = history?.files.get(n.path)?.changes,
          value = history?.coverage.compared ? (changes ?? 0) * c : c;
        scores.set(n.id, value);
        max = Math.max(max, value);
      }
    for (const [k, v] of scores) scores.set(k, max ? v / max : 0);
    return scores;
  }, [snapshot, complexityByFile, history]);
  const rankedAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of history?.files.values() ?? [])
      if (f.lastAuthor)
        counts.set(f.lastAuthor, (counts.get(f.lastAuthor) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [history]);
  const ground = useMemo(() => new THREE.Color(ink.ground), [ink]);
  const uniforms = useMemo(() => ({ uGround: { value: ground } }), [ground]);
  const changed = useRepo((s) => s.diff),
    changedPaths = useMemo(
      () => new Set([...(changed?.added ?? []), ...(changed?.changed ?? [])]),
      [changed],
    );
  useEffect(() => {
    dirty.current = true;
  }, [
    layout,
    nodes,
    links,
    color,
    metric,
    selectedId,
    focus,
    lowPower,
    layerRules,
    changedPaths,
    mode,
    reducedMotion,
    labelIds,
    packageLabels,
    theme,
    lens,
    hotScore,
    rankedAuthors,
  ]);
  useFrame((_, dt) => {
    const target = useRepo.getState().layout === "layers" ? 1 : 0,
      t = transition.current;
    transition.current = reducedMotion
      ? target
      : THREE.MathUtils.damp(t, target, 5.1, Math.min(dt, 0.05));
    if (Math.abs(transition.current - target) < 0.0005)
      transition.current = target;
    focusT.current = reducedMotion
      ? focus
        ? 1
        : 0
      : THREE.MathUtils.damp(
          focusT.current,
          focus ? 1 : 0,
          4,
          Math.min(dt, 0.05),
        );
    if (!paused && !reducedMotion) clock.current += dt;
    frames.current.count++;
    {
      const target =
        (controls as unknown as { target?: THREE.Vector3 })?.target ??
        new THREE.Vector3();
      const next = zoomLevel(camera.position.distanceTo(target));
      if (next !== detail) {
        setDetail(next);
        useRepo.getState().set({ graphLevel: next });
      }
      if (frames.current.count % 8 === 0) {
        const p = new THREE.Vector3(),
          positions = geo.attributes.position.array as Float32Array;
        const headingCandidates = groups
          .filter(
            (g) =>
              !hidden.has(g) &&
              (next !== "functions" ||
                g === focus ||
                selectedId === `pkg:${g}`),
          )
          .map((g) => {
            const label = labels.current[g];
            if (label) p.copy(label.position).project(camera);
            else p.set(9, 9, 9);
            return {
              id: `pkg:${g}`,
              x: ((p.x + 1) * size.width) / 2,
              y: ((1 - p.y) * size.height) / 2,
              width: Math.min(120, 22 + g.length * 6),
              height: 24,
              score: g === focus || selectedId === `pkg:${g}` ? -2 : 1,
              visible:
                p.z >= -1 &&
                p.z <= 1 &&
                Math.abs(p.x) < 0.88 &&
                Math.abs(p.y) < 0.75,
            };
          });
        const detailCandidates = nodes.map((n, i) => {
          p.fromArray(positions, i * 3).project(camera);
          return {
            id: n.id,
            x: ((p.x + 1) * size.width) / 2,
            y: ((1 - p.y) * size.height) / 2,
            width: Math.min(136, 16 + n.name.length * 6),
            height: 22,
            score: n.id === selectedId ? -3 : p.x * p.x + p.y * p.y,
            visible:
              n.kind !== "package" &&
              (next === "functions" || n.id === selectedId) &&
              p.z >= -1 &&
              p.z <= 1 &&
              Math.abs(p.x) < 0.85 &&
              Math.abs(p.y) < (coarse ? 0.62 : 0.72),
          };
        });
        const accepted: {
          id: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }[] = [];
        for (const candidate of [...headingCandidates, ...detailCandidates]
          .filter((n) => n.visible)
          .sort((a, b) => a.score - b.score)) {
          if (accepted.length >= (coarse ? 5 : 7)) break;
          if (
            accepted.every(
              (a) =>
                Math.abs(a.x - candidate.x) >
                  (a.width + candidate.width) / 2 + 12 ||
                Math.abs(a.y - candidate.y) >
                  (a.height + candidate.height) / 2 + 10,
            )
          )
            accepted.push(candidate);
        }
        const visibleLabels = accepted
          .filter((n) => !n.id.startsWith("pkg:"))
          .map((n) => n.id);
        const packages = accepted
            .filter((n) => n.id.startsWith("pkg:"))
            .map((n) => n.id.slice(4)),
          packageKey = packages.join("|");
        if (packageKey !== lastPackageLabels.current) {
          lastPackageLabels.current = packageKey;
          setPackageLabels(packages);
        }
        const key = visibleLabels.join("|");
        if (key !== lastLabels.current) {
          lastLabels.current = key;
          setLabelIds(visibleLabels);
        }
      }
    }
    frames.current.time += dt;
    if (frames.current.count === 30 && !lowPower && frames.current.time > 1.4)
      useRepo.getState().set({ lowPower: true });
    if (
      !(performance.now() - ghostStart.current < 1700 && changed) &&
      !dirty.current &&
      transition.current === target &&
      Math.abs(focusT.current - (focus ? 1 : 0)) < 0.001 &&
      !selectedId &&
      !focus
    )
      return;
    dirty.current = false;
    const pos = geo.attributes.position.array as Float32Array,
      tints = geo.attributes.tint.array as Float32Array,
      sizes = geo.attributes.size.array as Float32Array,
      alphas = geo.attributes.alpha.array as Float32Array,
      marks = geo.attributes.mark.array as Float32Array,
      morph = transition.current;
    const position = (id: string, group: string): Vec3 => {
      const p = layout[id];
      return p
        ? scenePosition(p, id, group, {
            morph,
            focus,
            focusAmount: focusT.current,
            rules: layerRules,
          })
        : [0, 0, 0];
    };
    const tmp = new THREE.Color();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i],
        p = position(n.id, n.group);
      pos.set(p, i * 3);
      const age = (performance.now() - ghostStart.current) / 1500;
      alphas[i] = ghostIds.has(n.id)
        ? reducedMotion
          ? 0
          : Math.max(0, 1 - age)
        : changed?.added.includes(n.path)
          ? reducedMotion
            ? 1
            : Math.min(1, age)
          : 1;
      const pick = (hex: string) => tmp.set(hex);
      let c =
        colors[Math.max(0, groups.indexOf(n.group)) % colors.length] ??
        pick(ink.ink);
      let marked = 0,
        scale = 1;
      if (color === "complexity") {
        const value =
          n.kind === "function"
            ? (n.complexity ?? 0)
            : (complexityByFile.get(n.id) ?? 0) / 4;
        c = pick(value > 10 ? ink.revision : value > 5 ? ink.ink : ink.muted);
      }
      if (color === "language")
        c = pick(
          n.language === "TypeScript"
            ? ink.language.TypeScript
            : n.language === "JavaScript"
              ? ink.language.JavaScript
              : ink.language.other,
        );
      if (color === "changes") {
        const added = changed?.added.includes(n.path),
          edited = changedPaths.has(n.path);
        c = pick(added ? ink.added : edited ? ink.revision : ink.muted);
        if (edited && !added && n.kind === "file") marked = 1;
      }
      if (color === "hotspots") {
        const h =
          hotScore.get(n.kind === "function" ? (n.parent ?? "") : n.id) ?? 0;
        c = pick(h > 0.6 ? ink.revision : h > 0.32 ? ink.ink : ink.muted);
        if (n.kind === "file") scale = 0.75 + h * 1.6;
      }
      if (color === "authors")
        c = pick(
          authorColor(
            history?.files.get(n.path)?.lastAuthor,
            rankedAuthors,
            theme,
          ),
        );
      if (ghostIds.has(n.id)) c = pick(ink.revision);
      const active = n.id === selectedId || n.parent === selectedId,
        dim = focus && focus !== n.group?.toString() ? 0.76 : 0;
      const tint = active
        ? new THREE.Color(ink.select)
        : dim
          ? c.clone().lerp(ground, dim)
          : c;
      tints.set([tint.r, tint.g, tint.b], i * 3);
      marks[i] = active ? 0 : marked;
      sizes[i] =
        (n.kind === "package"
          ? 7
          : active
            ? 1.8 + Math.sin(clock.current * 3) * 0.12
            : n.kind === "function"
              ? 0.35
              : 0.48 +
                Math.min(
                  1.1,
                  Math.sqrt(n[metric]) / (metric === "loc" ? 22 : 145),
                )) * scale;
    }
    if (!reducedMotion && performance.now() - ghostStart.current < 1700) {
      const age = (performance.now() - ghostStart.current) / 1700;
      for (let i = 0; i < nodes.length; i++)
        if (changedPaths.has(nodes[i].path))
          sizes[i] *= 1 + Math.sin(age * Math.PI) * 0.5;
    }
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.tint.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
    geo.attributes.mark.needsUpdate = true;
    const lp = lineGeo.attributes.position.array as Float32Array,
      lc = lineGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < links.length; i++) {
      const e = links[i],
        a = index.get(e.source)!,
        b = index.get(e.target)!,
        active = e.source === selectedId || e.target === selectedId;
      lp.set(pos.subarray(a * 3, a * 3 + 3), i * 6);
      lp.set(pos.subarray(b * 3, b * 3 + 3), i * 6 + 3);
      const power = active ? 0.95 : lens === "dependencies" ? 0.42 : 0.2,
        rgb = mixHex(ink.ground, active ? ink.select : ink.line, power);
      lc.set([...rgb, ...rgb], i * 6);
    }
    const activeLinks = links
      .filter(
        (e) =>
          e.source === selectedId ||
          e.target === selectedId ||
          (focus && nodes[index.get(e.source)!]?.group === focus),
      )
      .slice(0, 24);
    const sp = signalGeo.attributes.position.array as Float32Array,
      ss = signalGeo.attributes.size.array as Float32Array;
    for (let i = 0; i < 24; i++) {
      const e = activeLinks[i];
      if (!e || reducedMotion) {
        ss[i] = 0;
        continue;
      }
      const a = index.get(e.source)! * 3,
        b = index.get(e.target)! * 3,
        t = (clock.current * 0.22 + i * 0.13) % 1;
      ss[i] = 1;
      for (let axis = 0; axis < 3; axis++)
        sp[i * 3 + axis] = pos[a + axis] + (pos[b + axis] - pos[a + axis]) * t;
    }
    signalGeo.attributes.position.needsUpdate = true;
    signalGeo.attributes.size.needsUpdate = true;
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    for (const [id, label] of Object.entries(nodeLabels.current)) {
      const i = index.get(id);
      if (label && i !== undefined) label.position.fromArray(pos, i * 3);
    }
    for (const group of groups) {
      const label = labels.current[group];
      if (!label) continue;
      const p = position(`pkg:${group}`, group);
      label.position.set(p[0], p[1] + (1 - morph) * 2.9, p[2]);
    }
  });
  return (
    <>
      {spatial.omittedEdges > 0 && (
        <Html position={[0, -7, 0]} center>
          <span className="edge-limit">
            {spatial.omittedEdges.toLocaleString()} connections hidden · focus a
            file for details
          </span>
        </Html>
      )}
      <points
        ref={points}
        geometry={geo}
        frustumCulled={false}
        userData={{ repoNodes: true, ids: nodes.map((n) => n.id) }}
      >
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </points>
      <points geometry={signalGeo} frustumCulled={false} raycast={() => {}}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
        />
      </points>
      <lineSegments ref={lines} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors depthWrite={false} />
      </lineSegments>
      {labelIds.map((id) => {
        const n = nodes.find((n) => n.id === id);
        if (!n) return null;
        return (
          <group
            key={id}
            ref={(element) => {
              if (element) nodeLabels.current[id] = element;
              else delete nodeLabels.current[id];
            }}
          >
            <Html center zIndexRange={[3, 0]}>
              <button
                className={`node-label ${n.kind} ${selectedId === id ? "selected" : ""}`}
                onClick={() => useRepo.getState().select(id)}
                title={n.path}
              >
                {n.kind === "function" ? "ƒ " : ""}
                {n.name}
              </button>
            </Html>
          </group>
        );
      })}
      {groups
        .filter((g) => !hidden.has(g))
        .map((g) => (
          <group
            key={g}
            ref={(el) => {
              labels.current[g] = el;
            }}
          >
            <Html
              center
              zIndexRange={[3, 0]}
              style={{
                visibility: packageLabels.includes(g) ? "visible" : "hidden",
              }}
            >
              <button
                className={`cluster-label ${focus === g ? "focused" : ""}`}
                style={
                  {
                    "--cluster": groupColor(g, groups, theme),
                  } as React.CSSProperties
                }
                title={`${g} · ${snapshot.nodes.filter((n) => n.kind === "file" && n.group === g).length} files`}
                onClick={() => useRepo.getState().select(`pkg:${g}`)}
              >
                <span className="cluster-dot" />
                {g}
                <small>
                  {
                    snapshot.nodes.filter(
                      (n) => n.kind === "file" && n.group === g,
                    ).length
                  }{" "}
                  files
                </small>
              </button>
            </Html>
          </group>
        ))}
    </>
  );
}
function Camera({ layout }: { layout: Layout }) {
  const controls = useRef<any>(null),
    remaining = useRef(0),
    aim = useRef(new THREE.Vector3()),
    destination = useRef(new THREE.Vector3()),
    distanceGoal = useRef<number | null>(null),
    interacted = useRef(false);
  const { camera, gl, size } = useThree(),
    {
      snapshot,
      layout: mode,
      selectedId,
      focus,
      reducedMotion,
      cameraRevision,
      cameraCommand,
      layerRules,
      hiddenGroups,
      isolateFocus,
    } = useRepo();
  function move(target: THREE.Vector3, distance: number, front = false) {
    const offset = front
      ? new THREE.Vector3(0, mode === "layers" ? 0.8 : 0.04, 1).normalize()
      : camera.position
          .clone()
          .sub(controls.current?.target ?? new THREE.Vector3())
          .normalize();
    aim.current.copy(target);
    destination.current.copy(target).add(offset.multiplyScalar(distance));
    distanceGoal.current = distance;
    remaining.current = 1.1;
    if (reducedMotion && controls.current) {
      camera.position.copy(destination.current);
      controls.current.target.copy(aim.current);
      controls.current.update();
      remaining.current = 0;
    }
  }
  function fit(group?: string) {
    if (size.width < 2 || size.height < 2) return;
    remaining.current = 0;
    distanceGoal.current = null;
    const box = new THREE.Box3();
    for (const n of snapshot.nodes.filter(
      (n) =>
        n.kind === "file" &&
        (!group || n.group === group) &&
        !hiddenGroups.includes(n.group) &&
        (!isolateFocus || !focus || n.group === focus),
    )) {
      const p = layout[n.id];
      if (p)
        box.expandByPoint(
          new THREE.Vector3().fromArray(
            scenePosition(p, n.id, n.group, {
              morph: mode === "layers" ? 1 : 0,
              focus,
              rules: layerRules,
            }),
          ),
        );
    }
    if (box.isEmpty())
      box.setFromCenterAndSize(
        new THREE.Vector3(),
        new THREE.Vector3(14, 10, 8),
      );
    const center = box.getCenter(new THREE.Vector3()),
      extent = box.getSize(new THREE.Vector3()),
      tan = Math.tan(
        THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2),
      ),
      aspect = size.width / Math.max(1, size.height),
      distance =
        Math.max(extent.y / (2 * tan), extent.x / (2 * tan * aspect)) * 1.18 +
        extent.z / 2 +
        2;
    const layerDistance =
      (box.getBoundingSphere(new THREE.Sphere()).radius /
        Math.sin(Math.atan(Math.min(tan, tan * aspect)))) *
      1.2;
    move(
      center,
      Math.max(15, mode === "layers" ? layerDistance : distance),
      true,
    );
  }
  const previousMode = useRef(mode);
  useEffect(() => {
    const changedMode = previousMode.current !== mode;
    previousMode.current = mode;
    if (changedMode || !interacted.current) fit();
  }, [
    layout,
    size.width,
    size.height,
    mode,
    layerRules,
    focus,
    hiddenGroups,
    isolateFocus,
  ]);
  useEffect(() => {
    interacted.current = false;
    fit();
  }, [cameraRevision]);
  useEffect(() => {
    const id = selectedId ?? (focus ? `pkg:${focus}` : null),
      p = id ? layout[id] : undefined;
    if (!p || !controls.current) return;
    interacted.current = true;
    const n = snapshot.nodes.find((n) => n.id === id),
      target = new THREE.Vector3().fromArray(
        scenePosition(p, id!, n?.group ?? "", {
          morph: mode === "layers" ? 1 : 0,
          focus,
          rules: layerRules,
        }),
      );
    if (n?.kind === "package" && mode === "layers") {
      fit(n.group);
      return;
    }
    move(
      target,
      n?.kind === "function"
        ? 5.5
        : n?.kind === "file"
          ? 8
          : Math.max(13, camera.position.distanceTo(controls.current.target)),
    );
  }, [selectedId, focus, mode, layout, layerRules]);
  useEffect(() => {
    if (!cameraCommand.revision || !controls.current) return;
    interacted.current = true;
    remaining.current = 0;
    if (cameraCommand.action === "fit") {
      interacted.current = false;
      fit();
      return;
    }
    if (cameraCommand.action === "locate") {
      const p = layout[cameraCommand.nodeId ?? ""];
      if (p)
        move(
          new THREE.Vector3().fromArray(
            scenePosition(
              p,
              cameraCommand.nodeId ?? "",
              snapshot.nodes.find((n) => n.id === cameraCommand.nodeId)
                ?.group ?? "",
              { morph: mode === "layers" ? 1 : 0, focus, rules: layerRules },
            ),
          ),
          7,
        );
      return;
    }
    const distance =
      distanceGoal.current ??
      camera.position.distanceTo(controls.current.target);
    move(
      controls.current.target.clone(),
      THREE.MathUtils.clamp(
        distance * (cameraCommand.action === "in" ? 0.72 : 1.39),
        2.2,
        400,
      ),
    );
  }, [cameraCommand]);
  useEffect(() => {
    const wheel = (event: WheelEvent) => {
      if (event.target !== gl.domElement || !controls.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      interacted.current = true;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1),
        distance =
          distanceGoal.current ??
          camera.position.distanceTo(controls.current.target);
      move(
        controls.current.target.clone(),
        THREE.MathUtils.clamp(
          distance * Math.exp(THREE.MathUtils.clamp(delta, -400, 400) * 0.0016),
          2.2,
          400,
        ),
      );
    };
    gl.domElement.addEventListener("wheel", wheel, {
      passive: false,
      capture: true,
    });
    return () => gl.domElement.removeEventListener("wheel", wheel, true);
  }, [gl, camera, reducedMotion]);
  useFrame((_, dt) => {
    if (remaining.current <= 0 || !controls.current) return;
    remaining.current -= dt;
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-8 * Math.min(dt, 0.1));
    controls.current.target.lerp(aim.current, alpha);
    camera.position.lerp(destination.current, alpha);
    if (remaining.current <= 0) {
      controls.current.target.copy(aim.current);
      camera.position.copy(destination.current);
      distanceGoal.current = null;
    }
    controls.current.update();
  });
  return (
    <OrbitControls
      ref={controls}
      onStart={() => {
        remaining.current = 0;
        distanceGoal.current = null;
        interacted.current = true;
      }}
      makeDefault
      enableDamping
      dampingFactor={0.1}
      minDistance={2.2}
      maxDistance={400}
      enableZoom
      zoomSpeed={1.4}
      screenSpacePanning
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}
export function Graph() {
  const cameraConfig = useMemo(
    () => ({
      position: [0, 1, window.innerWidth < 700 ? 36 : 22] as Vec3,
      fov: 48,
      near: 0.1,
      far: 1200,
    }),
    [],
  );
  const { snapshot, lowPower, view } = useRepo(),
    [layout, setLayout] = useState<Layout>(() => layoutGraph(snapshot.nodes));
  useEffect(() => {
    const worker = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (e) =>
      setLayout((previous) => {
        const next: Layout = e.data;
        const diff = useRepo.getState().diff;
        for (const rename of diff?.renamed ?? []) {
          for (const [id, position] of Object.entries(previous)) {
            if (id === rename.from || id.startsWith(rename.from + "#")) {
              const target = rename.to + id.slice(rename.from.length);
              if (next[target]) next[target] = position;
            }
          }
        }
        for (const id of diff?.removed ?? [])
          if (previous[id]) next[id] = previous[id];
        return next;
      });
    worker.postMessage(snapshot.nodes);
    return () => worker.terminate();
  }, [snapshot]);
  return (
    <GraphBoundary>
      <Suspense
        fallback={<div className="graph-fallback">Preparing spatial view…</div>}
      >
        <Canvas
          camera={cameraConfig}
          dpr={lowPower ? 1 : [1, 1.6]}
          gl={{
            antialias: false,
            alpha: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
          }}
          frameloop={view === "Explore" ? "always" : "never"}
          onCreated={({ raycaster, gl, scene, camera, get }) => {
            graphCanvas.current = gl.domElement;
            if (import.meta.env.DEV)
              (
                window as unknown as { __repoViewGraph: unknown }
              ).__repoViewGraph = {
                scene,
                camera,
                canvas: gl.domElement,
                get controls() {
                  return get().controls;
                },
              };
            const context = gl.getContext(),
              extension = context.getExtension("WEBGL_debug_renderer_info");
            if (
              extension &&
              /swiftshader|llvmpipe|software/i.test(
                context.getParameter(extension.UNMASKED_RENDERER_WEBGL),
              )
            )
              useRepo.getState().set({ lowPower: true });
            raycaster.params.Points = { threshold: 0.13 };
          }}
        >
          <Cloud layout={layout} />
          <Camera layout={layout} />
        </Canvas>
      </Suspense>
    </GraphBoundary>
  );
}
