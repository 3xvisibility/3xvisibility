const https=require('https');const fs=require('fs');
https.get('https://www.3xvisibility.com/',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{
const m=d.match(/\/assets\/index-[^"']+\.js/);
console.log('live bytes:',d.length);
console.log('live asset:',m?m[0]:'none');
console.log('live title:',(d.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]);
console.log('live noscript:',/<noscript>/i.test(d));
console.log('live new hero:',d.includes('3xVisibility is the programmatic SEO platform'));
const dist=fs.existsSync('dist/index.html')?fs.readFileSync('dist/index.html','utf8'):'';
const dm=dist.match(/\/assets\/index-[^"']+\.js/);
console.log('dist asset:',dm?dm[0]:'none');
console.log('dist noscript:',/<noscript>/i.test(dist));
});}).on('error',e=>console.log('ERR',e.message));
