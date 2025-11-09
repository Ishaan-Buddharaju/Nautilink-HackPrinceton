'use client';

import Link from 'next/link';
import React, { use, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

interface WeeklyData {
  week: string;
  vessels_detected: number;
}

interface CallOutcome {
  name: string;
  value: number;
}

interface AgentStats {
  success_rate: number;
  avg_call_duration_min: number;
  escalation_rate: number;
  total_calls_q3: number;
  call_outcomes: CallOutcome[];
}

interface ReportData {
  weeklyIUU: WeeklyData[];
  agentPerformance: AgentStats;
}

const COLORS = ['#e0f2fd', '#c6daec', '#4662ab'];

interface TemplateReportData {
  layout?: 'template-vessel';
  lastUpdated: string;
  vesselProfile: {
    name: string;
    imo: string;
    nationality: string;
    homePort: string;
    owner: string;
    vesselModel: string;
    builtYear: number | string;
    yearsAtSea: number;
    tonnage: string;
    crewCount: number;
    region?: string;
  };
  coordinates?: { lat: number; lng: number };
  summaryParagraphs: string[];
  sustainabilitySnapshot: {
    score: number;
    grade: string;
    badgeColor: string;
    categories: Array<{ label: string; value: number; color: string }>;
  };
  transactionHistory: Array<{
    date: string;
    type: string;
    location: string;
    notes: string;
    status: string;
  }>;
  reservedNote?: string;
  chatIntro?: string;
}

const TemplateReportView: React.FC<{ data: TemplateReportData; reportId: string }> = ({
  data,
  reportId
}) => {
  const contentId = `template-report-content-${reportId}`;
  const initialMessage =
    data.chatIntro || 'ask me about the report or about how to break down each insight';

  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([
      {
        id: 'assistant-welcome',
        role: 'assistant',
      content: initialMessage
    }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const node = document.getElementById(contentId);
    if (!node) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = `
      <style>
        @page { size: A4; margin: 16mm; }
        html, body { background: #ffffff; color: #171717; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
        h1,h2,h3 { color: #171717; margin: 0 0 8px 0; }
        p { margin: 8px 0; line-height: 1.5; }
        section { margin-bottom: 20px; }
        .border { border-color: #d2deea; }
        svg { max-width: 100% !important; height: auto !important; }
      </style>
    `;
    printWindow.document.write(`<html><head><title>${data.vesselProfile.name} Report</title>${styles}</head><body>`);
    printWindow.document.write(node.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

    const sendChatMessage = async () => {
      const trimmed = chatInput.trim();
      if (!trimmed || chatLoading) return;

      const userMessage = { id: `user-${Date.now()}`, role: 'user' as const, content: trimmed };
      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput('');
      setChatLoading(true);

      try {
        const response = await fetch('/api/reports/template-support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
          history: chatMessages
        })
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || 'Gemini support agent failed to respond.');
        }

      const payload = await response.json();
        setChatMessages((prev) => [
          ...prev,
        { id: `assistant-${Date.now()}`, role: 'assistant' as const, content: payload.reply || 'No response.' }
        ]);
      } catch (error: any) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant' as const,
          content: error?.message || 'I ran into an issue fetching a response.'
        }
        ]);
      } finally {
        setChatLoading(false);
      }
    };

  const profileEntries = [
    { label: 'IMO', value: data.vesselProfile.imo },
    { label: 'Nationality', value: data.vesselProfile.nationality },
    { label: 'Home Port', value: data.vesselProfile.homePort },
    { label: 'Owner', value: data.vesselProfile.owner },
    { label: 'Model', value: data.vesselProfile.vesselModel },
    { label: 'Built', value: data.vesselProfile.builtYear },
    { label: 'Years Active', value: data.vesselProfile.yearsAtSea },
    { label: 'Tonnage', value: data.vesselProfile.tonnage },
    { label: 'Crew', value: `${data.vesselProfile.crewCount} personnel` }
  ];

  if (data.vesselProfile.region) {
    profileEntries.push({ label: 'Region', value: data.vesselProfile.region });
  }
  if (data.coordinates) {
    profileEntries.push({
      label: 'Coordinates',
      value: `${data.coordinates.lat.toFixed(2)}°, ${data.coordinates.lng.toFixed(2)}°`
    });
  }

    return (
      <div className="flex-1 p-8 text-[#e0f2fd] min-h-screen">
      <div className="flex gap-8 items-start">
        <div className="flex-1 max-w-5xl space-y-8">
          <Link href="/database" className="flex items-center space-x-2 text-[#c0d9ef] hover:text-[#e0f2fd]">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
              </svg>
              <span>Database</span>
            </Link>
          <div
            id={contentId}
            className="bg-[#121c2a] border border-[rgba(198,218,236,0.18)] rounded-3xl shadow-[0_30px_80px_rgba(10,14,28,0.35)] overflow-hidden"
          >
            <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between px-8 pt-8">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-[#88a8c9]">Report</p>
                <h1 className="text-3xl md:text-[2.4rem] font-bold text-[#e0f2fd] mt-2 leading-tight">
                  {data.vesselProfile.name}
                </h1>
                <p className="text-sm text-[#9fb7d8] mt-3">Last updated: {data.lastUpdated}</p>
              </div>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 bg-[#4662ab] text-[#e0f2fd] px-5 py-2.5 rounded-full font-semibold tracking-wide uppercase text-xs hover:bg-[#c6daec] hover:text-[#171717] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" x2="12" y1="2" y2="15" />
                </svg>
                Export
              </button>
            </header>

            <section className="px-8 pt-8 pb-6">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                <div className="space-y-6">
                  <div className="h-52 rounded-2xl bg-gradient-to-br from-[#1b2a3f] via-[#1f324a] to-[#273f5f] border border-[rgba(198,218,236,0.18)] flex items-center justify-center text-[#c6daec] text-sm tracking-[0.35em] uppercase">
                    Vessel Imagery Placeholder
                  </div>
                  <div className="bg-[#101a29] border border-[rgba(198,218,236,0.12)] rounded-2xl p-6 space-y-4">
                    <h2 className="text-sm uppercase tracking-[0.3em] text-[#88a8c9]">Profile Details</h2>
                    <dl className="space-y-3 text-sm text-[#d2deea]">
                      {profileEntries.map((entry) => (
                        <div key={entry.label} className="flex justify-between gap-4">
                          <dt className="text-[#9fb7d8] uppercase tracking-[0.25em] text-xs">{entry.label}</dt>
                          <dd>{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>

                <div className="bg-[#101a29] border border-[rgba(198,218,236,0.12)] rounded-2xl p-6 flex flex-col gap-4">
                  <h2 className="text-sm uppercase tracking-[0.3em] text-[#88a8c9]">Summary</h2>
                  <div className="space-y-4 text-[#d2deea] leading-relaxed">
                    {data.summaryParagraphs.map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="px-8 pb-6">
              <div className="bg-[#101a29] border border-[rgba(198,218,236,0.12)] rounded-2xl p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-[#88a8c9]">Sustainability Score</p>
                    <h3 className="text-2xl font-semibold text-[#e0f2fd] mt-2">
                      {data.sustainabilitySnapshot.score}{' '}
                      <span className="text-base text-[#9fb7d8]">/ 100</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm uppercase tracking-[0.3em] text-[#9fb7d8]">Grade</span>
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor: `${data.sustainabilitySnapshot.badgeColor}33`,
                        color: data.sustainabilitySnapshot.badgeColor
                      }}
                    >
                      {data.sustainabilitySnapshot.grade}
                    </span>
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {data.sustainabilitySnapshot.categories.map((category) => (
                    <div key={category.label}>
                      <div className="flex justify-between text-sm text-[#d2deea] mb-2">
                        <span>{category.label}</span>
                        <span>{category.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1f2a3d] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${category.value}%`, backgroundColor: category.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="px-8 pb-6">
              <div className="bg-[#101a29] border border-[rgba(198,218,236,0.12)] rounded-2xl p-6">
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#88a8c9] mb-5">Transaction Log · 90 Days</h2>
                <div className="space-y-4">
                  {data.transactionHistory.map((entry) => (
                    <div
                      key={`${entry.date}-${entry.type}`}
                      className="rounded-xl border border-[rgba(198,218,236,0.12)] bg-[#121f31] px-5 py-4 grid gap-2 md:grid-cols-[140px_auto_110px]"
                    >
                      <div className="text-sm text-[#9fb7d8]">
                        <p className="font-semibold text-[#e0f2fd]">{entry.date}</p>
                        <p className="uppercase tracking-[0.25em] text-xs mt-1">{entry.type}</p>
                      </div>
                      <p className="text-sm text-[#d2deea]">{entry.notes}</p>
                      <div className="flex items-center md:justify-end">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-[0.25em]"
                          style={{
                            backgroundColor:
                              entry.status === 'Cleared'
                                ? 'rgba(52, 211, 153, 0.12)'
                                : entry.status === 'Passed'
                                ? 'rgba(96, 165, 250, 0.12)'
                                : 'rgba(249, 115, 22, 0.12)',
                            color:
                              entry.status === 'Cleared'
                                ? '#34d399'
                                : entry.status === 'Passed'
                                ? '#60a5fa'
                                : '#f97316'
                          }}
                        >
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="px-8 pb-10">
              <div className="border border-dashed border-[rgba(198,218,236,0.24)] rounded-2xl bg-[#0e1726] p-8 text-center">
                <p className="text-sm uppercase tracking-[0.35em] text-[#88a8c9]">Reserved Analysis Slot</p>
                <p className="text-[#9fb7d8] mt-3 max-w-md mx-auto">
                  {data.reservedNote ||
                    'Future spotlight for crew interviews, ESG partner attestations, or satellite anomaly overlays. Add your findings here when they become available.'}
                </p>
                <div className="flex justify-center mt-4 gap-2 text-[#4662ab]">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>
              </div>
            </section>
          </div>
          </div>

          <aside className="w-96 ml-auto flex flex-col bg-[#171717] border border-[rgba(198,218,236,0.18)] rounded-lg shadow-lg h-[calc(100vh-4rem)] sticky top-8">
            <header className="px-4 py-3 border-b border-[rgba(198,218,236,0.18)]">
            <h2 className="text-lg font-semibold text-[#e0f2fd]">Research Assistant</h2>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#4662ab] text-[#e0f2fd] ml-8 self-end'
                      : 'bg-[#151d2e] text-[#d2deea] mr-8 self-start border border-[rgba(198,218,236,0.16)]'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            <form
              className="p-4 border-t border-[rgba(198,218,236,0.18)] flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-[#101726] border border-[rgba(198,218,236,0.22)] rounded-md px-3 py-2 text-sm text-[#e0f2fd] focus:outline-none focus:ring-2 focus:ring-[#4662ab]"
                placeholder="Ask the agent anything…"
              />
              <button
                type="submit"
                disabled={chatLoading}
                className="px-3 py-2 bg-[#4662ab] text-[#e0f2fd] rounded-md text-sm font-semibold disabled:opacity-60"
              >
                {chatLoading ? '...' : 'Send'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    );
};

const ReportDisplayPage = ({ params }: { params: Promise<{ reportId:string }> }) => {
  const resolvedParams = use(params);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatedJson, setGeneratedJson] = useState<any | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');

  if (resolvedParams.reportId === 'template-summary') {
    const templateData: TemplateReportData = {
      lastUpdated: 'September 20, 2025',
      vesselProfile: {
        name: 'FV Ocean Star',
        imo: '9234567',
        nationality: 'Norway',
        homePort: 'Bergen, Norway',
        owner: 'Nordic Harvest Fleet',
        vesselModel: 'Purse Seiner 85m',
        builtYear: 2012,
        yearsAtSea: 13,
        tonnage: '4,850 GT',
        crewCount: 46,
        region: 'North Atlantic Central'
      },
      coordinates: { lat: 20, lng: -30 },
      summaryParagraphs: [
        'FV Ocean Star remains one of the fleet’s most reliable purse seiners, executing coordinated patrols across the North Atlantic Central corridor with consistent AIS visibility.',
        'Recent inspections confirm compliance with Norway’s carbon-reduction standards. The vessel upgraded to hybrid trawl winches in late 2024, lowering average fuel consumption by 12%.',
        'Risk indicators are low: no transshipment anomalies detected over the past 90 days and catch documentation aligns with ICCAT digital ledger filings.'
      ],
      sustainabilitySnapshot: {
        score: 78,
        grade: 'B+',
        badgeColor: '#f59e0b',
        categories: [
          { label: 'Vessel Efficiency', value: 70, color: '#f59e0b' },
          { label: 'Fishing Method', value: 65, color: '#f97316' },
          { label: 'Environmental Practices', value: 82, color: '#34d399' },
          { label: 'Compliance & Transparency', value: 90, color: '#34d399' },
          { label: 'Social Responsibility', value: 75, color: '#f59e0b' }
        ]
      },
      transactionHistory: [
        {
          date: '2025-09-18',
          type: 'Catch Consignment',
          location: 'Reykjavík, Iceland',
          notes: 'Handed off 62 MT albacore to refrigerated carrier Nordic Dawn.',
          status: 'Cleared'
        },
        {
          date: '2025-09-08',
          type: 'Port State Inspection',
          location: 'St. John’s, Newfoundland',
          notes: 'Verified logbooks, crew manifests, and coolant disposal receipts—no discrepancies.',
          status: 'Passed'
        },
        {
          date: '2025-08-27',
          type: 'Satellite Alert Review',
          location: 'North Atlantic Central',
          notes: 'Triggered proximity review after course overlap with FV Tide Runner; no violation observed.',
          status: 'Resolved'
        }
      ],
      reservedNote:
        'Future spotlight for crew interviews, ESG partner attestations, or satellite anomaly overlays. Add your findings here when they become available.',
      chatIntro: 'ask me about the report or about how to break down each insight'
    };

    return <TemplateReportView data={templateData} reportId="template-summary" />;
  }

  const exportElementToPDF = (elementId: string, title: string) => {
    if (typeof window === 'undefined') return;
    const node = document.getElementById(elementId);
    if (!node) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const styles = `
      <style>
        @page { size: A4; margin: 16mm; }
        html, body { background: #ffffff; color: #171717; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; }
        h1,h2,h3 { color: #171717; margin: 0 0 8px 0; }
        p { margin: 8px 0; line-height: 1.5; }
        section { margin-bottom: 20px; }
        .border { border-color: #d2deea; }
        svg { max-width: 100% !important; height: auto !important; }
      </style>
    `;
    printWindow.document.write(`<html><head><title>${title}</title>${styles}</head><body>`);
    printWindow.document.write(node.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  useEffect(() => {
    // If this is a generated report, load JSON and render react-based sections
    const jsonKey = `report_json_${resolvedParams.reportId}`;
    const jsonStr = typeof window !== 'undefined' ? localStorage.getItem(jsonKey) : null;
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        setGeneratedJson(parsed);
        // Load stored custom title, if available
        const savedTitle = typeof window !== 'undefined' ? localStorage.getItem(`report_title_${resolvedParams.reportId}`) : null;
        if (savedTitle) {
          setCustomTitle(savedTitle);
        }
        setReportData(null);
        return;
      } catch (e) {
        // fall through to mock charts
      }
    }

    // Fallback to demo mock data for hardcoded reports
    fetch('/mock-data.json')
      .then((res) => res.json())
      .then((data) => setReportData(data));
  }, [resolvedParams.reportId]);

  // Render generated JSON reports with charts
  if (generatedJson) {
    if (generatedJson.layout === 'template-vessel') {
      return <TemplateReportView data={generatedJson} reportId={resolvedParams.reportId} />;
    }

    return (
      <div className="flex-1 p-8 text-[#e0f2fd]">
        <div className="max-w-4xl">
          <Link href="/database" className="flex items-center space-x-2 text-[#c0d9ef] hover:text-[#e0f2fd] mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            <span>Database</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2 text-[#e0f2fd]">
            {customTitle ? (
              <span>{customTitle}</span>
            ) : (
              <>Report: <span className="text-[#c0d9ef] capitalize">{resolvedParams.reportId.replaceAll('-', ' ')}</span></>
            )}
          </h1>
          <p className="text-[#c0d9ef] mb-8">Generated on: {new Date().toLocaleDateString()}</p>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => exportElementToPDF('report-content', customTitle ? customTitle : `Report ${resolvedParams.reportId}`)}
              className="px-4 py-2 bg-[#4662ab] text-[#e0f2fd] rounded-md font-semibold hover:bg-[#c6daec] hover:text-[#171717]"
            >
              Export PDF
            </button>
          </div>
          <div id="report-content" className="bg-[#171717] border border-[rgba(198,218,236,0.18)] rounded-lg p-8 space-y-10">
            {/* Executive Summary */}
            {Array.isArray(generatedJson.executiveSummary) && (
              <section>
                <h2 className="text-xl font-semibold mb-4 border-b border-[rgba(198,218,236,0.2)] pb-3">Executive Summary</h2>
                <div className="space-y-4 text-[#d2deea]">
                  {generatedJson.executiveSummary.map((p: string, idx: number) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Sections */}
            {Array.isArray(generatedJson.sections) && generatedJson.sections.map((s: any, idx: number) => (
              <section key={idx}>
                <h2 className="text-xl font-semibold mb-4 border-b border-[rgba(198,218,236,0.2)] pb-3">{s?.heading || 'Section'}</h2>
                <div className="space-y-4 text-[#d2deea]">
                  {(Array.isArray(s?.content) ? s.content : []).map((p: string, i: number) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
                {s?.chart?.callout && (
                  <p className="text-[#c0d9ef] text-sm mt-3"><em>Chart callout:</em> {s.chart.callout}</p>
                )}

                {/* Chart selection */}
                <div className="mt-6 h-64">
                  <ResponsiveContainer>
                    {(() => {
                      const type = s?.chart?.type || 'none';
                      const heading = (s?.heading || '').toLowerCase();
                      // Sample data tailored to sustainability theme
                      if (type === 'bar' || heading.includes('iuu')) {
                        const data = [
                          { label: 'Hotspot A', incidents: 7 },
                          { label: 'Hotspot B', incidents: 5 },
                          { label: 'Hotspot C', incidents: 3 },
                          { label: 'Hotspot D', incidents: 2 },
                        ];
                        return (
                          <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4662ab" />
                            <XAxis dataKey="label" stroke="#c6daec" fontSize={12} />
                            <YAxis stroke="#c6daec" fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                            <Bar dataKey="incidents" fill="#E2E8F0" radius={[4,4,0,0]} />
                          </BarChart>
                        );
                      }
                      if (type === 'radial' || heading.includes('voice agent')) {
                        const success = 82;
                        const radialData = [{ name: 'Success Rate', value: success }];
                        return (
                          <RadialBarChart innerRadius="80%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                            <RadialBar background dataKey="value" fill="#FFFFFF" cornerRadius={10} />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-semibold fill-white">{`${success}%`}</text>
                            <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-gray-400">Success Rate</text>
                          </RadialBarChart>
                        );
                      }
                      if (type === 'pie' || heading.includes('economic')) {
                        const pieData = [
                          { name: 'Compliance Savings', value: 45 },
                          { name: 'Patrol Efficiency', value: 30 },
                          { name: 'Market Stability', value: 25 },
                        ];
                        const COLORS = ['#e0f2fd', '#c6daec', '#4662ab'];
                        return (
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                              {pieData.map((entry, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', color: '#c6daec' }} />
                          </PieChart>
                        );
                      }
                      // Default sustainability line/area chart
                      const areaData = [
                        { t: 'Wk 1', co2: 2.1 },
                        { t: 'Wk 2', co2: 2.4 },
                        { t: 'Wk 3', co2: 1.9 },
                        { t: 'Wk 4', co2: 1.6 },
                      ];
                      return (
                        <AreaChart data={areaData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="co2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#4662ab" />
                          <XAxis dataKey="t" stroke="#c6daec" fontSize={12} />
                          <YAxis stroke="#c6daec" fontSize={12} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                          <Area type="monotone" dataKey="co2" stroke="#FFFFFF" fill="url(#co2)" />
                        </AreaChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
              </section>
            ))}

            {/* Estimated Sustainability Impact */}
            <section>
              <h2 className="text-xl font-semibold mb-4 border-b border-[rgba(198,218,236,0.2)] pb-3">Estimated Sustainability Impact</h2>
              <p className="text-[#d2deea] mb-4">Based on observed compliance improvements and deterrence effects in the selected period, we estimate the following positive environmental outcomes. These estimates are illustrative and directionally conservative.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Endangered fish saved (bar) */}
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={[{species:'Bluefin Tuna', saved: 140},{species:'Hammerhead Shark', saved: 90},{species:'Sea Turtles', saved: 60}] } margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4662ab" />
                      <XAxis dataKey="species" stroke="#c6daec" fontSize={12} />
                      <YAxis stroke="#c6daec" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                      <Bar dataKey="saved" fill="#E2E8F0" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Pollution avoided (area) */}
                <div className="h-64">
                  <ResponsiveContainer>
                    <AreaChart data={[{t:'Wk 1', tons: 3.2},{t:'Wk 2', tons: 3.8},{t:'Wk 3', tons: 4.1},{t:'Wk 4', tons: 4.6}]} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="tons" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4662ab" />
                      <XAxis dataKey="t" stroke="#c6daec" fontSize={12} />
                      <YAxis stroke="#c6daec" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                      <Area type="monotone" dataKey="tons" stroke="#FFFFFF" fill="url(#tons)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Prevention mix (pie) */}
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={[{name:'Oil discharge prevented', value: 40},{name:'Illegal dumping deterred', value: 35},{name:'Bycatch reduction', value: 25}]} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {['#e0f2fd','#c6daec','#4662ab'].map((c, i) => (<Cell key={i} fill={c} />))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', borderColor: '#4A5568', color: '#E2E8F0' }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', color: '#c6daec' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }
  
  // If neither generatedJson nor reportData is ready yet, show a lightweight loading state
  if (!reportData) {
    return <div className="flex-1 p-8 text-[#e0f2fd] text-center">Loading report data...</div>;
  }
  
  const successRateData = [{ name: 'Success Rate', value: reportData.agentPerformance.success_rate }];

  return (
    <div className="flex-1 p-8 text-[#e0f2fd]">
      <div className="max-w-4xl">
        <Link href="/database" className="flex items-center space-x-2 text-[#c0d9ef] hover:text-[#e0f2fd] mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
          <span>Database</span>
        </Link>
        <h1 className="text-3xl font-bold mb-2 text-[#e0f2fd]">
          Report: <span className="text-[#c0d9ef] capitalize">{resolvedParams.reportId.replaceAll('-', ' ')}</span>
        </h1>
        <p className="text-[#c0d9ef] mb-8">Generated on: {new Date().toLocaleDateString()}</p>
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => exportElementToPDF('report-content', `Report ${resolvedParams.reportId}`)}
            className="px-4 py-2 bg-[#4662ab] text-[#e0f2fd] rounded-md font-semibold hover:bg-[#c6daec] hover:text-[#171717]"
          >
            Export PDF
          </button>
        </div>
        <div id="report-content" className="bg-[#171717] border border-[rgba(198,218,236,0.18)] rounded-lg p-8 space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b border-[rgba(198,218,236,0.2)] pb-3">
              Weekly IUU Activity Analysis
            </h2>
            <p className="text-[#c0d9ef] text-sm mb-6">
              This section provides a week-over-week summary of detected vessels engaged in suspected Illegal, Unreported, and Unregulated (IUU) fishing activities. The data is aggregated from AIS, satellite imagery, and environmental sensor fusion.
            </p>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={reportData.weeklyIUU} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4662ab" />
                  <XAxis dataKey="week" stroke="#c6daec" fontSize={12} />
                  <YAxis stroke="#c6daec" fontSize={12} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      borderColor: '#4A5568',
                      color: '#E2E8F0',
                    }}
                  />
                  <Bar dataKey="vessels_detected" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[#c0d9ef] text-xs mt-4 text-center">
              Figure 1: Count of vessels flagged for IUU-like behavior over the past four weeks.
            </p>
            <p className="text-[#d2deea] text-sm mt-6">
              <strong>Analysis:</strong> A notable increase in flagged activity was observed in Week 37, coinciding with seasonal migration patterns of target species. Further investigation into the satellite reconnaissance data from this period is recommended.
            </p>
          </section>
          
          <section>
            <h2 className="text-xl font-semibold mb-4 border-b border-[rgba(198,218,236,0.2)] pb-3">
              AI Voice Agent Performance
            </h2>
            <p className="text-[#c0d9ef] text-sm mb-6">
              The following metrics evaluate the performance of the automated AI Voice Agent. The success rate is defined as the percentage of calls resulting in a confirmed receipt of information without requiring human operator intervention.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                {/* Chart 1: Success Rate */}
                <div className="h-64 flex flex-col items-center justify-center">
                    <ResponsiveContainer>
                      <RadialBarChart 
                        innerRadius="80%" 
                        outerRadius="100%" 
                        data={successRateData} 
                        startAngle={90} 
                        endAngle={-270}
                      >
                        <RadialBar
                          background
                          dataKey='value'
                          fill="#FFFFFF"
                          cornerRadius={10}
                        />
                        <text 
                          x="50%" 
                          y="50%" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          className="text-2xl font-semibold fill-white"
                        >
                          {`${reportData.agentPerformance.success_rate}%`}
                        </text>
                         <text 
                          x="50%" 
                          y="65%" 
                          textAnchor="middle" 
                          dominantBaseline="middle" 
                          className="text-sm fill-gray-400"
                        >
                          Success Rate
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                </div>
                {/* Chart 2: Call Outcomes */}
                <div className="h-64">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={reportData.agentPerformance.call_outcomes as unknown as any[]}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {reportData.agentPerformance.call_outcomes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    borderColor: '#4A5568',
                                    color: '#E2E8F0',
                                }}
                            />
                            <Legend iconSize={10} wrapperStyle={{ fontSize: "12px", color: '#c6daec' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 {/* Stats */}
                <div className="space-y-4">
                  <div className="bg-[#4662ab1a] p-4 rounded-lg border border-[rgba(198,218,236,0.25)]">
                      <p className="text-sm text-gray-400">Avg. Call Duration</p>
                      <p className="text-2xl font-semibold">{reportData.agentPerformance.avg_call_duration_min} min</p>
                  </div>
                  <div className="bg-[#4662ab1a] p-4 rounded-lg border border-[rgba(198,218,236,0.25)]">
                      <p className="text-sm text-gray-400">Total Calls (Q3)</p>
                      <p className="text-2xl font-semibold">{reportData.agentPerformance.total_calls_q3}</p>
                  </div>
                </div>
            </div>
            <p className="text-gray-300 text-sm mt-6">
              <strong>Summary:</strong> The voice agent continues to perform with high efficacy, successfully managing the majority of outbound alerts. The low escalation rate of {reportData.agentPerformance.escalation_rate}% indicates a high level of autonomy and reliability. Call duration remains efficient, contributing to operational cost savings.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReportDisplayPage;
