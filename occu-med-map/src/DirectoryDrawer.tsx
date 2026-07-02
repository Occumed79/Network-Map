type Directory = { name: string; url: string; category: string; purpose: string };

const DIRECTORIES: Directory[] = [
  { name: "NAOHP Directory", url: "https://naohp.com/", category: "Occupational Health", purpose: "Occupational health programs and provider resources." },
  { name: "ACOEM Provider Search", url: "https://www.acoem.org/", category: "Occupational Health", purpose: "Occupational and environmental medicine specialists." },
  { name: "Concentra", url: "https://www.concentra.com/", category: "Occupational Health", purpose: "Employer health, injury care, and physical exams." },
  { name: "AAMRO MRO Locator", url: "https://www.aamro.com/", category: "Drug Testing / MRO", purpose: "Medical review officer resources and services." },
  { name: "DATIA Collector Network", url: "https://www.datia.org/", category: "Drug Testing / MRO", purpose: "Drug and alcohol testing collection resources." },
  { name: "National Drug Screening", url: "https://ndsinc.com/", category: "Drug Testing / MRO", purpose: "Screening programs, collectors, and MRO services." },
  { name: "CAOHC", url: "https://caohc.org/", category: "Audiometry", purpose: "Occupational hearing conservation professionals." },
  { name: "Quest Diagnostics", url: "https://www.questdiagnostics.com/", category: "Labs", purpose: "Laboratory testing and patient service centers." },
  { name: "Labcorp", url: "https://www.labcorp.com/", category: "Labs", purpose: "Clinical laboratory and diagnostic testing locations." },
  { name: "NPI Registry", url: "https://npiregistry.cms.hhs.gov/", category: "General Provider Search", purpose: "Official U.S. provider registry and NPI lookup." },
  { name: "Healthgrades", url: "https://www.healthgrades.com/", category: "General Provider Search", purpose: "Provider profiles, specialties, and locations." },
  { name: "Zocdoc", url: "https://www.zocdoc.com/", category: "General Provider Search", purpose: "Search providers by specialty, location, and availability." },
  { name: "CVS MinuteClinic", url: "https://www.cvs.com/minuteclinic/", category: "Urgent Care / Clinics", purpose: "Retail clinics for common illnesses and screenings." },
  { name: "AFC Urgent Care", url: "https://www.afcurgentcare.com/", category: "Urgent Care / Clinics", purpose: "Walk-in urgent care and occupational health services." },
];

const CATEGORIES = ["Occupational Health", "Drug Testing / MRO", "Audiometry", "Labs", "General Provider Search", "Urgent Care / Clinics"];

export default function DirectoryDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="workflow-backdrop" onClick={onClose}>
      <section className="workflow-modal directory-drawer" onClick={(event) => event.stopPropagation()}>
        <header className="workflow-modal-header">
          <div><span className="workflow-eyebrow">External research tools</span><h2>Provider Directories</h2><p>Trusted starting points grouped by workflow.</p></div>
          <button className="workflow-close" onClick={onClose}>Close</button>
        </header>
        <div className="workflow-modal-body directory-body">
          {CATEGORIES.map((category) => (
            <section className="directory-group" key={category}>
              <h3>{category}</h3>
              <div className="directory-cards">
                {DIRECTORIES.filter((directory) => directory.category === category).map((directory) => (
                  <article className="directory-card" key={directory.name}>
                    <span>{directory.category}</span>
                    <h4>{directory.name}</h4>
                    <p>{directory.purpose}</p>
                    <a href={directory.url} target="_blank" rel="noopener noreferrer">Open directory <b aria-hidden="true">↗</b></a>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
