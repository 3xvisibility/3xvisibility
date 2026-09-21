const https=require('https');
function get(url){return new Promise(res=>{https.get(url,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res({status:r.statusCode,body:d}))}).on('error',e=>res({err:e.message}))})}
(async()=>{
for(const u of ['https://www.3xvisibility.com/','https://www.3xvisibility.com/about','https://www.3xvisibility.com/pricing','https://www.3xvisibility.com/blog/seo-vs-aeo-vs-geo']){
const r=await get(u);
const c=(r.body&&r.body.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)||[])[1]||'none';
const og=(r.body&&r.body.match(/<meta[^>]*property=["']og:url["'][^>]*content=["']([^"']+)["']/i)||[])[1]||'none';
console.log(u+' -> status='+r.status+' canonical='+c+' og:url='+og+' selfRef='+(c===u||(c===u+'/')));
}
})();
