/**
 * Realm Effects System (Double Click Variant)
 * Each of the 9 Norse realms has a unique visual effect when double-clicked
 * Based on the WeatherSystem implementation
 */

import type { RealmName } from './realmEffects';

export type WeatherEffectType = 'snow' | 'rain' | 'fog' | 'thunder';

export interface DoubleClickRealmEffect {
    type: WeatherEffectType;
    color: number; // Hex color for particles/lines
    lightningColor?: number; // For thunder
    name: string;
    intensity: number;
}

export const DOUBLE_CLICKED_REALM_EFFECTS: Record<RealmName, DoubleClickRealmEffect> = {
    Asgard: { 
        type: 'thunder', 
        color: 0xFFD700, // Gold rain
        lightningColor: 0xFFFFFF, 
        name: 'Golden Storm',
        intensity: 1.0 
    },
    Vanaheim: { 
        type: 'rain', 
        color: 0x00FF88, // Greenish rain
        name: 'Nature Rain',
        intensity: 0.8 
    },
    Alfheim: { 
        type: 'snow', 
        color: 0xFFFFCC, // Pale yellow snow
        name: 'Stardust',
        intensity: 0.9 
    },
    Midgard: { 
        type: 'rain', 
        color: 0x4a90e2, // Blue rain
        name: 'Rain',
        intensity: 0.8 
    },
    'Jötunheim': { 
        type: 'snow', 
        color: 0xFFFFFF, // White snow
        name: 'Blizzard',
        intensity: 1.0 
    },
    Svartalfheim: { 
        type: 'fog', 
        color: 0xFF4500, // Orange fog
        name: 'Forge Smoke',
        intensity: 0.7 
    },
    Niflheim: { 
        type: 'fog', 
        color: 0xAAFFFF, // Cyan fog
        name: 'Mist',
        intensity: 0.6 
    },
    Muspelheim: { 
        type: 'thunder', 
        color: 0xFF3300, // Red rain
        lightningColor: 0xFFAA00, // Orange lightning
        name: 'Fire Storm',
        intensity: 1.2 
    },
    Helheim: { 
        type: 'snow', 
        color: 0x440066, // Purple snow (ash)
        name: 'Ash Fall',
        intensity: 0.5 
    },
};
