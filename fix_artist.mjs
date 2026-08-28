
import fs from "fs";
let content = fs.readFileSync("c:/Users/pablo/resonance/src/hooks/useArtistProfile.ts", "utf8");

const correctBlock = `        if (!ytId) {
            try {
              const res = await tauriFetch("https://music.youtube.com/youtubei/v1/search", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                  "Origin": "https://music.youtube.com",
                  "Cookie": "CONSENT=YES+cb; SOCS=CAI"
                },
                body: JSON.stringify({ 
                  context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20230508.01.00" } }, 
                  query: artistName 
                })
              });
              const json = await res.json();
              const tabs = json.contents?.tabbedSearchResultsRenderer?.tabs || [];
              const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
              let matchId = null;
              let matchName = null;
              for (const section of tab) {
                if (section.musicCardShelfRenderer) {
                  const card = section.musicCardShelfRenderer;
                  const titleRun = card.title?.runs?.[0];
                  const browseId = titleRun?.navigationEndpoint?.browseEndpoint?.browseId;
                  if (browseId?.startsWith("UC") && titleRun.text.toLowerCase().includes(artistName.toLowerCase())) {
                    matchId = browseId; matchName = titleRun.text; break;
                  }
                }
              }
              if (matchId) {
                 ytId = matchId;
                 enrichedUser.yt_handle = matchName;
                 if (!enrichedUser.providers.includes("youtube")) enrichedUser.providers.push("youtube");
              }
            } catch (e) {
                try {
                   const ytToken = localStorage.getItem("youtube_access_token");
                   if (ytToken) {
                       const ofRes = await tauriFetch("https://www.googleapis.com/youtube/v3/search?part=snippet&q=" + encodeURIComponent(artistName) + "&type=channel&maxResults=1", { headers: { Authorization: "Bearer " + ytToken } });
                       const ofData = await ofRes.json();
                       if (ofData.items && ofData.items.length > 0) {
                           ytId = ofData.items[0].id.channelId;
                           enrichedUser.yt_handle = ofData.items[0].snippet.title;
                           if (!enrichedUser.providers.includes("youtube")) enrichedUser.providers.push("youtube");
                       }
                   }
                } catch(err) {}

                if (!ytId) {
                  try {
                    const invRes = await tauriFetch("https://yewtu.be/api/v1/search?q=" + encodeURIComponent(artistName));
                    const invData = await invRes.json();
                    const match = (invData || []).find((a:any) => a.type === "channel" && a.author.toLowerCase().includes(artistName.toLowerCase()));
                    if (match) {
                       ytId = match.authorId;
                       enrichedUser.yt_handle = match.author;
                       if (!enrichedUser.providers.includes("youtube")) enrichedUser.providers.push("youtube");
                    }
                  } catch(err) {}
                }
            }
          }`;

const startIdx = content.indexOf("if (!ytId) {");
const endIdx = content.indexOf("const fetchSC = async () => {");
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + correctBlock + "\n\n      " + content.substring(endIdx);
  fs.writeFileSync("c:/Users/pablo/resonance/src/hooks/useArtistProfile.ts", content);
  console.log("Fixed useArtistProfile");
} else {
  console.log("Could not find boundaries");
}


