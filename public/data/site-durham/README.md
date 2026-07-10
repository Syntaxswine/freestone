# site-durham — real terrain for the Durham peninsula map

`heightmap.json` is a 500×500 grid of real elevations (meters above Ordnance
Datum) covering a 4 km × 4 km box centered on the Durham cathedral peninsula.
It is derived from Environment Agency 1 m LiDAR and is the committed artifact;
the raw source rasters live in `data/raw/` (gitignored, re-fetchable).

## Provenance

| | |
|---|---|
| **Source dataset** | Environment Agency **LIDAR Composite Digital Terrain Model (DTM) — 1 m** (latest rolling composite; surveys June 2000 – April 2022; vertical accuracy ±15 cm RMSE), dataset id `13787b9a-26a4-4775-8523-806d13af58fc` on the Defra Data Services Platform: <https://environment.data.gov.uk/dataset/13787b9a-26a4-4775-8523-806d13af58fc> |
| **Access route** | The dataset's OGC **WCS 2.0.1** endpoint (GeoServer) — programmatic, keyless, accepts arbitrary EPSG:27700 bbox subsets: `https://environment.data.gov.uk/spatialdata/lidar-composite-digital-terrain-model-dtm-1m/wcs` with `request=GetCoverage&coverageId=13787b9a-26a4-4775-8523-806d13af58fc__Lidar_Composite_Elevation_DTM_1m&subset=E(min,max)&subset=N(min,max)&format=image/tiff&compression=None` (uncompressed float32 GeoTIFF, parsed by a minimal no-deps reader in the tool). The same composite is offered as 5 km tile zips by the Survey Data Download portal (<https://environment.data.gov.uk/survey>); the WCS route needs no portal interaction. |
| **Downloaded** | 2026-07-09, four 2 km × 2 km GetCoverage chunks → `data/raw/durham-dtm1m/*.tif` (4 × 16.8 MB ≈ 67 MB) |
| **License** | [Open Government Licence v3.0](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/) |
| **Attribution (required, verbatim)** | © Environment Agency copyright and/or database right 2022. All rights reserved. |

## Extent and grid

- **CRS:** EPSG:27700 (OSGB36 / British National Grid), elevations in meters AOD
- **bbox:** `[425420, 540150, 429420, 544150]` — 4000 m square centered on
  E 427420, N 542150 (NGR **NZ 2742 4215**, Palace Green between cathedral and
  castle). WGS84 corners ≈ `[-1.606547, 54.75544, -1.543993, 54.791602]`.
  (The nominal WGS84 center 54.7756 N, −1.5763 E converts to E 427353, N 542380
  — ~230 m north of the NGR center; both are well inside the box. Conversion
  done by the tool's own OS Transverse-Mercator + Helmert implementation.)
- **Grid:** 500 × 500 cells of **8 m** — each cell is the plain average of an
  8×8 block of 1 m LiDAR pixels (0 nodata pixels in this box).
- **Layout:** row-major, **row 0 = north edge** (`rowOrder` field). Cell
  `(row, col)` has center `E = 425420 + (col + 0.5)·8`,
  `N = 544150 − (row + 0.5)·8`; value at `elevations[row·500 + col]`.

## Sanity checks (2026-07-09 run)

- Palace Green (427420, 542150): **62.55 m** · cathedral nave (427375, 542110): **63.82 m** — peninsula top in the expected 60–100 m band
- River Wear: Prebends Bridge (427150, 542060) **30.33 m** · Framwellgate Bridge (427180, 542480) **38.02 m** · Elvet Bridge (427680, 542470) **35.33 m** — in the expected 25–40 m band
- Whole grid: min 23.39 m (Wear leaving the box to the north), max 115.58 m
- W→E transect at N 542100 shows the incised meander both sides of the
  peninsula (gorge ≈ 30 m — peninsula ≈ 64 m — gorge ≈ 31 m):

```
E 426900 → 427900, one value per 40 m:
 63 66 68 70 70 58 31 30 33 62 64 64 64 62 59 52 37 31 39 47 46 48 47 46 46 47
                  └─gorge─┘ └───peninsula────┘ └gorge┘
```

## Regenerate

```
node tools/fetch-terrain.mjs          # uses cached raw chunks if present
node tools/fetch-terrain.mjs --force  # re-download raw chunks
```

The tool (no npm deps, Node ≥ 18) re-downloads whatever is missing from
`data/raw/durham-dtm1m/`, mosaics, block-averages 1 m → 8 m, rewrites
`heightmap.json` (~1.5 MB), and re-prints the sanity checks above. The header
comment in `tools/fetch-terrain.mjs` documents the endpoint pattern and the
OS Terrain 50 fallback (not needed).
