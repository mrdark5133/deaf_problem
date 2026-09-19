/**
 * Avatar3DScene.ts — High-Precision Three.js 3D ASL Full-Body Mannequin Scene.
 *
 * Engineered for crystal-clear real-time sign language comprehension:
 *  1. Full-Body Anatomical Mannequin: Complete from head to toe with pelvis, thighs,
 *     knees, shins, feet, and grounding studio pedestal base.
 *  2. Dynamic 3D Palm Polygon Surfaces: Real-time articulated palm meshes for clear
 *     hand orientation (anterior/posterior/blade).
 *  3. Slender Anatomically Tapered Finger Phalanxes: Distinct MCP -> PIP -> DIP -> Tip capsules.
 *  4. Luminous Dominant/Base Distinction: Dominant (Right) = Sun Amber (#f59e0b); Base (Left) = Cyan (#06b6d4).
 *  5. High-Visibility Glowing Fingertip Caps: Crisp contrast nodes for reading pinch/touch handshapes.
 *  6. Dedicated Signing-Zone Spotlight & Rim Lighting: Clean depth separation between hands and torso.
 *  7. Question-Aware Non-Manual Facial Expression: Dynamic eyebrow tilt for WH vs Yes/No questions.
 */

import * as THREE from 'three';
import { type CameraPreset } from './AvatarTypes';
import {
  retargetFrame,
  type RetargetedSkeleton,
  type Vec3,
} from './retargeting';
import type { SignFrame } from '../lib/clipTypes';

const PALM_INDICES = [0, 1, 5, 9, 13, 17];
// 6 palm vertices: 0=wrist, 1=thumb CMC, 2=index MCP, 3=middle MCP, 4=ring MCP, 5=pinky MCP
const PALM_TRIANGLES = [
  0, 1, 2,
  0, 2, 3,
  0, 3, 4,
  0, 4, 5,
  // Back faces
  0, 2, 1,
  0, 3, 2,
  0, 4, 3,
  0, 5, 4,
];

