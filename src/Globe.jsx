import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Globe() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    // ─── Earth group ───
    const earth = new THREE.Group();
    earth.rotation.z = 0.4;
    scene.add(earth);

    // Dark inner sphere
    const fillGeo = new THREE.SphereGeometry(1.97, 32, 24);
    const fillMat = new THREE.MeshBasicMaterial({
      color: 0x0a1a35,
      transparent: true,
      opacity: 0.95,
    });
    earth.add(new THREE.Mesh(fillGeo, fillMat));

    // Subtle wireframe lat/lng
    const wireGeo = new THREE.SphereGeometry(2, 36, 24);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a5f,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    earth.add(new THREE.Mesh(wireGeo, wireMat));

    // ─── Continent dots in blue ───
    const dotPositions = [];
    const dotColors = [];
    const target = 5500;
    let attempts = 0;
    while (dotPositions.length / 3 < target && attempts < 60000) {
      attempts++;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const x = Math.sin(phi) * Math.cos(theta);
      const y = Math.sin(phi) * Math.sin(theta);
      const z = Math.cos(phi);

      const n =
        Math.sin(x * 2.3 + 0.5) * Math.cos(y * 2.7) +
        Math.sin(y * 4.1) * Math.cos(z * 3.9) * 0.6 +
        Math.sin(z * 6.3) * Math.cos(x * 5.5) * 0.35;

      if (n > 0.4) {
        const r = 2.01;
        dotPositions.push(x * r, y * r, z * r);
        const t = Math.random();
        // Blue gradient
        dotColors.push(0.3 + t * 0.25, 0.7 + t * 0.2, 1.0);
      }
    }

    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(dotPositions, 3)
    );
    dotGeo.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(dotColors, 3)
    );
    const dotMat = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    earth.add(new THREE.Points(dotGeo, dotMat));

    // ─── Incident markers (red/orange) ───
    const incidents = [];
    for (let i = 0; i < 28; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 2.04;
      const pos = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.sin(phi) * Math.sin(theta) * r,
        Math.cos(phi) * r
      );

      const incGeo = new THREE.SphereGeometry(0.025, 8, 8);
      const incMat = new THREE.MeshBasicMaterial({
        color: 0xff6b35,
        transparent: true,
        opacity: 1,
      });
      const inc = new THREE.Mesh(incGeo, incMat);
      inc.position.copy(pos);
      earth.add(inc);
      incidents.push({ mesh: inc, mat: incMat, phase: Math.random() * Math.PI * 2 });
    }

    // ─── Atmosphere ───
    const atmoGeo = new THREE.SphereGeometry(2.18, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(atmoGeo, atmoMat));

    const haloGeo = new THREE.SphereGeometry(2.5, 48, 48);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(haloGeo, haloMat));

    // ─── Tilted orbital rings (Saturn-like) ───
    const orbits = [];
    const orbitConfigs = [
      {
        rx: 3.2,
        ry: 3.2,
        tilt: [Math.PI / 2.4, 0.3, 0.1],
        speed: 0.006,
        satColor: 0xa5f3fc,
        satSize: 0.08,
      },
      {
        rx: 3.7,
        ry: 3.7,
        tilt: [-Math.PI / 2.8, -0.4, 0.15],
        speed: -0.004,
        satColor: 0x60a5fa,
        satSize: 0.06,
      },
    ];

    orbitConfigs.forEach((cfg) => {
      const pts = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * cfg.rx, Math.sin(a) * cfg.ry, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.4,
      });
      const orbitLine = new THREE.Line(geo, mat);
      orbitLine.rotation.set(...cfg.tilt);
      scene.add(orbitLine);

      const satGeo = new THREE.SphereGeometry(cfg.satSize, 16, 16);
      const satMat = new THREE.MeshBasicMaterial({ color: cfg.satColor });
      const sat = new THREE.Mesh(satGeo, satMat);
      orbitLine.add(sat);

      orbits.push({
        line: orbitLine,
        sat,
        rx: cfg.rx,
        ry: cfg.ry,
        speed: cfg.speed,
        phase: Math.random() * Math.PI * 2,
      });
    });

    // ─── Background starfield ───
    const starPositions = [];
    for (let i = 0; i < 800; i++) {
      const r = 30 + Math.random() * 40;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      starPositions.push(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.sin(phi) * Math.sin(theta) * r,
        Math.cos(phi) * r
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starPositions, 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.4,
      transparent: true,
      opacity: 0.6,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // ─── Animate ───
    let frame = 0;
    let animId;

    const animate = () => {
      frame++;

      earth.rotation.y += 0.0018;

      orbits.forEach((o) => {
        o.phase += o.speed;
        o.sat.position.set(
          Math.cos(o.phase) * o.rx,
          Math.sin(o.phase) * o.ry,
          0
        );
      });

      // Pulse incidents
      incidents.forEach((inc) => {
        inc.phase += 0.05;
        inc.mat.opacity = 0.5 + Math.sin(inc.phase) * 0.5;
        inc.mesh.scale.setScalar(0.7 + Math.sin(inc.phase) * 0.3);
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    const onResize = () => {
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material))
            obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" />;
}