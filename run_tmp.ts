import { htmlToElementor } from "/dev-server/supabase/functions/_shared/connectors/elementor-engine.ts";
const html = await Deno.readTextFile("/tmp/plumber.html");
const tree = htmlToElementor(html);
function walk(els:any[], d=0){
  for(const e of els){
    const s=e.settings||{};
    const keys=["container_type","grid_columns_grid","__xxxv_grid_template_columns","flex_direction","background_background","background_color","__xxxv_background","padding","min_height","border_radius","__xxxv_border","width","content_width"];
    const brief:any={};
    for(const k of keys) if(s[k]!==undefined) brief[k]=s[k];
    console.log("  ".repeat(d)+ (e.widgetType||e.elType), JSON.stringify(brief));
    if(e.elements&&e.elements.length) walk(e.elements,d+1);
  }
}
walk(tree);
