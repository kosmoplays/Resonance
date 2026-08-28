
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('yt_dump.json', 'utf8'));
const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs || [];
const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
for (const section of tab) {
  const items = section.musicShelfRenderer?.contents || [];
  if (items.length > 0) {
    console.log('Section title:', section.musicShelfRenderer?.title?.runs?.[0]?.text || 'No title');
    const firstItem = items[0].musicResponsiveListItemRenderer;
    console.log('First item columns:', JSON.stringify(firstItem.flexColumns, null, 2).slice(0, 300));
  }
}

