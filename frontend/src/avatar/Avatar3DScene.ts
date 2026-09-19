/**
 * Avatar3DScene.ts — Procedural Three.js 3D Mannequin Scene.
 *
 * Builds a clean, fully articulated 3D avatar with 21-joint hands, smooth capsule
 * limbs, question-aware facial cues (lifting brow bars), and lighting.
 */

import * as THREE from 'three';
import {
  type CameraPreset,
} from './AvatarTypes';
import {
  retargetFrame,
  type RetargetedSkeleton,
  type Vec3,
} from './retargeting';
import type { SignFrame } from '../lib/clipTypes';

export class Avatar3DScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Meshes & Node references
  private headMesh!: THREE.Mesh;
  private leftEyeMesh!: THREE.Mesh;
  private rightEyeMesh!: THREE.Mesh;
  private leftBrowMesh!: THREE.Mesh;
  private rightBrowMesh!: THREE.Mesh;
  private neckMesh!: THREE.Mesh;
  private torsoMesh!: THREE.Mesh;
  private spineMesh!: THREE.Mesh;

  // Joint spheres
  private joints: { [key: string]: THREE.Mesh } = {};
  // Limb connecting capsules/cylinders
  private limbs: { [key: string]: THREE.Mesh } = {};

  // Hand joint nodes (21 spheres + 20 cylinder segments per hand)
  private leftHandJoints: THREE.Mesh[] = [];
  private rightHandJoints: THREE.Mesh[] = [];
  private leftHandSegments: THREE.Mesh[] = [];
  private rightHandSegments: THREE.Mesh[] = [];

  // Materials
  private bodyMaterial!: THREE.MeshStandardMaterial;
  private jointMaterial!: THREE.MeshStandardMaterial;
  private leftHandMaterial!: THREE.MeshStandardMaterial;
  private rightHandMaterial!: THREE.MeshStandardMaterial;
  private headMaterial!: THREE.MeshStandardMaterial;
  private eyeMaterial!: THREE.MeshBasicMaterial;
  private browMaterial!: THREE.MeshStandardMaterial;

  private currentPreset: CameraPreset = 'front';
  private targetCameraPos = new THREE.Vector3(0, -0.2, 2.6);
  private targetCameraLook = new THREE.Vector3(0, -0.2, 0);

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera (Perspective)
    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 50);
    this.setCameraPreset('front', true);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // 4. Setup Lighting
    this.setupLighting();

    // 5. Initialize Materials
    this.initMaterials(false);

    // 6. Build Procedural Mannequin
    this.buildMannequin();
  }

  private setupLighting() {
    // Ambient fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // Key light (top-right frontal)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, -2, 4);
    this.scene.add(keyLight);

    // Fill light (top-left)
    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.8);
    fillLight.position.set(-2, -1, 3);
    this.scene.add(fillLight);

    // Soft rim/back light
    const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.6);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);
  }

  private initMaterials(highContrast: boolean) {
    const roughness = 0.35;
    const metalness = 0.15;

    if (highContrast) {
      this.bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      this.jointMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
      this.leftHandMaterial = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.2 });
      this.rightHandMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
      this.headMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.browMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15 });
    } else {
      // Modern Indigo/Slate aesthetic
      this.bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        roughness,
        metalness,
      });
      this.jointMaterial = new THREE.MeshStandardMaterial({
        color: 0xc7d2fe,
        roughness: 0.2,
        metalness: 0.3,
      });
      this.leftHandMaterial = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        roughness: 0.25,
        metalness: 0.2,
      });
      this.rightHandMaterial = new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        roughness: 0.25,
        metalness: 0.2,
      });
      this.headMaterial = new THREE.MeshStandardMaterial({
        color: 0x4f46e5,
        roughness: 0.4,
        metalness: 0.1,
      });
      this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      this.browMaterial = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.3,
      });
    }
  }

  private buildMannequin() {
    // ── Head & Face ──────────────────────────────────────────────────────────
    const headGeo = new THREE.SphereGeometry(0.22, 28, 28);
    this.headMesh = new THREE.Mesh(headGeo, this.headMaterial);
    this.scene.add(this.headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.024, 16, 16);
    this.leftEyeMesh = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.rightEyeMesh = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    this.scene.add(this.leftEyeMesh, this.rightEyeMesh);

    // Raised Eyebrows (Question Cue)
    const browGeo = new THREE.BoxGeometry(0.07, 0.016, 0.02);
    this.leftBrowMesh = new THREE.Mesh(browGeo, this.browMaterial);
    this.rightBrowMesh = new THREE.Mesh(browGeo, this.browMaterial);
    this.scene.add(this.leftBrowMesh, this.rightBrowMesh);

    // ── Torso, Neck, Spine ───────────────────────────────────────────────────
    this.neckMesh = this.createCylinder(0.06, 0.06, 0.2, this.bodyMaterial);
    this.torsoMesh = this.createCylinder(0.18, 0.16, 0.7, this.bodyMaterial);
    this.spineMesh = this.createCylinder(0.07, 0.07, 0.8, this.bodyMaterial);
    this.scene.add(this.neckMesh, this.torsoMesh, this.spineMesh);

    // ── Joints ───────────────────────────────────────────────────────────────
    const jointKeys = [
      'leftShoulder', 'rightShoulder',
      'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist',
      'leftHip', 'rightHip',
    ];

    for (const key of jointKeys) {
      const isWrist = key.includes('Wrist');
      const isShoulder = key.includes('Shoulder');
      const radius = isWrist ? 0.045 : isShoulder ? 0.07 : 0.055;
      const sphereGeo = new THREE.SphereGeometry(radius, 20, 20);
      const mesh = new THREE.Mesh(sphereGeo, this.jointMaterial);
      this.joints[key] = mesh;
      this.scene.add(mesh);
    }

    // ── Limbs (Upper arms, Forearms, Shoulders bar, Hips bar) ────────────────
    this.limbs['shouldersBar'] = this.createCylinder(0.06, 0.06, 1.0, this.bodyMaterial);
    this.limbs['hipsBar'] = this.createCylinder(0.05, 0.05, 0.6, this.bodyMaterial);
    this.limbs['leftUpperArm'] = this.createCylinder(0.055, 0.05, 0.42, this.bodyMaterial);
    this.limbs['rightUpperArm'] = this.createCylinder(0.055, 0.05, 0.42, this.bodyMaterial);
    this.limbs['leftForearm'] = this.createCylinder(0.048, 0.042, 0.38, this.bodyMaterial);
    this.limbs['rightForearm'] = this.createCylinder(0.048, 0.042, 0.38, this.bodyMaterial);

    for (const limb of Object.values(this.limbs)) {
      this.scene.add(limb);
    }

    // ── Hands (21 Articulated Spheres & 20 Segments per Hand) ────────────────
    const handJointGeo = new THREE.SphereGeometry(0.016, 12, 12);
    const tipJointGeo = new THREE.SphereGeometry(0.02, 14, 14);

    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const geo = isTip ? tipJointGeo : handJointGeo;

      const lJoint = new THREE.Mesh(geo, this.leftHandMaterial);
      const rJoint = new THREE.Mesh(geo, this.rightHandMaterial);
      this.leftHandJoints.push(lJoint);
      this.rightHandJoints.push(rJoint);
      this.scene.add(lJoint, rJoint);

      if (i > 0) {
        const lSeg = this.createCylinder(0.012, 0.012, 0.05, this.leftHandMaterial);
        const rSeg = this.createCylinder(0.012, 0.012, 0.05, this.rightHandMaterial);
        this.leftHandSegments.push(lSeg);
        this.rightHandSegments.push(rSeg);
        this.scene.add(lSeg, rSeg);
      }
    }
  }

  private createCylinder(rTop: number, rBot: number, _height: number, mat: THREE.Material): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(rTop, rBot, 1.0, 16);
    return new THREE.Mesh(geo, mat);
  }

  private alignCylinder(mesh: THREE.Mesh, pA: Vec3, pB: Vec3, _radius = 0.05) {
    const vA = new THREE.Vector3(pA[0], -pA[1], pA[2]);
    const vB = new THREE.Vector3(pB[0], -pB[1], pB[2]);
    const mid = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5);
    const dist = vA.distanceTo(vB);

    mesh.position.copy(mid);
    mesh.scale.set(1, dist > 0.001 ? dist : 0.001, 1);

    const dir = new THREE.Vector3().subVectors(vB, vA).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(quaternion);
  }

  public get preset(): CameraPreset {
    return this.currentPreset;
  }

  public setCameraPreset(preset: CameraPreset, immediate = false) {
    this.currentPreset = preset;
    if (preset === 'front') {
      this.targetCameraPos.set(0, -0.2, 2.6);
      this.targetCameraLook.set(0, -0.2, 0);
    } else if (preset === 'three-quarter') {
      this.targetCameraPos.set(0.8, -0.1, 2.3);
      this.targetCameraLook.set(0, -0.2, 0);
    } else if (preset === 'hands') {
      this.targetCameraPos.set(0, -0.1, 1.7);
      this.targetCameraLook.set(0, -0.15, 0);
    }

    if (immediate) {
      this.camera.position.copy(this.targetCameraPos);
      this.camera.lookAt(this.targetCameraLook);
    }
  }

  public updateTheme(highContrast: boolean) {
    this.initMaterials(highContrast);
    this.headMesh.material = this.headMaterial;
    this.leftEyeMesh.material = this.eyeMaterial;
    this.rightEyeMesh.material = this.eyeMaterial;
    this.leftBrowMesh.material = this.browMaterial;
    this.rightBrowMesh.material = this.browMaterial;
    this.neckMesh.material = this.bodyMaterial;
    this.torsoMesh.material = this.bodyMaterial;
    this.spineMesh.material = this.bodyMaterial;

    for (const j of Object.values(this.joints)) j.material = this.jointMaterial;
    for (const l of Object.values(this.limbs)) l.material = this.bodyMaterial;
    for (const j of this.leftHandJoints) j.material = this.leftHandMaterial;
    for (const j of this.rightHandJoints) j.material = this.rightHandMaterial;
    for (const s of this.leftHandSegments) s.material = this.leftHandMaterial;
    for (const s of this.rightHandSegments) s.material = this.rightHandMaterial;
  }

  public resize(w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public render(frame: SignFrame, isQuestion = false, mirrored = false) {
    // Smooth camera interpolation
    this.camera.position.lerp(this.targetCameraPos, 0.1);
    this.camera.lookAt(this.targetCameraLook);

    // Retarget noisy frame to rigid invariant 3D skeleton
    const s: RetargetedSkeleton = retargetFrame(frame, isQuestion, mirrored);

    // 1. Head & Face
    this.headMesh.position.set(s.head[0], -s.head[1], s.head[2]);
    this.leftEyeMesh.position.set(s.leftEye[0], -s.leftEye[1], s.leftEye[2]);
    this.rightEyeMesh.position.set(s.rightEye[0], -s.rightEye[1], s.rightEye[2]);
    this.leftBrowMesh.position.set(s.leftEyebrow[0], -s.leftEyebrow[1], s.leftEyebrow[2]);
    this.rightBrowMesh.position.set(s.rightEyebrow[0], -s.rightEyebrow[1], s.rightEyebrow[2]);

    // 2. Torso, Neck, Spine
    this.alignCylinder(this.neckMesh, [0, 0, 0], s.neck, 0.06);
    this.alignCylinder(this.spineMesh, [0, 0, 0], s.spineMid, 0.07);
    this.alignCylinder(this.torsoMesh, [0, 0.1, 0], [0, 0.7, 0], 0.16);

    // 3. Shoulder & Hip Bars
    this.alignCylinder(this.limbs['shouldersBar'], s.leftShoulder, s.rightShoulder, 0.06);
    this.alignCylinder(this.limbs['hipsBar'], s.leftHip, s.rightHip, 0.05);

    // 4. Joints
    const jointPosMap: Record<string, Vec3> = {
      leftShoulder: s.leftShoulder,
      rightShoulder: s.rightShoulder,
      leftElbow: s.leftElbow,
      rightElbow: s.rightElbow,
      leftWrist: s.leftWrist,
      rightWrist: s.rightWrist,
      leftHip: s.leftHip,
      rightHip: s.rightHip,
    };

    for (const [key, pos] of Object.entries(jointPosMap)) {
      if (this.joints[key]) {
        this.joints[key].position.set(pos[0], -pos[1], pos[2]);
      }
    }

    // 5. Arm Limbs (Bone Invariant)
    this.alignCylinder(this.limbs['leftUpperArm'], s.leftShoulder, s.leftElbow, 0.055);
    this.alignCylinder(this.limbs['rightUpperArm'], s.rightShoulder, s.rightElbow, 0.055);
    this.alignCylinder(this.limbs['leftForearm'], s.leftElbow, s.leftWrist, 0.045);
    this.alignCylinder(this.limbs['rightForearm'], s.rightElbow, s.rightWrist, 0.045);

    // 6. Left Hand 21 Landmarks
    const HAND_PARENTS = [0, 0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19];
    if (s.leftHand && s.leftHand.length === 21) {
      for (let i = 0; i < 21; i++) {
        const p = s.leftHand[i];
        this.leftHandJoints[i].visible = true;
        this.leftHandJoints[i].position.set(p[0], -p[1], p[2]);

        if (i > 0) {
          const parentIdx = HAND_PARENTS[i];
          const pP = s.leftHand[parentIdx];
          this.leftHandSegments[i - 1].visible = true;
          this.alignCylinder(this.leftHandSegments[i - 1], pP, p, 0.012);
        }
      }
    } else {
      for (let i = 0; i < 21; i++) {
        this.leftHandJoints[i].visible = false;
        if (i > 0) this.leftHandSegments[i - 1].visible = false;
      }
    }

    // 7. Right Hand 21 Landmarks
    if (s.rightHand && s.rightHand.length === 21) {
      for (let i = 0; i < 21; i++) {
        const p = s.rightHand[i];
        this.rightHandJoints[i].visible = true;
        this.rightHandJoints[i].position.set(p[0], -p[1], p[2]);

        if (i > 0) {
          const parentIdx = HAND_PARENTS[i];
          const pP = s.rightHand[parentIdx];
          this.rightHandSegments[i - 1].visible = true;
          this.alignCylinder(this.rightHandSegments[i - 1], pP, p, 0.012);
        }
      }
    } else {
      for (let i = 0; i < 21; i++) {
        this.rightHandJoints[i].visible = false;
        if (i > 0) this.rightHandSegments[i - 1].visible = false;
      }
    }

    // Draw scene
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
