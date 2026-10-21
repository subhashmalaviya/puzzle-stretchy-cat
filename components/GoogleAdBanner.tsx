/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import adService, { AD_CAMPAIGNS, AdCampaign } from '../services/adService';

interface GoogleAdBannerProps {
  onAdClicked?: (campaign: AdCampaign) => void;
}

const GoogleAdBanner: React.FC<GoogleAdBannerProps> = ({ onAdClicked }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentCampaignIndex, setCurrentCampaignIndex] = useState(0);
  const [isAdChoicesOpen, setIsAdChoicesOpen] = useState(false);
  const [mode, setMode] = useState<'test' | 'live'>(adService.getMode());
  const [isBannerVisible, setIsBannerVisible] = useState(adService.isBottomBannerVisible());

  useEffect(() => {
    const unsub = adService.subscribe(() => {
      setMode(adService.getMode());
      setIsBannerVisible(adService.isBottomBannerVisible());
    });
    return () => unsub();
  }, []);

  // Record impression on mount and on campaign rotation
  useEffect(() => {
    if (isBannerVisible && !isCollapsed) {
      adService.recordBannerImpression();
    }
  }, [currentCampaignIndex, isBannerVisible, isCollapsed]);

  // Rotate ads every 16 seconds
  useEffect(() => {
    if (!isBannerVisible || isCollapsed) return;
    const interval = setInterval(() => {
      setCurrentCampaignIndex((prev) => (prev + 1) % AD_CAMPAIGNS.length);
    }, 16000);
    return () => clearInterval(interval);
  }, [isBannerVisible, isCollapsed]);

  if (!isBannerVisible) return null;

  const campaign = AD_CAMPAIGNS[currentCampaignIndex];

  // Collapsed compact bar
  if (isCollapsed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pointer-events-auto">
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-[#121318]/95 hover:bg-[#1f2026] text-white/70 hover:text-white border-t border-x border-white/10 rounded-t-xl px-3 py-1 flex items-center gap-1.5 text-[10px] font-semibold transition-all duration-200 shadow-lg cursor-pointer"
          title="Show Google Ad"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>▲ Google Ads</span>
          <span className="text-white/40 text-[9px]">(Expand)</span>
        </button>
      </div>
    );
  }

  return (
    <aside 
      aria-label="Sponsored advertisement"
      className="fixed bottom-0 left-0 right-0 z-20 pointer-events-auto select-none bg-[#121318]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-300"
    >
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-2 sm:gap-3 h-[48px] sm:h-[54px]">
        {/* Left: Google Ads & AdChoices badge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center border border-amber-400/40 bg-amber-400/10 text-amber-300 rounded px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
            Ad
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsAdChoicesOpen(!isAdChoicesOpen)}
              className="text-white/40 hover:text-white/80 p-0.5 rounded transition-colors text-[10px] flex items-center"
              title="AdChoices - Why this ad?"
              aria-label="Ad Choices Information"
            >
              <svg className="w-3 h-3 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </button>

            {/* AdChoices popup */}
            {isAdChoicesOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1e2029] border border-white/15 rounded-xl p-2.5 shadow-2xl z-50 text-left text-xs text-white animate-in fade-in duration-150">
                <div className="flex items-center justify-between font-bold text-[11px] text-white/90 border-b border-white/10 pb-1 mb-1.5">
                  <span className="flex items-center gap-1">
                    <span className="text-[#4285F4]">Google</span> Ads
                  </span>
                  <button 
                    onClick={() => setIsAdChoicesOpen(false)}
                    className="text-white/50 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[10px] text-white/70 leading-relaxed">
                  Ads help keep Stretchy Cat free to play for everyone. Powered by Google Ads.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Center: Dynamic Sponsored Content */}
        <div 
          onClick={() => {
            onAdClicked?.(campaign);
            adService.playPopSound();
          }}
          className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer group"
          title={`Click to view ${campaign.title}`}
        >
          {/* Ad Icon */}
          <div 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px] sm:text-[20px] shadow-md border border-white/15 transition-transform duration-200 group-hover:scale-105"
            style={{ backgroundColor: `${campaign.color}25` }}
          >
            {campaign.iconEmoji}
          </div>

          {/* Ad Text details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-white font-bold text-[11px] sm:text-[13px] truncate group-hover:text-amber-300 transition-colors">
                {campaign.title}
              </span>
              <span className="hidden md:inline bg-white/10 text-white/70 text-[9px] px-1.5 py-0.2 rounded font-medium">
                {campaign.badge}
              </span>
              <span className="hidden lg:flex items-center text-amber-400 text-[10px] gap-0.5">
                ★ {campaign.rating}
              </span>
            </div>
            <p className="text-white/60 text-[9.5px] sm:text-[11px] truncate leading-tight mt-0.5">
              {campaign.tagline}
            </p>
          </div>
        </div>

        {/* Right: Call To Action button & Collapse controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              onAdClicked?.(campaign);
              adService.playPopSound();
            }}
            className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full font-bold text-[10px] sm:text-[12px] text-white shadow-md transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap"
            style={{ 
              backgroundColor: campaign.color,
              boxShadow: `0 0 12px ${campaign.color}60`
            }}
          >
            {campaign.ctaText}
          </button>

          {/* Collapse button */}
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors text-[11px]"
            title="Minimize Banner"
            aria-label="Minimize Ad Banner"
          >
            ▼
          </button>
        </div>
      </div>
    </aside>
  );
};

export default GoogleAdBanner;
