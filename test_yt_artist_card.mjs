
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('yt_dump.json', 'utf8'));
const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
const artists = [];
for (const section of tab) {
  if (section.musicCardShelfRenderer) {
    const title = section.musicCardShelfRenderer.title?.runs?.[0]?.text;
    const browseId = section.musicCardShelfRenderer.buttons?.[0]?.buttonRenderer?.navigationEndpoint?.browseEndpoint?.browseId;
    if (browseId?.startsWith('UC')) artists.push({ id: browseId, name: title });
  }
}
console.log('Top Card Artists:', artists);

