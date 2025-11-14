import * as THREE from 'three';
import { agentNodes, agentRoutes, agentSignal } from './agent-network';

export class AgentActivity {
  readonly root: THREE.Points;
  private geometry = new THREE.BufferGeometry();
  private material: THREE.ShaderMaterial;
  private positions = new Float32Array(
    (agentNodes.length + agentRoutes.length) * 3
  );
  private strengths = new Float32Array(agentNodes.length + agentRoutes.length);

  constructor(pixelRatio: number) {
    const halos = new Float32Array(this.strengths.length);
    agentNodes.forEach((node, index) => {
      this.positions.set(node, index * 3);
      halos[index] = 1;
    });
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'aStrength',
      new THREE.BufferAttribute(this.strengths, 1)
    );
    this.geometry.setAttribute('aHalo', new THREE.BufferAttribute(halos, 1));
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 0 },
        uRatio: { value: pixelRatio },
      },
      vertexShader: `
        attribute float aStrength; attribute float aHalo;
        uniform float uTime; uniform float uRatio;
        varying float vStrength; varying float vHalo;
        void main(){
          vec3 p=position;
          float turn=sin(uTime*.21)*.08,c=cos(turn),s=sin(turn);
          p=vec3(p.x*c+p.z*s,p.y,-p.x*s+p.z*c);
          p.y+=sin(uTime*.45)*.018;
          p.xy*=1.22;p.y+=.10;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
          gl_PointSize=mix(22.0,66.0,aHalo)*uRatio;
          vStrength=aStrength;vHalo=aHalo;
        }`,
      fragmentShader: `
        uniform float uVisibility;varying float vStrength;varying float vHalo;
        void main(){
          float r=length(gl_PointCoord-.5);if(r>.5)discard;
          float glow=exp(-r*r*26.0)*(1.0-smoothstep(.3,.5,r));
          float core=exp(-r*r*240.0)*(1.0-vHalo)*1.7;
          gl_FragColor=vec4(vec3(.78,1.0,.88),(glow*.48+core)*vStrength*uVisibility);
          #include <colorspace_fragment>
        }`,
    });
    this.root = new THREE.Points(this.geometry, this.material);
    this.root.frustumCulled = false;
    this.root.renderOrder = 2;
  }

  update(time: number, weight: number) {
    const opacity = Math.max(0, (weight - 0.85) / 0.15);
    this.root.visible = opacity > 0.001;
    if (!this.root.visible) return;
    this.strengths.fill(0);
    agentRoutes.forEach((_, index) => {
      const signal = agentSignal(time, index),
        point = agentNodes.length + index;
      this.positions.set(signal.position, point * 3);
      this.strengths[point] = 1;
      this.strengths[signal.target] = Math.max(
        this.strengths[signal.target]!,
        signal.arrival
      );
    });
    this.geometry.attributes.position!.needsUpdate = true;
    this.geometry.attributes.aStrength!.needsUpdate = true;
    this.material.uniforms.uTime!.value = time;
    this.material.uniforms.uVisibility!.value = opacity;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
