
import fs from 'fs';
async function test() {
  const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36', 'Origin': 'https://music.youtube.com' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20230508.01.00' } }, query: 'taylor swift' })
  });
  const json = await res.json();
  const tabs = json.contents?.tabbedSearchResultsRenderer?.tabs || [];
  const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  const artists = [];
  for (const section of tab) {
    let items = section.itemSectionRenderer?.contents || section.musicShelfRenderer?.contents || [];
    for (const item of items) {
      const r = item.musicResponsiveListItemRenderer;
      if (!r) continue;
      const playEndpoint = r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
      const browseEndpoint = r.navigationEndpoint?.browseEndpoint?.browseId;
      const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
      if (!playEndpoint && browseEndpoint?.startsWith('UC')) {
        artists.push({ id: browseEndpoint, name: title });
      }
    }
  }
  console.log('Artists:', artists);
}
test().catch(console.error);
