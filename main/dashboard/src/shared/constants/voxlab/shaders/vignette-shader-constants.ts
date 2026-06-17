import { Color } from "three";

export const VIGNETTE_SHADER = {
    uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0 },
        color: { value: new Color(0, 0, 0) },
    },
    vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float amount;
        uniform vec3 color;
        varying vec2 vUv;
        void main() {
            vec4 src = texture2D(tDiffuse, vUv);
            float dist = distance(vUv, vec2(0.5));
            float mask = smoothstep(0.0, 1.0, dist * amount * 1.4142);
            vec3 mixed = mix(src.rgb, color, clamp(mask, 0.0, 1.0));
            gl_FragColor = vec4(mixed, src.a);
        }
    `,
};
