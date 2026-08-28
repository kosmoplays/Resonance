
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/ResonanceApp.tsx", "utf8");

// 1. INJECT FETCH
const fetchTarget = "        clearTimeout(timeoutId); // Si responde rápido, desactivamos la bomba de tiempo";
const fetchInjection = `        // 🛡️ EXTRACCIÓN DESDE MEMORIA PERSISTENTE LOCAL
        const trackKey = String(currentTrack.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack.id);
        let localDb = {};
        try { localDb = JSON.parse(localStorage.getItem("resonance_local_lyrics") || "{}"); } catch(e) {}
        if (localDb[trackKey]) {
          setLyrics(localDb[trackKey].lyrics_data);
          setAutoLyricsBackup(localDb[trackKey].lyrics_data);
          setCustomLyricsRaw(localDb[trackKey].raw_text || "");
          setIsLoadingLyrics(false);
          return;
        }

` + fetchTarget;
content = content.replace(fetchTarget, fetchInjection);

// 2. INJECT SAVE
const saveTarget = "    // 🛡️ GUARDADO PERSISTENTE EN NUBE (Resonance Lyrics DB)";
const saveInjection = `    // 🛡️ GUARDADO LOCAL INMEDIATO
    if (currentTrack) {
      try {
        const trackKey = String(currentTrack.yt_videoId ? "yt-" + currentTrack.yt_videoId : currentTrack.id);
        let localDb = {};
        try { localDb = JSON.parse(localStorage.getItem("resonance_local_lyrics") || "{}"); } catch(e) {}
        localDb[trackKey] = { lyrics_data: finalLyrics, raw_text: customLyricsRaw.trim() };
        localStorage.setItem("resonance_local_lyrics", JSON.stringify(localDb));
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { msg: "Letras ancladas localmente", type: "success" } }));
      } catch(e) {
        console.error("Fallo al guardar letras local:", e);
      }
    }

` + saveTarget;
content = content.replace(saveTarget, saveInjection);

fs.writeFileSync("c:/Users/pablo/resonance/src/ResonanceApp.tsx", content);
console.log("Injected lyrics logic");

