import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Upload,
  Layers,
  Sparkles,
  Check,
  Eye,
  Layout,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { fetchFrameById, createFrame, updateFrame } from '../../services/frameService.js';
import { fetchAllEvents } from '../../services/eventService.js';
import FrameSlotEditor from './FrameSlotEditor.jsx';

export default function AdminFrameCreator({ frameId = null, onBack, onSaved }) {
  const isEditing = !!frameId;

  const [activeStep, setActiveStep] = useState(1); // 1: Info & Assets, 2: Slot Coordinates, 3: Review & Save
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'single', // 'single' | 'multi' | 'boomerang'
    photo_count: 1,
    event_id: '',
    accent: '',
    subtitle: '',
    is_active: true,
    overlay_url: '',
    thumbnail_url: '',
  });

  const [slotsData, setSlotsData] = useState([
    {
      slot_number: 1,
      x: 72,
      y: 72,
      width: 936,
      height: 1080,
      border_radius: 16,
      rotation: 0,
      object_fit: 'cover',
    },
  ]);

  const [overlayFile, setOverlayFile] = useState(null);
  const [overlayPreview, setOverlayPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const eventsData = await fetchAllEvents();
        setEvents(eventsData);

        if (isEditing) {
          const existing = await fetchFrameById(frameId);
          if (existing) {
            setFormData({
              name: existing.name || '',
              slug: existing.slug || '',
              type: existing.type || 'single',
              photo_count: existing.photo_count || existing.photoCount || 1,
              event_id: existing.event_id || '',
              accent: existing.accent || '',
              subtitle: existing.subtitle || '',
              is_active: existing.is_active ?? true,
              overlay_url: existing.overlay_url || '',
              thumbnail_url: existing.thumbnail_url || '',
            });

            if (existing.slots && existing.slots.length > 0) {
              setSlotsData(existing.slots);
            }
            if (existing.overlay_url) {
              setOverlayPreview(existing.overlay_url);
            }
            if (existing.thumbnail_url) {
              setThumbnailPreview(existing.thumbnail_url);
            }
          }
        }
      } catch (err) {
        console.error('Error loading frame editor data:', err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [frameId, isEditing]);

  // Handle overlay file selection
  const handleOverlaySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOverlayFile(file);
    setOverlayPreview(URL.createObjectURL(file));
  };

  // Handle thumbnail file selection
  const handleThumbnailSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  // Name change auto-generates slug
  const handleNameChange = (val) => {
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: isEditing ? prev.slug : autoSlug,
    }));
  };

  // Type change adjusts default slots
  const handleTypeChange = (typeVal) => {
    let pCount = formData.photo_count;
    let newSlots = [...slotsData];

    if (typeVal === 'multi') {
      pCount = 3;
      if (newSlots.length < 3) {
        newSlots = [
          { slot_number: 1, x: 72, y: 64, width: 936, height: 560, border_radius: 12, rotation: 0, object_fit: 'cover' },
          { slot_number: 2, x: 72, y: 644, width: 456, height: 576, border_radius: 12, rotation: 0, object_fit: 'cover' },
          { slot_number: 3, x: 552, y: 644, width: 456, height: 576, border_radius: 12, rotation: 0, object_fit: 'cover' },
        ];
      }
    } else {
      pCount = 1;
      newSlots = [
        { slot_number: 1, x: 72, y: 72, width: 936, height: 1080, border_radius: 16, rotation: 0, object_fit: 'cover' },
      ];
    }

    setFormData((prev) => ({
      ...prev,
      type: typeVal,
      photo_count: pCount,
    }));
    setSlotsData(newSlots);
  };

  // Submit Handler
  const handleSaveFrame = async () => {
    if (!formData.name.trim()) {
      setErrorMessage('Nama frame wajib diisi.');
      setActiveStep(1);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const cleanSlug = (formData.slug || formData.name)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'frame-' + Date.now();

      const payload = {
        ...formData,
        name: formData.name.trim(),
        slug: cleanSlug,
        event_id: formData.event_id && formData.event_id !== 'all' ? formData.event_id : null,
        photo_count: formData.type === 'multi' ? Math.max(2, slotsData.length) : 1,
      };

      if (isEditing) {
        await updateFrame(frameId, {
          frameData: payload,
          slotsData,
          newOverlayFile: overlayFile,
          newThumbnailFile: thumbnailFile,
        });
      } else {
        await createFrame({
          frameData: payload,
          slotsData,
          overlayFile,
          thumbnailFile,
        });
      }

      setIsSubmitting(false);
      onSaved();
    } catch (err) {
      console.error('Save frame error:', err);
      let errorDesc = err.message || 'Terjadi kesalahan saat menyimpan frame.';
      if (errorDesc.includes('Invalid path') || errorDesc.includes('not found')) {
        errorDesc += ' Pastikan VITE_SUPABASE_URL hanya berupa base URL (https://xxxx.supabase.co tanpa /rest/v1) dan bucket "frames" sudah dibuat di Supabase Storage.';
      }
      setErrorMessage('Gagal menyimpan frame: ' + errorDesc);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-[#8c7365]">
        <div className="w-8 h-8 border-2 border-[#5c4033] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span>Memuat data frame...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header with Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 py-1.5 px-3 rounded-xl border border-[#d9c8b7] text-xs font-semibold text-[#5c4033] hover:bg-[#faf7f2] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Frame</span>
        </button>

        <h2 className="font-serif text-xl sm:text-2xl text-[#3a2820] font-normal tracking-wide">
          {isEditing ? `Edit Frame: ${formData.name}` : 'Buat Frame Baru'}
        </h2>

        <button
          type="button"
          onClick={handleSaveFrame}
          disabled={isSubmitting}
          className="py-2.5 px-5 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Frame'}</span>
        </button>
      </div>

      {/* Stepper Tabs */}
      <div className="flex border-b border-[#e8ded2] gap-4 sm:gap-8 text-xs font-medium font-serif">
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeStep === 1
              ? 'border-[#5c4033] text-[#5c4033] font-bold'
              : 'border-transparent text-[#8c7365] hover:text-[#5c4033]'
          }`}
        >
          Langkah 1: Informasi &amp; Overlay PNG
        </button>
        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`pb-3 px-1 border-b-2 cursor-pointer transition-colors ${
            activeStep === 2
              ? 'border-[#5c4033] text-[#5c4033] font-bold'
              : 'border-transparent text-[#8c7365] hover:text-[#5c4033]'
          }`}
        >
          Langkah 2: Atur Posisi Slot Foto (Canvas Visual)
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Basic Information & Asset Uploads */}
      {activeStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Form Fields */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#e8ded2] shadow-xs space-y-4">
            <h3 className="font-serif text-base font-semibold text-[#3a2820] border-b border-[#e8ded2] pb-2">
              Informasi Frame
            </h3>

            {/* Frame Name */}
            <div>
              <label className="block text-xs font-semibold text-[#3a2820] mb-1 font-sans">
                Nama Frame <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Contoh: Romantic Gold"
                className="w-full py-2 px-3 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] focus:outline-none focus:ring-1 focus:ring-[#5c4033]"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-semibold text-[#3a2820] mb-1 font-sans">
                Slug URL (Unik)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="romantic-gold"
                className="w-full py-2 px-3 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono text-[#5c4033]"
              />
            </div>

            {/* Frame Type */}
            <div>
              <label className="block text-xs font-semibold text-[#3a2820] mb-1.5 font-sans">
                Tipe Frame
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'single', label: 'Single Photo', desc: '1 Foto Utama' },
                  { id: 'multi', label: 'Multi Photo', desc: 'Maks. 3 Foto' },
                  { id: 'boomerang', label: 'Boomerang', desc: '2s Video Loop' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeChange(t.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      formData.type === t.id
                        ? 'border-[#5c4033] bg-[#f4ede4] ring-1 ring-[#5c4033]'
                        : 'border-[#e8ded2] hover:bg-[#faf7f2]'
                    }`}
                  >
                    <span className="font-semibold text-xs text-[#3a2820] block">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-[#8c7365] mt-0.5 block">
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Event Scope */}
            <div>
              <label className="block text-xs font-semibold text-[#3a2820] mb-1 font-sans">
                Target Acara (Event)
              </label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full py-2 px-3 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2] focus:outline-none focus:ring-1 focus:ring-[#5c4033] cursor-pointer"
              >
                <option value="">Frame Global (Tersedia untuk Semua Acara)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    Khusus Event: {ev.name} ({ev.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Subtitle / Accent Tag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#3a2820] mb-1 font-sans">
                  Aksen / Tag Singkat
                </label>
                <input
                  type="text"
                  value={formData.accent}
                  onChange={(e) => setFormData({ ...formData, accent: e.target.value })}
                  placeholder="Contoh: Gold & Fine Lines"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#3a2820] mb-1 font-sans">
                  Deskripsi / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="Contoh: Garis ganda emas minimalis"
                  className="w-full py-2 px-3 text-xs rounded-xl border border-[#d9c8b7] bg-[#faf7f2]"
                />
              </div>
            </div>

            {/* Active Toggle */}
            <div className="pt-2 border-t border-[#e8ded2] flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#3a2820]">Status Publikasi</p>
                <p className="text-[11px] text-[#8c7365]">
                  Jika aktif, frame akan langsung muncul di photobooth tamu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`py-1.5 px-3 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  formData.is_active
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                }`}
              >
                {formData.is_active ? '✓ Aktif' : 'Non-Aktif'}
              </button>
            </div>
          </div>

          {/* Asset Uploads: Overlay PNG & Thumbnail (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Upload Overlay PNG */}
            <div className="bg-white rounded-3xl p-5 border border-[#e8ded2] shadow-xs">
              <h4 className="font-serif text-sm font-semibold text-[#3a2820] mb-1">
                Upload Overlay PNG Transparan
              </h4>
              <p className="text-[11px] text-[#8c7365] mb-3 leading-relaxed">
                Rekomendasi rasio 3:4 (1080 x 1440 px). Gambar berformat PNG transparan akan ditempatkan di atas foto tamu.
              </p>

              <div className="border-2 border-dashed border-[#d9c8b7] rounded-2xl p-4 text-center bg-[#faf7f2] hover:bg-[#f4ede4] transition-colors">
                {overlayPreview ? (
                  <div className="relative aspect-[3/4] max-w-[180px] mx-auto rounded-xl overflow-hidden border border-[#d9c8b7] bg-white p-1">
                    <img
                      src={overlayPreview}
                      alt="Overlay Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-[#8c7365]">
                    <Upload className="w-8 h-8 mb-2 opacity-60 text-[#5c4033]" />
                    <span className="text-xs font-semibold text-[#3a2820]">
                      Pilih File PNG Transparan
                    </span>
                    <span className="text-[10px] mt-0.5">Maks. 5 MB (PNG)</span>
                  </div>
                )}

                <label className="mt-3 inline-block py-2 px-4 rounded-xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold cursor-pointer shadow-xs">
                  <span>{overlayPreview ? 'Ganti File PNG' : 'Pilih File PNG'}</span>
                  <input
                    type="file"
                    accept="image/png"
                    onChange={handleOverlaySelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className="w-full py-3 rounded-2xl bg-[#5c4033] hover:bg-[#4a3429] text-white text-xs font-semibold uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Lanjut ke Pengaturan Slot Foto</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Interactive Visual Slot Editor */}
      {activeStep === 2 && (
        <div className="space-y-4">
          <div className="bg-[#faf7f2] p-4 rounded-2xl border border-[#e8ded2] flex items-center justify-between">
            <div>
              <h4 className="font-serif text-sm font-semibold text-[#3a2820]">
                Pengaturan Posisi &amp; Ukuran Slot Foto
              </h4>
              <p className="text-xs text-[#8c7365]">
                Tipe Frame: <strong className="capitalize">{formData.type}</strong> · Jumlah Slot: <strong>{slotsData.length}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveFrame}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-[#5c4033] text-white text-xs font-semibold hover:bg-[#4a3429] cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Frame Sekarang</span>
            </button>
          </div>

          <FrameSlotEditor
            slots={slotsData}
            onChangeSlots={setSlotsData}
            overlayUrl={overlayPreview}
            photoCount={formData.photo_count}
            previewWithSamplePhotos={true}
          />
        </div>
      )}
    </div>
  );
}