export class Avatar3DScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // Head & Torso Meshes
  private headMesh!: THREE.Mesh;
  private leftEyeMesh!: THREE.Mesh;
  private rightEyeMesh!: THREE.Mesh;
  private leftBrowMesh!: THREE.Mesh;
  private rightBrowMesh!: THREE.Mesh;
  private neckMesh!: THREE.Mesh;
  private torsoMesh!: THREE.Mesh;
  private spineMesh!: THREE.Mesh;
  private pelvisMesh!: THREE.Mesh;
  private basePedestalMesh!: THREE.Mesh;
  private baseRingMesh!: THREE.Mesh;

  // Pivot Joints & Limbs
  private joints: { [key: string]: THREE.Mesh } = {};
  private limbs: { [key: string]: THREE.Mesh } = {};

  // Hand Meshes
  private leftHandJoints: THREE.Mesh[] = [];
  private rightHandJoints: THREE.Mesh[] = [];
  private leftHandSegments: THREE.Mesh[] = [];
  private rightHandSegments: THREE.Mesh[] = [];

  // Dynamic 3D Palm Polygon Meshes
  private leftPalmMesh!: THREE.Mesh;
  private rightPalmMesh!: THREE.Mesh;
  private leftPalmPositions!: Float32Array;
  private rightPalmPositions!: Float32Array;

  // Materials
  private bodyMaterial!: THREE.MeshStandardMaterial;
  private jointMaterial!: THREE.MeshStandardMaterial;
  private leftHandMaterial!: THREE.MeshStandardMaterial;
  private rightHandMaterial!: THREE.MeshStandardMaterial;
  private leftPalmMaterial!: THREE.MeshStandardMaterial;
  private rightPalmMaterial!: THREE.MeshStandardMaterial;
  private tipMaterial!: THREE.MeshStandardMaterial;
  private headMaterial!: THREE.MeshStandardMaterial;
  private eyeMaterial!: THREE.MeshBasicMaterial;
  private browMaterial!: THREE.MeshStandardMaterial;
  private pedestalMaterial!: THREE.MeshStandardMaterial;
  private ringMaterial!: THREE.MeshBasicMaterial;

  private currentPreset: CameraPreset = 'front';
  private targetCameraPos = new THREE.Vector3(0, -0.45, 3.45);
  private targetCameraLook = new THREE.Vector3(0, -0.45, 0);

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    const aspect = container.clientWidth / (container.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 50);
    this.setCameraPreset('front', true);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.setupLighting();
    this.initMaterials(false);
    this.buildMannequin();
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    // Key light (frontal top-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(2, 2.5, 3.5);
    this.scene.add(keyLight);

    // Dedicated signing zone spotlight
    const handSpot = new THREE.PointLight(0xfffbeb, 1.4, 6.0);
    handSpot.position.set(0, 0, 1.8);
    this.scene.add(handSpot);

    // Rim / Back light for crisp silhouette separation
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    rimLight.position.set(0, 2, -2.5);
    this.scene.add(rimLight);
  }

  private initMaterials(highContrast: boolean) {
    if (highContrast) {
      this.bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      this.jointMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
      this.leftHandMaterial = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
      this.rightHandMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
      this.leftPalmMaterial = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
      this.rightPalmMaterial = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.3,
        side: THREE.DoubleSide,
      });
      this.tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.5,
        roughness: 0.1,
      });
      this.headMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
      this.browMaterial = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2 });
      this.pedestalMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      this.ringMaterial = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true });
    } else {
      this.bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4f46e5, // Rich indigo
        roughness: 0.35,
        metalness: 0.15,
      });
      this.jointMaterial = new THREE.MeshStandardMaterial({
        color: 0xc7d2fe,
        roughness: 0.2,
        metalness: 0.3,
      });
      // Dominant (Right) = Sun Amber
      this.rightHandMaterial = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.25,
        metalness: 0.2,
      });
      this.rightPalmMaterial = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      // Base (Left) = Electric Cyan
      this.leftHandMaterial = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        roughness: 0.25,
        metalness: 0.2,
      });
      this.leftPalmMaterial = new THREE.MeshStandardMaterial({
        color: 0x0891b2,
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      // Bright Glowing Fingertip Caps
      this.tipMaterial = new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfef08a,
        emissiveIntensity: 0.45,
        roughness: 0.15,
      });
      this.headMaterial = new THREE.MeshStandardMaterial({
        color: 0x4338ca,
        roughness: 0.35,
        metalness: 0.1,
      });
      this.eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
      this.browMaterial = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.3,
      });
      this.pedestalMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.7,
        metalness: 0.2,
      });
      this.ringMaterial = new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        wireframe: true,
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

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.07, 0.016, 0.02);
    this.leftBrowMesh = new THREE.Mesh(browGeo, this.browMaterial);
    this.rightBrowMesh = new THREE.Mesh(browGeo, this.browMaterial);
    this.scene.add(this.leftBrowMesh, this.rightBrowMesh);

    // ── Torso, Neck, Spine & Pelvis ──────────────────────────────────────────
    this.neckMesh = this.createCylinder(0.06, 0.06, 0.2, this.bodyMaterial);
    this.torsoMesh = this.createCylinder(0.14, 0.11, 0.7, this.bodyMaterial);
    this.spineMesh = this.createCylinder(0.07, 0.07, 0.8, this.bodyMaterial);
    this.pelvisMesh = this.createCylinder(0.12, 0.14, 0.25, this.bodyMaterial);
    this.scene.add(this.neckMesh, this.torsoMesh, this.spineMesh, this.pelvisMesh);

    // ── Studio Pedestal Base ─────────────────────────────────────────────────
    const pedGeo = new THREE.CylinderGeometry(0.65, 0.75, 0.06, 32);
    this.basePedestalMesh = new THREE.Mesh(pedGeo, this.pedestalMaterial);
    this.basePedestalMesh.position.set(0, -1.82, 0);

    const ringGeo = new THREE.RingGeometry(0.78, 0.82, 32);
    this.baseRingMesh = new THREE.Mesh(ringGeo, this.ringMaterial);
    this.baseRingMesh.rotation.x = -Math.PI / 2;
    this.baseRingMesh.position.set(0, -1.81, 0);

    this.scene.add(this.basePedestalMesh, this.baseRingMesh);

    // ── Pivot Joints ─────────────────────────────────────────────────────────
    const jointKeys = [
      'leftShoulder', 'rightShoulder',
      'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist',
      'leftHip', 'rightHip',
      'leftKnee', 'rightKnee',
      'leftAnkle', 'rightAnkle',
    ];

    for (const key of jointKeys) {
      const isWrist = key.includes('Wrist');
      const isShoulder = key.includes('Shoulder');
      const isHip = key.includes('Hip');
      const isKnee = key.includes('Knee');
      const isAnkle = key.includes('Ankle');
      const radius = isWrist ? 0.025 : isShoulder ? 0.065 : isHip ? 0.058 : isKnee ? 0.048 : isAnkle ? 0.038 : 0.052;
      const sphereGeo = new THREE.SphereGeometry(radius, 20, 20);
      const mesh = new THREE.Mesh(sphereGeo, this.jointMaterial);
      this.joints[key] = mesh;
      this.scene.add(mesh);
    }

    // ── Limbs ────────────────────────────────────────────────────────────────
    this.limbs['shouldersBar'] = this.createCylinder(0.055, 0.055, 1.0, this.bodyMaterial);
    this.limbs['hipsBar'] = this.createCylinder(0.048, 0.048, 0.6, this.bodyMaterial);
    this.limbs['leftUpperArm'] = this.createCylinder(0.052, 0.046, 0.42, this.bodyMaterial);
    this.limbs['rightUpperArm'] = this.createCylinder(0.052, 0.046, 0.42, this.bodyMaterial);
    this.limbs['leftForearm'] = this.createCylinder(0.044, 0.038, 0.38, this.bodyMaterial);
    this.limbs['rightForearm'] = this.createCylinder(0.044, 0.038, 0.38, this.bodyMaterial);

    // Lower body limbs
    this.limbs['leftThigh'] = this.createCylinder(0.054, 0.045, 0.48, this.bodyMaterial);
    this.limbs['rightThigh'] = this.createCylinder(0.054, 0.045, 0.48, this.bodyMaterial);
    this.limbs['leftShin'] = this.createCylinder(0.044, 0.036, 0.45, this.bodyMaterial);
    this.limbs['rightShin'] = this.createCylinder(0.044, 0.036, 0.45, this.bodyMaterial);
    this.limbs['leftFoot'] = this.createCylinder(0.036, 0.030, 0.18, this.bodyMaterial);
    this.limbs['rightFoot'] = this.createCylinder(0.036, 0.030, 0.18, this.bodyMaterial);

    for (const limb of Object.values(this.limbs)) {
      this.scene.add(limb);
    }

    // ── Articulated 21-Joint Hands with Palm Plates & Tapered Bones ───────────
    const knuckleJointGeo = new THREE.SphereGeometry(0.009, 12, 12);
    const tipJointGeo = new THREE.SphereGeometry(0.010, 14, 14);

    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      const geo = isTip ? tipJointGeo : knuckleJointGeo;
      const lMat = isTip ? this.tipMaterial : this.leftHandMaterial;
      const rMat = isTip ? this.tipMaterial : this.rightHandMaterial;

      const lJoint = new THREE.Mesh(geo, lMat);
      const rJoint = new THREE.Mesh(geo, rMat);
      this.leftHandJoints.push(lJoint);
      this.rightHandJoints.push(rJoint);
      this.scene.add(lJoint, rJoint);

      if (i > 0) {
        // Taper segment radii from MCP -> PIP -> DIP -> Tip
        const isDistal = [4, 8, 12, 16, 20].includes(i);
        const isInter = [3, 7, 11, 15, 19].includes(i);
        const isProx = [2, 6, 10, 14, 18].includes(i);
        const rTop = isDistal ? 0.0055 : isInter ? 0.0065 : isProx ? 0.008 : 0.0095;
        const rBot = isDistal ? 0.0065 : isInter ? 0.0075 : isProx ? 0.009 : 0.0105;

        const lSeg = this.createCylinder(rTop, rBot, 0.04, this.leftHandMaterial);
        const rSeg = this.createCylinder(rTop, rBot, 0.04, this.rightHandMaterial);
        this.leftHandSegments.push(lSeg);
        this.rightHandSegments.push(rSeg);
        this.scene.add(lSeg, rSeg);
      }
    }

    // ── 3D Palm Polygon Meshes ───────────────────────────────────────────────
    const leftPalmGeo = new THREE.BufferGeometry();
    this.leftPalmPositions = new Float32Array(6 * 3);
    leftPalmGeo.setAttribute('position', new THREE.BufferAttribute(this.leftPalmPositions, 3));
    leftPalmGeo.setIndex(PALM_TRIANGLES);
    this.leftPalmMesh = new THREE.Mesh(leftPalmGeo, this.leftPalmMaterial);
    this.scene.add(this.leftPalmMesh);

    const rightPalmGeo = new THREE.BufferGeometry();
    this.rightPalmPositions = new Float32Array(6 * 3);
    rightPalmGeo.setAttribute('position', new THREE.BufferAttribute(this.rightPalmPositions, 3));
    rightPalmGeo.setIndex(PALM_TRIANGLES);
    this.rightPalmMesh = new THREE.Mesh(rightPalmGeo, this.rightPalmMaterial);
    this.scene.add(this.rightPalmMesh);
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
      this.targetCameraPos.set(0, -0.45, 3.45);
      this.targetCameraLook.set(0, -0.45, 0);
    } else if (preset === 'three-quarter') {
      this.targetCameraPos.set(1.2, -0.35, 3.1);
      this.targetCameraLook.set(0, -0.40, 0);
    } else if (preset === 'hands') {
      this.targetCameraPos.set(0, 0.10, 1.65);
      this.targetCameraLook.set(0, 0.05, 0.15);
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
    this.pelvisMesh.material = this.bodyMaterial;
    this.basePedestalMesh.material = this.pedestalMaterial;
    this.baseRingMesh.material = this.ringMaterial;
    this.leftPalmMesh.material = this.leftPalmMaterial;
    this.rightPalmMesh.material = this.rightPalmMaterial;

    for (const j of Object.values(this.joints)) j.material = this.jointMaterial;
    for (const l of Object.values(this.limbs)) l.material = this.bodyMaterial;

    for (let i = 0; i < 21; i++) {
      const isTip = [4, 8, 12, 16, 20].includes(i);
      this.leftHandJoints[i].material = isTip ? this.tipMaterial : this.leftHandMaterial;
      this.rightHandJoints[i].material = isTip ? this.tipMaterial : this.rightHandMaterial;
    }
    for (const s of this.leftHandSegments) s.material = this.leftHandMaterial;
    for (const s of this.rightHandSegments) s.material = this.rightHandMaterial;
  }

  public resize(w: number, h: number) {
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public render(
    frame: SignFrame,
    isQuestion = false,
    mirrored = false,
    questionType: 'wh' | 'yes_no' | null = null
  ) {
    this.camera.position.lerp(this.targetCameraPos, 0.1);
    this.camera.lookAt(this.targetCameraLook);

    const s: RetargetedSkeleton = retargetFrame(frame, isQuestion, mirrored, questionType);

    // 1. Head & Face
    this.headMesh.position.set(s.head[0], -s.head[1], s.head[2]);
    this.leftEyeMesh.position.set(s.leftEye[0], -s.leftEye[1], s.leftEye[2]);
    this.rightEyeMesh.position.set(s.rightEye[0], -s.rightEye[1], s.rightEye[2]);
    this.leftBrowMesh.position.set(s.leftEyebrow[0], -s.leftEyebrow[1], s.leftEyebrow[2]);
    this.rightBrowMesh.position.set(s.rightEyebrow[0], -s.rightEyebrow[1], s.rightEyebrow[2]);

    if (isQuestion) {
      if (questionType === 'wh') {
        this.leftBrowMesh.rotation.z = -0.22;
        this.rightBrowMesh.rotation.z = 0.22;
      } else {
        this.leftBrowMesh.rotation.z = 0.15;
        this.rightBrowMesh.rotation.z = -0.15;
      }
    } else {
      this.leftBrowMesh.rotation.z = 0;
      this.rightBrowMesh.rotation.z = 0;
    }

    // 2. Torso, Neck, Spine, Pelvis
    this.alignCylinder(this.neckMesh, [0, 0, 0], s.neck, 0.06);
    this.alignCylinder(this.spineMesh, [0, 0, 0], s.spineMid, 0.07);
    this.alignCylinder(this.torsoMesh, [0, 0.08, -0.03], [0, 0.55, -0.03], 0.14);
    this.alignCylinder(this.pelvisMesh, s.spineMid, s.pelvis, 0.12);

    // 3. Shoulder & Hip Bars
    this.alignCylinder(this.limbs['shouldersBar'], s.leftShoulder, s.rightShoulder, 0.055);
    this.alignCylinder(this.limbs['hipsBar'], s.leftHip, s.rightHip, 0.048);

    // 4. Lower Body Limbs
    this.alignCylinder(this.limbs['leftThigh'], s.leftHip, s.leftKnee, 0.054);
    this.alignCylinder(this.limbs['rightThigh'], s.rightHip, s.rightKnee, 0.054);
    this.alignCylinder(this.limbs['leftShin'], s.leftKnee, s.leftAnkle, 0.044);
    this.alignCylinder(this.limbs['rightShin'], s.rightKnee, s.rightAnkle, 0.044);
    this.alignCylinder(this.limbs['leftFoot'], s.leftAnkle, s.leftFoot, 0.036);
    this.alignCylinder(this.limbs['rightFoot'], s.rightAnkle, s.rightFoot, 0.036);

    // 5. Pivot Joints
    const jointPosMap: Record<string, Vec3> = {
      leftShoulder: s.leftShoulder,
      rightShoulder: s.rightShoulder,
      leftElbow: s.leftElbow,
      rightElbow: s.rightElbow,
      leftWrist: s.leftWrist,
      rightWrist: s.rightWrist,
      leftHip: s.leftHip,
      rightHip: s.rightHip,
      leftKnee: s.leftKnee,
      rightKnee: s.rightKnee,
      leftAnkle: s.leftAnkle,
      rightAnkle: s.rightAnkle,
    };

    for (const [key, pos] of Object.entries(jointPosMap)) {
      if (this.joints[key]) {
        this.joints[key].position.set(pos[0], -pos[1], pos[2]);
      }
    }

    // 6. Arm Limbs (Bone Invariant)
    this.alignCylinder(this.limbs['leftUpperArm'], s.leftShoulder, s.leftElbow, 0.052);
    this.alignCylinder(this.limbs['rightUpperArm'], s.rightShoulder, s.rightElbow, 0.052);
    this.alignCylinder(this.limbs['leftForearm'], s.leftElbow, s.leftWrist, 0.044);
    this.alignCylinder(this.limbs['rightForearm'], s.rightElbow, s.rightWrist, 0.044);

    const HAND_PARENTS = [0, 0, 1, 2, 3, 0, 5, 6, 7, 0, 9, 10, 11, 0, 13, 14, 15, 0, 17, 18, 19];

    // 7. Left Hand 21 Landmarks + Palm Surface
    if (s.leftHand && s.leftHand.length === 21) {
      this.leftPalmMesh.visible = true;
      for (let i = 0; i < 21; i++) {
        const p = s.leftHand[i];
        this.leftHandJoints[i].visible = true;
        this.leftHandJoints[i].position.set(p[0], -p[1], p[2]);

        if (i > 0) {
          const parentIdx = HAND_PARENTS[i];
          const pP = s.leftHand[parentIdx];
          this.leftHandSegments[i - 1].visible = true;
          this.alignCylinder(this.leftHandSegments[i - 1], pP, p, 0.008);
        }
      }

      // Update 3D Palm Geometry
      for (let k = 0; k < PALM_INDICES.length; k++) {
        const idx = PALM_INDICES[k];
        const pt = s.leftHand[idx];
        this.leftPalmPositions[k * 3] = pt[0];
        this.leftPalmPositions[k * 3 + 1] = -pt[1];
        this.leftPalmPositions[k * 3 + 2] = pt[2];
      }
      this.leftPalmMesh.geometry.attributes.position.needsUpdate = true;
      this.leftPalmMesh.geometry.computeVertexNormals();
    } else {
      this.leftPalmMesh.visible = false;
      for (let i = 0; i < 21; i++) {
        this.leftHandJoints[i].visible = false;
        if (i > 0) this.leftHandSegments[i - 1].visible = false;
      }
    }

    // 8. Right Hand 21 Landmarks + Palm Surface
    if (s.rightHand && s.rightHand.length === 21) {
      this.rightPalmMesh.visible = true;
      for (let i = 0; i < 21; i++) {
        const p = s.rightHand[i];
        this.rightHandJoints[i].visible = true;
        this.rightHandJoints[i].position.set(p[0], -p[1], p[2]);

        if (i > 0) {
          const parentIdx = HAND_PARENTS[i];
          const pP = s.rightHand[parentIdx];
          this.rightHandSegments[i - 1].visible = true;
          this.alignCylinder(this.rightHandSegments[i - 1], pP, p, 0.008);
        }
      }

      // Update 3D Palm Geometry
      for (let k = 0; k < PALM_INDICES.length; k++) {
        const idx = PALM_INDICES[k];
        const pt = s.rightHand[idx];
        this.rightPalmPositions[k * 3] = pt[0];
        this.rightPalmPositions[k * 3 + 1] = -pt[1];
        this.rightPalmPositions[k * 3 + 2] = pt[2];
      }
      this.rightPalmMesh.geometry.attributes.position.needsUpdate = true;
      this.rightPalmMesh.geometry.computeVertexNormals();
    } else {
      this.rightPalmMesh.visible = false;
      for (let i = 0; i < 21; i++) {
        this.rightHandJoints[i].visible = false;
        if (i > 0) this.rightHandSegments[i - 1].visible = false;
      }
    }

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
