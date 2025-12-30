<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { weatherStore, weatherDisplayNames, weatherIcons, type WeatherType } from '$lib/utils/weatherUtils';
  
  const dispatch = createEventDispatcher();
  
  $: isAuto = $weatherStore.isAuto;
  $: currentWeather = $weatherStore.current;
  
  const allWeatherTypes: WeatherType[] = [
    'clear-day',
    'sunset',
    'snowfall',
    'rain',
    'thunderstorm',
  ];
  
  function selectWeather(weather: WeatherType) {
    weatherStore.setManualWeather(weather);
  }
  
  function toggleMode() {
    if (isAuto) {
      // Switch to manual with current weather
      weatherStore.setManualWeather(currentWeather);
    } else {
      // Switch to auto
      weatherStore.setAutoMode();
    }
  }
  

  
  function handleClose() {
    dispatch('close');
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Overlay -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div 
  class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
  on:click={handleClose}
>
  <!-- Modal Content -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full p-6 relative"
    on:click|stopPropagation
  >
    <!-- Close Button -->
    <button
      on:click={handleClose}
      class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
      aria-label="Close"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
    
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
        Weather Settings
      </h2>
      <p class="text-sm text-gray-400">
        Customize the atmospheric effects in your garden
      </p>
    </div>
    
    <!-- Auto/Manual Toggle -->
    <div class="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-white font-medium mb-1">Weather Mode</h3>
          <p class="text-xs text-gray-400">
            {isAuto ? 'Automatically changes based on your local time' : 'Manually selected weather effect'}
          </p>
        </div>
        <button
          on:click={toggleMode}
          class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors {isAuto ? 'bg-blue-500' : 'bg-gray-600'}"
        >
          <span class="sr-only">Toggle weather mode</span>
          <span
            class="inline-block h-6 w-6 transform rounded-full bg-white transition-transform {isAuto ? 'translate-x-7' : 'translate-x-1'}"
          />
        </button>
      </div>
      
      {#if isAuto}
        <div class="mt-3 text-xs text-blue-300 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Auto mode active - weather updates every 5 minutes
        </div>
      {/if}
    </div>
    
    <!-- Weather Selection Grid -->
    <div class="mb-6">
      <h3 class="text-white font-medium mb-3">Select Weather</h3>
      <div class="grid grid-cols-5 gap-3">
        {#each allWeatherTypes as weather}
          <button
            on:click={() => selectWeather(weather)}
            disabled={isAuto}
            class="relative p-4 rounded-xl border-2 transition-all {
              currentWeather === weather 
                ? 'border-blue-400 bg-blue-500/20' 
                : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
            } {isAuto ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
          >
            <div class="text-3xl mb-2">{weatherIcons[weather]}</div>
            <div class="text-xs text-white font-medium text-center">
              {weatherDisplayNames[weather]}
            </div>
            
            {#if currentWeather === weather}
              <div class="absolute top-2 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            {/if}
          </button>
        {/each}
      </div>
    </div>
    

    
    <!-- Current Weather Info -->
    <div class="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
      <div class="flex items-center gap-3">
        <div class="text-4xl">{weatherIcons[currentWeather]}</div>
        <div>
          <div class="text-white font-medium">{weatherDisplayNames[currentWeather]}</div>
          <div class="text-xs text-gray-400">
            {isAuto ? 'Auto-selected based on current time' : 'Manually selected'}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>


