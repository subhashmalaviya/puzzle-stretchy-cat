/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * BACKEND GOOGLE ADS CONFIGURATION:
 * Configure your real Google Publisher ID and Ad Unit IDs here.
 */
export const GOOGLE_ADS_CONFIG = {
  // Your Google AdSense / AdMob Publisher ID:
  PUBLISHER_ID: 'ca-pub-2537898330347192',
  // Banner Ad Slot ID:
  BANNER_SLOT_ID: '1234567890',
  // Rewarded Video Ad Slot ID:
  REWARDED_SLOT_ID: '0987654321',
  // Mode: 'live' for production Google Ads
  DEFAULT_MODE: 'live' as 'test' | 'live',
  // Reward duration in seconds added to game clock
  REWARD_EXTRA_SECONDS: 15,
};

export interface AdStats {
  bannerImpressions: number;
  rewardedAdsStarted: number;
  rewardedAdsCompleted: number;
  totalExtraSecondsEarned: number;
  estimatedEarnings: number; // in USD based on industry eCPM
}

export interface AdCampaign {
  id: string;
  title: string;
  tagline: string;
  advertiser: string;
  rating: number;
  downloads: string;
  badge: string;
  ctaText: string;
  iconEmoji: string;
  color: string;
  bgGradient: string;
  description: string;
}

export const AD_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'google-play-pass',
    title: 'Google Play Pass',
    tagline: 'Access 1,000+ top games with ZERO ads & in-app purchases',
    advertiser: 'Google Play',
    rating: 4.9,
    downloads: '50M+',
    badge: 'Special Offer',
    ctaText: 'Claim 1 Month Free',
    iconEmoji: '🎮',
    color: '#4285F4',
    bgGradient: 'from-blue-900/60 via-indigo-950/80 to-black',
    description: 'Enjoy unlimited gaming without any paywalls or ads. Includes top puzzle & casual hits!'
  },
  {
    id: 'cat-paradise-3d',
    title: 'Cat Paradise: Cozy Island 3D',
    tagline: 'Build the ultimate cat sanctuary! Rescue kittens & solve puzzles',
    advertiser: 'Purrfect Games Studio',
    rating: 4.8,
    downloads: '10M+',
    badge: 'Editors\' Choice',
    ctaText: 'Install Free',
    iconEmoji: '🐱',
    color: '#34A853',
    bgGradient: 'from-emerald-900/60 via-teal-950/80 to-black',
    description: 'Stretch, cuddle, and feed over 100 breeds of fluffy cats in breathtaking 3D.'
  },
  {
    id: 'pixel-9-pro',
    title: 'Google Pixel 9 Pro',
    tagline: 'The smartphone built for Gemini AI. Pro photography & speed',
    advertiser: 'Google Store',
    rating: 4.9,
    downloads: 'Hardware',
    badge: 'New Flagship',
    ctaText: 'Explore Pixel 9 Pro',
    iconEmoji: '📱',
    color: '#EA4335',
    bgGradient: 'from-rose-900/60 via-pink-950/80 to-black',
    description: 'Transform your photos with Magic Editor and experience advanced AI anywhere.'
  },
  {
    id: 'gemini-advanced',
    title: 'Google Gemini Advanced',
    tagline: 'Next-gen multimodal AI for coding, writing, and creative ideas',
    advertiser: 'Google AI',
    rating: 4.9,
    downloads: 'Web & Mobile',
    badge: 'Trending AI',
    ctaText: 'Try with 2TB Cloud',
    iconEmoji: '✨',
    color: '#FBBC04',
    bgGradient: 'from-amber-900/60 via-orange-950/80 to-black',
    description: 'Supercharge your coding and reasoning with ultra-fast AI responses and 1M token context.'
  },
  {
    id: 'super-puzzle-quest',
    title: 'Puzzle Quest: Cat Brain IQ',
    tagline: 'Can you reach IQ 160? 2,000+ mind-bending line puzzles',
    advertiser: 'Logic Spark Labs',
    rating: 4.7,
    downloads: '5M+',
    badge: 'Brain Teaser',
    ctaText: 'Play Instantly',
    iconEmoji: '🧩',
    color: '#A142F4',
    bgGradient: 'from-purple-900/60 via-violet-950/80 to-black',
    description: 'Test your spatial problem-solving skills across hundreds of labyrinth stages!'
  }
];

class AdService {
  private publisherId: string;
  private mode: 'test' | 'live';
  private bottomBannerVisible: boolean;
  private isAudioMuted: boolean = false;
  private stats: AdStats;
  private listeners: Set<() => void> = new Set();
  private audioCtx: AudioContext | null = null;

