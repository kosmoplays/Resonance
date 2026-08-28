import YTMusic from 'ytmusic-api'; const yt = new YTMusic(); yt.initialize().then(() => yt.search('taylor swift')).then(res => console.log('YTMusic results:', res.length)).catch(console.error);
