import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase, onValue, push, ref, set } from 'firebase/database';

export type LocationFix = { lat: number; lng: number; speed: number; heading: number; timestamp: string };
export type LastKnownLocation = { lat: number; lng: number; timestamp: string };
export type RideStatus = { battery: number; bleConnected: boolean; signalStrength: number; ridingState: 'riding' | 'parked' | 'crash' };
export type AlertRecord = { id: string; type: 'sos' | 'overspeed' | 'crash' | 'connection' | 'battery'; title: string; timestamp: string; sentTo: string[] | null; status: 'sent' | 'cancelled' };
export type EmergencyContact = { id: string; name: string; phone: string; relation: string; isPrimary: boolean };
export type FamilyMember = { id: string; name: string; relation: string; initials: string; status: 'riding' | 'parked' | 'offline'; speed: number; location: { lat: number; lng: number }; lastSeen: string; color: 'cyan' | 'amber' | 'green' };

export type SimulationState = {
  location: LocationFix;
  lastKnownLocation: LastKnownLocation;
  status: RideStatus;
  alerts: AlertRecord[];
  contacts: EmergencyContact[];
  family: FamilyMember[];
  overspeedThreshold: number;
  staleMode: boolean;
  crashCountdown: number | null;
};

const STORAGE_KEY = 'intelliride-companion-v1';
const riderId = 'demo-rider-1';
const familyId = 'demo-family-1';
const PUNE_CENTER = { lat: 18.4867, lng: 73.8175 };
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};
const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.databaseURL);
const firebaseApp = firebaseConfigured ? (getApps()[0] ?? initializeApp(firebaseConfig)) : null;
const firebaseDatabase = firebaseApp ? getDatabase(firebaseApp) : null;

const alertMap = (value: Record<string, Omit<AlertRecord, 'id'>> | null): AlertRecord[] =>
  Object.entries(value ?? {}).map(([id, alert]) => ({ ...alert, id })).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

// The UI stays usable offline. When Firebase values are present, this adapter
// reads/writes the same Realtime Database paths the ESP32 will use later.
export const firebaseAdapter = {
  enabled: Boolean(firebaseDatabase),
  provider: firebaseDatabase ? 'firebase' as const : 'local' as const,
  sync: async (state: SimulationState) => {
    if (!firebaseDatabase) return;
    await Promise.all([
      set(ref(firebaseDatabase, `riders/${riderId}/location`), state.location),
      set(ref(firebaseDatabase, `riders/${riderId}/lastKnownLocation`), state.lastKnownLocation),
      set(ref(firebaseDatabase, `riders/${riderId}/status`), state.status),
      set(ref(firebaseDatabase, `riders/${riderId}/emergencyContacts`), Object.fromEntries(state.contacts.map((contact) => [contact.id, contact]))),
      set(ref(firebaseDatabase, `families/${familyId}/members`), state.family.map((member) => member.id)),
      set(ref(firebaseDatabase, `riders/${riderId}/alerts`), Object.fromEntries(state.alerts.map(({ id, ...alert }) => [id, alert]))),
    ]);
  },
  addAlert: async (alert: AlertRecord) => {
    if (!firebaseDatabase) return;
    const { id: _id, ...payload } = alert;
    await set(push(ref(firebaseDatabase, `riders/${riderId}/alerts`)), payload);
  },
  subscribe: (onRemoteState: (patch: Partial<SimulationState>) => void) => {
    if (!firebaseDatabase) return () => undefined;
    const riderRoot = ref(firebaseDatabase, `riders/${riderId}`);
    const unsubscribe = onValue(riderRoot, (snapshot) => {
      const value = snapshot.val() as Record<string, unknown> | null;
      if (!value) return;
      onRemoteState({
        location: value.location as LocationFix | undefined,
        lastKnownLocation: value.lastKnownLocation as LastKnownLocation | undefined,
        status: value.status as RideStatus | undefined,
        contacts: value.emergencyContacts ? Object.values(value.emergencyContacts as Record<string, EmergencyContact>) : undefined,
        alerts: value.alerts ? alertMap(value.alerts as unknown as Record<string, Omit<AlertRecord, 'id'>>) : undefined,
      });
    });
    return unsubscribe;
  },
};

