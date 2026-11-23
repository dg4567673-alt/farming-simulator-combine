import React, { useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { soundEngine } from '../audio/soundEngine';
import {
  applyWorkAtPoint,
  buyFuelAtPump,
  buySeedsAtMandi,
  createInitialFields,
  sellGrainToMandi,
  stepFieldsGrowth,
  summarizeField,
} from '../sim/farmingLogic';
import {
  CameraMode,
  CropType,
  GamePhase,
  HudSnapshot,
  ImplementId,
  VehicleId,
  ZonePrompt,
} from '../sim/types';
import {
  findNearestAttachableImplement,
  stepHitchedImplement,
  stepVehicleKinematics,
} from '../sim/vehiclePhysics';
import {
  createInitialEconomy,
  createInitialImplements,
  createInitialVehicles,
  FIELD_DEFS,
  VEHICLE_SPECS,
  WORLD_COLLIDERS,
  ZONES,
} from '../sim/worldLayout';
import { FieldVisualManager } from './fields';
import { createSceneMaterials } from './materials';
import { createSceneTextures } from './textures';
import {
  buildImplementVisual,
  buildStationaryThresher,
  buildVehicleVisual,
  ImplementVisualRig,
  VehicleVisualRig,
} from './vehicles';
import { buildVillageWorld } from './world';

export interface FarmSimActions {
  switchVehicle: (id?: VehicleId) => void;
  toggleWork: () => void;
  toggleHitch: () => void;
  nudgeToolArm: (delta: number) => void;
  cycleCamera: () => void;
  refuelActiveVehicle: () => void;
  sellAllGrain: () => void;
  buySeedsBatch: () => void;
  transferHarvesterToTrolley: () => void;
  resetSimulation: () => void;
  setTouchDrive: (throttle: number, steer: number) => void;
}

interface FarmCanvasProps {
  phase: GamePhase;
  onSnapshot: (snap: HudSnapshot) => void;
  onOpenMandi: () => void;
  onTogglePause: () => void;
  onStartFromKey: () => void;
  simRef: React.MutableRefObject<FarmSimActions | null>;
}

const VEHICLE_ORDER: VehicleId[] = ['tractor', 'harvester', 'jcb', 'bulldozer', 'truck'];

// Pre-allocated scratch math objects (Zero GC inside tick loop)
const _camDesired = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _pColor = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  r: number;
  g: number;
  b: number;
}

const PARTICLE_POOL_SIZE = 180;

