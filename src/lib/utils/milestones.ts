// Milestones and Runestones System
// Thresholds: 50, 100, 200, 500, 1000, 2000, 5000

export interface Milestone {
    id: string;
    type: 'friends' | 'posts';
    threshold: number;
    label: string;
    runeReward: number;
    rune: string; // Norse rune symbol
}

export interface MilestoneProgress {
    milestone: Milestone;
    currentValue: number;
    isComplete: boolean;
    isClaimed: boolean;
    progress: number; // 0-100
}

// Define all milestones
export const MILESTONES: Milestone[] = [
    // Friends milestones
    { id: 'friends_50', type: 'friends', threshold: 50, label: '50 Friends', runeReward: 1, rune: 'ᚺ' },
    { id: 'friends_100', type: 'friends', threshold: 100, label: '100 Friends', runeReward: 1, rune: 'ᚠ' },
    { id: 'friends_200', type: 'friends', threshold: 200, label: '200 Friends', runeReward: 2, rune: 'ᚾ' },
    { id: 'friends_500', type: 'friends', threshold: 500, label: '500 Friends', runeReward: 2, rune: 'ᚢ' },
    { id: 'friends_1000', type: 'friends', threshold: 1000, label: '1000 Friends', runeReward: 3, rune: 'ᚦ' },
    { id: 'friends_2000', type: 'friends', threshold: 2000, label: '2000 Friends', runeReward: 4, rune: 'ᛁ' },
    { id: 'friends_5000', type: 'friends', threshold: 5000, label: '5000 Friends', runeReward: 5, rune: 'ᚨ' },
    
    // Posts milestones
    { id: 'posts_50', type: 'posts', threshold: 50, label: '50 Posts', runeReward: 1, rune: 'ᛃ' },
    { id: 'posts_100', type: 'posts', threshold: 100, label: '100 Posts', runeReward: 1, rune: 'ᚱ' },
    { id: 'posts_200', type: 'posts', threshold: 200, label: '200 Posts', runeReward: 2, rune: 'ᛇ' },
    { id: 'posts_500', type: 'posts', threshold: 500, label: '500 Posts', runeReward: 2, rune: 'ᚲ' },
    { id: 'posts_1000', type: 'posts', threshold: 1000, label: '1000 Posts', runeReward: 3, rune: 'ᚷ' },
    { id: 'posts_2000', type: 'posts', threshold: 2000, label: '2000 Posts', runeReward: 4, rune: 'ᛈ' },
    { id: 'posts_5000', type: 'posts', threshold: 5000, label: '5000 Posts', runeReward: 5, rune: 'ᚹ' },
];

// Get current value for a milestone type from facebook data
export function getMilestoneValue(type: 'friends' | 'posts', facebookData: any): number {
    if (!facebookData?.additional_data) return 0;
    
    if (type === 'friends') {
        // Use summary total_count if available, otherwise count data array
        return facebookData.additional_data.friends?.summary?.total_count || 
               facebookData.additional_data.friends?.data?.length || 0;
    }
    
    if (type === 'posts') {
        return facebookData.additional_data.posts?.data?.length || 0;
    }
    
    return 0;
}

// Calculate progress for all milestones
export function calculateMilestoneProgress(
    facebookData: any, 
    claimedMilestones: Record<string, boolean> = {}
): MilestoneProgress[] {
    const friendsCount = getMilestoneValue('friends', facebookData);
    const postsCount = getMilestoneValue('posts', facebookData);
    
    return MILESTONES.map(milestone => {
        const currentValue = milestone.type === 'friends' ? friendsCount : postsCount;
        const isComplete = currentValue >= milestone.threshold;
        const isClaimed = claimedMilestones[milestone.id] === true;
        
        // Calculate progress percentage
        const progress = Math.min((currentValue / milestone.threshold) * 100, 100);
        
        return {
            milestone,
            currentValue,
            isComplete,
            isClaimed,
            progress
        };
    });
}

// Get next unclaimed milestone for a type
export function getNextMilestone(
    type: 'friends' | 'posts',
    facebookData: any,
    claimedMilestones: Record<string, boolean> = {}
): MilestoneProgress | null {
    const milestones = calculateMilestoneProgress(facebookData, claimedMilestones);
    
    // Find first unclaimed milestone of this type
    return milestones.find(m => 
        m.milestone.type === type && !m.isClaimed
    ) || null;
}

// Get all claimable (complete but unclaimed) milestones
export function getClaimableMilestones(
    facebookData: any,
    claimedMilestones: Record<string, boolean> = {}
): MilestoneProgress[] {
    const milestones = calculateMilestoneProgress(facebookData, claimedMilestones);
    return milestones.filter(m => m.isComplete && !m.isClaimed);
}

// Get milestone statistics
export function getMilestoneStats(
    facebookData: any,
    claimedMilestones: Record<string, boolean> = {}
): { total: number; claimed: number; claimable: number } {
    const milestones = calculateMilestoneProgress(facebookData, claimedMilestones);
    
    return {
        total: milestones.length,
        claimed: milestones.filter(m => m.isClaimed).length,
        claimable: milestones.filter(m => m.isComplete && !m.isClaimed).length
    };
}