const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const defaultSimulation: SimulationState = {
  location: { ...PUNE_CENTER, speed: 58, heading: 42, timestamp: nowIso() },
  lastKnownLocation: { ...PUNE_CENTER, timestamp: nowIso() },
  status: { battery: 82, bleConnected: true, signalStrength: 76, ridingState: 'riding' },
  alerts: [
    { id: 'alert-1', type: 'connection', title: 'Helmet connected', timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), sentTo: null, status: 'sent' },
    { id: 'alert-2', type: 'overspeed', title: 'Speed threshold crossed', timestamp: new Date(Date.now() - 1000 * 60 * 47).toISOString(), sentTo: null, status: 'sent' },
    { id: 'alert-3', type: 'connection', title: 'GPS fix acquired', timestamp: new Date(Date.now() - 1000 * 60 * 51).toISOString(), sentTo: null, status: 'sent' },
  ],
  contacts: [
    { id: 'contact-1', name: 'Maya Chen', phone: '+1 (415) 555-0186', relation: 'Partner', isPrimary: true },
    { id: 'contact-2', name: 'Jon Bell', phone: '+1 (628) 555-0142', relation: 'Brother', isPrimary: false },
  ],
  family: [
    { id: 'family-1', name: 'Maya Chen', relation: 'Partner', initials: 'MC', status: 'riding', speed: 42, location: { lat: 18.4912, lng: 73.8231 }, lastSeen: 'Now', color: 'amber' },
    { id: 'family-2', name: 'Jon Bell', relation: 'Brother', initials: 'JB', status: 'parked', speed: 0, location: { lat: 18.4804, lng: 73.8123 }, lastSeen: '6 min ago', color: 'green' },
    { id: 'family-3', name: 'Rina Bell', relation: 'Sister', initials: 'RB', status: 'offline', speed: 0, location: { lat: 18.497, lng: 73.8089 }, lastSeen: '42 min ago', color: 'cyan' },
  ],
  overspeedThreshold: 72,
  staleMode: false,
  crashCountdown: null,
};

const loadState = (): SimulationState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSimulation;
    const parsed = JSON.parse(saved) as Partial<SimulationState>;
    const legacyBayAreaLocation = (parsed.location?.lng ?? 0) < 0;
    return {
      ...defaultSimulation,
      ...parsed,
      location: legacyBayAreaLocation ? defaultSimulation.location : parsed.location ?? defaultSimulation.location,
      lastKnownLocation: legacyBayAreaLocation ? defaultSimulation.lastKnownLocation : parsed.lastKnownLocation ?? defaultSimulation.lastKnownLocation,
      family: legacyBayAreaLocation ? defaultSimulation.family : parsed.family ?? defaultSimulation.family,
      alerts: (parsed.alerts ?? defaultSimulation.alerts).map((alert) => ({
        ...alert,
        sentTo: Array.isArray(alert.sentTo) ? alert.sentTo : null,
        status: alert.status === 'cancelled' ? 'cancelled' : 'sent',
      })),
    };
  } catch {
    return defaultSimulation;
  }
};

const persistState = (state: SimulationState) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* local persistence is best effort */ }
};

