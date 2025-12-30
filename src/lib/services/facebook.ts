import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { PUBLIC_FACEBOOK_APP_ID } from '$env/static/public';

// Facebook App Configuration
const FACEBOOK_APP_ID = PUBLIC_FACEBOOK_APP_ID;
const REDIRECT_URI = browser ? window.location.origin : '';

// Default tree model for new users
const DEFAULT_TREE_MODEL = 'tree/1-young-oak-seedling.glb';

// ... (existing constants)

// OAuth scopes
const SCOPES = [
    'public_profile',
    'email',
    'user_birthday',
    'user_hometown',
    'user_location',
    'user_likes',
    'user_photos',
    'user_videos',
    'user_friends',
    'user_gender',
    'user_link',
    'user_age_range',
    'user_posts',
    'user_tagged_places'
].join(',');

export interface FacebookUser {
    accessToken: string;
    expiresIn: string | null;
}

export interface FacebookUserData {
    id: string;
    name: string;
    email?: string;
    realm?: string;
    synced_at?: string;
    [key: string]: any;
}

export interface AuthState {
    user: FacebookUser | null;
    userData: FacebookUserData | null;
    isLoading: boolean;
    error: string | null;
}

type Listener = (state: AuthState) => void;

class FacebookAuthService {
    private user: FacebookUser | null = null;
    private userData: FacebookUserData | null = null;
    private isLoading = false;
    private error: string | null = null;
    private listeners: Listener[] = [];

    constructor() { }

    // Subscribe to auth state changes
    subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        // educational: immediately notify with current state
        listener({
            user: this.user,
            userData: this.userData,
            isLoading: this.isLoading,
            error: this.error
        });

        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // Notify all listeners of state change
    private notify() {
        const state: AuthState = {
            user: this.user,
            userData: this.userData,
            isLoading: this.isLoading,
            error: this.error
        };
        this.listeners.forEach(listener => listener(state));
    }

