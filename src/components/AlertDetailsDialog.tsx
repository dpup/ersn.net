import { AlertTriangle, OctagonX, Clock, MapPin, Info } from 'lucide-react';
import Dialog, { DialogHeader, DialogContent } from './Dialog';
import { type Alert, getSeverityColors, formatHumanTime } from './types';

interface AlertDetailsDialogProps {
  alert: Alert;
  onClose: () => void;
}

export default function AlertDetailsDialog({ alert, onClose }: AlertDetailsDialogProps) {
  const colors = getSeverityColors(alert.severity);
  const isCritical = alert.severity === 'CRITICAL';

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      <DialogHeader onClose={onClose}>
        <div className="flex items-center space-x-3">
          {isCritical ? (
            <OctagonX className={`h-6 w-6 ${colors.icon}`} />
          ) : (
            <AlertTriangle className={`h-6 w-6 ${colors.icon}`} />
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-stone-800 leading-tight">
              {alert.title}
            </h2>
            <div className="flex items-center space-x-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors.badge}`}
              >
                {alert.severity.toLowerCase()}
              </span>
              {alert.type && (
                <span className="text-xs text-stone-500 capitalize">{alert.type} alert</span>
              )}
            </div>
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-4">
          {/* Main Description */}
          <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
            <p className={`${colors.text} text-sm leading-relaxed`}>{alert.description}</p>
          </div>

          {/* Condensed Summary if different from description */}
          {alert.condensedSummary && alert.condensedSummary !== alert.description && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-stone-700 mb-1">Summary</h3>
                  <p className="text-stone-600 text-sm">{alert.condensedSummary}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timing Information */}
          {(alert.startTime || alert.expectedEnd) && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Timing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {alert.startTime && (
                      <div>
                        <span className="text-stone-500 text-xs uppercase tracking-wide block">
                          Started
                        </span>
                        <span className="text-stone-700">{formatHumanTime(alert.startTime)}</span>
                      </div>
                    )}
                    {alert.expectedEnd && (
                      <div>
                        <span className="text-stone-500 text-xs uppercase tracking-wide block">
                          Expected End
                        </span>
                        <span className="text-stone-700">{formatHumanTime(alert.expectedEnd)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Location Information */}
          {(alert.location || alert.locationDescription) && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-stone-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-stone-700 mb-2">Location</h3>
                  <div className="space-y-2 text-sm">
                    {alert.locationDescription && (
                      <p className="text-stone-700">{alert.locationDescription}</p>
                    )}
                    {alert.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline text-xs"
                      >
                        View on map
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Impact */}
          {alert.impact && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-stone-700 mb-1">Impact</h3>
              <p className="text-stone-600 text-sm capitalize">{alert.impact}</p>
            </div>
          )}

          {/* Additional Metadata */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-stone-700 mb-2">Additional Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {Object.entries(alert.metadata).map(([key, value]) => {
                  if (value === null || value === undefined || value === '') return null;
                  const formattedKey = key
                    .replace(/_/g, ' ')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .toLowerCase()
                    .replace(/^\w/, (c) => c.toUpperCase());
                  return (
                    <div key={key}>
                      <span className="text-stone-500 text-xs uppercase tracking-wide block">
                        {formattedKey}
                      </span>
                      <span className="text-stone-700">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