export function useRideSimulation() {
  const [state, setState] = useState<SimulationState>(loadState);
  const [toast, setToast] = useState('');
  const skipNextSync = useRef(false);
  const lastBatteryAlert = useRef(false);
  const lastBleState = useRef(defaultSimulation.status.bleConnected);
  const lastStaleMode = useRef(defaultSimulation.staleMode);

  useEffect(() => {
    const unsubscribe = firebaseAdapter.subscribe((patch) => {
      skipNextSync.current = true;
      setState((current) => ({ ...current, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) }));
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    persistState(state);
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    void firebaseAdapter.sync(state);
  }, [state]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((current) => {
        if (current.staleMode || current.status.ridingState !== 'riding') return current;
        const nextSpeed = Math.max(28, Math.min(84, current.location.speed + (Math.random() * 8 - 4)));
        const nextHeading = (current.location.heading + (Math.random() * 5 - 2.5) + 360) % 360;
        const nextLocation = {
          ...current.location,
          speed: Math.round(nextSpeed),
          heading: Math.round(nextHeading),
          lat: current.location.lat + 0.00008,
          lng: current.location.lng + 0.00004,
          timestamp: nowIso(),
        };
        const overspeed = nextSpeed > current.overspeedThreshold && current.location.speed <= current.overspeedThreshold;
        const battery = Math.max(8, current.status.battery - (Math.random() < 0.015 ? 1 : 0));
        const batteryAlert = battery < 20 && !lastBatteryAlert.current;
        const bleConnected = Math.random() > 0.012 ? current.status.bleConnected : !current.status.bleConnected;
        const bleChanged = bleConnected !== current.status.bleConnected;
        lastBatteryAlert.current = battery < 20;
        lastBleState.current = bleConnected;
        const generatedAlerts: AlertRecord[] = [];
        if (overspeed) generatedAlerts.push({ id: id('alert'), type: 'overspeed', title: 'Speed threshold crossed', timestamp: nowIso(), sentTo: null, status: 'sent' });
        if (batteryAlert) generatedAlerts.push({ id: id('alert'), type: 'battery', title: 'Battery below 20%', timestamp: nowIso(), sentTo: null, status: 'sent' });
        if (bleChanged) generatedAlerts.push({ id: id('alert'), type: 'connection', title: bleConnected ? 'Helmet reconnected' : 'Helmet disconnected', timestamp: nowIso(), sentTo: null, status: 'sent' });
        return {
          ...current,
          location: nextLocation,
          lastKnownLocation: { lat: nextLocation.lat, lng: nextLocation.lng, timestamp: nextLocation.timestamp },
          status: { ...current.status, battery, bleConnected },
          alerts: generatedAlerts.length ? [...generatedAlerts, ...current.alerts] : current.alerts,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.crashCountdown === null) return;
    if (state.crashCountdown <= 0) {
      setState((current) => ({ ...current, crashCountdown: null, status: { ...current.status, ridingState: 'crash' }, alerts: [{ id: id('alert'), type: 'crash', title: 'Crash alert sent', timestamp: nowIso(), sentTo: current.contacts.filter((contact) => contact.isPrimary).map((contact) => contact.id), status: 'sent' }, ...current.alerts] }));
      setToast('Crash alert sent to your primary contact');
      return;
    }
    const timer = window.setTimeout(() => setState((current) => current.crashCountdown === null ? current : { ...current, crashCountdown: current.crashCountdown - 1 }), 1000);
    return () => window.clearTimeout(timer);
  }, [state.crashCountdown]);

  const update = useCallback((updater: (current: SimulationState) => SimulationState) => setState(updater), []);
  const setThreshold = useCallback((threshold: number) => update((current) => ({ ...current, overspeedThreshold: threshold })), [update]);
  const setStaleMode = useCallback((staleMode: boolean) => {
    update((current) => ({
      ...current,
      staleMode,
      location: staleMode ? { ...current.location, timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString() } : { ...current.location, timestamp: nowIso() },
      alerts: staleMode !== lastStaleMode.current ? [{ id: id('alert'), type: 'connection', title: staleMode ? 'GPS signal lost' : 'GPS signal restored', timestamp: nowIso(), sentTo: null, status: 'sent' }, ...current.alerts] : current.alerts,
    }));
    lastStaleMode.current = staleMode;
  }, [update]);
  const triggerCrash = useCallback(() => update((current) => ({ ...current, status: { ...current.status, ridingState: 'crash' }, crashCountdown: 10 })), [update]);
  const cancelCrash = useCallback(() => { update((current) => ({ ...current, status: { ...current.status, ridingState: 'riding' }, crashCountdown: null, alerts: [{ id: id('alert'), type: 'crash', title: 'Crash check cancelled', timestamp: nowIso(), sentTo: null, status: 'cancelled' }, ...current.alerts] })); setToast('Crash check cancelled'); }, [update]);
  const sendSos = useCallback(() => { update((current) => ({ ...current, alerts: [{ id: id('alert'), type: 'sos', title: 'Manual SOS sent', timestamp: nowIso(), sentTo: current.contacts.filter((contact) => contact.isPrimary).map((contact) => contact.id), status: 'sent' }, ...current.alerts] })); setToast('SOS sent to your emergency contacts'); }, [update]);
  const startRide = useCallback(() => { update((current) => ({ ...current, staleMode: false, crashCountdown: null, location: { ...current.location, timestamp: nowIso() }, status: { ...current.status, ridingState: 'riding' } })); setToast('Ride started'); }, [update]);
  const endRide = useCallback(() => { update((current) => ({ ...current, crashCountdown: null, location: { ...current.location, timestamp: nowIso() }, lastKnownLocation: { lat: current.location.lat, lng: current.location.lng, timestamp: nowIso() }, status: { ...current.status, ridingState: 'parked' } })); setToast('Ride ended'); }, [update]);
  const addContact = useCallback((contact: Omit<EmergencyContact, 'id' | 'isPrimary'>) => { update((current) => ({ ...current, contacts: [...current.contacts, { ...contact, id: id('contact'), isPrimary: current.contacts.length === 0 }] })); setToast('Emergency contact added'); }, [update]);
  const editContact = useCallback((contact: EmergencyContact) => { update((current) => ({ ...current, contacts: current.contacts.map((item) => item.id === contact.id ? contact : item) })); setToast('Contact updated'); }, [update]);
  const removeContact = useCallback((contactId: string) => { update((current) => ({ ...current, contacts: current.contacts.filter((item) => item.id !== contactId) })); setToast('Contact removed'); }, [update]);
  const makePrimary = useCallback((contactId: string) => { update((current) => ({ ...current, contacts: current.contacts.map((item) => ({ ...item, isPrimary: item.id === contactId })) })); setToast('Primary contact updated'); }, [update]);
  const resetDemo = useCallback(() => { setState(defaultSimulation); setToast('Demo data reset'); }, []);
  const tickFamily = useCallback(() => update((current) => ({ ...current, family: current.family.map((member) => member.status === 'riding' ? { ...member, speed: Math.max(20, Math.min(60, member.speed + Math.round(Math.random() * 8 - 4))), lastSeen: 'Now' } : member) })), [update]);

  const adapterLabel = useMemo(() => firebaseConfigured ? 'Firebase adapter ready' : 'Local simulation', []);
  return { ...state, toast, adapterLabel, setThreshold, setStaleMode, triggerCrash, cancelCrash, sendSos, startRide, endRide, addContact, editContact, removeContact, makePrimary, resetDemo, tickFamily };
}

const INDIA_TIME_ZONE = 'Asia/Kolkata';
export const formatTime = (timestamp: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: INDIA_TIME_ZONE }).format(new Date(timestamp));
export const formatDateTime = (timestamp: string) => new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: INDIA_TIME_ZONE }).format(new Date(timestamp));
export const relativeTime = (timestamp: string) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  return mins < 1 ? 'Just now' : mins === 1 ? '1 min ago' : `${mins} min ago`;
};