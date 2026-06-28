import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createHttpServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SIMULATED ONTHESPOT BACKEND STATE ---

const defaultTemplateData: Record<string, any> = {
  version: "v2.0.0alpha1",
  debug_mode: false,
  language_index: 0,
  language: "en_US",
  total_downloaded_items: 42,
  total_downloaded_data: 348291048,
  m3u_format: "m3u8",
  use_double_digit_path_numbers: false,
  ffmpeg_args: [],
  active_account_number: 0,
  accounts: [
    { uuid: "public_bandcamp", service: "bandcamp", active: true },
    { uuid: "public_soundcloud", service: "soundcloud", active: true, login: { client_id: "sc_client_8921", app_version: "1.0", app_locale: "en" } },
    { uuid: "public_youtube_music", service: "youtube_music", active: true },
    { uuid: "public_generic", service: "generic", active: true },
    { uuid: "user_spotify_1", service: "spotify", active: true, username: "samuel_b" },
    { uuid: "user_tidal_1", service: "tidal", active: true, username: "hifi_master" }
  ],
  use_webui_login: false,
  webui_username: "admin",
  webui_password: "",
  theme: "background-color: #282828; color: white;",
  explicit_label: "🅴",
  download_copy_btn: true,
  download_open_btn: true,
  download_locate_btn: true,
  download_delete_btn: true,
  show_search_thumbnails: true,
  show_download_thumbnails: true,
  thumbnail_size: 60,
  max_search_results: 15,
  disable_download_popups: false,
  windows_10_explorer_thumbnails: false,
  mirror_spotify_playback: true,
  close_to_tray: false,
  check_for_updates: true,
  illegal_character_replacement: "-",
  raw_media_download: false,
  rotate_active_account_number: false,
  download_delay: 2,
  download_delay_variance: 0,
  download_chunk_size: 50000,
  maximum_queue_workers: 3,
  maximum_download_workers: 2,
  enable_retry_worker: true,
  retry_worker_delay: 5,
  api_retry_max_attempts: 3,
  api_retry_base_delay: 2,
  api_retry_max_delay: 60,
  api_request_delay: 0.1,
  spotify_webapi_override_client_id: "",
  spotify_webapi_override_client_secret: "",
  cache_metadata_in_queue: true,
  fetch_genre_metadata: true,
  fetch_extended_album_metadata: true,
  fetch_audio_features: false,
  fetch_track_credits: true,
  enable_search_tracks: true,
  enable_search_albums: true,
  enable_search_playlists: true,
  enable_search_artists: true,
  enable_search_episodes: true,
  enable_search_podcasts: true,
  enable_search_audiobooks: true,
  f_search_tracks: false,
  f_search_albums: false,
  f_search_artists: false,
  f_search_playlists: false,
  search_prefix: "the",
  download_queue_show_waiting: true,
  download_queue_show_failed: true,
  download_queue_show_cancelled: true,
  download_queue_show_unavailable: true,
  download_queue_show_completed: true,
  audio_download_path: "/home/user/Music/OnTheSpot",
  track_file_format: "flac",
  track_path_formatter: "Tracks/{album_artist}/[{year}] {album}/{track_number}. {name}",
  podcast_file_format: "mp3",
  podcast_path_formatter: "Episodes/{album}/{name}",
  use_playlist_path: true,
  playlist_path_formatter: "Playlists/{playlist_name} by {playlist_owner}/{playlist_number}. {name} - {artist}",
  create_m3u_file: true,
  m3u_path_formatter: "M3U/{playlist_name}",
  extinf_separator: "; ",
  extinf_label: "{playlist_number}. {artist} - {name}",
  save_album_cover: true,
  album_cover_format: "png",
  file_bitrate: "320k",
  file_hertz: 48000,
  use_custom_file_bitrate: true,
  download_lyrics: true,
  only_download_synced_lyrics: true,
  only_download_plain_lyrics: false,
  save_lrc_file: true,
  translate_file_path: false,
  metadata_separator: "; ",
  overwrite_existing_metadata: false,
  embed_branding: false,
  embed_cover: true,
  embed_artist: true,
  embed_album: true,
  embed_albumartist: true,
  embed_name: true,
  embed_year: true,
  embed_discnumber: true,
  embed_tracknumber: true,
  embed_genre: true,
  embed_performers: true,
  embed_producers: true,
  embed_writers: true,
  embed_composer: true,
  prefer_composer_as_album_artist: false,
  shorten_composer_tag: false,
  embed_label: true,
  embed_copyright: true,
  embed_description: true,
  embed_language: true,
  embed_isrc: true,
  embed_length: true,
  embed_url: true,
  embed_key: true,
  embed_bpm: true,
  embed_compilation: true,
  embed_lyrics: true,
  embed_explicit: true,
  embed_upc: false,
  embed_service_id: true,
  video_download_path: "/home/user/Videos/OnTheSpot",
  movie_file_format: "mkv",
  movie_path_formatter: "Movies/{name} ({release_year})",
  show_file_format: "mkv",
  show_path_formatter: "Shows/{show_name}/Season {season_number}/{episode_number}. {name}",
  preferred_video_resolution: 1080,
  download_subtitles: true,
  download_chapters: true,
  preferred_audio_language: "en-US",
  preferred_subtitle_language: "en-US",
  download_all_available_audio: false,
  download_all_available_subtitles: false,
  v2a_enable: false,
  v2a_preferred_codec: "mp3",
  v2a_preferred_bitrate: 192
};

