import type { AlertItem } from "./api";

/**
 * Emit an OASIS Common Alerting Protocol (CAP) v1.2 XML document for an alert.
 * NDMA/SACHET-compatible; the shape follows the CAP-IS profile used by IMD.
 */
export function alertToCapXml(a: AlertItem): string {
  const sev = a.severity === "critical" ? "Extreme" : a.severity === "high" ? "Severe" : "Moderate";
  const urgency = a.severity === "critical" ? "Immediate" : a.severity === "high" ? "Expected" : "Future";
  const certainty = "Likely";
  const id = `varuna.${a.id}`;
  const sent = new Date(a.timestamp).toISOString();
  const escape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string));

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${escape(id)}</identifier>
  <sender>varuna-digital-twin.lovable.app</sender>
  <sent>${sent}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>en-IN</language>
    <category>Met</category>
    <event>${escape(a.message)}</event>
    <urgency>${urgency}</urgency>
    <severity>${sev}</severity>
    <certainty>${certainty}</certainty>
    <senderName>VARUNA PI-GNN Digital Twin</senderName>
    <headline>${escape(a.message)}</headline>
    <description>${escape(a.message)} — issued for ${escape(a.district)}${a.block ? " · " + escape(a.block) : ""}.</description>
    <instruction>Cross-verify with IMD, CWC, and district SEOC before operational action. VARUNA is a decision-support tool, not an official warning authority.</instruction>
    <area>
      <areaDesc>${escape(a.district)}${a.block ? ", " + escape(a.block) : ""}, Bihar, India</areaDesc>
    </area>
  </info>
</alert>
`;
}

export function downloadCapXml(a: AlertItem) {
  const xml = alertToCapXml(a);
  const blob = new Blob([xml], { type: "application/xml" });
  const el = document.createElement("a");
  el.href = URL.createObjectURL(blob);
  el.download = `varuna-cap-${a.id}.xml`;
  el.click();
}

export function downloadCapBundle(alerts: AlertItem[]) {
  const items = alerts.map(alertToCapXml).join("\n<!-- ---- -->\n");
  const blob = new Blob([items], { type: "application/xml" });
  const el = document.createElement("a");
  el.href = URL.createObjectURL(blob);
  el.download = `varuna-cap-bundle-${Date.now()}.xml`;
  el.click();
}
