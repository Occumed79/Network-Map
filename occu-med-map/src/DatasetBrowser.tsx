import { useCallback, useEffect, useMemo, useState } from 'react';

export type ProviderFeature = {
  id:string; source:string; source_kind:'stored'|'live'|'saved'|'candidate'; name:string; clinic_type:string; services:string[]; categories:string[];
  address:string|null; city:string|null; admin_area:string|null; country:string|null; postal_code:string|null; lat:number|null; lng:number|null;
  phone:string|null; website:string|null; source_url:string|null; confidence_score:number|null; trust_tier:string; last_seen:string|null; imported_at:string|null; raw_source_data?:unknown;
};
export type DatasetKey = 'bluehive' | 'dentists' | 'indexed' | 'myClinics';
export type DatasetLoadState = { loading:boolean; loaded:boolean; error:string };
export type ProviderExplorerFilters = {
  source:string; source_kind:string; q:string; country:string; admin_area:string; city:string; postal_code:string; clinicType:string; service:string; useMapBounds:boolean;
};

type ProviderExplorerResponse = { providers?:ProviderFeature[]; records?:ProviderFeature[]; total:number; count:number; page:number; limit:number; hasMore:boolean; facets?:Array<Record<string,unknown>>; error?:string };
type Props = { open:boolean; onClose:()=>void; getMapBounds?:()=>{north:number;south:number;east:number;west:number}|null; onViewOnMap?:(providers:ProviderFeature[], filters:ProviderExplorerFilters)=>void; onLoad?:(key:DatasetKey)=>void; sharedFilters?:ProviderExplorerFilters; onFiltersChange?:(filters:ProviderExplorerFilters)=>void; onOpenMatchingInDatabase?:(filters:ProviderExplorerFilters)=>void } & Record<string,unknown>;

const SOURCE_OPTIONS = [ ['all','All'], ['bluehive','BlueHive'], ['dentists','Dentists'], ['indexed','Indexed'], ['my-clinics','My Clinics'], ['live','Live'], ['saved','Saved'], ['candidates','Candidates'] ];
const KIND_OPTIONS = [ ['all','All kinds'], ['stored','Stored Neon'], ['live','Live discovery'], ['saved','Saved clinics'], ['candidate','Candidates'] ];
const LIMIT = 25;
const EMPTY_FILTERS: ProviderExplorerFilters = { source:'all', source_kind:'all', q:'', country:'', admin_area:'', city:'', postal_code:'', clinicType:'', service:'', useMapBounds:false };

function mapsLink(provider:ProviderFeature) { const query = provider.lat != null && provider.lng != null ? `${provider.lat},${provider.lng}` : `${provider.name} ${[provider.address,provider.city,provider.admin_area,provider.country].filter(Boolean).join(', ')}`; return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }

const FACET_KEYS: Array<{key:keyof ProviderExplorerFilters; label:string}> = [
  {key:'source', label:'Source'}, {key:'source_kind', label:'Kind'}, {key:'country', label:'Country'}, {key:'admin_area', label:'Admin area'}, {key:'clinicType', label:'Clinic type'}, {key:'service', label:'Service/category'},
];
function FacetBreakdown({facets,onSelect}:{facets:Array<Record<string,unknown>>; onSelect:(key:string,value:string)=>void}) {
  const groups = FACET_KEYS.map(({key,label})=>{
    const apiKey = key === 'clinicType' ? 'clinic_type' : key === 'service' ? 'service' : key;
    const items = facets
      .map(row=>({value:String(row[apiKey] || ''), count:Number(row.count || 0)}))
      .filter(item=>item.value && item.value !== 'null' && item.count > 0)
      .sort((a,b)=>b.count-a.count)
      .slice(0,6);
    return {key,label,items};
  }).filter(group=>group.items.length);
  if(!groups.length) return null;
  return <div className="provider-facets">{groups.map(group=><section key={group.key}><strong>{group.label}</strong>{group.items.map(item=><button key={`${group.key}-${item.value}`} onClick={()=>onSelect(group.key,item.value)}>{item.value}<span>{item.count.toLocaleString()}</span></button>)}</section>)}</div>;
}

export function filterSummary(filters:ProviderExplorerFilters) { return Object.entries(filters).filter(([k,v])=>k!=='useMapBounds' && typeof v === 'string' && v !== '' && v !== 'all').map(([k,v])=>`${k}: ${v}`).concat(filters.useMapBounds ? ['map bounds'] : []); }

