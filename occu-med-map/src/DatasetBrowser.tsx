import { useEffect, useMemo, useState } from 'react';

type DatasetProvider = {
  clinic_name?: string;
  name?: string;
  address_1?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  npi?: string | null;
  source_url?: string | null;
  taxonomy_description?: string | null;
  services?: string | string[] | null;
  source_id?: string | number;
};

export type DatasetKey = 'bluehive' | 'dentists' | 'indexed' | 'myClinics';

export type DatasetLoadState = {
  loading: boolean;
  loaded: boolean;
  error: string;
};

const DATASETS: Array<{key:DatasetKey;label:string;endpoint:string}> = [
  {key:'bluehive',label:'BlueHive Providers',endpoint:'/api/provider-layers/bluehive'},
  {key:'dentists',label:'Dentists',endpoint:'/api/provider-layers/dentists'},
  {key:'indexed',label:'Indexed Providers',endpoint:'/api/provider-layers/indexed'},
  {key:'myClinics',label:'My Clinics',endpoint:'/api/provider-layers/my-clinics'},
];

type Props = {
  open:boolean;
  onClose:()=>void;
  blueHiveData:DatasetProvider[];
  dentistData:DatasetProvider[];
  indexedData:DatasetProvider[];
  myClinicsData:DatasetProvider[];
  status:Record<DatasetKey,DatasetLoadState>;
  onRetry:()=>void;
};

const PAGE_SIZE = 25;

function providerName(provider:DatasetProvider) {
  return provider.clinic_name || provider.name || 'Unnamed provider';
}

function providerAddress(provider:DatasetProvider) {
  return [provider.address_1 || provider.address,provider.city,provider.state,provider.zip || provider.postalCode].filter(Boolean).join(', ');
}

function mapsLink(provider:DatasetProvider) {
  const query = provider.lat != null && provider.lng != null
    ? `${provider.lat},${provider.lng}`
    : `${providerName(provider)} ${providerAddress(provider)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export default function DatasetBrowser({
  open,onClose,blueHiveData,dentistData,indexedData,myClinicsData,status,onRetry,
}:Props) {
  const [activeDataset,setActiveDataset] = useState<DatasetKey>('bluehive');
  const [search,setSearch] = useState('');
  const [page,setPage] = useState(0);

  useEffect(()=>{
    if(!open) return;
    setSearch('');
    setPage(0);
  },[open]);

  const dataByKey:Record<DatasetKey,DatasetProvider[]> = {
    bluehive:blueHiveData,
    dentists:dentistData,
    indexed:indexedData,
    myClinics:myClinicsData,
  };
  const activeMeta = DATASETS.find(dataset=>dataset.key===activeDataset)!;
  const activeStatus = status[activeDataset];
  const activeData = dataByKey[activeDataset] || [];
  const filtered = useMemo(()=>{
    const query=search.trim().toLowerCase();
    if(!query) return activeData;
    return activeData.filter(provider=>[
      providerName(provider),providerAddress(provider),provider.npi || '',provider.taxonomy_description || '',
    ].some(value=>value.toLowerCase().includes(query)));
  },[activeData,search]);
  const pageCount = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const rows = filtered.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE);

  useEffect(()=>{
    if(page>=pageCount) setPage(pageCount-1);
  },[page,pageCount]);

  if(!open) return null;

  return <div className="dataset-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget) onClose();}}>
    <section className="dataset-modal" role="dialog" aria-modal="true" aria-label="Dataset Browser">
      <header className="dataset-header">
        <div>
          <h2>Dataset Browser</h2>
          <p>Browse provider records loaded from the same endpoints as map layers.</p>
        </div>
        <button className="dataset-close" onClick={onClose} aria-label="Close Dataset Browser">Close</button>
      </header>

      <div className="dataset-tabs" role="tablist" aria-label="Provider datasets">
        {DATASETS.map(dataset=>{
          const datasetState=status[dataset.key];
          const count=dataByKey[dataset.key].length;
          return <button
            key={dataset.key}
            role="tab"
            aria-selected={activeDataset===dataset.key}
            className={activeDataset===dataset.key?'active':''}
            onClick={()=>{setActiveDataset(dataset.key);setSearch('');setPage(0);}}
          >
            <span>{dataset.label}</span>
            <strong>{datasetState.loading?'…':datasetState.error?'!':count.toLocaleString()}</strong>
          </button>;
        })}
      </div>

      <div className="dataset-toolbar">
        <div>
          <strong>{activeMeta.label}</strong>
          <span>{activeMeta.endpoint}</span>
        </div>
        <input
          type="search"
          value={search}
          onChange={event=>{setSearch(event.target.value);setPage(0);}}
          placeholder="Search name, city, state, or NPI"
          aria-label={`Search ${activeMeta.label}`}
        />
      </div>

      <div className="dataset-content">
        {activeStatus.loading && <div className="dataset-state"><strong>Loading {activeMeta.label}…</strong><span>Requesting {activeMeta.endpoint}</span></div>}
        {!activeStatus.loading && activeStatus.error && <div className="dataset-state error">
          <strong>Could not load {activeMeta.label}</strong>
          <span>{activeStatus.error}</span>
          <button onClick={onRetry}>Retry datasets</button>
        </div>}
        {!activeStatus.loading && !activeStatus.error && activeData.length===0 && <div className="dataset-state empty">
          <strong>{activeDataset==='myClinics'?'No uploaded clinics yet.':`0 records returned from ${activeMeta.endpoint}`}</strong>
          {activeDataset!=='myClinics' && <span>Database import required for this dataset.</span>}
        </div>}
        {!activeStatus.loading && !activeStatus.error && activeData.length>0 && filtered.length===0 && <div className="dataset-state empty"><strong>No matching records</strong><span>Clear the search to view all {activeData.length.toLocaleString()} records.</span></div>}
        {!activeStatus.loading && !activeStatus.error && rows.length>0 && <div className="dataset-table-wrap">
          <table className="dataset-table">
            <thead><tr><th>Provider</th><th>Location</th><th>Contact</th><th>Source</th></tr></thead>
            <tbody>{rows.map((provider,index)=><tr key={String(provider.source_id || provider.npi || `${providerName(provider)}-${index}`)}>
              <td><strong>{providerName(provider)}</strong>{provider.taxonomy_description && <span>{provider.taxonomy_description}</span>}</td>
              <td><span>{providerAddress(provider) || 'Address unavailable'}</span></td>
              <td>{provider.phone && <a href={`tel:${provider.phone}`}>{provider.phone}</a>}{provider.website && <a href={provider.website} target="_blank" rel="noreferrer">Website</a>}</td>
              <td><a href={provider.source_url || mapsLink(provider)} target="_blank" rel="noreferrer">View record</a></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </div>

      <footer className="dataset-footer">
        <span>{filtered.length.toLocaleString()} records · page {page+1} of {pageCount}</span>
        <div><button disabled={page===0} onClick={()=>setPage(current=>Math.max(0,current-1))}>Previous</button><button disabled={page>=pageCount-1} onClick={()=>setPage(current=>Math.min(pageCount-1,current+1))}>Next</button></div>
      </footer>
    </section>
  </div>;
}
