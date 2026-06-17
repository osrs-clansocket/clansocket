export const STRESS_FRAGMENT_PROLOGUE = `
uniform float uStress;
uniform float uTime;
uniform vec3 uGoldColor;
varying float vHmsFalloff;
varying vec3 vHmsWorldPos;
`;

export const STRESS_FRAGMENT_CHROMATIC = `
vec2 hms_cellSize = vec2(0.018);
vec2 hms_cell = floor(vHmsWorldPos.xy / hms_cellSize);
float hms_frame = floor(uTime * 28.0);

vec2 hms_seedR = hms_cell + vec2(hms_frame, 0.0);
vec2 hms_seedC = hms_cell + vec2(0.0, hms_frame * 1.17);
vec2 hms_seedJ = hms_cell + vec2(hms_frame * 0.71, hms_frame * 0.43);
float hms_redRand = fract(sin(dot(hms_seedR, vec2(127.1, 311.7))) * 43758.5453);
float hms_cyanRand = fract(sin(dot(hms_seedC, vec2(269.5, 183.3))) * 43758.5453);
float hms_jitter = fract(sin(dot(hms_seedJ, vec2(419.2, 371.9))) * 43758.5453);
float hms_redBand = step(0.72, hms_redRand);
float hms_cyanBand = step(0.72, hms_cyanRand);
float hms_speckle = step(0.93, hms_jitter);
vec3 hms_chroma = vec3(hms_redBand * 1.1, hms_cyanBand * 0.35, hms_cyanBand * 1.0);
vec3 hms_glow = uGoldColor * vHmsFalloff;
vec3 hms_white = vec3(hms_speckle);
vec3 hms_surfaceFx = (hms_chroma * 0.55 + hms_white * 0.45 + hms_glow * 0.6) * vHmsFalloff;

vec3 hms_V = normalize(vViewPosition);
float hms_fresnel = 1.0 - max(dot(normal, hms_V), 0.0);
float hms_edge = pow(hms_fresnel, 2.2);

vec2 hms_silSeedR = hms_cell + vec2(hms_frame * 0.83, hms_frame * 1.5);
vec2 hms_silSeedB = hms_cell + vec2(hms_frame * 2.1, hms_frame * 0.37);
vec2 hms_silSeedW = hms_cell + vec2(hms_frame * 1.27, hms_frame * 0.91);
float hms_silRedRand = fract(sin(dot(hms_silSeedR, vec2(127.1, 311.7))) * 43758.5453);
float hms_silBlueRand = fract(sin(dot(hms_silSeedB, vec2(269.5, 183.3))) * 43758.5453);
float hms_silWhiteRand = fract(sin(dot(hms_silSeedW, vec2(419.2, 371.9))) * 43758.5453);
float hms_silRedBlock = step(0.55, hms_silRedRand);
float hms_silBlueBlock = step(0.55, hms_silBlueRand);
float hms_silWhiteBlock = step(0.92, hms_silWhiteRand);

vec3 hms_silGlitch = vec3(
    hms_silRedBlock * 1.1 + hms_silWhiteBlock,
    hms_silWhiteBlock,
    hms_silBlueBlock * 1.0 + hms_silWhiteBlock
) * hms_edge;

gl_FragColor.rgb += hms_surfaceFx * uStress + hms_silGlitch * uStress * 0.9;
`;
