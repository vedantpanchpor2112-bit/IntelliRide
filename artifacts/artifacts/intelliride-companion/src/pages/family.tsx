import { useState } from 'react';
import { Check, Copy, MapPinned, RefreshCw, UserPlus, Users, WifiOff } from 'lucide-react';
import { MapPanel } from '@/components/map-panel';
import { PageHeader } from '@/components/app-shell';
import { useRideSimulation } from '@/lib/simulation';

export function FamilyPage() {
  const ride = useRideSimulation();
  const [focus, setFocus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const focusedMember = ride.family.find((member) => member.id === focus);
  const invite = 'RIDE-7KQ2';
  const copyInvite = async () => { try { await navigator.clipboard?.writeText(invite); } catch { /* clipboard may be unavailable in demo */ } setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const statusCopy = { riding: 'Riding now', parked: 'Parked', offline: 'Offline' };
  return <div className="animate-rise">
    <PageHeader eyebrow="Family view / shared confidence" title="Your riding circle." lede="See who is moving, who is home, and who may need a check-in." action={<button className="icon-btn" onClick={ride.tickFamily} aria-label="Refresh family statuses" data-testid="button-refresh-family"><RefreshCw size={15} /></button>} />
    <MapPanel lat={focusedMember?.location.lat ?? ride.location.lat} lng={focusedMember?.location.lng ?? ride.location.lng} focusName={focusedMember?.name} />
    <div className="list-stack section-gap">
       {ride.family.map((member) => <article className={`list-row ${focus === member.id ? 'focus-row' : ''}`} key={member.id} data-testid={`row-family-${member.id}`}><div className={`avatar ${member.color}`}><span>{member.initials}</span></div><div className="row-main"><div className="row-name">{member.name}</div><div className="row-detail">{member.relation} <span style={{ margin: '0 5px' }}>·</span>{member.status === 'riding' ? `${member.speed} kmph` : statusCopy[member.status]}</div></div><span className={`status-pill ${member.status === 'riding' ? 'green' : member.status === 'parked' ? 'amber' : 'cyan'}`}><span className="dot" />{member.status}</span><button className="tiny-btn" onClick={() => setFocus(focus === member.id ? null : member.id)} title={`Focus ${member.name} on map`} data-testid={`button-focus-family-${member.id}`}><MapPinned size={15} /></button></article>)}
    </div>
     <div className="panel panel-pad section-gap"><div style={{ display: 'flex', gap: 10, alignItems: 'start' }}><UserPlus size={18} /><div style={{ flex: 1 }}><div className="panel-title">Invite a rider</div><div className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>Share this code in the demo to add someone to your family view.</div><div className="mono" style={{ fontSize: 19, letterSpacing: '.08em', marginTop: 13 }}>{invite}</div></div><button className="button button-secondary" onClick={copyInvite} data-testid="button-copy-invite">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}</button></div></div>
     <div className="grid-2 section-gap"><div className="panel stat-card"><div className="stat-label"><Users size={13} /> Family online</div><div className="stat-value">{ride.family.filter((member) => member.status !== 'offline').length}<span className="stat-unit">/ {ride.family.length}</span></div></div><div className="panel stat-card"><div className="stat-label"><WifiOff size={13} /> Last refresh</div><div className="stat-value" style={{ fontSize: 18 }}>Now</div></div></div>
  </div>;
}