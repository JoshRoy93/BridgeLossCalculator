# Bridge studio textures

These texture maps are CC0 assets from Poly Haven. They are bundled locally; the running app does not contact the asset provider.

| Local files | Asset | Author |
| --- | --- | --- |
| `grass-*.webp` | [Leafy Grass](https://polyhaven.com/a/leafy_grass) | Charlotte Baglioni |
| `soil-*.webp` | [Brown Mud Leaves 01](https://polyhaven.com/a/brown_mud_leaves_01) | Rob Tuytel |
| `gravel-*.webp` | [River Small Rocks](https://polyhaven.com/a/river_small_rocks) | Rob Tuytel; minor adjustment by Rico Cilliers |
| `asphalt-*.webp` | [Clean Asphalt](https://polyhaven.com/a/clean_asphalt) | Dimitrios Savva |

Licence: [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/).

The source 1K JPEG colour, OpenGL normal and roughness maps were converted to WebP. `sources.json` records the exact source URLs and SHA-256 hashes of the bundled files. `app/scripts/fetch-scene-textures.mjs` reproduces the download and conversion using Sharp, supplied by the installed Next.js toolchain.
