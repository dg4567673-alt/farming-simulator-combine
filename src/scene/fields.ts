import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FieldState } from '../sim/types';
import { SceneTextureBundle } from './textures';

interface FieldMeshGroup {
  fieldId: string;
  lastVersion: number;
  soilCellsMesh: THREE.InstancedMesh;
  furrowsMesh: THREE.InstancedMesh;
  cropsMesh: THREE.InstancedMesh;
  cropCountPerCell: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function createWheatTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // 4 angled slender stalks + grain heads per tuft so fields look lush and organic
  const offsets: Array<[number, number, number, number]> = [
    [-0.14, -0.08, 0.08, -0.06],
    [0.14, 0.09, -0.07, 0.08],
    [-0.08, 0.14, 0.06, 0.09],
    [0.11, -0.13, -0.09, -0.05],
  ];
  for (const [ox, oz, rx, rz] of offsets) {
    const stem = new THREE.CylinderGeometry(0.022, 0.045, 0.85, 4);
    stem.translate(0, 0.425, 0);
    stem.rotateX(rx);
    stem.rotateZ(rz);
    stem.translate(ox, 0, oz);
    parts.push(stem);

    const ear = new THREE.ConeGeometry(0.06, 0.28, 5);
    ear.translate(0, 0.92, 0);
    ear.rotateX(rx);
    ear.rotateZ(rz);
    ear.translate(ox, 0, oz);
    parts.push(ear);
  }
  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged;
}

export class FieldVisualManager {
  public readonly root = new THREE.Group();
  private groups: FieldMeshGroup[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private materials: THREE.Material[] = [];

  constructor(fields: FieldState[], tex: SceneTextureBundle) {
    const soilGeo = new THREE.PlaneGeometry(1, 1);
    soilGeo.rotateX(-Math.PI / 2);
    this.geometries.push(soilGeo);

    const furrowGeo = new THREE.BoxGeometry(0.88, 0.14, 0.22);
    this.geometries.push(furrowGeo);

    const stalkGeo = createWheatTuftGeometry();
    this.geometries.push(stalkGeo);

    const soilMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.soilAlbedo,
      bumpMap: tex.soilBump,
      bumpScale: 0.08,
      roughness: 0.94,
      metalness: 0.0,
    });
    this.materials.push(soilMat);

    const furrowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tex.soilAlbedo,
      bumpMap: tex.soilBump,
      bumpScale: 0.09,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.materials.push(furrowMat);

