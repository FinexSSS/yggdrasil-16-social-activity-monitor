<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { supabase } from '$lib/supabaseClient';
    import { facebookAuth, type AuthState } from '$lib/services/facebook';
    import { SHOP_TREES, getTierInfo, type TreeItem } from '$lib/data/shopTrees';
    import { SHOP_REALMS, getRealmTierInfo, realmNameToId, type RealmItem } from '$lib/data/shopRealms';
    import { fly, fade, scale } from 'svelte/transition';
    import TreeScene from '../../components/TreeScene.svelte';

    let authState: AuthState = {
        user: null,
        userData: null,
        isLoading: true,
        error: null
    };

    let runePoints = 0;
    let purchasedTrees: string[] = [];
    let purchasedRealms: string[] = [];
    let assignedRealm: string | null = null;
    let equippedTree: string = '';
    let loading = true;
    let notification: { message: string; type: 'success' | 'error' } | null = null;
    
    // Shop Tab State - horizontal swipe between shops
    type ShopTab = 'trees' | 'realms';
    let activeShopTab: ShopTab = 'trees';
    let swipeStartX = 0;
    let swipeThreshold = 50;
    
    // Tree Preview State
    let previewTree: TreeItem | null = null;
    
    // Realm Preview State
    let previewRealm: RealmItem | null = null;
    
    function openTreePreview(tree: TreeItem) {
        previewTree = tree;
    }
    
    function closeTreePreview() {
        previewTree = null;
    }
    
    function openRealmPreview(realm: RealmItem) {
        previewRealm = realm;
    }
    
    function closeRealmPreview() {
        previewRealm = null;
    }

    // Swipe handlers for tab switching
    function handleTouchStart(e: TouchEvent) {
        swipeStartX = e.touches[0].clientX;
    }
    
    function handleTouchEnd(e: TouchEvent) {
        const swipeEndX = e.changedTouches[0].clientX;
        const diff = swipeStartX - swipeEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0 && activeShopTab === 'trees') {
                activeShopTab = 'realms';
            } else if (diff < 0 && activeShopTab === 'realms') {
                activeShopTab = 'trees';
            }
        }
    }

    async function updateHistory(newRunes?: number, newModel?: string) {
        if (!authState.userData?.id) return;
        
        const today = new Date().toISOString().split('T')[0];
        const updates: any = {
            user_id: authState.userData.id,
            snapshot_date: today,
            facebook_data: authState.userData
        };
        
        if (newRunes !== undefined) updates.rune_points = newRunes;
        else updates.rune_points = runePoints;
        
        if (newModel !== undefined) updates.assigned_model = newModel;
        else updates.assigned_model = equippedTree;
        
        try {
             const { error } = await supabase
                .from('garden_history')
                .upsert(updates, { onConflict: 'user_id, snapshot_date' });
                
             if (error) console.error('Error updating history:', error);
        } catch (e) {
            console.error('Error in updateHistory:', e);
        }
    }

    onMount(() => {
        const unsubscribe = facebookAuth.subscribe(async (state) => {
            authState = state;
            
            if (!state.isLoading && !state.user) {
                goto('/');
                return;
            }

            if (state.userData?.id) {
                await loadUserData(state.userData.id);
            }
        });

        return () => unsubscribe();
    });

    async function loadUserData(userId: string) {
        loading = true;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('rune_points, purchased_trees, purchased_realms, assigned_model, realm')
                .eq('id', userId)
                .single();

            if (error) throw error;

            runePoints = data.rune_points || 0;
            purchasedTrees = data.purchased_trees || ['tree/1-young-oak-seedling.glb'];
            purchasedRealms = data.purchased_realms || [];
            equippedTree = data.assigned_model || 'tree/1-young-oak-seedling.glb';
            assignedRealm = data.realm || null;
        } catch (e) {
            console.error('Error loading user data:', e);
        } finally {
            loading = false;
        }
    }

    function showNotification(message: string, type: 'success' | 'error') {
        notification = { message, type };
        setTimeout(() => notification = null, 3000);
    }

    async function purchaseTree(tree: TreeItem) {
        if (!authState.userData?.id) return;

        if (purchasedTrees.includes(tree.model)) {
            showNotification('You already own this tree!', 'error');
            return;
        }

        if (runePoints < tree.price) {
            showNotification('Not enough rune points!', 'error');
            return;
        }

        try {
            const newRunes = runePoints - tree.price;
            const newPurchased = [...purchasedTrees, tree.model];

            const { error } = await supabase
                .from('profiles')
                .update({
                    rune_points: newRunes,
                    purchased_trees: newPurchased,
                    updated_at: new Date().toISOString()
                })
                .eq('id', authState.userData.id);

            if (error) throw error;

            runePoints = newRunes;
            purchasedTrees = newPurchased;
            showNotification(`${tree.name} claimed!`, 'success');
            updateHistory(newRunes, undefined);
        } catch (e) {
            console.error('Error purchasing tree:', e);
            showNotification('Failed to purchase tree', 'error');
        }
    }

    async function equipTree(tree: TreeItem) {
        if (!authState.userData?.id) return;

        if (!purchasedTrees.includes(tree.model)) {
            showNotification('You need to purchase this tree first!', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    assigned_model: tree.model,
                    updated_at: new Date().toISOString()
                })
                .eq('id', authState.userData.id);

            if (error) throw error;

            equippedTree = tree.model;
            showNotification(`${tree.name} equipped!`, 'success');
            updateHistory(undefined, tree.model);
        } catch (e) {
            console.error('Error equipping tree:', e);
            showNotification('Failed to equip tree', 'error');
        }
    }

    async function purchaseRealm(realm: RealmItem) {
        if (!authState.userData?.id) return;

        // Check if already owned (assigned or purchased)
        const realmId = realm.id;
        const assignedId = assignedRealm ? realmNameToId(assignedRealm) : null;
        
        if (assignedId === realmId) {
            showNotification('This is your home realm!', 'error');
            return;
        }

        if (purchasedRealms.includes(realm.name)) {
            showNotification('You already own this realm!', 'error');
            return;
        }

        if (runePoints < realm.price) {
            showNotification('Not enough rune points!', 'error');
            return;
        }

        try {
            const newRunes = runePoints - realm.price;
            const newPurchasedRealms = [...purchasedRealms, realm.name];

            const { error } = await supabase
                .from('profiles')
                .update({
                    rune_points: newRunes,
                    purchased_realms: newPurchasedRealms,
                    updated_at: new Date().toISOString()
                })
                .eq('id', authState.userData.id);

            if (error) throw error;

            runePoints = newRunes;
            purchasedRealms = newPurchasedRealms;
            showNotification(`${realm.name} unlocked! The realm is now visible in your garden.`, 'success');
            updateHistory(newRunes, undefined);
        } catch (e) {
            console.error('Error purchasing realm:', e);
            showNotification('Failed to unlock realm', 'error');
        }
    }

    function getTreeButtonState(tree: TreeItem, currentEquipped: string, currentPurchased: string[], currentRunes: number): 'equipped' | 'equip' | 'purchase' | 'locked' {
        if (currentEquipped === tree.model) return 'equipped';
        if (currentPurchased.includes(tree.model)) return 'equip';
        if (currentRunes >= tree.price) return 'purchase';
        return 'locked';
    }

    function getRealmButtonState(realm: RealmItem, assigned: string | null, purchased: string[], currentRunes: number): 'owned' | 'purchase' | 'locked' {
        const realmId = realm.id;
        const assignedId = assigned ? realmNameToId(assigned) : null;
        
        if (assignedId === realmId) return 'owned';
        if (purchased.includes(realm.name)) return 'owned';
        if (currentRunes >= realm.price) return 'purchase';
        return 'locked';
    }

    // Get all realms to display in shop (assigned realm will show as owned)
    $: availableRealms = SHOP_REALMS;