export default function DatasetBrowser({ open,onClose,getMapBounds,onViewOnMap,sharedFilters,onFiltersChange,onOpenMatchingInDatabase }:Props) {
  const [localFilters,setLocalFilters] = useState<ProviderExplorerFilters>(EMPTY_FILTERS);
  const filters = sharedFilters || localFilters;
  const [page,setPage] = useState(1);
  const [rows,setRows] = useState<ProviderFeature[]>([]);
  const [total,setTotal] = useState(0);
  const [hasMore,setHasMore] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [facets,setFacets] = useState<Array<Record<string,unknown>>>([]);

  const active = useMemo(()=>filterSummary(filters),[filters]);
  const updateFilters = (next:ProviderExplorerFilters) => { if(sharedFilters) onFiltersChange?.(next); else setLocalFilters(next); };
  const setFilter = <K extends keyof ProviderExplorerFilters>(key:K,value:ProviderExplorerFilters[K]) => { updateFilters({...filters,[key]:value}); setPage(1); };
  const buildParams = useCallback((mode = 'records') => {
    const params = new URLSearchParams({ mode, page:String(page), limit:String(LIMIT) });
    Object.entries(filters).forEach(([key,value])=>{ if(key !== 'useMapBounds' && typeof value === 'string' && value && value !== 'all') params.set(key,value); });
    if(filters.useMapBounds) { const b = getMapBounds?.(); if(b) Object.entries(b).forEach(([k,v])=>params.set(k,String(v))); }
    return params;
  },[filters,getMapBounds,page]);

  useEffect(()=>{ if(!open) return; const ac = new AbortController(); (async()=>{
    setLoading(true); setError('');
    try {
      const [recordsResp, facetsResp] = await Promise.all([ fetch(`/api/provider-explorer?${buildParams('records')}`, {signal:ac.signal}), fetch(`/api/provider-explorer/facets?${buildParams('facets')}`, {signal:ac.signal}) ]);
      const data = await recordsResp.json() as ProviderExplorerResponse; const facetData = await facetsResp.json().catch(()=>({facets:[]}));
      if(!recordsResp.ok || data.error) throw new Error(data.error || `HTTP ${recordsResp.status}`);
      setRows(data.providers || data.records || []); setTotal(Number(data.total || 0)); setHasMore(Boolean(data.hasMore)); setFacets(Array.isArray((facetData as any).facets) ? (facetData as any).facets : []);
    } catch(e) { if(!ac.signal.aborted) setError(e instanceof Error ? e.message : 'Provider explorer request failed'); }
    finally { if(!ac.signal.aborted) setLoading(false); }
  })(); return ()=>ac.abort(); },[open,buildParams]);

  if(!open) return null;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  return <div className="dataset-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
    <section className="dataset-modal" role="dialog" aria-modal="true" aria-label="Provider Database Explorer">
      <header className="dataset-header"><div><h2>Provider Intelligence Explorer</h2><p>Neon-backed global Provider Database Explorer with the same filters used by Provider Map Explorer.</p></div><button className="dataset-close" onClick={onClose}>Close</button></header>
      <div className="dataset-toolbar provider-explorer-toolbar">
        <select value={filters.source} onChange={e=>setFilter('source',e.target.value)}>{SOURCE_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <select value={filters.source_kind} onChange={e=>setFilter('source_kind',e.target.value)}>{KIND_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <input value={filters.q} onChange={e=>setFilter('q',e.target.value)} placeholder="Search name, service, city" />
        <input value={filters.country} onChange={e=>setFilter('country',e.target.value)} placeholder="Country (US, CA, DE…)" />
        <input value={filters.admin_area} onChange={e=>setFilter('admin_area',e.target.value)} placeholder="Admin area / state" />
        <input value={filters.city} onChange={e=>setFilter('city',e.target.value)} placeholder="City" />
        <input value={filters.clinicType} onChange={e=>setFilter('clinicType',e.target.value)} placeholder="Clinic type" />
        <input value={filters.service} onChange={e=>setFilter('service',e.target.value)} placeholder="Service/capability" />
        <label className="provider-bounds-toggle"><input type="checkbox" checked={filters.useMapBounds} onChange={e=>setFilter('useMapBounds',e.target.checked)} /> Use current map view</label>
        <button onClick={()=>{updateFilters(EMPTY_FILTERS);setPage(1);}}>Clear shared filters</button>
      </div>
      <div className="provider-explorer-summary"><strong>{total.toLocaleString()} matching records</strong><span>{loading?'Loading…':`${rows.length.toLocaleString()} visible on page ${page}`}</span><button onClick={()=>onViewOnMap?.(rows,filters)} disabled={!rows.length}>View these records on map</button><button onClick={()=>onOpenMatchingInDatabase?.(filters)}>Open matching records in database</button></div>
      {active.length>0 && <div className="provider-active-filters">{active.map(item=><span key={item}>{item}</span>)}</div>}
      <FacetBreakdown facets={facets} onSelect={(key,value)=>{ setFilter(key as keyof ProviderExplorerFilters, value as never); }} />
      <div className="dataset-content">
        {error && <div className="dataset-state error"><strong>Provider explorer failed</strong><span>{error}</span></div>}
        {!error && loading && <div className="dataset-state"><strong>Loading Neon stored records…</strong><span>Server-side filters and pagination are active.</span></div>}
        {!error && !loading && rows.length===0 && <div className="dataset-state empty"><strong>No matching providers</strong><span>Try clearing filters or disabling map bounds.</span></div>}
        {!error && rows.length>0 && <div className="dataset-table-wrap"><table className="dataset-table"><thead><tr><th>Provider</th><th>Location</th><th>Intelligence</th><th>Contact</th><th>Source</th></tr></thead><tbody>{rows.map(provider=><tr key={provider.id}>
          <td><strong>{provider.name}</strong><span>{provider.clinic_type}</span></td><td><span>{[provider.address,provider.city,provider.admin_area,provider.country,provider.postal_code].filter(Boolean).join(', ') || 'Address unavailable'}</span></td>
          <td><span>{provider.services?.join(', ') || 'No service tags'}</span><span>{provider.trust_tier}</span></td><td>{provider.phone && <a href={`tel:${provider.phone}`}>{provider.phone}</a>}{provider.website && <a href={provider.website} target="_blank" rel="noreferrer">Website</a>}</td>
          <td><span>{provider.source} · {provider.source_kind}</span><a href={provider.source_url || mapsLink(provider)} target="_blank" rel="noreferrer">View record</a></td>
        </tr>)}</tbody></table></div>}
      </div>
      <footer className="dataset-footer"><span>Page {page} of {pageCount} · hasMore: {String(hasMore)} · facets loaded: {facets.length}</span><div><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><button disabled={!hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div></footer>
    </section>
  </div>;
}
