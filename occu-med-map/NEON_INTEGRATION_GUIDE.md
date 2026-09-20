# Neon Medical Providers Integration Guide

This guide explains how to integrate the scraped Google Maps medical provider data from Neon PostgreSQL into the existing Network Map application.

## Overview

The integration adds a new layer of global medical providers to your Network Map, sourced from the Neon database that was populated by the Google Maps scraper. This data complements your existing BlueHive, Dentist, and NPI datasets.

## Prerequisites

1. **Completed Google Maps Scraper Setup**
   - Google Maps API key configured
   - Neon database set up and populated
   - Medical provider data scraped and stored

2. **Environment Variables**
   - Add `VITE_NEON_DATABASE_URL` to your `.env` file
   - This should be the same Neon database URL used for scraping

## Integration Steps

### 1. Add Environment Variable

Add to your `.env` file:

```env
VITE_NEON_DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
```

### 2. Install Dependencies

The required dependencies are already in `package.json`:
- `@neondatabase/serverless` - Neon PostgreSQL client

Run:
```bash
pnpm install
```

### 3. Add Neon Client to App.tsx

Import the Neon client component in your `App.tsx`:

```tsx
import { NeonMedicalProviders } from './components/NeonMedicalProviders';
```

### 4. Add State for Neon Integration

Add these state variables to your App component:

```tsx
const [neonEnabled, setNeonEnabled] = useState(false);
const [neonCategories, setNeonCategories] = useState<string[]>([]);
const [selectedNeonCategories, setSelectedNeonCategories] = useState<string[]>([]);
const [neonStats, setNeonStats] = useState({ total: 0, byCategory: {} as Record<string, number> });
```

### 5. Add Toggle Control

Add a toggle switch in your UI to enable/disable Neon providers:

```tsx
<div className="control-row">
  <label className="control-label">
    <input
      type="checkbox"
      checked={neonEnabled}
      onChange={(e) => setNeonEnabled(e.target.checked)}
    />
    <span>Global Medical Providers (Neon)</span>
  </label>
  {neonEnabled && (
    <div className="neon-stats">
      <span>{neonStats.total} providers</span>
    </div>
  )}
</div>
```

### 6. Add Category Filter (Optional)

If you want to filter by medical categories:

```tsx
{neonEnabled && neonCategories.length > 0 && (
  <div className="category-filter">
    <div className="filter-label">Filter by Category:</div>
    <div className="category-chips">
      {neonCategories.map(cat => (
        <button
          key={cat}
          className={`category-chip ${selectedNeonCategories.includes(cat) ? 'active' : ''}`}
          onClick={() => {
            setSelectedNeonCategories(prev =>
              prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
            );
          }}
        >
          {cat}
        </button>
      ))}
    </div>
  </div>
)}
```

### 7. Add Neon Component to Map

Add the `NeonMedicalProviders` component to your map render:

```tsx
<NeonMedicalProviders
  map={mapRef.current}
  enabled={neonEnabled}
  selectedCategories={selectedNeonCategories.length > 0 ? selectedNeonCategories : undefined}
  onStatsUpdate={setNeonStats}
/>
```

### 8. Add CSS Styles

Add these styles to your `index.css`:

```css
/* Neon Provider Styles */
.neon-stats {
  font-size: 10px;
  color: #6b7c93;
  margin-left: auto;
}

.category-filter {
  margin-top: 8px;
  padding: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
}

.filter-label {
  font-size: 10px;
  color: #cdd9f0;
  margin-bottom: 6px;
  font-weight: 600;
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.category-chip {
  padding: 4px 8px;
  font-size: 9px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-chip:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
}

.category-chip.active {
  background: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  color: #cdd9f0;
}

.neon-provider-popup {
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
```

## Features

### Automatic Loading
- Providers load automatically when map bounds change
- Respects the existing map move/zoom events
- Debounced loading to prevent excessive API calls

### Category Filtering
- Filter by medical category (Hospital, Clinic, Dentist, etc.)
- Multi-select support
- Real-time filtering as you toggle categories

### Visual Integration
- Uses the same luminous marker style as existing providers
- Color-coded by medical category
- Consistent popup design with existing UI
- Maintains the "Liquid Glass" aesthetic

### Performance
- Limits to 1,000 providers per view to prevent performance issues
- Efficient database queries with spatial indexing
- Layer management to prevent memory leaks

