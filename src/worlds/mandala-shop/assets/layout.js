// Seeded by tmp/mandala-shop/build.py; maintained by curator mode (src/core/curator.js).
// Coordinates are Blender Z-up meters; convert to Three.js with (x, y, z)_three = (x, z, -y)_blender. yaw in degrees.
globalThis.MANDALA_SHOP_LAYOUT = {
 "artDir": "assets/art/",
 "railZ": 3,
 "kit": {
  "walnut": {
   "color": "#1c110a",
   "metal": 0,
   "rough": 0.5,
   "borderScale": 1
  },
  "oak": {
   "color": "#6b4523",
   "metal": 0,
   "rough": 0.6,
   "borderScale": 1
  },
  "black": {
   "color": "#0a0a0a",
   "metal": 0.6,
   "rough": 0.4,
   "borderScale": 0.5
  },
  "gold": {
   "color": "#d99f38",
   "metal": 1,
   "rough": 0.2,
   "borderScale": 1
  }
 },
 "slots": [
  {
   "id": "hero",
   "art": "1E904D16-E681-4961-B6E0-C57C0C9D0AA6.jpg",
   "kind": "wall",
   "pos": [
    -5.94,
    0,
    2.6
   ],
   "yaw": 90,
   "w": 2.6,
   "h": 2.6,
   "style": "walnut"
  },
  {
   "id": "kraft2b",
   "art": "20180923_001859-1.jpg",
   "kind": "wall",
   "pos": [
    -5.94,
    1.85,
    1.2
   ],
   "yaw": 90,
   "w": 0.5,
   "h": 0.5,
   "style": "oak"
  },
  {
   "id": "trip_a",
   "art": "20230402_012714.jpg",
   "kind": "wall",
   "pos": [
    -2.75,
    4.44,
    2.5
   ],
   "yaw": 0,
   "w": 0.7,
   "h": 2.1,
   "style": "black",
   "slice": [
    0,
    3
   ],
   "group": "trip"
  },
  {
   "id": "trip_b",
   "art": "20230402_012714.jpg",
   "kind": "wall",
   "pos": [
    -1.9,
    4.44,
    2.5
   ],
   "yaw": 0,
   "w": 0.7,
   "h": 2.1,
   "style": "black",
   "slice": [
    1,
    3
   ],
   "group": "trip"
  },
  {
   "id": "trip_c",
   "art": "20230402_012714.jpg",
   "kind": "wall",
   "pos": [
    -1.05,
    4.44,
    2.5
   ],
   "yaw": 0,
   "w": 0.7,
   "h": 2.1,
   "style": "black",
   "slice": [
    2,
    3
   ],
   "group": "trip"
  },
  {
   "id": "ornate_big",
   "art": "IMG_0061.jpg",
   "kind": "wall",
   "pos": [
    0.95,
    4.44,
    2.45
   ],
   "yaw": 0,
   "w": 1.9,
   "h": 1.9,
   "style": "walnut"
  },
  {
   "id": "inksun",
   "art": "20180803_202305_Burst01.jpg",
   "kind": "wall",
   "pos": [
    2.6,
    4.44,
    1.5
   ],
   "yaw": 0,
   "w": 0.85,
   "h": 0.85,
   "style": "walnut"
  },
  {
   "id": "inkstar",
   "art": "IMG_20200213_234107_441.jpg",
   "kind": "wall",
   "pos": [
    2.55,
    4.44,
    2.55
   ],
   "yaw": 0,
   "w": 0.6,
   "h": 0.6,
   "style": "oak"
  },
  {
   "id": "kraft1b",
   "art": "20180921_230021-1.jpg",
   "kind": "wall",
   "pos": [
    3.38,
    4.44,
    1.9
   ],
   "yaw": 0,
   "w": 0.5,
   "h": 0.5,
   "style": "oak"
  },
  {
   "id": "blank_n_hi",
   "art": null,
   "kind": "wall",
   "pos": [
    3.3,
    4.44,
    2.7
   ],
   "yaw": 0,
   "w": 0.4,
   "h": 0.4,
   "style": "black"
  },
  {
   "id": "green_big",
   "art": "Mandala_13.png",
   "kind": "wall",
   "pos": [
    -2.8,
    -4.44,
    2.35
   ],
   "yaw": 180,
   "w": 1.5,
   "h": 1.5,
   "style": "walnut"
  },
  {
   "id": "kraft_a",
   "art": "20180921_230021-1.jpg",
   "kind": "wall",
   "pos": [
    -1.15,
    -4.44,
    1.42
   ],
   "yaw": 180,
   "w": 0.55,
   "h": 0.55,
   "style": "oak"
  },
  {
   "id": "kraft_b",
   "art": "20180923_001859-1.jpg",
   "kind": "wall",
   "pos": [
    -0.45,
    -4.44,
    1.42
   ],
   "yaw": 180,
   "w": 0.55,
   "h": 0.55,
   "style": "oak"
  },
  {
   "id": "kraft_c",
   "art": "IMG_20181010_232108_857.jpg",
   "kind": "wall",
   "pos": [
    0.25,
    -4.44,
    1.42
   ],
   "yaw": 180,
   "w": 0.55,
   "h": 0.55,
   "style": "oak"
  },
  {
   "id": "compass2",
   "art": "Mandala_14a.png",
   "kind": "wall",
   "pos": [
    -0.45,
    -4.44,
    2.45
   ],
   "yaw": 180,
   "w": 0.8,
   "h": 0.8,
   "style": "gold"
  },
  {
   "id": "vintage",
   "art": "Mandala.jpg",
   "kind": "cord",
   "pos": [
    1.3,
    -4.4,
    1.85
   ],
   "yaw": 180,
   "w": 1.1,
   "h": 1.1,
   "style": "walnut"
  },
  {
   "id": "sepia",
   "art": "IMG_20200224_232952_079.jpg",
   "kind": "cord",
   "pos": [
    2.45,
    -4.4,
    1.5
   ],
   "yaw": 180,
   "w": 0.75,
   "h": 0.75,
   "style": "gold"
  },
  {
   "id": "peacock2",
   "art": "1E904D16-E681-4961-B6E0-C57C0C9D0AA6.jpg",
   "kind": "wall",
   "pos": [
    2.9,
    -4.44,
    2.75
   ],
   "yaw": 180,
   "w": 0.85,
   "h": 0.85,
   "style": "black"
  },
  {
   "id": "night_whole",
   "art": "20230402_012714.jpg",
   "kind": "wall",
   "pos": [
    4.96,
    3.46,
    1.8
   ],
   "yaw": -45,
   "w": 1.3,
   "h": 1.3,
   "style": "gold"
  },
  {
   "id": "vintage2",
   "art": "Mandala.jpg",
   "kind": "wall",
   "pos": [
    -4.96,
    3.46,
    1.75
   ],
   "yaw": 45,
   "w": 1.1,
   "h": 1.1,
   "style": "oak"
  },
  {
   "id": "inksun2",
   "art": "20180803_202305_Burst01.jpg",
   "kind": "wall",
   "pos": [
    -4.96,
    -3.46,
    1.75
   ],
   "yaw": 135,
   "w": 1,
   "h": 1,
   "style": "black"
  },
  {
   "id": "inkstar2",
   "art": "IMG_20200213_234107_441.jpg",
   "kind": "wall",
   "pos": [
    4.96,
    -3.46,
    1.75
   ],
   "yaw": -135,
   "w": 0.6,
   "h": 0.6,
   "style": "walnut"
  },
  {
   "id": "kraft3b",
   "art": "IMG_20181010_232108_857.jpg",
   "kind": "wall",
   "pos": [
    5.94,
    1.75,
    1.5
   ],
   "yaw": -90,
   "w": 0.6,
   "h": 0.6,
   "style": "oak"
  },
  {
   "id": "compass",
   "art": "Mandala_14a.png",
   "kind": "wall",
   "pos": [
    5.94,
    1.7,
    2.5
   ],
   "yaw": -90,
   "w": 0.9,
   "h": 0.9,
   "style": "gold"
  },
  {
   "id": "ornate2",
   "art": "IMG_0061.jpg",
   "kind": "wall",
   "pos": [
    5.94,
    -1.85,
    1.55
   ],
   "yaw": -90,
   "w": 0.75,
   "h": 0.75,
   "style": "walnut"
  },
  {
   "id": "sepia2",
   "art": "IMG_20200224_232952_079.jpg",
   "kind": "wall",
   "pos": [
    5.94,
    -1.8,
    2.45
   ],
   "yaw": -90,
   "w": 0.7,
   "h": 0.7,
   "style": "walnut"
  },
  {
   "id": "easel_green",
   "art": "Mandala_13.png",
   "kind": "easel",
   "pos": [
    3.486321210861206,
    -2.6854093074798584,
    1.100000023841858
   ],
   "yaw": -136.8,
   "w": 0.85,
   "h": 0.85,
   "style": "walnut"
  },
  {
   "id": "lean_0",
   "art": null,
   "kind": "lean",
   "pos": [
    -5.71999979019165,
    -1.899999976158142,
    0.4018000066280365
   ],
   "yaw": 90,
   "w": 0.72,
   "h": 0.72,
   "style": "oak"
  },
  {
   "id": "lean_1",
   "art": null,
   "kind": "lean",
   "pos": [
    -5.630000114440918,
    -1.7400000095367432,
    0.33320000767707825
   ],
   "yaw": 90,
   "w": 0.58,
   "h": 0.58,
   "style": "oak"
  }
 ]
};
