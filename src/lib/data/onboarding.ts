export interface Answer {
    text: string;
    tags: string[]; // e.g., ['power', 'chaos']
    icon: string;
}

export interface Question {
    id: number;
    text: string;
    answers: Answer[];
}

export const ONBOARDING_QUESTIONS: Question[] = [
    {
        id: 1,
        text: "When the world is silent, what stirs within you?",
        answers: [
            { text: "A rising will to act", tags: ["power"], icon: "🔥" },
            { text: "A steady flow of thought", tags: ["wisdom"], icon: "🌊" },
            { text: "A need to nurture and protect", tags: ["life"], icon: "🌱" },
            { text: "A pull toward change", tags: ["chaos"], icon: "🌪️" },
        ],
    },
    {
        id: 2,
        text: "When fate resists you, how do you respond?",
        answers: [
            { text: "Confront it directly", tags: ["valor"], icon: "⚔️" },
            { text: "Outthink and adapt", tags: ["strategy"], icon: "🧠" },
            { text: "Endure and persist", tags: ["resilience"], icon: "🛡️" },
            { text: "Withdraw and observe", tags: ["reflection"], icon: "🕊️" },
        ],
    },
    {
        id: 3,
        text: "What does your tree seek above all else?",
        answers: [
            { text: "Purpose and legacy", tags: ["order"], icon: "👑" },
            { text: "Hidden truths", tags: ["knowledge"], icon: "🔮" },
            { text: "Connection and harmony", tags: ["unity"], icon: "❤️" },
            { text: "Freedom from all bounds", tags: ["void"], icon: "🌑" },
        ],
    },
];

export const REALMS = {
    ASGARD: "Asgard",
    MIDGARD: "Midgard",
    VANAHEIM: "Vanaheim",
    ALFHEIM: "Alfheim",
    JOTUNHEIM: "Jotunheim",
    SVARTALFHEIM: "Svartalfheim",
    NIFLHEIM: "Niflheim",
    MUSPELHEIM: "Muspelheim",
    HELHEIM: "Helheim",
} as const;

export type RealmName = typeof REALMS[keyof typeof REALMS];

// Mapping of realms to their required traits
const REALM_TRAITS: Record<RealmName, string[]> = {
    [REALMS.ASGARD]: ["power", "order", "valor"],
    [REALMS.MIDGARD]: ["unity", "resilience", "balance"], // 'balance' derived or extra? assuming tagging logic covers it or loose match
    [REALMS.VANAHEIM]: ["life", "harmony", "growth"],
    [REALMS.ALFHEIM]: ["knowledge", "reflection", "light"],
    [REALMS.JOTUNHEIM]: ["chaos", "power", "endurance"],
    [REALMS.SVARTALFHEIM]: ["strategy", "knowledge", "craft"],
    [REALMS.NIFLHEIM]: ["reflection", "void", "stillness"],
    [REALMS.MUSPELHEIM]: ["power", "chaos", "action"],
    [REALMS.HELHEIM]: ["resilience", "void", "acceptance"],
};

export function calculateRealm(selectedAnswers: Answer[]): RealmName {
    const allTags = selectedAnswers.flatMap((a) => a.tags);
    const tagCounts: Record<string, number> = {};

    // Count tags
    allTags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    let bestRealm: RealmName = REALMS.MIDGARD; // Default fallback
    let maxScore = -1;

    for (const realm of Object.values(REALMS)) {
        const requiredTraits = REALM_TRAITS[realm];
        let score = 0;
        requiredTraits.forEach((trait) => {
            if (tagCounts[trait]) score += tagCounts[trait];
        });

        // Simple tie-breaking: latest questions (Question 3) implicitly weigh more if we just keep >=
        // But requirement says: "Ties resolve using Question 3 as priority"
        // So let's add weight based on which question provided the tag?
        // Actually, distinct tags per question makes it simpler.
        // Let's stick to simple affinity first.

        if (score > maxScore) {
            maxScore = score;
            bestRealm = realm;
        }
    }

    // Tie-breaker logic (refining):
    // If we want Q3 to determine ties, we checks Q3's answer tags.
    // The provided table maps specific unique combinations mostly found in the answers.
    // Let's implement a direct mapping if match is perfect, otherwise fallback to score.

    // Actually, the requirements table maps 3 specific traits to a realm.
    // Q1 gives: Power/Wisdom/Life/Chaos
    // Q2 gives: Valor/Strategy/Resilience/Reflection
    // Q3 gives: Order/Knowledge/Unity/Void

    // Example: Asgard = Power + Order + Valor.
    // This means Q1=Power, Q2=Valor, Q3=Order.
    // It's a precise combination of 1 from each row.

    // Let's try to find an exact match first.
    const flatTags = new Set(allTags);

    for (const realm of Object.values(REALMS)) {
        const traits = REALM_TRAITS[realm];
        // Check if we have 3/3 match?
        // Wait, the table has mixed traits.
        // Asgard: Power (Q1), Valor (Q2), Order (Q3). Match!
        // Midgard: Unity (Q3), Resilience (Q2), Balance (??? Not in answers).
        // The requirement table has some terms NOT in the answers (Balance, Harmony, Light, Craft, Stillness, Action, Acceptance).
        // But the "Implementation guidance" says "Each answer adds weighted tags... Realm with highest affinity wins".

        // Let's relax the strict matching and use the scoring.
        // To respect Q3 priority for ties:
        // We can add a small bonus score for Q3 tags.
    }

    // Refined Scoring with Q3 bias
    maxScore = -1;
    bestRealm = REALMS.MIDGARD;

    // Get Q3 tags specifically for tie breaking
    const q3Tags = selectedAnswers[2]?.tags || [];

    for (const realm of Object.values(REALMS)) {
        const traits = REALM_TRAITS[realm];
        let score = 0;

        traits.forEach(trait => {
            if (tagCounts[trait]) {
                score += 10;
                // If this trait is from Q3, add extra weight?
                // Tag names are unique per question in the design so:
                // Q1: Power, Wisdom, Life, Chaos
                // Q2: Valor, Strategy, Resilience, Reflection
                // Q3: Order, Knowledge, Unity, Void

                if (q3Tags.includes(trait)) {
                    score += 1; // Slight boost for Q3 matches
                }
            };
            // Handle "Balance", "Light" etc that aren't in tags?
            // We will assume the provided answers map close enough.
            // Let's only score on tags that EXIST in our questions.
        });

        if (score > maxScore) {
            maxScore = score;
            bestRealm = realm;
        }
    }

    return bestRealm;
}
