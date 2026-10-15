import coupleHeroImg from '../assets/images/wedding_couple_hero_1791014020260.jpg';
import guestCoupleImg from '../assets/images/guest_photo_couple_1791014034635.jpg';
import guestBridesmaidsImg from '../assets/images/guest_photo_bridesmaids_1791014050445.jpg';
import guestFriendsImg from '../assets/images/guest_photo_friends_1791014066759.jpg';

export const EVENT_DATA = {
  eventId: "wedding-nela-fadli",
  namaPengantin: "Nela & Fadli",
  tanggalAcara: "Minggu, 27 Desember 2026",
  lokasiAcara: "The Glass House Grand Ballroom, Jakarta",
  heroPhoto: coupleHeroImg,
  tagline: "The Wedding Of",
  subTagline: "Abadikan momenmu bersama kami",
  branding: "Powered by XLVI Digital",
  theme: {
    primaryBrown: "#5c4033",
    secondaryBrown: "#7a5845",
    warmCream: "#faf7f2",
    warmBeige: "#f4ede4",
    borderWarm: "#e8ded2",
    textDark: "#2d241e",
    textMuted: "#8c7365",
  }
};

/**
 * Standard Frame Configuration
 * Supports single-photo frames and multi-photo collage frames (up to 3 photos).
 * Each frame defines its unique ID, visual style, type, photoCount, and slot coordinates.
 */
export const FRAMES = [
  {
    id: "frame-01",
    name: "Minimal Elegant",
    type: "single",
    photoCount: 1,
    subtitle: "Garis ganda emas minimalis dengan tipografi klasik",
    color: "#5c4033",
    style: "classic",
    accent: "Gold & Fine Lines",
    overlay: "frame-01"
  },
  {
    id: "frame-02",
    name: "Botanical Romance",
    type: "single",
    photoCount: 1,
    subtitle: "Ilustrasi daun eucalyptus & ranting lembut",
    color: "#4e5947",
    style: "botanical",
    accent: "Floral & Eucalyptus",
    overlay: "frame-02"
  },
  {
    id: "frame-03",
    name: "Luxury Warm Brown",
    type: "single",
    photoCount: 1,
    subtitle: "Ornamen sudut mewah khas undangan bangsawan",
    color: "#634735",
    style: "luxury",
    accent: "Antique Monogram",
    overlay: "frame-03"
  },
  {
    id: "frame-04",
    name: "Three Moments",
    type: "multi",
    photoCount: 3,
    subtitle: "Kolase 3 foto spesial: 1 foto utama atas + 2 foto bawah",
    color: "#5c4033",
    style: "multi-trio",
    accent: "3 Foto (Trio Classic)",
    overlay: "frame-04",
    slots: [
      {
        id: 1,
        name: "Foto 1 (Utama Atas)",
        x: 72,
        y: 64,
        width: 936,
        height: 560
      },
      {
        id: 2,
        name: "Foto 2 (Bawah Kiri)",
        x: 72,
        y: 644,
        width: 456,
        height: 576
      },
      {
        id: 3,
        name: "Foto 3 (Bawah Kanan)",
        x: 552,
        y: 644,
        width: 456,
        height: 576
      }
    ]
  },
  {
    id: "frame-05",
    name: "Modern Editorial",
    type: "single",
    photoCount: 1,
    subtitle: "Desain majalah kontemporer dengan stempel tanggal",
    color: "#2b2b2b",
    style: "modern",
    accent: "Clean Editorial",
    overlay: "frame-05"
  },
  {
    id: "frame-06",
    name: "Trio Photostrip",
    type: "multi",
    photoCount: 3,
    subtitle: "Strip photobooth 3 foto vertikal memanjang bernuansa klasik",
    color: "#5c4033",
    style: "multi-strip",
    accent: "3 Foto (Photostrip)",
    overlay: "frame-06",
    slots: [
      {
        id: 1,
        name: "Foto 1 (Atas)",
        x: 108,
        y: 64,
        width: 864,
        height: 366
      },
      {
        id: 2,
        name: "Foto 2 (Tengah)",
        x: 108,
        y: 450,
        width: 864,
        height: 366
      },
      {
        id: 3,
        name: "Foto 3 (Bawah)",
        x: 108,
        y: 836,
        width: 864,
        height: 366
      }
    ]
  },
  {
    id: "frame-07",
    name: "Trio Asymmetric",
    type: "multi",
    photoCount: 3,
    subtitle: "Kolase modern: 1 foto tinggi di kiri + 2 foto di kanan",
    color: "#5c4033",
    style: "multi-split",
    accent: "3 Foto (Asymmetric)",
    overlay: "frame-07",
    slots: [
      {
        id: 1,
        name: "Foto 1 (Tinggi Kiri)",
        x: 72,
        y: 64,
        width: 456,
        height: 1148
      },
      {
        id: 2,
        name: "Foto 2 (Kanan Atas)",
        x: 552,
        y: 64,
        width: 456,
        height: 564
      },
      {
        id: 3,
        name: "Foto 3 (Kanan Bawah)",
        x: 552,
        y: 648,
        width: 456,
        height: 564
      }
    ]
  }
];

