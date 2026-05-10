/**
 * Logic for calculating violations from monitoring alerts.
 * 
 * Rules:
 * 1. 4 Gaze alerts (Left or Right) = 1 Violation
 * 2. 2 Tab switch alerts = 1 Violation
 * 3. Other alerts = 1 Violation each
 */

export interface Alert {
  alertType?: string;
  type?: string;
  [key: string]: any;
}

export function calculateViolationsCount(alerts: Alert[]): number {
  if (!alerts || alerts.length === 0) return 0;

  let gazeCount = 0;
  let tabCount = 0;
  let otherViolations = 0;

  alerts.forEach(alert => {
    const type = alert.alertType || alert.type || '';
    
    if (type.includes('gaze')) {
      gazeCount++;
    } else if (type.includes('tab')) {
      tabCount++;
    } else {
      // Faces, Audio, Objects, etc.
      otherViolations++;
    }
  });

  const gazeViolations = Math.floor(gazeCount / 4);
  const tabViolations = Math.floor(tabCount / 2);

  return gazeViolations + tabViolations + otherViolations;
}

export function getViolationSummary(alerts: Alert[]) {
    const gazeAlerts = alerts.filter(a => (a.alertType || a.type || '').includes('gaze'));
    const tabAlerts = alerts.filter(a => (a.alertType || a.type || '').includes('tab'));
    const faceAlerts = alerts.filter(a => (a.alertType || a.type || '').includes('face'));
    
    const others = alerts.length - gazeAlerts.length - tabAlerts.length - faceAlerts.length;

    const gazeViolations = Math.floor(gazeAlerts.length / 4);
    const tabViolations = Math.floor(tabAlerts.length / 2);
    const faceViolations = faceAlerts.length;
    const otherViolations = others;

    return {
        gazeViolations,
        tabViolations,
        faceViolations,
        otherViolations,
        totalViolations: gazeViolations + tabViolations + faceViolations + otherViolations,
        rawCounts: {
            gaze: gazeAlerts.length,
            tab: tabAlerts.length,
            face: faceAlerts.length,
            others
        }
    };
}
