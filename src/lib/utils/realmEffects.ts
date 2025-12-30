/**
 * Realm Effects System
 * Each of the 9 Norse realms has a unique visual effect
 */

export type RealmName = 
    | 'Asgard' 
    | 'Vanaheim' 
    | 'Alfheim' 
    | 'Midgard' 
    | 'Jötunheim' 
    | 'Svartalfheim' 
    | 'Niflheim' 
    | 'Muspelheim' 
    | 'Helheim';

export type RealmEffectType = 
    | 'aurora'      // Asgard - Northern lights (divine)
    | 'bloom'       // Vanaheim - Flower petals/nature magic
    | 'starlight'   // Alfheim - Twinkling light particles
    | 'rain'        // Midgard - Gentle rain
    | 'snowstorm'   // Jötunheim - Heavy snow/blizzard
    | 'embers'      // Svartalfheim - Forge sparks/embers
    | 'fog'         // Niflheim - Dense mist/fog
    | 'fire'        // Muspelheim - Flames and ash
    | 'void'        // Helheim - Dark void particles

export interface RealmEffect {
    type: RealmEffectType;
    name: string;
    description: string;
    icon: string;
    color: string;
    particleColor: number;
    ambientColor: number;
    intensity: number;
}

export const REALM_EFFECTS: Record<RealmName, RealmEffect> = {
    Asgard: {
        type: 'aurora',
        name: 'Aurora Borealis',
        description: 'Divine northern lights dance across the sky',
        icon: '🌌',
        color: '#00ff88',
        particleColor: 0x00ff88,
        ambientColor: 0x88ffcc,
        intensity: 1.0,
    },
    Vanaheim: {
        type: 'bloom',
        name: 'Nature\'s Bloom',
        description: 'Magical flower petals float on gentle winds',
        icon: '🌸',
        color: '#ff88cc',
        particleColor: 0xff88cc,
        ambientColor: 0xffccee,
        intensity: 0.8,
    },
    Alfheim: {
        type: 'starlight',
        name: 'Starlight',
        description: 'Ethereal light particles shimmer like stars',
        icon: '✨',
        color: '#ffffaa',
        particleColor: 0xffffaa,
        ambientColor: 0xffffee,
        intensity: 0.9,
    },
    Midgard: {
        type: 'rain',
        name: 'Gentle Rain',
        description: 'Soft rainfall nurtures the earth',
        icon: '🌧️',
        color: '#4a90e2',
        particleColor: 0x4a90e2,
        ambientColor: 0x8ab4f8,
        intensity: 0.7,
    },
    'Jötunheim': {
        type: 'snowstorm',
        name: 'Giant\'s Blizzard',
        description: 'Fierce snow and ice from the land of giants',
        icon: '❄️',
        color: '#ffffff',
        particleColor: 0xffffff,
        ambientColor: 0xccddff,
        intensity: 1.0,
    },
    Svartalfheim: {
        type: 'embers',
        name: 'Forge Embers',
        description: 'Sparks rise from the dwarven forges',
        icon: '🔥',
        color: '#ff6600',
        particleColor: 0xff6600,
        ambientColor: 0xff9944,
        intensity: 0.8,
    },
    Niflheim: {
        type: 'fog',
        name: 'Primordial Mist',
        description: 'Ancient fog from the realm of ice',
        icon: '🌫️',
        color: '#aabbcc',
        particleColor: 0xaabbcc,
        ambientColor: 0x889999,
        intensity: 0.5,
    },
    Muspelheim: {
        type: 'fire',
        name: 'Surtr\'s Flames',
        description: 'Eternal flames from the realm of fire',
        icon: '🔥',
        color: '#ff3300',
        particleColor: 0xff3300,
        ambientColor: 0xff6633,
        intensity: 1.2,
    },
    Helheim: {
        type: 'void',
        name: 'Void Essence',
        description: 'Dark particles drift from the realm of the dead',
        icon: '💀',
        color: '#440066',
        particleColor: 0x440066,
        ambientColor: 0x220033,
        intensity: 0.4,
    },
};

export function getRealmEffect(realmName: RealmName): RealmEffect {
    return REALM_EFFECTS[realmName];
}

export function getAllRealms(): RealmName[] {
    return Object.keys(REALM_EFFECTS) as RealmName[];
}

export function getRealmRune(realmName: RealmName): string {
    const runeMap: Record<RealmName, string> = {
        Asgard: 'ᚨᛊᚷᚨᚱᛞ',
        Vanaheim: 'ᚦᚨᚾᚨᚺᛖᛁᛗ',
        Alfheim: 'ᚨᛚᚠᚺᛖᛁᛗ',
        Midgard: 'ᛗᛁᛞᚷᚨᚱᛞ',
        'Jötunheim': 'ᛃᛟᛏᚢᚾᚺᛖᛁᛗ',
        Svartalfheim: 'ᛊᚦᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ',
        Niflheim: 'ᚾᛁᚠᛚᚺᛖᛁᛗ',
        Muspelheim: 'ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ',
        Helheim: 'ᚺᛖᛚᚺᛖᛁᛗ',
    };
    return runeMap[realmName];
}
