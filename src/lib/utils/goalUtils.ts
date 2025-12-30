/**
 * Utility functions for user goal calculations
 */

export type GoalType = 'friends' | 'photos' | 'posts' | 'albums' | 'likes' | 'videos';

export interface UserGoal {
    id?: string;
    user_id: string;
    goal_type: GoalType;
    target_value: number;
    created_at?: string;
    updated_at?: string;
}

/**
 * Extracts the current count for a specific goal type from Facebook data
 */
export function getCurrentValue(goalType: GoalType, facebookData: any): number {
    if (!facebookData || !facebookData.additional_data) return 0;

    const additionalData = facebookData.additional_data;

    switch (goalType) {
        case 'friends':
            return additionalData.friends?.summary?.total_count || additionalData.friends?.data?.length || 0;
        case 'photos':
            return additionalData.photos?.data?.length || 0;
        case 'posts':
            return additionalData.posts?.data?.length || 0;
        case 'albums':
            return additionalData.albums?.data?.length || 0;
        case 'likes':
            return additionalData.likes?.data?.length || 0;
        case 'videos':
            return additionalData.videos?.data?.length || 0;
        default:
            return 0;
    }
}

/**
 * Calculates progress percentage (0-100)
 */
export function calculateProgress(current: number, target: number): number {
    if (target <= 0) return 0;
    const progress = (current / target) * 100;
    return Math.min(progress, 100); // Cap at 100%
}

/**
 * Determines how many leaves to display based on progress
 * @param progress - Progress percentage (0-100)
 * @param maxLeaves - Maximum number of leaves (default 10)
 */
export function getLeafCount(progress: number, maxLeaves: number = 10): number {
    if (progress <= 0) return 0;
    // Use Math.ceil so that any progress > 0 shows at least 1 leaf
    const count = Math.ceil((progress / 100) * maxLeaves);
    return Math.max(1, Math.min(count, maxLeaves));
}

/**
 * Gets a human-readable label for a goal type
 */
export function getGoalTypeLabel(goalType: GoalType): string {
    const labels: Record<GoalType, string> = {
        friends: 'Friends',
        photos: 'Photos',
        posts: 'Posts',
        albums: 'Albums',
        likes: 'Likes',
        videos: 'Videos'
    };
    return labels[goalType] || goalType;
}

/**
 * Gets an emoji icon for a goal type
 */
export function getGoalTypeIcon(goalType: GoalType): string {
    const icons: Record<GoalType, string> = {
        friends: '👥',
        photos: '📷',
        posts: '📝',
        albums: '📁',
        likes: '👍',
        videos: '🎥'
    };
    return icons[goalType] || '🎯';
}
