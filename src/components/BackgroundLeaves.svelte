<script lang="ts">
  import { useTask, T } from '@threlte/core';
  import { useGltf } from '@threlte/extras';
  import { writable } from 'svelte/store';

  export let socialDensity: number = 0;
  export let productiveDensity: number = 0;

  const time = writable(0);

  // Load models once
  const redLeaf = useGltf('/model/leaf/red-leaf.glb');
  const greenLeaf = useGltf('/model/leaf/green-leaf.glb');
  const dryLeaf = useGltf('/model/leaf/dry-leaf .glb');

  useTask((delta) => {
    $time += delta;
  });

  // Configuration for "Root Area" leaf placement
  // Adjust these values to change the fixed area
  const ROOT_RADIUS_MIN = -9;
  const ROOT_RADIUS_MAX = 9;
  const ROOT_Y_MIN = -5;
  const ROOT_Y_MAX = -4;

  // Helper to generate random positions in the fixed root area
  function generateRandomPositions(count: number) {
      console.log(`Generating ${count} leaves in Root Area: Radius ${ROOT_RADIUS_MIN}-${ROOT_RADIUS_MAX}, Y ${ROOT_Y_MIN} to ${ROOT_Y_MAX}`);
      
      return Array.from({ length: count }, () => {
          // Circular distribution
          const theta = Math.random() * 2 * Math.PI;
          const r = ROOT_RADIUS_MIN + (Math.random() * (ROOT_RADIUS_MAX - ROOT_RADIUS_MIN));

          const x = r * Math.cos(theta);
          const z = r * Math.sin(theta);
          
          // Vertical distribution (Root area)
          const y = ROOT_Y_MIN + (Math.random() * (ROOT_Y_MAX - ROOT_Y_MIN));

          return [x, y, z] as [number, number, number];
      });
  }

  // Generate positions reactively when density changes
  $: socialPositions = generateRandomPositions(socialDensity);
  $: productivePositions = generateRandomPositions(productiveDensity);
  
  // Dry leaves logic: show 50 if both densities are 0
  $: showDryLeaves = socialDensity === 0 && productiveDensity === 0;
  $: dryPositions = showDryLeaves ? generateRandomPositions(200) : [];

</script>

<!-- Background Leaves: Social (Red) -->
{#if $redLeaf}
    {#each socialPositions as pos, i (i)}
        <T 
            is={$redLeaf.scene.clone()}
            position={pos}
            scale={0.4}
            rotation={[
                Math.sin($time * 5 + i) * 0.2 + (i % 3), 
                Math.cos($time * 3 + i) * 0.2 + (i % 2), 
                Math.sin($time * 4 + i) * 0.2
            ]}
        />
    {/each}
{/if}

<!-- Background Leaves: Productive (Green) -->
{#if $greenLeaf}
    {#each productivePositions as pos, i (i)}
        <T 
            is={$greenLeaf.scene.clone()}
            position={pos}
            scale={0.4}
            rotation={[
                Math.sin($time * 5 + i) * 0.2 + (i % 3), 
                Math.cos($time * 3 + i) * 0.2 + (i % 2), 
                Math.sin($time * 4 + i) * 0.2
            ]}
        />
    {/each}
{/if}

<!-- Background Leaves: Inactivity (Dry) -->
{#if $dryLeaf && showDryLeaves}
    {#each dryPositions as pos, i (i)}
        <T 
            is={$dryLeaf.scene.clone()}
            position={pos}
            scale={0.4}
            rotation={[
                Math.sin($time * 5 + i) * 0.2 + (i % 3), 
                Math.cos($time * 3 + i) * 0.2 + (i % 2), 
                Math.sin($time * 4 + i) * 0.2
            ]}
        />
    {/each}
{/if}
