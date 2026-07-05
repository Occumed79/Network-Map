import { useCallback, useEffect, useMemo, useState } from 'react';

export type ProviderFeature = {
  id:string; source:string; source_kind:'stored'|'live'|'saved'|'candidate'; name:string; normalized_name?:string|null; clinic_type:string; services:string[]; categories:string[];
  address:string|null; city:string|null; admin_area:string|null; country:string|null; postal_code:string|null; lat:number|null; lng:number|null;
  phone:string|null; website:string|null; source_url:string|null; confidence_score:number|null; trust_tier:string; last_seen:string|null; imported_at:string|null; raw_source_data?:unknown;
  status?:string|null; match_reason?:string|null; distance_miles?:number|null;
};
export type DatasetKey = 'bluehive' | 'dentists' | 'indexed' | 'myClinics';
export type DatasetLoadState = { loading:boolean; loaded:boolean; error:string };
export type ProviderExplorerFilters = {
  source:string; source_kind:string; q:string; country:string; admin_area:string; city:string; postal_code:string; clinicType:string; service:string; lat:string; lng:string; radiusMiles:string; useMapBounds:boolean; includeLive?:boolean; includeStored?:boolean; includeSaved?:boolean; includeCandidates?:boolean;
};

type ProviderExplorerResponse = { providers?:ProviderFeature[]; records?:ProviderFeature[]; total:number; count:number; page:number; limit:number; hasMore:boolean; facets?:Array<Record<string,unknown>>; error?:string; warning?:string; status?:Record<string,unknown> };
type Props = { open:boolean; onClose:()=>void; getMapBounds?:()=>{north:number;south:number;east:number;west:number}|null; getCurrentRadius?:()=>{lat:number;lng:number;radiusMiles:number}|null; onViewOnMap?:(providers:ProviderFeature[], filters:ProviderExplorerFilters)=>void; onViewDensity?:(filters:ProviderExplorerFilters)=>void; onCompare?:(filters:ProviderExplorerFilters)=>void; onLoad?:(key:DatasetKey)=>void; sharedFilters?:ProviderExplorerFilters; onFiltersChange?:(filters:ProviderExplorerFilters)=>void; onOpenMatchingInDatabase?:(filters:ProviderExplorerFilters)=>void } & Record<string,unknown>;

const SOURCE_OPTIONS = [ ['all','All'], ['bluehive','BlueHive'], ['dentists','Dentists'], ['indexed','Indexed'], ['my-clinics','My Clinics'], ['live','Live'], ['saved','Saved'], ['candidates','Candidates'] ];
const KIND_OPTIONS = [ ['all','All kinds'], ['stored','Stored Neon'], ['live','Live discovery'], ['saved','Saved clinics'], ['candidate','Candidates'] ];
const SOURCE_MODE_OPTIONS = [ ['database','Database only'], ['live','Live only'], ['blended','Database + Live'], ['saved','Saved only'], ['candidate','Candidate only'] ];
const LIMIT = 25;
const EMPTY_FILTERS: ProviderExplorerFilters = { source:'all', source_kind:'all', q:'', country:'', admin_area:'', city:'', postal_code:'', clinicType:'', service:'', lat:'', lng:'', radiusMiles:'', useMapBounds:false, includeStored:true, includeLive:false, includeSaved:true, includeCandidates:true };

