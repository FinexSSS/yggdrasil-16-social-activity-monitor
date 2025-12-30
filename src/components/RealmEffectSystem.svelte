<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { onMount, tick } from 'svelte';
  import type { RealmEffectType, RealmName } from '$lib/utils/realmEffects';
  import { REALM_EFFECTS } from '$lib/utils/realmEffects';
  import * as THREE from 'three';

  export let activeRealm: RealmName | null = null;

  let particleSystem: THREE.Points | null = null;
  let particles: THREE.BufferGeometry | null = null;
  let particleMaterial: THREE.PointsMaterial | null = null;
  let velocities: Float32Array | null = null;
  let time = 0;
  let particleCount = 0;
  
  // Line-based effects (rain, fire streaks)
  let lineSystem: THREE.LineSegments | null = null;
  let lineGeometry: THREE.BufferGeometry | null = null;
  let lineMaterial: THREE.LineBasicMaterial | null = null;

  // Track if effect is ready to render
  let effectReady = false;
  let renderKey = 0; // Force re-render

  $: if (activeRealm) {
    console.log('RealmEffectSystem: Activating realm effect:', activeRealm);
    createEffectSystem(REALM_EFFECTS[activeRealm].type, REALM_EFFECTS[activeRealm].particleColor);
    effectReady = true;
    renderKey++; // Trigger re-render
  } else {
    cleanup();
    effectReady = false;
  }

  function cleanup() {
    if (particles) particles.dispose();
    if (particleMaterial) particleMaterial.dispose();
    if (lineGeometry) lineGeometry.dispose();
    if (lineMaterial) lineMaterial.dispose();
    particles = null;
    particleMaterial = null;
    lineGeometry = null;
    lineMaterial = null;
    velocities = null;
    particleCount = 0;
  }

  function createEffectSystem(type: RealmEffectType, color: number) {
    cleanup();

    switch (type) {
      case 'aurora':
        createAuroraEffect(color);
        break;
      case 'bloom':
        createBloomEffect(color);
        break;
      case 'starlight':
        createStarlightEffect(color);
        break;
      case 'rain':
        createRainEffect(color);
        break;
      case 'snowstorm':
        createSnowstormEffect(color);
        break;
      case 'embers':
        createEmbersEffect(color);
        break;
      case 'fog':
        createFogEffect(color);
        break;
      case 'fire':
        createFireEffect(color);
        break;
      case 'void':
        createVoidEffect(color);
        break;
    }
  }

  // Asgard - Aurora Borealis (Golden waves)
  function createAuroraEffect(color: number) {
    particleCount = 2000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Create a curtain shape
      positions[i3] = (Math.random() - 0.5) * 80; // Wide spread X
      positions[i3 + 1] = 10 + Math.random() * 20; // High up Y
      positions[i3 + 2] = (Math.random() - 0.5) * 40; // Depth Z
      
      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
  }

  // Vanaheim - Bloom (Pink petals/pollen)
  function createBloomEffect(color: number) {
    particleCount = 1000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = Math.random() * 40;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;
      
      velocities[i3] = (Math.random() - 0.5) * 0.05;
      velocities[i3 + 1] = -0.02 - Math.random() * 0.05; // Fall slowly
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }

  // Alfheim - Starlight (Twinkling stars)
  function createStarlightEffect(color: number) {
    particleCount = 1500;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    // Store initial Y for twinkling offset
    velocities = new Float32Array(particleCount * 3); 

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = Math.random() * 50;
      positions[i3 + 2] = (Math.random() - 0.5) * 80;
      
      // Use velocity to store random phase for twinkling
      velocities[i3] = Math.random() * Math.PI * 2; 
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }

  // Midgard - Rain (Blue rain falling)
  function createRainEffect(color: number) {
    particleCount = 2000;
    lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 6); // 2 points per line
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      
      const x = (Math.random() - 0.5) * 60;
      const y = Math.random() * 40;
      const z = (Math.random() - 0.5) * 60;
      
      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;
      
      positions[i6 + 3] = x;
      positions[i6 + 4] = y - 0.8; // Line length
      positions[i6 + 5] = z;
      
      velocities[i3] = 0;
      velocities[i3 + 1] = -0.8 - Math.random() * 0.5; // Fast fall
      velocities[i3 + 2] = 0;
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6
    });
  }

  // Jötunheim - Snowstorm (White blizzard)
  function createSnowstormEffect(color: number) {
    particleCount = 3000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 70;
      positions[i3 + 1] = Math.random() * 40;
      positions[i3 + 2] = (Math.random() - 0.5) * 70;
      
      velocities[i3] = -0.1 - Math.random() * 0.2; // Wind X
      velocities[i3 + 1] = -0.1 - Math.random() * 0.2; // Fall Y
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1; // Random Z
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.25,
      transparent: true,
      opacity: 0.8
    });
  }

  // Svartalfheim - Embers (Orange embers rising)
  function createEmbersEffect(color: number) {
    particleCount = 1000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = -5 + Math.random() * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
      
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = 0.02 + Math.random() * 0.05; // Rise
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
  }

  // Niflheim - Fog (Cyan mist)
  function createFogEffect(color: number) {
    particleCount = 2000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 80;
      positions[i3 + 1] = Math.random() * 15; // Low lying
      positions[i3 + 2] = (Math.random() - 0.5) * 80;
      
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.8, // Larger particles for fog
      transparent: true,
      opacity: 0.3, // More transparent
      blending: THREE.AdditiveBlending
    });
  }

  // Muspelheim - Fire (Red fire streaks)
  function createFireEffect(color: number) {
    particleCount = 1500;
    lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 6);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      
      const x = (Math.random() - 0.5) * 40;
      const y = -5 + Math.random() * 20;
      const z = (Math.random() - 0.5) * 40;
      
      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;
      
      positions[i6 + 3] = x;
      positions[i6 + 4] = y + 0.5; // Upward streak
      positions[i6 + 5] = z;
      
      velocities[i3] = (Math.random() - 0.5) * 0.05;
      velocities[i3 + 1] = 0.1 + Math.random() * 0.2; // Fast rise
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
    }

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending
    });
  }

  // Helheim - Void (Dark purple void particles)
  function createVoidEffect(color: number) {
    particleCount = 1000;
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Sphere distribution
      const r = 10 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 10; // Center around tree
      positions[i3 + 2] = r * Math.cos(phi);
      
      // Move towards center
      velocities[i3] = -positions[i3] * 0.005;
      velocities[i3 + 1] = -(positions[i3 + 1] - 10) * 0.005;
      velocities[i3 + 2] = -positions[i3 + 2] * 0.005;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
    });
  }

  // Animation loop
  useTask((delta) => {
    if (!activeRealm) return;
    
    time += delta;
    const effectType = REALM_EFFECTS[activeRealm].type;

    // Update particles
    if (particles && velocities) {
      const positions = particles.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Special behavior for aurora (wave motion)
        if (effectType === 'aurora') {
          positions[i3 + 1] += Math.sin(time * 0.5 + i * 0.1) * 0.02;
          positions[i3 + 1] += Math.sin(time + positions[i3] * 0.1) * 0.02;
          positions[i3 + 2] += velocities[i3 + 2];
        }
        // Starlight twinkle
        else if (effectType === 'starlight') {
          positions[i3 + 1] += Math.sin(time * 2 + i) * 0.005;
          if (particleMaterial) {
            particleMaterial.opacity = 0.5 + Math.sin(time * 3 + i * 0.5) * 0.4;
          }
        }
        // Void implosion
        else if (effectType === 'void') {
          // Move towards center and reset
          positions[i3] += velocities[i3];
          positions[i3 + 1] += velocities[i3 + 1];
          positions[i3 + 2] += velocities[i3 + 2];
          
          // Check distance to center (0, 10, 0)
          const dx = positions[i3];
          const dy = positions[i3 + 1] - 10;
          const dz = positions[i3 + 2];
          const distSq = dx*dx + dy*dy + dz*dz;
          
          if (distSq < 4) { // Reset if too close
             const r = 30 + Math.random() * 10;
             const theta = Math.random() * Math.PI * 2;
             const phi = Math.acos(2 * Math.random() - 1);
             positions[i3] = r * Math.sin(phi) * Math.cos(theta);
             positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 10;
             positions[i3 + 2] = r * Math.cos(phi);
             
             velocities[i3] = -positions[i3] * 0.005;
             velocities[i3 + 1] = -(positions[i3 + 1] - 10) * 0.005;
             velocities[i3 + 2] = -positions[i3 + 2] * 0.005;
          }
        } else {
          // Standard velocity movement
          positions[i3] += velocities[i3];
          positions[i3 + 1] += velocities[i3 + 1];
          positions[i3 + 2] += velocities[i3 + 2];
        }

        // Boundary checks and resets
        if (effectType === 'bloom' || effectType === 'snowstorm') {
          if (positions[i3 + 1] < -5) {
            positions[i3 + 1] = 30;
            positions[i3] = (Math.random() - 0.5) * 60;
            positions[i3 + 2] = (Math.random() - 0.5) * 60;
          }
        } else if (effectType === 'embers' || effectType === 'fog') {
          if (positions[i3 + 1] > 30) {
            positions[i3 + 1] = -5;
            positions[i3] = (Math.random() - 0.5) * 60;
            positions[i3 + 2] = (Math.random() - 0.5) * 60;
          }
        }
      }

      particles.attributes.position.needsUpdate = true;
    }

    // Update lines (Rain, Fire)
    if (lineGeometry && velocities) {
      const positions = lineGeometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const i6 = i * 6;
        
        // Move both points of the line
        positions[i6] += velocities[i3];
        positions[i6 + 1] += velocities[i3 + 1];
        positions[i6 + 2] += velocities[i3 + 2];
        
        positions[i6 + 3] += velocities[i3];
        positions[i6 + 4] += velocities[i3 + 1];
        positions[i6 + 5] += velocities[i3 + 2];
        
        if (effectType === 'rain') {
          if (positions[i6 + 1] < -5) {
            const newY = 30 + Math.random() * 10;
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            
            positions[i6] = x;
            positions[i6 + 1] = newY;
            positions[i6 + 2] = z;
            
            positions[i6 + 3] = x;
            positions[i6 + 4] = newY - 0.8;
            positions[i6 + 5] = z;
          }
        } else if (effectType === 'fire') {
          if (positions[i6 + 1] > 30) {
            const newY = -5;
            const x = (Math.random() - 0.5) * 40;
            const z = (Math.random() - 0.5) * 40;
            
            positions[i6] = x;
            positions[i6 + 1] = newY;
            positions[i6 + 2] = z;
            
            positions[i6 + 3] = x;
            positions[i6 + 4] = newY + 0.5;
            positions[i6 + 5] = z;
          }
        }
      }

      lineGeometry.attributes.position.needsUpdate = true;
    }
  });
</script>

{#if activeRealm && effectReady}
  {#key renderKey}
    <!-- Particle-based effects -->
    {#if particles && particleMaterial}
      <T.Points args={[particles, particleMaterial]} />
    {/if}

    <!-- Line-based effects (rain) -->
    {#if lineGeometry && lineMaterial}
      <T.LineSegments args={[lineGeometry, lineMaterial]} />
    {/if}
  {/key}
{/if}
