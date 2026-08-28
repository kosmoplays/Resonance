
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/ResonanceApp.tsx", "utf8");

const fetchLyricsCorrect = `const fetchLyrics = async () => {
        setIsLoadingLyrics(true);
        try {
          const trackKey = String(currentTrack.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack.id);

          // 1. EXTRACCIÓN LOCAL (MÁXIMA PRIORIDAD OFFLINE)
          let localDb: Record<string, any> = {};
          try { localDb = JSON.parse(localStorage.getItem("resonance_local_lyrics") || "{}"); } catch(e) {}
          if (localDb[trackKey]) {
            setLyrics(localDb[trackKey].lyrics_data);
            setAutoLyricsBackup(localDb[trackKey].lyrics_data);
            setCustomLyricsRaw(localDb[trackKey].raw_text || "");
            setIsLoadingLyrics(false);
            return;
          }

          // 2. EXTRACCIÓN NUBE (Supabase)
          const { data: dbLyrics, error: dbErr } = await supabase
            .from("resonance_lyrics")
            .select("*")
            .eq("track_id", trackKey)
            .maybeSingle();

          if (dbLyrics && !dbErr) {
            setLyrics(dbLyrics.lyrics_data);
            setAutoLyricsBackup(dbLyrics.lyrics_data);
            setCustomLyricsRaw(dbLyrics.raw_text || "");
            setIsLoadingLyrics(false);
            
            // Re-sincronizar a local para futuro offline
            localDb[trackKey] = { lyrics_data: dbLyrics.lyrics_data, raw_text: dbLyrics.raw_text || "" };
            localStorage.setItem("resonance_local_lyrics", JSON.stringify(localDb));
            return;
          }

          // 3. AUTO-DESCUBRIMIENTO LRCLIB
          const cleanTitle = currentTrack.title.replace(/\\[.*?\\]|\\(.*?\\)/g, "").trim();
          const artist = currentTrack.user?.username || "";
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); 
          
          const res = await tauriFetch(\`https://lrclib.net/api/get?artist_name=\${encodeURIComponent(artist)}&track_name=\${encodeURIComponent(cleanTitle)}\`, {
            method: "GET",
            signal: controller.signal,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Accept": "application/json"
            }
          });
          
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            const minI = 1; const secI = 2; const txtI = 3; 
            if (data.syncedLyrics) {
              const parsed: any[] = [];
              const lines = data.syncedLyrics.split("\\n");
              lines.forEach((line: string) => {
                const match = line.match(/\\[(\\d{2,3}):(\\d{2}(?:\\.\\d+)?)\\](.*)/);
                if (match) {
                  parsed.push({ time: parseInt(match[minI], 10) * 60 + parseFloat(match[secI]), text: match[txtI].trim() });
                }
              });
              setLyrics(parsed);
              setAutoLyricsBackup(parsed);
              setCustomLyricsRaw(data.syncedLyrics);
            } else {
              setLyrics(data.plainLyrics || null);
              setAutoLyricsBackup(data.plainLyrics || null);
              setCustomLyricsRaw(data.plainLyrics || "");
            }
          } else {
            setLyrics(null);
            setAutoLyricsBackup(null);
          }
        } catch (err) {
          console.error("Error obteniendo letras:", err);
          setLyrics(null);
          setAutoLyricsBackup(null);
        } finally {
          setIsLoadingLyrics(false);
        }
      };

      `;

const startIdx = content.search(/const fetchLyrics = async \(\) => \{/);
const endIdx = content.indexOf("fetchLyrics();", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + fetchLyricsCorrect + content.substring(endIdx);
  fs.writeFileSync("c:/Users/pablo/resonance/src/ResonanceApp.tsx", content);
  console.log("Fixed fetchLyrics order");
} else {
  console.log("Could not find boundaries");
}

