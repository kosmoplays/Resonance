
async function test() {
  const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20230508.01.00' } }, query: 'taylor swift' })
  });
  console.log(res.ok);
  const json = await res.json();
  const tabs = json.contents?.tabbedSearchResultsRenderer?.tabs || [];
  const tab = tabs[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  console.log('Got contents:', tab.length);
}
test().catch(console.error);
