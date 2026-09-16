import { useMemo, useState } from 'react';
import { AlertTriangle, BatteryLow, Bell, CheckCircle2, Clock3, Filter, Radio, Send, ShieldAlert, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/app-shell';
import { formatDateTime, useRideSimulation } from '@/lib/simulation';

const icons = { sos: Send, overspeed: AlertTriangle, crash: ShieldAlert, connection: Radio, battery: BatteryLow };
const colors = { sos: 'red', overspeed: 'amber', crash: 'red', connection: 'cyan', battery: 'amber' };

export function AlertsPage() {
  const ride = useRideSimulation();
  const [filter, setFilter] = useState<'all' | 'safety' | 'device'>('all');
  const filtered = useMemo(() => ride.alerts.filter((alert) => filter === 'all' || (filter === 'safety' ? ['sos', 'crash', 'overspeed'].includes(alert.type) : alert.type === 'connection')), [ride.alerts, filter]);
   const contactNames = new Map(ride.contacts.map((contact) => [contact.id, contact.name]));
   return <div className="animate-rise">
     <PageHeader eyebrow="Event stream / local history" title="Alert history." lede="A clear trail of what your helmet noticed, and who received it." action={<div className="status-pill"><span className="dot" />{ride.alerts.length} events</div>} />
    <div className="panel panel-pad">
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto' }}>
        {(['all', 'safety', 'device'] as const).map((item) => <button key={item} className={`button ${filter === item ? 'button-primary' : 'button-secondary'}`} onClick={() => setFilter(item)} data-testid={`button-filter-${item}`}><Filter size={13} />{item === 'all' ? 'All events' : item === 'safety' ? 'Safety' : 'Device'}</button>)}
      </div>
    </div>
    <div className="list-stack section-gap">
       {filtered.map((alert) => { const Icon = icons[alert.type]; const recipients = alert.sentTo?.map((id) => contactNames.get(id) ?? id).join(', '); return <article className="list-row" key={alert.id} data-testid={`row-alert-${alert.id}`}><div className={`avatar ${colors[alert.type]}`}><Icon size={16} /></div><div className="row-main"><div className="row-name">{alert.title}</div><div className="row-detail"><Clock3 size={11} style={{ verticalAlign: '-2px', marginRight: 4 }} />{formatDateTime(alert.timestamp)} <span style={{ margin: '0 5px' }}>·</span> {recipients ? `Sent to: ${recipients}` : 'Logged only'}</div></div><div style={{ textAlign: 'right' }}><span className={`status-pill ${alert.status === 'cancelled' ? 'amber' : 'green'}`}>{alert.status === 'sent' ? <CheckCircle2 size={11} /> : <Bell size={11} />}{alert.status}</span></div></article>; })}
      {!filtered.length ? <div className="panel empty-state"><WifiOff size={24} /><div>No events in this filter.</div><div style={{ fontSize: 11, marginTop: 5 }}>New safety and device events will appear here.</div></div> : null}
    </div>
     <div className="panel panel-pad section-gap" style={{ display: 'flex', gap: 10, alignItems: 'start' }}><Radio size={16} /><div><div className="panel-title">Delivery context</div><div className="muted" style={{ fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>Safety alerts use your primary contact. Device events stay local and never notify your family.</div></div></div>
  </div>;
}