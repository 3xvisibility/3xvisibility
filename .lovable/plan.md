## Full Rebuild Plan — Templates → Campaigns → Generated Pages

### Phase 1: Templates (Priority)
**UI Rebuild:**
- Clean template list with grid/table toggle, search, filters
- AI Builder: structured form (business type, niche, language, sections) — NO style variables ever
- Template editor with live preview, variable panel (content-only), SEO patterns
- Responsive: card layout on mobile, table on desktop

**Backend Fix:**
- Update `generate-template` edge function: stricter prompt, better variable filtering
- Ensure all variable detection uses `design-vars-filter.ts` everywhere

### Phase 2: Campaigns  
**UI Rebuild:**
- Step-by-step wizard: Basics → Data Source → Template → Mapping → Settings → Review
- Mapping step: only content variables, auto-match CSV columns, custom values
- Generation dialog: draft/publish, row limits, schedule, retry failed
- Responsive wizard with progress indicator

**Backend Fix:**
- Update `generate-pages` edge function: reliable batch processing, proper error handling
- Fix slug generation, deduplication, template rendering

### Phase 3: Generated Pages
**UI Rebuild:**
- Pages list with filters (status, campaign, website), bulk actions
- Page preview dialog with rendered HTML
- Inline SEO editor, status management, retry mechanism
- Responsive table with progressive column hiding

**Backend Fix:**
- Fix `publish-pages` edge function: proper CMS publishing per platform
- Better error messages and retry logic

### Design Principles:
- Modern glassmorphism matching existing dark theme
- No style/design variables anywhere in UI
- Mobile-first responsive
- Professional typography and spacing
