import React, { useState } from 'react';
import { FarmGalleryItem, UserAccount, FarmProfileSettings } from '../types/farm';
import { t } from '../utils/translations';
import {
  Images,
  Video,
  Play,
  Heart,
  Share2,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  Sparkles,
  LayoutGrid,
  List,
  MessageCircle,
  ThumbsUp,
  Award,
  ArrowLeft,
  Phone,
} from 'lucide-react';
import { cloudLikeGalleryItem } from '../services/api';

interface FarmGalleryViewProps {
  user: UserAccount | null;
  items: FarmGalleryItem[];
  farmProfile?: FarmProfileSettings;
  lang: 'en' | 'ur';
  onNavigate: (screen: string) => void;
}

export const FarmGalleryView: React.FC<FarmGalleryViewProps> = ({
  user,
  items,
  farmProfile,
  lang,
  onNavigate,
}) => {
  const strings = t[lang];
  const isUr = lang === 'ur';

  const cleanLocation = (loc?: string): string => {
    if (!loc) return '';
    return loc
      .replace(/,?\s*Sargodha(\s*,?\s*Punjab)?/gi, '')
      .replace(/\bSargodha\b/gi, '')
      .replace(/\(\s*\)/g, '')
      .replace(/^[,\s-]+|[,\s-]+$/g, '')
      .trim();
  };

  // State: Tab Filter ('all' | 'photos' | 'videos')
  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>('all');
  // State: View Mode ('feed' | 'grid')
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');

  // Lightbox Modal for Photo inspection
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Active playing video modal
  const [playingVideo, setPlayingVideo] = useState<FarmGalleryItem | null>(null);

  // Local likes tracking
  const [likedIds, setLikedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('pakhen_gallery_likes');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [localItems, setLocalItems] = useState<FarmGalleryItem[]>(items);

  // Keep localItems synced when items prop updates
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleLike = async (itemId: string) => {
    if (likedIds.has(itemId)) return;

    setLikedIds((prev) => {
      const next = new Set([...prev, itemId]);
      try {
        localStorage.setItem('pakhen_gallery_likes', JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });

    setLocalItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, likesCount: (i.likesCount || 0) + 1 } : i
      )
    );

    try {
      await cloudLikeGalleryItem(itemId);
    } catch {
      // ignore
    }
  };

  const handleShare = async (item: FarmGalleryItem) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: `Check out Pak Hen Farm physical poultry facility: ${item.title}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert(isUr ? 'گیلری کا لنک کاپی کر لیا گیا!' : 'Farm gallery link copied to clipboard!');
    }
  };

  // Filter items based on activeTab and active status
  const visibleItems = localItems.filter((item) => {
    if (!item.active) return false;
    if (activeTab === 'photos') return item.type === 'photo';
    if (activeTab === 'videos') return item.type === 'video';
    return true;
  });

  const photoItems = visibleItems.filter((i) => i.type === 'photo');
  const videoCount = localItems.filter((i) => i.active && i.type === 'video').length;
  const photoCount = localItems.filter((i) => i.active && i.type === 'photo').length;

  const currentLightboxItem = lightboxIndex !== null ? photoItems[lightboxIndex] : null;

  const handlePrevLightbox = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    } else if (lightboxIndex === 0) {
      setLightboxIndex(photoItems.length - 1);
    }
  };

  const handleNextLightbox = () => {
    if (lightboxIndex !== null && lightboxIndex < photoItems.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    } else if (lightboxIndex === photoItems.length - 1) {
      setLightboxIndex(0);
    }
  };

  // Helper to detect and render video
  const renderVideoPlayer = (item: FarmGalleryItem) => {
    const isYouTube = item.mediaUrl.includes('youtube.com') || item.mediaUrl.includes('youtu.be');

    if (isYouTube) {
      let embedUrl = item.mediaUrl;
      if (item.mediaUrl.includes('watch?v=')) {
        const id = item.mediaUrl.split('watch?v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
      } else if (item.mediaUrl.includes('youtu.be/')) {
        const id = item.mediaUrl.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      return (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
          <iframe
            src={embedUrl}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      );
    }

    // Direct MP4 / Video file
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
        <video
          src={item.mediaUrl}
          controls
          autoPlay
          playsInline
          poster={item.thumbnailUrl || '/banners/banner-1.jpg'}
          className="h-full w-full object-contain"
        >
          {isUr ? 'آپ کا براؤزر ویڈیو سپورٹ نہیں کرتا۔' : 'Your browser does not support the video tag.'}
        </video>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb & Back Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3.5 py-1.5 text-xs font-bold text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422] transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{strings.backBtn}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3 py-1 text-[11px] font-bold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{isUr ? '100% مصدقہ فزیکل فارم پروفائل' : '100% Verified Physical Farm Profile'}</span>
          </span>
        </div>
      </div>

      {/* FACEBOOK-STYLE PROFILE CARD & COVER BANNER */}
      <div className="overflow-hidden rounded-3xl border border-[#d4af37]/40 bg-gradient-to-b from-[#0a2618] via-[#051a10] to-[#0a2618] shadow-2xl">
        {/* Cover Photo */}
        <div className="relative h-44 sm:h-64 w-full overflow-hidden bg-[#051a10]">
          <img
            src={farmProfile?.coverUrl || '/banners/banner-1.jpg'}
            alt="Pak Hen Farm Facility Cover"
            className="h-full w-full object-cover object-center brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#051a10] via-black/30 to-black/20" />

          {/* Badge over cover */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-[#d4af37]/60 bg-[#051a10]/85 px-3 py-1 text-xs font-bold text-[#f3df88] backdrop-blur-md shadow-lg">
            <Award className="h-4 w-4 text-[#d4af37]" />
            <span>{isUr ? 'سرکاری فزیکل پولٹری فارم' : 'Official Poultry Facility'}</span>
          </div>
        </div>

        {/* Profile Info Section (Overlapping Facebook Style) */}
        <div className="relative px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-20">
            {/* Avatar & Title */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {/* Profile Avatar */}
              <div className="relative flex h-28 w-28 sm:h-36 sm:w-36 shrink-0 items-center justify-center rounded-full border-4 border-[#051a10] bg-gradient-to-br from-[#0f3b23] to-[#051a10] p-1.5 shadow-2xl shadow-black ring-2 ring-[#d4af37]">
                <img
                  src={farmProfile?.avatar || '/golden-hen.svg'}
                  alt="Pak Hen Farm Official Profile"
                  className="h-full w-full object-contain drop-shadow rounded-full"
                />
                <span
                  title="100% Verified Physical Farm"
                  className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-md border-2 border-[#051a10]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>

              {/* Title & Bio */}
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#f3df88] font-serif">
                    {farmProfile?.farmName || 'Pak Hen Farm'}
                  </h1>
                  <span className="rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 px-2 py-0.5 text-[10px] font-black uppercase text-[#f3df88]">
                    Verified
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#f4efe6]/80 max-w-xl">
                  {isUr && farmProfile?.farmBioUr
                    ? farmProfile.farmBioUr
                    : (farmProfile?.farmBio || 'Real Physical Poultry Farming Across Pakistan • 100% Shariah Mudarabah Partnership')}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-[#f4efe6]/60 pt-1">
                  {farmProfile?.location && farmProfile.location.trim() ? (
                    <>
                      <span className="flex items-center gap-1 text-[#f3df88]">
                        <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span>{farmProfile.location}</span>
                      </span>
                      <span>•</span>
                    </>
                  ) : null}
                  <span className="flex items-center gap-1 text-[#f3df88] font-bold">
                    <Phone className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>Helpline: {farmProfile?.helpline || '03105625924'}</span>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">5,000+ Hens Capacity</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('packages')}
                className="flex items-center gap-1.5 rounded-xl border border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b38f2a] px-4 py-2 text-xs font-black text-[#051a10] shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isUr ? 'پیکج میں شامل ہوں' : 'Join Flock Partner'}</span>
              </button>

              <button
                onClick={() => onNavigate('help')}
                className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/40 bg-[#0a2618] px-3.5 py-2 text-xs font-bold text-[#f3df88] hover:bg-[#0f3422] transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4 w-4 text-[#d4af37]" />
                <span>{isUr ? 'ہیلپ ڈیسک' : 'SOS Support'}</span>
              </button>
            </div>
          </div>

          {/* Facebook-style Tab Navigation Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#d4af37]/20 pt-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/30'
                    : 'text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0f3422]'
                }`}
              >
                <span>{isUr ? 'تمام میڈیا' : 'All Media'}</span>
                <span className="rounded-full bg-[#051a10]/50 px-1.5 py-0.2 text-[10px]">
                  {localItems.filter((i) => i.active).length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('photos')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'photos'
                    ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/30'
                    : 'text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0f3422]'
                }`}
              >
                <Images className="h-3.5 w-3.5" />
                <span>{isUr ? 'تصاویر' : 'Photos'}</span>
                <span className="rounded-full bg-[#051a10]/50 px-1.5 py-0.2 text-[10px]">
                  {photoCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('videos')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'videos'
                    ? 'bg-[#d4af37] text-[#051a10] shadow-md shadow-[#d4af37]/30'
                    : 'text-[#f4efe6]/70 hover:text-[#f4efe6] hover:bg-[#0f3422]'
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>{isUr ? 'ویڈیوز' : 'Videos'}</span>
                <span className="rounded-full bg-rose-500 text-white px-1.5 py-0.2 text-[10px] font-black">
                  {videoCount}
                </span>
              </button>
            </div>

            {/* View Mode Toggle (Feed vs Grid) */}
            <div className="flex items-center gap-1 rounded-xl bg-[#051a10] p-1 border border-[#d4af37]/30">
              <button
                onClick={() => setViewMode('feed')}
                title="Feed View (Facebook Post Style)"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'feed'
                    ? 'bg-[#d4af37]/30 text-[#f3df88] border border-[#d4af37]/50'
                    : 'text-[#f4efe6]/60 hover:text-[#f4efe6]'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isUr ? 'فیڈ ویو' : 'Feed'}</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                title="Grid View (Album Style)"
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#d4af37]/30 text-[#f3df88] border border-[#d4af37]/50'
                    : 'text-[#f4efe6]/60 hover:text-[#f4efe6]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{isUr ? 'گرڈ ویو' : 'Grid'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEED VIEW (Facebook Timeline Post Style) */}
      {viewMode === 'feed' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {visibleItems.length === 0 ? (
            <div className="rounded-3xl border border-[#d4af37]/20 bg-[#0a2618]/60 p-8 text-center text-sm text-[#f4efe6]/60">
              {isUr ? 'اس کیٹیگری میں فی الحال کوئی میڈیا موجود نہیں ہے۔' : 'No media items found in this category.'}
            </div>
          ) : (
            visibleItems.map((item, idx) => (
              <article
                key={`${item.id}_${idx}`}
                className="overflow-hidden rounded-3xl border border-[#d4af37]/35 bg-[#0a2618]/95 shadow-xl transition-all hover:border-[#d4af37]/60"
              >
                {/* Facebook Post Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#d4af37]/15">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#d4af37] bg-[#051a10] p-1 shadow">
                      <img
                        src="/golden-hen.svg"
                        alt="Pak Hen Farm Profile"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-extrabold text-[#f3df88]">
                          Pak Hen Farm
                        </span>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#1877F2]" />
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#f4efe6]/60">
                        <span>{new Date(item.uploadedAt).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <MapPin className="h-3 w-3" />
                          <span>{cleanLocation(item.location) || 'Pak Hen Farm (Facility)'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                      item.type === 'video'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-[#d4af37]/20 text-[#f3df88] border border-[#d4af37]/40'
                    }`}
                  >
                    {item.type === 'video' ? <Video className="h-3 w-3" /> : <Images className="h-3 w-3" />}
                    <span>{item.type.toUpperCase()}</span>
                  </span>
                </div>

                {/* Post Caption / Title */}
                <div className="px-4 sm:px-5 py-3 space-y-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-[#f4efe6]">
                    {isUr && item.titleUr ? item.titleUr : item.title}
                  </h3>
                  {(item.caption || item.captionUr) && (
                    <p className="text-xs text-[#f4efe6]/80 leading-relaxed">
                      {isUr && item.captionUr ? item.captionUr : item.caption}
                    </p>
                  )}
                </div>

                {/* Post Media Content */}
                <div className="relative bg-black/80">
                  {item.type === 'video' ? (
                    <div className="relative aspect-video w-full group overflow-hidden">
                      <video
                        src={item.mediaUrl}
                        controls
                        playsInline
                        poster={item.thumbnailUrl || '/banners/banner-1.jpg'}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        const idx = photoItems.findIndex((p) => p.id === item.id);
                        if (idx >= 0) setLightboxIndex(idx);
                      }}
                      className="relative aspect-video sm:aspect-[16/10] w-full cursor-pointer overflow-hidden group"
                    >
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="flex items-center gap-1.5 rounded-full border border-white/60 bg-black/60 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
                          <Maximize2 className="h-4 w-4" />
                          <span>{isUr ? 'مکمل تصویر دیکھیں' : 'View Full Image'}</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Facebook Post Reaction Bar */}
                <div className="p-4 sm:p-5 border-t border-[#d4af37]/20 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-[#f4efe6]/70">
                    <span className="flex items-center gap-1">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-white">
                        <ThumbsUp className="h-3 w-3" />
                      </span>
                      <strong className="text-[#f4efe6]">{item.likesCount || 0}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
                      <span>{item.viewsCount || 0} {isUr ? 'مناظر' : 'views'}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(item.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                        likedIds.has(item.id)
                          ? 'border border-[#d4af37] bg-[#d4af37] text-[#051a10] shadow-md'
                          : 'border border-[#d4af37]/30 bg-[#051a10] text-[#f3df88] hover:border-[#d4af37] hover:bg-[#0f3422]'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{likedIds.has(item.id) ? (isUr ? 'پسندیدہ' : 'Liked') : (isUr ? 'لائیک کریں' : 'Like')}</span>
                    </button>

                    <button
                      onClick={() => handleShare(item)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#051a10] px-3 py-1.5 text-xs font-bold text-[#f4efe6] hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>{isUr ? 'شیئر' : 'Share'}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {/* GRID VIEW (Photo Album & Video Tile Grid) */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {visibleItems.map((item, idx) => (
            <div
              key={`${item.id}_${idx}`}
              className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-[#d4af37]/30 bg-black/60 shadow-lg cursor-pointer"
              onClick={() => {
                if (item.type === 'video') {
                  setPlayingVideo(item);
                } else {
                  const idx = photoItems.findIndex((p) => p.id === item.id);
                  if (idx >= 0) setLightboxIndex(idx);
                }
              }}
            >
              <img
                src={item.type === 'video' ? (item.thumbnailUrl || '/banners/banner-1.jpg') : item.mediaUrl}
                alt={item.title}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow ${
                      item.type === 'video'
                        ? 'bg-rose-600 text-white'
                        : 'bg-[#d4af37] text-[#051a10]'
                    }`}
                  >
                    {item.type === 'video' ? <Play className="h-2.5 w-2.5 fill-current" /> : <Images className="h-2.5 w-2.5" />}
                    <span>{item.type}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  {item.type === 'video' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-300 font-bold">
                      <Clock className="h-3 w-3" />
                      <span>{item.duration || 'Video'}</span>
                    </div>
                  )}
                  <h4 className="text-xs font-bold text-white line-clamp-1 drop-shadow">
                    {isUr && item.titleUr ? item.titleUr : item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-white/70">
                    <span>{cleanLocation(item.location) || 'Pak Hen Farm'}</span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-2.5 w-2.5" />
                      <span>{item.likesCount || 0}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {currentLightboxItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-bold text-[#f3df88]">
                {lightboxIndex! + 1} / {photoItems.length}
              </span>
              <span className="text-xs text-white/70">
                {cleanLocation(currentLightboxItem.location) || 'Pak Hen Farm Facility'}
              </span>
            </div>

            <button
              onClick={() => setLightboxIndex(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Lightbox Image Container & Navigation Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-4" onClick={(e) => e.stopPropagation()}>
            {photoItems.length > 1 && (
              <button
                onClick={handlePrevLightbox}
                className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 transition-all cursor-pointer shadow-xl"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <img
              src={currentLightboxItem.mediaUrl}
              alt={currentLightboxItem.title}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
            />

            {photoItems.length > 1 && (
              <button
                onClick={handleNextLightbox}
                className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 transition-all cursor-pointer shadow-xl"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Lightbox Caption & Details Footer */}
          <div
            className="mx-auto max-w-3xl w-full text-center space-y-1.5 p-3 rounded-2xl bg-[#051a10]/80 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm sm:text-base font-extrabold text-[#f3df88]">
              {isUr && currentLightboxItem.titleUr ? currentLightboxItem.titleUr : currentLightboxItem.title}
            </h3>
            {currentLightboxItem.caption && (
              <p className="text-xs text-white/80 max-w-2xl mx-auto">
                {isUr && currentLightboxItem.captionUr ? currentLightboxItem.captionUr : currentLightboxItem.caption}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 pt-1">
              <button
                onClick={() => handleLike(currentLightboxItem.id)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>{likedIds.has(currentLightboxItem.id) ? 'Liked' : 'Like'} ({currentLightboxItem.likesCount || 0})</span>
              </button>
              <button
                onClick={() => handleShare(currentLightboxItem)}
                className="flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED VIDEO PLAYER MODAL */}
      {playingVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPlayingVideo(null)}
        >
          <div
            className="w-full max-w-4xl space-y-4 rounded-3xl bg-[#0a2618] border border-[#d4af37]/40 p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600 text-white">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#f3df88]">
                    {isUr && playingVideo.titleUr ? playingVideo.titleUr : playingVideo.title}
                  </h3>
                  <span className="text-[11px] text-[#f4efe6]/60">{cleanLocation(playingVideo.location) || 'Pak Hen Farm Facility'}</span>
                </div>
              </div>

              <button
                onClick={() => setPlayingVideo(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video Canvas */}
            {renderVideoPlayer(playingVideo)}

            {playingVideo.caption && (
              <p className="text-xs text-[#f4efe6]/80 px-1 leading-relaxed">
                {isUr && playingVideo.captionUr ? playingVideo.captionUr : playingVideo.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
