import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getApps,
  initializeApp,
} from 'firebase/app';

import {
  getDatabase,
  onValue,
  push,
  ref,
  set,
} from 'firebase/database';

/* =========================================================
   TYPES
========================================================= */

export type LocationFix = {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
};

export type LastKnownLocation = {
  lat: number;
  lng: number;
  timestamp: string;
};

export type RideStatus = {
  battery: number;
  bleConnected: boolean;
  signalStrength: number;
  ridingState: 'riding' | 'parked' | 'crash';
};

export type AlertRecord = {
  id: string;
  type:
    | 'sos'
    | 'overspeed'
    | 'crash'
    | 'connection'
    | 'battery';
  title: string;
  timestamp: string;
  sentTo: string[] | null;
  status: 'sent' | 'cancelled';
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  initials: string;
  status: 'riding' | 'parked' | 'offline' | 'crash';
  speed: number;
  location: {
    lat: number;
    lng: number;
  };
  lastSeen: string;
  color: 'cyan' | 'amber' | 'green';
};

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

/* =========================================================
   CONSTANTS
========================================================= */

const STORAGE_KEY = 'intelliride-companion-v1';

const RIDER_ID = 'demo-rider-1';

const FAMILY_ID = 'demo-family-1';

const INDIA_TIME_ZONE = 'Asia/Kolkata';

const PUNE_CENTER = {
  lat: 18.4867,
  lng: 73.8175,
};

/*
 * VITE_HARDWARE_MODE=true
 *
 * Firebase becomes the telemetry source.
 * The dummy telemetry simulator is disabled.
 *
 * VITE_HARDWARE_MODE=false
 *
 * Normal demo/simulation mode.
 */

const hardwareMode =
  ['true', '1', 'production', 'hardware'].includes(
    String(import.meta.env.VITE_HARDWARE_MODE)
      .trim()
      .toLowerCase(),
  );

/* =========================================================
   FIREBASE CONFIG
========================================================= */

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY,

  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,

  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL,

  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID,

  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env
      .VITE_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    import.meta.env.VITE_FIREBASE_APP_ID,
};

const firebaseConfigured =
  Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.databaseURL,
  );

const firebaseApp =
  firebaseConfigured
    ? getApps()[0] ??
      initializeApp(firebaseConfig)
    : null;

const firebaseDatabase =
  firebaseApp
    ? getDatabase(firebaseApp)
    : null;

/* =========================================================
   BASIC HELPERS
========================================================= */

const nowIso = (): string =>
  new Date().toISOString();

const createId = (
  prefix: string,
): string =>
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;

const getPrimaryContactIds = (
  contacts: EmergencyContact[],
): string[] =>
  contacts
    .filter(
      (contact) => contact.isPrimary,
    )
    .map(
      (contact) => contact.id,
    );

/* =========================================================
   FIREBASE ALERT PARSER
========================================================= */

const parseAlerts = (
  value:
    | Record<
        string,
        Omit<AlertRecord, 'id'>
      >
    | null
    | undefined,
): AlertRecord[] => {
  return Object.entries(
    value ?? {},
  )
    .map(
      ([alertId, alert]) => ({
        id: alertId,
        type: alert.type,
        title: alert.title,
        timestamp: alert.timestamp,

        sentTo:
          Array.isArray(alert.sentTo)
            ? alert.sentTo
            : null,

        status:
          alert.status === 'cancelled'
            ? ('cancelled' as const)
            : ('sent' as const),
      }),
    )
    .sort(
      (a, b) =>
        new Date(
          b.timestamp,
        ).getTime() -
        new Date(
          a.timestamp,
        ).getTime(),
    );
};

/* =========================================================
   FIREBASE ADAPTER
========================================================= */

