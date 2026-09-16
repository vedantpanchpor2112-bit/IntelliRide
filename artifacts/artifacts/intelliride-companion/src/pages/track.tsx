import { useEffect, useState } from 'react';
import {
  Activity,
  BatteryMedium,
  Bluetooth,
  Clock3,
  Crosshair,
  MapPinned,
  RotateCcw,
  Send,
  Signal,
  Siren,
  WifiOff,
} from 'lucide-react';

import { MapPanel } from '@/components/map-panel';
import { PageHeader } from '@/components/app-shell';

import {
  useRideSimulation,
  formatTime,
  formatDate,
  relativeTime,
} from '@/lib/simulation';

function playSosBeep() {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') {
    return;
  }

  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(880, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(start);
  oscillator.stop(start + 0.3);

  oscillator.addEventListener(
    'ended',
    () => {
      void context.close();
    },
    { once: true },
  );
}

export function TrackPage() {
  const ride = useRideSimulation();

  /*
   * Live website clock.
   *
   * This is intentionally separate from GPS telemetry time.
   * It updates every second and is displayed using the
   * Asia/Kolkata timezone through formatDate/formatTime.
   */
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const currentTimestamp = currentTime.toISOString();

  const displayLocation = ride.staleMode
    ? ride.lastKnownLocation
    : ride.location;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={`Ride monitor / ${formatDate(currentTimestamp)} / ${formatTime(currentTimestamp)}`}
        title="Stay in the ride."
        lede="A quiet read on the things that matter when the road gets loud."
        action={
          <button
            className="icon-btn"
            onClick={ride.resetDemo}
            aria-label="Reset simulation"
            data-testid="button-reset-demo"
          >
            <RotateCcw size={15} />
          </button>
        }
      />

      <div className="track-grid">
        <div>
          <MapPanel
            lat={displayLocation.lat}
            lng={displayLocation.lng}
            stale={ride.staleMode}
          />

          <div className="grid-2 section-gap">
            <div className="panel stat-card speed-card">
              <div className="stat-label">
                <Activity size={13} />
                Current speed
              </div>

              <div
                className="stat-value"
                data-testid="text-live-speed"
              >
                {ride.status.ridingState === 'parked'
  ? 0
  : Math.round(ride.location.speed)}
                <span className="stat-unit">kmph</span>
              </div>

              <div
                className="muted"
                style={{
                  fontSize: 10,
                  marginTop: 5,
                }}
              >
                Limit {ride.overspeedThreshold} kmph
              </div>
            </div>

            <div className="panel stat-card">
              <div className="stat-label">
                <Crosshair size={13} />
                Heading
              </div>

              <div className="stat-value">
                {Math.round(ride.location.heading)}°
                <span className="stat-unit">NE</span>
              </div>

              <div
                className="muted"
                style={{
                  fontSize: 10,
                  marginTop: 5,
                }}
              >
                GPS accuracy ±8 m
              </div>
            </div>
          </div>

          <div className="panel panel-pad section-gap">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 14,
              }}
            >
              <div>
                <div className="panel-title">
                  Helmet telemetry
                </div>

                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Rider 01 / {ride.status.ridingState}
                </div>
              </div>

              <span
                className={`status-pill ${
                  ride.staleMode ||
                  ride.status.ridingState !== 'riding'
                    ? 'amber'
                    : 'green'
                }`}
              >
                <span className="dot" />

                {ride.staleMode
                  ? 'Stale'
                  : ride.status.ridingState === 'riding'
                    ? 'Streaming'
                    : 'Parked'}
              </span>
            </div>

            <div className="ride-controls">
              <button
                className="button button-primary"
                onClick={ride.startRide}
                disabled={ride.status.ridingState === 'riding'}
                data-testid="button-start-ride"
              >
                Start ride
              </button>

              <button
                className="button button-secondary"
                onClick={ride.endRide}
                disabled={ride.status.ridingState !== 'riding'}
                data-testid="button-end-ride"
              >
                End ride
              </button>
            </div>

            <div className="signal-list">
              <div className="signal-row">
                <div className="signal-meta">
                  <span className="signal-icon">
                    <Bluetooth size={15} />
                  </span>

                  <span>Helmet link</span>
                </div>

                <span
                  className={`status-pill ${
                    ride.status.bleConnected ? 'green' : 'red'
                  }`}
                >
                  {ride.status.bleConnected
                    ? 'Connected'
                    : 'Lost'}
                </span>
              </div>

              <div className="signal-row">
                <div className="signal-meta">
                  <span className="signal-icon">
                    <Signal size={15} />
                  </span>

                  <span>Cell signal</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div className="signal-track">
                    <div
                      className="signal-fill"
                      style={{
                        width: `${ride.status.signalStrength}%`,
                      }}
                    />
                  </div>

                  <span
                    className="mono"
                    style={{
                      fontSize: 11,
                    }}
                  >
                    {ride.status.signalStrength}%
                  </span>
                </div>
              </div>

              <div className="signal-row">
                <div className="signal-meta">
                  <span className="signal-icon">
                    <BatteryMedium size={15} />
                  </span>

                  <span>Helmet battery</span>
                </div>

                <span
                  className="mono muted"
                  style={{
                    fontSize: 11,
                  }}
                >
                  {ride.status.battery}%
                </span>
              </div>

              <div className="signal-row">
                <div className="signal-meta">
                  <span className="signal-icon">
                    <Clock3 size={15} />
                  </span>

                  <span>Last GPS fix</span>
                </div>

                <span
                  className="muted mono"
                  style={{
                    fontSize: 10,
                  }}
                >
                  {ride.staleMode
                    ? relativeTime(ride.location.timestamp)
                    : formatTime(ride.location.timestamp)}
                </span>
              </div>
            </div>

            {/* Current date and time */}
            <div
              className="hairline"
              style={{
                margin: '15px 0',
              }}
            />

            <div
              className="signal-row"
              style={{
                alignItems: 'flex-start',
              }}
            >
              <div className="signal-meta">
                <span className="signal-icon">
                  <Clock3 size={15} />
                </span>

                <div>
                  <div>Current date</div>

                  <div
                    className="muted"
                    style={{
                      fontSize: 10,
                      marginTop: 3,
                    }}
                  >
                    India Standard Time
                  </div>
                </div>
              </div>

              <span
                className="mono"
                style={{
                  fontSize: 11,
                }}
              >
                {formatDate(currentTimestamp)}
              </span>
            </div>

            <div className="signal-row">
              <div className="signal-meta">
                <span className="signal-icon">
                  <Clock3 size={15} />
                </span>

                <span>Current time</span>
              </div>

              <span
                className="mono"
                style={{
                  fontSize: 11,
                }}
              >
                {formatTime(currentTimestamp)}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            className={`panel panel-pad ${
              ride.crashCountdown !== null
                ? 'sos-panel'
                : ''
            }`}
          >
            {ride.crashCountdown !== null ? (
              <div className="countdown">
                <div>
                  <div className="panel-kicker red">
                    Impact detected
                  </div>

                  <div
                    className="panel-title"
                    style={{
                      marginTop: 7,
                    }}
                  >
                    Sending safety check
                  </div>

                  <div
                    className="muted"
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    Cancel if you are okay.
                  </div>
                </div>

                <div className="countdown-number">
                  {ride.crashCountdown}s
                </div>
              </div>
            ) : (
              <div>
                <div className="panel-kicker">
                  Safety controls
                </div>

                <div
                  className="panel-title"
                  style={{
                    marginTop: 7,
                  }}
                >
                  Need a hand?
                </div>

                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                    marginTop: 4,
                  }}
                >
                  Your primary contact:{' '}
                  {ride.contacts.find(
                    (c) => c.isPrimary,
                  )?.name ?? 'Not set'}
                </div>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gap: 8,
                marginTop: 15,
              }}
            >
              {ride.crashCountdown !== null ? (
                <button
                  className="button button-secondary button-wide"
                  onClick={ride.cancelCrash}
                  data-testid="button-cancel-crash"
                >
                  I’m okay — cancel
                </button>
              ) : (
                <>
                  <button
                    className="button button-danger button-wide"
                    onClick={() => {
                      playSosBeep();
                      ride.sendSos();
                    }}
                    data-testid="button-manual-sos"
                  >
                    <Send size={15} />
                    Send manual SOS
                  </button>

                  <button
                    className="button button-secondary button-wide"
                    onClick={ride.triggerCrash}
                    data-testid="button-simulate-crash"
                  >
                    <Siren size={15} />
                    Simulate impact check
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="panel panel-pad section-gap">
            <div className="panel-kicker">
              Demo controls
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                marginTop: 13,
              }}
            >
              <div>
                <div className="panel-title">
                  GPS staleness
                </div>

                <div
                  className="muted"
                  style={{
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  {ride.staleMode
                    ? 'Showing last known fix'
                    : 'Telemetry is current'}
                </div>
              </div>

              <button
                className={`button ${
                  ride.staleMode
                    ? 'button-primary'
                    : 'button-secondary'
                }`}
                onClick={() =>
                  ride.setStaleMode(!ride.staleMode)
                }
                data-testid="button-toggle-stale"
              >
                {ride.staleMode
                  ? 'Restore live'
                  : 'Simulate stale'}
              </button>
            </div>

            <div
              className="hairline"
              style={{
                margin: '15px 0',
              }}
            />

            <div
              className="muted"
              style={{
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              <MapPinned
                size={13}
                style={{
                  verticalAlign: '-2px',
                  marginRight: 5,
                }}
              />

              Location updates every few seconds while
              riding.
            </div>
          </div>

          {ride.staleMode ? (
            <div
              className="panel panel-pad section-gap"
              style={{
                borderColor: 'rgba(255,138,61,.23)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                }}
              >
                <WifiOff
                  size={17}
                  className="amber"
                />

                <div>
                  <div className="panel-title amber">
                    Signal interrupted
                  </div>

                  <div
                    className="muted"
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                    }}
                  >
                    We’ll keep the last known position
                    until the helmet reconnects.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}