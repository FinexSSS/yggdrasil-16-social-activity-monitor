// Tree Shop Data
// All available trees that can be purchased or equipped

export interface TreeItem {
    id: string;
    model: string; // Model path relative to /model/
    name: string;
    description: string;
    price: number; // Rune points cost (0 = free)
    rune: string; // Decorative rune symbol
    tier: 'free' | 'common' | 'rare' | 'legendary' | 'mythic' | 'easter';
    previewColor: string; // Tailwind color for preview border
    hidden?: boolean; // Hidden easter egg - only shown if owned
    scale: number; // 3D model scale - ADJUST THIS for each tree's size (default: 8.5)
}

export const SHOP_TREES: TreeItem[] = [
    {
        id: 'sprouting-life',
        model: 'sprouting-life.glb',
        name: 'Sprouting Life',
        description: 'A symbol of rebirth and new beginnings. Unlocked through the sacred rebirth ritual.',
        price: 0,
        rune: 'ᛉ',
        tier: 'easter',
        previewColor: 'rose',
        hidden: true, // Easter egg - only shows if owned through rebirth
        scale: 8.5 // ← ADJUST THIS to resize Sprouting Life
    },
    {
        id: 'young-oak',
        model: 'tree/1-young-oak-seedling.glb',
        name: 'Young Oak Seedling',
        description: 'A young tree, full of potential. The beginning of every great journey.',
        price: 0,
        rune: 'ᛃ',
        tier: 'free',
        previewColor: 'emerald',
        scale: 7.5 // ← ADJUST THIS to resize Young Oak Seedling
    },
    {
        id: 'lush-canopy',
        model: 'tree/2-lush-canopy.glb',
        name: 'Lush Canopy',
        description: 'A flourishing tree with spreading branches, representing growth and prosperity.',
        price: 2,
        rune: 'ᛒ',
        tier: 'common',
        previewColor: 'green',
        scale: 8.5 // ← ADJUST THIS to resize Lush Canopy
    },
    {
        id: 'ancient-oak',
        model: 'tree/3-ancient-oak-tree.glb',
        name: 'Ancient Oak',
        description: 'Centuries of wisdom stored in its mighty trunk. A testament to endurance.',
        price: 4,
        rune: 'ᛖ',
        tier: 'rare',
        previewColor: 'amber',
        scale: 8.5 // ← ADJUST THIS to resize Ancient Oak
    },
    {
        id: 'aged-oak',
        model: 'tree/4-aged-oak-tree.glb',
        name: 'Aged Oak',
        description: 'Time-worn and majestic, this tree has witnessed ages pass.',
        price: 6,
        rune: 'ᛗ',
        tier: 'legendary',
        previewColor: 'purple',
        scale: 8.5 // ← ADJUST THIS to resize Aged Oak
    },
    {
        id: 'cosmic-blue',
        model: 'tree/5-blue-cosmic-tree.glb',
        name: 'Blue Cosmic Tree',
        description: 'Infused with the essence of Niflheim, glowing with ethereal blue energy.',
        price: 8,
        rune: 'ᛚ',
        tier: 'mythic',
        previewColor: 'blue',
        scale: 7.5 // ← ADJUST THIS to resize Blue Cosmic Tree
    },
    {
        id: 'cosmic-green',
        model: 'tree/6-green-cosmic-tree.glb',
        name: 'Green Cosmic Tree',
        description: 'Blessed by Yggdrasil itself, radiating the green light of creation.',
        price: 10,
        rune: 'ᛝ',
        tier: 'mythic',
        previewColor: 'teal',
        scale: 7.5 // ← ADJUST THIS to resize Green Cosmic Tree
    }
];

// Get tree by model path
export function getTreeByModel(model: string): TreeItem | undefined {
    return SHOP_TREES.find(t => t.model === model);
}

// Get tree by ID
export function getTreeById(id: string): TreeItem | undefined {
    return SHOP_TREES.find(t => t.id === id);
}

// Check if user can afford a tree
export function canAffordTree(tree: TreeItem, runePoints: number): boolean {
    return runePoints >= tree.price;
}

// Get tier display info
export function getTierInfo(tier: TreeItem['tier']): { label: string; color: string; bgColor: string } {
    const tiers = {
        free: { label: 'Free', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
        common: { label: 'Common', color: 'text-green-400', bgColor: 'bg-green-500/20' },
        rare: { label: 'Rare', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
        legendary: { label: 'Legendary', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
        mythic: { label: 'Mythic', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
        easter: { label: 'Easter', color: 'text-rose-400', bgColor: 'bg-rose-500/20' }
    };
    return tiers[tier];
}
