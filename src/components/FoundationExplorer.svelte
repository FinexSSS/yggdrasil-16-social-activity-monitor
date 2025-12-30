<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import type { FoundationMetrics } from '$lib/utils/foundationUtils';
  import { createEventDispatcher } from 'svelte';

  export let metrics: FoundationMetrics;
  
  const dispatch = createEventDispatcher();
  
  // Theme colors based on foundation type
  $: themeColor = 
    metrics.type === 'memory' ? 'text-amber-400' :
    metrics.type === 'connection' ? 'text-emerald-400' :
    'text-blue-400'; // expression
    
  $: borderColor = 
    metrics.type === 'memory' ? 'border-amber-500/30' :
    metrics.type === 'connection' ? 'border-emerald-500/30' :
    'border-blue-500/30';
    
  $: bgGradient = 
    metrics.type === 'memory' ? 'from-amber-900/80 to-stone-900/90' :
    metrics.type === 'connection' ? 'from-emerald-900/80 to-stone-900/90' :
    'from-blue-900/80 to-stone-900/90';
</script>

<div 
  class="foundation-explorer fixed top-0 left-0 w-full h-full z-50 pointer-events-none flex items-center justify-center pl-24 md:pl-32"
  transition:fade
>
  <!-- Backdrop for clicking out -->
  <!-- Backdrop for clicking out -->
  <button 
    class="absolute inset-0 pointer-events-auto bg-transparent border-0 w-full h-full cursor-default focus:outline-none" 
    on:click={() => dispatch('close')}
    on:keydown={(e) => e.key === 'Escape' && dispatch('close')}
    type="button"
    aria-label="Close details"
  ></button>

  <!-- Main Panel -->
  <div 
    class="relative w-full max-w-md pointer-events-auto backdrop-blur-md rounded-2xl border p-6 shadow-2xl {borderColor} bg-gradient-to-br {bgGradient}"
    transition:fly={{ x: -20, duration: 400 }}
  >
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6 pt-2">
      <div class="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center border {borderColor}">
        <span class="text-3xl {themeColor}">{metrics.rune}</span>
      </div>
      <div>
        <h2 class="text-2xl font-bold text-white tracking-wide">{metrics.label}</h2>
        <p class="text-xs text-gray-300 uppercase tracking-widest font-semibold">Foundation Level {metrics.score}</p>
      </div>
      <button 
        class="ml-auto p-2 text-gray-400 hover:text-white transition-colors"
        on:click={() => dispatch('close')}
        aria-label="Close"
      >
        ✕
      </button>
    </div>

    <!-- Description -->
    <p class="text-gray-300 italic mb-6 border-l-2 p-3 {borderColor} bg-black/20">
      "{metrics.description}"
    </p>

    <!-- Metrics Grid -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      {#each Object.entries(metrics.details) as [key, value]}
        <div class="bg-black/30 p-3 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
          <p class="text-xs text-gray-400 uppercase tracking-wider mb-1">{key}</p>
          <p class="text-xl font-bold text-white">{value}</p>
        </div>
      {/each}
    </div>

    <!-- Power Bar -->
    <div class="mb-2">
      <div class="flex justify-between text-xs mb-1">
        <span class="text-gray-400">Foundation Strength</span>
        <span class="{themeColor} font-bold">{metrics.score}/100</span>
      </div>
      <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div 
          class="h-full {themeColor.replace('text', 'bg')} transition-all duration-1000 ease-out"
          style="width: {metrics.score}%"
        ></div>
      </div>
    </div>

  </div>
</div>

<style>
  .foundation-explorer {
    /* Custom scrollbar if needed */
  }
</style>
