
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('yt_dump.json', 'utf8'));
const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

const tracks = [];
const artists = [];

for (const section of tab) {
  let items = [];
  if (section.musicCardShelfRenderer) {
    // top result maybe?
  }
  if (section.itemSectionRenderer?.contents) {
    items = section.itemSectionRenderer.contents;
  } else if (section.musicShelfRenderer?.contents) {
    items = section.musicShelfRenderer.contents;
  }
  
  for (const item of items) {
    const r = item.musicResponsiveListItemRenderer;
    if (!r) continue;
    const playEndpoint = r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
    const isSong = !!playEndpoint;
    const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    const browseEndpoint = r.navigationEndpoint?.browseEndpoint?.browseId;
    const isArtist = !isSong && browseEndpoint?.startsWith('UC');
    
    const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
    const thumb = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : null;
    
    if (isSong) {
      const artistRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const artistRun = artistRuns.find(run => run.navigationEndpoint?.browseEndpoint?.browseId?.startsWith('UC'));
      const artistId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId;
      const artistName = artistRun?.text || 'Desconocido';
      
      tracks.push({
        title,
        yt_videoId: playEndpoint.videoId,
        artistName,
        artistId
      });
    } else if (isArtist) {
      artists.push({
        title,
        browseEndpoint
      });
    }
  }
}
console.log('Tracks:', tracks.length, tracks.slice(0, 2));
console.log('Artists:', artists.length, artists.slice(0, 2));

