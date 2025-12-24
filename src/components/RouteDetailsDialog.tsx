import {
  Construction,
  Ban,
  Truck,
  Snowflake,
  CheckCircle,
  AlertTriangle,
  Link,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Dialog, {
  DialogHeader,
  DialogContent,
  StatBox,
  InfoCard,
  Badge,
  CollapsibleSection,
} from './Dialog';
import {
  type Alert,
  type RoadSegment,
  type ChainControlInfo,
  formatHumanTime,
  formatEnumValue,
} from './types';

interface RouteDetailsDialogProps {
  selectedRoute: RoadSegment;
  onClose: () => void;
}

// Helper functions
const formatMetadataValue = (value: string): string => {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (isoDateRegex.test(value)) {
    return formatHumanTime(value) || value;
  }
  return formatEnumValue(value);
};

const getChainControlDisplay = (info: ChainControlInfo) => {
  const levelMap: Record<string, { label: string; color: string; description: string }> = {
    CHAIN_CONTROL_LEVEL_R1: {
      label: 'R1',
      color: 'bg-yellow-600 text-white',
      description: 'Chains required except for vehicles with snow tires',
    },
    CHAIN_CONTROL_LEVEL_R2: {
      label: 'R2',
      color: 'bg-orange-600 text-white',
      description: 'Chains required except 4WD/AWD with snow tires on all wheels',
    },
    CHAIN_CONTROL_LEVEL_R3: {
      label: 'R3',
      color: 'bg-red-600 text-white',
      description: 'Chains required on all vehicles, no exceptions',
    },
  };
  return levelMap[info.level] || null;
};

const getIncidentChip = (alert: Alert) => {
  const type = alert.incidentType?.toLowerCase() || '';

  if (type.includes('closure') || type.includes('closed')) {
    return { label: 'Closure', color: 'bg-red-100 text-red-800', icon: Ban };
  } else if (type.includes('construction') || type.includes('work')) {
    return { label: 'Construction', color: 'bg-orange-100 text-orange-800', icon: Construction };
  } else if (type.includes('hazard') || type.includes('debris')) {
    return { label: 'Hazard', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
  } else if (type.includes('weather') || type.includes('snow') || type.includes('ice')) {
    return { label: 'Weather', color: 'bg-blue-100 text-blue-800', icon: Snowflake };
  } else if (type.includes('vehicle') || type.includes('accident') || type.includes('collision')) {
    return { label: 'Incident', color: 'bg-purple-100 text-purple-800', icon: Truck };
  }

  if (alert.severity === 'CRITICAL') {
    return { label: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
  } else if (alert.severity === 'WARNING') {
    return { label: 'Warning', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle };
  } else {
    return { label: 'Info', color: 'bg-blue-100 text-blue-800', icon: AlertTriangle };
  }
};

const getImpactChip = (impact: string | undefined) => {
  if (!impact) return null;

  const impactLower = impact.toLowerCase();
  if (impactLower.includes('severe') || impactLower.includes('major')) {
    return { label: 'Severe impact', color: 'bg-red-100 text-red-800' };
  } else if (impactLower.includes('moderate')) {
    return { label: 'Moderate impact', color: 'bg-orange-100 text-orange-800' };
  } else if (impactLower.includes('light') || impactLower.includes('minor')) {
    return { label: 'Light impact', color: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: formatEnumValue(impact), color: 'bg-gray-100 text-gray-800' };
};

// Helper function to calculate average speed
const calculateAverageSpeed = (
  distanceKm: number | undefined,
  durationMinutes: number | undefined,
): number | null => {
  if (!distanceKm || !durationMinutes || durationMinutes === 0) return null;

  const speedKmh = (distanceKm / durationMinutes) * 60;
  const speedMph = speedKmh * 0.621371;

  return Math.round(speedMph);
};

const formatDistanceToRoute = (distanceMeters: number | undefined): string => {
  if (!distanceMeters) return '';

  const distanceMiles = distanceMeters * 0.000621371;

  if (distanceMiles < 0.1) {
    return 'Very close';
  } else if (distanceMiles < 1) {
    return `${(distanceMiles * 5280).toFixed(0)} ft away`;
  } else {
    return `${distanceMiles.toFixed(1)} mi away`;
  }
};

const getStatusBadgeVariant = (
  status: string | undefined,
): 'success' | 'warning' | 'critical' | 'muted' => {
  if (!status) return 'muted';
  const s = status.toLowerCase();
  if (s === 'closed') return 'critical';
  if (s === 'restricted' || s === 'restrictions') return 'warning';
  return 'success';
};

export default function RouteDetailsDialog({ selectedRoute, onClose }: RouteDetailsDialogProps) {
  const onRouteAlerts = selectedRoute.alerts.filter((alert) => alert.classification === 'ON_ROUTE');
  const nearbyAlerts = selectedRoute.alerts.filter((alert) => alert.classification === 'NEARBY');

  const distanceMi = selectedRoute.distanceKm
    ? Math.round(selectedRoute.distanceKm * 0.621371)
    : null;
  const avgSpeed = calculateAverageSpeed(selectedRoute.distanceKm, selectedRoute.durationMinutes);
  const durationMin = selectedRoute.durationMinutes
    ? `~${Math.round(selectedRoute.durationMinutes)}`
    : null;

  const statsFooter = (
    <div className="grid grid-cols-3 gap-3">
      <StatBox label="miles" value={distanceMi ? String(distanceMi) : '—'} variant="dark" />
      <StatBox label="avg mph" value={avgSpeed ? String(avgSpeed) : '—'} variant="dark" />
      <StatBox label="min" value={durationMin || '—'} variant="dark" />
    </div>
  );

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      {/* Dark header with route info */}
      <DialogHeader onClose={onClose} variant="dark" footer={statsFooter}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-xl font-bold text-white truncate">{selectedRoute.from}</span>
            <ArrowRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
            <span className="text-xl font-bold text-white truncate">{selectedRoute.to}</span>
          </div>

          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            {selectedRoute.rawStatus && (
              <Badge variant={getStatusBadgeVariant(selectedRoute.rawStatus)}>
                {formatEnumValue(selectedRoute.rawStatus)}
              </Badge>
            )}
            {typeof selectedRoute.delayMinutes === 'number' && selectedRoute.delayMinutes > 0 && (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100/20 text-amber-200">
                +{selectedRoute.delayMinutes} min delay
              </span>
            )}
            {selectedRoute.congestionLevel && (
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 text-stone-300">
                {formatEnumValue(selectedRoute.congestionLevel)} traffic
              </span>
            )}
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {/* Chain Control Section */}
          {selectedRoute.chainControlInfo &&
            selectedRoute.chainControlInfo.level !== 'CHAIN_CONTROL_LEVEL_NONE' &&
            selectedRoute.chainControlInfo.level !== 'CHAIN_CONTROL_LEVEL_UNSPECIFIED' && (
              <InfoCard variant="warning">
                <div className="flex gap-3">
                  <div className="bg-yellow-600 rounded-lg w-9 h-9 flex items-center justify-center flex-shrink-0">
                    <Link className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm font-bold text-yellow-900">Chain Control</span>
                      {(() => {
                        const display = getChainControlDisplay(selectedRoute.chainControlInfo!);
                        return display ? (
                          <span
                            className={`px-1.5 py-0.5 text-[11px] font-bold rounded ${display.color}`}
                          >
                            {display.label}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    <p className="text-sm text-yellow-800 leading-relaxed">
                      {selectedRoute.chainControlInfo.description ||
                        getChainControlDisplay(selectedRoute.chainControlInfo)?.description}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-yellow-700">
                      {selectedRoute.chainControlInfo.locationName &&
                        (selectedRoute.chainControlInfo.latitude &&
                        selectedRoute.chainControlInfo.longitude ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedRoute.chainControlInfo.latitude},${selectedRoute.chainControlInfo.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-yellow-900 underline"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            {selectedRoute.chainControlInfo.locationName}
                            {selectedRoute.chainControlInfo.direction &&
                              ` (${selectedRoute.chainControlInfo.direction})`}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {selectedRoute.chainControlInfo.locationName}
                            {selectedRoute.chainControlInfo.direction &&
                              ` (${selectedRoute.chainControlInfo.direction})`}
                          </span>
                        ))}
                      {selectedRoute.chainControlInfo.effectiveTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatHumanTime(selectedRoute.chainControlInfo.effectiveTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </InfoCard>
            )}

          {/* On Route Alerts */}
          {onRouteAlerts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Affects your route
              </h3>
              <div className="space-y-3">
                {onRouteAlerts.map((alert, index) => {
                  const incidentChip = getIncidentChip(alert);
                  const impactChip = getImpactChip(alert.impact);
                  const IconComponent = incidentChip.icon;
                  const cardVariant = alert.severity === 'CRITICAL' ? 'danger' : 'warning';

                  return (
                    <InfoCard key={alert.id || index} variant={cardVariant}>
                      <div className="flex gap-3">
                        <div
                          className={`${alert.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-yellow-600'} rounded-lg w-9 h-9 flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-bold ${alert.severity === 'CRITICAL' ? 'text-red-900' : 'text-yellow-900'}`}
                            >
                              {alert.locationDescription
                                ? `${alert.locationDescription}${alert.incidentType ? ` (${formatEnumValue(alert.incidentType)})` : ''}`
                                : alert.title}
                            </span>
                            {alert.startTime && (
                              <span
                                className={`text-xs ${alert.severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-700'}`}
                              >
                                {formatHumanTime(alert.startTime)}
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-sm leading-relaxed mb-2 ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'}`}
                          >
                            {alert.description}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {alert.distanceToRouteMeters && alert.classification !== 'ON_ROUTE' && (
                              <span className="bg-white/60 px-2 py-1 rounded text-xs text-stone-700">
                                <strong>
                                  {formatDistanceToRoute(alert.distanceToRouteMeters)}
                                </strong>
                              </span>
                            )}
                            {impactChip && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${impactChip.color}`}
                              >
                                {impactChip.label}
                              </span>
                            )}
                            {alert.metadata &&
                              Object.entries(alert.metadata).map(([key, value]) => {
                                const formattedValue = formatMetadataValue(String(value));
                                if (
                                  !formattedValue ||
                                  formattedValue.toLowerCase() === 'none' ||
                                  formattedValue.toLowerCase() === 'n/a'
                                ) {
                                  return null;
                                }
                                return (
                                  <span
                                    key={key}
                                    className="bg-white/60 px-2 py-1 rounded text-xs text-stone-700"
                                  >
                                    {formattedValue}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </InfoCard>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nearby Alerts */}
          {nearbyAlerts.length > 0 && (
            <CollapsibleSection
              title="Nearby Incidents"
              count={nearbyAlerts.length}
              countVariant="danger"
            >
              {nearbyAlerts
                .sort((a, b) => {
                  const severityOrder = {
                    CRITICAL: 0,
                    WARNING: 1,
                    INFO: 2,
                    ALERT_SEVERITY_UNSPECIFIED: 3,
                  };
                  return severityOrder[a.severity] - severityOrder[b.severity];
                })
                .map((alert, index) => {
                  const incidentChip = getIncidentChip(alert);
                  const IconComponent = incidentChip.icon;
                  const cardVariant = alert.severity === 'CRITICAL' ? 'danger' : 'default';

                  return (
                    <InfoCard key={alert.id || index} variant={cardVariant}>
                      <div className="flex gap-3">
                        <div
                          className={`${alert.severity === 'CRITICAL' ? 'bg-red-600' : 'bg-stone-500'} rounded-lg w-9 h-9 flex items-center justify-center flex-shrink-0`}
                        >
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-bold ${alert.severity === 'CRITICAL' ? 'text-red-900' : 'text-stone-800'}`}
                            >
                              {alert.locationDescription
                                ? `${alert.locationDescription}${alert.incidentType ? ` (${formatEnumValue(alert.incidentType)})` : ''}`
                                : alert.title}
                            </span>
                            {alert.startTime && (
                              <span
                                className={`text-xs ${alert.severity === 'CRITICAL' ? 'text-red-600' : 'text-stone-500'}`}
                              >
                                {formatHumanTime(alert.startTime)}
                              </span>
                            )}
                          </div>

                          <p
                            className={`text-sm leading-relaxed mb-2 ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-stone-600'}`}
                          >
                            {alert.description}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {alert.distanceToRouteMeters && (
                              <span
                                className={`${alert.severity === 'CRITICAL' ? 'bg-white/60' : 'bg-stone-100'} px-2 py-1 rounded text-xs ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-stone-700'}`}
                              >
                                <strong>
                                  {formatDistanceToRoute(alert.distanceToRouteMeters)}
                                </strong>
                              </span>
                            )}
                            {alert.metadata &&
                              Object.entries(alert.metadata).map(([key, value]) => {
                                const formattedValue = formatMetadataValue(String(value));
                                if (
                                  !formattedValue ||
                                  formattedValue.toLowerCase() === 'none' ||
                                  formattedValue.toLowerCase() === 'n/a'
                                ) {
                                  return null;
                                }
                                return (
                                  <span
                                    key={key}
                                    className={`${alert.severity === 'CRITICAL' ? 'bg-white/60' : 'bg-stone-100'} px-2 py-1 rounded text-xs ${alert.severity === 'CRITICAL' ? 'text-red-800' : 'text-stone-700'}`}
                                  >
                                    {formattedValue}
                                  </span>
                                );
                              })}
                          </div>

                          {alert.location && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 text-xs mt-2 ${alert.severity === 'CRITICAL' ? 'text-red-700 hover:text-red-600' : 'text-blue-600 hover:text-blue-700'}`}
                            >
                              View on map →
                            </a>
                          )}
                        </div>
                      </div>
                    </InfoCard>
                  );
                })}
            </CollapsibleSection>
          )}

          {/* No alerts state */}
          {onRouteAlerts.length === 0 && nearbyAlerts.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h3 className="font-medium text-stone-900 mb-1">All clear on your route</h3>
              <p className="text-stone-600 text-sm">No incidents or alerts affecting this route.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
