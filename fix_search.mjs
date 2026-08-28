
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", "utf8");

const correctBlock = `        } catch (err: any) { 
          console.error("Fallo principal YTMusic, usando fallbacks:", err);
          
          try {
             const ytToken = localStorage.getItem("youtube_access_token");
             if (ytToken) {
                 const ofRes = await tauriFetch("https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + encodeURIComponent(searchQuery) + "&type=video&maxResults=15", { headers: { Authorization: "Bearer " + ytToken } });
                 const ofData = await ofRes.json();
                 if (ofData.items && ofData.items.length > 0) {
                     const ytTracks = ofData.items.map((s:any) => {
                         const thumbs = s.snippet.thumbnails || {};
                         const finalThumb = thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || "https://placehold.co/500x500/1a1a1a/333333?text=YT";
                         return {
                             id: "yt-" + s.id.videoId,
                             title: s.snippet.title,
                             user: { id: "yt-user-" + s.snippet.channelId, username: s.snippet.channelTitle, provider: "youtube", yt_id: s.snippet.channelId },
                             artwork_url: finalThumb,
                             playback_count: 0,
                             provider: "youtube",
                             yt_videoId: s.id.videoId
                         };
                     });
                     window.dispatchEvent(new CustomEvent("show-toast", { detail: { msg: "Resultados Oficiales YT (API)", type: "success" } }));
                     return { tracks: ytTracks, users: [] };
                 }
             }
          } catch(e) {}

          try {
             const invRes = await tauriFetch("https://yewtu.be/api/v1/search?q=" + encodeURIComponent(searchQuery));
             const invData = await invRes.json();
             const ytTracks = (invData || []).filter((t:any) => t.type === "video").slice(0,15).map((s:any) => ({
                 id: "yt-" + s.videoId,
                 title: s.title,
                 user: { id: "yt-user-" + s.authorId, username: s.author, provider: "youtube", yt_id: s.authorId },
                 artwork_url: s.videoThumbnails?.[0]?.url || "https://placehold.co/500x500/1a1a1a/333333?text=YT",
                 playback_count: s.viewCount || 0,
                 provider: "youtube",
                 yt_videoId: s.videoId
             }));
             const ytUsers = (invData || []).filter((t:any) => t.type === "channel").slice(0,5).map((a:any) => ({
                 id: "yt-user-" + a.authorId,
                 username: a.author,
                 avatar_url: a.authorThumbnails?.[0]?.url || "https://placehold.co/500x500/1a1a1a/333333?text=USER",
                 permalink: a.author,
                 followers_count: a.subCount || 0,
                 verified: false,
                 provider: "youtube"
             }));
             return { tracks: ytTracks, users: ytUsers };
          } catch(e: any) {
             console.error("Invidious falló también", e);
             return { tracks: [], users: [] }; 
          }
        }`;

const startIdx = content.indexOf("        } catch (err: any) {");
const endIdx = content.indexOf("      // --- BÚSQUEDA MULTIVERSO SIMULTÁNEA ---");
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + correctBlock + "\n      };\n\n" + content.substring(endIdx);
  fs.writeFileSync("c:/Users/pablo/resonance/src/hooks/useSearchEngine.ts", content);
  console.log("Fixed useSearchEngine");
} else {
  console.log("Could not find boundaries");
}

