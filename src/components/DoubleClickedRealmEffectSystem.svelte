<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { DOUBLE_CLICKED_REALM_EFFECTS, type WeatherEffectType } from '$lib/utils/doubleClickedRealmEffects';
  import type { RealmName } from '$lib/utils/realmEffects';

  export let activeRealm: RealmName | null = null;

  let particleSystem: THREE.Points | null = null;
  let particleCount = 0;
  let particles: THREE.BufferGeometry | null = null;
  let particleMaterial: THREE.PointsMaterial | null = null;
  let velocities: Float32Array | null = null;
  let time = 0;
  
  // Rain lines (using Line segments instead of points)
  let rainLines: THREE.LineSegments | null = null;
  let rainGeometry: THREE.BufferGeometry | null = null;
  let rainMaterial: THREE.LineBasicMaterial | null = null;
  
  // Lightning flash state
  let lightningFlash = 0;
  let lastLightningTime = 0;
  let lightningBolts: Array<{geometry: THREE.BufferGeometry, material: THREE.LineBasicMaterial}> = [];
  let showLightning = false;
  let lightningColor = 0xffff00;

  // Re-create effect when activeRealm changes
  $: if (activeRealm) {
    const config = DOUBLE_CLICKED_REALM_EFFECTS[activeRealm];
    console.log('DoubleClickedRealmEffectSystem: activeRealm changed to', activeRealm, config);
    createParticleSystem(config.type, config.color, config.intensity, config.lightningColor);
  } else {
    cleanup();
  }

  function cleanup() {
    if (particles) particles.dispose();
    if (particleMaterial) particleMaterial.dispose();
    if (rainGeometry) rainGeometry.dispose();
    if (rainMaterial) rainMaterial.dispose();
    lightningBolts.forEach(bolt => {
      bolt.geometry.dispose();
      bolt.material.dispose();
    });
    lightningBolts = [];
    
    rainLines = null;
    particleSystem = null;
    particles = null;
    particleMaterial = null;
    rainGeometry = null;
    rainMaterial = null;
    velocities = null;
  }

  function createParticleSystem(type: WeatherEffectType, color: number, intensity: number, lColor?: number) {
    cleanup();
    
    if (lColor) lightningColor = lColor;

    switch (type) {
      case 'snow':
        particleCount = Math.floor(1000 * intensity);
        createSnowfall(color);
        break;
      case 'rain':
        particleCount = Math.floor(1500 * intensity);
        createRainLines(color);
        break;
      case 'fog':
        particleCount = Math.floor(500 * intensity);
        createFog(color);
        break;
      case 'thunder':
        particleCount = Math.floor(1500 * intensity);
        createRainLines(color);
        createLightningBolts();
        break;
    }
  }

  function createSnowfall(color: number) {
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Spread particles in a large area
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = Math.random() * 30 - 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
      
      // Slow falling velocity with gentle sway
      velocities[i3] = (Math.random() - 0.5) * 0.1; // x drift
      velocities[i3 + 1] = -0.05 - Math.random() * 0.05; // y fall
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1; // z drift
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
  }

  function createRainLines(color: number) {
    // Create rain as line segments (vertical lines)
    rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 6); // 2 vertices per line, 3 coords each
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const i6 = i * 6;
      
      // Random position
      const x = (Math.random() - 0.5) * 50;
      const y = Math.random() * 30 - 5;
      const z = (Math.random() - 0.5) * 50;
      
      // Line start (top)
      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;
      
      // Line end (bottom) - make it look like "I"
      const lineLength = 0.3 + Math.random() * 0.2; // Variable length
      positions[i6 + 3] = x;
      positions[i6 + 4] = y - lineLength;
      positions[i6 + 5] = z;
      
      // Fast falling with slight wind
      velocities[i3] = (Math.random() - 0.5) * 0.2;
      velocities[i3 + 1] = -0.3 - Math.random() * 0.2; // Fast fall
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    rainMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      linewidth: 2,
    });
  }

  function createFog(color: number) {
    particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 60;
      positions[i3 + 1] = Math.random() * 15 - 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 60;
      
      // Very slow drift
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    particleMaterial = new THREE.PointsMaterial({
      color: color,
      size: 2.0,
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending,
    });
  }

  function createLightningBolts() {
    // Create 3 lightning bolt paths
    for (let i = 0; i < 3; i++) {
      const boltGeometry = new THREE.BufferGeometry();
      const segments = 8;
      const positions = new Float32Array(segments * 3);
      
      // Random starting position in sky
      const startX = (Math.random() - 0.5) * 40;
      const startY = 20 + Math.random() * 10;
      const startZ = (Math.random() - 0.5) * 40;
      
      // Create jagged lightning path
      let currentX = startX;
      let currentY = startY;
      let currentZ = startZ;
      
      for (let j = 0; j < segments; j++) {
        positions[j * 3] = currentX;
        positions[j * 3 + 1] = currentY;
        positions[j * 3 + 2] = currentZ;
        
        // Move down and randomly sideways
        currentX += (Math.random() - 0.5) * 2;
        currentY -= 3 + Math.random() * 2;
        currentZ += (Math.random() - 0.5) * 2;
      }
      
      boltGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const boltMaterial = new THREE.LineBasicMaterial({
        color: lightningColor,
        transparent: true,
        opacity: 0,
        linewidth: 3,
      });
      
      lightningBolts.push({ geometry: boltGeometry, material: boltMaterial });
    }
  }

  useTask((delta) => {
    if (!activeRealm) return;
    time += delta;
    
    const config = DOUBLE_CLICKED_REALM_EFFECTS[activeRealm];
    const type = config.type;

    // Update snowfall or fog
    if (particles && velocities && (type === 'snow' || type === 'fog')) {
      const positions = particles.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Add sway for snow
        if (type === 'snow') {
          positions[i3] += velocities[i3] + Math.sin(time + i) * 0.01;
        } else {
          positions[i3] += velocities[i3];
        }
        
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];
        
        // Reset particles that fall below ground
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 25;
          positions[i3] = (Math.random() - 0.5) * 50;
          positions[i3 + 2] = (Math.random() - 0.5) * 50;
        }
        
        // Wrap fog particles
        if (type === 'fog') {
          if (Math.abs(positions[i3]) > 30) positions[i3] *= -1;
          if (Math.abs(positions[i3 + 2]) > 30) positions[i3 + 2] *= -1;
        }
      }
      
      particles.attributes.position.needsUpdate = true;
    }
    
    // Update rain lines
    if (rainGeometry && velocities && (type === 'rain' || type === 'thunder')) {
      const positions = rainGeometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const i6 = i * 6;
        
        // Move both vertices of the line
        positions[i6] += velocities[i3];
        positions[i6 + 1] += velocities[i3 + 1];
        positions[i6 + 2] += velocities[i3 + 2];
        
        positions[i6 + 3] += velocities[i3];
        positions[i6 + 4] += velocities[i3 + 1];
        positions[i6 + 5] += velocities[i3 + 2];
        
        // Reset rain that falls below ground
        if (positions[i6 + 1] < -5) {
          const x = (Math.random() - 0.5) * 50;
          const y = 25;
          const z = (Math.random() - 0.5) * 50;
          const lineLength = 0.3 + Math.random() * 0.2;
          
          positions[i6] = x;
          positions[i6 + 1] = y;
          positions[i6 + 2] = z;
          positions[i6 + 3] = x;
          positions[i6 + 4] = y - lineLength;
          positions[i6 + 5] = z;
        }
      }
      
      rainGeometry.attributes.position.needsUpdate = true;
      
      // Lightning flash for thunderstorm
      if (type === 'thunder') {
        // Trigger lightning every 3-5 seconds
        if (time - lastLightningTime > 3 + Math.random() * 2) {
          showLightning = true;
          lightningFlash = 1.0;
          lastLightningTime = time;
          
          // Fade out lightning after 0.2 seconds
          setTimeout(() => {
            showLightning = false;
          }, 200);
        }
      }
    }
  });

  onDestroy(() => {
    cleanup();
  });
</script>

{#if particles && particleMaterial}
  <T.Points args={[particles, particleMaterial]} />
{/if}

{#if rainGeometry && rainMaterial}
  <T.LineSegments args={[rainGeometry, rainMaterial]} />
{/if}

{#if showLightning}
  {#each lightningBolts as bolt}
    <T.LineSegments args={[bolt.geometry, bolt.material]} />
  {/each}
  <T.DirectionalLight 
    position={[0, 50, 0]} 
    intensity={2} 
    color={lightningColor} 
  />
  <T.AmbientLight intensity={1} color={lightningColor} />
{/if}