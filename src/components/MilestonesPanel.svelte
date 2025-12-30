<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fly, scale, fade } from 'svelte/transition';
    import { supabase } from '$lib/supabaseClient';
    import { 
        calculateMilestoneProgress, 
        type MilestoneProgress 
    } from '$lib/utils/milestones';

    export let facebookData: any = null;
    export let userId: string = '';
    export let claimedMilestones: Record<string, boolean> = {};
    export let runePoints: number = 0;
    export let isOpen: boolean = false;

    const dispatch = createEventDispatcher();

    let milestones: MilestoneProgress[] = [];
    let claiming: string | null = null;
    let notification: string | null = null;

    $: if (facebookData) {
        milestones = calculateMilestoneProgress(facebookData, claimedMilestones);
    }

    $: friendsMilestones = milestones.filter(m => m.milestone.type === 'friends');
    $: postsMilestones = milestones.filter(m => m.milestone.type === 'posts');
    $: claimableCount = milestones.filter(m => m.isComplete && !m.isClaimed).length;

    async function claimMilestone(milestone: MilestoneProgress) {
        if (!userId || claiming || milestone.isClaimed || !milestone.isComplete) return;

        claiming = milestone.milestone.id;

        try {
            const newClaimed = { ...claimedMilestones, [milestone.milestone.id]: true };
            const newRunes = runePoints + milestone.milestone.runeReward;

            const { error } = await supabase
                .from('profiles')
                .update({
                    milestones_claimed: newClaimed,
                    rune_points: newRunes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            // Update local state
            claimedMilestones = newClaimed;
            runePoints = newRunes;
            
            // Show notification
            notification = `+${milestone.milestone.runeReward} Rune${milestone.milestone.runeReward > 1 ? 's' : ''}!`;
            setTimeout(() => notification = null, 2000);

            // Dispatch update event
            dispatch('update', { runePoints: newRunes, claimedMilestones: newClaimed });

        } catch (e) {
            console.error('Error claiming milestone:', e);
        } finally {
            claiming = null;
        }
    }

    function close() {
        dispatch('close');
    }
</script>

{#if isOpen}
    <!-- Modal Overlay - Full screen with strong blur -->
    <div 
        class="fixed inset-0 bg-black/95 z-[99999] flex items-center justify-center p-4"
        style="backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"
        transition:fade={{ duration: 200 }}
    >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="absolute inset-0" on:click={close}></div>

        <!-- Modal Content -->
        <div 
            class="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border-2 border-amber-500/30 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            style="box-shadow: 0 0 60px rgba(251, 191, 36, 0.2), 0 25px 50px -12px rgba(0, 0, 0, 0.8);"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <!-- Header -->
            <div class="p-6 border-b border-gray-800 bg-gradient-to-r from-amber-900/20 to-orange-900/20">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                            Achievement Milestones
                        </h2>
                        <p class="text-gray-400 text-sm mt-1">Complete milestones to earn Runestones</p>
                    </div>
                    <button 
                        on:click={close}
                        class="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                        aria-label="Close milestones panel"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <!-- Rune Points Display -->
                <div class="mt-4 flex items-center gap-4">
                    <div class="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
                        <span class="text-2xl text-amber-400">ᚱ</span>
                        <span class="text-xl font-bold text-amber-400">{runePoints}</span>
                        <span class="text-sm text-amber-300/70">Rune Points</span>
                    </div>
                    {#if claimableCount > 0}
                        <div class="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-sm">
                            {claimableCount} available to claim!
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Notification -->
            {#if notification}
                <div 
                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-8 py-4 bg-amber-500/90 text-black font-bold text-xl rounded-xl shadow-2xl"
                    transition:scale={{ duration: 300 }}
                >
                    {notification}
                </div>
            {/if}

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-6 space-y-8">
                <!-- Friends Milestones -->
                <div>
                    <h3 class="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                        <span class="text-xl">👥</span>
                        Friends Milestones
                    </h3>
                    <div class="space-y-3">
                        {#each friendsMilestones as mp}
                            <div class="bg-gray-800/50 rounded-xl p-4 border {mp.isClaimed ? 'border-gray-700' : mp.isComplete ? 'border-green-500/50' : 'border-gray-700'}">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl {mp.isClaimed ? 'opacity-50' : 'text-emerald-400'}">{mp.milestone.rune}</span>
                                        <div>
                                            <h4 class="font-medium {mp.isClaimed ? 'text-gray-500' : 'text-white'}">{mp.milestone.label}</h4>
                                            <p class="text-xs text-gray-500">
                                                {mp.currentValue.toLocaleString()} / {mp.milestone.threshold.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-3">
                                        <span class="text-amber-400 text-sm">+{mp.milestone.runeReward} ᚱ</span>
                                        
                                        {#if mp.isClaimed}
                                            <span class="px-3 py-1 bg-gray-700 text-gray-500 rounded-lg text-sm">
                                                ✓ Claimed
                                            </span>
                                        {:else if mp.isComplete}
                                            <button 
                                                on:click={() => claimMilestone(mp)}
                                                disabled={claiming === mp.milestone.id}
                                                class="px-4 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium border border-green-500/30 hover:border-green-400 transition-all disabled:opacity-50"
                                            >
                                                {claiming === mp.milestone.id ? '...' : 'Claim'}
                                            </button>
                                        {:else}
                                            <span class="text-gray-600 text-sm">{Math.round(mp.progress)}%</span>
                                        {/if}
                                    </div>
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        class="h-full transition-all duration-500 {mp.isClaimed ? 'bg-gray-600' : mp.isComplete ? 'bg-green-500' : 'bg-emerald-500/50'}"
                                        style="width: {mp.progress}%"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Posts Milestones -->
                <div>
                    <h3 class="text-lg font-semibold text-blue-400 mb-4 flex items-center gap-2">
                        <span class="text-xl">📝</span>
                        Posts Milestones
                    </h3>
                    <div class="space-y-3">
                        {#each postsMilestones as mp}
                            <div class="bg-gray-800/50 rounded-xl p-4 border {mp.isClaimed ? 'border-gray-700' : mp.isComplete ? 'border-green-500/50' : 'border-gray-700'}">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center gap-3">
                                        <span class="text-2xl {mp.isClaimed ? 'opacity-50' : 'text-blue-400'}">{mp.milestone.rune}</span>
                                        <div>
                                            <h4 class="font-medium {mp.isClaimed ? 'text-gray-500' : 'text-white'}">{mp.milestone.label}</h4>
                                            <p class="text-xs text-gray-500">
                                                {mp.currentValue.toLocaleString()} / {mp.milestone.threshold.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center gap-3">
                                        <span class="text-amber-400 text-sm">+{mp.milestone.runeReward} ᚱ</span>
                                        
                                        {#if mp.isClaimed}
                                            <span class="px-3 py-1 bg-gray-700 text-gray-500 rounded-lg text-sm">
                                                ✓ Claimed
                                            </span>
                                        {:else if mp.isComplete}
                                            <button 
                                                on:click={() => claimMilestone(mp)}
                                                disabled={claiming === mp.milestone.id}
                                                class="px-4 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium border border-green-500/30 hover:border-green-400 transition-all disabled:opacity-50"
                                            >
                                                {claiming === mp.milestone.id ? '...' : 'Claim'}
                                            </button>
                                        {:else}
                                            <span class="text-gray-600 text-sm">{Math.round(mp.progress)}%</span>
                                        {/if}
                                    </div>
                                </div>
                                
                                <!-- Progress Bar -->
                                <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        class="h-full transition-all duration-500 {mp.isClaimed ? 'bg-gray-600' : mp.isComplete ? 'bg-green-500' : 'bg-blue-500/50'}"
                                        style="width: {mp.progress}%"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-gray-800 bg-gray-900/50">
                <a 
                    href="/shop"
                    class="w-full block text-center px-4 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl font-medium border border-amber-500/30 hover:border-amber-400 transition-all"
                >
                    🌳 Visit Tree Shop
                </a>
            </div>
        </div>
    </div>
{/if}
