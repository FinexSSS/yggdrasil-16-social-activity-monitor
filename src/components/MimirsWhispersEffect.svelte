<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  // Configuration
  const WHISPERS = [
    "Roots", "Memory", "Growth", "Norns", "Fate",
    "Yggdrasil", "Realms", "Echoes", "Wisdom", "Past",
    "Future", "Connection", "Data", "Source", "Flow",
    "Runes", "Spirit", "Wyrd", "Weave"
  ];

  // Creative "Completion" Messages
  const REWARDS = [
    "The roots drink deep of your curiosity...",
    "A thread of fate has been woven anew.",
    "The Norns whisper secrets in your wake.",
    "You have untangled a knot in the Wyrd.",
    "Memory flows like water, clear and true.",
    "The World Tree shivers with delight.",
    "An echo from the well answers you.",
    "The runes align in your favor."
  ];

  interface Whisper {
    id: number;
    text: string;
    x: number; // Pixels
    y: number; // Pixels
    vx: number;
    vy: number;
    scale: number;
  }

  let whispers: Whisper[] = [];
  let nextId = 0;
  let rafId: number;
  let width: number;
  let height: number;
  
  let showReward = false;
  let rewardText = "";

  function initWhispers() {
    const newWhispers: Whisper[] = [];
    showReward = false;
    
    // Spawn from center
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    WHISPERS.forEach((text) => {
       const angle = Math.random() * Math.PI * 2;
       const speed = 1.0 + Math.random() * 2.0; // Pixels per frame
       
       newWhispers.push({
         id: nextId++,
         text: text,
         x: centerX + (Math.random() - 0.5) * 100, // Start near center
         y: centerY + (Math.random() - 0.5) * 100,
         vx: Math.cos(angle) * speed,
         vy: Math.sin(angle) * speed,
         scale: 0.8 + Math.random() * 0.4,
       });
    });
    
    whispers = newWhispers;
  }

  function handleClick(id: number) {
    whispers = whispers.filter(w => w.id !== id);
    
    if (whispers.length === 0) {
      // Trigger Completion Logic
      triggerCompletion();
      dispatch('complete');
    }
  }
  
  function triggerCompletion() {
      // Pick random reward text
      rewardText = REWARDS[Math.floor(Math.random() * REWARDS.length)];
      showReward = true;
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        showReward = false;
      }, 3000);
  }

  function update() {
    // Current window bounds
    const maxX = window.innerWidth;
    const maxY = window.innerHeight;
    
    whispers = whispers.map(w => {
      let { x, y, vx, vy } = w;

      // Update position
      x += vx;
      y += vy;

      // Bounce off screen edges
      const padding = 50; // Keep away from exact edge
      
      if (x < padding) { x = padding; vx = Math.abs(vx); }
      else if (x > maxX - padding) { x = maxX - padding; vx = -Math.abs(vx); }
      
      if (y < padding) { y = padding; vy = Math.abs(vy); }
      else if (y > maxY - padding) { y = maxY - padding; vy = -Math.abs(vy); }

      return { ...w, x, y, vx, vy };
    });
    
    rafId = requestAnimationFrame(update);
  }

  onMount(() => {
    width = window.innerWidth;
    height = window.innerHeight;
    initWhispers();
    rafId = requestAnimationFrame(update);
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });
</script>

<div class="whispers-overlay">
  {#each whispers as whisper (whisper.id)}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div 
      class="whisper-bubble"
      style="
        left: {whisper.x}px; 
        top: {whisper.y}px; 
        transform: translate(-50%, -50%) scale({whisper.scale});
      "
      on:click|stopPropagation={() => handleClick(whisper.id)}
      role="button"
      tabindex="0"
    >
      {whisper.text}
    </div>
  {/each}
  
  {#if showReward}
    <div 
        class="reward-container"
        in:fly="{{ y: 20, duration: 800 }}"
        out:fade
    >
        <div class="reward-text">{rewardText}</div>
        <div class="reward-subtext">+1 Rune Point Acquired</div>
    </div>
  {/if}
</div>

<style>
  .whispers-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Let clicks pass through empty space */
    z-index: 40; /* Below UI buttons (z-50) but above canvas */
    overflow: hidden;
  }

  .whisper-bubble {
    position: absolute;
    background: rgba(10, 15, 30, 0.85);
    color: #e0e0e0;
    padding: 12px 24px;
    border-radius: 999px;
    border: 2px solid rgba(100, 200, 255, 0.6);
    font-family: 'Times New Roman', serif;
    font-size: 16px;
    font-weight: bold;
    white-space: nowrap;
    box-shadow: 0 0 20px rgba(100, 200, 255, 0.3);
    transition: transform 0.2s, background 0.2s;
    backdrop-filter: blur(4px);
    user-select: none;
    cursor: pointer;
    pointer-events: auto; /* Catch clicks */
  }
  
  .whisper-bubble:hover {
    background: rgba(40, 40, 80, 0.95);
    border-color: #ffd700;
    color: #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
    z-index: 100;
  }
  
  .reward-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: auto;
      background: rgba(0, 0, 0, 0.6);
      padding: 40px;
      border-radius: 20px;
      border: 1px solid rgba(255, 215, 0, 0.3);
      backdrop-filter: blur(10px);
  }
  
  .reward-text {
      font-family: 'Times New Roman', serif;
      font-size: 2rem;
      font-weight: bold;
      color: #ffd700; /* Gold */
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      margin-bottom: 10px;
  }
  
  .reward-subtext {
      font-family: sans-serif;
      font-size: 1rem;
      color: #4ade80; /* Green */
      letter-spacing: 1px;
      text-transform: uppercase;
  }
</style>
