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
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { minimatch } from "minimatch";
import type { Layout, Vec3 } from "../../../packages/core/src/index";
import { hash, layoutGraph } from "../../../packages/core/src/layout";
import { useRepo } from "./state";

import { palette, groupColor } from "./colors";
const vertex = `attribute float size; attribute float alpha; attribute vec3 tint; varying vec3 vTint; varying float vAlpha; void main(){ vTint=tint; vAlpha=alpha; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=clamp(size*230./-mv.z,1.,48.); gl_Position=projectionMatrix*mv; }`;
const fragment = `varying vec3 vTint; varying float vAlpha; void main(){ float d=length(gl_PointCoord-vec2(.5))*2.; if(d>1.)discard; float core=exp(-d*d*32.);float glow=pow(1.-d,2.)*.32;gl_FragColor=vec4(vTint*(1.+core*1.5),(core+glow)*vAlpha); }`;
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
      view,
      color,
      metric,
      paused,
      lowPower,
      reducedMotion,
      layerRules,
      layout: mode,
    } = useRepo(),
    groups = useMemo(
      () =>
        snapshot.nodes.filter((n) => n.kind === "package").map((n) => n.group),
      [snapshot],
    );
  const { camera, controls } = useThree(),
    points = useRef<THREE.Points>(null),
    lines = useRef<THREE.LineSegments>(null),
    labels = useRef<Record<string, THREE.Group | null>>({}),
    transition = useRef(0),
    focusT = useRef(0),
    clock = useRef(0),
    frames = useRef({ time: 0, count: 0 }),
    dirty = useRef(true);
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
    () => spatialGraph(snapshot, detail, focus, selectedId, view),
    [snapshot, detail, focus, selectedId, view],
  );
  const nodes = useMemo(
    () => [
      ...spatial.nodes,
      ...(detail === "packages"
        ? []
        : (previousSnapshot?.nodes.filter(
            (n) => n.kind === "file" && ghostIds.has(n.id),
          ) ?? [])),
    ],
    [spatial, previousSnapshot, ghostIds, detail],
  );
  const index = useMemo(() => new Map(nodes.map((n, i) => [n.id, i])), [nodes]);
  const links = spatial.edges;
  const dustCount = lowPower ? 600 : 2600,
    total = nodes.length + dustCount;
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
      lineGeo.dispose();
    },
    [geo, lineGeo],
  );
  useEffect(() => () => signalGeo.dispose(), [signalGeo]);
  useEffect(() => {
    const object = points.current;
    if (!object) return;
    object.raycast = function (raycaster, hits) {
      const all: THREE.Intersection[] = [];
      THREE.Points.prototype.raycast.call(this, raycaster, all);
      hits.push(
        ...all.filter(
          (h) =>
            (h.index ?? Infinity) < nodes.length &&
            !ghostIds.has(nodes[h.index!]?.id),
        ),
      );
    };
  }, [nodes]);
  const colors = useMemo(
    () => groups.map((g) => new THREE.Color(groupColor(g, groups))),
    [groups],
  );
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
    if (frames.current.count++ % 30 === 0) {
      const target =
        (controls as unknown as { target?: THREE.Vector3 })?.target ??
        new THREE.Vector3();
      const next = zoomLevel(camera.position.distanceTo(target));
      if (next !== detail) setDetail(next);
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
      morph = transition.current;
    const position = (id: string, group: string): Vec3 => {
      const p = layout[id];
      if (!p) return [0, 0, 0];
      let layer = p.layers;
      const rule = Object.entries(layerRules).find(
        ([pattern]) =>
          group === pattern ||
          minimatch(id.split("#")[0], pattern, { dot: true }),
      );
      if (Object.keys(layerRules).length)
        layer = [
          layer[0],
          rule ? (1.5 - Number(rule[1])) * 3.8 : -9.5,
          layer[2],
        ];
      const f = focus === group ? focusT.current * (1 - morph) : 0;
      return p.cloud.map((v, i) =>
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(v, p.focus[i], f),
          layer[i],
          morph,
        ),
      ) as Vec3;
    };
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
      let c =
        colors[Math.max(0, groups.indexOf(n.group)) % colors.length] ??
        new THREE.Color("#45bfff");
      if (ghostIds.has(n.id)) c = new THREE.Color("#ff8791");
      if (color === "complexity")
        c = new THREE.Color((n.complexity ?? 0) > 10 ? "#ffb76b" : "#579fff");
      if (color === "language")
        c = new THREE.Color(
          n.language === "TypeScript"
            ? "#4fa9ff"
            : n.language === "JavaScript"
              ? "#f4d16b"
              : "#8ce3cd",
        );
      if (color === "changes")
        c = new THREE.Color(changedPaths.has(n.path) ? "#6ff5cf" : "#54779c");
      const active = n.id === selectedId || n.parent === selectedId,
        dim = focus && focus !== n.group?.toString() ? 0.24 : 1;
      tints.set(
        active ? [0.45, 1, 0.83] : [c.r * dim, c.g * dim, c.b * dim],
        i * 3,
      );
      sizes[i] = active
        ? 1.8 + Math.sin(clock.current * 3) * 0.12
        : n.kind === "function"
          ? 0.35
          : 0.48 +
            Math.min(1.1, Math.sqrt(n[metric]) / (metric === "loc" ? 22 : 145));
    }
    if (!reducedMotion && performance.now() - ghostStart.current < 1700) {
      const age = (performance.now() - ghostStart.current) / 1700;
      for (let i = 0; i < nodes.length; i++)
        if (changedPaths.has(nodes[i].path))
          sizes[i] *= 1 + Math.sin(age * Math.PI) * 0.5;
    }
    // Atmospheric specks are a non-interactive material, not additional repository entities.
    for (let d = 0; d < dustCount; d++) {
      const base = nodes[d % Math.max(1, nodes.length)],
        i = nodes.length + d;
      if (!base) {
        pos.set([0, 0, 0], i * 3);
        sizes[i] = 0;
        continue;
      }
      const p = position(base.id, base.group),
        r = hash("dust" + d) / 4294967295,
        a = d * 2.39996,
        w = (1 - morph) * (0.2 + r * 0.6);
      pos.set(
        [
          p[0] + Math.sin(a) * w,
          p[1] + Math.cos(a * 1.3) * w,
          p[2] + Math.sin(a * 0.7) * w,
        ],
        i * 3,
      );
      const c = colors[Math.max(0, groups.indexOf(base.group)) % colors.length];
      const haze = d % 60 === 0;
      alphas[i] = haze ? 0.18 : 0.65;
      tints.set(
        haze
          ? [c.r * 0.08, c.g * 0.08, c.b * 0.08]
          : [c.r * 0.45, c.g * 0.45, c.b * 0.45],
        i * 3,
      );
      sizes[i] = haze ? 9 + r * 5 : 0.18 + r * 0.2;
    }
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.tint.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
    geo.attributes.alpha.needsUpdate = true;
    const lp = lineGeo.attributes.position.array as Float32Array,
      lc = lineGeo.attributes.color.array as Float32Array;
    for (let i = 0; i < links.length; i++) {
      const e = links[i],
        a = index.get(e.source)!,
        b = index.get(e.target)!,
        active = e.source === selectedId || e.target === selectedId;
      lp.set(pos.subarray(a * 3, a * 3 + 3), i * 6);
      lp.set(pos.subarray(b * 3, b * 3 + 3), i * 6 + 3);
      const power = active ? 0.8 : view === "Dependencies" ? 0.19 : 0.085;
      lc.set(
        active
          ? [0.3, power, power, 0.3, power, power]
          : [
              power * 0.25,
              power * 0.65,
              power,
              power * 0.25,
              power * 0.65,
              power,
            ],
        i * 6,
      );
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
        onClick={(e) => {
          e.stopPropagation();
          if (e.index !== undefined && e.index < nodes.length)
            useRepo.getState().select(nodes[e.index].id);
        }}
      >
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points geometry={signalGeo} frustumCulled={false} raycast={() => {}}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments ref={lines} geometry={lineGeo} frustumCulled={false}>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      {groups.map((g, i) => (
        <group
          key={g}
          ref={(el) => {
            labels.current[g] = el;
          }}
        >
          <Html center zIndexRange={[3, 0]} distanceFactor={27}>
            <button
              className={`cluster-label ${focus === g ? "focused" : ""}`}
              style={
                {
                  "--cluster": palette[i % palette.length],
                } as React.CSSProperties
              }
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
  const aim = useRef(new THREE.Vector3()),
    remaining = useRef(0);
  const mode = useRepo((s) => s.layout),
    reduced = useRepo((s) => s.reducedMotion);
  const controls = useRef<any>(null),
    rev = useRepo((s) => s.cameraRevision),
    selectedId = useRepo((s) => s.selectedId),
    focus = useRepo((s) => s.focus),
    { camera } = useThree();
  useEffect(() => {
    if (controls.current) {
      controls.current.target.set(0, 0, 0);
      camera.position.set(0, 1, window.innerWidth < 700 ? 36 : 22);
      controls.current.update();
    }
  }, [rev, camera]);
  useEffect(() => {
    const p = layout[selectedId ?? `pkg:${focus}`];
    if (p && (selectedId || focus)) {
      aim.current.fromArray(mode === "layers" ? p.layers : p.cloud);
      if (reduced && controls.current) {
        const delta = aim.current.clone().sub(controls.current.target);
        camera.position.add(delta);
        controls.current.target.copy(aim.current);
        controls.current.update();
        remaining.current = 0;
      } else remaining.current = 1.4;
    }
  }, [selectedId, focus, mode, layout, reduced]);
  useFrame((_, dt) => {
    if (remaining.current <= 0 || !controls.current) return;
    remaining.current -= dt;
    const before = controls.current.target.clone();
    controls.current.target.lerp(aim.current, 1 - Math.exp(-5 * dt));
    camera.position.add(controls.current.target.clone().sub(before));
    controls.current.update();
  });
  return (
    <OrbitControls
      ref={controls}
      onStart={() => {
        remaining.current = 0;
      }}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={5}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.9}
    />
  );
}
export function Graph() {
  const cameraConfig = useMemo(
    () => ({
      position: [0, 1, window.innerWidth < 700 ? 36 : 22] as Vec3,
      fov: 48,
      near: 0.1,
      far: 150,
    }),
    [],
  );
  const { snapshot, lowPower } = useRepo(),
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
            powerPreference: "high-performance",
          }}
          onPointerMissed={() => useRepo.getState().select(null)}
          onCreated={({ raycaster, gl }) => {
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
          {!lowPower && (
            <EffectComposer multisampling={0}>
              <Bloom
                intensity={1.05}
                luminanceThreshold={0.75}
                luminanceSmoothing={0.6}
                mipmapBlur
              />
            </EffectComposer>
          )}
        </Canvas>
      </Suspense>
    </GraphBoundary>
  );
}
