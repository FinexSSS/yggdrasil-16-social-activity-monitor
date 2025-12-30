<script lang="ts">
	import { onMount } from 'svelte';
	import { facebookAuth, type AuthState } from '$lib/services/facebook';
	import { supabase } from '$lib/supabaseClient';
    import Onboarding from '../components/Onboarding.svelte';
    import GoalSelector from '../components/GoalSelector.svelte';
    import GardenHistoryModal from '../components/GardenHistoryModal.svelte';
    import { fade } from 'svelte/transition';
    import type { GoalType } from '$lib/utils/goalUtils';
    import { getGoalTypeLabel, getGoalTypeIcon } from '$lib/utils/goalUtils';

    import { goto } from '$app/navigation';
    import { page } from '$app/stores';

	let authState: AuthState = {
		user: null,
		userData: null,
		isLoading: false,
		error: null
	};

    let showOnboarding = false;
    let usernameInput = '';
    let usernameError = '';
    let isSettingUsername = false;

    let searchQuery = '';
    let searchError = '';
    let isSearching = false;

    let showHistoryModal = false;
    let historyError = '';

    let showGoalSelector = false;
    let userGoal: { goal_type: GoalType; target_value: number } | null = null;
    
    let showDataModal = false;

    import DataControlModal from '../components/DataControlModal.svelte';

    onMount(() => {
        // Check for history error from redirect
        const err = $page.url.searchParams.get('history_error');
        if (err) {
            historyError = err;
            showHistoryModal = true; // Open picker so they can try again
            // Clear param from URL without reload
            window.history.replaceState({}, '', '/');
        }

		// Initialize Facebook Auth
		facebookAuth.init();
        // ... (rest of onMount)

		// Subscribe to state changes
		const unsubscribe = facebookAuth.subscribe(async (state) => {
			authState = state;
            
            // Check if we need to show onboarding
            if (state.userData && !state.isLoading) {
                 if (!state.userData.realm) {
                     showOnboarding = true;
                 } else {
                     showOnboarding = false;
                     // Fetch user's goal
                     await fetchUserGoal(state.userData.id);
                 }
            }
		});

		return () => {
			unsubscribe();
		};
	});

	async function login() {
		facebookAuth.login();
	}

    async function handleOnboardingComplete(event: CustomEvent) {
        const { realm } = event.detail;
        if (authState.userData) {
             // Optimistically update local state to hide onboarding immediately (or after animation)
             // But let's wait for save? No, let's feel responsive.
            await facebookAuth.updateRealm(realm);
            showOnboarding = false;
        }
    }


    async function handleSetUsername() {
        if (!usernameInput.trim()) {
            usernameError = 'Username cannot be empty';
            return;
        }
        isSettingUsername = true;
        usernameError = '';
        
        const result = await facebookAuth.setUsername(usernameInput.trim());
        if (!result.success) {
            usernameError = result.error || 'Failed to set username';
        } else {
            // Success
            usernameInput = '';
        }
        isSettingUsername = false;
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        isSearching = true;
        searchError = '';

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', searchQuery.trim())
                .single();

            if (error || !data) {
                searchError = 'User not found';
            } else {
                goto(`/garden?user=${data.id}`);
            }
        } catch (e) {
            searchError = 'Error searching user';
        } finally {
            isSearching = false;
        }
    }

    async function fetchUserGoal(userId: string) {
        try {
            const { data, error } = await supabase
                .from('user_goals')
                .select('goal_type, target_value')
                .eq('user_id', userId)
                .single();

            if (!error && data) {
                userGoal = data;
            }
        } catch (e) {
            console.error('Error fetching goal:', e);
        }
    }

    function handleGoalSaved(event: CustomEvent) {
        userGoal = event.detail;
        showGoalSelector = false;
    }
</script>