    // Initialize - Check for OAuth callback or persistent session
    async init() {
        if (!browser) return;

        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const error = params.get('error');
        const errorDescription = params.get('error_description');
        const state = params.get('state');

        // Case 1: OAuth Redirect Error
        if (error) {
            this.error = `Authentication failed: ${errorDescription || error}`;
            window.history.replaceState({}, document.title, window.location.pathname);
            this.notify();
            return;
        }

        // Case 2: OAuth Redirect Success
        if (accessToken && state) {
            // Verify state to prevent CSRF
            const savedState = sessionStorage.getItem('fb_auth_state');
            if (state === savedState) {
                this.user = {
                    accessToken: accessToken,
                    expiresIn: params.get('expires_in')
                };

                // Persist session
                localStorage.setItem('fb_access_token', accessToken);
                if (params.get('expires_in')) {
                    localStorage.setItem('fb_expires_in', params.get('expires_in')!);
                }

                await this.fetchUserData(accessToken);
            } else {
                this.error = 'Invalid state parameter - possible CSRF attack';
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        // Case 3: Restore from Persistence
        else {
            const storedToken = localStorage.getItem('fb_access_token');
            if (storedToken) {
                this.user = {
                    accessToken: storedToken,
                    expiresIn: localStorage.getItem('fb_expires_in')
                };

                // Refresh data in background
                this.fetchUserData(storedToken).catch(() => {
                    // If fetch fails (token expired), logout
                    this.logout();
                });
            }
        }

        this.notify();
    }

    // Login with Facebook - Redirect to Facebook OAuth
    login() {
        if (!browser) return;

        // Generate random state for CSRF protection
        const state = Math.random().toString(36).substring(7);
        sessionStorage.setItem('fb_auth_state', state);

        // Build OAuth URL with token response type (implicit grant)
        const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
        authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
        authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
        authUrl.searchParams.set('scope', SCOPES);
        authUrl.searchParams.set('response_type', 'token');
        authUrl.searchParams.set('state', state);

        // Redirect to Facebook
        window.location.href = authUrl.toString();
    }

    // Logout
    logout() {
        if (!browser) return;
        this.user = null;
        this.userData = null;
        this.error = null;
        sessionStorage.removeItem('fb_auth_state');
        localStorage.removeItem('fb_access_token');
        localStorage.removeItem('fb_expires_in');
        localStorage.removeItem('fb_user_data');
        this.notify();
    }

    // Update Realm for existing user
    async updateRealm(realm: string) {
        if (!this.userData) return;

        try {
            console.log('Updating realm for user:', this.userData.id, realm);
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    realm: realm,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.userData.id);

            if (updateError) throw updateError;

            // Update local state
            this.userData.realm = realm;
            this.notify();
            console.log('Successfully updated realm');

        } catch (err) {
            console.error('Failed to update realm:', err);
        }
    }

    // Save user data to Supabase
    async saveToSupabase(userData: FacebookUserData) {
        try {
            console.log('Saving user data to Supabase:', userData.id);

            // 1. Check if user already exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('profiles')
                .select('id, realm, username')
                .eq('id', userData.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error('Error checking user existence:', fetchError);
                throw fetchError;
            }

            // 2. For new users, assign the default tree model
            // Tree progression is now handled via the shop/rune system, not posts count
            const assignedModel = DEFAULT_TREE_MODEL;

            if (existingUser) {
                // 3. User exists: Update data, keep their current assigned_model
                console.log('User exists, updating data...');

                // If we fetched a realm, ensure it's in our local state
                if (existingUser.realm) {
                    userData.realm = existingUser.realm;
                }
                // If we have a username, add it to local state (custom field)
                if (existingUser.username) {
                    userData.username = existingUser.username;
                }

                // Keep existing assigned_model from database (don't override user's equipped tree)
                // Fetch full profile to get assigned_model
                const { data: fullProfile } = await supabase
                    .from('profiles')
                    .select('assigned_model, rune_points, purchased_trees, milestones_claimed')
                    .eq('id', userData.id)
                    .single();

                if (fullProfile?.assigned_model) {
                    userData.assigned_model = fullProfile.assigned_model;
                    if (this.userData) this.userData.assigned_model = fullProfile.assigned_model;
                }

                // Store rune data in local state
                if (fullProfile) {
                    userData.rune_points = fullProfile.rune_points || 0;
                    userData.purchased_trees = fullProfile.purchased_trees || [DEFAULT_TREE_MODEL];
                    userData.milestones_claimed = fullProfile.milestones_claimed || {};
                }

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        facebook_data: userData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userData.id);

                if (updateError) throw updateError;
            } else {
                // 4. New User: Assign default tree
                console.log('New user, assigning default tree model:', assignedModel);

                // Update local state
                userData.assigned_model = assignedModel;
                userData.rune_points = 0;
                userData.purchased_trees = [DEFAULT_TREE_MODEL];
                userData.milestones_claimed = {};
                if (this.userData) this.userData.assigned_model = assignedModel;

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userData.id,
                        facebook_data: userData,
                        assigned_model: assignedModel,
                        rune_points: 0,
                        purchased_trees: [DEFAULT_TREE_MODEL],
                        // Realm is initially null, set by onboarding
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (insertError) throw insertError;
            }

            // Notify listeners of the update
            this.notify();

            // 4. Save to History (Daily Snapshot)
            try {
                const today = new Date().toISOString().split('T')[0];

                // Get current weather from store
                const { weatherStore, getTimeBasedWeather, getCurrentHour, getCurrentSeason } = await import('$lib/utils/weatherUtils');

                let weatherState: any = null;
                const unsubscribe = weatherStore.subscribe(state => {
                    weatherState = state;
                });
                unsubscribe();

                // Calculate auto weather based on time/season
                const autoWeather = getTimeBasedWeather(getCurrentHour(), getCurrentSeason());

                // Get manual weather if user has set it
                const manualWeather = weatherState?.isAuto ? null : weatherState?.current;

                const { error: historyError } = await supabase
                    .from('garden_history')
                    .upsert({
                        user_id: userData.id,
                        snapshot_date: today,
                        facebook_data: userData,
                        weather_auto: autoWeather,
                        weather_manual: manualWeather,
                        created_at: new Date().toISOString()
                    }, { onConflict: 'user_id, snapshot_date' });

                if (historyError) {
                    console.error('Failed to save history snapshot:', historyError);
                } else {
                    console.log('Saved history snapshot for', today, 'with auto:', autoWeather, 'manual:', manualWeather);
                }
            } catch (histErr) {
                console.error('History save exception:', histErr);
            }

            console.log('Successfully saved to Supabase');
        } catch (err) {
            console.error('Failed to save to Supabase:', err);
            // Don't block the UI flow for this in a demo, but log it
        }
    }

