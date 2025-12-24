import { AlertTriangle, OctagonX, Clock, MapPin } from 'lucide-react';
import Dialog, { DialogHeader, DialogContent, InfoCard, Badge } from './Dialog';
import { type Alert, getSeverityColors, formatHumanTime } from './types';

interface AlertDetailsDialogProps {
  alert: Alert;
  onClose: () => void;
}

// Format details text: **text** to bold, \n\n to paragraphs, \n to <br>
const formatDetails = (details: string): React.ReactNode => {
  const paragraphs = details.split(/\n\n/);

  return paragraphs.map((paragraph, pIndex) => {
    const lines = paragraph.split(/\n/);

    const formattedLines = lines.map((line, lIndex) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formatted = parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <span key={lIndex}>
          {formatted}
          {lIndex < lines.length - 1 && <br />}
        </span>
      );
    });

    return (
      <p key={pIndex} className={pIndex > 0 ? 'mt-2' : ''}>
        {formattedLines}
      </p>
    );
  });
};

const getSeverityBadgeVariant = (severity: Alert['severity']): 'warning' | 'critical' | 'info' => {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'WARNING':
      return 'warning';
    default:
      return 'info';
  }
};

export default function AlertDetailsDialog({ alert, onClose }: AlertDetailsDialogProps) {
  const colors = getSeverityColors(alert.severity);
  const isCritical = alert.severity === 'CRITICAL';
  const cardVariant = isCritical ? 'danger' : 'warning';

  return (
    <Dialog onClose={onClose} maxWidth="2xl">
      <DialogHeader onClose={onClose}>
        <div
          className={`${isCritical ? 'bg-red-100' : 'bg-yellow-100'} rounded-lg w-11 h-11 flex items-center justify-center flex-shrink-0`}
        >
          {isCritical ? (
            <OctagonX className={`h-6 w-6 ${colors.icon}`} />
          ) : (
            <AlertTriangle className={`h-6 w-6 ${colors.icon}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-stone-800 leading-tight mb-2">{alert.title}</h2>
          <div className="flex items-center flex-wrap gap-2">
            <Badge variant={getSeverityBadgeVariant(alert.severity)}>
              {alert.severity.toLowerCase()}
            </Badge>
            {alert.impact && <Badge variant="impact">{alert.impact} impact</Badge>}
            {alert.type && <Badge variant="muted">{alert.type} alert</Badge>}
          </div>
        </div>
      </DialogHeader>

      <DialogContent>
        <div className="space-y-3">
          {/* Main Description */}
          <InfoCard variant={cardVariant}>
            <div
              className={`text-sm leading-relaxed ${isCritical ? 'text-red-800' : 'text-yellow-800'}`}
            >
              {alert.details ? formatDetails(alert.details) : alert.description}
            </div>
          </InfoCard>

          {/* Timing Information */}
          {(alert.startTime || alert.expectedEnd) && (
            <InfoCard>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-stone-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    Timing
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {alert.startTime && (
                      <div>
                        <span className="text-stone-400 text-xs uppercase tracking-wide block mb-0.5">
                          Started
                        </span>
                        <span className="text-stone-800 font-medium">
                          {formatHumanTime(alert.startTime)}
                        </span>
                      </div>
                    )}
                    {alert.expectedEnd && (
                      <div>
                        <span className="text-stone-400 text-xs uppercase tracking-wide block mb-0.5">
                          Expected End
                        </span>
                        <span className="text-stone-800 font-medium">
                          {formatHumanTime(alert.expectedEnd)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </InfoCard>
          )}

          {/* Location Information */}
          {(alert.location || alert.locationDescription) && (
            <InfoCard>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-stone-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">
                    Location
                  </div>
                  <div className="space-y-2 text-sm">
                    {alert.locationDescription && (
                      <p className="text-stone-800 font-medium">{alert.locationDescription}</p>
                    )}
                    {alert.location && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alert.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm inline-flex items-center gap-1"
                      >
                        View on map →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </InfoCard>
          )}

          {/* Additional Metadata */}
          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
            <InfoCard>
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-3">
                Additional Details
              </div>
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
                      <span className="text-stone-400 text-xs uppercase tracking-wide block mb-0.5">
                        {formattedKey}
                      </span>
                      <span className="text-stone-800 font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </InfoCard>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