    const cropMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.0,
    });
    this.materials.push(cropMat);

    const bundMat = new THREE.MeshStandardMaterial({
      color: 0x7a664c,
      bumpMap: tex.soilBump,
      bumpScale: 0.06,
      roughness: 0.96,
      metalness: 0.0,
    });
    this.materials.push(bundMat);

    for (const field of fields) {
      const { def } = field;
      const w = def.maxX - def.minX;
      const h = def.maxZ - def.minZ;
      const cx = (def.minX + def.maxX) * 0.5;
      const cz = (def.minZ + def.maxZ) * 0.5;

      // Raised earthen field perimeter bunds ("Medh")
      const bundThick = 0.72;
      const bundHeight = 0.24;
      const northB = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, bundHeight, bundThick), bundMat);
      northB.position.set(cx, bundHeight * 0.5, def.minZ - bundThick * 0.5);
      northB.receiveShadow = true;
      this.root.add(northB);
      this.geometries.push(northB.geometry);

      const southB = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, bundHeight, bundThick), bundMat);
      southB.position.set(cx, bundHeight * 0.5, def.maxZ + bundThick * 0.5);
      southB.receiveShadow = true;
      this.root.add(southB);
      this.geometries.push(southB.geometry);

      const westB = new THREE.Mesh(new THREE.BoxGeometry(bundThick, bundHeight, h), bundMat);
      westB.position.set(def.minX - bundThick * 0.5, bundHeight * 0.5, cz);
      westB.receiveShadow = true;
      this.root.add(westB);
      this.geometries.push(westB.geometry);

      const eastB = new THREE.Mesh(new THREE.BoxGeometry(bundThick, bundHeight, h), bundMat);
      eastB.position.set(def.maxX + bundThick * 0.5, bundHeight * 0.5, cz);
      eastB.receiveShadow = true;
      this.root.add(eastB);
      this.geometries.push(eastB.geometry);

      const totalCells = def.cols * def.rows;
      const soilCellsMesh = new THREE.InstancedMesh(soilGeo, soilMat, totalCells);
      soilCellsMesh.receiveShadow = true;
      soilCellsMesh.frustumCulled = false;
      this.root.add(soilCellsMesh);

      const furrowsMesh = new THREE.InstancedMesh(furrowGeo, furrowMat, totalCells * 3);
      furrowsMesh.receiveShadow = true;
      furrowsMesh.frustumCulled = false;
      this.root.add(furrowsMesh);

      // 12 dense multi-stalk tufts per 4m x 4m cell (= 48 stalks per cell!)
      const cropCountPerCell = 12;
      const cropsMesh = new THREE.InstancedMesh(stalkGeo, cropMat, totalCells * cropCountPerCell);
      cropsMesh.castShadow = true;
      cropsMesh.receiveShadow = true;
      cropsMesh.frustumCulled = false;
      this.root.add(cropsMesh);

      this.groups.push({
        fieldId: def.id,
        lastVersion: -1,
        soilCellsMesh,
        furrowsMesh,
        cropsMesh,
        cropCountPerCell,
      });
    }

    this.sync(fields, 0);
  }

  public sync(fields: FieldState[], elapsedTime: number): void {
    for (let fIdx = 0; fIdx < fields.length; fIdx++) {
      const field = fields[fIdx];
      const grp = this.groups[fIdx];
      const { def } = field;
      const cellW = (def.maxX - def.minX) / def.cols;
      const cellH = (def.maxZ - def.minZ) / def.rows;

      const needsFullRebuild = grp.lastVersion !== field.version;

      if (needsFullRebuild) {
        grp.lastVersion = field.version;

        for (let i = 0; i < field.cells.length; i++) {
          const cell = field.cells[i];
          const cx = def.minX + (cell.col + 0.5) * cellW;
          const cz = def.minZ + (cell.row + 0.5) * cellH;

          _dummy.position.set(cx, 0.032, cz);
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(cellW * 0.995, 1, cellH * 0.995);
          _dummy.updateMatrix();
          grp.soilCellsMesh.setMatrixAt(i, _dummy.matrix);

          if (cell.stage === 'fallow') {
            _color.setRGB(0.88, 0.82, 0.72);
          } else if (cell.moisture > 0.55) {
            _color.setRGB(0.42, 0.34, 0.27);
          } else if (cell.stage === 'plowed' || cell.stage === 'seeded') {
            _color.setRGB(0.68, 0.57, 0.45);
          } else {
            _color.setRGB(0.56, 0.47, 0.37);
          }
          grp.soilCellsMesh.setColorAt(i, _color);

          const showFurrows = cell.stage !== 'fallow';
          for (let r = 0; r < 3; r++) {
            const fIndex = i * 3 + r;
            if (showFurrows) {
              _dummy.position.set(cx, 0.055, cz + (r - 1) * (cellH * 0.28));
              _dummy.rotation.set(0, 0, 0);
              _dummy.scale.set(cellW * 0.96, 1, 1.3);
            } else {
              _dummy.position.set(cx, -5, cz);
              _dummy.scale.set(0.001, 0.001, 0.001);
            }
            _dummy.updateMatrix();
            grp.furrowsMesh.setMatrixAt(fIndex, _dummy.matrix);
            grp.furrowsMesh.setColorAt(fIndex, _color);
          }
        }
        grp.soilCellsMesh.instanceMatrix.needsUpdate = true;
        if (grp.soilCellsMesh.instanceColor) grp.soilCellsMesh.instanceColor.needsUpdate = true;
        grp.furrowsMesh.instanceMatrix.needsUpdate = true;
        if (grp.furrowsMesh.instanceColor) grp.furrowsMesh.instanceColor.needsUpdate = true;
      }

      const windSwayX = Math.sin(elapsedTime * 1.6 + fIdx) * 0.06;
      const windSwayZ = Math.cos(elapsedTime * 1.3 + fIdx) * 0.04;

      for (let i = 0; i < field.cells.length; i++) {
        const cell = field.cells[i];
        const cx = def.minX + (cell.col + 0.5) * cellW;
        const cz = def.minZ + (cell.row + 0.5) * cellH;

        const hasCrop =
          cell.stage === 'watered' || cell.stage === 'growing' || cell.stage === 'ripe';
        const heightScale =
          cell.stage === 'ripe'
            ? 1.28
            : cell.stage === 'growing'
              ? 0.45 + cell.growth * 0.78
              : cell.stage === 'watered'
                ? 0.28
                : 0.001;

        for (let k = 0; k < grp.cropCountPerCell; k++) {
          const cIdx = i * grp.cropCountPerCell + k;
          if (!hasCrop) {
            _dummy.position.set(cx, -5, cz);
            _dummy.scale.set(0.001, 0.001, 0.001);
          } else {
            const colIdx = k % 4;
            const rowIdx = Math.floor(k / 4);
            const jitterX = (((i * 7 + k * 13) % 11) - 5) * 0.07;
            const jitterZ = (((i * 11 + k * 17) % 11) - 5) * 0.07;
            const ox = ((colIdx - 1.5) / 4) * cellW + jitterX;
            const oz = ((rowIdx - 1.0) / 3) * cellH + jitterZ;

            _dummy.position.set(cx + ox, 0.03, cz + oz);
            _dummy.rotation.set(windSwayZ, (k * 1.37 + i * 0.6) % (Math.PI * 2), windSwayX);
            const wScale = 1.85 + ((k + i) % 3) * 0.28;
            _dummy.scale.set(wScale, heightScale, wScale);
          }
          _dummy.updateMatrix();
          grp.cropsMesh.setMatrixAt(cIdx, _dummy.matrix);

          if (needsFullRebuild) {
            const shade = 0.88 + ((i + k) % 4) * 0.06;
            if (cell.stage === 'ripe') {
              if (def.crop === 'mustard') _color.setRGB(0.84 * shade, 0.67 * shade, 0.14 * shade);
              else if (def.crop === 'paddy') _color.setRGB(0.82 * shade, 0.69 * shade, 0.28 * shade);
              else _color.setRGB(0.85 * shade, 0.71 * shade, 0.32 * shade);
            } else if (cell.stage === 'growing') {
              _color.setRGB(0.29 * shade, 0.48 * shade, 0.18 * shade);
            } else {
              _color.setRGB(0.36 * shade, 0.54 * shade, 0.21 * shade);
            }
            grp.cropsMesh.setColorAt(cIdx, _color);
          }
        }
      }
      grp.cropsMesh.instanceMatrix.needsUpdate = true;
      if (needsFullRebuild && grp.cropsMesh.instanceColor) {
        grp.cropsMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public dispose(): void {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
  }
}