</script>

<svelte:head>
    <title>{activeShopTab === 'trees' ? 'Tree Shop' : 'Realm Shop'} | Yggdrasil</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white">
    <!-- Notification -->
    {#if notification}
        <div 
            class="fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg backdrop-blur-md border {notification.type === 'success' ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-red-500/20 border-red-500/50 text-red-200'}"
            transition:fly={{ y: -20, duration: 300 }}
        >
            {notification.message}
        </div>
    {/if}

    <!-- Header -->
    <header class="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-40">
        <div class="container mx-auto px-6 py-4">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                    <a href="/garden" class="text-gray-400 hover:text-white transition-colors" aria-label="Back to garden">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </a>
                    <div>
                        <h1 class="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                            Yggdrasil Shop
                        </h1>
                        <p class="text-sm text-gray-400">Unlock new trees and realms</p>
                    </div>
                </div>
                
                <!-- Rune Points Display -->
                <div class="flex items-center gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-full">
                    <span class="text-2xl text-amber-400">ᚱ</span>
                    <div>
                        <p class="text-xs text-amber-300/70 uppercase tracking-wider">Rune Points</p>
                        <p class="text-xl font-bold text-amber-400">{runePoints}</p>
                    </div>
                </div>
            </div>
            
            <!-- Tab Navigation -->
            <div class="flex gap-2">
                <button
                    on:click={() => activeShopTab = 'trees'}
                    class="flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2
                           {activeShopTab === 'trees' 
                               ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/20' 
                               : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'}"
                >
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L4 8l8 6V9l8 5-8-12v5l-8-5z"/>
                        <path d="M12 22V10M8 22h8" stroke="currentColor" stroke-width="2" fill="none"/>
                    </svg>
                    Trees
                </button>
                <button
                    on:click={() => activeShopTab = 'realms'}
                    class="flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2
                           {activeShopTab === 'realms' 
                               ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20' 
                               : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-200'}"
                >
                    <span class="text-lg">🌌</span>
                    Realms
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content with Swipe -->
    <main 
        class="container mx-auto px-6 py-8 overflow-hidden"
        on:touchstart={handleTouchStart}
        on:touchend={handleTouchEnd}
    >
        {#if loading}
            <div class="flex items-center justify-center py-20">
                <div class="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        {:else}
            <!-- Shop Content Container -->
            <div class="relative">
                <!-- Trees Shop -->
                {#if activeShopTab === 'trees'}
                    <div transition:fly={{ x: -300, duration: 300 }}>
                        <!-- Trees Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {#each SHOP_TREES.filter(tree => !tree.hidden || purchasedTrees.includes(tree.model)) as tree, index}
                                {@const tierInfo = getTierInfo(tree.tier)}
                                {@const buttonState = getTreeButtonState(tree, equippedTree, purchasedTrees, runePoints)}
                                
                                <div  
                                    class="group relative bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden hover:border-{tree.previewColor}-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-{tree.previewColor}-500/10"
                                    transition:fly={{ y: 20, duration: 300, delay: index * 50 }}
                                >
                                    <!-- Tree Preview Area -->
                                    <div class="relative h-48 bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center overflow-hidden">
                                        <span class="absolute text-[150px] text-gray-700/20 font-bold select-none">{tree.rune}</span>
                                        
                                        <div class="relative z-10 w-24 h-24 rounded-full bg-{tree.previewColor}-500/20 border-2 border-{tree.previewColor}-500/40 flex items-center justify-center">
                                            <svg class="w-12 h-12 text-{tree.previewColor}-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2L4 8l8 6V9l8 5-8-12v5l-8-5z"/>
                                                <path d="M12 22V10M8 22h8" stroke="currentColor" stroke-width="2" fill="none"/>
                                            </svg>
                                        </div>

                                        <div class="absolute top-3 left-3 {tierInfo.bgColor} {tierInfo.color} px-3 py-1 rounded-full text-xs font-medium">
                                            {tierInfo.label}
                                        </div>

                                        {#if buttonState === 'equipped'}
                                            <div class="absolute top-3 right-3 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/30">
                                                ✓ Equipped
                                            </div>
                                        {/if}
                                    </div>

                                    <!-- Tree Info -->
                                    <div class="p-5">
                                        <div class="flex items-center justify-between mb-2">
                                            <button 
                                                on:click={() => openTreePreview(tree)}
                                                class="text-lg font-semibold text-white hover:text-amber-400 transition-colors cursor-pointer text-left underline-offset-2 hover:underline"
                                                title="Click to preview tree"
                                            >
                                                {tree.name}
                                            </button>
                                            <span class="text-2xl opacity-50">{tree.rune}</span>
                                        </div>
                                        
                                        <p class="text-sm text-gray-400 mb-4 line-clamp-2">{tree.description}</p>

                                        <div class="flex items-center justify-between">
                                            {#if tree.id === 'sprouting-life'}
                                                <div class="flex items-center gap-1">
                                                    <span class="text-rose-400">ᚱ</span>
                                                    <span class="text-rose-400 text-xl font-bold">∞</span>
                                                </div>
                                            {:else if tree.price === 0}
                                                <span class="text-green-400 text-sm font-medium">Free</span>
                                            {:else}
                                                <div class="flex items-center gap-1">
                                                    <span class="text-amber-400">ᚱ</span>
                                                    <span class="text-amber-300 font-bold">{tree.price}</span>
                                                </div>
                                            {/if}

                                            {#if buttonState === 'equipped'}
                                                <button disabled class="w-24 h-10 flex items-center justify-center bg-green-500/20 text-green-400 rounded-lg text-sm font-medium border border-green-500/30 cursor-default">
                                                    Equipped
                                                </button>
                                            {:else if buttonState === 'equip'}
                                                <button on:click={() => equipTree(tree)} class="w-24 h-10 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium border border-blue-500/30 hover:border-blue-400 transition-all">
                                                    Equip
                                                </button>
                                            {:else if buttonState === 'purchase'}
                                                <button on:click={() => purchaseTree(tree)} class="w-24 h-10 flex items-center justify-center bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium border border-amber-500/30 hover:border-amber-400 transition-all">
                                                    Purchase
                                                </button>
                                            {:else}
                                                <button disabled class="w-24 h-10 flex items-center justify-center bg-gray-700/50 text-gray-500 rounded-lg text-sm font-medium border border-gray-600 cursor-not-allowed">
                                                    🔒 Locked
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Tree Info Section -->
                        <div class="mt-12 p-6 bg-gray-800/30 rounded-xl border border-gray-700">
                            <h3 class="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                <span class="text-2xl">ᚱ</span>
                                How to earn Rune Points
                            </h3>
                            <p class="text-gray-400 text-sm leading-relaxed">
                                Complete achievement milestones to earn Rune Points! Reach friend and post milestones 
                                (50, 100, 200, 500, 1000, 2000, 5000) to claim rewards. Visit your garden to view and claim available milestones.
                            </p>
                        </div>
                    </div>
                {/if}

                <!-- Realms Shop -->
                {#if activeShopTab === 'realms'}
                    <div transition:fly={{ x: 300, duration: 300 }}>
                        <!-- Current Realm Banner -->
                        {#if assignedRealm}
                            <div class="mb-8 p-4 bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-violet-900/30 rounded-xl border border-purple-500/30">
                                <div class="flex items-center gap-4">
                                    <span class="text-4xl">🏠</span>
                                    <div>
                                        <p class="text-sm text-purple-300/70 uppercase tracking-wider">Your Home Realm</p>
                                        <p class="text-xl font-bold text-purple-200">{assignedRealm}</p>
                                        <p class="text-sm text-gray-400 mt-1">Assigned during your spiritual journey. Always visible in your garden.</p>
                                    </div>
                                </div>
                            </div>
                        {/if}

                        <!-- Purchased Realms -->
                        {#if purchasedRealms.length > 0}
                            <div class="mb-8">
                                <h3 class="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                                    <span>✨</span> Unlocked Realms
                                </h3>
                                <div class="flex flex-wrap gap-3">
                                    {#each purchasedRealms as realmName}
                                        {@const realm = SHOP_REALMS.find(r => r.name === realmName)}
                                        {#if realm}
                                            <div class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r {realm.bgGradient} rounded-full border border-white/20">
                                                <span>{realm.icon}</span>
                                                <span class="text-white font-medium">{realm.name}</span>
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <!-- Realms Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {#each availableRealms as realm, index}
                                {@const tierInfo = getRealmTierInfo(realm.tier)}
                                {@const buttonState = getRealmButtonState(realm, assignedRealm, purchasedRealms, runePoints)}
                                
                                <div  
                                    class="group relative bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg"
                                    class:opacity-75={buttonState === 'owned'}
                                    style="--realm-color: {realm.color};"
                                    transition:fly={{ y: 20, duration: 300, delay: index * 50 }}
                                >
                                    <!-- Realm Preview Area -->
                                    <div class="relative h-48 bg-gradient-to-br {realm.bgGradient} flex items-center justify-center overflow-hidden">
                                        <!-- Decorative Rune Background -->
                                        <span class="absolute text-[80px] text-white/10 font-bold select-none leading-none">{realm.rune}</span>
                                        
                                        <!-- Realm Icon -->
                                        <div class="relative z-10 w-24 h-24 rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
                                            <span class="text-5xl">{realm.icon}</span>
                                        </div>

                                        <!-- Tier Badge -->
                                        <div class="absolute top-3 left-3 {tierInfo.bgColor} {tierInfo.color} px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                                            {tierInfo.label}
                                        </div>

                                        <!-- Owned Badge -->
                                        {#if buttonState === 'owned'}
                                            <div class="absolute top-3 right-3 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-medium border border-green-500/30 backdrop-blur-sm">
                                                ✓ Unlocked
                                            </div>
                                        {/if}
                                        
                                        <!-- Animated glow effect on hover -->
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                    </div>

                                    <!-- Realm Info -->
                                    <div class="p-5">
                                        <div class="flex items-center justify-between mb-2">
                                            <button 
                                                on:click={() => openRealmPreview(realm)}
                                                class="text-lg font-semibold text-white hover:text-purple-300 transition-colors cursor-pointer text-left underline-offset-2 hover:underline"
                                                title="Click to learn more"
                                            >
                                                {realm.name}
                                            </button>
                                            <span class="text-xl opacity-50">{realm.icon}</span>
                                        </div>
                                        
                                        <p class="text-sm text-gray-400 mb-4 line-clamp-2">{realm.description}</p>

                                        <!-- Price & Action -->
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-1">
                                                <span class="text-amber-400">ᚱ</span>
                                                <span class="text-amber-300 font-bold">{realm.price}</span>
                                            </div>

                                            {#if buttonState === 'owned'}
                                                <button disabled class="w-24 h-10 flex items-center justify-center bg-green-500/20 text-green-400 rounded-lg text-sm font-medium border border-green-500/30 cursor-default">
                                                    Owned
                                                </button>
                                            {:else if buttonState === 'purchase'}
                                                <button 
                                                    on:click={() => purchaseRealm(realm)} 
                                                    class="w-24 h-10 flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium border border-purple-500/30 hover:border-purple-400 transition-all"
                                                >
                                                    Unlock
                                                </button>
                                            {:else}
                                                <button disabled class="w-24 h-10 flex items-center justify-center bg-gray-700/50 text-gray-500 rounded-lg text-sm font-medium border border-gray-600 cursor-not-allowed">
                                                    🔒 Locked
                                                </button>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Realm Info Section -->
                        <div class="mt-12 p-6 bg-gray-800/30 rounded-xl border border-gray-700">
                            <h3 class="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                <span class="text-2xl">🌌</span>
                                About Realms
                            </h3>
                            <p class="text-gray-400 text-sm leading-relaxed">
                                The Nine Realms of Yggdrasil each offer unique visual effects and atmospheres. Your assigned realm is always visible, but you can unlock additional realms to explore their mystical environments. 
                                Purchased realms appear on your World Tree in the garden.
                            </p>
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Back to Garden -->
            <div class="mt-8 mb-8 flex justify-center">
                <a 
                    href="/garden" 
                    class="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition text-white inline-flex items-center gap-2"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Garden
                </a>
            </div>
        {/if}
    </main>

    <!-- Tree Preview Modal -->
    {#if previewTree}
        {@const tierInfo = getTierInfo(previewTree.tier)}
        <div 
            class="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center"
            style="backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"
            transition:fade={{ duration: 200 }}
        >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="absolute inset-0" on:click={closeTreePreview}></div>
            
            <div 
                class="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col"
                transition:scale={{ duration: 300, start: 0.9 }}
            >
                <div class="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                    <div class="flex items-center gap-4 bg-black/60 backdrop-blur-md rounded-2xl px-6 py-3 border border-gray-700">
                        <span class="text-4xl">{previewTree.rune}</span>
                        <div>
                            <h2 class="text-2xl font-bold text-white">{previewTree.name}</h2>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="{tierInfo.bgColor} {tierInfo.color} px-2 py-0.5 rounded text-xs font-medium">
                                    {tierInfo.label}
                                </span>
                                <span class="text-gray-400 text-sm">{previewTree.description}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button
                        on:click={closeTreePreview}
                        class="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md hover:bg-white/10 border border-gray-700 flex items-center justify-center transition-colors text-white/60 hover:text-white"
                        aria-label="Close preview"
                    >
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="w-full h-full tree-preview-container tree-glow">
                    <TreeScene 
                        modelName={previewTree.model}
                        treeScale={previewTree.scale}
                        socialDensity={0.5}
                        productiveDensity={0.5}
                        goalProgress={0}
                        currentValue={0}
                        targetValue={0}
                        goalType={null}
                        showRealmMarkers={false}
                        hideGoalLeaves={true}
                        hideOverlays={true}
                        hideUpsideDownButton={true}
                    />
                </div>
            </div>
        </div>
    {/if}

    <!-- Realm Preview Modal -->
    {#if previewRealm}
        {@const tierInfo = getRealmTierInfo(previewRealm.tier)}
        {@const buttonState = getRealmButtonState(previewRealm, assignedRealm, purchasedRealms, runePoints)}
        <div 
            class="fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4"
            style="backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);"
            transition:fade={{ duration: 200 }}
        >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="absolute inset-0" on:click={closeRealmPreview}></div>
            
            <div 
                class="relative w-full max-w-lg bg-gradient-to-br {previewRealm.bgGradient} rounded-3xl border border-white/20 overflow-hidden"
                transition:scale={{ duration: 300, start: 0.9 }}
            >
                <!-- Decorative Background -->
                <div class="absolute inset-0 opacity-20">
                    <span class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] text-white/20 font-bold select-none">{previewRealm.rune}</span>
                </div>

                <!-- Close Button -->
                <button
                    on:click={closeRealmPreview}
                    class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md hover:bg-white/10 border border-white/20 flex items-center justify-center transition-colors text-white/60 hover:text-white z-20"
                    aria-label="Close preview"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <!-- Content -->
                <div class="relative z-10 p-8">
                    <!-- Icon and Title -->
                    <div class="text-center mb-6">
                        <span class="text-7xl mb-4 block">{previewRealm.icon}</span>
                        <h2 class="text-3xl font-bold text-white mb-2">{previewRealm.name}</h2>
                        <div class="flex items-center justify-center gap-2">
                            <span class="{tierInfo.bgColor} {tierInfo.color} px-3 py-1 rounded-full text-sm font-medium">
                                {tierInfo.label}
                            </span>
                        </div>
                    </div>

                    <!-- Rune -->
                    <div class="text-center mb-6">
                        <span class="text-2xl text-white/60">{previewRealm.rune}</span>
                    </div>

                    <!-- Description -->
                    <p class="text-center text-white/90 text-lg mb-4">{previewRealm.description}</p>
                    
                    <!-- Lore -->
                    <p class="text-center text-white/60 text-sm italic mb-8">"{previewRealm.lore}"</p>

                    <!-- Effect Info -->
                    <div class="bg-black/30 backdrop-blur-sm rounded-xl p-4 mb-6">
                        <p class="text-white/70 text-sm text-center">
                            <span class="text-white font-medium">Visual Effect:</span> {previewRealm.effectType.charAt(0).toUpperCase() + previewRealm.effectType.slice(1)}
                        </p>
                    </div>

                    <!-- Price and Action -->
                    <div class="flex items-center justify-between bg-black/40 rounded-xl p-4">
                        <div class="flex items-center gap-2">
                            <span class="text-amber-400 text-2xl">ᚱ</span>
                            <span class="text-amber-300 text-2xl font-bold">{previewRealm.price}</span>
                        </div>

                        {#if buttonState === 'owned'}
                            <button disabled class="px-8 py-3 bg-green-500/20 text-green-400 rounded-xl font-semibold border border-green-500/30 cursor-default">
                                ✓ Unlocked
                            </button>
                        {:else if buttonState === 'purchase'}
                            <button 
                                on:click={() => { purchaseRealm(previewRealm); closeRealmPreview(); }}
                                class="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/30"
                            >
                                Unlock Realm
                            </button>
                        {:else}
                            <button disabled class="px-8 py-3 bg-gray-700/50 text-gray-500 rounded-xl font-semibold border border-gray-600 cursor-not-allowed">
                                🔒 Need {previewRealm.price - runePoints} more
                            </button>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .tree-preview-container {
        transition: all 0.3s ease;
    }
    
    .tree-glow {
        animation: glowTree 2s ease-in-out infinite;
    }
    
    @keyframes glowTree {
        0%, 100% { filter: brightness(1) drop-shadow(0 0 15px rgba(251, 191, 36, 0.3)); }
        50% { filter: brightness(1.1) drop-shadow(0 0 35px rgba(251, 191, 36, 0.5)); }
    }
</style>
