<script lang="ts">
  import { useGltf, HTML } from '@threlte/extras';
  import { T } from '@threlte/core';
  import { getLeafCount, getGoalTypeLabel, type GoalType } from '$lib/utils/goalUtils';
  import * as THREE from 'three';

  export let progress: number = 0; // 0-100
  export let maxLeaves: number = 100; // 1 leaf per 1% progress
  export let currentValue: number = 0;
  export let targetValue: number = 0;
  export let goalType: GoalType | null = null;

  $: leafCount = getLeafCount(progress, maxLeaves);

  // Load the GLTF model once
  const gltf = useGltf('/model/leaf/blue-leaf.glb');

  // Generate 100 leaf positions to form a cohesive filled leaf shape
  // Leaves arranged to fill the entire area, not just the edges
  function generateLeafPositions(): Array<{ x: number; y: number; z: number; rotation: number }> {
    const positions = [];
    const totalLeaves = 100;
    const rows = 10; // 10 rows
    const leavesPerRow = 10; // 10 leaves per row
    
    let leafIndex = 0;
    for (let row = 0; row < rows; row++) {
      const rowProgress = row / (rows - 1); // 0 to 1 from bottom to top
      
      // Y position: bottom (-3) to top (2)
      const y = -3 + rowProgress * 5;
      
      // Width varies to create leaf shape (narrow at ends, wide in middle)
      const widthFactor = Math.sin(rowProgress * Math.PI); // 0 at ends, 1 in middle
      const maxWidth = 1.0;
      const rowWidth = widthFactor * maxWidth;
      
      // Number of leaves in this row based on width
      const leavesInRow = Math.max(2, Math.ceil(leavesPerRow * widthFactor));
      
      for (let col = 0; col < leavesInRow && leafIndex < totalLeaves; col++) {
        const colProgress = col / (leavesInRow - 1 || 1); // 0 to 1 from left to right
        
        // X position: spread across the width
        const x = 12 + (colProgress - 0.5) * 2 * rowWidth;
        
        // Z position for depth variation
        const z = (Math.random() - 0.5) * 0.5;
        
        // Rotation based on position
        const rotation = (colProgress - 0.5) * 30 + (Math.random() - 0.5) * 15;
        
        positions.push({ x, y, z, rotation });
        leafIndex++;
      }
    }
    
    // Fill remaining positions if needed
    while (positions.length < totalLeaves) {
      const progress = positions.length / totalLeaves;
      const y = -3 + progress * 5;
      const widthFactor = Math.sin(progress * Math.PI);
      const x = 12 + (Math.random() - 0.5) * widthFactor * 2;
      const z = (Math.random() - 0.5) * 0.5;
      const rotation = (Math.random() - 0.5) * 30;
      positions.push({ x, y, z, rotation });
    }
    
    return positions;
  }

  const leafPositions = generateLeafPositions();
</script>

{#if $gltf}

  <!-- Progress Display (3D HTML overlay) -->
  {#if goalType}
    <T.Group position={[12, 3, 0]}>
      <HTML transform center>
        <div class="progress-display">
          <p class="progress-label">Goal Progress:</p>
          <div class="progress-values">
            <p class="progress-current">{currentValue} / {targetValue} {getGoalTypeLabel(goalType)}</p>
            <p class="progress-percent">{progress.toFixed(0)}%</p>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: {progress}%"></div>
          </div>
        </div>
      </HTML>
    </T.Group>
  {/if}

  <!-- Progress leaves -->
  {#each leafPositions.slice(0, leafCount) as leaf, index (index)}
    <T.Group 
      position={[leaf.x, leaf.y, leaf.z]}
      rotation={[0, (leaf.rotation * Math.PI) / 180, 0]}
    >
      <T is={$gltf.scene.clone()} scale={0.4} />
    </T.Group>
  {/each}
{/if}

<style>
  .progress-display {
    padding: 6px 8px;
    background: rgba(17, 24, 39, 0.9);
    border-radius: 8px;
    border: 1px solid rgba(16, 185, 129, 0.3);
    min-width: 120px;
    pointer-events: none;
    font-size: 0.7em;
  }

  .progress-label {
    font-size: 8px;
    color: #9ca3af;
    margin-bottom: 2px;
  }

  .progress-values {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }

  .progress-current {
    font-weight: bold;
    color: #10b981;
    font-size: 10px;
  }

  .progress-percent {
    font-size: 9px;
    color: #60a5fa;
  }

  .progress-bar-container {
    width: 100%;
    background: #374151;
    border-radius: 9999px;
    height: 4px;
  }

  .progress-bar-fill {
    background: linear-gradient(to right, #10b981, #3b82f6);
    height: 4px;
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
</style>
