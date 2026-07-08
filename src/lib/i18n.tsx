import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "hi";

type Dict = Record<string, string>;

const EN: Dict = {
  // Sidebar
  "nav.dashboard": "Dashboard",
  "nav.map": "Bihar Map",
  "nav.compound": "Compound Risk",
  "nav.prediction": "Prediction Engine",
  "nav.simulator": "What-If Simulator",
  "nav.alerts": "Alerts",
  "nav.reports": "Decision Reports",
  "nav.methodology": "Methodology",
  "nav.validation": "Validation",
  "nav.dataSources": "Data Sources",
  "nav.settings": "Settings",
  "nav.admin": "Admin Console",
  "sidebar.tagline": "AI Bihar Climate Digital Twin",
  "sidebar.topAlerts": "Top District Alerts",
  "sidebar.viewAll": "View All",

  // Badges
  "badge.critical": "CRITICAL",
  "badge.flood": "FLOOD",
  "badge.heatwave": "HEATWAVE",
  "badge.drought": "DROUGHT",

  // Topbar
  "topbar.searchPlaceholder": "Search district, block or coordinates…",
  "topbar.live": "LIVE",
  "topbar.twinSync": "Twin: SYNC",
  "topbar.updated": "Updated",
  "topbar.signIn": "Sign in",
  "topbar.signOut": "Sign out",

  // Dashboard
  "dash.title": "Dashboard",
  "dash.subtitleLive": "Live observations from IMD / Open-Meteo · 38 districts · 534 blocks",
  "dash.subtitleDefault": "Live compound climate risk · 38 districts · 534 blocks",
  "dash.riskZones": "Bihar — Climate Risk Zones",
  "dash.liveUpdated": "Live · Updated:",
  "dash.sources": "Sources:",
  "dash.kpi.districtsAtRisk": "Districts at Risk",
  "dash.kpi.populationAffected": "Population Potentially Affected",
  "dash.kpi.infraAtRisk": "Critical Infrastructure at Risk",
  "dash.kpi.accuracyGoal": "Accuracy Goal",
  "dash.kpi.last": "Last:",
  "dash.footerPoweredBy": "Powered by",
  "dash.footerNationalData": "India's National Climate Data",
  "dash.footerCycle": "3-hour digital-twin cycle",
  "dash.excessPrecip": "Excess precipitation — Kosi basin",
  "dash.compoundRisk": "Compound Risk (Flood + Heat)",
  "dash.southSoil": "South Bihar soil moisture",
  "dash.imdNormal": "IMD 2022–24 normal (this week)",
  "dash.scenarioActive": "Scenario active:",

  // Page titles
  "page.alerts.title": "Alerts",
  "page.map.title": "Bihar Map",
  "page.simulator.title": "What-If Simulator",
  "page.reports.title": "Decision Reports",
  "page.compound.title": "Compound Risk",
  "page.prediction.title": "Prediction Engine",

  // Alerts
  "alerts.exportCap": "Export CAP",
  "alerts.active": "Active",
  "alerts.acknowledged": "Acknowledged",
  "alerts.resolved": "Resolved",
  "alerts.severity": "Severity",
  "alerts.district": "District",
  "alerts.time": "Time",
  "alerts.actions": "Actions",

  // Map
  "map.layers": "Map Layers",
  "map.filterRisk": "Filter by Risk",
  "map.compare": "Compare Mode",
  "map.export": "Export",

  // Simulator
  "sim.saved": "Saved Scenarios",
  "sim.run": "Run",
  "sim.reset": "Reset",

  // Auth / gate
  "gate.officialsOnly": "Officials only",
  "gate.officialsOnlyDesc": "This page is restricted to state/district disaster management officials and administrators.",
  "gate.checking": "Checking permissions…",
  "gate.signIn": "Sign in",
};

