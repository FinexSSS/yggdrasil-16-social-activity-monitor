/**
 * Realm Intro Animation Utilities
 * Handles camera positions and animation logic for the garden intro sequence
 */

import type { RealmName } from './realmEffects';

export interface RealmData {
    name: RealmName;
    rune: string;
    position: [number, number, number];
    angle: number; // Angle in radians from east (0) going counter-clockwise
}

// Calculate angle for each realm based on its position
function calculateAngle(x: number, z: number): number {
    return Math.atan2(z, x);
}

export const REALMS: RealmData[] = [
    // Top tier - Crown of tree
    { name: 'Asgard', rune: 'ᚨᛊᚷᚨᚱᛞ', position: [0, 5, 0], angle: 0 },
    
    // Upper ring - Around the crown
    { name: 'Vanaheim', rune: 'ᚦᚨᚾᚨᚺᛖᛁᛗ', position: [-6, 4, 3], angle: calculateAngle(-6, 3) },
    { name: 'Alfheim', rune: 'ᚨᛚᚠᚺᛖᛁᛗ', position: [6, 4, 3], angle: calculateAngle(6, 3) },
    
    // Middle ring - Around mid trunk  
    { name: 'Midgard', rune: 'ᛗᛁᛞᚷᚨᚱᛞ', position: [0, 3, 6], angle: calculateAngle(0, 6) },
    { name: 'Jötunheim', rune: 'ᛃᛟᛏᚢᚾᚺᛖᛁᛗ', position: [7, 2.5, -2], angle: calculateAngle(7, -2) },
    { name: 'Svartalfheim', rune: 'ᛊᚦᚨᚱᛏᚨᛚᚠᚺᛖᛁᛗ', position: [-7, 2.5, -2], angle: calculateAngle(-7, -2) },
    
    // Lower ring - Around base
    { name: 'Niflheim', rune: 'ᚾᛁᚠᛚᚺᛖᛁᛗ', position: [-5, 1.5, 5], angle: calculateAngle(-5, 5) },
    { name: 'Muspelheim', rune: 'ᛗᚢᛊᛈᛖᛚᚺᛖᛁᛗ', position: [5, 1.5, 5], angle: calculateAngle(5, 5) },
    { name: 'Helheim', rune: 'ᚺᛖᛚᚺᛖᛁᛗ', position: [0, 0.5, 7], angle: calculateAngle(0, 7) },
];

// Fixed camera distance (no zoom)
const CAMERA_DISTANCE = 16;
const CAMERA_HEIGHT = 4;

/**
 * Calculate camera position based on rotation angle around the tree
 * Camera rotates at fixed distance from the center
 */
export function getCameraPositionFromAngle(angle: number): [number, number, number] {
    const x = Math.cos(angle) * CAMERA_DISTANCE;
    const z = Math.sin(angle) * CAMERA_DISTANCE;
    return [x, CAMERA_HEIGHT, z];
}

/**
 * Get the angle the camera should be at to view a specific realm
 * Camera should be on the opposite side of the tree from the realm
 */
export function getCameraAngleForRealm(realmName: RealmName): number {
    const realm = REALMS.find(r => r.name === realmName);
    if (!realm) return 0;
    
    // For Asgard (top), use a nice viewing angle
    if (realm.name === 'Asgard') {
        return Math.PI / 4; // 45 degrees
    }
    
    // Camera should be opposite to the realm (add PI to flip to other side)
    return realm.angle + Math.PI;
}

/**
 * Get realm order sorted by angle for smooth east-to-west rotation
 * Starts from east (angle ~0) and goes counter-clockwise (west)
 */
export function getRealmOrderByRotation(): RealmName[] {
    // Sort realms by their viewing angle (camera position angle)
    const sortedRealms = [...REALMS].sort((a, b) => {
        const angleA = getCameraAngleForRealm(a.name);
        const angleB = getCameraAngleForRealm(b.name);
        return angleA - angleB;
    });
    return sortedRealms.map(r => r.name);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
}

/**
 * Ease in-out cubic for smooth animations
 */
export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpolate angle with shortest path
 */
export function lerpAngle(from: number, to: number, t: number): number {
    // Normalize angles to -PI to PI range
    let diff = to - from;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    
    return from + diff * easeInOutCubic(t);
}

// Animation timing constants
export const INTRO_TIMING = {
    INITIAL_PAUSE: 1500,        // Pause showing just the tree
    CAMERA_ROTATE_DURATION: 1000, // Time to rotate camera to each realm
    REALM_DISPLAY_DURATION: 1200, // Time to display each realm name (shorter since they stay)
    FINAL_RETURN_DURATION: 1200,  // Time to return to default position
};

// Default camera angle (viewing from southeast)
export const DEFAULT_CAMERA_ANGLE = Math.PI / 4; // 45 degrees
export const DEFAULT_CAMERA_POSITION: [number, number, number] = getCameraPositionFromAngle(DEFAULT_CAMERA_ANGLE);
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 2, 0];
