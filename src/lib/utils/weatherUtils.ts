import { writable, get } from 'svelte/store';

export type WeatherType =
    | 'snowfall'
    | 'rain'
    | 'sunset'
    | 'clear-day'
    | 'thunderstorm';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

export interface WeatherSettings {
    mode: 'auto' | 'manual';
    manualWeather: WeatherType | null;
}

export interface WeatherState {
    current: WeatherType;
    isAuto: boolean;
}

const STORAGE_KEY = 'yggdrasil-weather-settings';

// Default settings
const defaultSettings: WeatherSettings = {
    mode: 'auto',
    manualWeather: null,
};

// Save settings to database (user-specific)
export async function saveWeatherSettings(settings: WeatherSettings, userId?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    // Also save to localStorage as fallback
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Failed to save weather settings to localStorage:', e);
    }

    // Save to database if userId is provided
    if (userId) {
        try {
            const { supabase } = await import('$lib/supabaseClient');
            const { error } = await supabase
                .from('profiles')
                .update({
                    weather_settings: settings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('Failed to save weather settings to database:', error);
            }
        } catch (e) {
            console.warn('Failed to save weather settings to database:', e);
        }
    }
}

// Load settings from database (user-specific) or localStorage as fallback
async function loadWeatherSettingsFromDB(userId?: string): Promise<WeatherSettings> {
    if (userId) {
        try {
            const { supabase } = await import('$lib/supabaseClient');
            const { data, error } = await supabase
                .from('profiles')
                .select('weather_settings')
                .eq('id', userId)
                .single();

            if (!error && data?.weather_settings) {
                return { ...defaultSettings, ...data.weather_settings };
            }
        } catch (e) {
            console.warn('Failed to load weather settings from database:', e);
        }
    }

    // Fallback to localStorage
    return loadWeatherSettings();
}

// Load settings from localStorage (fallback)
function loadWeatherSettings(): WeatherSettings {
    if (typeof window === 'undefined') return defaultSettings;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Failed to load weather settings:', e);
    }
    return defaultSettings;
}

// Get user's timezone
export function getUserTimezone(): string {
    if (typeof window === 'undefined') return 'UTC';
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Get current hour in user's timezone (0-23)
export function getCurrentHour(): number {
    const now = new Date();
    return now.getHours();
}

// Get current month (0-11)
function getCurrentMonth(): number {
    const now = new Date();
    return now.getMonth();
}

// Determine current season based on month (Northern Hemisphere)
export function getCurrentSeason(): Season {
    const month = getCurrentMonth();

    // Winter: Dec, Jan, Feb (11, 0, 1)
    if (month === 11 || month === 0 || month === 1) return 'winter';

    // Spring: Mar, Apr, May (2, 3, 4)
    if (month >= 2 && month <= 4) return 'spring';

    // Summer: Jun, Jul, Aug (5, 6, 7)
    if (month >= 5 && month <= 7) return 'summer';

    // Fall: Sep, Oct, Nov (8, 9, 10)
    return 'fall';
}

// Determine weather based on time and season
export function getTimeBasedWeather(hour: number, season: Season): WeatherType {
    // Night time (0-5, 20-23)
    if (hour >= 0 && hour < 6) {
        return 'clear-day'; // Dark clear sky
    }

    // Early morning (6-8)
    if (hour >= 6 && hour < 9) {
        return 'clear-day';
    }

    // Morning (9-11)
    if (hour >= 9 && hour < 12) {
        // Spring has rain chance
        if (season === 'spring' && Math.random() > 0.7) {
            return 'rain';
        }
        return 'clear-day';
    }

    // Afternoon (12-16)
    if (hour >= 12 && hour < 17) {
        // Summer thunderstorm chance
        if (season === 'summer' && Math.random() > 0.85) {
            return 'thunderstorm';
        }
        // Winter afternoon snow
        if (season === 'winter' && Math.random() > 0.6) {
            return 'snowfall';
        }
        // Late afternoon transitions to sunset
        if (hour >= 15 && hour < 17) {
            return 'sunset';
        }
        return 'clear-day';
    }

    // Evening (17-19)
    if (hour >= 17 && hour < 20) {
        return 'sunset';
    }

    // Night (20-23)
    return 'clear-day';
}

// Create weather store
function createWeatherStore() {
    const settings = loadWeatherSettings();
    const initialWeather = settings.mode === 'manual' && settings.manualWeather
        ? settings.manualWeather
        : getTimeBasedWeather(getCurrentHour(), getCurrentSeason());

    const initialState: WeatherState = {
        current: initialWeather,
        isAuto: settings.mode === 'auto',
    };

    const { subscribe, set, update } = writable<WeatherState>(initialState);

    let currentUserId: string | null = null;

    // Initialize with user ID
    async function init(userId: string) {
        currentUserId = userId;
        const userSettings = await loadWeatherSettingsFromDB(userId);
        const weather = userSettings.mode === 'manual' && userSettings.manualWeather
            ? userSettings.manualWeather
            : getTimeBasedWeather(getCurrentHour(), getCurrentSeason());

        update(state => ({
            current: weather,
            isAuto: userSettings.mode === 'auto',
        }));
    }

    // Update weather based on time (called periodically)
    function updateAutoWeather() {
        update(state => {
            if (!state.isAuto) return state;

            const newWeather = getTimeBasedWeather(getCurrentHour(), getCurrentSeason());
            return { ...state, current: newWeather };
        });
    }

    // Set manual weather
    function setManualWeather(weather: WeatherType) {
        update(state => {
            const newSettings: WeatherSettings = {
                mode: 'manual',
                manualWeather: weather,
            };
            saveWeatherSettings(newSettings, currentUserId || undefined);

            return {
                ...state,
                current: weather,
                isAuto: false,
            };
        });
    }



    // Switch to auto mode
    function setAutoMode() {
        update(state => {
            const newSettings: WeatherSettings = {
                mode: 'auto',
                manualWeather: null,
            };
            saveWeatherSettings(newSettings, currentUserId || undefined);

            const newWeather = getTimeBasedWeather(getCurrentHour(), getCurrentSeason());
            return {
                current: newWeather,
                isAuto: true,
            };
        });
    }

    // Start auto-update interval (check every 5 minutes)
    if (typeof window !== 'undefined') {
        setInterval(updateAutoWeather, 5 * 60 * 1000);
    }

    return {
        subscribe,
        init,
        setManualWeather,
        setAutoMode,
        updateAutoWeather,
    };
}

export const weatherStore = createWeatherStore();

// Weather display names
export const weatherDisplayNames: Record<WeatherType, string> = {
    'snowfall': 'Snowfall',
    'rain': 'Rain',
    'sunset': 'Sunset',
    'clear-day': 'Clear Day',
    'thunderstorm': 'Thunderstorm',
};

// Weather icons (emoji for now, can be replaced with SVG)
export const weatherIcons: Record<WeatherType, string> = {
    'snowfall': '❄️',
    'rain': '🌧️',
    'sunset': '🌅',
    'clear-day': '☀️',
    'thunderstorm': '⛈️',
};
