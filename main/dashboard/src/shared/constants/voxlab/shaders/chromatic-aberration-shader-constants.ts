export const CHROMATIC_ABERRATION_SHADER = {
    uniforms: {
        tDiffuse: { value: null },
        amount: { value: 0 },
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
        varying vec2 vUv;
        void main() {
            vec2 offset = (vUv - vec2(0.5)) * amount * 0.02;
            float r = texture2D(tDiffuse, vUv + offset).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset).b;
            float a = texture2D(tDiffuse, vUv).a;
            gl_FragColor = vec4(r, g, b, a);
        }
    `,
};
