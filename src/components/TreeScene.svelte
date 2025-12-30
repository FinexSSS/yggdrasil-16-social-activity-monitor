<script lang="ts">
  import { Canvas, useTask } from '@threlte/core';
  import { GLTF, HTML, OrbitControls } from '@threlte/extras';
  import { T } from '@threlte/core';
  import BackgroundLeaves from './BackgroundLeaves.svelte';
  import LeafProgressMeter from './LeafProgressMeter.svelte';
  import RealmEffectSystem from './RealmEffectSystem.svelte';
  import DoubleClickedRealmEffectSystem from './DoubleClickedRealmEffectSystem.svelte';
  import RuneMatrixEffect from './RuneMatrixEffect.svelte';
  import MimirsWhispersEffect from './MimirsWhispersEffect.svelte';
  import { REALM_EFFECTS, type RealmName } from '$lib/utils/realmEffects';
  import { DOUBLE_CLICKED_REALM_EFFECTS } from '$lib/utils/doubleClickedRealmEffects';
  import { createEventDispatcher, onMount } from 'svelte';
  import * as THREE from 'three';

  export let modelName: string;
  export let treeScale: number = 8.5; // Individual tree scaling
  export let socialDensity: number = 0;
  export let productiveDensity: number = 0;
  export let goalProgress: number = 0; // 0-100
  export let currentValue: number = 0;
  export let targetValue: number = 0;
  export let goalType: any = null;
  export let showRealmMarkers: boolean = true;
  export let hideGoalLeaves: boolean = false;
  export let hideOverlays: boolean = false; // Hide realm markers and goal when journal or milestones are open
  export let hideUpsideDownButton: boolean = false;
  
  // Cinematic intro props
  export let introMode: boolean = false;
  export let introCurrentRealm: RealmName | null = null;
  export let introRevealedRealms: RealmName[] = []; // All realms that have been revealed (stay visible)
  export let showIntroRealmName: boolean = false;
  export let introCameraPosition: [number, number, number] = [12, 4, 12];
  export let introCameraTarget: [number, number, number] = [0, 2, 0];
  
  // Outro animation props (reverse animation for rebirth/terminate)
  export let outroMode: boolean = false;
  export let outroVisibleRealms: RealmName[] = []; // Realms that are still visible during outro
  export let outroCurrentRealm: RealmName | null = null; // Current realm camera is focused on
  
  // Realm ownership - only show realms the user owns (assigned + purchased)
  export let ownedRealms: RealmName[] = []; // Empty array means show all realms (backwards compatible)

  const dispatch = createEventDispatcher();

  let hoveredRealm: string | null = null;
  let activeRealmEffect: RealmName | null = null;
  let activeDoubleClickedRealm: RealmName | null = null;
  let raycaster: THREE.Raycaster;
  let mouse: THREE.Vector2;
  let camera: THREE.PerspectiveCamera;
  let realmMeshes: Map<string, THREE.Mesh> = new Map();
  
  // Upside down effect state
  let isUpsideDown = false;
  let horizontalRotation = 0; // Z-axis rotation (360° spin)
  let verticalRotation = 0; // Y-axis rotation (upside down flip)
  let isAnimating = false;
  const SPIN_DURATION = 5000; // 5 seconds for 360° horizontal spin
  const PAUSE_DURATION = 1000; // 1 second pause
  const FLIP_DURATION = 2500; // 2.5 seconds for the flip animation
  const STAY_DURATION = 1000; // 5 seconds to stay upside down
  let animationStartTime: number | null = null;
  let animationPhase: 'spin-horizontal' | 'pause-1' | 'flip-down' | 'stay' | 'flip-up' | 'pause-2' | 'spin-back' | null = null;
  
  // New Feature States
  let showRuneMatrix = false;
  let showMimirsWhispers = false;
  
  // Function to trigger the upside down effect
  function triggerUpsideDown() {
    if (isAnimating) return;
    isAnimating = true;
    isUpsideDown = true;
    animationStartTime = Date.now();
    animationPhase = 'spin-horizontal';
  }
  
  // Get button text based on animation phase
  function getButtonText(): string {
    if (!isAnimating) return 'Upside Down';
    
    switch (animationPhase) {
      case 'spin-horizontal':
      case 'pause-1':
        return 'Rotating';
      case 'flip-down':
      case 'stay':
      case 'flip-up':
        return 'Flipping';
      default:
        return 'Upside Down';
    }
  }
  
  // Animation loop for upside down effect
  function updateUpsideDownAnimation() {
    if (!isAnimating || !animationStartTime || !animationPhase) return;
    
    const elapsed = Date.now() - animationStartTime;
    
    if (animationPhase === 'spin-horizontal') {
      // 360° spin from west to east (positive Y rotation = counter-clockwise from top)
      const t = Math.min(elapsed / SPIN_DURATION, 1);
      const eased = easeInOutCubic(t);
      horizontalRotation = eased * Math.PI * 2; // Full 360°
      
      if (t >= 1) {
        horizontalRotation = 0; // Reset to avoid accumulation
        animationPhase = 'pause-1';
        animationStartTime = Date.now();
      }
    } else if (animationPhase === 'pause-1') {
      // 1 second pause
      horizontalRotation = 0;
      if (elapsed >= PAUSE_DURATION) {
        animationPhase = 'flip-down';
        animationStartTime = Date.now();
      }
    } else if (animationPhase === 'flip-down') {
      // Flip upside down: Y-axis, anti-clockwise (negative rotation)
      const t = Math.min(elapsed / FLIP_DURATION, 1);
      const eased = easeInOutCubic(t);
      verticalRotation = -eased * Math.PI; // Anti-clockwise = negative
      
      if (t >= 1) {
        animationPhase = 'stay';
        animationStartTime = Date.now();
      }
    } else if (animationPhase === 'stay') {
      // Stay upside down
      verticalRotation = -Math.PI;
      if (elapsed >= STAY_DURATION) {
        animationPhase = 'flip-up';
        animationStartTime = Date.now();
      }
    } else if (animationPhase === 'flip-up') {
      // Flip back up: clockwise (continue negative direction to complete the loop)
      const t = Math.min(elapsed / FLIP_DURATION, 1);
      const eased = easeInOutCubic(t);
      // Continue from -PI to -2PI (completing the clockwise circle)
      verticalRotation = -Math.PI - (eased * Math.PI);
      
      if (t >= 1) {
        // Animation complete
        verticalRotation = 0;
        horizontalRotation = 0;
        isAnimating = false;
        isUpsideDown = false;
        animationPhase = null;
        animationStartTime = null;
      }
    }
  }
  
  // Easing function for smooth animation
  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  // Calculate overall animation progress for progress bar
  function getAnimationProgress(): number {
    if (!animationPhase) return 0;
    
    const totalDuration = SPIN_DURATION + PAUSE_DURATION + FLIP_DURATION + STAY_DURATION + FLIP_DURATION;
    let progressSoFar = 0;
    
    switch (animationPhase) {
      case 'spin-horizontal':
        progressSoFar = (horizontalRotation / (Math.PI * 2)) * (SPIN_DURATION / totalDuration);
        break;
      case 'pause-1':
        progressSoFar = SPIN_DURATION / totalDuration;
        break;
      case 'flip-down':
        progressSoFar = (SPIN_DURATION + PAUSE_DURATION) / totalDuration + 
          (Math.abs(verticalRotation) / Math.PI) * (FLIP_DURATION / totalDuration);
        break;
      case 'stay':
        progressSoFar = (SPIN_DURATION + PAUSE_DURATION + FLIP_DURATION) / totalDuration;
        break;
      case 'flip-up':
        progressSoFar = (SPIN_DURATION + PAUSE_DURATION + FLIP_DURATION + STAY_DURATION) / totalDuration +
          ((Math.abs(verticalRotation) - Math.PI) / Math.PI) * (FLIP_DURATION / totalDuration);
        break;
      default:
        progressSoFar = 0;
    }
    
    return Math.min(progressSoFar * 100, 100);
  }
  
  // RAF loop for animation
  let rafId: number | null = null;
  function animationLoop() {
    updateUpsideDownAnimation();
    // Update camera look-at during intro or outro mode
    if ((introMode || outroMode) && camera) {
      camera.lookAt(introCameraTarget[0], introCameraTarget[1], introCameraTarget[2]);
    }
    rafId = requestAnimationFrame(animationLoop);
  }
  
  onMount(() => {
    rafId = requestAnimationFrame(animationLoop);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  });

  const allRealms = [
    // Top tier - Crown of tree
    { name: 'Asgard' as RealmName, rune: 'ᚨᛊᚷᚨᚱᛞ', position: [0, 5, 0] as [number, number, number] },
    
    // Upper ring - Around the crown
    { name: 'Vanaheim' as RealmName, rune: 'ᚦᚨᚾᚨᚺᛖᛁᛗ', position: [-6, 4, 3] as [number, number, number] },
    { name: 'Alfheim' as RealmName, rune: 'ᚨᛚᚠᚺᛖᛁᛗ', position: [6, 4, 3] as [number, number, number] },
    
    // Middle ring - Around mid trunk  
    { name: 'Midgard' as RealmName, rune: 'ᛗᛁᛞᚷᚨᚱᛞ', position: [0, 3, 6] as [number, number, number] },
    { name: 'Jötunheim' as RealmName, rune: 'ᛃᛟᛏᚢᚾᚺᛖᛁᛗ', position: [7, 2.5, -2] as [number, number, number] },
    { name: 'Svartalfheim' as RealmName, rune: 'ᛊᚦᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ', position: [-7, 2.5, -2] as [number, number, number] },
    
    // Lower ring - Around base
    { name: 'Niflheim' as RealmName, rune: 'ᚾᛁᚠᛚᚺᛖᛁᛗ', position: [-5, 1.5, 5] as [number, number, number] },
    { name: 'Muspelheim' as RealmName, rune: 'ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ', position: [5, 1.5, 5] as [number, number, number] },
    { name: 'Helheim' as RealmName, rune: 'ᚺᛖᛚᚺᛖᛁᛗ', position: [0, 0.5, 7] as [number, number, number] },
  ];
  
  // Filter realms based on ownership - if ownedRealms is empty/not provided, show all (backwards compatible)
  $: realms = ownedRealms.length > 0 
    ? allRealms.filter(r => ownedRealms.includes(r.name))
    : allRealms;
  
  // Realm-based lighting when effect is active
  function getAmbientIntensity(): number {
    if (activeRealmEffect) {
      return REALM_EFFECTS[activeRealmEffect].intensity;
    }
    return 0.8;
  }
  
  function getAmbientColor(): number {
    if (activeRealmEffect) {
      return REALM_EFFECTS[activeRealmEffect].ambientColor;
    }
    return 0xffffff;
  }
  
  function getDirectionalIntensity(): number {
    if (activeRealmEffect) {
      return REALM_EFFECTS[activeRealmEffect].intensity * 0.8;
    }
    return 1.0;
  }

  // Handle left-click: toggle realm effect
  function handleRealmClick(realmName: RealmName) {
    console.log('Realm clicked (function):', realmName);
    if (activeRealmEffect === realmName) {
      activeRealmEffect = null;
    } else {
      activeRealmEffect = realmName;
    }
  }

  // Handle double-click: toggle double clicked realm effect
  function handleRealmDoubleClick(realmName: RealmName) {
    console.log('Realm double clicked (function):', realmName);
    if (activeDoubleClickedRealm === realmName) {
      activeDoubleClickedRealm = null;
    } else {
      activeDoubleClickedRealm = realmName;
    }
  }

  // Handle right-click: open journal
  function handleRealmRightClick(e: MouseEvent, realmName: RealmName) {
    console.log('Realm right clicked (function):', realmName);
    e.preventDefault();
    dispatch('openJournal', { realm: realmName });
  }

  // Handle click on canvas for realm detection
  function handleCanvasClick(event: MouseEvent) {
    if (!camera || realmMeshes.size === 0) return;
    
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const meshArray = Array.from(realmMeshes.values());
    const intersects = raycaster.intersectObjects(meshArray);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const realmName = (clickedMesh.userData as any).realmName as RealmName;
      if (realmName) {
        handleRealmClick(realmName);
      }
    }
  }

  function handleCanvasRightClick(event: MouseEvent) {
    if (!camera || realmMeshes.size === 0) return;
    
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const meshArray = Array.from(realmMeshes.values());
    const intersects = raycaster.intersectObjects(meshArray);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const realmName = (clickedMesh.userData as any).realmName as RealmName;
      if (realmName) {
        handleRealmRightClick(event, realmName);
      }
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="w-full h-full" on:click={handleCanvasClick} on:contextmenu={handleCanvasRightClick}>
  <Canvas>
    <!-- Camera -->
    <T.PerspectiveCamera
      makeDefault
      position={(introMode || outroMode) ? introCameraPosition : [12, 4, 12]}
      fov={55}
      bind:ref={camera}
    >
      {#if !introMode && !outroMode}
      <OrbitControls 
        enableDamping
        maxPolarAngle={Math.PI * 0.7}
        minPolarAngle={Math.PI * 0.2}
        minDistance={8}
        maxDistance={35}
        target={[0, 2, 0]} 
      />
      {/if}
    </T.PerspectiveCamera>

    <!-- Lighting (Dynamic based on active realm effect) -->
    <T.AmbientLight intensity={getAmbientIntensity()} color={getAmbientColor()} />
    <T.DirectionalLight position={[10, 10, 5]} intensity={getDirectionalIntensity()} castShadow />

    <!-- Background Leaves (stays normal, not affected by upside-down) -->
    {#if !introMode && !outroMode}
    <BackgroundLeaves {socialDensity} {productiveDensity} />
    {/if}
    
    <!-- Realm Effect System (stays normal, not affected by upside-down) -->
    {#if !introMode && !outroMode}
    <RealmEffectSystem activeRealm={activeRealmEffect} />
    <DoubleClickedRealmEffectSystem activeRealm={activeDoubleClickedRealm} />
    {/if}



    <!-- Scene Group for upside-down rotation effect (only tree and realm names) -->
    <T.Group rotation.y={horizontalRotation} rotation.z={verticalRotation}>
      <!-- Model -->
      {#if modelName}
        <GLTF 
          url={`/model/${modelName}`} 
          position={[0, 2, 0]} 
          scale={treeScale}
        />
      {/if}

      <!-- Realm Markers as clickable spheres (hidden when journal is open, intro mode, or outro mode) -->
      {#if showRealmMarkers && !hideOverlays && !introMode && !outroMode}
        {#each realms as realm}
          <T.Group position={realm.position}>
            <!-- Invisible clickable sphere -->
            <T.Mesh
              userData={{ realmName: realm.name }}
              on:create={({ ref }) => {
                realmMeshes.set(realm.name, ref);
              }}
            >
              <T.SphereGeometry args={[0.8, 16, 16]} />
              <T.MeshBasicMaterial transparent opacity={0} />
            </T.Mesh>
            
            <!-- Visual HTML label -->
            <HTML transform>
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div 
                class="realm-marker {activeRealmEffect === realm.name ? 'active' : ''}"
                style={activeRealmEffect === realm.name ? `--realm-color: ${REALM_EFFECTS[realm.name].color}` : ''}
                on:click|stopPropagation={(e) => { console.log('click event on div', realm.name); handleRealmClick(realm.name); }}
                on:dblclick|stopPropagation={(e) => { console.log('dblclick event on div', realm.name); handleRealmDoubleClick(realm.name); }}
                on:contextmenu|stopPropagation={(e) => handleRealmRightClick(e, realm.name)}
                on:mouseenter={() => {
                  hoveredRealm = realm.name;
                  // Trigger single click effect on hover
                  activeRealmEffect = realm.name;
                }}
                on:mouseleave={() => hoveredRealm = null}
              >
                {#if hoveredRealm === realm.name}
                  <span class="text-english">{realm.name}</span>
                {:else}
                  <span class="text-rune">{realm.rune}</span>
                {/if}
              </div>
            </HTML>
          </T.Group>
        {/each}
      {/if}
      
      <!-- Intro Realm Name Display - show all revealed realms (they stay visible) - uses allRealms for intro -->
      {#if introMode}
        {#each allRealms.filter(r => introRevealedRealms.includes(r.name)) as realm}
          <T.Group position={realm.position}>
            <HTML transform>
              <div class="intro-realm-name {introCurrentRealm === realm.name && showIntroRealmName ? 'current' : 'revealed'}">
                <span class="intro-realm-rune">{realm.rune}</span>
              </div>
            </HTML>
          </T.Group>
        {/each}
      {/if}
      
      <!-- Outro Realm Name Display - reuse intro styling, realms vanish one by one - uses allRealms for outro -->
      {#if outroMode}
        {#each allRealms.filter(r => outroVisibleRealms.includes(r.name)) as realm}
          <T.Group position={realm.position}>
            <HTML transform>
              <div class="intro-realm-name {outroCurrentRealm === realm.name ? 'current' : 'revealed'}">
                <span class="intro-realm-rune">{realm.rune}</span>
              </div>
            </HTML>
          </T.Group>
        {/each}
      {/if}
    </T.Group>

    <!-- New Effects -->
    {#if showRuneMatrix}
      <RuneMatrixEffect />
    {/if}

    <!-- Leaf Progress Meter (stays normal, not affected by upside-down) -->
    {#if goalProgress > 0 && goalType && !hideGoalLeaves && !hideOverlays && !introMode && !outroMode}
      <LeafProgressMeter 
        progress={goalProgress}  
        {currentValue}
        {targetValue}
        {goalType}
      />
    {/if}
  </Canvas>
</div>

<!-- Mimir's Whispers (2D Overlay) -->
{#if showMimirsWhispers && !hideOverlays && !introMode && !outroMode}
  <MimirsWhispersEffect on:complete={() => dispatch('whispersComplete')} />
{/if}

<!-- Active Effect Indicator (hidden when journal is open, intro mode, or outro mode) -->
{#if activeRealmEffect && !hideOverlays && !introMode && !outroMode}
  <div class="effect-indicator" style="--realm-color: {REALM_EFFECTS[activeRealmEffect].color}">
    <span class="text-lg">{REALM_EFFECTS[activeRealmEffect].icon}</span>
    <span class="font-medium">{activeRealmEffect}</span>
    <span class="text-xs opacity-70">{REALM_EFFECTS[activeRealmEffect].name}</span>
    <button 
      class="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
      on:click={() => activeRealmEffect = null}
    >
      ✕
    </button>
  </div>
{/if}

{#if activeDoubleClickedRealm && !hideOverlays && !introMode && !outroMode}
  <div class="effect-indicator double-clicked" style="--realm-color: {DOUBLE_CLICKED_REALM_EFFECTS[activeDoubleClickedRealm].color}">
    <span class="text-lg">{DOUBLE_CLICKED_REALM_EFFECTS[activeDoubleClickedRealm].icon}</span>
    <span class="font-medium">{activeDoubleClickedRealm}</span>
    <span class="text-xs opacity-70">{DOUBLE_CLICKED_REALM_EFFECTS[activeDoubleClickedRealm].name}</span>
    <button 
      class="ml-2 px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs"
      on:click={() => activeDoubleClickedRealm = null}
    >
      ✕
    </button>
  </div>
{/if}

<!-- Upside Down Effect Button -->
{#if !hideUpsideDownButton && !introMode && !outroMode}
<div class="upside-down-button-container">
  <!-- Mimir's Whispers Button -->
  <button
    class="feature-button {showMimirsWhispers ? 'active' : ''}"
    on:click={() => showMimirsWhispers = !showMimirsWhispers}
    title="Toggle Mimir's Whispers"
  >
    <span class="button-icon whispers-icon">💭</span>
    <span class="button-text">Whispers</span>
  </button>

  <!-- Rune Matrix Button -->
  <button
    class="feature-button {showRuneMatrix ? 'active' : ''}"
    on:click={() => showRuneMatrix = !showRuneMatrix}
    title="Toggle Rune Matrix"
  >
    <span class="button-icon matrix-icon">ᚠ</span>
    <span class="button-text">Matrix</span>
  </button>
  <button
    class="upside-down-button {isAnimating ? 'animating' : ''}"
    on:click={triggerUpsideDown}
    disabled={isAnimating}
    title="Flip the world upside down!"
  >
    <span class="button-icon" class:flipped={isUpsideDown}>🌍</span>
    <span class="button-text">{getButtonText()}</span>
  </button>
  {#if isAnimating}
    <div class="flip-progress-bar">
      <div class="flip-progress-fill" style="width: {getAnimationProgress()}%"></div>
    </div>
  {/if}
</div>
{/if}

<style>
  .realm-marker {
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    text-align: center;
    transition: all 0.3s ease;
    user-select: none;
    pointer-events: auto;
  }

  .realm-marker.active {
    background-color: var(--realm-color, #ffd700);
    box-shadow: 0 0 20px var(--realm-color, #ffd700);
  }

  .text-rune {
    font-size: 1.2rem;
    font-weight: bold;
    color: #ffd700; /* Golden */
    text-shadow: 0 0 10px #ffaa00, 0 0 20px #ffaa00;
    pointer-events: none; /* Ensure clicks pass through to parent */
  }

  .text-english {
    display: block;
    font-size: 1.2rem;
    font-weight: bold;
    color: #ffffff;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #ffd700;
    box-shadow: 0 0 10px #ffd700;
    pointer-events: none; /* Ensure clicks pass through to parent */
  }

  .effect-indicator {
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    border-radius: 9999px;
    border: 1px solid var(--realm-color, #ffd700);
    color: var(--realm-color, #ffd700);
    box-shadow: 0 0 20px var(--realm-color, #ffd700)30;
    z-index: 50;
  }

  .effect-indicator.double-clicked {
    bottom: 130px; /* Stack above the single click indicator */
  }

  /* Upside Down Button Styles */
  .upside-down-button-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 50;
  }

  .upside-down-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    border: 2px solid #e94560;
    border-radius: 50px;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 
      0 4px 15px rgba(233, 69, 96, 0.3),
      0 0 30px rgba(233, 69, 96, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    pointer-events: auto;
  }

  .upside-down-button:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    border-color: #ff6b6b;
    box-shadow: 
      0 6px 25px rgba(233, 69, 96, 0.5),
      0 0 40px rgba(233, 69, 96, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .upside-down-button:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  .upside-down-button:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  .upside-down-button.animating {
    animation: pulse-glow 1s ease-in-out infinite;
    border-color: #00d9ff;
    box-shadow: 
      0 4px 20px rgba(0, 217, 255, 0.4),
      0 0 40px rgba(0, 217, 255, 0.2);
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 
        0 4px 20px rgba(0, 217, 255, 0.4),
        0 0 40px rgba(0, 217, 255, 0.2);
    }
    50% {
      box-shadow: 
        0 4px 30px rgba(0, 217, 255, 0.6),
        0 0 60px rgba(0, 217, 255, 0.3);
    }
  }

  .button-icon {
    font-size: 1.4rem;
    transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: inline-block;
  }

  .button-icon.flipped {
    transform: rotate(180deg);
  }

  .button-text {
    font-size: 0.9rem;
    letter-spacing: 0.5px;
    padding-left: 6px;
  }
  
  .matrix-icon {
    margin-left: 30px;
  }
  
  .whispers-icon {
    margin-left: 15px;
  }
  
  .feature-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid #ffd700;
    border-radius: 50px;
    color: #ffffff;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    width: 100%; /* Match width in flex column */
    justify-content: flex-start;
  }

  .feature-button:hover {
    background: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  .feature-button.active {
    background: rgba(255, 215, 0, 0.3);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
    border-color: #ffffff;
  }

  .flip-progress-bar {
    width: 100%;
    max-width: 150px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  .flip-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #e94560, #00d9ff, #e94560);
    background-size: 200% 100%;
    animation: gradient-flow 1s linear infinite;
    transition: width 0.1s linear;
    border-radius: 2px;
  }

  @keyframes gradient-flow {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 200% 50%;
    }
  }

  /* Intro Realm Name Styles */
  .intro-realm-name {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
  }

  .intro-realm-name.current {
    animation: introRealmAppear 0.6s ease-out forwards;
  }

  .intro-realm-name.revealed {
    opacity: 1;
  }

  .intro-realm-rune {
    font-size: 2.2rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 0 0 15px #ffaa00, 0 0 30px #ffaa00;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.6), rgba(20, 20, 40, 0.7));
    padding: 8px 16px;
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.5);
  }

  .intro-realm-name.current .intro-realm-rune {
    animation: runeGlow 1.5s ease-in-out infinite alternate;
    font-size: 2.5rem;
    border: 2px solid #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
  }

  @keyframes introRealmAppear {
    0% {
      opacity: 0;
      transform: scale(0.5) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes runeGlow {
    0% {
      text-shadow: 0 0 20px #ffaa00, 0 0 40px #ffaa00;
    }
    100% {
      text-shadow: 0 0 30px #ffd700, 0 0 60px #ffd700, 0 0 80px #ffcc00;
    }
  }

  /* Outro animation - reuses intro styles, no additional styles needed */
</style>
