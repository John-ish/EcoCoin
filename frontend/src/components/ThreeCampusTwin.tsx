import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Bin } from '../types';

interface ThreeCampusTwinProps {
  bins: Bin[];
  selectedBinId?: string;
  onSelectBin: (bin: Bin) => void;
}

const CATEGORY_HEX_COLORS: Record<string, number> = {
  plastic: 0x06b6d4,   // Cyan
  paper: 0x3b82f6,     // Blue
  metal: 0xeab308,     // Amber
  glass: 0x10b981,     // Emerald
  organic: 0x84cc16,   // Lime
  general: 0x94a3b8,   // Slate
  'multi-stream': 0xa855f7, // Purple
};

export const ThreeCampusTwin: React.FC<ThreeCampusTwinProps> = ({
  bins,
  selectedBinId,
  onSelectBin,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(45, 55, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xa5f3fc, 1.2);
    dirLight.position.set(30, 50, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x10b981, 1.5, 80);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    // 3. Ground Terrain & Campus Grid
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(100, 30, 0x1e293b, 0x0f172a);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // 4. Stylized Campus Buildings
    const buildings = [
      { name: 'Turing Hall', x: -18, z: -15, w: 14, h: 12, d: 10, color: 0x1e293b },
      { name: 'Main Library', x: 0, z: -18, w: 18, h: 16, d: 12, color: 0x1e293b },
      { name: 'Student Union', x: 16, z: 0, w: 14, h: 9, d: 14, color: 0x1e293b },
      { name: 'Edison Complex', x: 18, z: -16, w: 12, h: 14, d: 10, color: 0x1e293b },
      { name: 'Carson Pavilion', x: -16, z: 12, w: 12, h: 8, d: 16, color: 0x1e293b },
      { name: 'Oak Residence', x: -8, z: 22, w: 16, h: 15, d: 10, color: 0x1e293b },
      { name: 'Field House', x: 16, z: 20, w: 14, h: 10, d: 12, color: 0x1e293b },
    ];

    buildings.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshStandardMaterial({
        color: b.color,
        roughness: 0.4,
        metalness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      // Building accent roof glow
      const roofGeo = new THREE.PlaneGeometry(b.w, b.d);
      const roofMat = new THREE.MeshBasicMaterial({ color: 0x334155, wireframe: true });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.x = -Math.PI / 2;
      roof.position.set(b.x, b.h + 0.1, b.z);
      scene.add(roof);
    });

    // 5. Smart Bin 3D Beacons
    const binMeshes: { mesh: THREE.Group; bin: Bin }[] = [];
    const raycastTargets: THREE.Object3D[] = [];

    bins.forEach((bin, idx) => {
      // Map latitude & longitude into 3D scene space
      const angle = (idx / bins.length) * Math.PI * 2;
      const radius = 18 + (idx % 3) * 6;
      const posX = Math.cos(angle) * radius;
      const posZ = Math.sin(angle) * radius;

      const binGroup = new THREE.Group();
      binGroup.position.set(posX, 0, posZ);

      // Base cylinder (pedestal)
      const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 16);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.y = 0.2;
      binGroup.add(baseMesh);

      // Fill level cylinder (height scales with fill %)
      const fillHeight = Math.max(0.6, (bin.fill_level_pct / 100) * 3.5);
      const catColor = CATEGORY_HEX_COLORS[bin.category] || 0x10b981;
      const statusColor = bin.status === 'FULL' ? 0xef4444 : bin.status === 'NEAR_FULL' ? 0xf59e0b : catColor;

      const fillGeo = new THREE.CylinderGeometry(0.9, 0.9, fillHeight, 16);
      const fillMat = new THREE.MeshStandardMaterial({
        color: statusColor,
        roughness: 0.3,
        metalness: 0.7,
        emissive: statusColor,
        emissiveIntensity: bin.id === selectedBinId ? 0.6 : 0.2,
      });
      const fillMesh = new THREE.Mesh(fillGeo, fillMat);
      fillMesh.position.y = 0.4 + fillHeight / 2;
      fillMesh.castShadow = true;
      binGroup.add(fillMesh);

      // Top floating beacon ring
      const ringGeo = new THREE.TorusGeometry(1.3, 0.12, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: statusColor });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 4.8;
      binGroup.add(ringMesh);

      binGroup.userData = { bin };
      scene.add(binGroup);
      binMeshes.push({ mesh: binGroup, bin });
      raycastTargets.push(fillMesh);
    });

    // 6. Mouse Interaction & Raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const parentGroup = hit.parent;
        if (parentGroup && parentGroup.userData.bin) {
          onSelectBin(parentGroup.userData.bin);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 7. Interactive Orbit & Subtle Auto-Pan
    let angleCam = 0;
    let isDragging = false;
    let prevMouseX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const delta = e.clientX - prevMouseX;
        angleCam += delta * 0.005;
        prevMouseX = e.clientX;
      }
    };
    const onMouseUp = () => {
      isDragging = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // 8. Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (!isDragging) {
        angleCam += 0.0012; // slow atmospheric drift
      }

      camera.position.x = Math.cos(angleCam) * 65;
      camera.position.z = Math.sin(angleCam) * 65;
      camera.lookAt(0, 4, 0);

      // Animate beacon rings
      binMeshes.forEach(({ mesh }) => {
        const ring = mesh.children[2];
        if (ring) {
          ring.rotation.z += 0.02;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bins, selectedBinId]);

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-4 left-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
        <span className="font-mono">3D WebGL Digital Twin • Drag to Rotate Camera</span>
      </div>
      <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[11px] text-slate-400">
        Click any 3D cylinder beacon to view live IoT sensor telemetry.
      </div>
    </div>
  );
};
