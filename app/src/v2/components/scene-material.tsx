"use client";
import { useEffect, useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import type { FlowResult } from "../model";
export type SurfaceKind = "ground" | "soil" | "asphalt" | "gravel";
const root = "/textures/bridge-studio/";
function useMaps(kind: SurfaceKind) {
  const name = kind === "ground" ? "grass" : kind;
  const loaded = useTexture([
    `${root}${name}-colour.webp`,
    `${root}${name}-normal.webp`,
    `${root}${name}-roughness.webp`,
    `${root}gravel-colour.webp`,
  ]);
  const maps = useMemo(
    () =>
      loaded.map((source, i) => {
        const map = source.clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = 8;
        map.colorSpace =
          i === 0 || i === 3 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        map.needsUpdate = true;
        return map;
      }),
    [loaded],
  );
  useEffect(() => () => maps.forEach((map) => map.dispose()), [maps]);
  return maps;
}
export function TexturedSurface({
  vertices,
  kind = "ground",
  wireframe = false,
  result,
  datum = 0,
  distances = [0, 1, 2, 3],
  vertical = false,
}: {
  vertices: number[];
  kind?: SurfaceKind;
  wireframe?: boolean;
  result?: FlowResult;
  datum?: number;
  distances?: number[];
  vertical?: boolean;
}) {
  const [colour, normal, roughness, soil] = useMaps(kind);
  const geometry = useMemo(() => {
    const raw = new THREE.BufferGeometry();
    raw.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    raw.computeVertexNormals();
    const normals = raw.getAttribute("normal"),
      uv: number[] = [];
    const scale =
      kind === "asphalt"
        ? 2.1
        : kind === "soil"
          ? 1.3
          : kind === "gravel"
            ? 2.9
            : 2;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i],
        y = vertices[i + 1],
        z = vertices[i + 2];
      uv.push(
        (vertical && Math.abs(normals.getX(i / 3)) > 0.5 ? z : x) / scale,
        (vertical ? y : z) / scale,
      );
    }
    raw.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    raw.deleteAttribute("normal");
    const merged = mergeVertices(raw);
    raw.dispose();
    merged.computeVertexNormals();
    return merged;
  }, [vertices, kind, vertical]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const uniforms = useMemo(
    () => ({
      waterLevels: { value: new THREE.Vector4(-10000, -10000, -10000, -10000) },
      reach: { value: new THREE.Vector4() },
      soilMap: { value: soil },
    }),
    [soil],
  );
  useEffect(() => {
    uniforms.reach.value.set(
      ...(distances.map((d) => d - distances[3] / 2) as [
        number,
        number,
        number,
        number,
      ]),
    );
    const levels =
      result?.status === "ok"
        ? result.bridge.map((s) => s.wsel - datum)
        : [-10000, -10000, -10000, -10000];
    uniforms.waterLevels.value.set(
      ...(levels as [number, number, number, number]),
    );
  }, [result, datum, distances, uniforms]);
  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        ref={material}
        map={colour}
        normalMap={normal}
        roughnessMap={roughness}
        normalScale={[0.5, 0.5]}
        roughness={kind === "asphalt" ? 0.85 : 1}
        color={kind === "soil" ? "#c8b9a0" : "#ffffff"}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        customProgramCacheKey={() => `bank-material-${kind}`}
        onBeforeCompile={(shader) => {
          if (kind !== "ground") return;
          Object.assign(shader.uniforms, uniforms);
          shader.vertexShader = shader.vertexShader
            .replace(
              "#include <common>",
              "#include <common>\nvarying vec3 vSite; varying float vSlope;",
            )
            .replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvSite=position;vSlope=normal.y;",
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              "#include <common>",
              `#include <common>
      varying vec3 vSite;varying float vSlope;uniform vec4 waterLevels;uniform vec4 reach;uniform sampler2D soilMap;
      float waterAt(float z){if(z<reach.y)return mix(waterLevels.x,waterLevels.y,clamp((z-reach.x)/(reach.y-reach.x),0.,1.));if(z<reach.z)return mix(waterLevels.y,waterLevels.z,(z-reach.y)/(reach.z-reach.y));return mix(waterLevels.z,waterLevels.w,clamp((z-reach.z)/(reach.w-reach.z),0.,1.));}`,
            )
            .replace(
              "#include <map_fragment>",
              `#include <map_fragment>
       vec3 dirt=texture2D(soilMap,vSite.xz/2.9).rgb;
       float variation=texture2D(map,vSite.xz/13.7).g;
       float above=vSite.y-waterAt(vSite.z);
       float grass=smoothstep(.15,1.5,above+variation*.5)*smoothstep(.56,.92,vSlope);
       vec2 shiftedUV=mat2(.8,.6,-.6,.8)*vSite.xz/2.7+vec2(3.17,8.41);
       vec3 shiftedGrass=texture2D(map,shiftedUV).rgb;
       vec3 vegetation=mix(diffuseColor.rgb,shiftedGrass,.35+variation*.3);
       diffuseColor.rgb=mix(dirt*.95,vegetation*vec3(.92,1.08,.88),grass);
       diffuseColor.rgb*=.85+variation*.4;
       diffuseColor.rgb*=mix(.62,1.,smoothstep(-.1,.5,above));`,
            );
        }}
      />
    </mesh>
  );
}
