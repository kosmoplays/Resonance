# Resonance 🎵

**Resonance** es una aplicación de escritorio de música multiplataforma construida con **Tauri v2 + React 19 + TypeScript**.

Combina SoundCloud y YouTube Music en una sola interfaz con soporte de Discord Rich Presence, biblioteca personal en Supabase, playlists, sistema de likes, y reproducción de archivos locales.

## Stack Técnico

| Capa | Tecnología |
|---|---|
| UI Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Estilos | Tailwind CSS v4 |
| Estado Global | Zustand 5 |
| Backend Desktop | Tauri v2 (Rust) |
| Base de Datos | Supabase (PostgreSQL) |
| Audio SC | Web Audio API + SoundCloud Widget |
| Audio YT | YouTube IFrame API + Piped API |
| Discord | discord-rich-presence (Rust) |

## Estructura del Proyecto

```
resonance/
├── src/
│   ├── ResonanceApp.tsx          # Componente raíz de la app
│   ├── main.tsx                  # Entry point
│   ├── App.css                   # Estilos globales + variables de tema
│   ├── vite-env.d.ts
│   ├── lib/
│   │   └── supabase.ts           # Cliente Supabase
│   ├── store/
│   │   ├── useAuthStore.ts       # Sesión de usuario (Supabase Auth)
│   │   ├── usePlayerStore.ts     # Estado del reproductor + IndexedDB local
│   │   ├── useThemeStore.ts      # Gestión de temas
│   │   └── useHubStore.ts        # Compatibilidad (standalone: siempre 'resonance')
│   ├── hooks/
│   │   ├── useAudioEngine.ts     # Motor de audio: SC Widget + YT IFrame + Web Audio API
│   │   ├── useSoundCloud.ts      # Orquestador principal (compose de los 3 hooks)
│   │   ├── useResonanceLibrary.ts # Biblioteca: likes, playlists, follows (Supabase + SC + YT)
│   │   ├── useSearchEngine.ts    # Búsqueda multiverso SC + YT (con deduplicación)
│   │   └── useArtistProfile.ts   # Perfil de artista híbrido SC + YT
│   ├── components/
│   │   ├── Sidebar.tsx           # Barra lateral: búsqueda, biblioteca, playlists
│   │   ├── MainContent.tsx       # Área principal: listas, perfiles, búsquedas
│   │   ├── PlayerFooter.tsx      # Reproductor inferior: controles, progreso, volumen
│   │   ├── TrackList.tsx         # Lista de pistas reutilizable
│   │   ├── ArtistGrid.tsx        # Grid/Carrusel de artistas
│   │   ├── ContextMenu.tsx       # Menú contextual de pista
│   │   ├── ProfileHeader.tsx     # Cabecera de perfil de artista
│   │   ├── ThemeSwitcher.tsx     # Selector de tema visual
│   │   └── QueuePanel.tsx        # Panel de cola de reproducción
│   └── views/
│       ├── AuthView.tsx          # Login / Registro Supabase
│       ├── HomeView.tsx          # Inicio: Radar de Novedades + Para Ti
│       ├── ProfileView.tsx       # Perfil del usuario: estadísticas + integraciones
│       └── OAuthCallback.tsx     # Callback OAuth (YouTube, SoundCloud)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs               # Entry point Rust
│   │   └── lib.rs                # Comando set_discord_status + inicialización Tauri
│   ├── Cargo.toml                # Dependencias Rust
│   └── tauri.conf.json           # Configuración de la app Tauri
└── package.json
```

## Requisitos

- **Node.js** >= 18
- **Rust** >= 1.77 (con `cargo`)
- **Tauri CLI v2**: `npm install -g @tauri-apps/cli`

## Variables de Entorno

Crea un archivo `.env` en la raíz con:

```env
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

## Tablas Requeridas en Supabase

```sql
-- Likes de canciones
create table resonance_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  track_id text not null,
  track_data jsonb,
  created_at timestamptz default now()
);

-- Playlists personales
create table resonance_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  tracks jsonb default '[]',
  artwork_url text default '',
  created_at timestamptz default now()
);

-- Artistas seguidos
create table resonance_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  artist_id text not null,
  artist_data jsonb,
  created_at timestamptz default now()
);

-- Letras de canciones
create table resonance_lyrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  track_id text not null,
  lyrics_data jsonb,
  raw_text text,
  created_at timestamptz default now()
);

-- Cuentas externas vinculadas (YouTube, SoundCloud)
create table linked_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  account_id text not null,
  provider text not null,
  account_name text,
  created_at timestamptz default now()
);
```

## Comandos

```bash
# Instalar dependencias
npm install

# Modo desarrollo (abre ventana Tauri)
npm run tauri dev

# Build de producción
npm run tauri build
```

## Funcionalidades

- 🎵 **Reproducción híbrida** SoundCloud + YouTube Music (audio puro + fallback Widget)
- 📚 **Biblioteca personal** sincronizada en Supabase
- 🎛️ **Web Audio API** con compresor dinámico y visualizador de frecuencias
- 🔔 **Radar de Novedades** (feed de artistas seguidos)
- ✨ **Algoritmo Para Ti** basado en gustos del usuario
- 📂 **Archivos locales** (IndexedDB, reproduce cualquier formato)
- 🎨 **Múltiples temas** visuales
- 🎮 **Discord Rich Presence** con portada dinámica y barra de progreso
- 🔗 **Integración YouTube** vía OAuth 2.0
- 🔗 **Integración SoundCloud** vía token manual
