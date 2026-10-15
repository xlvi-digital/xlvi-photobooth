import React, { useState, useRef, useEffect } from 'react';
import { Move, Maximize2, RotateCw, Eye, Sparkles, Plus, Trash2, Layout, Layers } from 'lucide-react';
import guestCoupleImg from '../../assets/images/guest_photo_couple_1791014034635.jpg';
import guestBridesmaidsImg from '../../assets/images/guest_photo_bridesmaids_1791014050445.jpg';
import guestFriendsImg from '../../assets/images/guest_photo_friends_1791014066759.jpg';

export default function FrameSlotEditor({
  slots = [],
  onChangeSlots,
  overlayUrl = null,
  photoCount = 1,
  previewWithSamplePhotos = true,
}) {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [dragState, setDragState] = useState(null); // { type: 'move' | 'resize', slotIndex, startX, startY, initialSlot }
  const canvasContainerRef = useRef(null);

  const sampleImages = [guestCoupleImg, guestBridesmaidsImg, guestFriendsImg];

  // Standard Canvas coordinate space is 1080 x 1440
  const CANVAS_WIDTH = 1080;
  const CANVAS_HEIGHT = 1440;

  // Active slot
  const currentSlot = slots[selectedSlotIndex] || slots[0] || {
    x: 72,
    y: 72,
    width: 936,
    height: 1080,
    border_radius: 12,
    rotation: 0,
  };

  // Preset Layouts
  const applyPreset = (presetType) => {
    let newSlots = [];
    if (presetType === 'single') {
      newSlots = [
        { slot_number: 1, x: 72, y: 72, width: 936, height: 1080, border_radius: 16, rotation: 0, object_fit: 'cover' },
      ];
    } else if (presetType === 'trio_classic') {
      newSlots = [
        { slot_number: 1, x: 72, y: 64, width: 936, height: 560, border_radius: 12, rotation: 0, object_fit: 'cover' },
        { slot_number: 2, x: 72, y: 644, width: 456, height: 576, border_radius: 12, rotation: 0, object_fit: 'cover' },
        { slot_number: 3, x: 552, y: 644, width: 456, height: 576, border_radius: 12, rotation: 0, object_fit: 'cover' },
      ];
    } else if (presetType === 'photostrip') {
      newSlots = [
        { slot_number: 1, x: 108, y: 64, width: 864, height: 366, border_radius: 10, rotation: 0, object_fit: 'cover' },
        { slot_number: 2, x: 108, y: 450, width: 864, height: 366, border_radius: 10, rotation: 0, object_fit: 'cover' },
        { slot_number: 3, x: 108, y: 836, width: 864, height: 366, border_radius: 10, rotation: 0, object_fit: 'cover' },
      ];
    } else if (presetType === 'asymmetric') {
      newSlots = [
        { slot_number: 1, x: 72, y: 64, width: 456, height: 1148, border_radius: 12, rotation: 0, object_fit: 'cover' },
        { slot_number: 2, x: 552, y: 64, width: 456, height: 564, border_radius: 12, rotation: 0, object_fit: 'cover' },
        { slot_number: 3, x: 552, y: 648, width: 456, height: 564, border_radius: 12, rotation: 0, object_fit: 'cover' },
      ];
    }
    onChangeSlots(newSlots);
    setSelectedSlotIndex(0);
  };

  const handleUpdateCurrentSlot = (field, value) => {
    const updated = [...slots];
    const numVal = Math.round(Number(value) || 0);
    updated[selectedSlotIndex] = {
      ...currentSlot,
      [field]: numVal,
    };
    onChangeSlots(updated);
  };

  const handleAddSlot = () => {
    if (slots.length >= 3) return;
    const newSlotNumber = slots.length + 1;
    const newSlot = {
      slot_number: newSlotNumber,
      x: 100,
      y: 100 + slots.length * 150,
      width: 400,
      height: 400,
      border_radius: 12,
      rotation: 0,
      object_fit: 'cover',
    };
    const updated = [...slots, newSlot];
    onChangeSlots(updated);
    setSelectedSlotIndex(updated.length - 1);
  };

  const handleRemoveSlot = (index) => {
    if (slots.length <= 1) return;
    const updated = slots.filter((_, i) => i !== index).map((s, idx) => ({ ...s, slot_number: idx + 1 }));
    onChangeSlots(updated);
    setSelectedSlotIndex(Math.max(0, index - 1));
  };

  // Mouse / Touch Dragging & Resizing on Canvas
  const handlePointerDown = (e, slotIndex, type) => {
    e.stopPropagation();
    setSelectedSlotIndex(slotIndex);

    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

    setDragState({
      type,
      slotIndex,
      startX: clientX,
      startY: clientY,
      initialSlot: { ...slots[slotIndex] },
    });
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragState || !canvasContainerRef.current) return;

      const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
      const clientY = e.clientY || e.touches?.[0]?.clientY || 0;

      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / containerRect.width;
      const scaleY = CANVAS_HEIGHT / containerRect.height;

      const deltaX = (clientX - dragState.startX) * scaleX;
      const deltaY = (clientY - dragState.startY) * scaleY;

      const updated = [...slots];
      const slot = { ...dragState.initialSlot };

      if (dragState.type === 'move') {
        slot.x = Math.max(0, Math.min(CANVAS_WIDTH - slot.width, Math.round(slot.x + deltaX)));
        slot.y = Math.max(0, Math.min(CANVAS_HEIGHT - slot.height, Math.round(slot.y + deltaY)));
      } else if (dragState.type === 'resize') {
        slot.width = Math.max(100, Math.min(CANVAS_WIDTH - slot.x, Math.round(slot.width + deltaX)));
        slot.height = Math.max(100, Math.min(CANVAS_HEIGHT - slot.y, Math.round(slot.height + deltaY)));
      }

      updated[dragState.slotIndex] = slot;
      onChangeSlots(updated);
    };

    const handlePointerUp = () => {
      if (dragState) {
        setDragState(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, slots, onChangeSlots]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT: Interactive Visual Canvas (5 cols on desktop) */}
      <div className="lg:col-span-6 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5c4033] font-serif flex items-center gap-1.5">
            <Layout className="w-4 h-4" />
            <span>Interactive Frame Canvas (1080 x 1440)</span>
          </span>
          <span className="text-[11px] text-[#8c7365] font-mono">
            {slots.length} Foto Slot
          </span>
        </div>

        {/* The 3:4 canvas container */}
        <div
          ref={canvasContainerRef}
          className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[3/4] bg-[#faf7f2] rounded-2xl overflow-hidden shadow-xl border-2 border-[#5c4033]/30 select-none touch-none"
        >
          {/* Base Cream Wedding Card Layer */}
          <div className="absolute inset-0 bg-[#faf7f2]" />

          {/* Border Guide Lines */}
          <div className="absolute inset-3 border border-[#c8a882]/50 pointer-events-none rounded-lg" />
          <div className="absolute inset-4 border border-[#5c4033]/20 pointer-events-none rounded-sm" />

          {/* Render All Photo Slots */}
          {slots.map((slot, index) => {
            const isSelected = selectedSlotIndex === index;
            const leftPct = (slot.x / CANVAS_WIDTH) * 100;
            const topPct = (slot.y / CANVAS_HEIGHT) * 100;
            const widthPct = (slot.width / CANVAS_WIDTH) * 100;
            const heightPct = (slot.height / CANVAS_HEIGHT) * 100;
            const sampleImg = sampleImages[index % sampleImages.length];

            return (
              <div
                key={index}
                onPointerDown={(e) => handlePointerDown(e, index, 'move')}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                  borderRadius: `${(slot.border_radius || 12) / 3}px`,
                }}
                className={`absolute cursor-move overflow-hidden transition-shadow flex items-center justify-center ${
                  isSelected
                    ? 'ring-3 ring-amber-500 shadow-xl z-20'
                    : 'ring-1 ring-[#c8a882] shadow-sm z-10 hover:ring-2 hover:ring-[#5c4033]'
                }`}
              >
                {/* Sample Photo inside Slot */}
                {previewWithSamplePhotos ? (
                  <img
                    src={sampleImg}
                    alt={`Slot ${index + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                ) : (
                  <div className="w-full h-full bg-[#f0e6da] flex items-center justify-center">
                    <span className="font-mono text-xs text-[#8c7365]">Slot 0{index + 1}</span>
                  </div>
                )}

                {/* Slot Badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white text-[10px] font-sans flex items-center gap-1 pointer-events-none">
                  <Move className="w-3 h-3" />
                  <span>Foto 0{index + 1}</span>
                </div>

                {/* Resize Handle on Bottom Right */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => handlePointerDown(e, index, 'resize')}
                    className="absolute bottom-0 right-0 w-6 h-6 bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center cursor-nwse-resize rounded-tl-md shadow-md z-30"
                    title="Tarik untuk mengubah ukuran slot"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Transparent Overlay PNG if uploaded */}
          {overlayUrl && (
            <img
              src={overlayUrl}
              alt="Frame Overlay"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-30"
            />
          )}

          {/* Wedding Bottom Label Guide */}
          <div className="absolute bottom-2 inset-x-2 text-center pointer-events-none z-40 bg-gradient-to-t from-[#faf7f2]/95 to-transparent pt-3 pb-1">
            <p className="text-[8px] uppercase tracking-widest text-[#8c7365]">THE WEDDING OF</p>
            <p className="font-serif text-sm font-semibold text-[#3a2820]">Nela &amp; Fadli</p>
            <p className="text-[7px] text-[#7a6456]">27 · 12 · 2026</p>
          </div>
        </div>

        <p className="text-[11px] text-[#8c7365] mt-2 text-center font-sans">
          💡 Geser kotak untuk mengatur posisi X/Y. Tarik sudut kanan bawah untuk mengubah ukuran.
        </p>
      </div>

      {/* RIGHT: Slot Parameters, Presets & Fine-Tuning Coordinates (6 cols on desktop) */}
      <div className="lg:col-span-6 bg-white rounded-2xl p-4 sm:p-5 border border-[#e8ded2] shadow-xs space-y-4">
        {/* Preset Layout Buttons */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#5c4033] font-serif mb-2">
            Pilihan Preset Layout
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => applyPreset('single')}
              className="py-1.5 px-2.5 rounded-xl border border-[#e8ded2] hover:border-[#5c4033] text-left text-xs text-[#3a2820] hover:bg-[#faf7f2] transition-colors"
            >
              <span className="font-semibold block">1 Foto Tunggal</span>
              <span className="text-[10px] text-[#8c7365]">936 x 1080 (Single)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('trio_classic')}
              className="py-1.5 px-2.5 rounded-xl border border-[#e8ded2] hover:border-[#5c4033] text-left text-xs text-[#3a2820] hover:bg-[#faf7f2] transition-colors"
            >
              <span className="font-semibold block">3 Foto (Trio Classic)</span>
              <span className="text-[10px] text-[#8c7365]">1 Atas + 2 Bawah</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('photostrip')}
              className="py-1.5 px-2.5 rounded-xl border border-[#e8ded2] hover:border-[#5c4033] text-left text-xs text-[#3a2820] hover:bg-[#faf7f2] transition-colors"
            >
              <span className="font-semibold block">3 Foto (Photostrip)</span>
              <span className="text-[10px] text-[#8c7365]">3 Strip Bertumpuk</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('asymmetric')}
              className="py-1.5 px-2.5 rounded-xl border border-[#e8ded2] hover:border-[#5c4033] text-left text-xs text-[#3a2820] hover:bg-[#faf7f2] transition-colors"
            >
              <span className="font-semibold block">3 Foto (Asymmetric)</span>
              <span className="text-[10px] text-[#8c7365]">1 Kiri + 2 Kanan</span>
            </button>
          </div>
        </div>

        {/* Slot Selection Tabs & Actions */}
        <div className="pt-2 border-t border-[#e8ded2]">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#5c4033] font-serif">
              Pengaturan Slot Aktif
            </label>
            {slots.length < 3 && (
              <button
                type="button"
                onClick={handleAddSlot}
                className="inline-flex items-center gap-1 text-xs text-[#5c4033] font-medium hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Slot</span>
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-3">
            {slots.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedSlotIndex(idx)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                  selectedSlotIndex === idx
                    ? 'bg-[#5c4033] text-white shadow-xs'
                    : 'bg-[#f4ede4] text-[#7a6456] hover:bg-[#e8ded2]'
                }`}
              >
                <span>Foto 0{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Coordinate Input Form */}
        <div className="space-y-3 bg-[#faf7f2] p-3.5 rounded-xl border border-[#e8ded2]">
          <div className="flex items-center justify-between pb-1 border-b border-[#e8ded2]">
            <span className="text-xs font-semibold text-[#3a2820]">
              Koordinat Foto Slot 0{selectedSlotIndex + 1}
            </span>
            {slots.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveSlot(selectedSlotIndex)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Slot</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Posisi X (Horizontal)
              </label>
              <input
                type="number"
                min="0"
                max={CANVAS_WIDTH}
                value={currentSlot.x || 0}
                onChange={(e) => handleUpdateCurrentSlot('x', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Posisi Y (Vertikal)
              </label>
              <input
                type="number"
                min="0"
                max={CANVAS_HEIGHT}
                value={currentSlot.y || 0}
                onChange={(e) => handleUpdateCurrentSlot('y', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Lebar (Width)
              </label>
              <input
                type="number"
                min="50"
                max={CANVAS_WIDTH}
                value={currentSlot.width || 1080}
                onChange={(e) => handleUpdateCurrentSlot('width', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Tinggi (Height)
              </label>
              <input
                type="number"
                min="50"
                max={CANVAS_HEIGHT}
                value={currentSlot.height || 1440}
                onChange={(e) => handleUpdateCurrentSlot('height', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Border Radius (px)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={currentSlot.border_radius || 12}
                onChange={(e) => handleUpdateCurrentSlot('border_radius', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#8c7365] mb-1">
                Rotasi (Derajat)
              </label>
              <input
                type="number"
                min="-180"
                max="180"
                value={currentSlot.rotation || 0}
                onChange={(e) => handleUpdateCurrentSlot('rotation', e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded-lg border border-[#d9c8b7] bg-white focus:outline-none focus:ring-1 focus:ring-[#5c4033] font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