  constructor() {
    const savedPubId = localStorage.getItem('stretchycat_google_pub_id');
    if (!savedPubId || savedPubId === 'ca-pub-3940256099942544') {
      this.publisherId = GOOGLE_ADS_CONFIG.PUBLISHER_ID;
      localStorage.setItem('stretchycat_google_pub_id', GOOGLE_ADS_CONFIG.PUBLISHER_ID);
    } else {
      this.publisherId = savedPubId;
    }
    
    this.mode = GOOGLE_ADS_CONFIG.DEFAULT_MODE;
    this.bottomBannerVisible = localStorage.getItem('stretchycat_bottom_ad_visible') !== 'false';
    
    const savedStats = localStorage.getItem('stretchycat_google_ad_stats');
    if (savedStats) {
      try {
        this.stats = JSON.parse(savedStats);
      } catch {
        this.stats = this.getDefaultStats();
      }
    } else {
      this.stats = this.getDefaultStats();
    }

    if (this.publisherId && this.publisherId.startsWith('ca-pub-')) {
      this.loadGoogleAdSenseScript(this.publisherId);
    }
  }

  private getDefaultStats(): AdStats {
    return {
      bannerImpressions: 0,
      rewardedAdsStarted: 0,
      rewardedAdsCompleted: 0,
      totalExtraSecondsEarned: 0,
      estimatedEarnings: 0,
    };
  }

  private saveStats() {
    localStorage.setItem('stretchycat_google_ad_stats', JSON.stringify(this.stats));
    this.notify();
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Error in adService listener:', err);
      }
    });
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getPublisherId(): string {
    return this.publisherId;
  }

  public setPublisherId(id: string) {
    this.publisherId = id.trim();
    localStorage.setItem('stretchycat_google_pub_id', this.publisherId);
    if (this.mode === 'live' && this.publisherId.startsWith('ca-pub-')) {
      this.loadGoogleAdSenseScript(this.publisherId);
    }
    this.notify();
  }

  public getMode(): 'test' | 'live' {
    return this.mode;
  }

  public setMode(mode: 'test' | 'live') {
    this.mode = mode;
    localStorage.setItem('stretchycat_google_ad_mode', mode);
    if (mode === 'live' && this.publisherId.startsWith('ca-pub-')) {
      this.loadGoogleAdSenseScript(this.publisherId);
    }
    this.notify();
  }

  public isBottomBannerVisible(): boolean {
    return this.bottomBannerVisible;
  }

  public setBottomBannerVisible(visible: boolean) {
    this.bottomBannerVisible = visible;
    localStorage.setItem('stretchycat_bottom_ad_visible', visible ? 'true' : 'false');
    this.notify();
  }

  public getStats(): AdStats {
    return { ...this.stats };
  }

  public recordBannerImpression() {
    this.stats.bannerImpressions += 1;
    // Estimated CPM for banner: ~$1.20 per 1000 impressions
    this.stats.estimatedEarnings = +(this.stats.estimatedEarnings + 0.0012).toFixed(4);
    this.saveStats();
  }

  public recordRewardedAdStart() {
    this.stats.rewardedAdsStarted += 1;
    this.saveStats();
  }

  public recordRewardEarned(extraSeconds: number = GOOGLE_ADS_CONFIG.REWARD_EXTRA_SECONDS) {
    this.stats.rewardedAdsCompleted += 1;
    this.stats.totalExtraSecondsEarned += extraSeconds;
    // Estimated CPM for 30s completed rewarded ad: ~$22.00 per 1000 completed video views
    this.stats.estimatedEarnings = +(this.stats.estimatedEarnings + 0.022).toFixed(4);
    this.saveStats();
  }

  public loadGoogleAdSenseScript(pubId: string) {
    if (typeof window === 'undefined') return;
    const existing = document.getElementById('google-adsense-script');
    if (existing) return;

    try {
      const script = document.createElement('script');
      script.id = 'google-adsense-script';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${pubId}`;
      document.head.appendChild(script);
      console.log('[AdService] Injected Google AdSense script for:', pubId);
    } catch (e) {
      console.error('[AdService] Failed to load Google AdSense script:', e);
    }
  }

  // --- Sound Synthesis Engine via Web Audio API ---
  private getAudioContext(): AudioContext | null {
    if (this.isAudioMuted) return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    return this.isAudioMuted;
  }

  public toggleMute(): boolean {
    this.isAudioMuted = !this.isAudioMuted;
    return this.isAudioMuted;
  }

  public playCountdownTick(pitch: number = 800) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  public playRewardChime() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch {}
  }

  public playPopSound() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  public playReviveFanfare() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const chords = [
        { freqs: [440, 554.37, 659.25], delay: 0 },
        { freqs: [523.25, 659.25, 783.99], delay: 0.15 },
        { freqs: [587.33, 739.99, 880.00], delay: 0.3 },
      ];
      chords.forEach(c => {
        c.freqs.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + c.delay);
          gain.gain.setValueAtTime(0.06, ctx.currentTime + c.delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.delay + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + c.delay);
          osc.stop(ctx.currentTime + c.delay + 0.35);
        });
      });
    } catch {}
  }
}

const adService = new AdService();
export default adService;
