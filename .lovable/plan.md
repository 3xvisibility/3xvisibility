## PGP Feature Parity Plan

### Phase 1: Database — Add demographics columns to locations table
- Add columns: `population_male`, `population_female`, `median_age`, `median_household_income`, `ethnicity_data` (jsonb)
- These will be populated by the AI seeding process

### Phase 2: Radius + Area Location Modes
- Update the Location Database dialog to support two modes:
  - **Radius**: Enter an address/city + radius (miles/km), fetch locations within that distance using lat/lng math
  - **Area**: Select specific Regions/States and Counties (current behavior, enhanced with multi-select)
- Add county filtering to the location keyword generator

### Phase 3: Text File Import for Keywords
- Add `.txt` file support to the PGP Keywords import flow
- Parse one term per line into a single keyword group

### Phase 4: Airtable & Notion as Keyword Sources
- Add "Airtable" and "Notion" source types to the keyword creation dialog
- User provides API key + table/database ID
- Edge function fetches data and populates keyword terms

### Phase 5: AI Auto-Generate Keywords + Content Groups
- Add a wizard: user enters service/product + location preferences
- AI generates matching keyword groups AND a content group template automatically
- One-click setup for entire PGP workflow

### Phase 6: Update AI Seeding to Include Demographics
- Enhance the `seed-locations` edge function to include demographic data when generating location datasets
