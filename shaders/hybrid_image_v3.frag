// Author:CMH
// update:tsuyi

// Step1: Load the first image and apply a low-pass filter. 讀取圖片1，添加低通濾波(遠距離)
// Step2: Recursively applying a frame buffer can enhance the blur effect. 添加frame buffer機制，增強blur效果
// Step3: Load the second image and apply a high-pass filter. 讀取圖片2，添加高通濾波(近距離)
// Step4: Combine the two filtered images and fine-tune the result. 融合兩圖片並微調

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform sampler2D u_tex0; // High-pass source (near image)
uniform sampler2D u_tex1; // Low-pass source (far image)
uniform sampler2D u_mask; // Masking pattern texture (e.g. paper grain, cloud)

void main() {
    
    // 1.Coordinate setup //
    vec2 st = gl_FragCoord.xy / u_resolution.xy;    
    vec2 uv = st; //[0~1]
    vec2 mouse= u_mouse.xy / u_resolution.xy;
    vec2 texel = 1.0 / u_resolution.xy;


    // 2.Define Multi-scale Gaussian kernels //
    float kernelSmall[9];
    kernelSmall[0] = 1.0/16.0; kernelSmall[1] = 2.0/16.0; kernelSmall[2] = 1.0/16.0;
    kernelSmall[3] = 2.0/16.0; kernelSmall[4] = 4.0/16.0; kernelSmall[5] = 2.0/16.0;
    kernelSmall[6] = 1.0/16.0; kernelSmall[7] = 2.0/16.0; kernelSmall[8] = 1.0/16.0;

    float kernelLarge[9];
    kernelLarge[0] = 1.0/64.0; kernelLarge[1] = 6.0/64.0; kernelLarge[2] = 1.0/64.0;
    kernelLarge[3] = 6.0/64.0; kernelLarge[4] = 36.0/64.0; kernelLarge[5] = 6.0/64.0;
    kernelLarge[6] = 1.0/64.0; kernelLarge[7] = 6.0/64.0; kernelLarge[8] = 1.0/64.0;

    vec2 offset[9];
    offset[0] = vec2(-1, -1);
    offset[1] = vec2( 0, -1);
    offset[2] = vec2( 1, -1);
    offset[3] = vec2(-1,  0);
    offset[4] = vec2( 0,  0);
    offset[5] = vec2( 1,  0);
    offset[6] = vec2(-1,  1);
    offset[7] = vec2( 0,  1);
    offset[8] = vec2( 1,  1);


    // 3.Step1: Low-pass filter (for far-distance image u_tex1) //
    vec3 blurSmall = vec3(0.0);
    vec3 blurLarge = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        vec2 sampleUV = uv + offset[i] * texel;
        blurSmall += texture2D(u_tex1, sampleUV).rgb * kernelSmall[i];
        blurLarge += texture2D(u_tex1, sampleUV).rgb * kernelLarge[i];
    }
    vec3 lowpass = 0.5 * blurSmall + 0.5 * blurLarge;// Combine small and large kernels to simulate multi-pass blur
  

    // 4.Step3: High-pass filter (for near-distance image u_tex0) //
    float strength = 1.5; // Increase this value for even stronger effect
    float kernel[9];
    kernel[0] = -1.0 * strength; kernel[1] = -1.0 * strength; kernel[2] = -1.0 * strength;
    kernel[3] = -1.0 * strength; kernel[4] =  8.0 * strength; kernel[5] = -1.0 * strength;
    kernel[6] = -1.0 * strength; kernel[7] = -1.0 * strength; kernel[8] = -1.0 * strength;
    vec3 highpass = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        vec2 sampleUV = uv + offset[i] * texel;
        highpass += texture2D(u_tex0, sampleUV).rgb * kernel[i];
    }

    vec3 mask = texture2D(u_mask, uv).rgb; // 取得遮罩紋理
    float maskWeight = 1.0 - mouse.x; // 畫面x向控制：遠距離融合為背景噪音，近距離減弱高頻清晰感
    highpass = mix(highpass, highpass * mask, maskWeight); // 應用遮罩紋理


    // 5.Step4: Combine filtered results (hybrid fusion, threshold-based)
    float luminance = dot(texture2D(u_tex0, uv).rgb, vec3(0.299,0.587,0.114));
    float edgeMask = smoothstep(0.4, 0.6, luminance);
    vec3 hybrid = mix(lowpass, highpass, edgeMask);

    
    

    // Output final hybrid image //
    gl_FragColor = vec4(hybrid, 1.0);
}