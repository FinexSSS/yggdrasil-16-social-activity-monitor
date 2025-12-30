<script lang="ts">
    import { onMount, createEventDispatcher } from 'svelte';
    import { facebookAuth, type AuthState } from '$lib/services/facebook';
    import { supabase } from '$lib/supabaseClient';
    import { fly, fade } from 'svelte/transition';
    import { calculateMilestoneProgress, type MilestoneProgress } from '$lib/utils/milestones';
    import { SHOP_TREES, getTreeByModel } from '$lib/data/shopTrees';
    import { goto } from '$app/navigation';

    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let authState: AuthState = {
        user: null,
        userData: null,
        isLoading: false,
        error: null
    };

    let timeAgo = '';
    let stringifiedData = '';
    let activeTab = 'overview';
    
    // Runes & Milestones data
    let runePoints = 0;
    let purchasedTrees: string[] = [];
    let equippedTree = '';
    let claimedMilestones: Record<string, boolean> = {};
    let milestones: MilestoneProgress[] = [];
    
    // Confirmation modals
    let showRebirthConfirm = false;
    let showTerminateConfirm = false;
    let isProcessing = false;

    onMount(() => {
        const unsubscribe = facebookAuth.subscribe(async (state) => {
            authState = state;
            updateTimeAgo();
            if (state.userData) {
                stringifiedData = JSON.stringify(state.userData, null, 2);
                // Fetch runes data when user data is available
                await fetchRunesData(state.userData.id);
                // Calculate milestones
                milestones = calculateMilestoneProgress(state.userData, claimedMilestones);
            }
        });

        const interval = setInterval(updateTimeAgo, 60000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    });
    
    async function fetchRunesData(userId: string) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('rune_points, purchased_trees, assigned_model, milestones_claimed')
                .eq('id', userId)
                .single();
            
            if (!error && data) {
                runePoints = data.rune_points || 0;
                purchasedTrees = data.purchased_trees || ['tree/1-young-oak-seedling.glb'];
                equippedTree = data.assigned_model || 'tree/1-young-oak-seedling.glb';
                claimedMilestones = data.milestones_claimed || {};
            }
        } catch (e) {
            console.error('Error fetching runes data:', e);
        }
    }

    function updateTimeAgo() {
        if (authState.userData?.synced_at) {
            const syncedAt = new Date(authState.userData.synced_at);
            const now = new Date();
            const diffMs = now.getTime() - syncedAt.getTime();
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) {
                timeAgo = 'Just now';
            } else if (diffMins === 1) {
                timeAgo = '1 minute ago';
            } else if (diffMins < 60) {
                timeAgo = `${diffMins} minutes ago`;
            } else {
                const diffHours = Math.floor(diffMins / 60);
                timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            }
        }
    }

    async function handleRefresh() {
        await facebookAuth.refresh();
    }

    function handleDisconnect() {
        if (confirm('Are you sure you want to disconnect?')) {
            facebookAuth.disconnect();
            dispatch('close');
        }
    }

    function getCount(category: string): number {
        if (!authState.userData?.additional_data?.[category]?.data) return 0;
        return authState.userData.additional_data[category].data.length;
    }
    
    // Ragnarök Rebirth - Navigate to garden for outro animation, DB update happens after animation
    async function handleRagnarokRebirth() {
        if (!authState.userData?.id) return;
        
        showRebirthConfirm = false;
        dispatch('close');
        
        // Navigate to garden with rebirth animation - DB update happens after animation completes
        goto('/garden?rebirth=true');
    }
    
    // Terminate - Navigate to garden for outro animation, DB delete happens after animation
    async function handleTerminate() {
        if (!authState.userData?.id) return;
        
        showTerminateConfirm = false;
        dispatch('close');
        
        // Navigate to garden with terminate animation - DB delete happens after animation completes
        goto('/garden?terminate=true');
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" transition:fade={{ duration: 200 }}>
        <!-- Backdrop -->
        <button 
            class="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-default" 
            on:click={() => dispatch('close')}
            aria-label="Close modal"
        ></button>

        <!-- Modal Card -->
        <div 
            class="relative w-full max-w-4xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            transition:fly={{ y: 20, duration: 300 }}
        >
            <!-- Header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
                <div>
                    <h2 class="text-2xl font-light text-white tracking-wide">Data Inspector</h2>
                    <p class="text-gray-400 text-sm mt-1">Manage and view your Facebook data</p>
                </div>
                <button 
                    on:click={() => dispatch('close')}
                    class="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Content Area -->
            <div class="flex flex-1 overflow-hidden">
                <!-- Sidebar / Tabs (Desktop) -->
                <div class="w-48 bg-gray-800/30 border-r border-gray-800 p-4 hidden md:block space-y-2 overflow-y-auto">
                    {#each ['overview', 'runes', 'posts', 'photos', 'friends', 'json'] as tab}
                        <button 
                            on:click={() => activeTab = tab}
                            class={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                        >
                            {tab === 'runes' ? '🔮 Runes' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    {/each}
                    
                    <!-- Danger Zone separator -->
                    <div class="pt-4 mt-4 border-t border-gray-700">
                        <p class="text-xs text-gray-600 uppercase tracking-wider px-4 mb-2">Danger Zone</p>
                        <button 
                            on:click={() => activeTab = 'danger'}
                            class={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'danger' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-red-400/60 hover:bg-red-900/20 hover:text-red-400'}`}
                        >
                            ⚠️ Danger
                        </button>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="flex-1 overflow-y-auto p-6 bg-black/20">
                    <!-- Status Bar -->
                    <div class="mb-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex flex-wrap items-center justify-between gap-4">
                        <div class="flex items-center gap-3">
                            <div class="w-2 h-2 rounded-full {authState.user ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}"></div>
                            <div>
                                <p class="text-sm text-gray-200 font-medium">{authState.user ? 'Connected to Facebook' : 'Disconnected'}</p>
                                {#if authState.userData?.synced_at}
                                    <p class="text-xs text-gray-500 font-mono">Synced {timeAgo}</p>
                                {/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                             <button 
                                on:click={handleRefresh}
                                disabled={authState.isLoading || !authState.user}
                                class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {#if authState.isLoading}
                                    <svg class="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                {/if}
                                Refresh
                            </button>
                            <button 
                                on:click={handleDisconnect}
                                disabled={!authState.user}
                                class="px-3 py-1.5 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded text-xs font-bold transition-colors disabled:opacity-30"
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>

                    {#if !authState.userData}
                        <div class="text-center py-12 text-gray-500">
                            <p>No data available. Please connect or refresh.</p>
                        </div>
                    {:else}
                        <!-- Overview Tab -->
                        {#if activeTab === 'overview'}
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div class="bg-gray-800/40 p-4 rounded-lg border border-gray-700 text-center">
                                    <p class="text-gray-500 text-xs uppercase tracking-widest">Posts</p>
                                    <p class="text-2xl font-light text-white mt-1">{getCount('posts')}</p>
                                </div>
                                <div class="bg-gray-800/40 p-4 rounded-lg border border-gray-700 text-center">
                                    <p class="text-gray-500 text-xs uppercase tracking-widest">Friends</p>
                                    <p class="text-2xl font-light text-white mt-1">{authState.userData.additional_data?.friends?.summary?.total_count || getCount('friends')}</p>
                                </div>
                                <div class="bg-gray-800/40 p-4 rounded-lg border border-gray-700 text-center">
                                    <p class="text-gray-500 text-xs uppercase tracking-widest">Photos</p>
                                    <p class="text-2xl font-light text-white mt-1">{getCount('photos')}</p>
                                </div>
                                <div class="bg-gray-800/40 p-4 rounded-lg border border-gray-700 text-center">
                                    <p class="text-gray-500 text-xs uppercase tracking-widest">Realm</p>
                                    <p class="text-lg font-medium text-amber-400 mt-2 truncate">{authState.userData.realm || 'None'}</p>
                                </div>
                            </div>

                            <div class="bg-gray-800/20 rounded-lg p-6 border border-gray-700">
                                <div class="flex items-center gap-4 mb-4">
                                     {#if authState.userData.picture?.data?.url}
                                        <img src={authState.userData.picture.data.url} alt="Profile" class="w-16 h-16 rounded-full border-2 border-gray-600" />
                                    {/if}
                                    <div>
                                        <h3 class="text-xl font-medium text-white">{authState.userData.name}</h3>
                                        <p class="text-gray-400 text-sm">{authState.userData.email || 'No email access'}</p>
                                        <p class="text-gray-600 text-xs font-mono mt-1">ID: {authState.userData.id}</p>
                                    </div>
                                </div>
                            </div>
                        
                        <!-- Runes & Milestones Tab -->
                        {:else if activeTab === 'runes'}
                            <div class="space-y-6">
                                <!-- Rune Points Summary -->
                                <div class="bg-gradient-to-r from-amber-900/20 to-orange-900/20 rounded-xl p-6 border border-amber-500/30">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-4">
                                            <span class="text-4xl text-amber-400">ᚱ</span>
                                            <div>
                                                <p class="text-amber-300/70 text-sm uppercase tracking-wider">Rune Points</p>
                                                <p class="text-3xl font-bold text-amber-400">{runePoints}</p>
                                            </div>
                                        </div>
                                        <a href="/shop" class="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium border border-amber-500/30 hover:border-amber-400 transition-all">
                                            Visit Shop →
                                        </a>
                                    </div>
                                </div>

                                <!-- Equipped Tree -->
                                <div class="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
                                    <h4 class="text-sm text-gray-400 uppercase tracking-wider mb-3">Equipped Tree</h4>
                                    {#if getTreeByModel(equippedTree)}
                                        {@const tree = getTreeByModel(equippedTree)}
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                                <span class="text-xl text-emerald-400">{tree?.rune}</span>
                                            </div>
                                            <div>
                                                <p class="text-white font-medium">{tree?.name}</p>
                                                <p class="text-gray-500 text-xs">{tree?.tier}</p>
                                            </div>
                                        </div>
                                    {:else}
                                        <p class="text-gray-500">No tree equipped</p>
                                    {/if}
                                </div>

                                <!-- Purchased Trees -->
                                <div class="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
                                    <h4 class="text-sm text-gray-400 uppercase tracking-wider mb-3">Owned Trees ({purchasedTrees.length})</h4>
                                    <div class="grid grid-cols-2 gap-2">
                                        {#each purchasedTrees as treeModel}
                                            {@const tree = getTreeByModel(treeModel)}
                                            {#if tree}
                                                <div class="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg border {equippedTree === treeModel ? 'border-green-500/50' : 'border-gray-700'}">
                                                    <span class="text-lg">{tree.rune}</span>
                                                    <span class="text-sm text-gray-300 truncate">{tree.name}</span>
                                                    {#if equippedTree === treeModel}
                                                        <span class="ml-auto text-xs text-green-400">✓</span>
                                                    {/if}
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                </div>

                                <!-- Milestones Progress -->
                                <div class="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
                                    <h4 class="text-sm text-gray-400 uppercase tracking-wider mb-3">Milestone Progress</h4>
                                    <div class="space-y-3">
                                        {#each milestones as mp}
                                            <div class="flex items-center gap-3">
                                                <span class="text-lg {mp.isClaimed ? 'opacity-50' : mp.isComplete ? 'text-green-400' : 'text-gray-500'}">{mp.milestone.rune}</span>
                                                <div class="flex-1">
                                                    <div class="flex items-center justify-between mb-1">
                                                        <span class="text-xs {mp.isClaimed ? 'text-gray-600' : 'text-gray-400'}">{mp.milestone.label}</span>
                                                        <span class="text-xs {mp.isClaimed ? 'text-gray-600' : mp.isComplete ? 'text-green-400' : 'text-gray-500'}">
                                                            {mp.isClaimed ? '✓ Claimed' : mp.isComplete ? 'Ready!' : `${Math.round(mp.progress)}%`}
                                                        </span>
                                                    </div>
                                                    <div class="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                        <div 
                                                            class="h-full transition-all {mp.isClaimed ? 'bg-gray-600' : mp.isComplete ? 'bg-green-500' : 'bg-amber-500/50'}"
                                                            style="width: {mp.progress}%"
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            </div>

                        <!-- Posts Tab -->
                        {:else if activeTab === 'posts'}
                            <h3 class="text-lg font-medium text-white mb-4">Recent Posts</h3>
                            <div class="space-y-4">
                                {#each (authState.userData.additional_data?.posts?.data || []) as post}
                                    <div class="bg-gray-800/30 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                                        {#if post.message}
                                            <p class="text-gray-200 text-sm mb-2">{post.message}</p>
                                        {:else if post.story}
                                            <p class="text-gray-400 text-sm italic mb-2">{post.story}</p>
                                        {:else}
                                            <p class="text-gray-500 text-sm italic mb-2">No content</p>
                                        {/if}
                                        <div class="flex justify-between items-center text-xs text-gray-500">
                                            <span>{new Date(post.created_time).toLocaleDateString()}</span>
                                            <span class="font-mono">{post.id}</span>
                                        </div>
                                    </div>
                                {:else}
                                    <p class="text-gray-500 italic">No posts found or permission denied.</p>
                                {/each}
                            </div>

                        <!-- Photos Tab -->
                        {:else if activeTab === 'photos'}
                            <h3 class="text-lg font-medium text-white mb-4">Recent Photos</h3>
                            <div class="grid grid-cols-3 gap-2">
                                {#each (authState.userData.additional_data?.photos?.data || []) as photo}
                                    <a href={photo.picture} target="_blank" rel="noopener noreferrer" class="block aspect-square bg-gray-800 overflow-hidden rounded relative group">
                                        <img src={photo.picture} alt="FB Photo" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span class="text-xs text-white">View</span>
                                        </div>
                                    </a>
                                {:else}
                                    <p class="text-gray-500 italic col-span-3">No photos found.</p>
                                {/each}
                            </div>
                        
                        <!-- Friends Tab -->
                        {:else if activeTab === 'friends'}
                            <h3 class="text-lg font-medium text-white mb-4">Friends</h3>
                            <div class="bg-gray-800/20 p-4 rounded-lg">
                                <p class="text-gray-300">Total Count: <span class="font-bold text-white">{authState.userData.additional_data?.friends?.summary?.total_count || 'Unknown'}</span></p>
                                <p class="text-xs text-gray-500 mt-2">Note: Facebook API only returns friends who also use this app.</p>
                            </div>
                            <div class="mt-4 grid grid-cols-2 gap-3">
                                 {#each (authState.userData.additional_data?.friends?.data || []) as friend}
                                    <div class="p-3 bg-gray-800/40 rounded border border-gray-700 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-200">
                                            {friend.name.charAt(0)}
                                        </div>
                                        <span class="text-sm text-gray-200">{friend.name}</span>
                                    </div>
                                 {/each}
                            </div>

                        <!-- JSON Tab -->
                        {:else if activeTab === 'json'}
                            <div class="relative">
                                <button 
                                    class="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-xs rounded text-gray-300 hover:bg-gray-600"
                                    on:click={() => { navigator.clipboard.writeText(stringifiedData); alert('Copied!'); }}
                                >
                                    Copy
                                </button>
                                <pre class="p-4 bg-gray-950 rounded-lg text-xs font-mono text-green-400 overflow-auto max-h-[60vh] border border-gray-800">{stringifiedData}</pre>
                            </div>
                        
                        <!-- Danger Zone Tab -->
                        {:else if activeTab === 'danger'}
                            <div class="space-y-6">
                                <div class="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
                                    <h3 class="text-lg font-medium text-red-400 mb-2">⚠️ Danger Zone</h3>
                                    <p class="text-gray-400 text-sm">These actions are irreversible. Please proceed with caution.</p>
                                </div>
                                
                                <!-- Ragnarök Rebirth -->
                                <div class="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 rounded-xl p-6 border border-purple-500/30">
                                    <div class="flex items-start gap-4">
                                        <div class="w-14 h-14 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                            <span class="text-2xl">🔥</span>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="text-lg font-bold text-purple-300">🌟 Ragnarök Rebirth 🌿</h4>
                                            <p class="text-gray-400 text-sm mt-1 mb-4">
                                                <span class="text-purple-300 font-semibold">"From the ashes of Yggdrasil, a new seed shall grow..."</span><br/>
                                                Press the cosmic reset button! 🚀 Your tree returns to its sprouting origins, 
                                                but your wisdom (and Facebook data) remains eternal. Like a phoenix, but woodier. 🦅🌳<br/>
                                                <span class="text-xs text-gray-500 italic mt-2 block">
                                                    ⚠️ Warning: Side effects may include sudden urges to water yourself and an inexplicable fondness for photosynthesis.
                                                </span>
                                            </p>
                                            <button 
                                                on:click={() => showRebirthConfirm = true}
                                                class="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-lg text-sm font-medium border border-purple-500/30 hover:border-purple-400 transition-all"
                                            >
                                                🌱 Embrace the Cycle of Rebirth
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Terminate -->
                                <div class="bg-gradient-to-r from-red-900/20 to-rose-900/20 rounded-xl p-6 border border-red-500/30">
                                    <div class="flex items-start gap-4">
                                        <div class="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                                            <span class="text-2xl">💀</span>
                                        </div>
                                        <div class="flex-1">
                                            <h4 class="text-lg font-bold text-red-400">☠️ Terminate Account</h4>
                                            <p class="text-gray-400 text-sm mt-1 mb-4">
                                                <span class="text-red-400 font-bold">PERMANENT DELETION.</span> This action will completely erase your existence from Yggdrasil. 
                                                All your data—profile, tree, rune points, goals, journal entries, and garden history—will be <span class="text-red-400 font-semibold">permanently deleted</span> from our database. 
                                                You will be logged out immediately. There is no undo. No phoenix moment. Just... gone. 🌫️
                                            </p>
                                            <button 
                                                on:click={() => showTerminateConfirm = true}
                                                class="px-4 py-2 bg-red-600/30 hover:bg-red-600/50 text-red-400 rounded-lg text-sm font-medium border border-red-500/30 hover:border-red-400 transition-all"
                                            >
                                                ☠️ Delete Everything Forever
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
            
            <!-- Mobile Tabs (Bottom) -->
            <div class="md:hidden border-t border-gray-800 p-2 flex overflow-x-auto gap-2 bg-gray-900">
                 {#each ['overview', 'runes', 'posts', 'photos', 'friends', 'json'] as tab}
                        <button 
                            on:click={() => activeTab = tab}
                            class={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === tab ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-400 bg-gray-800'}`}
                        >
                            {tab === 'runes' ? '🔮' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    {/each}
                    <button 
                        on:click={() => activeTab = 'danger'}
                        class={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === 'danger' ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-red-400/60 bg-red-900/20'}`}
                    >
                        ⚠️
                    </button>
            </div>
        </div>
    </div>
{/if}

<!-- Ragnarök Rebirth Confirmation Modal -->
{#if showRebirthConfirm}
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
        <button 
            class="absolute inset-0 bg-black/90 cursor-default" 
            on:click={() => showRebirthConfirm = false}
            aria-label="Close confirmation"
        ></button>
        
        <div class="relative bg-gray-900 border border-purple-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl" transition:fly={{ y: 20, duration: 200 }}>
            <div class="text-center mb-6">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <span class="text-4xl">🌱</span>
                </div>
                <h3 class="text-xl font-bold text-purple-300 mb-2">🌀 The Cycle Begins Anew 🌀</h3>
                <p class="text-gray-400 text-sm mb-2">
                    <span class="text-purple-300 font-semibold italic">"As Yggdrasil falls, so shall it rise again..."</span>
                </p>
                <p class="text-gray-400 text-sm">
                    You're about to experience a full cosmic reboot! 🚀 Your tree will become a tiny sprout, 
                    ready to grow anew with all the wisdom you've gained (but none of the data).
                </p>
                <ul class="text-left text-gray-500 text-sm mt-3 space-y-1 bg-purple-900/20 p-3 rounded-lg border border-purple-500/20">
                    <li>🌳 Tree resets to <span class="text-purple-300">sprouting-life.glb</span></li>
                    <li>✨ Facebook connection stays (you're not getting rid of us that easily)</li>
                    <li>🎮 You get to experience onboarding again (lucky you!)</li>
                    <li>💫 Fresh start = Fresh vibes = Fresh possibilities</li>
                </ul>
                <p class="text-xs text-gray-500 italic mt-3">
                    🧘 Pro tip: This is basically the "New Game+" of trees. All the fun, none of the clutter.
                </p>
            </div>
            
            <div class="flex gap-3">
                <button 
                    on:click={() => showRebirthConfirm = false}
                    class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
                    disabled={isProcessing}
                >
                    🚫 Maybe Later
                </button>
                <button 
                    on:click={handleRagnarokRebirth}
                    class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                >
                    {isProcessing ? '🌀 Initiating...' : '🌱 Yes, Reborn Me!'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Terminate Confirmation Modal -->
{#if showTerminateConfirm}
    <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" transition:fade={{ duration: 150 }}>
        <button 
            class="absolute inset-0 bg-black/90 cursor-default" 
            on:click={() => showTerminateConfirm = false}
            aria-label="Close confirmation"
        ></button>
        
        <div class="relative bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl" transition:fly={{ y: 20, duration: 200 }}>
            <div class="text-center mb-6">
                <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <span class="text-4xl">�</span>
                </div>
                <h3 class="text-xl font-bold text-red-400 mb-2">⚠️ FINAL WARNING ⚠️</h3>
                <p class="text-gray-400 text-sm mb-2">
                    This action is <span class="text-red-400 font-black uppercase">permanent and irreversible</span>.
                </p>
                <p class="text-gray-300 text-sm font-semibold mb-3">
                    Every trace of your Yggdrasil journey will be erased:
                </p>
                <ul class="text-left text-gray-400 text-sm space-y-2 bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">Profile deleted</span> from database</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">All tree data</span> permanently removed</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">Rune points</span> erased forever</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">Journal entries</span> wiped clean</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">Garden history</span> completely deleted</span>
                    </li>
                    <li class="flex items-start gap-2">
                        <span class="text-red-400 font-bold">✗</span>
                        <span><span class="text-red-300 font-semibold">Logged out</span> immediately</span>
                    </li>
                </ul>
                <p class="text-red-400 text-xs font-bold mt-3 uppercase tracking-wider">
                    No backups. No recovery. No going back.
                </p>
            </div>
            
            <div class="flex gap-3">
                <button 
                    on:click={() => showTerminateConfirm = false}
                    class="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors"
                    disabled={isProcessing}
                >
                    ← Go Back
                </button>
                <button 
                    on:click={handleTerminate}
                    class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    disabled={isProcessing}
                >
                    {isProcessing ? '💣 Deleting...' : '☠️ Delete Forever'}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }
    ::-webkit-scrollbar-track {
        background: rgba(30, 41, 59, 0.5);
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(71, 85, 105, 0.8);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(100, 116, 139, 1);
    }
</style>
