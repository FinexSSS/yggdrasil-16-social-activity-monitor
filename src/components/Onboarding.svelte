<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { toRunes } from '$lib/utils/runes';
  import { ONBOARDING_QUESTIONS, calculateRealm, type Answer } from '$lib/data/onboarding';

  const dispatch = createEventDispatcher();

  let step = 0;
  let showResult = false;
  let selectedAnswers: Answer[] = [];
  let currentRealm = "";

  // Text State
  let runeWords: string[] = [];
  let englishWords: string[] = [];
  
  // Animation State
  let visibleRuneWords = 0;
  let visibleEnglishWords = 0;
  let showAnswers = false;

  $: currentQuestion = ONBOARDING_QUESTIONS[step];
  
  // Reactivity: When step or state changes, trigger text sequence
  $: if (currentQuestion && !showResult) {
      startTextSequence(currentQuestion.text);
  }

  function startTextSequence(text: string) {
      // Reset
      visibleRuneWords = 0;
      visibleEnglishWords = 0;
      showAnswers = false;
      
      const runes = toRunes(text);
      
      runeWords = runes.split(" ");
      englishWords = text.split(" ");
      
      animateWords();
  }

  function animateWords() {
      // 1. Animate Runes Word by Word
      const runeInterval = setInterval(() => {
          if (visibleRuneWords < runeWords.length) {
              visibleRuneWords++;
          } else {
              clearInterval(runeInterval);
              // 2. Pause then Animate English
              setTimeout(() => {
                  const englishInterval = setInterval(() => {
                      if (visibleEnglishWords < englishWords.length) {
                          visibleEnglishWords++;
                      } else {
                          clearInterval(englishInterval);
                          // 3. Show Answers
                          setTimeout(() => {
                              showAnswers = true;
                          }, 500);
                      }
                  }, 200); // Speed of English words
              }, 500);
          }
      }, 300); // Speed of Rune words
  }
  
  // Reveal Sequence logic
  async function finishOnboarding() {
      showResult = true;
      currentRealm = calculateRealm(selectedAnswers);
      
      // Sequence 1: "The roots have chosen"
      startRevealSequence("The roots have chosen");
      
      // Sequence 2: "Welcome to [Realm]"
      setTimeout(() => {
           startRevealSequence(`Welcome to ${currentRealm}`);
           
           // Complete
           setTimeout(() => {
               dispatch('complete', { realm: currentRealm });
           }, 5000); // Time to read final result
      }, 4000);
  }
  
  function startRevealSequence(text: string) {
      // Same logic but for result screen
      visibleRuneWords = 0;
      visibleEnglishWords = 0;
      
      const runes = toRunes(text);
      runeWords = runes.split(" ");
      englishWords = text.split(" ");
      
      // Speed up animation slightly for reveal
      const runeInterval = setInterval(() => {
          if (visibleRuneWords < runeWords.length) {
              visibleRuneWords++;
          } else {
              clearInterval(runeInterval);
              setTimeout(() => {
                  const englishInterval = setInterval(() => {
                      if (visibleEnglishWords < englishWords.length) {
                          visibleEnglishWords++;
                      } else {
                          clearInterval(englishInterval);
                      }
                  }, 150);
              }, 300);
          }
      }, 200);
  }

  function selectAnswer(answer: Answer) {
      selectedAnswers = [...selectedAnswers, answer];
      if (step < ONBOARDING_QUESTIONS.length - 1) {
          step++;
      } else {
          finishOnboarding();
      }
  }

  onMount(() => {
      if (currentQuestion) {
          startTextSequence(currentQuestion.text);
      }
  });
</script>

<div class="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden" in:fade out:fade>
  <!-- Background Ambience - Removed Image, kept gradient -->
  <div class="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 pointer-events-none"></div>

  <!-- Content Container -->
  <div class="relative z-10 max-w-4xl w-full text-center flex flex-col items-center min-h-[60vh] justify-center">
      
      <!-- Text Display Area -->
      <div class="mb-12 space-y-6 min-h-[120px]">
          <!-- Runes Line -->
          <div class="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {#each runeWords as word, i}
                  <span 
                      class="text-4xl md:text-6xl font-serif text-amber-500/90 tracking-widest transition-opacity duration-500"
                      class:opacity-100={i < visibleRuneWords}
                      class:opacity-0={i >= visibleRuneWords}
                  >
                      {word}
                  </span>
              {/each}
          </div>

          <!-- English Line (Below) -->
          <div class="flex flex-wrap justify-center gap-x-2">
              {#each englishWords as word, i}
                  <span 
                      class="text-lg md:text-xl font-light text-gray-400 tracking-wide transition-opacity duration-500"
                      class:opacity-100={i < visibleEnglishWords}
                      class:opacity-0={i >= visibleEnglishWords}
                  >
                      {word}
                  </span>
              {/each}
          </div>
      </div>

      <!-- Answers Area -->
      {#if !showResult && showAnswers}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl" in:fade={{ duration: 800 }}>
              {#each currentQuestion.answers as answer}
                  <button
                      on:click={() => selectAnswer(answer)}
                      class="group relative overflow-hidden rounded-lg border border-white/10 bg-white/5 p-6 hover:bg-white/10 hover:border-amber-500/50 transition-all duration-300 text-left"
                  >
                      <div class="flex items-center space-x-4">
                          <span class="text-3xl filter grayscale group-hover:grayscale-0 transition-all duration-300 opacity-80 group-hover:opacity-100">{answer.icon}</span>
                          <span class="text-xl font-light text-gray-300 group-hover:text-amber-100 transition-colors">{answer.text}</span>
                      </div>
                  </button>
              {/each}
          </div>
      {/if}
      
      <!-- Progress (Only in Question Phase) -->
      {#if !showResult}
        <div class="absolute bottom-10 flex justify-center space-x-3 opacity-50">
            {#each ONBOARDING_QUESTIONS as q, i}
                <div class="w-1.5 h-1.5 rounded-full transition-colors duration-500 {i === step ? 'bg-amber-500' : 'bg-gray-700'}"></div>
            {/each}
        </div>
      {/if}
  </div>
</div>
