'use client';
import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal';

interface Report {
  id: string;
  title: string;
  date: string;
  clearance: string;
  sustainabilityScore: number;
  sustainabilityLabel: string;
}

const defaultReports: Report[] = [
  {
    id: 'template-summary',
    title: 'Template Summary',
    date: '2025-09-20',
    clearance: 'Public Trust',
    sustainabilityScore: 92,
    sustainabilityLabel: 'Excellent',
  },
  {
    id: 'voice-agent-performance-q3-2025',
    title: 'FV King II',
    date: '2025-09-18',
    clearance: 'Confidential',
    sustainabilityScore: 78,
    sustainabilityLabel: 'Moderate',
  },
  {
    id: 'bodega-bay-mpa-analysis-2025-09-15',
    title: 'FV Georgian Cloud',
    date: '2025-09-15',
    clearance: 'Top Secret',
    sustainabilityScore: 64,
    sustainabilityLabel: 'Needs Review',
  },
];

const NETWORK_METRICS = {
  nodes: 45,
  edges: 37,
  transactions: 8,
};

const ReportsPage = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reportToShare, setReportToShare] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customReports, setCustomReports] = useState<Report[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const indexKey = 'custom_reports_index';
    const stored = window.localStorage.getItem(indexKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCustomReports(parsed);
        }
      } catch (error) {
        console.warn('[Database] Failed to parse custom reports index', error);
      }
    }

    const listener = (event: StorageEvent) => {
      if (event.key === indexKey && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (Array.isArray(parsed)) {
            setCustomReports(parsed);
          }
        } catch (error) {
          console.warn('[Database] Failed to refresh custom reports index', error);
        }
      }
    };

    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener('storage', listener);
    };
  }, []);

  const allReports = useMemo(() => {
    const combined = [...customReports, ...defaultReports];
    return combined.sort((a, b) => {
      const scoreDiff = (a.sustainabilityScore ?? 0) - (b.sustainabilityScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return a.title.localeCompare(b.title);
    });
  }, [customReports]);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return allReports;
    const term = searchTerm.toLowerCase();
    return allReports.filter((report) => {
      return (
        report.title.toLowerCase().includes(term) ||
        report.date.toLowerCase().includes(term) ||
        `${report.sustainabilityScore}% ${report.sustainabilityLabel}`
          .toLowerCase()
          .includes(term) ||
        report.clearance.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, allReports]);

  const handleShareClick = (report: Report) => {
    setReportToShare(report);
    setIsShareModalOpen(true);
  };

  return (
    <div className="flex-1 p-8 text-[#e0f2fd]" style={{ marginLeft: '104px' }}>
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
        <header>
          <h1 className="text-4xl font-bold tracking-tight text-[#e0f2fd]">Database</h1>
        </header>

        <div className="relative">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            type="search"
            placeholder="Search reports, vessels, or analysts..."
            className="w-full bg-[#101722] border border-[rgba(198,218,236,0.18)] rounded-[28px] py-4 pl-14 pr-6 text-[#e0f2fd] placeholder-[#88a8c9] font-sans text-base focus:outline-none focus:ring-4 focus:ring-[#4662ab55]"
            aria-label="Search reports"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-[#88a8c9]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.5 5.5a7.5 7.5 0 0011.15 11.15z"
            />
          </svg>
        </div>

        <section className="flex flex-wrap gap-6 bg-[#101722] border border-[rgba(198,218,236,0.18)] rounded-3xl px-8 py-6 items-center justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.25em] text-[#88a8c9]">Network Overview</p>
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.25em] text-[#9fb7d8]">
              <span className="flex items-center gap-1">
                Nodes <span className="text-[#e0f2fd] font-semibold tracking-normal">{NETWORK_METRICS.nodes}</span>
              </span>
              <span className="flex items-center gap-1">
                Edges <span className="text-[#e0f2fd] font-semibold tracking-normal">{NETWORK_METRICS.edges}</span>
              </span>
              <span className="flex items-center gap-1">
                Transactions <span className="text-[#e0f2fd] font-semibold tracking-normal">{NETWORK_METRICS.transactions}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5 bg-[#0d141f] border border-[rgba(198,218,236,0.12)] rounded-3xl px-6 py-4 min-w-[240px]">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.28em] text-[#88a8c9]">Total Reports</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-semibold text-[#e0f2fd] leading-none">{filteredReports.length}</span>
                <span className="text-sm text-[#9fb7d8]">in view</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className="flex items-center justify-between gap-6 p-6 bg-[#101722] border border-[rgba(198,218,236,0.18)] rounded-[26px] shadow-[0_18px_40px_rgba(10,14,28,0.15)] hover:border-[#4662ab66] transition-colors"
            >
              <Link href={`/database/${report.id}`} className="flex-1 group">
                <div className="font-sans flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-[#e0f2fd] group-hover:text-[#c6daec] transition-colors">
                    {report.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-[#88a8c9] uppercase tracking-[0.2em]">
                    <span>{report.date}</span>
                    <span className="hidden sm:block">•</span>
                    <span className="hidden sm:block">{report.clearance}</span>
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-4 shrink-0">
                <span
                  className="px-4 py-2 text-sm font-semibold rounded-full border border-[rgba(198,218,236,0.25)] bg-[#0d141f] font-sans"
                  style={{
                    color:
                      report.sustainabilityScore >= 85
                        ? '#34d399'
                        : report.sustainabilityScore >= 70
                        ? '#f97316'
                        : '#f87171',
                  }}
                >
                  {report.sustainabilityScore}% • {report.sustainabilityLabel}
                </span>
                <button
                  onClick={() => handleShareClick(report)}
                  className="w-12 h-12 flex items-center justify-center border border-[rgba(198,218,236,0.25)] rounded-xl hover:bg-[#4662ab33] transition-colors"
                  aria-label={`Share ${report.title}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" x2="12" y1="2" y2="15" />
                  </svg>
                </button>
              </div>
            </article>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-20 border border-dashed border-[rgba(198,218,236,0.18)] rounded-3xl bg-[#10172266] text-[#88a8c9]">
              No reports match your search. Try a different term.
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)}>
        {reportToShare && (
          <>
            <h2 className="text-2xl font-bold mb-2">Share Report</h2>
            <p className="text-[#c0d9ef] mb-6 font-sans">
              You are sharing: <span className="font-semibold text-[#e0f2fd]">{reportToShare.title}</span>
            </p>
            
            <div className="font-sans">
              <label htmlFor="email" className="block text-sm font-medium text-[#c0d9ef] mb-2">
                Recipient&apos;s Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="example@domain.com"
                className="w-full bg-[#171717] border border-[rgba(198,218,236,0.25)] rounded-md p-2 text-[#e0f2fd] placeholder-[#c0d9ef]"
              />
            </div>

            <div className="mt-8 pt-6 border-t border-[rgba(198,218,236,0.18)]">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full bg-[#4662ab] text-[#e0f2fd] font-bold py-3 px-4 rounded-lg transition-colors hover:bg-[#c6daec] hover:text-[#171717]"
              >
                Send Report
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default ReportsPage;
