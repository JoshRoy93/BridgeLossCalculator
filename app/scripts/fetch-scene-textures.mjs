import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
const output = new URL("../public/textures/bridge-studio/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const assets = [
  ["leafy_grass", "grass"],
  ["brown_mud_leaves_01", "soil"],
  ["clean_asphalt", "asphalt"],
  ["river_small_rocks", "gravel"],
];
const manifest = [];
for (const [id, name] of assets) {
  const response = await fetch("https://api.polyhaven.com/files/" + id);
  if (!response.ok) throw new Error(`Metadata ${id}: ${response.status}`);
  const files = await response.json();
  for (const [map, suffix] of [
    ["Diffuse", "colour"],
    ["nor_gl", "normal"],
    ["Rough", "roughness"],
  ]) {
    const source = files[map]["1k"].jpg;
    const download = await fetch(source.url);
    if (!download.ok) throw new Error(`Texture ${id}: ${download.status}`);
    const bytes = Buffer.from(await download.arrayBuffer());
    if (createHash("md5").update(bytes).digest("hex") !== source.md5)
      throw new Error("Source checksum mismatch");
    const converted = await sharp(bytes)
      .webp({ quality: suffix === "normal" ? 88 : 82 })
      .toBuffer();
    const file = `${name}-${suffix}.webp`;
    await fs.writeFile(new URL(file, output), converted);
    manifest.push({
      file,
      asset: id,
      source: source.url,
      licence: "CC0-1.0",
      bytes: converted.length,
      sha256: createHash("sha256").update(converted).digest("hex"),
    });
  }
}
await fs.writeFile(
  new URL("sources.json", output),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    files: manifest.length,
    bytes: manifest.reduce((n, f) => n + f.bytes, 0),
  }),
);