// Mock gallery covers all 6 test combinations required:
export const INITIAL_GALLERY = [
  {
    id: "gal-01",
    type: "photo",
    photoCount: 1,
    guestName: "Reyhan & Farah",
    guestMessage: "Selamat menempuh hidup baru Nela & Fadli! Semoga sakinah mawaddah warahmah selalu.",
    guestPhoto: guestCoupleImg,
    mediaUrl: guestCoupleImg,
    thumbnailUrl: guestCoupleImg,
    frameId: "frame-01",
    frameName: "Minimal Elegant",
    hasVoiceNote: true,
    voiceDuration: "00:18",
    voiceUrl: null,
    createdAt: "27 Des 2026 · 14:15 WIB",
    likes: 24,
  },
  {
    id: "gal-02",
    type: "boomerang",
    guestName: "Aulia & Siska",
    guestMessage: "Cantik banget Nel! Bahagia selamanya kalian berdua, love you always!",
    guestPhoto: guestBridesmaidsImg,
    mediaUrl: guestBridesmaidsImg,
    thumbnailUrl: guestBridesmaidsImg,
    frameId: "frame-02",
    frameName: "Botanical Romance",
    hasVoiceNote: true,
    voiceDuration: "00:12",
    voiceUrl: null,
    createdAt: "27 Des 2026 · 14:32 WIB",
    likes: 38,
  },
  {
    id: "gal-03",
    type: "multi-photo",
    photoCount: 3,
    guestName: "Trio Sahabat",
    guestMessage: "Tiga momen terbaik di hari pernikahan kalian! Happy wedding!",
    guestPhoto: guestFriendsImg,
    mediaUrl: guestFriendsImg,
    thumbnailUrl: guestFriendsImg,
    frameId: "frame-04",
    frameName: "Three Moments",
    hasVoiceNote: true,
    voiceDuration: "00:15",
    voiceUrl: null,
    createdAt: "27 Des 2026 · 14:40 WIB",
    likes: 42,
  },
  {
    id: "gal-04",
    type: "photo",
    photoCount: 1,
    guestName: "Dimas & Satria",
    guestMessage: "Selamat bro Fadli! Akhirnya sah juga lu bro, selamat menempuh babak baru yang berkah!",
    guestPhoto: guestFriendsImg,
    mediaUrl: guestFriendsImg,
    thumbnailUrl: guestFriendsImg,
    frameId: "frame-05",
    frameName: "Modern Editorial",
    hasVoiceNote: false,
    voiceDuration: null,
    voiceUrl: null,
    createdAt: "27 Des 2026 · 14:50 WIB",
    likes: 19,
  },
  {
    id: "gal-05",
    type: "boomerang",
    guestName: "Budi & Sarah",
    guestMessage: "Kompak terus sampai kakek nenek ya! Seru banget acaranya!",
    guestPhoto: guestCoupleImg,
    mediaUrl: guestCoupleImg,
    thumbnailUrl: guestCoupleImg,
    frameId: "frame-03",
    frameName: "Luxury Warm Brown",
    hasVoiceNote: false,
    voiceDuration: null,
    voiceUrl: null,
    createdAt: "27 Des 2026 · 15:05 WIB",
    likes: 15,
  },
  {
    id: "gal-06",
    type: "photo",
    photoCount: 1,
    guestName: "Nadia Putri",
    guestMessage: "Bahagia selalu Nela & Fadli 🤍",
    guestPhoto: guestBridesmaidsImg,
    mediaUrl: guestBridesmaidsImg,
    thumbnailUrl: guestBridesmaidsImg,
    frameId: "frame-01",
    frameName: "Minimal Elegant",
    hasVoiceNote: false,
    voiceDuration: null,
    voiceUrl: null,
    createdAt: "27 Des 2026 · 15:20 WIB",
    likes: 12,
  }
];
