<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import { fade, fly } from 'svelte/transition';
    import { supabase } from '$lib/supabaseClient';

    export let userId: string;
    export let isOpen: boolean = false;

    const dispatch = createEventDispatcher();

    let history: any[] = [];
    let loading = true;
    let error: string | null = null;

    $: if (isOpen && userId) {
        loadHistory();
    }

    async function loadHistory() {
        loading = true;
        error = null;
        try {
            const { data, error: err } = await supabase
                .from('garden_history')
                .select('snapshot_date, rune_points, assigned_model')
                .eq('user_id', userId)
                .order('snapshot_date', { ascending: false });

            if (err) throw err;
            history = data || [];
        } catch (e: any) {
            console.error('Error loading history:', e);
            error = e.message;
        } finally {
            loading = false;
        }
    }

    function selectDate(date: string) {
        dispatch('select', { date });
        close();
    }

    function close() {
        dispatch('close');
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
</script>

{#if isOpen}
    <div 
        class="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4"
        style="backdrop-filter: blur(8px);"
        transition:fade={{ duration: 200 }}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="absolute inset-0" on:click={close}></div>

        <div 
            class="relative bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <!-- Header -->
            <div class="p-6 border-b border-gray-800 bg-gray-800/50">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold text-white">Garden History</h2>
                    <button 
                        on:click={close}
                        class="text-gray-400 hover:text-white transition-colors"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p class="text-sm text-gray-400 mt-1">Travel back to see your previous gardens</p>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {#if loading}
                    <div class="flex justify-center py-8">
                        <div class="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                {:else if error}
                    <div class="text-center py-8 text-red-400">
                        {error}
                    </div>
                {:else if history.length === 0}
                    <div class="text-center py-8 text-gray-500">
                        No history found.
                    </div>
                {:else}
                    {#each history as entry}
                        <button
                            on:click={() => selectDate(entry.snapshot_date)}
                            class="w-full text-left p-4 rounded-xl bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50 hover:border-amber-500/50 transition-all group"
                        >
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-medium text-white group-hover:text-amber-400 transition-colors">
                                    {formatDate(entry.snapshot_date)}
                                </span>
                                <span class="text-xs text-gray-500 font-mono">{entry.snapshot_date}</span>
                            </div>
                            <div class="flex items-center gap-4 text-sm text-gray-400">
                                <div class="flex items-center gap-1">
                                    <span class="text-amber-500">ᚱ</span>
                                    <span>{entry.rune_points || 0}</span>
                                </div>
                                {#if entry.assigned_model}
                                    <div class="flex items-center gap-1">
                                        <span>🌳</span>
                                        <span class="truncate max-w-[150px]">{entry.assigned_model.replace('tree/', '').replace('.glb', '').replace(/-/g, ' ')}</span>
                                    </div>
                                {/if}
                            </div>
                        </button>
                    {/each}
                {/if}
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1);
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.2);
    }
</style>
