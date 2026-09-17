import { useState } from 'react';
import {
  MapPinned,
  Navigation,
  Users,
  WifiOff,
  RefreshCw,
} from 'lucide-react';

import { useRideSimulation } from '@/lib/simulation';

const statusCopy = {
  riding: 'Riding',
  parked: 'Parked',
  offline: 'Offline',
  crash: 'Accident detected',
} as const;

export function FamilyPage() {
  const ride = useRideSimulation();
  const [focus, setFocus] = useState<string | null>(null);

  const focusedMember = ride.family.find(
    (member) => member.id === focus,
  );

  const navigateToRider = (
    lat: number,
    lng: number,
  ) => {
    const destination = `${lat},${lng}`;

    const navigationUrl =
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination,
      )}&travelmode=driving`;

    window.open(
      navigationUrl,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const getStatusClass = (
    status: 'riding' | 'parked' | 'offline' | 'crash',
  ) => {
    if (status === 'riding') {
      return 'green';
    }

    if (status === 'parked') {
      return 'amber';
    }

    if (status === 'crash') {
      return 'red';
    }

    return 'cyan';
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">
            FAMILY VIEW / SHARED CONFIDENCE
          </div>

          <h1>Your riding circle.</h1>

          <p>
            See who is moving, who is home,
            and who may need a check-in.
          </p>
        </div>

        <button
          className="tiny-btn"
          title="Refresh family view"
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* MAP */}
      <section className="map-card">
        <div
          className="map-shell"
          style={{
            position: 'relative',
            minHeight: 330,
            overflow: 'hidden',
            borderRadius: 18,
          }}
        >
          <iframe
            title="Family rider map"
            style={{
              width: '100%',
              height: 330,
              border: 0,
            }}
            src={
              focusedMember
                ? `https://www.openstreetmap.org/export/embed.html?bbox=${
                    focusedMember.location.lng - 0.025
                  }%2C${
                    focusedMember.location.lat - 0.018
                  }%2C${
                    focusedMember.location.lng + 0.025
                  }%2C${
                    focusedMember.location.lat + 0.018
                  }&layer=mapnik&marker=${
                    focusedMember.location.lat
                  }%2C${
                    focusedMember.location.lng
                  }`
                : `https://www.openstreetmap.org/export/embed.html?bbox=73.78%2C18.46%2C73.88%2C18.53&layer=mapnik&marker=18.5204%2C73.8567`
            }
          />

          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              background: 'rgba(255,255,255,0.92)',
              padding: '8px 12px',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              zIndex: 2,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#16a3d9',
                marginRight: 7,
              }}
            />
            Live rider position
          </div>

          {focusedMember && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                background: 'rgba(255,255,255,0.95)',
                padding: '8px 12px',
                borderRadius: 10,
                fontSize: 12,
                zIndex: 2,
              }}
            >
              {focusedMember.name}:{' '}
              {focusedMember.location.lat.toFixed(5)},{' '}
              {focusedMember.location.lng.toFixed(5)}
            </div>
          )}
        </div>
      </section>

      {/* FAMILY MEMBERS */}
      <section
        className="section-gap"
        style={{
          display: 'grid',
          gap: 12,
        }}
      >
        {ride.family.map((member) => (
          <article
            className="list-row"
            key={member.id}
            style={{
              position: 'relative',
              flexWrap: 'wrap',
              border:
                member.status === 'crash'
                  ? '1px solid rgba(239,68,68,0.55)'
                  : undefined,
            }}
          >
            <div
              className={`avatar ${member.color}`}
            >
              <span>{member.initials}</span>
            </div>

            <div className="row-main">
              <div className="row-name">
                {member.name}
              </div>

              <div className="row-detail">
                {member.relation}

                <span
                  style={{
                    margin: '0 5px',
                  }}
                >
                  ·
                </span>

                {member.status === 'riding'
                  ? `${member.speed} kmph`
                  : statusCopy[member.status]}
              </div>
            </div>

            <span
              className={`status-pill ${getStatusClass(
                member.status,
              )}`}
            >
              <span className="dot" />

              {member.status === 'crash'
                ? 'CRASH'
                : member.status.toUpperCase()}
            </span>

            <button
              className="tiny-btn"
              onClick={() =>
                setFocus(
                  focus === member.id
                    ? null
                    : member.id,
                )
              }
              title={`Focus ${member.name} on map`}
              data-testid={`button-focus-family-${member.id}`}
            >
              <MapPinned size={15} />
            </button>

            {/* ACCIDENT CARD */}
            {member.status === 'crash' && (
              <div
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: 16,
                  borderRadius: 14,
                  border:
                    '1px solid rgba(239,68,68,0.45)',
                  background:
                    'rgba(239,68,68,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 800,
                    color: '#dc2626',
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                    }}
                  >
                    🚨
                  </span>

                  ACCIDENT DETECTED
                </div>

                <div
                  className="muted"
                  style={{
                    fontSize: 12,
                    lineHeight: 1.5,
                    marginBottom: 10,
                  }}
                >
                  {member.name} may need
                  immediate assistance.
                  Rider GPS location is
                  available.
                </div>

                <div
                  style={{
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {member.location.lat.toFixed(5)}
                  {', '}
                  {member.location.lng.toFixed(5)}
                </div>

                <button
                  className="button button-primary"
                  onClick={() =>
                    navigateToRider(
                      member.location.lat,
                      member.location.lng,
                    )
                  }
                  data-testid={`button-navigate-family-${member.id}`}
                >
                  <Navigation size={15} />
                  Navigate to rider
                </button>
              </div>
            )}
          </article>
        ))}
      </section>

      {/* INVITE */}
      <section
        className="panel"
        style={{
          marginTop: 20,
          padding: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          <Users size={18} />
          Invite a rider
        </div>

        <div
          className="muted"
          style={{
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          Share this code in the demo to add
          someone to your family view.
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 15,
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            RIDE-7KQ2
          </div>

          <button
            className="button"
            onClick={() =>
              navigator.clipboard?.writeText(
                'RIDE-7KQ2',
              )
            }
          >
            Copy
          </button>
        </div>
      </section>

      {/* STATS */}
      <div
        className="grid-2 section-gap"
        style={{
          marginTop: 20,
        }}
      >
        <div className="panel stat-card">
          <div className="stat-label">
            <Users size={13} />
            Family online
          </div>

          <div className="stat-value">
            {
              ride.family.filter(
                (member) =>
                  member.status !== 'offline',
              ).length
            }

            <span className="stat-unit">
              / {ride.family.length}
            </span>
          </div>
        </div>

        <div className="panel stat-card">
          <div className="stat-label">
            <WifiOff size={13} />
            Last refresh
          </div>

          <div
            className="stat-value"
            style={{
              fontSize: 18,
            }}
          >
            Now
          </div>
        </div>
      </div>
    </main>
  );
}