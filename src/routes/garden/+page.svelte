<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import TreeScene from '../../components/TreeScene.svelte';
  import { facebookAuth } from '$lib/services/facebook';
  import { analyzeUserActivity } from '$lib/utils/activityAnalysis';
  import { getCurrentValue, calculateProgress, getGoalTypeLabel, type GoalType } from '$lib/utils/goalUtils';
  import { getAllFoundationMetrics, type FoundationMetrics, type FoundationType } from '$lib/utils/foundationUtils';
  import { getTreeByModel } from '$lib/data/shopTrees';
  import FoundationExplorer from '../../components/FoundationExplorer.svelte';
  import RealmJournal from '../../components/RealmJournal.svelte';
  import MilestonesPanel from '../../components/MilestonesPanel.svelte';
  import GardenHistoryModal from '../../components/GardenHistoryModal.svelte';
  import { getClaimableMilestones } from '$lib/utils/milestones';
  import type { RealmName } from '$lib/utils/realmEffects';
  import { 
    getRealmOrderByRotation, 
    getCameraPositionFromAngle,
    getCameraAngleForRealm,
    lerpAngle,
    DEFAULT_CAMERA_POSITION,
    DEFAULT_CAMERA_TARGET,
    DEFAULT_CAMERA_ANGLE,
    INTRO_TIMING,
    REALMS
  } from '$lib/utils/realmIntro';

  let assignedModel: string | null = null;
  let loading = true;
  let error: string | null = null;
  
  // Activity Densities
  let socialDensity = 0;
  let productiveDensity = 0;
  let activityCount = 0;
  
  // Foundation Data
  let foundationMetrics: Record<string, FoundationMetrics> | null = null;
  let activeFoundation: FoundationMetrics | null = null;
  
  // Screenshot state
  let hideGoalLeavesForScreenshot = false;
  
  // Realm Journal state
  let showRealmJournal = false;
  let selectedRealmForJournal: RealmName | null = null;
  
  // Milestones & Runes state
  let showMilestonesPanel = false;
  let showHistoryModal = false;
  let runePoints = 0;
  let claimedMilestones: Record<string, boolean> = {};
  let facebookData: any = null;
  let claimableCount = 0;
  
  // Goal data
  let userGoal: { goal_type: GoalType; target_value: number } | null = null;
  let currentValue = 0;
  let progress = 0;
  
  // Realm ownership data
  let assignedRealm: RealmName | null = null;
  let purchasedRealms: string[] = [];
  
  // Tree scale - gets the scale value for the current tree model
  $: treeScale = assignedModel ? (getTreeByModel(assignedModel)?.scale ?? 8.5) : 8.5;
  
  // Computed owned realms (assigned + purchased) for TreeScene
  $: ownedRealms = (() => {
    const owned: RealmName[] = [];
    if (assignedRealm) owned.push(assignedRealm);
    purchasedRealms.forEach(r => {
      if (!owned.includes(r as RealmName)) owned.push(r as RealmName);
    });
    return owned;
  })();
  
  let targetUserId: string | null = null;
  let viewerId: string | null = null;
  let targetUserName: string | null = null;
  let isOwner = false;
  
  let selectedDate = ''; // YYYY-MM-DD
  
  // ========== INTRO ANIMATION STATE ==========
  let introActive = true; // Start with intro active
  let introPhase: 'initial' | 'realms' | 'returning' | 'complete' = 'initial';
  let introRealmOrder: RealmName[] = [];
  let introCurrentRealmIndex = -1;
  let introCurrentRealm: RealmName | null = null;
  let introRevealedRealms: RealmName[] = []; // Track all revealed realms (they stay visible)
  let showIntroRealmName = false;
  let introCameraPosition: [number, number, number] = DEFAULT_CAMERA_POSITION;
  let introCameraTarget: [number, number, number] = DEFAULT_CAMERA_TARGET;
  let introAnimationId: number | null = null;
  let introStartTime = 0;
  let previousCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  let targetCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  let currentCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  // ============================================
  
  // ========== OUTRO ANIMATION STATE (Reverse animation for rebirth/terminate) ==========
  let outroActive = false;
  let outroPhase: 'initial' | 'realms' | 'returning' | 'complete' = 'initial';
  let outroRealmOrder: RealmName[] = [];
  let outroCurrentRealmIndex = -1;
  let outroCurrentRealm: RealmName | null = null;
  let outroVisibleRealms: RealmName[] = []; // Realms that are still visible
  let outroAnimationId: number | null = null;
  let outroStartTime = 0;
  let outroType: 'rebirth' | 'terminate' | null = null;
  let outroPreviousCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  let outroTargetCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  let outroCurrentCameraAngle: number = DEFAULT_CAMERA_ANGLE;
  // =====================================================================================
  
  // Reactively update params when URL changes
  $: {
      targetUserId = $page.url.searchParams.get('user');
      selectedDate = $page.url.searchParams.get('date') || '';
      
      // Check for rebirth or terminate params
      const rebirthParam = $page.url.searchParams.get('rebirth');
      const terminateParam = $page.url.searchParams.get('terminate');
      
      if (rebirthParam === 'true' && !outroActive) {
          startOutroAnimation('rebirth');
      } else if (terminateParam === 'true' && !outroActive) {
          startOutroAnimation('terminate');
      }
  }

  // Handle journal open from TreeScene
  function handleOpenJournal(event: CustomEvent<{ realm: RealmName }>) {
    if (!viewerId) return; // Only allow journaling if logged in
    selectedRealmForJournal = event.detail.realm;
    showRealmJournal = true;
  }

  // Trigger load when these change
  $: if (targetUserId || (viewerId && !targetUserId)) {
      // If no target, use viewer. If target, use target.
      const idToLoad = targetUserId || viewerId;
      if (idToLoad) {
          // If viewing self, check ownership flag
          if (idToLoad === viewerId) isOwner = true;
          else isOwner = false;
          
          loadGarden(idToLoad, selectedDate);
      }
  }

  onMount(async () => {
    // Subscribe to Auth
    // Subscribe to Auth
    const unsubscribe = facebookAuth.subscribe(async (state) => {
        if (state.isLoading) return;

        if (state.userData && state.userData.id) {
            viewerId = state.userData.id;
            
            console.log('Auth State Update:', { 
                owner: isOwner, 
                currentModel: assignedModel, 
                newModel: state.userData.assigned_model 
            });

            // If viewing own garden, allow real-time updates from the service (e.g. after model calculation)
            if (isOwner && state.userData.assigned_model && state.userData.assigned_model !== assignedModel) {
                 console.log('Received updated model from auth service:', state.userData.assigned_model);
                 assignedModel = state.userData.assigned_model;
                  // Ensure .glb extension if missing
                 if (assignedModel && !assignedModel.endsWith('.glb')) {
                     assignedModel += '.glb';
                 }
            }
            
        } else if (!state.isLoading && !state.user && !targetUserId) {
             goto('/');
        }
    });

    return () => {
        unsubscribe();
    };
  });

  // ========== INTRO ANIMATION FUNCTIONS ==========
  
  function startIntroAnimation() {
    if (!introActive) return;
    
    // Get realm order sorted by rotation angle (east to west)
    introRealmOrder = getRealmOrderByRotation();
    introCurrentRealmIndex = -1;
    introRevealedRealms = []; // Reset revealed realms
    introPhase = 'initial';
    introStartTime = Date.now();
    currentCameraAngle = DEFAULT_CAMERA_ANGLE;
    
    // Start animation loop
    introAnimationId = requestAnimationFrame(introAnimationLoop);
  }
  
  function introAnimationLoop() {
    if (!introActive) {
      if (introAnimationId) cancelAnimationFrame(introAnimationId);
      return;
    }
    
    const now = Date.now();
    const elapsed = now - introStartTime;
    
    if (introPhase === 'initial') {
      // Initial pause - just show the tree
      if (elapsed >= INTRO_TIMING.INITIAL_PAUSE) {
        introPhase = 'realms';
        introCurrentRealmIndex = 0;
        moveToNextRealm();
      }
    } else if (introPhase === 'realms') {
      // Animate through realms with rotation
      const realmElapsed = now - introStartTime;
      const totalRealmTime = INTRO_TIMING.CAMERA_ROTATE_DURATION + INTRO_TIMING.REALM_DISPLAY_DURATION;
      
      if (realmElapsed < INTRO_TIMING.CAMERA_ROTATE_DURATION) {
        // Camera is rotating
        const t = realmElapsed / INTRO_TIMING.CAMERA_ROTATE_DURATION;
        currentCameraAngle = lerpAngle(previousCameraAngle, targetCameraAngle, t);
        introCameraPosition = getCameraPositionFromAngle(currentCameraAngle);
        showIntroRealmName = false;
      } else if (realmElapsed < totalRealmTime) {
        // Camera arrived, show realm name and add to revealed list
        currentCameraAngle = targetCameraAngle;
        introCameraPosition = getCameraPositionFromAngle(currentCameraAngle);
        showIntroRealmName = true;
        
        // Add current realm to revealed list if not already there
        if (introCurrentRealm && !introRevealedRealms.includes(introCurrentRealm)) {
          introRevealedRealms = [...introRevealedRealms, introCurrentRealm];
        }
      } else {
        // Move to next realm or finish
        introCurrentRealmIndex++;
        if (introCurrentRealmIndex >= introRealmOrder.length) {
          // All realms done, return to default
          introPhase = 'returning';
          previousCameraAngle = currentCameraAngle;
          targetCameraAngle = DEFAULT_CAMERA_ANGLE;
          introStartTime = Date.now();
          showIntroRealmName = false;
          introCurrentRealm = null;
        } else {
          moveToNextRealm();
        }
      }
    } else if (introPhase === 'returning') {
      // Returning to default camera position
      const t = elapsed / INTRO_TIMING.FINAL_RETURN_DURATION;
      if (t < 1) {
        currentCameraAngle = lerpAngle(previousCameraAngle, targetCameraAngle, t);
        introCameraPosition = getCameraPositionFromAngle(currentCameraAngle);
      } else {
        introCameraPosition = DEFAULT_CAMERA_POSITION;
        completeIntro();
        return;
      }
    }
    
    introAnimationId = requestAnimationFrame(introAnimationLoop);
  }
  
  function moveToNextRealm() {
    const realmName = introRealmOrder[introCurrentRealmIndex];
    introCurrentRealm = realmName;
    previousCameraAngle = currentCameraAngle;
    targetCameraAngle = getCameraAngleForRealm(realmName);
    introStartTime = Date.now();
    showIntroRealmName = false;
  }
  
  function skipIntro() {
    if (introAnimationId) {
      cancelAnimationFrame(introAnimationId);
    }
    completeIntro();
  }
  
  function completeIntro() {
    introActive = false;
    introPhase = 'complete';
    introCurrentRealm = null;
    introRevealedRealms = []; // Clear revealed realms
    showIntroRealmName = false;
    introCameraPosition = DEFAULT_CAMERA_POSITION;
    introCameraTarget = DEFAULT_CAMERA_TARGET;
    if (introAnimationId) {
      cancelAnimationFrame(introAnimationId);
      introAnimationId = null;
    }
  }
  
  // Start intro when model is loaded (but not if outro is active)
  $: if (assignedModel && introActive && introPhase === 'initial' && !introAnimationId && !outroActive) {
    startIntroAnimation();
  }
  
  // ========== OUTRO ANIMATION FUNCTIONS (Reverse of intro) ==========
  // Outro timing - mirrors intro timing
  const OUTRO_TIMING = {
    INITIAL_PAUSE: 500,              // Brief pause before starting
    CAMERA_ROTATE_DURATION: 1000,    // Time to rotate camera to each realm
    REALM_DISPLAY_DURATION: 800,     // Time to show realm before it vanishes
    FINAL_RETURN_DURATION: 1000,     // Time to return to default position
  };
  
  function startOutroAnimation(type: 'rebirth' | 'terminate') {
    // Skip intro if it's running
    if (introActive) {
      skipIntro();
    }
    
    outroType = type;
    outroActive = true;
    outroPhase = 'initial';
    
    // Get realm order sorted by rotation (same as intro, realms will vanish in order)
    outroRealmOrder = getRealmOrderByRotation();
    outroVisibleRealms = [...outroRealmOrder]; // All visible initially
    outroCurrentRealmIndex = -1;
    outroCurrentRealm = null;
    outroStartTime = Date.now();
    
    // Start from default camera angle
    outroCurrentCameraAngle = DEFAULT_CAMERA_ANGLE;
    outroPreviousCameraAngle = DEFAULT_CAMERA_ANGLE;
    outroTargetCameraAngle = DEFAULT_CAMERA_ANGLE;
    
    // Use intro camera variables so TreeScene receives updates
    introCameraPosition = DEFAULT_CAMERA_POSITION;
    introCameraTarget = DEFAULT_CAMERA_TARGET;
    
    // Clear URL params
    window.history.replaceState({}, '', '/garden');
    
    // Start animation loop
    outroAnimationId = requestAnimationFrame(outroAnimationLoop);
  }
  
  function outroMoveToNextRealm() {
    const realmName = outroRealmOrder[outroCurrentRealmIndex];
    outroCurrentRealm = realmName;
    outroPreviousCameraAngle = outroCurrentCameraAngle;
    outroTargetCameraAngle = getCameraAngleForRealm(realmName);
    outroStartTime = Date.now();
  }
  
  function outroAnimationLoop() {
    if (!outroActive) {
      if (outroAnimationId) cancelAnimationFrame(outroAnimationId);
      return;
    }
    
    const now = Date.now();
    const elapsed = now - outroStartTime;
    
    if (outroPhase === 'initial') {
      // Initial pause - show all realm names
      if (elapsed >= OUTRO_TIMING.INITIAL_PAUSE) {
        outroPhase = 'realms';
        outroCurrentRealmIndex = 0;
        outroMoveToNextRealm();
      }
    } else if (outroPhase === 'realms') {
      // Animate through realms - camera rotates, then realm vanishes
      const realmElapsed = now - outroStartTime;
      const totalRealmTime = OUTRO_TIMING.CAMERA_ROTATE_DURATION + OUTRO_TIMING.REALM_DISPLAY_DURATION;
      
      if (realmElapsed < OUTRO_TIMING.CAMERA_ROTATE_DURATION) {
        // Camera is rotating to this realm
        const t = realmElapsed / OUTRO_TIMING.CAMERA_ROTATE_DURATION;
        outroCurrentCameraAngle = lerpAngle(outroPreviousCameraAngle, outroTargetCameraAngle, t);
        introCameraPosition = getCameraPositionFromAngle(outroCurrentCameraAngle);
      } else if (realmElapsed < totalRealmTime) {
        // Camera arrived, realm is visible, about to vanish
        outroCurrentCameraAngle = outroTargetCameraAngle;
        introCameraPosition = getCameraPositionFromAngle(outroCurrentCameraAngle);
      } else {
        // Remove this realm from visible list (it vanishes)
        if (outroCurrentRealm) {
          outroVisibleRealms = outroVisibleRealms.filter(r => r !== outroCurrentRealm);
        }
        
        // Move to next realm or finish
        outroCurrentRealmIndex++;
        if (outroCurrentRealmIndex >= outroRealmOrder.length) {
          // All realms done, return to default position
          outroPhase = 'returning';
          outroPreviousCameraAngle = outroCurrentCameraAngle;
          outroTargetCameraAngle = DEFAULT_CAMERA_ANGLE;
          outroStartTime = Date.now();
          outroCurrentRealm = null;
        } else {
          outroMoveToNextRealm();
        }
      }
    } else if (outroPhase === 'returning') {
      // Returning to default camera position
      const t = Math.min(1, elapsed / OUTRO_TIMING.FINAL_RETURN_DURATION);
      outroCurrentCameraAngle = lerpAngle(outroPreviousCameraAngle, outroTargetCameraAngle, t);
      introCameraPosition = getCameraPositionFromAngle(outroCurrentCameraAngle);
      
      if (t >= 1) {
        introCameraPosition = DEFAULT_CAMERA_POSITION;
        completeOutro();
        return;
      }
    }
    
    outroAnimationId = requestAnimationFrame(outroAnimationLoop);
  }
  
  async function completeOutro() {
    if (outroAnimationId) {
      cancelAnimationFrame(outroAnimationId);
      outroAnimationId = null;
    }
    
    // Perform database operations after animation
    if (outroType === 'rebirth') {
      try {
        if (viewerId) {
          // First, get current purchased trees
          const { data: profileData } = await supabase
            .from('profiles')
            .select('purchased_trees')
            .eq('id', viewerId)
            .single();
          
          const currentPurchased = profileData?.purchased_trees || ['tree/1-young-oak-seedling.glb'];
          
          // Add sprouting-life.glb to purchased trees if not already owned
          const sproutingLifeModel = 'sprouting-life.glb';
          const updatedPurchased = currentPurchased.includes(sproutingLifeModel)
            ? currentPurchased
            : [...currentPurchased, sproutingLifeModel];
          
          await supabase
            .from('profiles')
            .update({
              assigned_model: sproutingLifeModel,
              purchased_trees: updatedPurchased,
              updated_at: new Date().toISOString()
            })
            .eq('id', viewerId);
        }
      } catch (e) {
        console.error('Error updating tree:', e);
      }
      // Don't logout, just redirect to home
    } else if (outroType === 'terminate') {
      try {
        if (viewerId) {
          await supabase.from('user_goals').delete().eq('user_id', viewerId);
          await supabase.from('garden_history').delete().eq('user_id', viewerId);
          await supabase.from('realm_journals').delete().eq('user_id', viewerId);
          await supabase.from('profiles').delete().eq('id', viewerId);
        }
      } catch (e) {
        console.error('Error deleting data:', e);
      }
      facebookAuth.logout();
    }
    
    // Reset state
    outroActive = false;
    outroPhase = 'complete';
    outroVisibleRealms = [];
    outroCurrentRealm = null;
    outroType = null;
    
    // Redirect to home
    setTimeout(() => {
      goto('/');
    }, 500);
  }
  
  // ================================================

  async function saveDailySnapshot() {
      if (!viewerId || !facebookData) return;
      
      const today = new Date().toISOString().split('T')[0];
      
      try {
          const { error } = await supabase
              .from('garden_history')
              .upsert({
                  user_id: viewerId,
                  snapshot_date: today,
                  facebook_data: facebookData,
                  rune_points: runePoints,
                  assigned_model: assignedModel,
                  // weather_auto and weather_manual might be needed if I had access to them here
              }, { onConflict: 'user_id, snapshot_date' });
              
          if (error) throw error;
          console.log('Daily snapshot saved');
      } catch (e) {
          console.error('Error saving daily snapshot:', e);
      }
  }

  async function loadGarden(userId: string, date?: string) {
      if (!userId) return; // Safety
      
      loading = true;
      error = null;
      
      // Fetch user's goal first
      await fetchUserGoal(userId);
      
      try {
          let userData: any = null;

          if (date) {
              // Fetch History
              console.log(`Fetching history for ${userId} on ${date}`);
              const { data, error: histError } = await supabase
                  .from('garden_history')
                  .select('facebook_data, weather_auto, weather_manual, rune_points, assigned_model')
                  .eq('user_id', userId)
                  .eq('snapshot_date', date)
                  .single();
              
              if (histError) {
                  // User requested: "logically I should not go to this date if no garden present"
                  // "I should simply be on home page with a error message"
                  console.warn('History not found, redirecting home');
                  goto(`/?history_error=No garden grew on ${date}`);
                  return;
              } else {
                  userData = data.facebook_data;
                  // If viewing history, use historical rune points and model if available
                  if (data.rune_points !== undefined) runePoints = data.rune_points;
                  if (data.assigned_model) assignedModel = data.assigned_model;
              }
          } 
          
          // Always fetch profile to get the assigned_model and current name
          const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

           if (profileError) throw profileError;
           
           if (profile) {
               targetUserName = profile.username || profile.facebook_data?.name || 'Unknown';
               
               // Load realm ownership data (always load, not just for current day)
               assignedRealm = profile.realm || null;
               purchasedRealms = profile.purchased_realms || [];
               
               // Only use profile data if NOT viewing history
               if (!date) {
                   assignedModel = profile.assigned_model || 'tree/1-young-oak-seedling.glb';
                   runePoints = profile.rune_points || 0;
                   claimedMilestones = profile.milestones_claimed || {};
                   userData = profile.facebook_data;
               }
               
               if (assignedModel && !assignedModel.endsWith('.glb')) {
                    assignedModel += '.glb';
               }
           }

           if (userData) {
                // Store facebook data for milestones
                facebookData = userData;
                
                // Calculate claimable milestones
                const claimable = getClaimableMilestones(userData, claimedMilestones);
                claimableCount = claimable.length;
                
                const scores = analyzeUserActivity(userData);
                socialDensity = scores.socialDensity;
                productiveDensity = scores.productiveDensity;

                // Extract Posts Count (proxy for Life Activity)
                const posts = userData.additional_data?.posts?.data || [];
                activityCount = posts.length; 
                console.log('Activity (Posts) Data:', posts);

                // Calculate foundation metrics
                foundationMetrics = getAllFoundationMetrics(userData);

                // Calculate goal progress if goal exists
                if (userGoal) {
                    currentValue = getCurrentValue(userGoal.goal_type, userData);
                    progress = calculateProgress(currentValue, userGoal.target_value);
                }

                // Save snapshot if owner and current day
                if (isOwner && !date) {
                    saveDailySnapshot();
                }
           }

      } catch (e: any) {
          console.error('Error loading garden:', e);
          error = e.message;
          assignedModel = 'generated_tree_v1.glb';
      } finally {
          loading = false;
      }
  }

  function captureSnapshot() {
    try {
      // Find the canvas element (Threlte creates a canvas)
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }

      // Hide goal leaves before screenshot
      hideGoalLeavesForScreenshot = true;

      // For WebGL canvases, we need to wait a frame for the render to complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            // Convert canvas to blob
            canvas.toBlob((blob) => {
              // Restore goal leaves after screenshot
              hideGoalLeavesForScreenshot = false;
              
              if (!blob) {
                console.error('Failed to create blob from canvas');
                // Try alternative method using toDataURL
                try {
                  const dataUrl = canvas.toDataURL('image/png');
                  const link = document.createElement('a');
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const filename = `yggdrasil-garden-${timestamp}.png`;
                  
                  link.href = dataUrl;
                  link.download = filename;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  console.error('Alternative method also failed:', e);
                }
                return;
              }

              // Create download link
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
              const filename = `yggdrasil-garden-${timestamp}.png`;
              
              link.href = url;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 'image/png');
          } catch (e) {
            // Restore goal leaves on error
            hideGoalLeavesForScreenshot = false;
            console.error('Error in delayed capture:', e);
          }
        });
      });
    } catch (e) {
      // Restore goal leaves on error
      hideGoalLeavesForScreenshot = false;
      console.error('Error capturing snapshot:', e);
    }
  }

  async function fetchUserGoal(userId: string) {
      try {
          const { data, error } = await supabase
              .from('user_goals')
              .select('goal_type, target_value')
              .eq('user_id', userId)
              .single();

          if (!error && data) {
              userGoal = data;
          }
      } catch (e) {
          console.error('Error fetching goal:', e);
      }
  }

  // Handle milestone claim updates

  function handleMilestoneUpdate(event: CustomEvent<{ runePoints: number; claimedMilestones: Record<string, boolean> }>) {
      runePoints = event.detail.runePoints;
      claimedMilestones = event.detail.claimedMilestones;
      // Recalculate claimable count
      if (facebookData) {
          const claimable = getClaimableMilestones(facebookData, claimedMilestones);
          claimableCount = claimable.length;
      }
      // Save snapshot immediately
      if (isOwner && !selectedDate) {
          saveDailySnapshot();
      }
  }

  // Handle Whispers Completion (Increment Rune Points)
  async function handleWhispersComplete() {
    if (!isOwner || selectedDate) return; // Only owner can earn points
    
    runePoints += 1;
    
    // Optimistic update done, now save to DB
    try {
      await supabase
        .from('profiles')
        .update({ rune_points: runePoints })
        .eq('id', viewerId);
        
      console.log('Rune points updated:', runePoints);
    } catch (e) {
      console.error('Error updating rune points:', e);
      // Revert on error? Or just let it slide for UX
    }
  }
