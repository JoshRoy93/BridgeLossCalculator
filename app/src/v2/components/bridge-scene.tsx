"use client";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Line } from "@react-three/drei";
import type { OrbitControls as Controls } from "three-stdlib";
import * as THREE from "three";
import { elevationAt, sceneGeometry } from "../scene-geometry";
import type { FlowResult, Inputs } from "../model";
import { useSceneTransition } from "./use-scene-transition";

type Scene = ReturnType<typeof sceneGeometry>;
function Surface({
  vertices,
  soil = false,
  wireframe = false,
}: {
  vertices: number[];
  soil?: boolean;
  wireframe?: boolean;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.computeVertexNormals();
    return g;
  }, [vertices]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        color={soil ? "#695e4e" : "#7c8466"}
        roughness={0.93}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        customProgramCacheKey={() => (soil ? "cut-soil" : "survey-ground")}
        onBeforeCompile={(shader) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vSite;",
            )
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvSite = position;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
          varying vec3 vSite;
          float grain(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p) { vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(grain(i),grain(i+vec2(1,0)),f.x),mix(grain(i+vec2(0,1)),grain(i+vec2(1,1)),f.x),f.y); }`,
            )
            .replace(
              "#include <color_fragment>",
              `#include <color_fragment>
            float n=noise(vSite.xz*1.8)*0.13+noise(vSite.xz*16.)*0.06;
            diffuseColor.rgb *= 0.85+n;
            ${soil ? "diffuseColor.rgb *= 0.94 + sin(vSite.y*12.+noise(vSite.xz)*2.)*0.06;" : "diffuseColor.rgb = mix(diffuseColor.rgb*vec3(0.76,0.81,0.67),diffuseColor.rgb,smoothstep(0.1,4.8,vSite.y+noise(vSite.xz*.6)));"}`,
            );
        }}
      />
    </mesh>
  );
}
function Water({
  scene,
  playing,
  speed,
  depthMode,
}: {
  scene: Scene;
  playing: boolean;
  speed: number;
  depthMode: boolean;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(scene.water, 3),
    );
    g.setAttribute("depth", new THREE.Float32BufferAttribute(scene.depths, 1));
    g.computeVertexNormals();
    return g;
  }, [scene]);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.lights,
          { time: { value: 0 }, depthMode: { value: false } },
        ]),
        lights: true,
        side: THREE.DoubleSide,
        vertexShader: `#include <common>
      #include <shadowmap_pars_vertex>
      attribute float depth; varying float vDepth; varying vec3 vWorld;
      void main(){vDepth=depth; vec4 worldPosition=modelMatrix*vec4(position,1.); vWorld=worldPosition.xyz;
        vec3 transformedNormal=normalMatrix*normal;
        #include <shadowmap_vertex>
        gl_Position=projectionMatrix*viewMatrix*worldPosition;
      }`,
        fragmentShader: `#include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <shadowmap_pars_fragment>
      #include <shadowmask_pars_fragment>
      uniform float time; uniform bool depthMode; varying float vDepth; varying vec3 vWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        vec2 p=vWorld.xz;
        float irregular=noise(p*.45+vec2(0.,time*.3));
        float a=p.x*1.2+p.y*2.1+time*1.8+irregular*7., b=p.x*2.7-p.y*.9-time*.8+irregular*4.;
        vec3 n=normalize(vec3(cos(a)*.025+cos(b)*.013,1.,cos(a)*.035-cos(b)*.009));
        vec3 eye=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(dot(eye,n),0.),3.);
        float glint=pow(max(dot(reflect(-normalize(vec3(-.6,1.,.3)),n),eye),0.),96.);
        vec3 colour=mix(vec3(.055,.19,.15),vec3(.012,.065,.08),1.-exp(-vDepth*.8));
        colour=mix(colour,vec3(.22,.36,.40),fresnel*.4);
        colour+=glint*.13;
        float streak=pow(.5+.5*sin(p.x*18.+sin(p.y*.8+time)*.6),24.)*pow(.5+.5*sin(p.y*2.4+time*2.),12.);
        colour+=vec3(.12,.22,.20)*streak*.06;
        colour*=.94+irregular*.12;
        float shore=(1.-smoothstep(.0,.15,vDepth))*(.6+.4*sin(p.x*9.+p.y*8.-time));
        colour=mix(colour,vec3(.66,.76,.66),shore*.34);
        if(depthMode) colour=mix(vec3(.30,.88,.80),vec3(.035,.14,.57),clamp(vDepth/5.,0.,1.));
        gl_FragColor=vec4(colour*(depthMode?1.:.58+.42*getShadowMask()),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    if (materialRef.current)
      materialRef.current.uniforms.depthMode.value = depthMode;
  }, [depthMode, material]);
  useFrame((_, delta) => {
    if (playing && materialRef.current)
      materialRef.current.uniforms.time.value += Math.min(delta, 0.05) * speed;
  });
  return (
    <mesh geometry={geometry} receiveShadow>
      <primitive ref={materialRef} object={material} attach="material" />
    </mesh>
  );
}
function Block({
  position,
  size,
  colour = "#c5c4b6",
  roughness = 0.82,
}: {
  position: [number, number, number];
  size: [number, number, number];
  colour?: string;
  roughness?: number;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={colour} roughness={roughness} />
    </mesh>
  );
}
function Bridge({ inputs, scene }: { inputs: Inputs; scene: Scene }) {
  const b = inputs.bridge,
    span = b.right - b.left,
    width = span + 2;
  const z = (scene.distances[1] + scene.distances[2]) / 2 - scene.length / 2;
  const centre = (b.left + b.right) / 2 - scene.centre,
    deck = b.deck - scene.datum;
  const support = (station: number, width: number, key: string) => {
    const bottom =
      Math.min(
        elevationAt(inputs.sections[1].points, station),
        elevationAt(inputs.sections[2].points, station),
      ) - scene.datum;
    const height = Math.max(0.05, b.soffit - scene.datum - bottom);
    return (
      <Block
        key={key}
        position={[station - scene.centre, bottom + height / 2, z]}
        size={[width, height, b.deckLength]}
        colour="#b4b4a7"
      />
    );
  };
  const roadWidth = Math.max(0.1, b.deckLength - 1.4),
    postCount = Math.min(80, Math.ceil(width / 1.8));
  return (
    <group>
      <Block
        position={[centre, (b.deck + b.soffit) / 2 - scene.datum, z]}
        size={[width, Math.max(0.02, b.deck - b.soffit), b.deckLength]}
      />
      <Block
        position={[centre, deck + 0.025, z]}
        size={[width, 0.045, roadWidth]}
        colour="#424c50"
        roughness={0.96}
      />
      {Array.from({ length: Math.min(100, Math.ceil(width / 4)) }, (_, i) => (
        <Block
          key={i}
          position={[centre - width / 2 + 1.2 + i * 4, deck + 0.051, z]}
          size={[Math.min(1.8, width / 2), 0.012, 0.08]}
          colour="#e4dfc5"
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Block
            position={[
              centre,
              deck + 0.08,
              z + side * (b.deckLength / 2 - 0.28),
            ]}
            size={[width, 0.16, 0.5]}
            colour="#d4d1bd"
          />
          <Block
            position={[
              centre,
              deck + 0.94,
              z + side * (b.deckLength / 2 - 0.14),
            ]}
            size={[width, 0.08, 0.075]}
            colour="#b5bdba"
            roughness={0.35}
          />
          <Block
            position={[
              centre,
              deck + 0.51,
              z + side * (b.deckLength / 2 - 0.14),
            ]}
            size={[width, 0.06, 0.06]}
            colour="#9da7a5"
            roughness={0.35}
          />
          <Block
            position={[centre, deck + 0.052, z + side * (roadWidth / 2 - 0.12)]}
            size={[width, 0.01, 0.07]}
            colour="#ece6cf"
          />
          {Array.from({ length: postCount + 1 }, (_, i) => (
            <Block
              key={i}
              position={[
                centre - width / 2 + (width * i) / postCount,
                deck + 0.53,
                z + side * (b.deckLength / 2 - 0.14),
              ]}
              size={[0.09, 0.9, 0.09]}
              colour="#99a4a1"
              roughness={0.4}
            />
          ))}
        </group>
      ))}
      {support(b.left - 0.5, 1, "left")}
      {support(b.right + 0.5, 1, "right")}
      {b.piers.map((p, i) => support(p.station, p.width, String(i)))}
    </group>
  );
}
function CameraRig({
  scene,
  inputs,
  view,
  fit,
}: {
  scene: Scene;
  inputs: Inputs;
  view: string;
  fit: number;
}) {
  const controls = useRef<Controls>(null);
  const { camera, size, invalidate } = useThree();
  const destination = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const close = view === "bridge" || view === "upstream";
  const height = Math.max(
    inputs.bridge.deck - scene.datum + 1.2,
    ...inputs.sections.flatMap((s) =>
      s.points.map((p) => p.elevation - scene.datum),
    ),
  );
  const targetX = close
    ? (inputs.bridge.left + inputs.bridge.right) / 2 - scene.centre
    : 0;
  const targetZ = close
    ? (scene.distances[1] + scene.distances[2]) / 2 - scene.length / 2
    : 0;
  const w = close ? inputs.bridge.right - inputs.bridge.left + 5 : scene.width;
  const l = close ? inputs.bridge.deckLength + 12 : scene.length;
  useEffect(() => {
    const target = new THREE.Vector3(targetX, height * 0.3, targetZ);
    const dir = new THREE.Vector3(
      ...((view === "plan"
        ? [0, 1, 0.0001]
        : view === "upstream"
          ? [0, 0.23, 1]
          : [1, 0.85, 1.05]) as [number, number, number]),
    ).normalize();
    const right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), dir)
        .normalize(),
      up = new THREE.Vector3().crossVectors(dir, right);
    const tanV = Math.tan(
      THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2),
    );
    let distance = 1;
    for (const x of [-w / 2, w / 2])
      for (const y of [-height * 0.3 - 1.8, height * 0.7])
        for (const z of [-l / 2, l / 2]) {
          const corner = new THREE.Vector3(x, y, z);
          distance = Math.max(
            distance,
            corner.dot(dir) +
              Math.max(
                Math.abs(corner.dot(right)) /
                  ((tanV * size.width) / size.height),
                Math.abs(corner.dot(up)) / tanV,
              ),
          );
        }
    destination.current = {
      position: target.clone().addScaledVector(dir, distance * 1.12),
      target,
    };
    invalidate();
  }, [
    view,
    fit,
    size.width,
    size.height,
    camera,
    w,
    l,
    height,
    targetX,
    targetZ,
    invalidate,
  ]);
  useFrame((_, delta) => {
    const dest = destination.current;
    if (!dest || !controls.current) return;
    const alpha = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      .matches
      ? 1
      : 1 - Math.exp(-delta * 8);
    camera.position.lerp(dest.position, alpha);
    controls.current.target.lerp(dest.target, alpha);
    controls.current.update();
    if (camera.position.distanceTo(dest.position) < 0.02)
      destination.current = null;
    else invalidate();
  });
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={2}
      maxDistance={Math.max(scene.length, scene.width) * 5}
      maxPolarAngle={Math.PI * 0.49}
      onStart={() => {
        destination.current = null;
      }}
    />
  );
}
function Capture({ capture }: { capture?: (url: string) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    if (capture) {
      gl.render(scene, camera);
      capture(gl.domElement.toDataURL("image/png"));
    }
  }, [capture, gl, scene, camera]);
  return null;
}
interface SceneProps {
  inputs: Inputs;
  result?: FlowResult;
  playing: boolean;
  speed: number;
  wireframe: boolean;
  capture?: (url: string) => void;
  view: string;
  fit?: number;
  water?: boolean;
  labels?: boolean;
  depthMode?: boolean;
  onTransition?: (active: boolean) => void;
}
export default function BridgeScene(props: SceneProps) {
  const target = useMemo(
    () => ({ inputs: props.inputs, result: props.result }),
    [props.inputs, props.result],
  );
  const { frame, active } = useSceneTransition(target, props.onTransition);
  return (
    <SceneView
      {...props}
      inputs={frame.inputs}
      result={frame.result}
      cameraInputs={props.inputs}
      capture={active ? undefined : props.capture}
    />
  );
}
function SceneView({
  inputs,
  result,
  playing,
  speed,
  wireframe,
  capture,
  view,
  fit = 0,
  water = true,
  labels = true,
  depthMode = false,
  cameraInputs,
}: {
  cameraInputs: Inputs;
  inputs: Inputs;
  result?: FlowResult;
  playing: boolean;
  speed: number;
  wireframe: boolean;
  capture?: (url: string) => void;
  view: string;
  fit?: number;
  water?: boolean;
  labels?: boolean;
  depthMode?: boolean;
}) {
  const scene = useMemo(
    () => sceneGeometry(inputs, result, false),
    [inputs, result],
  );
  const terrain = useMemo(() => sceneGeometry(cameraInputs), [cameraInputs]);
  const scale = Math.max(scene.length, scene.width),
    b = inputs.bridge;
  const z = (scene.distances[1] + scene.distances[2]) / 2 - scene.length / 2;
  const dimensionY = b.deck - scene.datum + 2.7;
  return (
    <Canvas
      data-rendered-water-level={result?.status === "ok" ? result.bridge[3]?.wsel : undefined}
      data-rendered-soffit={inputs.bridge.soffit}
      shadows="percentage"
      dpr={[1, 1.75]}
      frameloop={playing ? "always" : "demand"}
      camera={{
        position: [scale, scale * 0.7, scale],
        fov: 38,
        near: 0.1,
        far: Math.max(1000, scale * 15),
      }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
    >
      <color attach="background" args={["#15232c"]} />
      <hemisphereLight args={["#d5e9ee", "#6e6651", 1.4]} />
      <directionalLight
        position={[-scale * 0.45, scale * 0.9, scale * 0.3]}
        intensity={2.2}
        color="#fff2d9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-scale * 0.7}
        shadow-camera-right={scale * 0.7}
        shadow-camera-top={scale * 0.7}
        shadow-camera-bottom={-scale * 0.7}
        shadow-camera-far={scale * 3}
        shadow-normalBias={0.035}
        shadow-bias={-0.00015}
      />
      <directionalLight
        position={[scale * 0.4, scale * 0.35, -scale * 0.4]}
        intensity={0.8}
        color="#a3d7ec"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.85, 0]}
        receiveShadow
      >
        <planeGeometry args={[scale * 12, scale * 12]} />
        <meshStandardMaterial color="#172730" roughness={1} />
      </mesh>
      <Surface vertices={terrain.terrain} wireframe={wireframe} />
      <Surface vertices={terrain.sides} soil />
      {water && scene.water.length > 0 && (
        <Water
          scene={scene}
          playing={playing}
          speed={speed}
          depthMode={depthMode}
        />
      )}
      <Bridge inputs={inputs} scene={scene} />
      {labels && (
        <group>
          <Line
            points={[
              [b.left - scene.centre, dimensionY, z],
              [b.right - scene.centre, dimensionY, z],
            ]}
            color="#d5e6e8"
            lineWidth={1}
          />
          {[b.left, b.right].map((x) => (
            <Line
              key={x}
              points={[
                [x - scene.centre, dimensionY - 0.3, z],
                [x - scene.centre, dimensionY + 0.3, z],
              ]}
              color="#d5e6e8"
              lineWidth={1}
            />
          ))}
          <Html
            center
            position={[
              (b.left + b.right) / 2 - scene.centre,
              dimensionY + 0.7,
              z,
            ]}
            className="scene-label"
          >
            <span>{(b.right - b.left).toFixed(1)} m opening</span>
          </Html>
          <Html
            center
            position={[0, 1, scene.length / 2 + 2]}
            className="scene-label direction"
          >
            <span>UPSTREAM ↓</span>
          </Html>
          <Html
            center
            position={[0, 1, -scene.length / 2 - 2]}
            className="scene-label direction"
          >
            <span>↓ DOWNSTREAM</span>
          </Html>
        </group>
      )}
      <CameraRig scene={terrain} inputs={cameraInputs} view={view} fit={fit} />
      <Capture capture={capture} />
    </Canvas>
  );
}
