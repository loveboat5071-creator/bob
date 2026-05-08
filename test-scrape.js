const https = require('https');
https.get('https://place.map.kakao.com/26338954', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const fs = require('fs');
    fs.writeFileSync('scrape.html', data);
    console.log("Size:", data.length);
  });
});
