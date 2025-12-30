<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabaseClient';
  import { getGoalTypeIcon, getGoalTypeLabel, type GoalType } from '$lib/utils/goalUtils';
  import { fade, scale } from 'svelte/transition';

  export let userId: string;
  export let currentGoal: { goal_type: GoalType; target_value: number } | null = null;

  const dispatch = createEventDispatcher();

  let selectedType: GoalType | null = currentGoal?.goal_type || null;
  let targetValue: number = currentGoal?.target_value || 25;
  let isSaving = false;
  let error = '';

  const goalTypes: GoalType[] = ['friends', 'photos', 'posts', 'albums', 'likes', 'videos'];

  async function saveGoal() {
    if (!selectedType || targetValue <= 0) {
      error = 'Please select a goal type and enter a valid target value';
      return;
    }

    isSaving = true;
    error = '';

    try {
      const { error: upsertError } = await supabase
        .from('user_goals')
        .upsert({
          user_id: userId,
          goal_type: selectedType,
          target_value: targetValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;

      dispatch('goalSaved', { goal_type: selectedType, target_value: targetValue });
    } catch (e: any) {
      error = e.message || 'Failed to save goal';
      console.error('Error saving goal:', e);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="goal-selector" transition:fade>
  <button 
    class="backdrop" 
    on:click={() => dispatch('close')}
    aria-label="Close goal selector"
    type="button"
  ></button>
  
  <div class="modal" transition:scale={{ start: 0.9 }}>
    <h2 class="title">🎯 Choose Your Primary Goal</h2>
    <p class="subtitle">Select what you want to grow in your digital garden</p>

    <div class="goal-grid">
      {#each goalTypes as type}
        <button
          class="goal-card"
          class:selected={selectedType === type}
          on:click={() => selectedType = type}
        >
          <div class="icon">{getGoalTypeIcon(type)}</div>
          <div class="label">{getGoalTypeLabel(type)}</div>
        </button>
      {/each}
    </div>

    {#if selectedType}
      <div class="target-input" transition:fade>
        <label for="target">Target {getGoalTypeLabel(selectedType)}:</label>
        <input
          id="target"
          type="number"
          min="1"
          bind:value={targetValue}
          placeholder="e.g., 25"
        />
      </div>
    {/if}

    {#if error}
      <p class="error" transition:fade>{error}</p>
    {/if}

    <div class="actions">
      <button class="btn-cancel" on:click={() => dispatch('close')}>Cancel</button>
      <button 
        class="btn-save" 
        on:click={saveGoal}
        disabled={!selectedType || isSaving}
      >
        {isSaving ? 'Saving...' : currentGoal ? 'Update Goal' : 'Set Goal'}
      </button>
    </div>
  </div>
</div>

<style>
  .goal-selector {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  .backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    border: none;
    padding: 0;
    cursor: default;
  }

  .modal {
    position: relative;
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border-radius: 1.5rem;
    padding: 2rem;
    max-width: 600px;
    width: 100%;
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(59, 130, 246, 0.1);
  }

  .title {
    font-size: 1.875rem;
    font-weight: bold;
    text-align: center;
    background: linear-gradient(to right, #10b981, #3b82f6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    text-align: center;
    color: #9ca3af;
    font-size: 0.875rem;
    margin-bottom: 2rem;
  }

  .goal-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .goal-card {
    background: rgba(31, 41, 55, 0.5);
    border: 2px solid rgba(75, 85, 99, 0.5);
    border-radius: 1rem;
    padding: 1.5rem 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .goal-card:hover {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.1);
    transform: translateY(-2px);
  }

  .goal-card.selected {
    border-color: #3b82f6;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2));
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
  }

  .icon {
    font-size: 2.5rem;
  }

  .label {
    color: #e5e7eb;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .target-input {
    background: rgba(17, 24, 39, 0.6);
    border-radius: 0.75rem;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .target-input label {
    display: block;
    color: #d1d5db;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .target-input input {
    width: 100%;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    padding: 0.75rem;
    color: white;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
  }

  .target-input input:focus {
    border-color: #3b82f6;
  }

  .error {
    color: #ef4444;
    font-size: 0.875rem;
    text-align: center;
    margin-bottom: 1rem;
  }

  .actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }

  .btn-cancel,
  .btn-save {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-cancel {
    background: rgba(75, 85, 99, 0.5);
    color: #d1d5db;
  }

  .btn-cancel:hover {
    background: rgba(75, 85, 99, 0.7);
  }

  .btn-save {
    background: linear-gradient(to right, #10b981, #3b82f6);
    color: white;
  }

  .btn-save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .goal-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