export const firebaseAdapter = {
  enabled:
    Boolean(firebaseDatabase),

  provider:
    firebaseDatabase
      ? ('firebase' as const)
      : ('local' as const),

  /*
   * Normal simulation mode can write its state
   * to Firebase.
   *
   * Hardware mode NEVER writes simulated
   * telemetry to Firebase.
   */
  sync: async (
    state: SimulationState,
  ): Promise<void> => {
    if (
      !firebaseDatabase ||
      hardwareMode
    ) {
      return;
    }

    await Promise.all([
      set(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/location`,
        ),
        state.location,
      ),

      set(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/lastKnownLocation`,
        ),
        state.lastKnownLocation,
      ),

      set(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/status`,
        ),
        state.status,
      ),

      set(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/emergencyContacts`,
        ),
        Object.fromEntries(
          state.contacts.map(
            (contact) => [
              contact.id,
              contact,
            ],
          ),
        ),
      ),

      set(
        ref(
          firebaseDatabase,
          `families/${FAMILY_ID}/members`,
        ),
        state.family.map(
          (member) => member.id,
        ),
      ),

      set(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/alerts`,
        ),
        Object.fromEntries(
          state.alerts.map(
            ({
              id: alertId,
              ...alert
            }) => [
              alertId,
              alert,
            ],
          ),
        ),
      ),
    ]);
  },

  /*
   * Add one alert.
   */
  addAlert: async (
    alert: AlertRecord,
  ): Promise<void> => {
    if (!firebaseDatabase) {
      return;
    }

    const {
      id: _id,
      ...payload
    } = alert;

    await set(
      push(
        ref(
          firebaseDatabase,
          `riders/${RIDER_ID}/alerts`,
        ),
      ),
      payload,
    );
  },

  /*
   * Listen to Firebase in real time.
   */
 subscribe: (onRemoteState: (patch: Partial<SimulationState>) => void) => {
  if (!firebaseDatabase) return () => undefined;

  const riderRoot = ref(
    firebaseDatabase,
    `riders/${RIDER_ID}`,
  );

  const unsubscribe = onValue(
    riderRoot,
    (snapshot) => {
      const value =
        snapshot.val() as Record<string, unknown> | null;

      if (!value) return;

      const rawLocation =
        value.location as
          | Partial<LocationFix>
          | null
          | undefined;

      const remoteLocation: LocationFix | undefined =
        rawLocation &&
        Number.isFinite(Number(rawLocation.lat)) &&
        Number.isFinite(Number(rawLocation.lng))
          ? {
              lat: Number(rawLocation.lat),
              lng: Number(rawLocation.lng),
              speed: Number.isFinite(Number(rawLocation.speed))
                ? Number(rawLocation.speed)
                : 0,
              heading: Number.isFinite(Number(rawLocation.heading))
                ? Number(rawLocation.heading)
                : 0,
              timestamp:
                typeof rawLocation.timestamp === 'string'
                  ? rawLocation.timestamp
                  : nowIso(),
            }
          : undefined;

      const remoteStatus =
        value.status as RideStatus | undefined;

      const familyPatch: FamilyMember[] | undefined =
        remoteLocation && remoteStatus
          ? [
              {
                id: 'family-1',
                name: 'Maya Chen',
                relation: 'Partner',
                initials: 'MC',
                status:
                  remoteStatus.ridingState === 'crash'
                    ? 'crash'
                    : remoteStatus.ridingState === 'riding'
                      ? 'riding'
                      : 'parked',
                speed: Math.round(
                  remoteLocation.speed ?? 0,
                ),
                location: {
                  lat: remoteLocation.lat,
                  lng: remoteLocation.lng,
                },
                lastSeen: 'Now',
                color: 'amber',
              },
            ]
          : undefined;

      onRemoteState({
        location: remoteLocation,

        lastKnownLocation:
          value.lastKnownLocation as
            | LastKnownLocation
            | undefined,

        status: remoteStatus,

        contacts: value.emergencyContacts
          ? Object.values(
              value.emergencyContacts as Record<
                string,
                EmergencyContact
              >,
            )
          : undefined,

       alerts: value.alerts
  ? parseAlerts(
      value.alerts as unknown as Record<
        string,
        Omit<AlertRecord, 'id'>
      >,
    )
  : undefined,
        family: familyPatch,
      });
    },
  );

  return unsubscribe;
  },
};

/* =========================================================
   DEFAULT STATE
========================================================= */

export const defaultSimulation: SimulationState =
  {
    location: {
      ...PUNE_CENTER,

      /*
       * Parked means zero speed.
       */
      speed: 0,

      heading: 0,

      timestamp: nowIso(),
    },

    lastKnownLocation: {
      ...PUNE_CENTER,
      timestamp: nowIso(),
    },

    status: {
      battery: 82,
      bleConnected: true,
      signalStrength: 76,

      /*
       * Start parked.
       */
      ridingState: 'parked',
    },

    alerts: [
      {
        id: 'alert-1',
        type: 'connection',
        title: 'Helmet connected',
        timestamp:
          new Date(
            Date.now() -
              18 * 60 * 1000,
          ).toISOString(),
        sentTo: null,
        status: 'sent',
      },

      {
        id: 'alert-2',
        type: 'overspeed',
        title:
          'Speed threshold crossed',
        timestamp:
          new Date(
            Date.now() -
              47 * 60 * 1000,
          ).toISOString(),
        sentTo: null,
        status: 'sent',
      },

      {
        id: 'alert-3',
        type: 'connection',
        title: 'GPS fix acquired',
        timestamp:
          new Date(
            Date.now() -
              51 * 60 * 1000,
          ).toISOString(),
        sentTo: null,
        status: 'sent',
      },
    ],

    contacts: [
      {
        id: 'contact-1',
        name: 'Maya Chen',
        phone:
          '+1 (415) 555-0186',
        relation: 'Partner',
        isPrimary: true,
      },

      {
        id: 'contact-2',
        name: 'Jon Bell',
        phone:
          '+1 (628) 555-0142',
        relation: 'Brother',
        isPrimary: false,
      },
    ],

    family: [
      {
        id: 'family-1',
        name: 'Maya Chen',
        relation: 'Partner',
        initials: 'MC',
        status: 'riding',
        speed: 42,
        location: {
          lat: 18.4912,
          lng: 73.8231,
        },
        lastSeen: 'Now',
        color: 'amber',
      },

      {
        id: 'family-2',
        name: 'Jon Bell',
        relation: 'Brother',
        initials: 'JB',
        status: 'parked',
        speed: 0,
        location: {
          lat: 18.4804,
          lng: 73.8123,
        },
        lastSeen: '6 min ago',
        color: 'green',
      },

      {
        id: 'family-3',
        name: 'Rina Bell',
        relation: 'Sister',
        initials: 'RB',
        status: 'offline',
        speed: 0,
        location: {
          lat: 18.497,
          lng: 73.8089,
        },
        lastSeen: '42 min ago',
        color: 'cyan',
      },
    ],

    overspeedThreshold: 72,

    staleMode: false,

    crashCountdown: null,
  };

/* =========================================================
   LOAD LOCAL STATE
========================================================= */

const loadState =
  (): SimulationState => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY,
        );

      if (!saved) {
        return defaultSimulation;
      }

      const parsed =
        JSON.parse(
          saved,
        ) as Partial<SimulationState>;

      return {
        ...defaultSimulation,

        ...parsed,

        location:
          parsed.location ??
          defaultSimulation.location,

        lastKnownLocation:
          parsed.lastKnownLocation ??
          defaultSimulation.lastKnownLocation,

        status:
          parsed.status ??
          defaultSimulation.status,

        contacts:
          parsed.contacts ??
          defaultSimulation.contacts,

        family:
          parsed.family ??
          defaultSimulation.family,

        alerts: (
          parsed.alerts ??
          defaultSimulation.alerts
        ).map(
          (alert) => ({
            ...alert,

            sentTo:
              Array.isArray(
                alert.sentTo,
              )
                ? alert.sentTo
                : null,

            status:
              alert.status ===
              'cancelled'
                ? 'cancelled'
                : 'sent',
          }),
        ),

        overspeedThreshold:
          parsed.overspeedThreshold ??
          defaultSimulation.overspeedThreshold,

        staleMode:
          parsed.staleMode ??
          defaultSimulation.staleMode,

        crashCountdown:
          parsed.crashCountdown ??
          null,
      };
    } catch {
      return defaultSimulation;
    }
  };

/* =========================================================
   LOCAL PERSISTENCE
========================================================= */

const persistState = (
  state: SimulationState,
): void => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Local persistence is best effort.
  }
};

/* =========================================================
   MAIN HOOK
========================================================= */

export function useRideSimulation() {
  const [state, setState] =
    useState<SimulationState>(
      loadState,
    );

  const [toast, setToast] =
    useState('');

  const skipNextSync =
    useRef(false);

  const lastBatteryAlert =
    useRef(false);

  const lastStaleMode =
    useRef(
      defaultSimulation.staleMode,
    );

  /* =======================================================
     FIREBASE REAL-TIME LISTENER
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      firebaseAdapter.subscribe(
        (patch) => {
          /*
           * Firebase has supplied the data.
           *
           * Prevent this Firebase update from
           * immediately being written back.
           */
          skipNextSync.current =
            true;

          setState(
            (current) => ({
              ...current,

              ...Object.fromEntries(
                Object.entries(
                  patch,
                ).filter(
                  ([, value]) =>
                    value !==
                    undefined,
                ),
              ),
            }),
          );
        },
      );

    return unsubscribe;
  }, []);

  /* =======================================================
     LOCAL STORAGE + FIREBASE SYNC
  ======================================================= */

  useEffect(() => {
    persistState(state);

    /*
     * HARDWARE MODE:
     *
     * Firebase is the source of truth.
     * Never push simulator state back.
     */
    if (hardwareMode) {
      return;
    }

    if (skipNextSync.current) {
      skipNextSync.current =
        false;

      return;
    }

    void firebaseAdapter.sync(
      state,
    );
  }, [state]);

  /* =======================================================
     TOAST
  ======================================================= */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setToast('');
        },
        2400,
      );

    return () =>
      window.clearTimeout(timer);
  }, [toast]);

  /* =======================================================
     SIMULATOR
  ======================================================= */

  useEffect(() => {
    /*
     * THIS IS THE IMPORTANT CHANGE.
     *
     * Hardware mode = NO dummy telemetry.
     */
    if (hardwareMode) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setState(
            (current) => {
              if (
                current.staleMode ||
                current.status
                  .ridingState !==
                  'riding'
              ) {
                return current;
              }

              const nextSpeed =
                Math.max(
                  28,
                  Math.min(
                    84,
                    current.location
                        .speed +
                      (Math.random() *
                        8 -
                        4),
                  ),
                );

              const nextHeading =
                (current.location
                  .heading +
                  (Math.random() *
                    5 -
                    2.5) +
                  360) %
                360;

              const timestamp =
                nowIso();

              const nextLocation: LocationFix =
                {
                  ...current.location,

                  speed:
                    Math.round(
                      nextSpeed,
                    ),

                  heading:
                    Math.round(
                      nextHeading,
                    ),

                  lat:
                    current.location
                      .lat +
                    0.00008,

                  lng:
                    current.location
                      .lng +
                    0.00004,

                  timestamp,
                };

              const overspeed =
                nextSpeed >
                  current.overspeedThreshold &&
                current.location
                    .speed <=
                  current.overspeedThreshold;

              const battery =
                Math.max(
                  8,
                  current.status
                      .battery -
                    (Math.random() <
                    0.015
                      ? 1
                      : 0),
                );

              const bleConnected =
                Math.random() >
                0.012
                  ? current.status
                      .bleConnected
                  : !current.status
                      .bleConnected;

              const bleChanged =
                bleConnected !==
                current.status
                  .bleConnected;

              const batteryAlert =
                battery < 20 &&
                !lastBatteryAlert.current;

              lastBatteryAlert.current =
                battery < 20;

              const generatedAlerts: AlertRecord[] =
                [];

              if (overspeed) {
                generatedAlerts.push(
                  {
                    id: createId(
                      'alert',
                    ),
                    type: 'overspeed',
                    title:
                      'Speed threshold crossed',
                    timestamp,
                    sentTo: null,
                    status: 'sent',
                  },
                );
              }

              if (batteryAlert) {
                generatedAlerts.push(
                  {
                    id: createId(
                      'alert',
                    ),
                    type: 'battery',
                    title:
                      'Battery below 20%',
                    timestamp,
                    sentTo: null,
                    status: 'sent',
                  },
                );
              }

              if (bleChanged) {
                generatedAlerts.push(
                  {
                    id: createId(
                      'alert',
                    ),
                    type: 'connection',
                    title:
                      bleConnected
                        ? 'Helmet reconnected'
                        : 'Helmet disconnected',
                    timestamp,
                    sentTo: null,
                    status: 'sent',
                  },
                );
              }

              return {
                ...current,

                location:
                  nextLocation,

                lastKnownLocation:
                  {
                    lat:
                      nextLocation.lat,
                    lng:
                      nextLocation.lng,
                    timestamp,
                  },

                status: {
                  ...current.status,
                  battery,
                  bleConnected,
                },

                alerts:
                  generatedAlerts.length >
                  0
                    ? [
                        ...generatedAlerts,
                        ...current.alerts,
                      ]
                    : current.alerts,
              };
            },
          );
        },
        1000,
      );

    return () =>
      window.clearInterval(
        timer,
      );
  }, []);

  /* =======================================================
     CRASH COUNTDOWN
  ======================================================= */

  useEffect(() => {
    if (
      state.crashCountdown ===
      null
    ) {
      return;
    }

    if (
      state.crashCountdown <=
      0
    ) {
      setState(
        (current) => ({
          ...current,

          crashCountdown:
            null,

          status: {
            ...current.status,
            ridingState:
              'crash',
          },

          alerts: [
            {
              id: createId(
                'alert',
              ),
              type: 'crash',
              title:
                'Crash alert sent',
              timestamp: nowIso(),

              sentTo:
                getPrimaryContactIds(
                  current.contacts,
                ),

              status: 'sent',
            },

            ...current.alerts,
          ],
        }),
      );

      setToast(
        'Crash alert sent to your primary contact',
      );

      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setState(
            (current) =>
              current.crashCountdown ===
              null
                ? current
                : {
                    ...current,

                    crashCountdown:
                      current.crashCountdown -
                      1,
                  },
          );
        },
        1000,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    state.crashCountdown,
  ]);

  /* =======================================================
     UPDATE
  ======================================================= */

  const update = useCallback(
    (
      updater: (
        current: SimulationState,
      ) => SimulationState,
    ) => {
      setState(updater);
    },
    [],
  );

  /* =======================================================
     SPEED THRESHOLD
  ======================================================= */

  const setThreshold =
    useCallback(
      (threshold: number) => {
        update(
          (current) => ({
            ...current,

            overspeedThreshold:
              threshold,
          }),
        );
      },
      [update],
    );

  /* =======================================================
     GPS STALE MODE
  ======================================================= */

  const setStaleMode =
    useCallback(
      (staleMode: boolean) => {
        update(
          (current) => ({
            ...current,

            staleMode,

            location:
              staleMode
                ? {
                    ...current.location,

                    timestamp:
                      new Date(
                        Date.now() -
                          9 *
                            60 *
                            1000,
                      ).toISOString(),
                  }
                : {
                    ...current.location,

                    timestamp:
                      nowIso(),
                  },

            alerts:
              staleMode !==
              lastStaleMode.current
                ? [
                    {
                      id: createId(
                        'alert',
                      ),
                      type:
                        'connection',
                      title:
                        staleMode
                          ? 'GPS signal lost'
                          : 'GPS signal restored',
                      timestamp:
                        nowIso(),
                      sentTo: null,
                      status:
                        'sent',
                    },

                    ...current.alerts,
                  ]
                : current.alerts,
          }),
        );

        lastStaleMode.current =
          staleMode;
      },
      [update],
    );

  /* =======================================================
     CRASH
  ======================================================= */

  const triggerCrash =
    useCallback(() => {
      update(
        (current) => ({
          ...current,

          status: {
            ...current.status,
            ridingState:
              'crash',
          },

          crashCountdown: 10,
        }),
      );
    }, [update]);

  /* =======================================================
     CANCEL CRASH
  ======================================================= */

  const cancelCrash =
    useCallback(() => {
      update(
        (current) => ({
          ...current,

          status: {
            ...current.status,
            ridingState:
              'riding',
          },

          crashCountdown: null,

          alerts: [
            {
              id: createId(
                'alert',
              ),
              type: 'crash',
              title:
                'Crash check cancelled',
              timestamp:
                nowIso(),
              sentTo: null,
              status:
                'cancelled',
            },

            ...current.alerts,
          ],
        }),
      );

      setToast(
        'Crash check cancelled',
      );
    }, [update]);

  /* =======================================================
     SOS
  ======================================================= */

  const sendSos =
    useCallback(() => {
      update(
        (current) => ({
          ...current,

          alerts: [
            {
              id: createId(
                'alert',
              ),
              type: 'sos',
              title:
                'Manual SOS sent',
              timestamp:
                nowIso(),

              sentTo:
                getPrimaryContactIds(
                  current.contacts,
                ),

              status: 'sent',
            },

            ...current.alerts,
          ],
        }),
      );

      setToast(
        'SOS sent to your emergency contacts',
      );
    }, [update]);

  /* =======================================================
     START RIDE
  ======================================================= */

  const startRide =
    useCallback(() => {
      update(
        (current) => ({
          ...current,

          staleMode: false,

          crashCountdown:
            null,

          location: {
            ...current.location,
            timestamp:
              nowIso(),
          },

          status: {
            ...current.status,
            ridingState:
              'riding',
          },
        }),
      );

      setToast(
        'Ride started',
      );
    }, [update]);

  /* =======================================================
     END RIDE
  ======================================================= */

  const endRide =
    useCallback(() => {
      update(
        (current) => {
          const timestamp =
            nowIso();

          return {
            ...current,

            crashCountdown:
              null,

            location: {
              ...current.location,

              /*
               * PARKED = 0 KM/H
               */
              speed: 0,

              timestamp,
            },

            lastKnownLocation: {
              lat:
                current.location
                  .lat,
              lng:
                current.location
                  .lng,
              timestamp,
            },

            status: {
              ...current.status,
              ridingState:
                'parked',
            },
          };
        },
      );

      setToast(
        'Ride ended',
      );
    }, [update]);

  /* =======================================================
     CONTACTS
  ======================================================= */

  const addContact =
    useCallback(
      (
        contact: Omit<
          EmergencyContact,
          'id' | 'isPrimary'
        >,
      ) => {
        update(
          (current) => ({
            ...current,

            contacts: [
              ...current.contacts,

              {
                ...contact,

                id: createId(
                  'contact',
                ),

                isPrimary:
                  current.contacts
                    .length === 0,
              },
            ],
          }),
        );

        setToast(
          'Emergency contact added',
        );
      },
      [update],
    );

  const editContact =
    useCallback(
      (
        contact: EmergencyContact,
      ) => {
        update(
          (current) => ({
            ...current,

            contacts:
              current.contacts.map(
                (item) =>
                  item.id ===
                  contact.id
                    ? contact
                    : item,
              ),
          }),
        );

        setToast(
          'Contact updated',
        );
      },
      [update],
    );

  const removeContact =
    useCallback(
      (contactId: string) => {
        update(
          (current) => ({
            ...current,

            contacts:
              current.contacts.filter(
                (item) =>
                  item.id !==
                  contactId,
              ),
          }),
        );

        setToast(
          'Contact removed',
        );
      },
      [update],
    );

  const makePrimary =
    useCallback(
      (contactId: string) => {
        update(
          (current) => ({
            ...current,

            contacts:
              current.contacts.map(
                (item) => ({
                  ...item,

                  isPrimary:
                    item.id ===
                    contactId,
                }),
              ),
          }),
        );

        setToast(
          'Primary contact updated',
        );
      },
      [update],
    );

  /* =======================================================
     RESET
  ======================================================= */

  const resetDemo =
    useCallback(() => {
      setState(
        defaultSimulation,
      );

      setToast(
        'Demo data reset',
      );
    }, []);

  /* =======================================================
     FAMILY
  ======================================================= */

  const tickFamily =
    useCallback(() => {
      update(
        (current) => ({
          ...current,

          family:
            current.family.map(
              (member) =>
                member.status ===
                'riding'
                  ? {
                      ...member,

                      speed:
                        Math.max(
                          20,
                          Math.min(
                            60,
                            member.speed +
                              Math.round(
                                Math.random() *
                                  8 -
                                  4,
                              ),
                          ),
                        ),

                      lastSeen:
                        'Now',
                    }
                  : member,
            ),
        }),
      );
    }, [update]);

  /* =======================================================
     ADAPTER STATUS
  ======================================================= */

  const adapterLabel =
    useMemo(() => {
      if (
        hardwareMode &&
        firebaseConfigured
      ) {
        return 'Hardware / Firebase mode';
      }

      if (hardwareMode) {
        return 'Hardware mode / Firebase not configured';
      }

      if (firebaseConfigured) {
        return 'Firebase adapter ready';
      }

      return 'Local simulation';
    }, []);

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    ...state,

    toast,

    adapterLabel,

    setThreshold,

    setStaleMode,

    triggerCrash,

    cancelCrash,

    sendSos,

    startRide,

    endRide,

    addContact,

    editContact,

    removeContact,

    makePrimary,

    resetDemo,

    tickFamily,
  };
}

/* =========================================================
   DATE / TIME FUNCTIONS
========================================================= */

/*
 * Example:
 * 17 Sept 2026
 */
export const formatDate = (
  timestamp: string,
): string =>
  new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone:
        INDIA_TIME_ZONE,
    },
  ).format(
    new Date(timestamp),
  );

/*
 * Example:
 * 4:45 PM
 */
export const formatTime = (
  timestamp: string,
): string =>
  new Intl.DateTimeFormat(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
      timeZone:
        INDIA_TIME_ZONE,
    },
  ).format(
    new Date(timestamp),
  );

/*
 * Example:
 * 17 Sept, 4:45 PM
 */
export const formatDateTime = (
  timestamp: string,
): string =>
  new Intl.DateTimeFormat(
    'en-IN',
    {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone:
        INDIA_TIME_ZONE,
    },
  ).format(
    new Date(timestamp),
  );

/*
 * Example:
 * Just now
 * 2 min ago
 * 15 min ago
 */
export const relativeTime = (
  timestamp: string,
): string => {
  const minutes =
    Math.max(
      0,
      Math.round(
        (Date.now() -
          new Date(
            timestamp,
          ).getTime()) /
          60000,
      ),
    );

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes === 1) {
    return '1 min ago';
  }

  return `${minutes} min ago`;
};