export const FarmCanvas: React.FC<FarmCanvasProps> = ({
  phase,
  onSnapshot,
  onOpenMandi,
  onTogglePause,
  onStartFromKey,
  simRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const onSnapshotRef = useRef(onSnapshot);
  const onOpenMandiRef = useRef(onOpenMandi);
  const onTogglePauseRef = useRef(onTogglePause);
  const onStartFromKeyRef = useRef(onStartFromKey);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase !== 'playing') {
      soundEngine.updateEngine(0, false, false);
    }
  }, [phase]);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    onOpenMandiRef.current = onOpenMandi;
    onTogglePauseRef.current = onTogglePause;
    onStartFromKeyRef.current = onStartFromKey;
  }, [onSnapshot, onOpenMandi, onTogglePause, onStartFromKey]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL probe
    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => e.preventDefault();
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    // 2. Scene, Sky, Fog & Studio Environment Reflections
    const scene = new THREE.Scene();
    const horizonHex = 0xd6ccb8;
    scene.background = new THREE.Color(horizonHex);
    scene.fog = new THREE.FogExp2(horizonHex, 0.0048);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();

    // Realistic Atmospheric Sky
    const sky = new Sky();
    sky.scale.setScalar(1000);
    scene.add(sky);
    const skyUniforms = sky.material.uniforms;
    skyUniforms['turbidity'].value = 6.5;
    skyUniforms['rayleigh'].value = 1.85;
    skyUniforms['mieCoefficient'].value = 0.004;
    skyUniforms['mieDirectionalG'].value = 0.82;
    const sunPos = new THREE.Vector3();
    const phi = THREE.MathUtils.degToRad(90 - 26); // warm Indian morning elevation
    const theta = THREE.MathUtils.degToRad(135);
    sunPos.setFromSphericalCoords(1, phi, theta);
    skyUniforms['sunPosition'].value.copy(sunPos);

    // 3. Warm/Cool 3-Point Outdoor Daylight Rig (<= 1 Shadow Caster)
    const hemi = new THREE.HemisphereLight(0x9ec5e8, 0x6b563e, 0.72);
    scene.add(hemi);

    const sunLight = new THREE.DirectionalLight(0xfff0d4, 2.35);
    sunLight.position.set(sunPos.x * 75, sunPos.y * 75, sunPos.z * 75);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 175;
    const sd = 48;
    sunLight.shadow.camera.left = -sd;
    sunLight.shadow.camera.right = sd;
    sunLight.shadow.camera.top = sd;
    sunLight.shadow.camera.bottom = -sd;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xc2d8f0, 0.45);
    rimLight.position.set(-45, 28, -50);
    scene.add(rimLight);

    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.3,
      480,
    );
    camera.position.set(-16, 12, -26);

    // 4. Textures, Materials, World, Fields, Vehicles, Implements & Thresher
    const textures = createSceneTextures(renderer);
    const materials = createSceneMaterials(textures, isSoftwareGl);

    let vehicles = createInitialVehicles();
    let imps = createInitialImplements();
    let fields = createInitialFields(FIELD_DEFS);
    let economy = createInitialEconomy();

    const worldHandle = buildVillageWorld(materials, textures);
    scene.add(worldHandle.root);

    let fieldVisuals = new FieldVisualManager(fields, textures);
    scene.add(fieldVisuals.root);

    const thresher = buildStationaryThresher(materials);
    thresher.root.position.set(24.5, 0, -4.2);
    thresher.root.rotation.y = Math.PI * 0.5;
    scene.add(thresher.root);

    const vehicleRigs: Record<VehicleId, VehicleVisualRig> = {
      tractor: buildVehicleVisual('tractor', materials),
      harvester: buildVehicleVisual('harvester', materials),
      jcb: buildVehicleVisual('jcb', materials),
      bulldozer: buildVehicleVisual('bulldozer', materials),
      truck: buildVehicleVisual('truck', materials),
    };
    (Object.keys(vehicleRigs) as VehicleId[]).forEach((vid) => {
      scene.add(vehicleRigs[vid].root);
    });

    const impRigs: Record<ImplementId, ImplementVisualRig> = {
      plow: buildImplementVisual('plow', materials),
      seeder: buildImplementVisual('seeder', materials),
      water_tanker: buildImplementVisual('water_tanker', materials),
      trolley: buildImplementVisual('trolley', materials),
    };
    (Object.keys(impRigs) as ImplementId[]).forEach((iid) => {
      scene.add(impRigs[iid].root);
    });

    // 5. Zero-GC Pooled Particle Ring Buffer (soil clods, water droplets, tire dust, harvest chaff)
    const particleGeo = new THREE.DodecahedronGeometry(0.14, 0);
    const particleMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0,
    });
    const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_POOL_SIZE);
    particleMesh.frustumCulled = false;
    scene.add(particleMesh);

    const particles: ParticleSlot[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      life: 0,
      maxLife: 1,
      x: 0,
      y: -10,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      scale: 0.001,
      r: 1,
      g: 1,
      b: 1,
    }));
    let particleCursor = 0;

    function spawnParticle(
      x: number,
      y: number,
      z: number,
      vx: number,
      vy: number,
      vz: number,
      scale: number,
      maxLife: number,
      r: number,
      g: number,
      b: number,
    ): void {
      const slot = particles[particleCursor];
      particleCursor = (particleCursor + 1) % PARTICLE_POOL_SIZE;
      slot.active = true;
      slot.life = 0;
      slot.maxLife = maxLife;
      slot.x = x;
      slot.y = y;
      slot.z = z;
      slot.vx = vx;
      slot.vy = vy;
      slot.vz = vz;
      slot.scale = scale;
      slot.r = r;
      slot.g = g;
      slot.b = b;
    }

    // 6. Mutable Runtime Simulation State
    let activeVehicleId: VehicleId = 'tractor';
    let cameraMode: CameraMode = 'chase';
    let lastNotice: string | null = 'Tractor ready with Plow! Drive South into Field 1 and press [F] to plow.';
    let noticeTimer = 6.0;
    let lastLoadedCrop: CropType = 'paddy';
    let workAccum = 0;
    let elapsedTotal = 0;
    let hudEmitTimer = 0;
    let cameraSnappedForPlay = false;

    const keysDown = new Set<string>();
    let touchThrottle = 0;
    let touchSteer = 0;

    function pushNotice(msg: string, duration = 4.5): void {
      lastNotice = msg;
      noticeTimer = duration;
    }

    function computeNearbyPrompt(): ZonePrompt | null {
      const v = vehicles[activeVehicleId];
      const spec = VEHICLE_SPECS[activeVehicleId];

      // 1. Petrol Pump
      const dPump = Math.hypot(v.x - ZONES.petrolPump.x, v.z - ZONES.petrolPump.z);
      if (dPump < ZONES.petrolPump.radius) {
        return {
          type: 'pump',
          label: 'Kisan Diesel & Petrol Pump',
          sublabel: `Fuel: ${Math.round(v.fuel)} / ${spec.fuelCapacity} L (₹${economy.dieselPricePerLiter}/L)`,
          actionHint: 'Press [R] to Refuel Tank',
        };
      }

      // 2. Village Mandi
      const dMandi = Math.hypot(v.x - ZONES.mandi.x, v.z - ZONES.mandi.z);
      if (dMandi < ZONES.mandi.radius) {
        const carried = getCarriedGrainKg();
        return {
          type: 'mandi',
          label: 'Shubham Anaj Mandi · गाँव का बाजार',
          sublabel:
            carried > 0
              ? `Ready to sell ${Math.round(carried)} kg grain`
              : `Seeds Stock: ${Math.round(economy.seedsKg)} kg`,
          actionHint: 'Press [B] to Open Mandi Market',
        };
      }

      // 3. Stationary Thresher Yard
      const dThresher = Math.hypot(v.x - ZONES.thresherYard.x, v.z - ZONES.thresherYard.z);
      if (dThresher < ZONES.thresherYard.radius) {
        return {
          type: 'thresher',
          label: 'Crop Thresher Yard · थ्रेशर',
          sublabel: 'Thresher belt ready for grain processing',
          actionHint: v.workActive ? 'Thresher Active' : 'Press [F] to Run PTO Thresher',
        };
      }

      // 4. Transfer grain from Harvester to Trolley or Truck if close
      if (activeVehicleId === 'harvester' && v.grainStored > 0) {
        const dTrolley = Math.hypot(v.x - imps.trolley.x, v.z - imps.trolley.z);
        const dTruck = Math.hypot(v.x - vehicles.truck.x, v.z - vehicles.truck.z);
        if (dTrolley < 7.5 || dTruck < 7.5) {
          return {
            type: 'field',
            label: 'Unloading Auger Ready',
            sublabel: `Harvester Hopper: ${Math.round(v.grainStored)} kg`,
            actionHint: 'Press [R] to Unload Grain into Trolley/Truck',
          };
        }
      }

      // 5. Nearest Hitchable Implement (when driving Tractor)
      if (spec.canHitch && !v.attachedImplement) {
        const nearImp = findNearestAttachableImplement(v, spec, imps, 5.5);
        if (nearImp) {
          return {
            type: 'implement',
            label: nearImp.name,
            sublabel: nearImp.hindiName,
            actionHint: 'Press [E] to Hitch Implement',
          };
        }
      }

      return null;
    }

    function getCarriedGrainKg(): number {
      const v = vehicles[activeVehicleId];
      if (activeVehicleId === 'tractor' && v.attachedImplement === 'trolley') {
        return imps.trolley.grainLoad;
      }
      return v.grainStored;
    }

    function getCarriedCapacityKg(): number {
      const v = vehicles[activeVehicleId];
      if (activeVehicleId === 'tractor' && v.attachedImplement === 'trolley') {
        return imps.trolley.grainCapacity;
      }
      return VEHICLE_SPECS[activeVehicleId].grainCapacity;
    }

    // 7. Imperative Actions shared with React HUD and Keyboard
    const actions: FarmSimActions = {
      switchVehicle: (targetId?: VehicleId) => {
        soundEngine.resume();
        const prev = vehicles[activeVehicleId];
        prev.workActive = false;
        prev.speed *= 0.25;
        if (targetId) {
          activeVehicleId = targetId;
        } else {
          const idx = VEHICLE_ORDER.indexOf(activeVehicleId);
          activeVehicleId = VEHICLE_ORDER[(idx + 1) % VEHICLE_ORDER.length];
        }
        pushNotice(`Switched to ${VEHICLE_SPECS[activeVehicleId].name}`, 3.0);
        emitHudSnapshot();
      },
      toggleWork: () => {
        soundEngine.resume();
        const v = vehicles[activeVehicleId];
        v.workActive = !v.workActive;
        if (activeVehicleId === 'tractor' && v.attachedImplement === 'trolley') {
          pushNotice(v.workActive ? 'Trolley Tipper Raised' : 'Trolley Tipper Lowered', 2.4);
        } else if (activeVehicleId === 'tractor' && !v.attachedImplement) {
          v.workActive = false;
          pushNotice('Hitch Plow, Seeder, or Water Tanker first [E]', 3.0);
        } else {
          pushNotice(
            v.workActive ? 'Work Mode ENGAGED' : 'Work Mode Disengaged',
            2.2,
          );
        }
        emitHudSnapshot();
      },
      toggleHitch: () => {
        soundEngine.resume();
        const v = vehicles[activeVehicleId];
        const spec = VEHICLE_SPECS[activeVehicleId];
        if (!spec.canHitch) {
          pushNotice('Only the Tractor can hitch farming implements', 2.8);
          return;
        }
        if (v.attachedImplement) {
          const oldImp = imps[v.attachedImplement];
          oldImp.attachedTo = null;
          v.attachedImplement = null;
          v.workActive = false;
          soundEngine.playHitchClank();
          pushNotice(`Detached ${oldImp.name}`, 2.6);
        } else {
          const near = findNearestAttachableImplement(v, spec, imps, 6.2);
          if (near) {
            near.attachedTo = v.id;
            v.attachedImplement = near.id;
            soundEngine.playHitchClank();
            pushNotice(`Hitched ${near.name}`, 3.0);
          } else {
            pushNotice('Reverse near an implement to hitch [E]', 2.8);
          }
        }
        emitHudSnapshot();
      },
      nudgeToolArm: (delta: number) => {
        const v = vehicles[activeVehicleId];
        if (!VEHICLE_SPECS[activeVehicleId].hasToolArm) return;
        v.toolAngle = THREE.MathUtils.clamp(v.toolAngle + delta, 0, 1);
        emitHudSnapshot();
      },
      cycleCamera: () => {
        const order: CameraMode[] = ['chase', 'hood', 'drone'];
        const idx = order.indexOf(cameraMode);
        cameraMode = order[(idx + 1) % order.length];
        pushNotice(`Camera: ${cameraMode.toUpperCase()}`, 2.0);
        emitHudSnapshot();
      },
      refuelActiveVehicle: () => {
        soundEngine.resume();
        const v = vehicles[activeVehicleId];
        const spec = VEHICLE_SPECS[activeVehicleId];
        const dPump = Math.hypot(v.x - ZONES.petrolPump.x, v.z - ZONES.petrolPump.z);
        if (dPump > ZONES.petrolPump.radius) {
          pushNotice('Drive to Kisan Diesel Pump (North-West road) to refuel', 3.2);
          return;
        }
        const res = buyFuelAtPump(economy, v.fuel, spec.fuelCapacity);
        if (res.litersAdded > 0) {
          v.fuel += res.litersAdded;
          soundEngine.playCoinTrade();
          pushNotice(`Refueled +${Math.round(res.litersAdded)} L for ₹${res.costRupees}`, 3.5);
        } else {
          pushNotice('Tank is already full or insufficient ₹ Rupees', 2.8);
        }
        emitHudSnapshot();
      },
      sellAllGrain: () => {
        soundEngine.resume();
        const v = vehicles[activeVehicleId];
        let sold = 0;
        let earned = 0;

        if (activeVehicleId === 'tractor' && v.attachedImplement === 'trolley' && imps.trolley.grainLoad > 0) {
          const res = sellGrainToMandi(economy, imps.trolley.grainLoad, lastLoadedCrop);
          imps.trolley.grainLoad = 0;
          sold += res.soldKg;
          earned += res.earnedRupees;
        } else if (v.grainStored > 0) {
          const res = sellGrainToMandi(economy, v.grainStored, lastLoadedCrop);
          v.grainStored = 0;
          sold += res.soldKg;
          earned += res.earnedRupees;
        }

        if (sold > 0) {
          soundEngine.playCoinTrade();
          pushNotice(`Sold ${Math.round(sold)} kg at Mandi for +₹${earned.toLocaleString()}!`, 4.0);
        } else {
          pushNotice('No harvested grain in active vehicle/trolley to sell', 3.0);
        }
        emitHudSnapshot();
      },
      buySeedsBatch: () => {
        soundEngine.resume();
        const res = buySeedsAtMandi(economy, 100);
        if (res.seedsAdded > 0) {
          soundEngine.playCoinTrade();
          pushNotice(`Bought +${res.seedsAdded} kg Seeds for ₹${res.costRupees}`, 3.5);
        } else {
          pushNotice('Need ₹1,800 to buy 100 kg Seeds', 3.0);
        }
        emitHudSnapshot();
      },
      transferHarvesterToTrolley: () => {
        const harv = vehicles.harvester;
        if (harv.grainStored <= 0) return;
        const dTrolley = Math.hypot(harv.x - imps.trolley.x, harv.z - imps.trolley.z);
        const dTruck = Math.hypot(harv.x - vehicles.truck.x, harv.z - vehicles.truck.z);
        if (dTrolley < 8.5) {
          const space = imps.trolley.grainCapacity - imps.trolley.grainLoad;
          const move = Math.min(harv.grainStored, space);
          if (move > 0) {
            harv.grainStored -= move;
            imps.trolley.grainLoad += move;
            soundEngine.playHitchClank();
            pushNotice(`Unloaded ${Math.round(move)} kg into Tractor Trolley!`, 3.5);
          }
        } else if (dTruck < 8.5) {
          const space = VEHICLE_SPECS.truck.grainCapacity - vehicles.truck.grainStored;
          const move = Math.min(harv.grainStored, space);
          if (move > 0) {
            harv.grainStored -= move;
            vehicles.truck.grainStored += move;
            soundEngine.playHitchClank();
            pushNotice(`Unloaded ${Math.round(move)} kg into Cargo Truck!`, 3.5);
          }
        }
        emitHudSnapshot();
      },
      resetSimulation: () => {
        vehicles = createInitialVehicles();
        imps = createInitialImplements();
        fields = createInitialFields(FIELD_DEFS);
        economy = createInitialEconomy();
        scene.remove(fieldVisuals.root);
        fieldVisuals.dispose();
        fieldVisuals = new FieldVisualManager(fields, textures);
        scene.add(fieldVisuals.root);
        activeVehicleId = 'tractor';
        cameraSnappedForPlay = false;
        pushNotice('Simulation Reset — Welcome back to Shubham Pur Farm!', 4.0);
        emitHudSnapshot();
      },
      setTouchDrive: (throttle: number, steer: number) => {
        touchThrottle = throttle;
        touchSteer = steer;
      },
    };
    simRef.current = actions;

    function emitHudSnapshot(): void {
      const v = vehicles[activeVehicleId];
      const spec = VEHICLE_SPECS[activeVehicleId];
      const snap: HudSnapshot = {
        phase: phaseRef.current,
        activeVehicleId,
        cameraMode,
        speedKmh: Math.round(Math.abs(v.speed) * 3.6),
        rpm: v.rpm,
        fuelPct: Math.round((v.fuel / spec.fuelCapacity) * 100),
        fuelLiters: Math.round(v.fuel),
        attachedImplement: v.attachedImplement,
        workActive: v.workActive,
        toolAngle: v.toolAngle,
        grainCarriedKg: Math.round(getCarriedGrainKg()),
        grainCapacityKg: Math.round(getCarriedCapacityKg()),
        rupees: Math.round(economy.rupees),
        seedsKg: Math.round(economy.seedsKg),
        totalHarvestedKg: Math.round(economy.totalHarvestedKg),
        totalSoldKg: Math.round(economy.totalSoldKg),
        nearbyPrompt: computeNearbyPrompt(),
        fieldSummaries: fields.map(summarizeField),
        timeOfDayLabel: '07:45 AM · Morning Harvest',
        lastNotice: noticeTimer > 0 ? lastNotice : null,
      };
      onSnapshotRef.current(snap);
    }

    // 8. Window Keyboard Listeners (WASD/Arrows + Action Hotkeys)
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (phaseRef.current === 'title') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          soundEngine.resume();
          onStartFromKeyRef.current();
        }
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        e.preventDefault();
        onTogglePauseRef.current();
        return;
      }

      if (phaseRef.current !== 'playing') return;

      if (!e.repeat) {
        if (code === 'KeyF') actions.toggleWork();
        else if (code === 'KeyE') actions.toggleHitch();
        else if (code === 'KeyV') actions.switchVehicle();
        else if (code === 'KeyC') actions.cycleCamera();
        else if (code === 'KeyH') soundEngine.playHorn();
        else if (code === 'KeyB') {
          const prompt = computeNearbyPrompt();
          if (prompt?.type === 'mandi') onOpenMandiRef.current();
          else pushNotice('Drive to Shubham Anaj Mandi (North-East road) to trade', 2.8);
        } else if (code === 'KeyR') {
          const prompt = computeNearbyPrompt();
          if (prompt?.type === 'pump') actions.refuelActiveVehicle();
          else actions.transferHarvesterToTrolley();
        } else if (code === 'Digit1') actions.switchVehicle('tractor');
        else if (code === 'Digit2') actions.switchVehicle('harvester');
        else if (code === 'Digit3') actions.switchVehicle('jcb');
        else if (code === 'Digit4') actions.switchVehicle('bulldozer');
        else if (code === 'Digit5') actions.switchVehicle('truck');
      }
      keysDown.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
    };

    const clearInputs = () => {
      keysDown.clear();
      touchThrottle = 0;
      touchSteer = 0;
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    window.addEventListener('resize', onResize);

    // 9. Sync 3D visual positions on initial mount
    function syncVisualMeshes(dt: number, elapsed: number): void {
      (Object.keys(vehicles) as VehicleId[]).forEach((vid) => {
        const st = vehicles[vid];
        const rig = vehicleRigs[vid];
        rig.root.position.set(st.x, 0, st.z);
        rig.root.rotation.y = st.heading;

        // Roll wheels proportionally to speed
        const spin = (st.speed * dt) / 0.65;
        for (const w of rig.wheels) {
          w.rotation.x += spin;
        }
        // Steer front knuckles
        for (const sp of rig.steerPivots) {
          sp.rotation.y = st.steerAngle * 0.45;
        }
        if (rig.steeringWheel) {
          rig.steeringWheel.rotation.z = -st.steerAngle * 1.4;
        }
        // Harvester reel & header
        if (rig.headerGroup) {
          const targetY = st.workActive ? 0.48 : 0.92;
          rig.headerGroup.position.y = THREE.MathUtils.damp(
            rig.headerGroup.position.y,
            targetY,
            8,
            dt,
          );
        }
        if (rig.reel && st.workActive) {
          rig.reel.rotation.x += dt * 4.8;
        }
        // Harvester / Truck visible grain mound
        if (rig.grainMesh) {
          const cap = VEHICLE_SPECS[vid].grainCapacity;
          const fill = cap > 0 ? Math.min(1, st.grainStored / cap) : 0;
          rig.grainMesh.visible = fill > 0.01;
          rig.grainMesh.scale.y = Math.max(0.05, fill);
        }
        // JCB & Bulldozer hydraulic tool arm animation
        if (rig.bladeGroup) {
          const baseLift = vid === 'bulldozer' ? 0.38 : 1.05;
          const liftOffset = st.toolAngle * 0.75 + (st.workActive ? -0.22 : 0);
          rig.bladeGroup.position.y = THREE.MathUtils.damp(
            rig.bladeGroup.position.y,
            baseLift + liftOffset,
            8,
            dt,
          );
        }
        if (rig.boomGroup && rig.stickGroup) {
          const targetRot = st.workActive
            ? -0.35 + Math.sin(elapsed * 2.4) * 0.25
            : (st.toolAngle - 0.35) * 0.7;
          rig.boomGroup.rotation.x = THREE.MathUtils.damp(rig.boomGroup.rotation.x, targetRot, 7, dt);
          rig.stickGroup.rotation.x = THREE.MathUtils.damp(
            rig.stickGroup.rotation.x,
            st.workActive ? 0.35 + Math.cos(elapsed * 2.4) * 0.3 : 0.1,
            7,
            dt,
          );
        }
        // Subtle diesel idle vibration on tractor farmer
        if (rig.farmerGroup && vid === activeVehicleId && st.fuel > 0) {
          rig.farmerGroup.position.y = 1.35 + Math.sin(elapsed * 26) * 0.005;
          rig.farmerGroup.rotation.z = -st.steerAngle * 0.06;
        }
      });

      // Implements
      (Object.keys(imps) as ImplementId[]).forEach((iid) => {
        const imp = imps[iid];
        const rig = impRigs[iid];
        rig.root.position.set(imp.x, 0, imp.z);
        rig.root.rotation.y = imp.heading;

        const parentSpeed = imp.attachedTo ? vehicles[imp.attachedTo].speed : 0;
        for (const w of rig.wheels) {
          w.rotation.x += (parentSpeed * dt) / 0.45;
        }

        if (rig.workPart) {
          const parentWorking = imp.attachedTo ? vehicles[imp.attachedTo].workActive : false;
          if (iid === 'plow' || iid === 'seeder') {
            const targetY = parentWorking ? -0.18 : 0.08;
            rig.workPart.position.y = THREE.MathUtils.damp(rig.workPart.position.y, targetY, 9, dt);
          } else if (iid === 'trolley') {
            const targetPitch = parentWorking ? -0.38 : 0;
            rig.workPart.rotation.x = THREE.MathUtils.damp(
              rig.workPart.rotation.x,
              targetPitch,
              5,
              dt,
            );
          }
        }
        if (rig.grainMesh && iid === 'trolley') {
          const fill = Math.min(1, imp.grainLoad / imp.grainCapacity);
          rig.grainMesh.visible = fill > 0.01;
          rig.grainMesh.scale.y = Math.max(0.04, fill);
        }
      });

      // Thresher flywheel spins if tractor is nearby with PTO engaged
      const tractor = vehicles.tractor;
      const dThresh = Math.hypot(tractor.x - ZONES.thresherYard.x, tractor.z - ZONES.thresherYard.z);
      if (dThresh < ZONES.thresherYard.radius && tractor.workActive) {
        thresher.flywheel.rotation.x += dt * 14;
      }
    }

    syncVisualMeshes(0.016, 0);
    emitHudSnapshot();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Main Simulation & Render Loop (with Software-WebGL afterDraw pacing)
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    function stepSimulation(dt: number): void {
      elapsedTotal += dt;

      if (noticeTimer > 0) {
        noticeTimer = Math.max(0, noticeTimer - dt);
      }

      // World livestock & highway traffic always animate smoothly
      worldHandle.update(elapsedTotal, dt);

      if (phaseRef.current === 'title') {
        // Live World Camera Flyover spline overlooking village, tractor & golden paddy field
        const angle = elapsedTotal * 0.14;
        camera.position.set(
          Math.sin(angle) * 44,
          16 + Math.sin(elapsedTotal * 0.25) * 3.5,
          -6 + Math.cos(angle) * 34,
        );
        camera.lookAt(4, 2.2, 8);
        fieldVisuals.sync(fields, elapsedTotal);
        syncVisualMeshes(dt, elapsedTotal);
        return;
      }

      if (phaseRef.current !== 'playing') {
        return;
      }

      // Active Vehicle Drive Input
      const v = vehicles[activeVehicleId];
      const spec = VEHICLE_SPECS[activeVehicleId];

      let throttle = touchThrottle;
      let steer = touchSteer;
      if (keysDown.has('KeyW') || keysDown.has('ArrowUp')) throttle += 1;
      if (keysDown.has('KeyS') || keysDown.has('ArrowDown')) throttle -= 1;
      if (keysDown.has('KeyA') || keysDown.has('ArrowLeft')) steer += 1;
      if (keysDown.has('KeyD') || keysDown.has('ArrowRight')) steer -= 1;
      const brake = keysDown.has('Space');

      if (keysDown.has('KeyQ')) v.toolAngle = THREE.MathUtils.clamp(v.toolAngle + dt * 0.7, 0, 1);
      if (keysDown.has('KeyZ')) v.toolAngle = THREE.MathUtils.clamp(v.toolAngle - dt * 0.7, 0, 1);

      stepVehicleKinematics(
        v,
        spec,
        {
          throttle: THREE.MathUtils.clamp(throttle, -1, 1),
          steer: THREE.MathUtils.clamp(steer, -1, 1),
          brake,
        },
        WORLD_COLLIDERS,
        dt,
      );

      // Update attached implement physics
      if (v.attachedImplement) {
        stepHitchedImplement(v, spec, imps[v.attachedImplement], dt);
      }

      // Tire dust particles when driving fast
      if (Math.abs(v.speed) > 3.5 && Math.random() < 0.45) {
        const rearX = v.x - Math.sin(v.heading) * 1.4 + (Math.random() - 0.5) * 1.4;
        const rearZ = v.z - Math.cos(v.heading) * 1.4 + (Math.random() - 0.5) * 1.4;
        spawnParticle(
          rearX,
          0.22,
          rearZ,
          (Math.random() - 0.5) * 0.9,
          0.6 + Math.random() * 0.6,
          (Math.random() - 0.5) * 0.9,
          1.3,
          0.65,
          0.68,
          0.58,
          0.46,
        );
      }

      // Active Agricultural Work Application
      workAccum += dt;
      if (v.workActive && v.fuel > 0.01 && workAccum >= 0.12) {
        workAccum = 0;

        if (activeVehicleId === 'tractor' && v.attachedImplement) {
          const imp = imps[v.attachedImplement];
          if (imp.id === 'plow' || imp.id === 'seeder' || imp.id === 'water_tanker') {
            const res = applyWorkAtPoint(
              fields,
              imp.x,
              imp.z,
              imp.workWidth * 0.5,
              imp.id,
              economy,
            );

            // Spawn grounded implement particles (soil clods / water mist)
            for (let p = 0; p < 3; p++) {
              if (imp.id === 'water_tanker') {
                spawnParticle(
                  imp.x + (Math.random() - 0.5) * 4.6,
                  0.75,
                  imp.z + (Math.random() - 0.5) * 1.0,
                  (Math.random() - 0.5) * 1.6,
                  -0.6,
                  (Math.random() - 0.5) * 1.6,
                  0.8,
                  0.45,
                  0.72,
                  0.88,
                  0.98,
                );
              } else if (res.cellsChanged > 0 || Math.abs(v.speed) > 0.4) {
                spawnParticle(
                  imp.x + (Math.random() - 0.5) * 2.6,
                  0.25,
                  imp.z + (Math.random() - 0.5) * 1.0,
                  (Math.random() - 0.5) * 1.4,
                  1.2 + Math.random() * 0.8,
                  (Math.random() - 0.5) * 1.4,
                  1.0,
                  0.5,
                  0.44,
                  0.33,
                  0.23,
                );
              }
            }
            if (imp.id === 'seeder' && economy.seedsKg < 1 && res.cellsChanged === 0) {
              pushNotice('Out of Seeds! Visit Shubham Anaj Mandi to buy more seeds.', 3.2);
            }
          }
        } else if (activeVehicleId === 'harvester') {
          const hx = v.x + Math.sin(v.heading) * 3.1;
          const hz = v.z + Math.cos(v.heading) * 3.1;
          const space = VEHICLE_SPECS.harvester.grainCapacity - v.grainStored;
          if (space > 1) {
            const res = applyWorkAtPoint(fields, hx, hz, 2.7, 'harvester', economy);
            if (res.grainHarvestedKg > 0) {
              v.grainStored = Math.min(
                VEHICLE_SPECS.harvester.grainCapacity,
                v.grainStored + res.grainHarvestedKg,
              );
              if (res.crop) lastLoadedCrop = res.crop;
              for (let p = 0; p < 4; p++) {
                spawnParticle(
                  hx + (Math.random() - 0.5) * 3.2,
                  1.1,
                  hz + (Math.random() - 0.5) * 1.4,
                  (Math.random() - 0.5) * 2.0,
                  1.5 + Math.random(),
                  (Math.random() - 0.5) * 2.0,
                  0.95,
                  0.6,
                  0.86,
                  0.7,
                  0.28,
                );
              }
            }
          } else {
            pushNotice('Harvester Grain Hopper Full! Unload into Trolley/Truck [R] or sell at Mandi.', 3.5);
          }
        } else if (activeVehicleId === 'bulldozer') {
          const bx = v.x + Math.sin(v.heading) * 2.3;
          const bz = v.z + Math.cos(v.heading) * 2.3;
          applyWorkAtPoint(fields, bx, bz, 2.0, 'bulldozer', economy);
        }
      }

      // Advance crop growth across watered/growing fields
      stepFieldsGrowth(fields, dt);
      fieldVisuals.sync(fields, elapsedTotal);

      // Update particles in place
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const p = particles[i];
        if (!p.active) {
          _dummy.position.set(0, -20, 0);
          _dummy.scale.set(0.001, 0.001, 0.001);
          _dummy.updateMatrix();
          particleMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          _dummy.position.set(0, -20, 0);
          _dummy.scale.set(0.001, 0.001, 0.001);
          _dummy.updateMatrix();
          particleMesh.setMatrixAt(i, _dummy.matrix);
          continue;
        }
        p.vy -= 4.2 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.05, p.y + p.vy * dt);
        p.z += p.vz * dt;
        const fade = 1 - p.life / p.maxLife;
        _dummy.position.set(p.x, p.y, p.z);
        _dummy.scale.setScalar(p.scale * fade);
        _dummy.updateMatrix();
        particleMesh.setMatrixAt(i, _dummy.matrix);
        _pColor.setRGB(p.r, p.g, p.b);
        particleMesh.setColorAt(i, _pColor);
      }
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

      // Sync vehicle & implement visual meshes
      syncVisualMeshes(dt, elapsedTotal);

      // Update directional shadow target to track active vehicle tightly
      sunLight.target.position.set(v.x, 0, v.z);
      sunLight.position.set(v.x + sunPos.x * 75, sunPos.y * 75, v.z + sunPos.z * 75);

      // Smooth exponentially damped Gameplay Camera
      const fx = Math.sin(v.heading);
      const fz = Math.cos(v.heading);
      if (cameraMode === 'chase') {
        const distBack = activeVehicleId === 'harvester' ? 14.5 : 10.5;
        const height = activeVehicleId === 'harvester' ? 6.4 : 4.8;
        _camDesired.set(v.x - fx * distBack, height, v.z - fz * distBack);
        _camLookTarget.set(v.x + fx * 3.5, 1.8, v.z + fz * 3.5);
      } else if (cameraMode === 'hood') {
        _camDesired.set(v.x + fx * 0.4, 2.35, v.z + fz * 0.4);
        _camLookTarget.set(v.x + fx * 14, 1.5, v.z + fz * 14);
      } else {
        _camDesired.set(v.x - fx * 6, 26, v.z - fz * 14);
        _camLookTarget.set(v.x + fx * 2, 0.5, v.z + fz * 2);
      }

      if (!cameraSnappedForPlay) {
        camera.position.copy(_camDesired);
        camera.lookAt(_camLookTarget);
        cameraSnappedForPlay = true;
      } else {
        const camAlpha = 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(_camDesired, camAlpha);
        camera.lookAt(_camLookTarget);
      }

      // Engine Audio Modulation
      soundEngine.updateEngine(v.rpm, v.fuel > 0.01, v.workActive);

      // Throttled <= 10Hz React HUD updates
      hudEmitTimer += dt;
      if (hudEmitTimer >= 0.12) {
        hudEmitTimer = 0;
        emitHudSnapshot();
      }
    }

    function afterDraw(cb: () => void): void {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick(): void {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      stepSimulation(dt);
      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      soundEngine.updateEngine(0, false, false);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);

      fieldVisuals.dispose();
      worldHandle.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      materials.dispose();
      textures.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [simRef]);

  return (
    <div
      ref={mountRef}
      data-testid="farm-viewport"
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
