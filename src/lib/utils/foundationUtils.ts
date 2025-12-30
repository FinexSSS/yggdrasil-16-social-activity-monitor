import type { GoalType } from './goalUtils';

export type FoundationType = 'memory' | 'connection' | 'expression';

export interface FoundationMetrics {
    type: FoundationType;
    score: number; // 0-100 normalized score
    details: Record<string, number | string>;
    label: string;
    description: string;
    rune: string;
}

/**
 * Calculates metrics for the Memory foundation (Roots)
 * Focus: Content created, history, depth
 */
export function getMemoryMetrics(facebookData: any): FoundationMetrics {
    const additionalData = facebookData?.additional_data || {};

    // Extract counts
    const photosCount = additionalData.photos?.data?.length || 0;
    const albumsCount = additionalData.albums?.data?.length || 0;
    const videosCount = additionalData.videos?.data?.length || 0;

    // Calculate a "depth" score based on volume of content
    // Thresholds: 100 photos, 10 albums, 10 videos for max score
    const photoScore = Math.min(photosCount / 100, 1) * 50;
    const albumScore = Math.min(albumsCount / 10, 1) * 30;
    const videoScore = Math.min(videosCount / 10, 1) * 20;

    return {
        type: 'memory',
        label: 'Memory',
        description: 'The roots of your digital garden, formed by your past moments and memories.',
        rune: 'ᛟ', // Othala (Heritage/Inheritance)
        score: Math.round(photoScore + albumScore + videoScore),
        details: {
            'Photos': photosCount,
            'Albums': albumsCount,
            'Videos': videosCount,
            'Total Memories': photosCount + videosCount
        }
    };
}

/**
 * Calculates metrics for the Connection foundation (Trunk)
 * Focus: Social graph, friends, stability
 */
export function getConnectionMetrics(facebookData: any): FoundationMetrics {
    const additionalData = facebookData?.additional_data || {};

    // Extract counts
    const friendsCount = additionalData.friends?.summary?.total_count || additionalData.friends?.data?.length || 0;
    const likesReceived = additionalData.likes?.data?.length || 0; // Note: This might be likes GIVEN depending on API, but using as proxy

    // Calculate "stability" score
    // Thresholds: 500 friends, 100 likes
    const friendScore = Math.min(friendsCount / 500, 1) * 70;
    const likeScore = Math.min(likesReceived / 100, 1) * 30;

    return {
        type: 'connection',
        label: 'Connection',
        description: 'The sturdy trunk supporting your growth, built from relationships and bonds.',
        rune: 'ᛗ', // Mannaz (Self/Humanity/Connection)
        score: Math.round(friendScore + likeScore),
        details: {
            'Friends': friendsCount,
            'Connections': friendsCount,
            'Interactions': likesReceived
        }
    };
}

/**
 * Calculates metrics for the Expression foundation (Branches)
 * Focus: Activity, posts, outreach
 */
export function getExpressionMetrics(facebookData: any): FoundationMetrics {
    const additionalData = facebookData?.additional_data || {};

    // Extract counts
    const postsCount = additionalData.posts?.data?.length || 0;

    // Calculate "reach" score
    // Threshold: 50 posts
    const postScore = Math.min(postsCount / 50, 1) * 100;

    return {
        type: 'expression',
        label: 'Expression',
        description: 'The reaching branches showcasing your voice, ideas, and active presence.',
        rune: 'ᚲ', // Kenaz (Torch/Knowledge/Expression)
        score: Math.round(postScore),
        details: {
            'Posts': postsCount,
            'Activity Level': postsCount > 10 ? 'High' : postsCount > 0 ? 'Moderate' : 'Dormant'
        }
    };
}

export function getAllFoundationMetrics(facebookData: any) {
    return {
        memory: getMemoryMetrics(facebookData),
        connection: getConnectionMetrics(facebookData),
        expression: getExpressionMetrics(facebookData)
    };
}
