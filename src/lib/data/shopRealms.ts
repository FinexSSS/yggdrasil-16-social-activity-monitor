/**
 * Realm Shop Data
 * All 9 Norse realms that can be unlocked and displayed in the garden
 * Users get their assigned realm for free, others must be purchased
 */

export interface RealmItem {
    id: string;
    name: string;
    description: string;
    lore: string; // Norse mythology lore
    price: number; // Rune points cost
    rune: string; // Decorative rune symbol
    icon: string; // Emoji icon
    tier: 'starter' | 'common' | 'rare' | 'legendary' | 'mythic';
    color: string; // Primary realm color
    bgGradient: string; // Tailwind gradient classes
    effectType: string; // Visual effect type
}

export const SHOP_REALMS: RealmItem[] = [
    {
        id: 'asgard',
        name: 'Asgard',
        description: 'Home of the Æsir gods, realm of divine power and glory.',
        lore: 'Connected to Midgard by Bifröst, the rainbow bridge. Here Odin rules from Hliðskjálf.',
        price: 15,
        rune: 'ᚨᛊᚷᚨᚱᛞ',
        icon: '🌌',
        tier: 'mythic',
        color: '#00ff88',
        bgGradient: 'from-emerald-900 via-teal-900 to-cyan-900',
        effectType: 'aurora',
    },
    {
        id: 'vanaheim',
        name: 'Vanaheim',
        description: 'Realm of the Vanir, masters of nature magic and fertility.',
        lore: 'Home to Freya and Freyr, where nature blooms eternally.',
        price: 10,
        rune: 'ᚦᚨᚾᚨᚺᛖᛁᛗ',
        icon: '🌸',
        tier: 'legendary',
        color: '#ff88cc',
        bgGradient: 'from-pink-900 via-rose-900 to-fuchsia-900',
        effectType: 'bloom',
    },
    {
        id: 'alfheim',
        name: 'Alfheim',
        description: 'Luminous realm of the Light Elves, bathed in eternal starlight.',
        lore: 'Given to Freyr as a tooth-gift. The most beautiful of all realms.',
        price: 10,
        rune: 'ᚨᛚᚠᚺᛖᛁᛗ',
        icon: '✨',
        tier: 'legendary',
        color: '#ffffaa',
        bgGradient: 'from-yellow-900 via-amber-900 to-orange-900',
        effectType: 'starlight',
    },
    {
        id: 'midgard',
        name: 'Midgard',
        description: 'The mortal realm, encircled by the world serpent Jörmungandr.',
        lore: 'Created from Ymir\'s body, protected by Thor from giants.',
        price: 5,
        rune: 'ᛗᛁᛞᚷᚨᚱᛞ',
        icon: '🌧️',
        tier: 'common',
        color: '#4a90e2',
        bgGradient: 'from-blue-900 via-slate-900 to-gray-900',
        effectType: 'rain',
    },
    {
        id: 'jotunheim',
        name: 'Jötunheim',
        description: 'Frozen realm of the giants, land of primordial chaos.',
        lore: 'Home to the Jötnar who forever war with the gods.',
        price: 8,
        rune: 'ᛃᛟᛏᚢᚾᚺᛖᛁᛗ',
        icon: '❄️',
        tier: 'rare',
        color: '#ffffff',
        bgGradient: 'from-slate-800 via-blue-900 to-indigo-900',
        effectType: 'snowstorm',
    },
    {
        id: 'svartalfheim',
        name: 'Svartalfheim',
        description: 'Underground realm of the dwarves, masters of the forge.',
        lore: 'Where Mjölnir, Gungnir, and countless treasures were crafted.',
        price: 8,
        rune: 'ᛊᚦᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ',
        icon: '⚒️',
        tier: 'rare',
        color: '#cc6600',
        bgGradient: 'from-stone-900 via-gray-900 to-orange-950',
        effectType: 'embers',
    },
    {
        id: 'niflheim',
        name: 'Niflheim',
        description: 'Primordial realm of ice and mist, source of all cold rivers.',
        lore: 'One of the two primordial realms. Here lies the well Hvergelmir.',
        price: 6,
        rune: 'ᚾᛁᚠᛚᚺᛖᛁᛗ',
        icon: '🌫️',
        tier: 'common',
        color: '#aabbcc',
        bgGradient: 'from-gray-800 via-slate-800 to-zinc-900',
        effectType: 'fog',
    },
    {
        id: 'muspelheim',
        name: 'Muspelheim',
        description: 'Realm of eternal fire, guarded by the fire giant Surtr.',
        lore: 'At Ragnarök, Surtr will emerge to engulf all worlds in flame.',
        price: 12,
        rune: 'ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ',
        icon: '🔥',
        tier: 'legendary',
        color: '#ff3300',
        bgGradient: 'from-red-900 via-orange-900 to-yellow-900',
        effectType: 'fire',
    },
    {
        id: 'helheim',
        name: 'Helheim',
        description: 'Dark realm of the dishonored dead, ruled by goddess Hel.',
        lore: 'Those who die of old age or sickness journey here.',
        price: 12,
        rune: 'ᚺᛖᛚᚺᛖᛁᛗ',
        icon: '💀',
        tier: 'legendary',
        color: '#440066',
        bgGradient: 'from-purple-900 via-violet-900 to-indigo-950',
        effectType: 'void',
    },
];

