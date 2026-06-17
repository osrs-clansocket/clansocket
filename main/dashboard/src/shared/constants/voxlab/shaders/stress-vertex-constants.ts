export const STRESS_VERTEX_PROLOGUE = `
uniform vec3 uMousePos;
uniform float uStress;
uniform float uTime;
uniform float uStressRadius;
varying float vHmsFalloff;
varying vec3 vHmsWorldPos;
`;

export const STRESS_VERTEX_DISPLACEMENT = `
vec3 hms_worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
vHmsWorldPos = hms_worldPos;
float hms_dist = length(hms_worldPos.xy - uMousePos.xy);
float hms_falloff = smoothstep(uStressRadius, 0.0, hms_dist);
vHmsFalloff = hms_falloff;
float hms_t = uTime * 9.0;
float hms_jitter = sin(hms_t + position.x * 28.0) * cos(hms_t * 1.3 + position.y * 22.0);
float hms_shock = sin(hms_t * 2.7 + position.z * 60.0) * 0.4;
float hms_displacement = hms_falloff * uStress * (0.035 + 0.045 * hms_jitter + 0.025 * hms_shock);
transformed += normal * hms_displacement;
`;
