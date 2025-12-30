<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabaseClient';
  import type { RealmName } from '$lib/utils/realmEffects';
  import { REALM_EFFECTS, getRealmRune } from '$lib/utils/realmEffects';

  export let realm: RealmName;
  export let userId: string;
  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher();

  let journalEntry = '';
  let savedEntries: Array<{ id: string; content: string; created_at: string }> = [];
  let isLoading = false;
  let isSaving = false;
  let error = '';

  $: realmEffect = REALM_EFFECTS[realm];
  $: realmRune = getRealmRune(realm);

  $: if (isOpen && realm && userId) {
    loadJournalEntries();
  }

  async function loadJournalEntries() {
    isLoading = true;
    error = '';
    
    try {
      const { data, error: fetchError } = await supabase
        .from('realm_journals')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .eq('realm', realm)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      savedEntries = data || [];
    } catch (e: any) {
      error = e.message || 'Failed to load journal entries';
      console.error('Error loading journal entries:', e);
    } finally {
      isLoading = false;
    }
  }

  async function saveJournalEntry() {
    if (!journalEntry.trim()) return;
    
    isSaving = true;
    error = '';

    try {
      const { data, error: insertError } = await supabase
        .from('realm_journals')
        .insert({
          user_id: userId,
          realm: realm,
          content: journalEntry.trim(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to local state
      savedEntries = [data, ...savedEntries];
      journalEntry = '';
    } catch (e: any) {
      error = e.message || 'Failed to save journal entry';
      console.error('Error saving journal entry:', e);
    } finally {
      isSaving = false;
    }
  }

  async function deleteEntry(entryId: string) {
    if (!confirm('Delete this journal entry?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('realm_journals')
        .delete()
        .eq('id', entryId);

      if (deleteError) throw deleteError;

      savedEntries = savedEntries.filter(e => e.id !== entryId);
    } catch (e: any) {
      error = e.message || 'Failed to delete entry';
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Modal Overlay - Full screen with strong blur -->
  <div 
    class="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4"
    style="backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"
    transition:fade={{ duration: 200 }}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="absolute inset-0" on:click={handleClose}></div>
    
    <!-- Modal Content -->
    <div 
      class="relative bg-gradient-to-br from-gray-900/98 to-gray-800/98 backdrop-blur-xl rounded-2xl border-2 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      style="border-color: {realmEffect.color}60; box-shadow: 0 0 60px {realmEffect.color}40, 0 25px 50px -12px rgba(0, 0, 0, 0.8);"
      transition:fly={{ y: 20, duration: 300 }}
    >
      <!-- Header -->
      <div 
        class="p-6 border-b"
        style="border-color: {realmEffect.color}30; background: linear-gradient(135deg, {realmEffect.color}10, transparent)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-4xl">{realmEffect.icon}</span>
            <div>
              <h2 class="text-2xl font-bold" style="color: {realmEffect.color}">
                {realm} Journal
              </h2>
              <p class="text-sm text-gray-400 mt-1">
                <span class="font-mono text-lg" style="color: {realmEffect.color}">{realmRune}</span>
                <span class="mx-2">•</span>
                {realmEffect.description}
              </p>
            </div>
          </div>
          <button
            on:click={handleClose}
            class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors text-white/60 hover:text-white"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- New Entry Form -->
        <div class="mb-6">
          <label for="journal-entry" class="block text-sm font-medium text-gray-300 mb-2">
            Write your thoughts for {realm}
          </label>
          <textarea
            id="journal-entry"
            bind:value={journalEntry}
            placeholder="What wisdom does {realm} reveal to you today?"
            class="w-full h-32 bg-black/40 border rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 resize-none"
            style="border-color: {realmEffect.color}30; --tw-ring-color: {realmEffect.color}"
          ></textarea>
          
          <div class="flex items-center justify-between mt-3">
            {#if error}
              <p class="text-red-400 text-sm">{error}</p>
            {:else}
              <p class="text-gray-500 text-xs">
                {journalEntry.length} characters
              </p>
            {/if}
            
            <button
              on:click={saveJournalEntry}
              disabled={!journalEntry.trim() || isSaving}
              class="px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style="background: {realmEffect.color}; color: black"
            >
              {isSaving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>

        <!-- Past Entries -->
        <div class="border-t border-gray-700 pt-6">
          <h3 class="text-lg font-medium text-gray-200 mb-4 flex items-center gap-2">
            <span>📜</span>
            Past Entries
            <span class="text-sm text-gray-500">({savedEntries.length})</span>
          </h3>

          {#if isLoading}
            <div class="text-center py-8">
              <div class="animate-spin w-8 h-8 border-2 border-gray-600 border-t-white rounded-full mx-auto"></div>
              <p class="text-gray-400 mt-2">Loading entries...</p>
            </div>
          {:else if savedEntries.length === 0}
            <div class="text-center py-12 text-gray-500">
              <span class="text-4xl block mb-2">📝</span>
              <p>No journal entries for {realm} yet.</p>
              <p class="text-sm mt-1">Start your journey by writing above.</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each savedEntries as entry (entry.id)}
                <div 
                  class="bg-black/30 border rounded-xl p-4 group hover:bg-black/40 transition-colors"
                  style="border-color: {realmEffect.color}20"
                >
                  <div class="flex justify-between items-start mb-2">
                    <p class="text-xs text-gray-500 font-mono">
                      {formatDate(entry.created_at)}
                    </p>
                    <button
                      on:click={() => deleteEntry(entry.id)}
                      class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all"
                      title="Delete entry"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p class="text-gray-200 whitespace-pre-wrap">{entry.content}</p>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  textarea:focus {
    box-shadow: 0 0 0 2px var(--tw-ring-color);
  }
</style>
