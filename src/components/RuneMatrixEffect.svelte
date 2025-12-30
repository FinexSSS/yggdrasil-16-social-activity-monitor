<script lang="ts">
  import { T, useTask } from '@threlte/core';
  import { Text } from '@threlte/extras';
  import { onMount } from 'svelte';
  
  // Configuration for "Realistic" feel
  const STREAM_COUNT = 300; // Maximum density
  const CHARS_PER_STREAM = 15; // Vertical length of each stream (visual only)
  const FALL_SPEED_MIN = 4;
  const FALL_SPEED_MAX = 10;
  const FONT_SIZE = 0.5;
  const BOUNDS_X = 30;
  const BOUNDS_Z = 30;
  const SPAWN_Y = 30;
  const RESET_Y = -5;

  // Elder Futhark Runes
  const RUNES = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ";

  interface Stream {
    x: number;
    y: number;
    z: number;
    speed: number;
    chars: string;
    opacity: number;
    size: number;
  }

  let streams: Stream[] = [];

  function generateRandomRunes(length: number): string {
    let result = '';
    for (let i = 0; i < length; i++) {
        result += RUNES.charAt(Math.floor(Math.random() * RUNES.length)) + '\n';
    }
    return result;
  }

  function initStreams() {
    const newStreams: Stream[] = [];
    for (let i = 0; i < STREAM_COUNT; i++) {
      newStreams.push({
        x: (Math.random() - 0.5) * BOUNDS_X * 2,
        y: Math.random() * (SPAWN_Y - RESET_Y) + RESET_Y,
        z: (Math.random() - 0.5) * BOUNDS_Z * 2,
        speed: Math.random() * (FALL_SPEED_MAX - FALL_SPEED_MIN) + FALL_SPEED_MIN,
        chars: generateRandomRunes(Math.floor(Math.random() * 5) + 5), // Variable length
        opacity: Math.random() * 0.5 + 0.3,
        size: FONT_SIZE * (Math.random() * 0.5 + 0.8) // Slight size variation
      });
    }
    streams = newStreams;
  }

  onMount(() => {
    initStreams();
  });

  useTask((delta) => {
    // Animate streams
    streams = streams.map(stream => {
      let newY = stream.y - stream.speed * delta;
      
      // Randomly change a character occasionally for "glitch" effect
      if (Math.random() < 0.05) {
         // Re-generate chars
         // stream.chars = generateRandomRunes(stream.chars.length / 2); // Keep optimized
      }

      if (newY < RESET_Y) {
        // Reset to top
        newY = SPAWN_Y + Math.random() * 10;
        return {
          ...stream,
          y: newY,
          x: (Math.random() - 0.5) * BOUNDS_X * 2,
          z: (Math.random() - 0.5) * BOUNDS_Z * 2,
          chars: generateRandomRunes(Math.floor(Math.random() * 5) + 5)
        };
      }

      return { ...stream, y: newY };
    });
  });
</script>

{#each streams as stream}
  <T.Group position={[stream.x, stream.y, stream.z]}>
    <!-- Main falling text -->
    <Text
      text={stream.chars}
      fontSize={stream.size}
      color="#00ff00"
      anchorX="center"
      anchorY="top"
      fillOpacity={stream.opacity}
      outlineWidth={0}
      outlineColor="#003300"
    >
      <!-- Glow effect using a second slightly larger text or just material props? 
           Text component doesn't support custom shaders easily, so we use a simple color 
      -->
    </Text>
    
    <!-- "Head" character (brighter/white) -->
    <Text
      text={stream.chars.charAt(0)}
      fontSize={stream.size}
      color="#ccffcc"
      position={[0, 0, 0.01]} 
      anchorX="center"
      anchorY="top"
      fillOpacity={0.9}
    />
  </T.Group>
{/each}
