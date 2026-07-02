import { useCallback, useEffect, useMemo, useState } from 'react';

type DatasetProvider = {
  source_id?: string|null; clinic_name?: string; name?: string;
  address_1?: string|null; city?: string|null; state?: string|null; zip?: string|null;
  phone?: string|null; website?: string|null; lat?: number; lng?: number;
  npi?: string|null; source_url?: string|null; taxonomy_description?: string|null;
  services?: string|null; data_source?: string|null;
};

type DatasetKey = 'bluehive'|'dentists'|'indexed';
type LoadStatus = { loading:boolean; loaded:boolean; error:string };

const DATASETS:{key:DatasetKey;label:string;color:string}[] = [
  {key:'bluehive',label:'BlueHive Providers',color:'#2563eb'},
  {key:'dentists',label:'Dentists',color:'#0891b2'},
  {key:'indexed',label:'Indexed Providers',color:'#059669'},
];

type Props = {
  open:boolean;
  onClose:()=>void;
  blueHiveData:DatasetProvider[];
  dentistData:DatasetProvider[];
  indexedData:DatasetProvider[];
  status:Record<DatasetKey,LoadStatus>;
  onRetry:()=>void;
};

function mapsLink(provider:DatasetProvider) {
  if(Number.isFinite(provider.lat)&&Number.isFinite(provider.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${provider.lat},${provider.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([
    provider.clinic_name||provider.name,provider.address_1,provider.city,provider.state,provider.zip,
  ].filter(Boolean).join(' '))}`;
}

export default function DatasetBrowser({
  open,onClose,blueHiveData,dentistData,indexedData,status,onRetry,
}:Props) {
  const [activeDataset,setActiveDataset] = useState<DatasetKey>('bluehive');
  const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);
  const pageSize = 50;
  const dataByKey = useMemo(()=>({bluehive:blueHiveData,dentists:dentistData,indexed:indexedData}),[
    blueHiveData,dentistData,indexedData,
  ]);

  useEffect(()=>{
    if(open) { setActiveDataset('bluehive'); setSearch(''); setPage(0); }
  },[open]);

  const allProviders = useMemo(()=>(dataByKey[activeDataset]||[]).filter(provider=>
    Number.isFinite(Number(provider.lat))&&Number.isFinite(Number(provider.lng))),[activeDataset,dataByKey]);
  const filtered = useMemo(()=>{
    const query = search.trim().toLowerCase();
    if(!query) return allProviders;
    return allProviders.filter(provider=>[
      provider.clinic_name,provider.name,provider.city,provider.state,provider.npi,
    ].some(value=>String(value||'').toLowerCase().includes(query)));
  },[allProviders,search]);
  const totalPages = Math.max(1,Math.ceil(filtered.length/pageSize));
  const paged = filtered.slice(page*pageSize,(page+1)*pageSize);
  const handleSearch = useCallback((event:React.ChangeEvent<HTMLInputElement>)=>{
    setSearch(event.target.value); setPage(0);
  },[]);

  if(!open) return null;
  const activeStatus = status[activeDataset];

  return (
    <div className="workflow-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
      <section className="workflow-modal dataset-browser" role="dialog" aria-modal="true" aria-label="Dataset Browser">
        <header className="workflow-modal-header">
          <div>
            <span className="workflow-eyebrow">Provider source inventory</span>
            <h2>Dataset Browser</h2>
            <p>Browse the same coordinate-valid provider records used by the map layers.</p>
          </div>
          <button className="workflow-close" onClick={onClose}>Close</button>
        </header>

        <div className="dataset-toolbar">
          <div className="dataset-tabs">
            {DATASETS.map(dataset=>{
              const count = dataByKey[dataset.key].filter(provider=>Number.isFinite(Number(provider.lat))&&Number.isFinite(Number(provider.lng))).length;
              return <button
                key={dataset.key}
                className={activeDataset===dataset.key?'active':''}
                style={{'--dataset-color':dataset.color} as React.CSSProperties}
                onClick={()=>{setActiveDataset(dataset.key);setSearch('');setPage(0);}}
              >{dataset.label} <span>{status[dataset.key].loading?'…':count.toLocaleString()}</span></button>;
            })}
          </div>
          <input aria-label="Search dataset" value={search} onChange={handleSearch} placeholder="Search name, city, state, or NPI" />
        </div>

        <div className="dataset-body">
          {activeStatus.loading ? (
            <div className="dataset-state"><strong>Loading provider records…</strong><span>The map layer API is being queried.</span></div>
          ) : activeStatus.error ? (
            <div className="dataset-state error"><strong>Dataset could not load</strong><span>{activeStatus.error}</span><button className="workflow-secondary" onClick={onRetry}>Retry datasets</button></div>
          ) : paged.length===0 ? (
            <div className="dataset-state"><strong>{search?'No matching providers':'0 coordinate-valid records loaded'}</strong><span>{search?'Try a different name or location.':'The production database needs an import for this provider source.'}</span></div>
          ) : paged.map((provider,index)=>{
            const name = provider.clinic_name||provider.name||'Unnamed provider';
            const address = [provider.address_1,provider.city,provider.state,provider.zip].filter(Boolean).join(', ');
            return <article className="dataset-provider" key={provider.source_id||`${name}-${index}`}>
              <div><strong>{name}</strong><span>{address||'Address unavailable'}</span>{(provider.taxonomy_description||provider.services)&&<em>{provider.taxonomy_description||provider.services}</em>}</div>
              <div className="dataset-actions">
                <span>{provider.data_source||DATASETS.find(dataset=>dataset.key===activeDataset)?.label}</span>
                <a href={mapsLink(provider)} target="_blank" rel="noreferrer">Maps</a>
                {provider.phone&&<a href={`tel:${provider.phone}`}>Call</a>}
                {provider.website&&<a href={provider.website.startsWith('http')?provider.website:`https://${provider.website}`} target="_blank" rel="noreferrer">Website</a>}
              </div>
            </article>;
          })}
        </div>

        {!activeStatus.loading&&!activeStatus.error&&filtered.length>0&&<footer className="dataset-footer">
          <span>Page {page+1} of {totalPages} · {filtered.length.toLocaleString()} records</span>
          <div><button className="workflow-secondary" disabled={page===0} onClick={()=>setPage(value=>Math.max(0,value-1))}>Previous</button><button className="workflow-secondary" disabled={page>=totalPages-1} onClick={()=>setPage(value=>Math.min(totalPages-1,value+1))}>Next</button></div>
        </footer>}
      </section>
    </div>
  );
}
