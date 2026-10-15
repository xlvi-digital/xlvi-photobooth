import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ScreenLanding from './components/ScreenLanding.jsx';
import ScreenSelectFrame from './components/ScreenSelectFrame.jsx';
import ScreenCamera from './components/ScreenCamera.jsx';
import ScreenPreview from './components/ScreenPreview.jsx';
import ScreenGreeting from './components/ScreenGreeting.jsx';
import ScreenVoiceNote from './components/ScreenVoiceNote.jsx';
import ScreenSuccess from './components/ScreenSuccess.jsx';
import ScreenGallery from './components/ScreenGallery.jsx';
import HeaderStepper from './components/HeaderStepper.jsx';
import EventBackground from './components/EventBackground.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminLoginView from './components/admin/AdminLoginView.jsx';

import { EVENT_DATA, INITIAL_GALLERY, FRAMES } from './data/eventData.js';
import { fetchEventBySlug, fetchAllEvents } from './services/eventService.js';
import { fetchActiveFramesForEvent } from './services/frameService.js';
import {
  createSubmission,
  fetchSubmissionsForEvent,
  getGalleryErrorKind,
  getGalleryErrorMessage,
} from './services/submissionService.js';
import { getCurrentAdmin, signOutAdmin, getStoredAdminSync } from './services/authService.js';
import { AlertCircle, CalendarX2, ArrowLeft, Shield, Sparkles } from 'lucide-react';

/**
 * Route parser supporting HTML5 paths, hash routes, and query parameters
 */