</script>

<div class="w-full h-screen bg-black overflow-hidden relative">
  
  <!-- Skip Intro Button -->
  {#if introActive && !outroActive}
    <div class="absolute top-6 right-6 z-50">
      <button
        on:click={skipIntro}
        class="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/30 hover:bg-white/20 hover:border-white/50 transition-all duration-300 text-white font-medium flex items-center gap-2 group"
      >
        <span>Skip</span>
        <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>
    
    <!-- Intro Progress Indicator (hidden during outro) -->
    <div class="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      <div class="text-white/60 text-sm">
        {#if introPhase === 'initial'}
          Entering the Nine Realms...
        {:else if introPhase === 'realms' && introCurrentRealm}
          Discovering {introCurrentRealm}
        {:else if introPhase === 'returning'}
          Returning to Yggdrasil...
        {/if}
      </div>
      <div class="flex gap-2">
        {#each Array(9) as _, i}
          <div 
            class="w-2 h-2 rounded-full transition-all duration-300 {i < introCurrentRealmIndex ? 'bg-amber-400' : i === introCurrentRealmIndex ? 'bg-amber-400 animate-pulse scale-125' : 'bg-white/30'}"
          ></div>
        {/each}
      </div>
    </div>
  {/if}
  
  <!-- Overlay UI (hidden during intro and outro) -->
  {#if !introActive && !outroActive}
  <div class="absolute top-0 left-0 p-6 z-10 text-white pointer-events-none w-full flex justify-between items-start">
    <div>
        <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
            {#if selectedDate}
                {isOwner ? 'My Past Garden' : `${targetUserName}'s Past Garden`}
                <span class="block text-sm font-normal text-gray-400 mt-1">{selectedDate}</span>
            {:else}
                {#if isOwner}
                    My Garden
                {:else}
                    {targetUserName ? `${targetUserName}'s Garden` : 'Garden'}
                {/if}
            {/if}
            </h1>
        </div>
        <p class="text-sm text-gray-300">
        {#if loading}
            Loading tree...
        {:else if error}
            <span class="text-red-400">{error}</span>
        {:else}
            <span class="text-xs text-gray-400">
            Activity (Posts): {activityCount} | Social: {socialDensity.toFixed(2)} | Professional: {productiveDensity.toFixed(2)}
            </span>
        {/if}
        </p>
    </div>
    
    <!-- Action Buttons (only show on own current garden) -->
    {#if isOwner && !selectedDate}
      <div class="flex flex-col gap-2 pointer-events-auto">
        <!-- Rune Points & Milestones Button -->
        <button
          on:click={() => showMilestonesPanel = true}
          class="relative w-24 h-12 flex items-center justify-center gap-2 bg-amber-500/10 backdrop-blur-md rounded-full border border-amber-500/30 hover:bg-amber-500/20 hover:border-amber-400 transition-all duration-300"
          title="View Milestones"
        >
          <span class="text-xl text-amber-400">ᚱ</span>
          <span class="text-amber-400 font-bold">{runePoints}</span>
          {#if claimableCount > 0}
            <span class="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              {claimableCount}
            </span>
          {/if}
        </button>

        <!-- Shop Button -->
        <a
          href="/shop"
          class="w-24 h-12 flex items-center justify-center gap-2 bg-emerald-500/10 backdrop-blur-md rounded-full border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-300"
          title="Tree Shop"
        >
          <span class="text-lg">🌳</span>
          <span class="text-emerald-400 text-sm font-medium">Shop</span>
        </a>

        <!-- Snapshot Button -->
        <button
          on:click={captureSnapshot}
          class="w-24 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300 text-white group"
          title="Download Snapshot"
        >
          <svg class="w-6 h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    {/if}
  </div>
  {/if}
  <div class="w-full h-full" style="pointer-events: auto;">
    {#if assignedModel}
      <TreeScene 
        modelName={assignedModel}
        {treeScale}
        socialDensity={socialDensity}
        productiveDensity={productiveDensity}
        goalProgress={progress}
        {currentValue}
        targetValue={userGoal?.target_value || 0}
        goalType={userGoal?.goal_type || null}
        showRealmMarkers={true}
        hideGoalLeaves={hideGoalLeavesForScreenshot}
        hideOverlays={showRealmJournal || showMilestonesPanel}
        introMode={introActive}
        {introCurrentRealm}
        {introRevealedRealms}
        {showIntroRealmName}
        {introCameraPosition}
        {introCameraTarget}
        outroMode={outroActive}
        {outroVisibleRealms}
        {outroCurrentRealm}
        {ownedRealms}
        on:openJournal={handleOpenJournal}
        on:whispersComplete={handleWhispersComplete}
      />
    {/if}
  </div>

  <!-- Realm Journal Modal (hidden during intro and outro) -->
  {#if selectedRealmForJournal && viewerId && !introActive && !outroActive}
    <RealmJournal 
      realm={selectedRealmForJournal}
      userId={viewerId}
      isOpen={showRealmJournal}
      on:close={() => { showRealmJournal = false; selectedRealmForJournal = null; }}
    />
  {/if}

  <!-- Foundation Markers (Left Sidebar) - hidden during intro and outro -->
  {#if foundationMetrics && !loading && !introActive && !outroActive}
    <div class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-20">
      
      <!-- Branches (Expression) -->
      <button 
        class="group relative flex items-center justify-center w-14 h-14 rounded-full bg-black/40 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-900/40 transition-all duration-300 backdrop-blur-sm"
        on:click={() => activeFoundation = foundationMetrics?.expression || null}
        title="Expression (Branches)"
      >
        <span class="text-2xl text-blue-400 group-hover:text-blue-200 group-hover:scale-110 transition-transform">
          {foundationMetrics.expression.rune}
        </span>
        <span class="absolute left-full ml-4 px-3 py-1 bg-black/80 rounded text-xs text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-blue-500/20">
          Expression
        </span>
      </button>

      <!-- Trunk (Connection) -->
      <button 
        class="group relative flex items-center justify-center w-14 h-14 rounded-full bg-black/40 border border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/40 transition-all duration-300 backdrop-blur-sm"
        on:click={() => activeFoundation = foundationMetrics?.connection || null}
        title="Connection (Trunk)"
      >
        <span class="text-2xl text-emerald-400 group-hover:text-emerald-200 group-hover:scale-110 transition-transform">
          {foundationMetrics.connection.rune}
        </span>
        <span class="absolute left-full ml-4 px-3 py-1 bg-black/80 rounded text-xs text-emerald-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-emerald-500/20">
          Connection
        </span>
      </button>

      <!-- Roots (Memory) -->
      <button 
        class="group relative flex items-center justify-center w-14 h-14 rounded-full bg-black/40 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-900/40 transition-all duration-300 backdrop-blur-sm"
        on:click={() => activeFoundation = foundationMetrics?.memory || null}
        title="Memory (Roots)"
      >
        <span class="text-2xl text-amber-400 group-hover:text-amber-200 group-hover:scale-110 transition-transform">
          {foundationMetrics.memory.rune}
        </span>
        <span class="absolute left-full ml-4 px-3 py-1 bg-black/80 rounded text-xs text-amber-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-amber-500/20">
          Memory
        </span>
      </button>

    </div>
  {/if}

  <!-- Foundation Explorer Panel - hidden during intro and outro -->
  {#if activeFoundation && !introActive && !outroActive}
    <FoundationExplorer 
      metrics={activeFoundation} 
      on:close={() => activeFoundation = null} 
    />
  {/if}

  <!-- Milestones Panel - hidden during intro and outro -->
  {#if viewerId && !introActive && !outroActive}
    <MilestonesPanel 
      {facebookData}
      userId={viewerId}
      {claimedMilestones}
      {runePoints}
      isOpen={showMilestonesPanel}
      on:close={() => showMilestonesPanel = false}
      on:update={handleMilestoneUpdate}
    />
  {/if}

  <!-- History Modal - hidden during intro and outro -->
  {#if viewerId && !introActive && !outroActive}
    <GardenHistoryModal
        userId={viewerId}
        isOpen={showHistoryModal}
        on:close={() => showHistoryModal = false}
        on:select={(e) => {
            goto(`?user=${viewerId}&date=${e.detail.date}`);
        }}
    />
  {/if}

  <!-- Back to Home button - hidden during intro and outro -->
  {#if !introActive && !outroActive}
  <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
      <a href="/" class="px-6 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 hover:bg-white/20 transition text-white">
          Back to Home
      </a>
  </div>
  {/if}
</div>