function mapsLink(provider:ProviderFeature) { const query = provider.lat != null && provider.lng != null ? `${provider.lat},${provider.lng}` : `${provider.name} ${[provider.address,provider.city,provider.admin_area,provider.country].filter(Boolean).join(', ')}`; return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`; }
function sourceMode(filters:ProviderExplorerFilters) { if(filters.source_kind === 'live' || filters.source === 'live') return 'live'; if(filters.source_kind === 'saved' || filters.source === 'saved') return 'saved'; if(filters.source_kind === 'candidate' || filters.source === 'candidates') return 'candidate'; if(filters.includeLive) return 'blended'; return 'database'; }
function applySourceMode(filters:ProviderExplorerFilters, mode:string):ProviderExplorerFilters { if(mode === 'live') return {...filters,source:'live',source_kind:'live',includeLive:true,includeStored:false,includeSaved:false,includeCandidates:false}; if(mode === 'blended') return {...filters,source:'all',source_kind:'all',includeLive:true,includeStored:true,includeSaved:true,includeCandidates:true}; if(mode === 'saved') return {...filters,source:'saved',source_kind:'saved',includeLive:false,includeStored:false,includeSaved:true,includeCandidates:false}; if(mode === 'candidate') return {...filters,source:'candidates',source_kind:'candidate',includeLive:false,includeStored:false,includeSaved:false,includeCandidates:true}; return {...filters,source:'all',source_kind:'all',includeLive:false,includeStored:true,includeSaved:true,includeCandidates:true}; }

const FACET_KEYS: Array<{key:keyof ProviderExplorerFilters; label:string}> = [
  {key:'source', label:'Source'}, {key:'source_kind', label:'Kind'}, {key:'country', label:'Country'}, {key:'admin_area', label:'Admin area'}, {key:'clinicType', label:'Clinic type'}, {key:'service', label:'Service/category'},
];
function FacetBreakdown({facets,onSelect}:{facets:Array<Record<string,unknown>>; onSelect:(key:string,value:string)=>void}) {
  const groups = FACET_KEYS.map(({key,label})=>{ const apiKey = key === 'clinicType' ? 'clinic_type' : key === 'service' ? 'service' : key; const items = facets.map(row=>({value:String(row[apiKey] || ''), count:Number(row.count || 0)})).filter(item=>item.value && item.value !== 'null' && item.count > 0).sort((a,b)=>b.count-a.count).slice(0,8); return {key,label,items}; }).filter(group=>group.items.length);
  if(!groups.length) return null;
  return <div className="provider-facets">{groups.map(group=><section key={group.key}><strong>{group.label}</strong>{group.items.map(item=><button key={`${group.key}-${item.value}`} onClick={()=>onSelect(group.key,item.value)}>{item.value}<span>{item.count.toLocaleString()}</span></button>)}</section>)}</div>;
}

export function filterSummary(filters:ProviderExplorerFilters) { return Object.entries(filters).filter(([k,v])=>!['useMapBounds','includeLive','includeStored','includeSaved','includeCandidates'].includes(k) && typeof v === 'string' && v !== '' && v !== 'all').map(([k,v])=>`${k}: ${v}`).concat(filters.useMapBounds ? ['map bounds'] : []).concat(filters.includeLive ? ['includes live'] : []); }

export default function DatasetBrowser({ open,onClose,getMapBounds,getCurrentRadius,onViewOnMap,onViewDensity,onCompare,sharedFilters,onFiltersChange,onOpenMatchingInDatabase }:Props) {
  const [localFilters,setLocalFilters] = useState<ProviderExplorerFilters>(EMPTY_FILTERS);
  const filters = sharedFilters || localFilters;
  const [page,setPage] = useState(1);
  const [rows,setRows] = useState<ProviderFeature[]>([]);
  const [total,setTotal] = useState(0);
  const [hasMore,setHasMore] = useState(false);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const [warning,setWarning] = useState('');
  const [facets,setFacets] = useState<Array<Record<string,unknown>>>([]);
  const [actionStatus,setActionStatus] = useState('');

  const active = useMemo(()=>filterSummary(filters),[filters]);
  const updateFilters = (next:ProviderExplorerFilters) => { if(sharedFilters) onFiltersChange?.(next); else setLocalFilters(next); };
  const setFilter = <K extends keyof ProviderExplorerFilters>(key:K,value:ProviderExplorerFilters[K]) => { updateFilters({...filters,[key]:value}); setPage(1); };
  const buildParams = useCallback((mode = 'records') => { const params = new URLSearchParams({ mode, page:String(page), limit:String(LIMIT) }); Object.entries(filters).forEach(([key,value])=>{ if(key !== 'useMapBounds' && value !== undefined && value !== '' && value !== 'all') params.set(key,String(value)); }); if(filters.useMapBounds) { const b = getMapBounds?.(); if(b) Object.entries(b).forEach(([k,v])=>params.set(k,String(v))); } return params; },[filters,getMapBounds,page]);

  useEffect(()=>{ if(!open) return; const ac = new AbortController(); (async()=>{ setLoading(true); setError(''); setWarning(''); try { const [recordsResp, facetsResp] = await Promise.all([ fetch(`/api/provider-explorer?${buildParams('records')}`, {signal:ac.signal}), fetch(`/api/provider-explorer/facets?${buildParams('facets')}`, {signal:ac.signal}) ]); const data = await recordsResp.json() as ProviderExplorerResponse; const facetData = await facetsResp.json().catch(()=>({facets:[]})); if(!recordsResp.ok || data.error) throw new Error(data.error || `HTTP ${recordsResp.status}`); setRows(data.providers || data.records || []); setTotal(Number(data.total || 0)); setHasMore(Boolean(data.hasMore)); setFacets(Array.isArray((facetData as any).facets) ? (facetData as any).facets : []); setWarning(data.warning || ''); } catch(e) { if(!ac.signal.aborted) setError(e instanceof Error ? e.message : 'Provider explorer request failed'); } finally { if(!ac.signal.aborted) setLoading(false); } })(); return ()=>ac.abort(); },[open,buildParams]);

  async function postAction(path:string, provider:ProviderFeature, label:string) { setActionStatus(`${label}…`); try { const resp = await fetch(path, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({provider, id:provider.id}) }); const data = await resp.json().catch(()=>({})); if(!resp.ok || data.error) throw new Error(data.error || `HTTP ${resp.status}`); setActionStatus(`${label} complete`); } catch(e) { setActionStatus(e instanceof Error ? e.message : `${label} failed`); } }
  function useCurrentBounds() { setFilter('useMapBounds', true); }
  function useCurrentRadius() { const radius = getCurrentRadius?.(); if(!radius) { setActionStatus('Select a radius center first.'); return; } updateFilters({...filters, lat:String(radius.lat), lng:String(radius.lng), radiusMiles:String(radius.radiusMiles), useMapBounds:false}); setPage(1); }

  if(!open) return null;
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));
  return <div className="dataset-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}><section className="dataset-modal" role="dialog" aria-modal="true" aria-label="Provider Database Explorer">
    <header className="dataset-header"><div><h2>Provider Intelligence Explorer</h2><p>Neon-backed global database + live/candidate workflow. Source mode: {sourceMode(filters)}.</p></div><button className="dataset-close" onClick={onClose}>Close</button></header>
    <div className="dataset-toolbar provider-explorer-toolbar">
      <select value={sourceMode(filters)} onChange={e=>{ updateFilters(applySourceMode(filters,e.target.value)); setPage(1); }}>{SOURCE_MODE_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select value={filters.source} onChange={e=>setFilter('source',e.target.value)}>{SOURCE_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <select value={filters.source_kind} onChange={e=>setFilter('source_kind',e.target.value)}>{KIND_OPTIONS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <input value={filters.q} onChange={e=>setFilter('q',e.target.value)} placeholder="Search name, service, city" />
      <input value={filters.country} onChange={e=>setFilter('country',e.target.value)} placeholder="Country (US, CA, DE…)" />
      <input value={filters.admin_area} onChange={e=>setFilter('admin_area',e.target.value)} placeholder="Admin area / region" />
      <input value={filters.city} onChange={e=>setFilter('city',e.target.value)} placeholder="City" />
      <input value={filters.clinicType} onChange={e=>setFilter('clinicType',e.target.value)} placeholder="Clinic type" />
      <input value={filters.service} onChange={e=>setFilter('service',e.target.value)} placeholder="Service/capability" />
      <input value={filters.lat} onChange={e=>setFilter('lat',e.target.value)} placeholder="Radius lat" />
      <input value={filters.lng} onChange={e=>setFilter('lng',e.target.value)} placeholder="Radius lng" />
      <input value={filters.radiusMiles} onChange={e=>setFilter('radiusMiles',e.target.value)} placeholder="Radius miles" />
      <label className="provider-bounds-toggle"><input type="checkbox" checked={filters.useMapBounds} onChange={e=>setFilter('useMapBounds',e.target.checked)} /> Use current map view</label>
      <button onClick={useCurrentBounds}>Use current map bounds</button><button onClick={useCurrentRadius}>Use current radius</button><button onClick={()=>{updateFilters(EMPTY_FILTERS);setPage(1);}}>Clear all filters</button>
    </div>
    <div className="provider-explorer-summary"><strong>{total.toLocaleString()} matching records</strong><span>{loading?'Loading…':`${rows.length.toLocaleString()} visible on page ${page} of ${pageCount}`}</span><button onClick={()=>onViewOnMap?.(rows,filters)} disabled={!rows.length}>View current page on map</button><button onClick={()=>onViewDensity?.(filters)}>View all matching as density</button><button onClick={()=>onOpenMatchingInDatabase?.(filters)}>Open matching records in database</button><button onClick={()=>onCompare?.(filters)}>Compare stored vs live in this area</button></div>
    {active.length>0 && <div className="provider-active-filters">{active.map(item=><span key={item}>{item}</span>)}</div>}
    {(warning || actionStatus) && <div className="provider-map-status warning">{warning || actionStatus}</div>}
    <FacetBreakdown facets={facets} onSelect={(key,value)=>{ setFilter(key as keyof ProviderExplorerFilters, value as never); }} />
    <div className="dataset-content">{error && <div className="dataset-state error"><strong>Provider explorer failed</strong><span>{error}</span></div>}{!error && loading && <div className="dataset-state"><strong>Loading provider intelligence…</strong><span>Server-side filters and pagination are active.</span></div>}{!error && !loading && rows.length===0 && <div className="dataset-state empty"><strong>No matching providers</strong><span>Try clearing filters or disabling map bounds.</span></div>}{!error && rows.length>0 && <div className="dataset-table-wrap"><table className="dataset-table"><thead><tr><th>Provider</th><th>Location</th><th>Intelligence</th><th>Contact</th><th>Source/actions</th></tr></thead><tbody>{rows.map(provider=><tr key={provider.id}>
      <td><strong>{provider.name}</strong><span>{provider.clinic_type}</span><button onClick={()=>onViewOnMap?.([provider],filters)}>View record on map</button></td><td><span>{[provider.address,provider.city,provider.admin_area,provider.country,provider.postal_code].filter(Boolean).join(', ') || 'Address unavailable'}</span></td>
      <td><span>{provider.services?.join(', ') || 'No service tags'}</span><span>{provider.trust_tier} · {provider.status || provider.source_kind}</span></td><td>{provider.phone && <a href={`tel:${provider.phone}`}>{provider.phone}</a>}{provider.website && <a href={provider.website} target="_blank" rel="noreferrer">Website</a>}<a href={mapsLink(provider)} target="_blank" rel="noreferrer">Maps</a></td>
      <td><span>{provider.source} · {provider.source_kind}</span><a href={provider.source_url || mapsLink(provider)} target="_blank" rel="noreferrer">Source</a><button onClick={()=>postAction('/api/provider-explorer/save-candidate', provider, 'Save candidate')}>Save candidate</button><button onClick={()=>postAction('/api/provider-explorer/save-to-my-clinics', provider, 'Save to My Clinics')}>Save to My Clinics</button><button onClick={()=>postAction('/api/provider-explorer/outreach-target', provider, 'Outreach target')}>Outreach</button><button onClick={()=>postAction('/api/provider-explorer/dismiss-candidate', provider, 'Dismiss candidate')}>Dismiss</button></td>
    </tr>)}</tbody></table></div>}</div>
    <footer className="dataset-footer"><span>Page {page} of {pageCount} · hasMore: {String(hasMore)} · facets loaded: {facets.length}</span><div><button disabled={page===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</button><button disabled={!hasMore} onClick={()=>setPage(p=>p+1)}>Next</button></div></footer>
  </section></div>;
}
