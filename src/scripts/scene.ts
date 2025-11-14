import * as THREE from 'three';
import { sculpturePositions, type LetterPoint } from './sculpture-shapes';
import { AgentActivity } from './agent-activity';
import { createSceneLoop } from './scene-loop';

export interface SceneDriver {
  weights: number[];
  chapter: number;
  paused: boolean;
}
export interface SceneController {
  invalidate(): void;
  dispose(): void;
}
export function createScene(driver: SceneDriver): SceneController | undefined {
  const canvas = document.querySelector<HTMLCanvasElement>('#particle-scene');
  const viewport = document.querySelector<HTMLElement>('#scene-viewport');
  const art = document.querySelector<HTMLElement>('#scene-art');
  if (!canvas || !viewport || !art) return;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    return;
  }
  renderer.setPixelRatio(
    Math.min(devicePixelRatio || 1, innerWidth <= 760 ? 1.5 : 1.75)
  );
  renderer.setClearColor(0x090d12, 0);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(37, 1, 0.1, 40);
  camera.position.z = 5.2;
  const text = document.createElement('canvas');
  text.width = 320;
  text.height = 240;
  const context = text.getContext('2d'),
    letters: LetterPoint[] = [];
  if (context) {
    context.fillStyle = '#fff';
    context.font = '600 180px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Aa', 160, 130);
    const pixels = context.getImageData(0, 0, 320, 240).data;
    for (let y = 0; y < 240; y += 3)
      for (let x = 0; x < 320; x += 3)
        if (pixels[(y * 320 + x) * 4 + 3]! > 100)
          letters.push([(x - 160) / 120, -(y - 120) / 120]);
  }
  const count = innerWidth <= 760 ? 1800 : 4200,
    shapes = sculpturePositions(count, letters);
  const geometry = new THREE.BufferGeometry(),
    seeds = new Float32Array(count * 2);
  geometry.setAttribute('position', new THREE.BufferAttribute(shapes[0]!, 3));
  shapes.forEach((shape, index) =>
    geometry.setAttribute(`aShape${index}`, new THREE.BufferAttribute(shape, 3))
  );
  for (let i = 0; i < count; i++)
    seeds.set([i / count, i * 2.3999632297], i * 2);
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 2));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uWeights: { value: driver.weights },
      uTime: { value: 0 },
      uRatio: { value: renderer.getPixelRatio() },
      uOverview: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aShape0; attribute vec3 aShape1; attribute vec3 aShape2;
      attribute vec3 aShape3; attribute vec3 aShape4; attribute vec3 aShape5;
      attribute vec2 aSeed; uniform float uWeights[6]; uniform float uTime;
      uniform float uRatio; uniform float uOverview; varying float vAlpha; varying vec3 vColor;
      void main(){
        vec3 p=aShape0*uWeights[0]+aShape1*uWeights[1]+aShape2*uWeights[2]+aShape3*uWeights[3]+aShape4*uWeights[4]+aShape5*uWeights[5];
        float wave=(sin(p.x*7.0-uTime*2.3)*.43+sin(p.x*12.0+uTime)*.18+cos(aSeed.y)*.2)*exp(-p.x*p.x*.6);
        p.y=mix(p.y,wave,uWeights[3]);
        float turn=uWeights[0]*uTime*.08+sin(uTime*.21)*.08;
        float c=cos(turn),s=sin(turn);p=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);
        p.y+=sin(uTime*.45)*.018+sin(uTime*.7+aSeed.y)*.006;
        p.xy*=mix(1.22,.76,uOverview);p.y+=mix(.10,.14,uOverview);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
        gl_PointSize=(1.7+(p.z+1.0)*.48)*uRatio;
        vAlpha=clamp(.35+(p.z+1.0)*.26,.2,.94);
        vColor=vec3(.70+.15*cos(aSeed.y*.08),.90+.06*sin(aSeed.y*.07),.82+.08*sin(aSeed.y*.12));
      }`,
    fragmentShader: `varying float vAlpha; varying vec3 vColor;
      void main(){float r=length(gl_PointCoord-.5);if(r>.5)discard;gl_FragColor=vec4(vColor,(1.0-smoothstep(.13,.5,r))*vAlpha);
      #include <colorspace_fragment>
      }`,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const activity = new AgentActivity(renderer.getPixelRatio());
  scene.add(activity.root);
  let visible = false;
  let disposed = false;
  let contextLost = false;
  let time = 0;
  let lastChapter = -1;
  let loop: ReturnType<typeof createSceneLoop> | undefined;

  function resize() {
    if (!art || disposed) return;
    const { width, height } = art.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = driver.chapter === 0 ? 5.2 : 4.8;
    if (width < 400) camera.position.z = driver.chapter === 0 ? 5.6 : 5.2;
    camera.position.z = Math.max(
      camera.position.z,
      (driver.chapter === 0 ? 1.55 : 1.9) /
        (camera.aspect * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    );
    camera.updateProjectionMatrix();
    loop?.invalidate();
  }
  loop = createSceneLoop((delta) => {
    if (driver.chapter !== lastChapter) {
      lastChapter = driver.chapter;
      resize();
    }
    if (!driver.paused) time += delta;
    material.uniforms.uWeights!.value = driver.weights;
    material.uniforms.uTime!.value = time;
    material.uniforms.uOverview!.value = driver.weights[0] ?? 0;
    activity.update(time, driver.weights[1] ?? 0);
    renderer.render(scene, camera);
    document.documentElement.classList.add('scene-ready');
  });
  loop.setPaused(driver.paused);
  const observer = new ResizeObserver(resize);
  observer.observe(art);
  function syncVisibility() {
    loop?.setActive(visible && !document.hidden && !contextLost);
  }
  const visibility = new IntersectionObserver((entries) => {
    visible = !!entries[0]?.isIntersecting;
    syncVisibility();
  });
  visibility.observe(art);
  const loseContext = (event: Event) => {
    event.preventDefault();
    contextLost = true;
    syncVisibility();
    document.documentElement.classList.remove('scene-ready');
  };
  canvas.addEventListener('webglcontextlost', loseContext);
  document.addEventListener('visibilitychange', syncVisibility);
  const onPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) loop?.setActive(false);
    else dispose();
  };
  const onPageShow = () => syncVisibility();
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  function dispose() {
    if (disposed) return;
    disposed = true;
    loop?.dispose();
    observer.disconnect();
    visibility.disconnect();
    document.removeEventListener('visibilitychange', syncVisibility);
    canvas?.removeEventListener('webglcontextlost', loseContext);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
    geometry.dispose();
    material.dispose();
    activity.dispose();
    renderer.dispose();
  }
  resize();
  return {
    invalidate() {
      if (disposed || contextLost) return;
      loop?.setPaused(driver.paused);
      loop?.invalidate();
    },
    dispose,
  };
}
