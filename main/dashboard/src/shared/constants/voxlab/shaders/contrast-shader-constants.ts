export const CONTRAST_SHADER = {
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
            vec4 src = texture2D(tDiffuse, vUv);
            vec3 adjusted = (src.rgb - 0.5) * (1.0 + amount) + 0.5;
            gl_FragColor = vec4(adjusted, src.a);
        }
    `,
};
