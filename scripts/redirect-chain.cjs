const https=require('https');
function get(url){return new Promise(resolve=>{const r=https.get(url,res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,loc:res.headers.location||'',server:res.headers.server||'',body:d}))});r.on('error',e=>resolve({err:String(e.message)}))})}
(async()=>{
let url='https://www.3xvisibility.com/';
for(let i=0;i<8;i++){
const r=await get(url);
console.log('HOP'+i+' '+url+' status='+(r.status||'ERR')+' loc='+(r.loc||'-')+' server='+(r.server||'-')+' len='+(r.body?r.body.length:0));
if(r.err){break}
if(!r.loc||r.status<300||r.status>399){
console.log('FINAL H1='+/<h1/i.test(r.body)+' fallback='+/data-fallback-content/.test(r.body)+' title='+((r.body.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]||'none'));
console.log('BODYHEAD '+r.body.slice(0,200).replace(/\s+/g,' '));
break}
url=new URL(r.loc,url).href}
const w=await get('https://www.3xvisibility.com/');
console.log('WWW status='+w.status+' len='+(w.body?w.body.length:0)+' H1='+/<h1/i.test(w.body||'')+' fallback='+/data-fallback-content/.test(w.body||'')+' loc='+(w.loc||'-'));
})();
