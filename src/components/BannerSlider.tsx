import React, { useState, useEffect, useRef } from 'react';
import { FarmBanner } from '../types/farm';
import { ChevronLeft, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';

interface BannerSliderProps {
  banners: FarmBanner[];
  lang: 'en' | 'ur';
}

export const BannerSlider: React.FC<BannerSliderProps> = ({ banners, lang }) => {
  const isUr = lang === 'ur';
  const activeBanners = banners.filter((b) => b.active !== false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = activeBanners.length;

  useEffect(() => {
    if (totalSlides <= 1 || isHovered) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 4500);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [totalSlides, isHovered]);

  if (totalSlides === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  return (
    <div
      className="relative w-full overflow-hidden rounded-3xl border border-[#d4af37]/35 shadow-2xl bg-[#051a10] select-none group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-roledescription="carousel"
      aria-label="Farm Banner Slider"
    >
      {/* Aspect Ratio Container (Clean clear display size) */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 lg:h-72 overflow-hidden bg-black/60">
        {/* Slides Track */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {activeBanners.map((banner, index) => (
            <div
              key={banner.id || index}
              className="relative h-full w-full shrink-0 overflow-hidden"
            >
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="h-full w-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-1000"
                loading={index === 0 ? 'eager' : 'lazy'}
              />

              {/* Luxury Gradient Overlays for High Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#051a10] via-black/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#051a10]/80 via-transparent to-transparent hidden sm:block" />

              {/* Slide Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-left">
                <div className="max-w-2xl space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#d4af37]/25 border border-[#d4af37]/40 text-[#f3df88] text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    <span>{isUr ? 'سرکاری فارم اپڈیٹ' : 'Official Farm Update'}</span>
                  </div>

                  <h3 className="text-sm sm:text-lg md:text-xl font-extrabold text-[#f4efe6] drop-shadow-md line-clamp-1 font-serif">
                    {banner.title}
                  </h3>

                  {banner.subtitle && (
                    <p className="text-[11px] sm:text-xs text-[#f4efe6]/80 line-clamp-1 max-w-xl drop-shadow">
                      {banner.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Previous Button */}
        {totalSlides > 1 && (
          <button
            onClick={handlePrev}
            aria-label="Previous slide"
            className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#051a10]/75 border border-[#d4af37]/40 text-[#f3df88] shadow-lg hover:bg-[#d4af37] hover:text-[#051a10] transition-all cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-sm active:scale-95 z-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {/* Next Button */}
        {totalSlides > 1 && (
          <button
            onClick={handleNext}
            aria-label="Next slide"
            className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-[#051a10]/75 border border-[#d4af37]/40 text-[#f3df88] shadow-lg hover:bg-[#d4af37] hover:text-[#051a10] transition-all cursor-pointer opacity-80 sm:opacity-0 sm:group-hover:opacity-100 backdrop-blur-sm active:scale-95 z-10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Pagination Dots */}
        {totalSlides > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-4 right-4 flex items-center gap-1.5 z-10">
            {activeBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all rounded-full cursor-pointer ${
                  currentIndex === idx
                    ? 'w-6 h-2 bg-gradient-to-r from-amber-400 to-[#d4af37] shadow-md shadow-[#d4af37]/50'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
