import * as THREE from "three";

/**
 * Abilita occlusione real-world su materiali standard (MeshStandardMaterial, MeshPhysicalMaterial, ecc.)
 * - Usa depth reale CPU (XRCPUDepthInformation) caricata in DataTexture RG8
 * - Confronta con depth virtuale direttamente nello shader usando gl_FragCoord.z
 */
export function enableXROcclusionOnMaterial(material, core) {
  if (!material || !material.isMaterial) return material;
  // Guard: evita doppio patch shader sullo stesso materiale.
  if (material.userData?.xrOccEnabled) return material;

  // Uniform condivise tra JS runtime e shader patchato.
  // Nota: vengono aggiornate ogni frame da handlerAROcclusion.
  const uniforms = {
    uDepthTex: { value: null },                    // THREE.DataTexture RG (low/high bytes)
    uViewport: { value: new THREE.Vector2(1, 1) }, // drawingBuffer size in px
    uOccEnable: { value: 1.0 },
    uHasDepth: { value: 0.0 },
    uNear: { value: 0.05 },
    uFar: { value: 20.0 },
    uRawToMeters: { value: 1.0 },                  // depthInfo.rawValueToMeters
    uDepthUvTransform: { value: new THREE.Matrix4() },
    uUseDepthUvTransform: { value: 0.0 },
    uModelScale: { value: new THREE.Vector3(1, 1, 1) },
  };

  material.userData.xrOccEnabled = true;
  material.userData.xrOccUniforms = uniforms;

  // Registra il materiale nel runtime manager che aggiorna le uniform per-frame.
  core.registerOcclusionMaterial?.(material);
  
  material.onBeforeCompile = (shader) => {
    // Attach uniform custom al programma compilato del materiale.
    shader.uniforms.uDepthTex = uniforms.uDepthTex;
    shader.uniforms.uViewport = uniforms.uViewport;
    shader.uniforms.uOccEnable = uniforms.uOccEnable;
    shader.uniforms.uHasDepth = uniforms.uHasDepth;
    shader.uniforms.uNear = uniforms.uNear;
    shader.uniforms.uFar = uniforms.uFar;
    shader.uniforms.uRawToMeters = uniforms.uRawToMeters;
    shader.uniforms.uDepthUvTransform = uniforms.uDepthUvTransform;
    shader.uniforms.uUseDepthUvTransform = uniforms.uUseDepthUvTransform;
    shader.uniforms.uModelScale = uniforms.uModelScale;

    const inject = `
      uniform sampler2D uDepthTex;
      uniform vec2 uViewport;
      uniform float uOccEnable;
      uniform float uHasDepth;
      uniform float uNear;
      uniform float uFar;
      uniform float uRawToMeters;
      uniform mat4 uDepthUvTransform;
      uniform float uUseDepthUvTransform;
      uniform vec3 uModelScale;

      // Decodifica depth reale da texture RG8: R=low byte, G=high byte
      float readRealDepthMeters(vec2 uv) {
        vec4 t = texture2D(uDepthTex, uv);
        float lo = floor(t.r * 255.0 + 0.5);
        float hi = floor(t.g * 255.0 + 0.5);
        float raw16 = hi * 256.0 + lo;
        return raw16 * uRawToMeters;
      }

      //float perspectiveDepthToViewZ(const in float fragCoordZ, const in float near, const in float far) {
        //return (near * far) / ((far - near) * fragCoordZ - far);
      //}

      //float xrFragDepthToMeters(const in float fragCoordZ, const in float near, const in float far) {
        //return max(0.0, -perspectiveDepthToViewZ(fragCoordZ, near, far));
      //}

      vec2 toDepthUv(vec2 uvView) {
        if (uUseDepthUvTransform < 0.5) {
          // Fallback per device che non espongono normDepthBufferFromNormView
          return uvView;
        }
        vec4 p = uDepthUvTransform * vec4(uvView, 0.0, 1.0);
        return p.xy / max(p.w, 1e-6);
      }

      bool isValidDepthValue(float d) {
        return d > 0.0001 && d <= (uFar * 1.5);
      }
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      inject + "\nvoid main() {"
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
        // === XR REAL-WORLD OCCLUSION (CPU depth -> DataTexture) ===
        // Se depth reale non e disponibile, non fa discard e renderizza normale.
        if (uOccEnable > 0.5 && uHasDepth > 0.5) {

          vec2 uv = gl_FragCoord.xy / uViewport;
          vec2 uvView = vec2(uv.x, 1.0 - uv.y);
          vec2 uvDepth = toDepthUv(uvView);
          uvDepth = clamp(uvDepth, vec2(0.0), vec2(1.0));

          float realM = readRealDepthMeters(uvDepth);

          if (isValidDepthValue(realM)) {
            // Distanza frammento virtuale dalla camera in metri (view-space length).
            float virtualM = length(vViewPosition);

            float eps = 0.02; // 1cm per partire (quando il modello è piccolo)
            // Se reale e piu vicino della geometria virtuale, nasconde pixel virtuale.
            if (realM < virtualM - eps) discard;
          }

        }

        #include <opaque_fragment>
      `
    );
  };

  material.needsUpdate = true;
  return material;
}
