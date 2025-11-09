'use client';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import Modal from '../../components/Modal';

interface Report {
  id: string;
  title: string;
  date: string;
  clearance: string;
  sustainabilityScore: number;
  sustainabilityLabel: string;
}

const reports: Report[] = [
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

const timeframeOptions = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-quarter', label: 'Last Quarter' },
  { value: 'year-to-date', label: 'Year to Date' },
  { value: 'all-time', label: 'All Time' },
];

const ReportsPage = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reportToShare, setReportToShare] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframe, setTimeframe] = useState<string>('this-month');

  const selectedTimeframeLabel =
    timeframeOptions.find((option) => option.value === timeframe)?.label ?? 'This Month';

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter((report) => {
      return (
        report.title.toLowerCase().includes(term) ||
        report.date.toLowerCase().includes(term) ||
        `${report.sustainabilityScore}% ${report.sustainabilityLabel}`
          .toLowerCase()
          .includes(term) ||
        report.clearance.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

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

        <section className="flex flex-wrap gap-6 bg-[#101722] border border-[rgba(198,218,236,0.18)] rounded-3xl px-8 py-6 items-center">
          <div className="flex items-center gap-4 min-w-[220px]">
            <div className="w-12 h-12 rounded-full bg-[#4662ab33] border border-[#4662ab66] flex items-center justify-center text-[#c6daec] font-semibold text-lg">
              N
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#88a8c9]">Analyst Overview</p>
              <p className="text-xl font-semibold text-[#e0f2fd]">{selectedTimeframeLabel}</p>
            </div>
          </div>

          <div className="flex-1 min-w-[220px] flex justify-center">
            <label className="flex items-center gap-3 bg-[#0d141f] border border-[rgba(198,218,236,0.12)] rounded-full px-5 py-3 text-sm text-[#c0d9ef]">
              <span className="text-[#88a8c9] uppercase tracking-[0.3em] text-xs">Timeframe</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent border-none text-[#e0f2fd] font-semibold outline-none cursor-pointer"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-3 bg-[#0d141f] border border-[rgba(198,218,236,0.12)] rounded-3xl px-6 py-4">
            <div className="w-12 h-12 rounded-full bg-[#4662ab] text-[#e0f2fd] flex items-center justify-center text-xl font-bold">
              {filteredReports.length}
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#88a8c9]">Total Reports</p>
              <p className="text-base font-semibold text-[#e0f2fd]">in view</p>
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
              No reports match your search. Try a different term or timeframe.
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