let otsConfig: Record<string, any> = JSON.parse(JSON.stringify(defaultTemplateData));

export interface DownloadItem {
  local_id: string;
  available: boolean;
  item_service: string;
  item_type: string;
  item_id: string;
  item_status: 'Waiting' | 'Downloading' | 'Completed' | 'Failed' | 'Cancelled';
  file_path: string | null;
  parent_category: string;
  playlist_name: string;
  playlist_by: string;
  playlist_number?: number;
  // Extra UI fields for rich dashboard
  name: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  progress: number; // 0 - 100
  download_speed: string;
  file_size: string;
  format: string;
}

let downloadQueue: DownloadItem[] = [
  {
    local_id: "q_101",
    available: true,
    item_service: "spotify",
    item_type: "track",
    item_id: "4ZtFanR9U6ndgddUvXn522",
    item_status: "Completed",
    file_path: "/home/user/Music/OnTheSpot/Tracks/The Weeknd/[2020] After Hours/02. Blinding Lights.flac",
    parent_category: "Track",
    playlist_name: "",
    playlist_by: "",
    name: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    thumbnail: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=150&auto=format&fit=crop&q=80",
    progress: 100,
    download_speed: "0 MB/s",
    file_size: "34.2 MB",
    format: "FLAC 24-bit/48kHz"
  },
  {
    local_id: "q_102",
    available: true,
    item_service: "tidal",
    item_type: "track",
    item_id: "198324781",
    item_status: "Downloading",
    file_path: null,
    parent_category: "Album: Discovery",
    playlist_name: "",
    playlist_by: "",
    name: "One More Time",
    artist: "Daft Punk",
    album: "Discovery",
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80",
    progress: 65,
    download_speed: "6.4 MB/s",
    file_size: "41.8 MB",
    format: "FLAC Master"
  },
  {
    local_id: "q_103",
    available: true,
    item_service: "apple_music",
    item_type: "track",
    item_id: "am_991823",
    item_status: "Waiting",
    file_path: null,
    parent_category: "Playlist: Summer Vibes 2026",
    playlist_name: "Summer Vibes 2026",
    playlist_by: "Apple Editorial",
    playlist_number: 14,
    name: "Espresso",
    artist: "Sabrina Carpenter",
    album: "Short n' Sweet",
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&auto=format&fit=crop&q=80",
    progress: 0,
    download_speed: "0 MB/s",
    file_size: "9.8 MB",
    format: "ALAC 256k"
  },
  {
    local_id: "q_104",
    available: true,
    item_service: "soundcloud",
    item_type: "track",
    item_id: "sc_881920",
    item_status: "Failed",
    file_path: null,
    parent_category: "Track",
    playlist_name: "",
    playlist_by: "",
    name: "Midnight Tokyo Lo-Fi Mix",
    artist: "Kuro Rhythms",
    album: "Single",
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=150&auto=format&fit=crop&q=80",
    progress: 12,
    download_speed: "0 MB/s",
    file_size: "82.1 MB",
    format: "MP3 320k"
  },
  {
    local_id: "q_105",
    available: true,
    item_service: "bandcamp",
    item_type: "album",
    item_id: "bc_4412",
    item_status: "Waiting",
    file_path: null,
    parent_category: "Album",
    playlist_name: "",
    playlist_by: "",
    name: "Synthwave Odyssey",
    artist: "Timecop1983",
    album: "Night Drive",
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&auto=format&fit=crop&q=80",
    progress: 0,
    download_speed: "0 MB/s",
    file_size: "148.0 MB",
    format: "FLAC"
  }
];