{#if showOnboarding}
    <Onboarding on:complete={handleOnboardingComplete} />
{/if}

<DataControlModal isOpen={showDataModal} on:close={() => showDataModal = false} />

{#if showHistoryModal && authState.userData}
    <GardenHistoryModal
        userId={authState.userData.id}
        isOpen={showHistoryModal}
        on:close={() => showHistoryModal = false}
        on:select={(e) => {
            goto(`/garden?date=${e.detail.date}`);
        }}
    />
{/if}

{#if showGoalSelector && authState.userData}
    <GoalSelector 
        userId={authState.userData.id}
        currentGoal={userGoal}
        on:goalSaved={handleGoalSaved}
        on:close={() => showGoalSelector = false}
    />
{/if}

<div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
    <!-- Background Decor -->
    <div class="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/30 rounded-full blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"></div>
    </div>

	<div class="max-w-md w-full text-center space-y-8 z-10">
		<h1 class="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 tracking-tight pb-2 pr-1">
			Yggdrasil
		</h1>
		<p class="text-xl text-gray-300 font-light">Your Digital Life Tree</p>

		{#if authState.isLoading}
			<div class="p-4 rounded bg-gray-800/50 backdrop-blur border border-gray-700">
				<p class="animate-pulse text-green-400">Loading roots...</p>
			</div>
		{:else if authState.user}
            {#if !showOnboarding}
			<div class="bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-gray-700 space-y-6" in:fade>
				<div class="flex items-center justify-center space-x-4">
                    {#if authState.userData?.picture?.data?.url}
					    <img src={authState.userData.picture.data.url} alt="Profile" class="w-16 h-16 rounded-full border-2 border-blue-500 shadow-lg" />
                    {/if}
					<div class="text-left">
						<p class="font-bold text-lg text-white">{authState.userData?.name || 'User'}</p>
                        {#if authState.userData?.username}
                             <p class="text-blue-400 text-sm">@{authState.userData.username}</p>
                        {/if}
                        {#if authState.userData?.realm}
                            <p class="text-amber-400 font-serif text-sm">Realm of {authState.userData.realm}</p>
                        {/if}
					</div>
				</div>

                <!-- Username Prompt -->
                {#if !authState.userData?.username}
                <div class="p-4 bg-gray-700/50 rounded-lg border border-yellow-500/50">
                    <p class="text-sm text-yellow-200 mb-2">Choose a unique username to continue:</p>
                    <div class="flex space-x-2">
                        <input 
                            bind:value={usernameInput}
                            type="text" 
                            placeholder="username" 
                            class="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-1 text-sm focus:border-blue-500 outline-none"
                        />
                        <button 
                            on:click={handleSetUsername} 
                            disabled={isSettingUsername}
                            class="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold disabled:opacity-50"
                        >
                            {isSettingUsername ? '...' : 'Set'}
                        </button>
                    </div>
                    {#if usernameError}
                        <p class="text-red-400 text-xs mt-1">{usernameError}</p>
                    {/if}
                </div>
                {/if}

                <!-- Goal Display/Prompt -->
                {#if authState.userData?.username}
                <div class="p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/30">
                    {#if userGoal}
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-2xl">{getGoalTypeIcon(userGoal.goal_type)}</span>
                                <div>
                                    <p class="text-sm text-gray-300">Your Goal:</p>
                                    <p class="font-bold text-green-400">{userGoal.target_value} {getGoalTypeLabel(userGoal.goal_type)}</p>
                                </div>
                            </div>
                            <button 
                                on:click={() => showGoalSelector = true}
                                class="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition"
                            >
                                Change
                            </button>
                        </div>
                    {:else}
                        <p class="text-sm text-yellow-200 mb-2">🎯 Set your primary goal to continue:</p>
                        <button 
                            on:click={() => showGoalSelector = true}
                            class="w-full px-3 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 rounded font-bold text-sm transition"
                        >
                            Choose Your Goal
                        </button>
                    {/if}
                </div>
                {/if}

				<div class="pt-4 border-t border-gray-700 space-y-3">
                    <!-- Only show "Enter Garden" if realm, username, AND goal are set -->
                    {#if authState.userData?.realm && authState.userData?.username && userGoal}
                        <a href="/garden" class="block w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold rounded-xl hover:from-green-500 hover:to-blue-500 transition shadow-lg transform hover:scale-[1.02]">
                            Enter Your Garden
                        </a>

                        <!-- History Section -->
                         <div class="relative">
                            <button 
                                on:click={() => showHistoryModal = true}
                                class="w-full py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition border border-gray-600"
                            >
                                View Previous Gardens
                            </button>
                            
                            {#if historyError}
                                <p class="text-red-400 text-xs mt-2">{historyError}</p>
                            {/if}
                         </div>
                        
                        <!-- Search Others -->
                         <div class="mt-4 pt-4 border-t border-gray-700/50">
                            <p class="text-sm text-gray-400 mb-2 text-left">Visit another garden:</p>
                            <div class="relative group">
                                <input 
                                    bind:value={searchQuery}
                                    on:keydown={(e) => e.key === 'Enter' && handleSearch()}
                                    type="text" 
                                    placeholder="Search username..." 
                                    class="w-full bg-gray-900 border border-gray-600 rounded-lg pl-3 pr-16 py-2 text-sm focus:border-green-500 outline-none transition-colors group-hover:border-gray-500"
                                />
                                <button 
                                    on:click={handleSearch}
                                    class="absolute right-1 top-1 bottom-1 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded transition-colors"
                                >
                                    Search
                                </button>
                            </div>
                             {#if searchError}
                                <p class="text-red-400 text-xs mt-1 text-left">{searchError}</p>
                            {/if}
                        </div>



                <!-- Data Control Panel Modal Trigger -->
                <div class="mt-2 text-center">
                    <button 
                        on:click={() => showDataModal = true}
                        class="inline-flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <span>Manage Data & Sync</span>
                    </button>
                </div>

            {:else}
                 {#if !authState.userData.username}
                    <p class="text-sm text-gray-500 italic mt-2">Please set a username to enter.</p>
                 {:else}
                    <p class="text-sm text-gray-500 animate-pulse">Awaiting the roots' decision...</p>
                 {/if}
            {/if}
        </div>
    </div>
    {/if}

		{:else}
			<button
				on:click={login}
				class="w-full flex items-center justify-center px-8 py-3 bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold rounded-lg transition transform hover:scale-105 shadow-lg"
			>
				<svg class="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
					<path
						d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
					/>
				</svg>
				Continue with Facebook
			</button>
            <p class="text-sm text-gray-500 mt-4">Connect to grow your personal life tree.</p>
		{/if}
        
        {#if authState.error}
            <div class="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                Error: {authState.error}
            </div>
        {/if}
	</div>
</div>