// Helper function to get tier info with colors
export function getRealmTierInfo(tier: RealmItem['tier']): { label: string; color: string; bgColor: string } {
    switch (tier) {
        case 'starter':
            return { label: 'Starter', color: 'text-gray-300', bgColor: 'bg-gray-700/50' };
        case 'common':
            return { label: 'Common', color: 'text-green-400', bgColor: 'bg-green-900/50' };
        case 'rare':
            return { label: 'Rare', color: 'text-blue-400', bgColor: 'bg-blue-900/50' };
        case 'legendary':
            return { label: 'Legendary', color: 'text-purple-400', bgColor: 'bg-purple-900/50' };
        case 'mythic':
            return { label: 'Mythic', color: 'text-amber-400', bgColor: 'bg-amber-900/50' };
        default:
            return { label: 'Unknown', color: 'text-gray-400', bgColor: 'bg-gray-700/50' };
    }
}

// Get realm by name (case-insensitive)
export function getRealmByName(name: string): RealmItem | undefined {
    return SHOP_REALMS.find(r => r.name.toLowerCase() === name.toLowerCase());
}

// Get realm by ID
export function getRealmById(id: string): RealmItem | undefined {
    return SHOP_REALMS.find(r => r.id === id);
}

// Convert realm name to ID (for database storage)
export function realmNameToId(name: string): string {
    return name.toLowerCase().replace('ö', 'o');
}

// Convert ID back to proper name
export function realmIdToName(id: string): string {
    const realm = getRealmById(id);
    return realm?.name || id;
}

// Check if user can afford a realm
export function canAffordRealm(runePoints: number, realm: RealmItem): boolean {
    return runePoints >= realm.price;
}

// Get available realms (not assigned, not purchased)
export function getAvailableRealms(
    assignedRealm: string | null,
    purchasedRealms: string[]
): RealmItem[] {
    return SHOP_REALMS.filter(realm => {
        const realmId = realm.id;
        const assignedId = assignedRealm ? realmNameToId(assignedRealm) : null;
        
        // Hide if it's the assigned realm (user already has it)
        if (assignedId === realmId) return false;
        
        // Hide if already purchased
        if (purchasedRealms.includes(realm.name) || purchasedRealms.includes(realmId)) return false;
        
        return true;
    });
}

// Get all unlocked realms (assigned + purchased)
export function getUnlockedRealms(
    assignedRealm: string | null,
    purchasedRealms: string[]
): RealmItem[] {
    return SHOP_REALMS.filter(realm => {
        const realmId = realm.id;
        const assignedId = assignedRealm ? realmNameToId(assignedRealm) : null;
        
        // Include if it's the assigned realm
        if (assignedId === realmId) return true;
        
        // Include if purchased
        if (purchasedRealms.includes(realm.name) || purchasedRealms.includes(realmId)) return true;
        
        return false;
    });
}
