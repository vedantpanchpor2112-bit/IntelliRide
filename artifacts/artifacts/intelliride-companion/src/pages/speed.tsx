import { useState } from 'react';
import { Gauge, Info, ShieldAlert, Volume2 } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { useRideSimulation } from '@/lib/simulation';

export function SpeedPage() {
  const ride = useRideSimulation();
  const [saved, setSaved] = useState(false);
  const over = ride.location.speed > ride.overspeedThreshold;
  return <div className="animate-rise">
    <PageHeader eyebrow="Ride monitor / guardrails" title="Speed, made simple." lede="Set a local threshold. Only this device needs to know." />
    <div className="panel panel-pad">
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}><div><div className="panel-kicker">Live speed</div><div className="stat-value speed-readout" style={{ marginTop: 12 }} data-testid="text-speed-readout">{ride.location.speed}<span className="stat-unit" style={{ fontSize: 14 }}>kmph</span></div></div><div className={`status-pill ${over ? 'red' : 'green'}`}><span className="dot" />{over ? 'Over threshold' : 'Within limit'}</div></div>
       <div className="threshold"><div className="threshold-line" /><div className="threshold-marker" style={{ left: `${Math.min(94, Math.max(4, ride.overspeedThreshold / 1.1))}%` }} /><div className="threshold-label" style={{ left: `calc(${Math.min(94, Math.max(4, ride.overspeedThreshold / 1.1))}% - 17px)` }}>{ride.overspeedThreshold}</div></div>
        <div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}><span>0 kmph</span><span>110 kmph</span></div>
    </div>
    <div className="panel panel-pad section-gap">
      <div style={{ display: 'flex', gap: 10, alignItems: 'start' }}><div className="signal-icon"><ShieldAlert size={16} className="amber" /></div><div><div className="panel-title">Local overspeed alert</div><div className="muted" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.5 }}>The helmet LED and your phone will alert when your threshold is crossed. No contact is notified.</div></div></div>
      <div className="hairline" style={{ margin: '17px 0' }} />
       <label className="field"><span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>Alert at</span><span className="mono amber">{ride.overspeedThreshold} kmph</span></span><input data-testid="input-overspeed-threshold" type="range" min="25" max="100" value={ride.overspeedThreshold} onChange={(event) => { ride.setThreshold(Number(event.target.value)); setSaved(false); }} style={{ accentColor: '#FF8A3D', width: '100%' }} /></label>
       <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 18 }}><div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}><Volume2 size={14} /> Helmet tone enabled</div><button className="button button-primary" onClick={() => setSaved(true)} data-testid="button-save-speed">{saved ? 'Saved locally' : 'Save setting'}</button></div>
    </div>
     <div className="grid-2 section-gap"><div className="panel stat-card"><div className="stat-label"><Gauge size={13} /> Current heading</div><div className="stat-value">{Math.round(ride.location.heading)}°</div></div><div className="panel stat-card"><div className="stat-label"><Info size={13} /> Scope</div><div className="stat-value" style={{ fontSize: 18 }}>Device<span className="stat-unit">only</span></div></div></div>
  </div>;
}