function parseRoute() {
  if (typeof window === 'undefined') return { mode: 'photobooth', slug: null };

  const pathname = window.location.pathname || '';
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  // 1. Admin mode detection
  if (pathname.startsWith('/admin') || hash.includes('admin') || pathname.includes('/admin')) {
    return { mode: 'admin', slug: null };
  }

  // 2. Query param: ?event=slug or ?slug=slug
  const searchParams = new URLSearchParams(search);
  const querySlug = searchParams.get('event') || searchParams.get('slug');
  if (querySlug) {
    return { mode: 'photobooth', slug: querySlug.trim().toLowerCase() };
  }

  // 3. Path regex: /event/:slug or /photobooth/:slug
  const pathMatch = pathname.match(/\/(?:event|photobooth)\/([a-zA-Z0-9_-]+)/i);
  if (pathMatch && pathMatch[1]) {
    return { mode: 'photobooth', slug: pathMatch[1].trim().toLowerCase() };
  }

  // 4. Hash regex: #/event/:slug or #event/:slug or #slug
  const hashMatch = hash.match(/#(?:(?:\/)?(?:event|photobooth)\/)?([a-zA-Z0-9_-]+)/i);
  if (hashMatch && hashMatch[1] && hashMatch[1] !== 'admin') {
    return { mode: 'photobooth', slug: hashMatch[1].trim().toLowerCase() };
  }

  return { mode: 'photobooth', slug: null };
}

export default function App() {
  // Routing state
  const [routeInfo, setRouteInfo] = useState(() => parseRoute());
  const viewMode = routeInfo.mode;
  const currentSlug = routeInfo.slug;

  // Admin Auth State - initialized synchronously
  const [adminUser, setAdminUser] = useState(() => getStoredAdminSync());

  // Dynamic Event State from Supabase
  const [activeEvent, setActiveEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState(null); // null | 'not_found' | 'inactive' | 'load_error'

  // Frames & Media State
  const [framesList, setFramesList] = useState(FRAMES);
  const [selectedFrame, setSelectedFrame] = useState(() => FRAMES[0]);

  // Photobooth Screens: 'landing' | 'frame' | 'camera' | 'preview' | 'greeting' | 'voice' | 'success' | 'gallery'
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Retake slot tracking for multi-photo
  const [capturedPhotosForRetake, setCapturedPhotosForRetake] = useState([]);
  const [slotForRetake, setSlotForRetake] = useState(null);

  // Unified Media State
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [finalMedia, setFinalMedia] = useState(null);

  // Guest Greeting Data
  const [guestName, setGuestName] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [voiceAudioBlob, setVoiceAudioBlob] = useState(null);
  const [voiceDuration, setVoiceDuration] = useState('00:00');

  // Gallery state
  const [galleryItems, setGalleryItems] = useState(INITIAL_GALLERY);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');

  // Submission & Prototype State Toggles
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [triggerErrorState, setTriggerErrorState] = useState(false);

  // Synchronize route changes from browser history (back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setRouteInfo(parseRoute());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Programmatic router navigation helper
  const navigateTo = useCallback((mode, slug = null) => {
    if (typeof window !== 'undefined') {
      if (mode === 'admin') {
        window.history.pushState(null, '', '/admin');
      } else {
        const path = slug ? `/event/${slug}` : '/';
        window.history.pushState(null, '', path);
      }
    }
    setRouteInfo({ mode, slug: slug ? slug.trim().toLowerCase() : null });
    if (mode === 'photobooth') {
      setCurrentScreen('landing');
    }
  }, []);

  // Check admin session on mount
  useEffect(() => {
    getCurrentAdmin().then((user) => {
      if (user) setAdminUser(user);
    });
  }, []);

  // ============================================================================
  // DYNAMIC EVENT LOADER: Triggered when in photobooth mode or currentSlug changes
  // Flow: Loading -> Fetch Event -> Validate -> Fetch Frames -> Set Theme -> UI
  // ============================================================================
  useEffect(() => {
    if (viewMode !== 'photobooth') {
      return;
    }

    let isCancelled = false;

    async function loadActiveEvent() {
      setEventLoading(true);
      setEventError(null);
      setGalleryError('');

      try {
        let slugToQuery = currentSlug;

        // If no slug is specified in the URL (e.g. visited root domain /)
        if (!slugToQuery) {
          const allEvents = await fetchAllEvents();
          const activeOne = allEvents.find((e) => e.status === 'active') || allEvents[0];
          if (activeOne) {
            slugToQuery = activeOne.slug;
          } else {
            if (!isCancelled) {
              setEventError('not_found');
              setEventLoading(false);
            }
            return;
          }
        }

        const event = await fetchEventBySlug(slugToQuery);
        const eventSlug = slugToQuery;
        const currentEvent = event;

        // Section AA Development Debug Logs
        console.log('[EVENT SLUG]', eventSlug);
        console.log('[CURRENT EVENT]', currentEvent);
        console.log('[EVENT THEME]', currentEvent?.theme_id);
        console.log('[EVENT DATE]', currentEvent?.event_date);
        console.log('[EVENT LOCATION]', currentEvent?.location);

        if (isCancelled) return;

        // 1. Event Not Found Check
        if (!event) {
          console.warn(`[EVENT NOT FOUND] Slug: "${slugToQuery}"`);
          setActiveEvent(null);
          setEventError('not_found');
          setEventLoading(false);
          return;
        }

        // 2. Event Inactive Check
        if (event.status !== 'active') {
          console.warn(`[EVENT INACTIVE] Status: "${event.status}"`);
          setActiveEvent(event);
          setEventError('inactive');
          setEventLoading(false);
          return;
        }

        // 3. Event Valid & Active: Apply theme synchronously to document
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', event.theme_id || 'blue');
        }

        setActiveEvent(event);

        // 4. Load frames specifically for this event
        const loadedFrames = await fetchActiveFramesForEvent(event.id);
        console.log('[EVENT FRAMES]', loadedFrames);

        if (!isCancelled) {
          if (loadedFrames && loadedFrames.length > 0) {
            setFramesList(loadedFrames);
            setSelectedFrame(loadedFrames[0]);
          } else {
            setFramesList(FRAMES);
            setSelectedFrame(FRAMES[0]);
          }

          // 5. Load submissions strictly for this event.
          setGalleryLoading(true);
          try {
            const subs = await fetchSubmissionsForEvent(event.id);
            if (!isCancelled) setGalleryItems(subs);
          } catch (galleryLoadError) {
            if (import.meta.env.DEV) {
              console.warn('[GALLERY LOAD FAILED]', {
                operation: 'loadEventGallery',
                kind: getGalleryErrorKind(galleryLoadError),
              });
            }
            if (!isCancelled) {
              setGalleryItems([]);
              setGalleryError(getGalleryErrorMessage(galleryLoadError));
            }
          } finally {
            if (!isCancelled) setGalleryLoading(false);
          }
          setEventLoading(false);
        }
      } catch (err) {
        console.error('[EVENT LOAD ERROR]', err);
        if (!isCancelled) {
          setEventError('load_error');
          setEventLoading(false);
        }
      }
    }

    loadActiveEvent();

    return () => {
      isCancelled = true;
    };
  }, [viewMode, currentSlug]);

  const handleRefreshGallery = async () => {
    if (!activeEvent?.id) return;
    setGalleryLoading(true);
    setGalleryError('');
    try {
      const submissions = await fetchSubmissionsForEvent(activeEvent.id);
      setGalleryItems(submissions);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[GALLERY REFRESH FAILED]', {
          operation: 'refreshEventGallery',
          kind: getGalleryErrorKind(err),
        });
      }
      setGalleryItems([]);
      setGalleryError(getGalleryErrorMessage(err));
    } finally {
      setGalleryLoading(false);
    }
  };

  // Lock body scroll when on Gallery screen for strict 100dvh compliance
  useEffect(() => {
    if (viewMode === 'photobooth' && currentScreen === 'gallery') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [currentScreen, viewMode]);

  // Stepper Number (Steps 1 to 4)
  const getStepNumber = () => {
    switch (currentScreen) {
      case 'frame':
        return 1;
      case 'camera':
      case 'preview':
        return 2;
      case 'greeting':
      case 'voice':
        return 3;
      case 'success':
        return 4;
      default:
        return 1;
    }
  };

  // Back Navigation Handler
  const handleBack = () => {
    switch (currentScreen) {
      case 'frame':
        setCurrentScreen('landing');
        break;
      case 'camera':
        setCurrentScreen('frame');
        break;
      case 'preview':
        setCapturedMedia(null);
        setFinalMedia(null);
        setCurrentScreen('camera');
        break;
      case 'greeting':
      case 'voice':
        setCurrentScreen('preview');
        break;
      case 'success':
        setCurrentScreen('gallery');
        break;
      case 'gallery':
        setCurrentScreen('landing');
        break;
      default:
        setCurrentScreen('landing');
    }
  };

  // Final submission to Supabase Database & Storage
  const handleFinalSubmit = async (isVoice = false) => {
    if (!activeEvent?.id) {
      console.error('[SUBMISSION ERROR] Event tidak terdeteksi atau tidak memiliki id:', activeEvent);
      alert('Event tidak terdeteksi. Silakan muat ulang halaman.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeF = finalMedia?.selectedFrame || selectedFrame || framesList[0] || FRAMES[0];

      const submittedItem = await createSubmission({
        eventId: activeEvent.id, // Strictly uses active event ID
        guestName: guestName.trim() || 'Tamu Istimewa',
        guestMessage: guestMessage.trim(),
        mediaType: finalMedia?.type || 'photo',
        frame: activeF,
        mediaBlobOrUrl: finalMedia?.mediaBlob || finalMedia?.mediaUrl,
        thumbnailBlobOrUrl: finalMedia?.thumbnailUrl,
        voiceBlob: isVoice ? voiceAudioBlob : null,
        voiceDuration: isVoice ? (voiceDuration || '00:15') : null,
        rawPhotos: finalMedia?.rawPhotos || [],
      });

      // Update state with newly submitted item at top
      setGalleryItems((prev) => [submittedItem, ...prev]);
      setIsSubmitting(false);
      setCurrentScreen('success');
    } catch (err) {
      console.error('[SUBMISSION ERROR IN APP]', err);
      setIsSubmitting(false);
      alert(`Gagal menyimpan foto: ${err.message || 'Terjadi kesalahan sistem'}. Silakan periksa koneksi atau coba lagi.`);
    }
  };

  // Reset session for another photo / boomerang
  const handleTakeAnother = () => {
    setCapturedMedia(null);
    setFinalMedia(null);
    setCapturedPhotosForRetake([]);
    setSlotForRetake(null);
    setGuestMessage('');
    setVoiceAudioBlob(null);
    setVoiceDuration('00:00');
    setCurrentScreen('frame');
  };

  // Admin Logout Handler
  const handleAdminLogout = async () => {
    await signOutAdmin();
    setAdminUser(null);
    navigateTo('photobooth');
  };

  // ============================================================================
  // ADMIN PANEL ROUTING
  // ============================================================================
  if (viewMode === 'admin') {
    if (!adminUser) {
      return (
        <AdminLoginView
          onLoginSuccess={(user) => setAdminUser(user)}
          onBackToPhotobooth={() => navigateTo('photobooth')}
        />
      );
    }
    return (
      <AdminLayout
        adminUser={adminUser}
        onLogout={handleAdminLogout}
        onOpenPhotobooth={(slug) => {
          navigateTo('photobooth', slug);
        }}
      />
    );
  }

  // ============================================================================
  // USER PHOTOBOOTH: LOADING & ERROR STATES
  // ============================================================================

  // 1. Loading State
  if (eventLoading) {
    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-xs w-full text-center space-y-4">
          <div className="w-12 h-12 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <h3 className="font-serif text-xl tracking-wide text-amber-100">
              Memuat Event...
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Menyiapkan photobooth, tema acara, dan frame.
            </p>
          </div>
          <div className="pt-2">
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-white/10 text-neutral-300">
              {currentSlug ? `slug: ${currentSlug}` : 'Menghubungkan...'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Event Error States (Not Found or Inactive)
  if (eventError || !activeEvent) {
    const isNotFound = eventError === 'not_found' || !activeEvent;
    const isInactive = eventError === 'inactive';

    return (
      <div className="min-h-screen bg-[#1c1917] flex items-center justify-center p-6 text-white font-sans">
        <div className="max-w-md w-full bg-[#292524] rounded-3xl p-8 border border-neutral-700/80 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            {isNotFound ? (
              <CalendarX2 className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>

          <div>
            <h2 className="font-serif text-2xl text-white tracking-wide">
              {isNotFound ? 'Event Tidak Ditemukan' : 'Event Ini Belum Tersedia'}
            </h2>
            <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
              {isNotFound
                ? `Acara dengan tautan "/event/${currentSlug || '...'}" tidak ditemukan pada sistem database.`
                : `Acara "${activeEvent?.name || currentSlug}" saat ini berstatus "${activeEvent?.status}" dan belum dibuka untuk tamu photobooth.`}
            </p>
          </div>

          <div className="p-3 bg-black/30 rounded-xl text-[11px] font-mono text-neutral-400 border border-neutral-800">
            URL: {typeof window !== 'undefined' ? window.location.pathname : ''}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigateTo('admin')}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Shield className="w-4 h-4" />
              <span>Buka Admin Panel</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('photobooth', null)}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-300 text-xs font-medium cursor-pointer"
            >
              <span>Muat Ulang Beranda</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ACTIVE USER PHOTOBOOTH MODE: Theme derived strictly from activeEvent.theme_id
  // ============================================================================
  const eventTheme = activeEvent.theme_id || activeEvent.event_settings?.theme_id || 'blue';

  return (
    <ThemeProvider eventTheme={eventTheme}>
      <div
        className="min-h-screen flex items-center justify-center p-0 sm:py-6 sm:px-4 font-sans selection:bg-[var(--primary)]/20 theme-transition"
        style={{
          backgroundColor: 'var(--outer-bg)',
        }}
      >
        {/* Mobile Canvas Container with soft theme gradient backdrop */}
        <main
          className={`w-full max-w-[440px] sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative sm:border-[8px] sm:border-black/25 theme-transition ${
            currentScreen === 'gallery'
              ? 'h-dvh max-h-dvh sm:h-[844px] sm:max-h-[844px]'
              : 'min-h-screen sm:min-h-[844px] sm:max-h-[920px]'
          }`}
          style={{
            background: currentScreen === 'landing' ? 'var(--bg-gradient)' : 'transparent',
          }}
        >
          {/* SCREEN 1: LANDING - UNCHANGED */}
          {currentScreen === 'landing' && (
            <ScreenLanding
              activeEvent={activeEvent}
              onStart={() => setCurrentScreen('frame')}
              onOpenGallery={() => setCurrentScreen('gallery')}
              onOpenAdmin={() => navigateTo('admin')}
            />
          )}

          {/* ALL SCREENS AFTER LANDING WRAPPED IN REUSABLE EventBackground */}
          {currentScreen !== 'landing' && (
            <EventBackground currentEvent={activeEvent}>
              {/* Progress Stepper shown for steps 2 to 7 */}
              {currentScreen !== 'gallery' && (
                <HeaderStepper
                  currentStep={getStepNumber()}
                  onBack={currentScreen !== 'success' ? handleBack : null}
                  title={activeEvent?.name || 'XLVI Photobooth'}
                />
              )}

              {/* SCREEN 2: SELECT FRAME */}
              {currentScreen === 'frame' && (
                <ScreenSelectFrame
                  selectedFrame={selectedFrame}
                  selectedFrameId={selectedFrame?.id}
                  framesList={framesList}
                  currentEvent={activeEvent}
                  onSelectFrame={(frame) => setSelectedFrame(frame)}
                  onNext={() => {
                    setCapturedPhotosForRetake([]);
                    setSlotForRetake(null);
                    setCurrentScreen('camera');
                  }}
                />
              )}

              {/* SCREEN 3: CAMERA */}
              {currentScreen === 'camera' && (
                <ScreenCamera
                  selectedFrame={selectedFrame}
                  selectedFrameId={selectedFrame?.id}
                  currentEvent={activeEvent}
                  initialCapturedPhotos={capturedPhotosForRetake}
                  targetSlotToRetake={slotForRetake}
                  onMediaCaptured={(media) => {
                    setCapturedMedia(media);
                    setCurrentScreen('preview');
                  }}
                  onBack={() => setCurrentScreen('frame')}
                />
              )}

              {/* SCREEN 4: PREVIEW & CUSTOMIZE */}
              {currentScreen === 'preview' && (
                <ScreenPreview
                  capturedMedia={capturedMedia}
                  selectedFrame={selectedFrame}
                  currentEvent={activeEvent}
                  onRetake={() => {
                    console.log('[RETAKE] resetting photo');
                    setCapturedMedia(null);
                    setFinalMedia(null);
                    setCapturedPhotosForRetake([]);
                    setSlotForRetake(null);
                    setCurrentScreen('camera');
                  }}
                  onRetakeSlot={(slotIndex, existingPhotos) => {
                    console.log('[RETAKE] resetting photo');
                    setCapturedPhotosForRetake(existingPhotos);
                    setSlotForRetake(slotIndex);
                    setCurrentScreen('camera');
                  }}
                  onRetakeAll={() => {
                    console.log('[RETAKE] resetting photo');
                    setCapturedMedia(null);
                    setFinalMedia(null);
                    setCapturedPhotosForRetake([]);
                    setSlotForRetake(null);
                    setCurrentScreen('camera');
                  }}
                  onConfirm={(composedResult) => {
                    setFinalMedia(composedResult);
                    setCurrentScreen('greeting');
                  }}
                  onBack={handleBack}
                />
              )}

              {/* SCREEN 5: GREETING & WISHES */}
              {currentScreen === 'greeting' && (
                <ScreenGreeting
                  guestName={guestName}
                  setGuestName={setGuestName}
                  guestMessage={guestMessage}
                  setGuestMessage={setGuestMessage}
                  onSwitchToVoice={() => setCurrentScreen('voice')}
                  onSubmit={() => handleFinalSubmit(false)}
                  isSubmitting={isSubmitting}
                />
              )}

              {/* SCREEN 6: VOICE NOTE RECORDING */}
              {currentScreen === 'voice' && (
                <ScreenVoiceNote
                  guestName={guestName}
                  setGuestName={setGuestName}
                  voiceAudioBlob={voiceAudioBlob}
                  setVoiceAudioBlob={setVoiceAudioBlob}
                  voiceDuration={voiceDuration}
                  setVoiceDuration={setVoiceDuration}
                  onSwitchToText={() => setCurrentScreen('greeting')}
                  onSubmit={() => handleFinalSubmit(true)}
                  isSubmitting={isSubmitting}
                />
              )}

              {/* SCREEN 7: SUCCESS */}
              {currentScreen === 'success' && (
                <ScreenSuccess
                  submittedMedia={finalMedia || capturedMedia}
                  guestName={guestName}
                  guestMessage={guestMessage}
                  voiceAudioBlob={voiceAudioBlob}
                  voiceDuration={voiceDuration}
                  selectedFrame={selectedFrame}
                  currentEvent={activeEvent}
                  onGoToGallery={() => setCurrentScreen('gallery')}
                  onTakeAnother={handleTakeAnother}
                />
              )}

              {/* SCREEN 8: PHOTOBOOTH GALLERY */}
              {currentScreen === 'gallery' && (
                <ScreenGallery
                  galleryItems={galleryItems}
                  isLoading={galleryLoading}
                  loadError={galleryError}
                  onRetryLoad={handleRefreshGallery}
                  currentEvent={activeEvent}
                  onStartNewPhoto={handleTakeAnother}
                  onBackToHome={() => setCurrentScreen('landing')}
                  triggerErrorState={triggerErrorState}
                  setTriggerErrorState={setTriggerErrorState}
                />
              )}
            </EventBackground>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
}
