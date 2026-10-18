# Offline surveillance media

Both scenes are fictional, empty environments created with the built-in image generation tool on 2026-10-18. No footage of real people, devices, organizations, or locations is used.

- `warehouse-source.png`: high-corner wide-angle CCTV view of an empty industrial warehouse, steel shelves, cartons, loading door, concrete floor, ordinary fluorescent lighting; no people, logos, text or overlays.
- `server-source.png`: high-corner wide-angle CCTV view of an empty generic server room, dark racks, status lights, ceiling cable trays and tiled floor; no people, logos, text or overlays.
- `warehouse-sub.webm`, `server-sub.webm`: 480 × 270 lower-bandwidth versions for the auxiliary stream option.
- `warehouse.webm`, `server.webm`: 6-second, 960 × 540, 12 FPS loops encoded from the corresponding generated stills with subtle time-varying sensor noise and exposure fluctuation. These are ambient loops, not recordings of physical movement. These remain the empty-channel sources.

The generated source images were visually inspected before encoding. Digital PTZ in the app is a bounded crop of these images. It does not simulate a full 3D camera rotation. Night vision is a display filter.

Reproduction command (replace INPUT and OUTPUT with the scene filenames):

```sh
ffmpeg -loop 1 -i INPUT -vf "scale=960:540,noise=alls=3:allf=t+u,eq=brightness='0.004*sin(t*2)':eval=frame" -t 6 -r 12 -an -c:v libvpx-vp9 -b:v 420k OUTPUT
```

## Activity channels

- `loading.webm`: 12-second warehouse loading-area loop. A drawn parcel trolley with carton faces, wheels and shadow moves across the floor; encoded at 960 × 540 / 12 FPS. The trolley is a composited scene object, not footage from a real warehouse.
- `corridor.webm`: 10-second cropped equipment-aisle view derived from the server-room source, with separate framing, exposure and sensor grain. This is an empty environment channel.
- The grid combines two empty rooms, an activity channel and a separate equipment-aisle framing. A bounded infrared discovery overlay is triggered only by selecting channel 4, zooming and enabling IR.

## Offline world outline

`world.svg` is an equirectangular rendering of the public-domain Natural Earth 1:110m land dataset from [the Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson). The vector is bundled locally; no map service is used.

## Safari / iOS video compatibility

`warehouse.mp4`, `server.mp4`, `loading.mp4` and `corridor.mp4` are H.264 (libx264 CRF 26, yuv420p, faststart, no audio) transcodes of the corresponding WebM assets. They preserve the same frame dimensions, activity and duration. The camera view selects MP4 when the browser advertises H.264 support, otherwise it retains WebM. All playback remains muted and inline; no device permissions or external video hosting are used.

```sh
ffmpeg -i INPUT.webm -c:v libx264 -crf 26 -preset medium -pix_fmt yuv420p -movflags +faststart -an OUTPUT.mp4
```
