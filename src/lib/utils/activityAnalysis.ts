
export interface ActivityScores {
    socialDensity: number;
    productiveDensity: number;
}

const PRODUCTIVE_KEYWORDS = [
    'work', 'study', 'code', 'coding', 'gym', 'exercise', 'workout',
    'project', 'learning', 'reading', 'research', 'build', 'create',
    'develop', 'meeting', 'class', 'university', 'school', 'office',
    'productive', 'focus', 'grind', 'hustle', 'task'
];

export function analyzeUserActivity(userData: any): ActivityScores {
    console.log('analyzeUserActivity input:', userData ? 'Exists' : 'Null');
    if (!userData || !userData.additional_data) {
        console.warn('analyzeUserActivity: No additional_data found');
        return { socialDensity: 0, productiveDensity: 0 };
    }

    console.log('analyzeUserActivity keys:', Object.keys(userData.additional_data));

    const {
        posts,
        likes,
        photos,
        videos
    } = userData.additional_data;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let socialCount = 0;
    let productiveCount = 0;

    // Helper to check if date is within last 3 days
    const isRecent = (dateString: string) => {
        const date = new Date(dateString);
        return date >= threeDaysAgo;
    };

    // 1. Calculate Social Active Score (count of items in last 3 days)
    // Check Posts
    if (posts && posts.data) {
        console.log('Analyzing posts:', posts.data.length);
        posts.data.forEach((post: any) => {
            const isRec = isRecent(post.created_time);
            console.log(`Post: ${post.created_time} IsRecent: ${isRec}`);
            if (isRec) {
                socialCount++;

                // Check Productive Keywords in post messages
                if (post.message) {
                    const message = post.message.toLowerCase();
                    const isProductive = PRODUCTIVE_KEYWORDS.some(keyword => message.includes(keyword));
                    if (isProductive) {
                        console.log('Productive match:', message);
                        productiveCount++;
                    }
                }
            }
        });
    }

    // Check Likes (assuming likes have created_time, often they don't in basic API but if they do)
    if (likes && likes.data) {
        likes.data.forEach((like: any) => {
            // Likes often don't have created_time in some permissions, but checking just in case
            if (like.created_time && isRecent(like.created_time)) {
                socialCount++;
            }
        });
    }

    // Check Photos
    if (photos && photos.data) {
        photos.data.forEach((photo: any) => {
            if (isRecent(photo.created_time)) {
                socialCount++;
            }
        });
    }

    // Check Videos
    if (videos && videos.data) {
        videos.data.forEach((video: any) => {
            if (isRecent(video.created_time)) {
                socialCount++;
            }
        });
    }

    // Scale density (e.g., 1 action = 5 leaves, capped at some reasonable amount)
    // You can adjust the multiplier (e.g., * 5) and max cap (e.g., 50) as needed for visual density.
    const socialDensity = Math.min(socialCount * 5, 100);
    const productiveDensity = Math.min(productiveCount * 10, 100); // Higher weight for productive because they are rarer

    console.log(`Activity Analysis - Recent Social Actions: ${socialCount}, Productive Matches: ${productiveCount}`);
    console.log(`Calculated Density - Social: ${socialDensity}, Productive: ${productiveDensity}`);

    return { socialDensity, productiveDensity };
}