let pendingQueue: Record<string, any> = {};
let parsingQueue: Record<string, any> = {};

let serverLogs: { id: string; timestamp: string; level: 'INFO' | 'WARNING' | 'ERROR' | 'GUI'; message: string }[] = [
  { id: "l1", timestamp: new Date(Date.now() - 60000).toISOString(), level: "INFO", message: "OnTheSpot Engine v2.0.0alpha1 initialized on port 8000." },
  { id: "l2", timestamp: new Date(Date.now() - 55000).toISOString(), level: "GUI", message: "Loaded 6 accounts into account pool (Spotify, Tidal, Soundcloud active)." },
  { id: "l3", timestamp: new Date(Date.now() - 40000).toISOString(), level: "INFO", message: "ParsingWorker spawned with 3 download threads." },
  { id: "l4", timestamp: new Date(Date.now() - 25000).toISOString(), level: "INFO", message: "DownloadWorker starting track: One More Time - Daft Punk" },
  { id: "l5", timestamp: new Date(Date.now() - 10000).toISOString(), level: "WARNING", message: "Soundcloud rate limit soft warning on client_id sc_client_8921." }
];

function addLog(level: 'INFO' | 'WARNING' | 'ERROR' | 'GUI', message: string) {
  const entry = {
    id: "l_" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    level,
    message
  };
  serverLogs.unshift(entry);
  if (serverLogs.length > 500) serverLogs.pop();
  broadcast({ type: 'LOG', line: entry });
}

// Mock database of search items across services
const mockSearchResults = [
  {
    id: "spot_t1",
    item_service: "spotify",
    item_type: "track",
    name: "Starboy",
    artist: "The Weeknd ft. Daft Punk",
    album: "Starboy",
    duration: "3:50",
    release_year: 2016,
    thumbnail: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    url: "https://open.spotify.com/track/7MXVkk9YMqq6psbfefi1NW",
    explicit: true,
    bitrate: "320kbps Ogg"
  },
  {
    id: "tid_t1",
    item_service: "tidal",
    item_type: "track",
    name: "Get Lucky",
    artist: "Daft Punk ft. Pharrell Williams",
    album: "Random Access Memories",
    duration: "6:09",
    release_year: 2013,
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    url: "https://tidal.com/browse/track/198324700",
    explicit: false,
    bitrate: "HiRes FLAC 24/96"
  },
  {
    id: "app_p1",
    item_service: "apple_music",
    item_type: "playlist",
    name: "Today's Hits 2026",
    artist: "Apple Music Pop",
    item_count: 50,
    thumbnail: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&auto=format&fit=crop&q=80",
    url: "https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd",
    explicit: false,
    bitrate: "ALAC Lossless"
  },
  {
    id: "sc_t1",
    item_service: "soundcloud",
    item_type: "track",
    name: "Kyoto Rain Ambient Cyber",
    artist: "Vapor99",
    album: "Cyberia",
    duration: "4:15",
    release_year: 2025,
    thumbnail: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
    url: "https://soundcloud.com/vapor99/kyoto-rain",
    explicit: false,
    bitrate: "256kbps AAC"
  },
  {
    id: "bc_a1",
    item_service: "bandcamp",
    item_type: "album",
    name: "Deep Space Echoes",
    artist: "Solaris Project",
    album: "Deep Space Echoes",
    duration: "48:12",
    release_year: 2026,
    thumbnail: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    url: "https://solarisproject.bandcamp.com/album/deep-space-echoes",
    explicit: false,
    bitrate: "WAV / FLAC"
  },
  {
    id: "ytm_t1",
    item_service: "youtube_music",
    item_type: "track",
    name: "Die With A Smile",
    artist: "Lady Gaga & Bruno Mars",
    album: "Single",
    duration: "4:11",
    release_year: 2024,
    thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
    url: "https://music.youtube.com/watch?v=k_9s00",
    explicit: false,
    bitrate: "256kbps Opus"
  },
  {
    id: "gen_v1",
    item_service: "generic",
    item_type: "movie",
    name: "Cyberpunk: Edgerunners Chronicle",
    artist: "Studio Trigger",
    duration: "2h 10m",
    release_year: 2025,
    thumbnail: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80",
    url: "https://genericvideo.org/watch?id=99281",
    explicit: true,
    bitrate: "1080p MKV DTS"
  },
  {
    id: "spot_t2",
    item_service: "spotify",
    item_type: "podcast",
    name: "Lex Fridman Podcast #450: AI Singularity",
    artist: "Lex Fridman",
    duration: "3h 42m",
    release_year: 2026,
    thumbnail: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300&auto=format&fit=crop&q=80",
    url: "https://open.spotify.com/episode/99182312",
    explicit: false,
    bitrate: "128kbps AAC"
  }
];

