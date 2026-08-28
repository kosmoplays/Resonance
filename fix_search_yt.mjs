
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", "utf8");

// Find the start of fetchYTMusic and the line after it closes
const startIdx = content.indexOf("      // --- MOTOR NATIVO YOUTUBE MUSIC");
const endIdx = content.indexOf("      // --- BÚSQUEDA MULTIVERSO SIMULTÁNEA ---");

if (startIdx === -1 || endIdx === -1) {
  console.log("Boundary not found. start:", startIdx, "end:", endIdx);
  process.exit(1);
}

const newBlock = `      // --- MOTOR YOUTUBE (API OFICIAL v3, con auto-renovación de token) ---
      const fetchYTMusic = async () => {
        try {
          const data = await ytApiFetch(
            "https://www.googleapis.com/youtube/v3/search?part=snippet&q=" +
            encodeURIComponent(searchQuery) +
            "&type=video,channel&maxResults=25&relevanceLanguage=es"
          );

          if (!data) return { tracks: [], users: [] };

          const ytTracks: any[] = [];
          const ytUsers: any[] = [];

          for (const item of data.items || []) {
            const snip = item.snippet;
            if (item.id.kind === "youtube#video") {
              const thumb =
                snip.thumbnails?.high?.url ||
                snip.thumbnails?.medium?.url ||
                snip.thumbnails?.default?.url ||
                "https://placehold.co/500x500/1a1a1a/333333?text=YT";
              ytTracks.push({
                id: "yt-" + item.id.videoId,
                title: snip.title,
                user: {
                  id: "yt-user-" + snip.channelId,
                  username: snip.channelTitle,
                  provider: "youtube",
                  yt_id: snip.channelId,
                },
                artwork_url: thumb,
                playback_count: 0,
                provider: "youtube",
                yt_videoId: item.id.videoId,
              });
            } else if (item.id.kind === "youtube#channel") {
              const thumb =
                snip.thumbnails?.high?.url ||
                snip.thumbnails?.medium?.url ||
                snip.thumbnails?.default?.url ||
                "https://placehold.co/500x500/1a1a1a/333333?text=USER";
              ytUsers.push({
                id: "yt-user-" + item.id.channelId,
                username: snip.title,
                avatar_url: thumb,
                permalink: snip.customUrl || snip.title,
                followers_count: 0,
                verified: false,
                provider: "youtube",
                yt_id: item.id.channelId,
              });
            }
          }

          return { tracks: ytTracks, users: ytUsers };
        } catch (err: any) {
          console.error("fetchYTMusic error:", err);
          return { tracks: [], users: [] };
        }
      };

      `;

content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
fs.writeFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", content);
console.log("Replaced fetchYTMusic successfully");

