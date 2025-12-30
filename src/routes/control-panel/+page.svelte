<script lang="ts">
    import { onMount } from 'svelte';
    import { facebookAuth, type AuthState } from '$lib/services/facebook';

    let authState: AuthState = {
        user: null,
        userData: null,
        isLoading: false,
        error: null
    };

    let timeAgo = '';

    onMount(() => {
        const unsubscribe = facebookAuth.subscribe((state) => {
            authState = state;
            updateTimeAgo();
        });

        // Update "time ago" every minute
        const interval = setInterval(updateTimeAgo, 60000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    });

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
        } else {
            timeAgo = '';
        }
    }

    async function handleRefresh() {
        await facebookAuth.refresh();
    }

    function handleDisconnect() {
        if (confirm('Are you sure you want to disconnect Facebook? This will sign you out.')) {
            facebookAuth.disconnect();
        }
    }
</script>

<div class="min-h-screen bg-black text-white p-8 font-sans">
    <div class="max-w-4xl mx-auto">
        <header class="mb-8 border-b border-gray-800 pb-4">
            <h1 class="text-3xl font-light tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500">
                Data Control Panel
            </h1>
            <p class="text-gray-400 mt-2 text-sm">Manage your connected data sources and synchronization status.</p>
        </header>

        <section>
            <h2 class="text-xl text-gray-200 mb-4 font-medium tracking-wide">Connected Sources</h2>

            <div class="grid gap-6 md:grid-cols-2">
                <!-- Facebook Source Card -->
                <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-6 backdrop-blur-sm transition-all hover:border-gray-700">
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center text-white font-bold text-xl">
                                f
                            </div>
                            <div>
                                <h3 class="font-medium text-lg">Facebook</h3>
                                <div class="flex items-center space-x-2">
                                    <span class={`w-2 h-2 rounded-full ${authState.user ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-500'}`}></span>
                                    <span class="text-xs text-gray-400 uppercase tracking-wider">
                                        {authState.user ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {#if authState.user}
                        <div class="space-y-4">
                            <div class="bg-black/40 rounded-lg p-3 border border-gray-800/50">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-gray-500">Last Synced</span>
                                    <span class="text-emerald-400 font-mono">{timeAgo || 'Never'}</span>
                                </div>
                                {#if authState.userData?.synced_at}
                                    <div class="text-[10px] text-gray-600 text-right mt-1 font-mono">
                                        {new Date(authState.userData.synced_at).toLocaleString()}
                                    </div>
                                {/if}
                            </div>

                            <div class="flex space-x-3">
                                <button 
                                    on:click={handleRefresh}
                                    disabled={authState.isLoading}
                                    class="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group relative overflow-hidden"
                                >
                                    {#if authState.isLoading}
                                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Syncing...</span>
                                    {:else}
                                        <svg class="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                        </svg>
                                        <span>Refresh Data</span>
                                    {/if}
                                </button>
                                
                                <button 
                                    on:click={handleDisconnect}
                                    class="bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    {:else}
                        <div class="mt-4 pt-4 border-t border-gray-800">
                             <p class="text-gray-500 text-sm mb-4">Connect your Facebook account to visualize your digital garden.</p>
                             <button
                                on:click={() => facebookAuth.login()}
                                class="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                             >
                                Connect Facebook
                             </button>
                        </div>
                    {/if}
                </div>

                <!-- Placeholder for future sources -->
                <div class="bg-gray-900/20 border border-gray-800/50 rounded-xl p-6 border-dashed flex flex-col items-center justify-center text-center opacity-60">
                    <div class="w-12 h-12 rounded-full bg-gray-800/50 mb-3 flex items-center justify-center">
                        <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                    <h3 class="font-medium text-gray-500">Add Source</h3>
                    <p class="text-xs text-gray-600 mt-1">More integrations coming soon</p>
                </div>
            </div>
        </section>

        {#if authState.error}
            <div class="mt-8 p-4 bg-red-900/20 border border-red-800/50 rounded-lg text-red-200 text-sm flex items-start space-x-3 animate-fade-in">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{authState.error}</span>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Subtle fade in animation */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out forwards;
    }
</style>
