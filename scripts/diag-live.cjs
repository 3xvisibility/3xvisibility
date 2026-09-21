const https=require('https');
function get(url){return new Promise(res=>{https.get(url,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({url,status:r.statusCode,server:r.headers.server||'',vercel:r.headers['x-vercel-id']||'',cf:r.headers['cf-ray']||'',len:d.length,body:d.slice(0,120)}))}).on('error',e=>res({url,err:e.message}))})}
(async()=>{
for(const u of ['https://www.3xvisibility.com/','https://www.3xvisibility.com/index.html','https://www.3xvisibility.com/robots.txt','https://www.3xvisibility.com/sitemap.xml','https://www.3xvisibility.com/about/']){
const r=await get(u);console.log(JSON.stringify(r));
}
})();
