<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { onMount } from 'svelte';
  import type { WeatherType } from '$lib/utils/weatherUtils';
  import * as THREE from 'three';

  export let weatherType: WeatherType;

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

  // Create particle system based on weather type
  function createParticleSystem(type: WeatherType) {
    // Clean up existing systems
    if (particles) particles.dispose();
    if (particleMaterial) particleMaterial.dispose();
    if (rainGeometry) rainGeometry.dispose();
    if (rainMaterial) rainMaterial.dispose();
    lightningBolts.forEach(bolt => {
      bolt.geometry.dispose();
      bolt.material.dispose();
    });
    lightningBolts = [];
    
    // Reset
    rainLines = null;
    particleSystem = null;
    
    // Determine particle count and properties based on weather type
    switch (type) {
      case 'snowfall':
        particleCount = 1000;
        createSnowfall();
        break;
      case 'rain':
        particleCount = 1500;
        createRainLines();
        break;
      case 'thunderstorm':
        particleCount = 1500;
        createRainLines();
        createLightningBolts();
        break;
      case 'sunset':
      case 'clear-day':
        // These don't use particle systems
        particleCount = 0;
        particles = null;
        particleMaterial = null;
        velocities = null;
        break;
    }
  }

  function createSnowfall() {
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
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
  }

  function createRainLines() {
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
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.6,
      linewidth: 2, // Note: linewidth > 1 only works in WebGL with certain renderers
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
        color: 0xffff00, // Yellow
        transparent: true,
        opacity: 0,
        linewidth: 3,
      });
      
      lightningBolts.push({ geometry: boltGeometry, material: boltMaterial });
    }
  }

  // Update particles each frame
  useTask((delta) => {
    time += delta;
    
    // Update snowfall
    if (particles && velocities && weatherType === 'snowfall') {
      const positions = particles.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Add sway for snow
        positions[i3] += velocities[i3] + Math.sin(time + i) * 0.01;
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];
        
        // Reset particles that fall below ground
        if (positions[i3 + 1] < -5) {
          positions[i3 + 1] = 25;
          positions[i3] = (Math.random() - 0.5) * 50;
          positions[i3 + 2] = (Math.random() - 0.5) * 50;
        }
      }
      
      particles.attributes.position.needsUpdate = true;
    }
    
    // Update rain lines
    if (rainGeometry && velocities && (weatherType === 'rain' || weatherType === 'thunderstorm')) {
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
      if (weatherType === 'thunderstorm') {
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
        
        // Fade flash
        if (lightningFlash > 0) {
          lightningFlash -= delta * 5;
        }
      }
    }
  });

  // Recreate particle system when weather type changes
  $: createParticleSystem(weatherType);

  onMount(() => {
    return () => {
      // Cleanup
      if (particles) particles.dispose();
      if (particleMaterial) particleMaterial.dispose();
      if (rainGeometry) rainGeometry.dispose();
      if (rainMaterial) rainMaterial.dispose();
      lightningBolts.forEach(bolt => {
        bolt.geometry.dispose();
        bolt.material.dispose();
      });
    };
  });
</script>

<!-- Snowfall (Points) -->
{#if particles && particleMaterial && weatherType === 'snowfall'}
  <T.Points geometry={particles} material={particleMaterial} />
{/if}

<!-- Rain (Line Segments) -->
{#if rainGeometry && rainMaterial && (weatherType === 'rain' || weatherType === 'thunderstorm')}
  <T.LineSegments geometry={rainGeometry} material={rainMaterial} />
{/if}

<!-- Lightning bolts for thunderstorm -->
{#if weatherType === 'thunderstorm' && showLightning}
  {#each lightningBolts as bolt}
    <T.Line geometry={bolt.geometry}>
      <T.LineBasicMaterial color={0xffff00} transparent opacity={lightningFlash} linewidth={3} />
    </T.Line>
  {/each}
{/if}

<!-- Lightning flash ambient light for thunderstorm -->
{#if weatherType === 'thunderstorm' && lightningFlash > 0}
  <T.AmbientLight intensity={lightningFlash * 1.5} color={0xffffff} />
{/if}