    // Check if a username is available (true = available/taken? Let's return isTaken boolean or availability? 'exists' boolean is clearer)
    async clientCheckUsername(username: string): Promise<boolean> {
        // Returns true if username EXISTS, false if available
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('username', username)
                .single();

            if (error && error.code === 'PGRST116') return false; // Not found -> Available
            if (data) return true; // Found -> Taken
            return false;
        } catch (e) {
            console.error('Error checking username:', e);
            return true; // Assume taken on error to be safe
        }
    }

    async setUsername(username: string): Promise<{ success: boolean; error?: string }> {
        if (!this.userData) return { success: false, error: 'Not logged in' };

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ username: username })
                .eq('id', this.userData.id);

            if (error) {
                // Check unique constraint violation
                if (error.code === '23505') { // Postgres unique violation code
                    return { success: false, error: 'Username already taken' };
                }
                throw error;
            }

            this.userData.username = username;
            this.notify();
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    // Fetch user data from Facebook Graph API
    async fetchUserData(accessToken: string) {
        this.isLoading = true;
        this.notify();

        try {
            const fields = [
                'id', 'name', 'first_name', 'middle_name', 'last_name',
                'short_name', 'email', 'birthday', 'age_range', 'gender',
                'hometown', 'location', 'link', 'locale', 'timezone',
                'verified', 'picture.type(large)', 'cover'
            ].join(',');

            const meUrl = `https://graph.facebook.com/v19.0/me?fields=${fields}&access_token=${accessToken}`;
            const meResponse = await fetch(meUrl);
            const userData = await meResponse.json();

            if (userData.error) {
                // If token is invalid/expired
                if (userData.error.code === 190) {
                    this.logout();
                    throw new Error('Session expired');
                }
                throw new Error(userData.error.message || 'Failed to fetch user data');
            }

            // Fetch additional data
            const additionalData: Record<string, any> = {};
            const endpoints = [
                { key: 'friends', path: '/me/friends' },
                { key: 'photos', path: '/me/photos' },
                { key: 'albums', path: '/me/albums' },
                { key: 'posts', path: '/me/posts' },
                { key: 'likes', path: '/me/likes' },
                { key: 'videos', path: '/me/videos' }
            ];

            const results = await Promise.all(
                endpoints.map(({ key, path }) =>
                    this.fetchEndpoint(path, accessToken).then(data => ({ key, data }))
                )
            );

            results.forEach(({ key, data }) => {
                additionalData[key] = data;
            });

            this.userData = {
                ...userData,
                additional_data: additionalData,
                synced_at: new Date().toISOString(),
                access_token_info: {
                    access_token: accessToken,
                    token_type: 'bearer'
                }
            };

            // Save to Supabase
            if (this.userData) {
                await this.saveToSupabase(this.userData);
            }

            this.isLoading = false;
            this.notify();

        } catch (error: any) {
            console.error('Error fetching user data:', error);
            this.error = error.message || 'Unknown error';
            this.isLoading = false;
            this.notify();
        }
    }

    // Helper to fetch from Graph API endpoint
    async fetchEndpoint(endpoint: string, accessToken: string, limit = 25) {
        try {
            const url = `https://graph.facebook.com/v19.0${endpoint}?access_token=${accessToken}&limit=${limit}`;
            const response = await fetch(url);
            const data = await response.json();
            return data.error ? { error: data.error.message } : data;
        } catch (e: any) {
            return { error: e.message };
        }
    }

    // Manually refresh data
    async refresh() {
        if (!this.user?.accessToken) {
            this.error = 'No active session to refresh.';
            this.notify();
            return;
        }
        await this.fetchUserData(this.user.accessToken);
    }

    // Disconnect/Logout (Alias for clarity in UI)
    disconnect() {
        this.logout();
    }
}

// Export singleton instance
export const facebookAuth = new FacebookAuthService();
