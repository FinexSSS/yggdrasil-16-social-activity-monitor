export const ELDER_FUTHARK_MAP: Record<string, string> = {
    A: "ᚨ", B: "ᛒ", C: "ᚲ", D: "ᛞ", E: "ᛖ", F: "ᚠ",
    G: "ᚷ", H: "ᚺ", I: "ᛁ", J: "ᛃ", K: "ᚲ", L: "ᛚ",
    M: "ᛗ", N: "ᚾ", O: "ᛟ", P: "ᛈ", Q: "ᚲ",
    R: "ᚱ", S: "ᛋ", T: "ᛏ", U: "ᚢ", V: "ᚹ",
    W: "ᚹ", X: "ᚲᛋ", Y: "ᛃ", Z: "ᛉ"
};

export function toRunes(text: string): string {
    return text
        .toUpperCase()
        .split("")
        .map((char) => ELDER_FUTHARK_MAP[char] || char)
        .join("");
}