const HI: Dict = {
  // Sidebar
  "nav.dashboard": "डैशबोर्ड",
  "nav.map": "बिहार मानचित्र",
  "nav.compound": "संयुक्त जोखिम",
  "nav.prediction": "पूर्वानुमान इंजन",
  "nav.simulator": "क्या-होगा-अगर सिम्युलेटर",
  "nav.alerts": "चेतावनियाँ",
  "nav.reports": "निर्णय रिपोर्ट",
  "nav.methodology": "पद्धति",
  "nav.validation": "सत्यापन",
  "nav.dataSources": "डेटा स्रोत",
  "nav.settings": "सेटिंग्स",
  "nav.admin": "एडमिन कंसोल",
  "sidebar.tagline": "AI बिहार जलवायु डिजिटल ट्विन",
  "sidebar.topAlerts": "शीर्ष जिला चेतावनियाँ",
  "sidebar.viewAll": "सभी देखें",

  "badge.critical": "गंभीर",
  "badge.flood": "बाढ़",
  "badge.heatwave": "लू",
  "badge.drought": "सूखा",

  "topbar.searchPlaceholder": "जिला, ब्लॉक या निर्देशांक खोजें…",
  "topbar.live": "लाइव",
  "topbar.twinSync": "ट्विन: सिंक",
  "topbar.updated": "अद्यतन",
  "topbar.signIn": "साइन इन",
  "topbar.signOut": "साइन आउट",

  "dash.title": "डैशबोर्ड",
  "dash.subtitleLive": "IMD / Open-Meteo से लाइव अवलोकन · 38 जिले · 534 ब्लॉक",
  "dash.subtitleDefault": "लाइव संयुक्त जलवायु जोखिम · 38 जिले · 534 ब्लॉक",
  "dash.riskZones": "बिहार — जलवायु जोखिम क्षेत्र",
  "dash.liveUpdated": "लाइव · अद्यतन:",
  "dash.sources": "स्रोत:",
  "dash.kpi.districtsAtRisk": "जोखिम में जिले",
  "dash.kpi.populationAffected": "संभावित प्रभावित जनसंख्या",
  "dash.kpi.infraAtRisk": "जोखिम में महत्वपूर्ण अवसंरचना",
  "dash.kpi.accuracyGoal": "सटीकता लक्ष्य",
  "dash.kpi.last": "अंतिम:",
  "dash.footerPoweredBy": "संचालित",
  "dash.footerNationalData": "भारत के राष्ट्रीय जलवायु डेटा से",
  "dash.footerCycle": "3-घंटे का डिजिटल-ट्विन चक्र",
  "dash.excessPrecip": "अत्यधिक वर्षा — कोसी बेसिन",
  "dash.compoundRisk": "संयुक्त जोखिम (बाढ़ + गर्मी)",
  "dash.southSoil": "दक्षिण बिहार मृदा नमी",
  "dash.imdNormal": "IMD 2022–24 सामान्य (इस सप्ताह)",
  "dash.scenarioActive": "सक्रिय परिदृश्य:",

  // Page titles
  "page.alerts.title": "चेतावनियाँ",
  "page.map.title": "बिहार मानचित्र",
  "page.simulator.title": "क्या-होगा-अगर सिम्युलेटर",
  "page.reports.title": "निर्णय रिपोर्ट",
  "page.compound.title": "संयुक्त जोखिम",
  "page.prediction.title": "पूर्वानुमान इंजन",

  // Alerts
  "alerts.exportCap": "CAP निर्यात",
  "alerts.active": "सक्रिय",
  "alerts.acknowledged": "स्वीकृत",
  "alerts.resolved": "समाधानित",
  "alerts.severity": "गंभीरता",
  "alerts.district": "जिला",
  "alerts.time": "समय",
  "alerts.actions": "कार्रवाई",

  // Map
  "map.layers": "मानचित्र परतें",
  "map.filterRisk": "जोखिम के अनुसार फ़िल्टर",
  "map.compare": "तुलना मोड",
  "map.export": "निर्यात",

  // Simulator
  "sim.saved": "सहेजे गए परिदृश्य",
  "sim.run": "चलाएँ",
  "sim.reset": "रीसेट",

  // Auth / gate
  "gate.officialsOnly": "केवल अधिकारी उपयोगकर्ताओं के लिए",
  "gate.officialsOnlyDesc": "यह पृष्ठ केवल राज्य/जिला आपदा प्रबंधन अधिकारियों और प्रशासकों के लिए है।",
  "gate.checking": "अनुमति जाँच रही है…",
  "gate.signIn": "साइन इन करें",
};

const DICTS: Record<Lang, Dict> = { en: EN, hi: HI };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };
const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

const STORAGE_KEY = "varuna.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "hi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
    if (typeof document !== "undefined") document.documentElement.lang = l === "hi" ? "hi-IN" : "en-IN";
  };

  const t = (key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