// --- WEBSOCKET SERVER INITIALIZATION ---
let wss: WebSocketServer;
const clients = new Set<WebSocket>();

function broadcast(data: any) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Background simulation ticker for active downloads
setInterval(() => {
  let updated = false;
  
  for (const item of downloadQueue) {
    if (item.item_status === 'Waiting') {
      // 30% chance to start downloading if we have capacity
      const activeCount = downloadQueue.filter(i => i.item_status === 'Downloading').length;
      if (activeCount < otsConfig.maximum_download_workers) {
        item.item_status = 'Downloading';
        item.progress = 5;
        item.download_speed = ((Math.random() * 8) + 2).toFixed(1) + " MB/s";
        updated = true;
        addLog('INFO', `DownloadWorker started downloading: ${item.name} (${item.item_service})`);
        broadcast({
          type: 'STATUS_CHANGE',
          item,
          notification: `⚡ Started downloading: ${item.name} by ${item.artist}`
        });
      }
    } else if (item.item_status === 'Downloading') {
      item.progress += Math.floor(Math.random() * 18) + 8;
      item.download_speed = ((Math.random() * 10) + 3).toFixed(1) + " MB/s";
      updated = true;
      
      if (item.progress >= 100) {
        item.progress = 100;
        item.item_status = 'Completed';
        item.download_speed = "0 MB/s";
        item.file_path = `${otsConfig.audio_download_path}/Tracks/${item.artist}/[2026] ${item.album || 'Single'}/01. ${item.name}.${otsConfig.track_file_format}`;
        otsConfig.total_downloaded_items = (otsConfig.total_downloaded_items || 0) + 1;
        otsConfig.total_downloaded_data = (otsConfig.total_downloaded_data || 0) + 32000000;
        
        addLog('INFO', `Successfully converted and embedded metadata for: ${item.name}`);
        broadcast({
          type: 'STATUS_CHANGE',
          item,
          notification: `✅ Download Completed: ${item.name}`
        });
      }
    }
  }

  if (updated) {
    broadcast({ type: 'QUEUE_UPDATE', queue: downloadQueue });
  }
}, 1800);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- REST API ROUTES (Mirrors OnTheSpot FastAPI backend) ---

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: otsConfig.version });
  });

  // Query / Search endpoint
  app.post('/api/query/url', (req, res) => {
    const q = (req.query.q as string) || req.body.q || "";
    const filters = req.body.filters || {};
    
    addLog('INFO', `Search request received for query: "${q}"`);
    
    if (!q.trim()) {
      return res.json([]);
    }

    // Filter results based on query term
    const lowerQ = q.toLowerCase();
    let results = mockSearchResults.filter(item => 
      item.name.toLowerCase().includes(lowerQ) ||
      item.artist.toLowerCase().includes(lowerQ) ||
      item.album?.toLowerCase().includes(lowerQ) ||
      item.item_service.toLowerCase().includes(lowerQ) ||
      lowerQ === 'all' || lowerQ === 'test'
    );

    // If query looks like a URL, create a dynamic item
    if (q.startsWith('http://') || q.startsWith('https://')) {
      const isSpotify = q.includes('spotify');
      const isTidal = q.includes('tidal');
      const isApple = q.includes('apple');
      const service = isSpotify ? 'spotify' : isTidal ? 'tidal' : isApple ? 'apple_music' : 'generic';
      
      const parsedItem = {
        id: "url_" + Math.random().toString(36).substring(2, 7),
        item_service: service,
        item_type: q.includes('playlist') ? 'playlist' : q.includes('album') ? 'album' : 'track',
        name: `Parsed URL Item (${service.toUpperCase()})`,
        artist: "Direct URL Stream",
        album: "Parsed Collection",
        duration: "4:20",
        release_year: 2026,
        thumbnail: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop&q=80",
        url: q,
        explicit: false,
        bitrate: "Original Stream"
      };
      results = [parsedItem, ...results];
    }

    // If no direct matches, return shuffled mock results so dashboard is always rich
    if (results.length === 0) {
      results = mockSearchResults;
    }

    res.json(results);
  });

  app.get('/api/query/url', (req, res) => {
    const q = (req.query.q as string) || "";
    if (!q) return res.json(mockSearchResults);
    const lowerQ = q.toLowerCase();
    const results = mockSearchResults.filter(item => 
      item.name.toLowerCase().includes(lowerQ) ||
      item.artist.toLowerCase().includes(lowerQ)
    );
    res.json(results.length > 0 ? results : mockSearchResults);
  });

  // Download Queues
  app.get('/api/queue/downloads', (req, res) => {
    res.json(downloadQueue);
  });

  // Manually add item to download queue from dashboard
  app.post('/api/queue/downloads/add', (req, res) => {
    const item = req.body.item;
    if (!item) return res.status(400).json({ error: "Missing item" });

    const local_id = "q_" + Math.random().toString(36).substring(2, 8);
    const newItem: DownloadItem = {
      local_id,
      available: true,
      item_service: item.item_service || 'spotify',
      item_type: item.item_type || 'track',
      item_id: item.id || local_id,
      item_status: 'Waiting',
      file_path: null,
      parent_category: item.item_type ? item.item_type.charAt(0).toUpperCase() + item.item_type.slice(1) : 'Track',
      playlist_name: item.item_type === 'playlist' ? item.name : "",
      playlist_by: item.item_type === 'playlist' ? item.artist : "",
      name: item.name || "Unknown Track",
      artist: item.artist || "Unknown Artist",
      album: item.album || "Single",
      thumbnail: item.thumbnail || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80",
      progress: 0,
      download_speed: "0 MB/s",
      file_size: ((Math.random() * 30) + 10).toFixed(1) + " MB",
      format: item.bitrate || `${otsConfig.track_file_format.toUpperCase()} 320k`
    };

    downloadQueue.unshift(newItem);
    addLog('INFO', `Enqueued item for download: ${newItem.name} [${newItem.item_service}]`);
    broadcast({ type: 'QUEUE_UPDATE', queue: downloadQueue });
    broadcast({
      type: 'STATUS_CHANGE',
      item: newItem,
      notification: `📥 Added to Download Queue: ${newItem.name}`
    });

    res.json({ success: true, local_id });
  });

  app.get('/api/queue/downloads/clear', (req, res) => {
    const status = req.query.status as string || "Completed";
    if (status !== "all") {
      downloadQueue = downloadQueue.filter(item => item.item_status !== status);
    } else {
      downloadQueue = downloadQueue.filter(item => item.item_status === 'Downloading');
    }
    addLog('GUI', `Cleared download queue items with status: ${status}`);
    broadcast({ type: 'QUEUE_UPDATE', queue: downloadQueue });
    res.json({ success: true });
  });

  app.get('/api/queue/downloads/retryfailed', (req, res) => {
    let count = 0;
    for (const item of downloadQueue) {
      if (item.item_status === 'Failed' || item.item_status === 'Cancelled') {
        item.item_status = 'Waiting';
        item.progress = 0;
        count++;
      }
    }
    addLog('INFO', `RetryWorker triggered for ${count} failed/cancelled items.`);
    broadcast({ type: 'QUEUE_UPDATE', queue: downloadQueue });
    res.json({ success: true, retried: count });
  });

  // Action on queue item (cancel, delete, locate)
  app.post('/api/queue/downloads/action', (req, res) => {
    const { local_id, action } = req.body;
    const idx = downloadQueue.findIndex(i => i.local_id === local_id);
    if (idx === -1) return res.status(404).json({ error: "Item not found" });

    const item = downloadQueue[idx];

    if (action === 'cancel' || action === 'delete') {
      if (item.item_status === 'Downloading' || item.item_status === 'Waiting') {
        item.item_status = 'Cancelled';
        item.download_speed = "0 MB/s";
        addLog('WARNING', `Cancelled download: ${item.name}`);
      } else {
        downloadQueue.splice(idx, 1);
        addLog('GUI', `Removed item from queue: ${item.name}`);
      }
    } else if (action === 'retry') {
      item.item_status = 'Waiting';
      item.progress = 0;
    }

    broadcast({ type: 'QUEUE_UPDATE', queue: downloadQueue });
    res.json({ success: true });
  });

  app.get('/api/queue/pending', (req, res) => {
    res.json(pendingQueue);
  });

  app.get('/api/queue/parsing', (req, res) => {
    res.json(parsingQueue);
  });

  // Config Endpoints
  app.get('/api/config/get', (req, res) => {
    res.json(otsConfig);
  });

  app.post('/api/config/set', (req, res) => {
    const nkey = (req.query.nkey as string) || req.body.nkey;
    let nvalue = (req.query.nvalue as string) || req.body.nvalue;

    if (!nkey) return res.status(400).json({ error: "Missing nkey" });

    // Parse booleans and numbers if string
    if (nvalue === 'true') nvalue = true;
    else if (nvalue === 'false') nvalue = false;
    else if (!isNaN(Number(nvalue)) && nvalue !== "") nvalue = Number(nvalue);

    otsConfig[nkey] = nvalue;
    addLog('GUI', `Config updated: ${nkey} = ${JSON.stringify(nvalue)}`);
    res.json({ success: true, key: nkey, value: nvalue });
  });

  app.post('/api/config/save', (req, res) => {
    addLog('INFO', "OTSConfig saved to persistent storage.");
    res.json({ success: true, config: otsConfig });
  });

  app.post('/api/config/reset', (req, res) => {
    otsConfig = JSON.parse(JSON.stringify(defaultTemplateData));
    addLog('WARNING', "OTSConfig reset to factory template defaults.");
    res.json(otsConfig);
  });

  // Accounts Endpoints
  app.get('/api/accounts/get', (req, res) => {
    res.json(otsConfig.accounts || []);
  });

  app.post('/api/accounts/add', (req, res) => {
    const service = (req.query.service as string) || req.body.service;
    const username = req.body?.username || `${service}_user_${Math.floor(Math.random()*1000)}`;
    const token = req.body?.token || "mock_token_" + Date.now();

    if (!service) return res.status(400).json({ error: "Service required" });

    const newAcc = {
      uuid: `user_${service}_${Date.now()}`,
      service,
      active: true,
      username,
      token
    };

    otsConfig.accounts = otsConfig.accounts || [];
    otsConfig.accounts.push(newAcc);
    addLog('GUI', `Added new ${service.toUpperCase()} account: ${username}`);
    res.json({ success: true, account: newAcc });
  });

  app.post('/api/accounts/remove', (req, res) => {
    const uuid = (req.query.uuid as string) || req.body.uuid;
    if (!uuid) return res.status(400).json({ error: "UUID required" });

    otsConfig.accounts = (otsConfig.accounts || []).filter((a: any) => a.uuid !== uuid);
    addLog('GUI', `Removed account uuid: ${uuid}`);
    res.json({ success: true });
  });

  app.post('/api/spotify/mirror', (req, res) => {
    const state = req.query.state === 'true' || req.body.state === true;
    otsConfig.mirror_spotify_playback = state;
    addLog('INFO', `Spotify Mirror worker state changed to: ${state}`);
    res.json({ success: true, state });
  });

  // Log Viewer
  app.get('/api/logs', (req, res) => {
    res.json(serverLogs);
  });

  // --- HTTP & WEBSOCKET SERVER BOOTSTRAP ---

  const httpServer = createHttpServer(app);
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    clients.add(ws);
    // Send initial handshake
    ws.send(JSON.stringify({ type: 'HANDSHAKE', version: otsConfig.version, queue: downloadQueue }));

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Vite Middleware for SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OnTheSpot Fullstack Server running on http://localhost:${PORT}`);
  });
}

startServer();