## Data Structure

The Neon medical providers include:

- **Basic Info**: Name, address, coordinates
- **Contact**: Phone, website
- **Details**: Rating, review count, price level
- **Hours**: Opening hours (JSON)
- **Status**: Business status, permanently closed flag
- **Location**: Country, state, city, postal code
- **Metadata**: Category, types, scrape timestamp

## Medical Categories

Available categories (color-coded):

- Hospital (Red)
- Clinic (Orange)
- Doctor (Green)
- Urgent Care (Amber)
- Pharmacy (Emerald)
- Dentist (Cyan)
- Laboratory (Pink)
- Radiology (Purple)
- Physical Therapy (Blue)
- Mental Health (Violet)
- Optometry (Sky)
- Audiology (Light Blue)
- Nursing Home (Rose)
- Cardiology (Dark Red)
- Dermatology (Light Pink)
- Orthopedics (Orange)
- Pediatrics (Teal)
- Oncology (Red)
- Neurology (Purple)
- Gynecology (Pink)

## Testing

### 1. Verify Database Connection

Check that the Neon database URL is correct and accessible:

```tsx
import { getNeonClient } from './lib/neon-client';

// Test connection
const db = getNeonClient();
const result = await db.query('SELECT NOW()');
console.log('Database connected:', result.rows[0]);
```

### 2. Test Data Loading

Enable the Neon toggle and check:
- Providers appear on the map
- Stats update correctly
- Category filtering works
- Popups display properly

### 3. Test Performance

- Pan and zoom the map
- Verify smooth loading
- Check memory usage
- Ensure no layer duplication

## Troubleshooting

### No Providers Appearing

- Check `VITE_NEON_DATABASE_URL` is set correctly
- Verify database has data (check Neon console)
- Check browser console for errors
- Ensure map reference is valid

### Connection Errors

- Verify Neon database URL format
- Check SSL mode is set to `require`
- Ensure database user has proper permissions
- Check network connectivity

### Performance Issues

- Reduce the result limit in `getMedicalProvidersByBounds`
- Add more aggressive debouncing
- Consider implementing virtual scrolling for large datasets
- Check database indexes are properly created

### Category Filter Not Working

- Verify categories are loading from database
- Check selectedCategories state updates
- Ensure category names match database values exactly

## Advanced Customization

### Custom Marker Styles

Modify the `createProviderMarker` function in `NeonMedicalProviders.tsx` to customize marker appearance.

### Custom Popup Content

Modify the popup HTML in `createProviderMarker` to add/remove fields.

### Additional Filters

Add more filtering options (rating threshold, open status, etc.) by extending the query functions in `neon-client.ts`.

### Real-time Updates

Implement WebSocket or polling to get real-time updates from the database as new providers are scraped.

## Performance Optimization

### Database Indexes

Ensure these indexes exist in your Neon database:

```sql
CREATE INDEX IF NOT EXISTS idx_medical_providers_lat_lng ON medical_providers(lat, lng);
CREATE INDEX IF NOT EXISTS idx_medical_providers_category ON medical_providers(category);
```

### Caching

Consider implementing client-side caching for frequently accessed regions.

### Lazy Loading

Implement incremental loading as user pans/zooms rather than loading all at once.

## Security Considerations

- Never commit `VITE_NEON_DATABASE_URL` to version control
- Use environment variables for all sensitive data
- Consider implementing server-side API endpoints instead of direct database access
- Add rate limiting to prevent abuse

## Maintenance

### Regular Updates

Schedule regular scraping runs to keep data current:
- Weekly for major cities
- Monthly for less populated areas
- Re-scrape when adding new regions

### Data Quality

Monitor for:
- Duplicate providers
- Outdated information
- Permanently closed locations
- Inconsistent categorization

### Database Maintenance

- Regular vacuum operations
- Index maintenance
- Archive old data if needed
- Monitor storage usage

## Next Steps

1. Test the integration thoroughly
2. Gather user feedback
3. Optimize performance based on usage patterns
4. Add more medical categories if needed
5. Expand to additional geographic regions
6. Implement advanced filtering and search
7. Add analytics to track usage

## Support

For issues with:
- **Neon Database**: Check Neon console and logs
- **Integration**: Review browser console and network tab
- **Performance**: Use React DevTools and database query analyzer
- **Data Quality**: Review scraped data in Neon console
