'use client';
import Link from 'next/link';
import React, { useState } from 'react';
import Modal from '../../components/Modal';

interface Report {
  id: string;
  title: string;
  date: string;
  clearance: string;
}

const reports: Report[] = [
  {
    id: 'template-summary',
    title: 'Template Summary',
    date: '2025-09-20',
    clearance: 'Public Trust',
  },
  {
    id: 'voice-agent-performance-q3-2025',
    title: 'Voice Agent Performance Q3',
    date: '2025-09-18',
    clearance: 'Confidential',
  },
  {
    id: 'bodega-bay-mpa-analysis-2025-09-15',
    title: 'Bodega Bay MPA Analysis',
    date: '2025-09-15',
    clearance: 'Top Secret',
  },
];

const ReportsPage = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [reportToShare, setReportToShare] = useState<Report | null>(null);
  const handleShareClick = (report: Report) => {
    setReportToShare(report);
    setIsShareModalOpen(true);
  };

  return (
    <div className="flex-1 p-8 text-[#e0f2fd]" style={{ marginLeft: '104px' }}>
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold mb-4 text-[#e0f2fd]">Database</h1>
        <p className="text-[#c0d9ef] mb-8">
          Review and share weekly summaries, performance analyses, and incident reports.
        </p>

        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between p-4 bg-[#171717] border border-[rgba(198,218,236,0.18)] rounded-lg"
            >
              <Link href={`/reports/${report.id}`} className="flex-1 hover:underline">
                <div className="font-sans">
                  <h3 className="font-medium">{report.title}</h3>
                  <p className="text-sm text-[#c0d9ef]">{report.date}</p>
                </div>
              </Link>
              <div className="flex items-center space-x-4">
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full border border-[rgba(198,218,236,0.25)] bg-[#171717] text-[#c6daec] font-sans"
                >
                  {report.clearance}
                </span>
                <button
                  onClick={() => handleShareClick(report)}
                  className="w-10 h-10 flex items-center justify-center border border-[rgba(198,218,236,0.25)] rounded-md hover:bg-[#4662ab33] transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
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
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)}>
        {reportToShare && (
          <>
            <h2 className="text-2xl font-bold mb-2">Share Report</h2>
            <p className="text-[#c0d9ef] mb-6 font-sans">
              You are sharing: <span className="font-semibold text-[#e0f2fd]">{reportToShare.title}</span>
            </p>
            
            <div className="font-sans">
              <label htmlFor="email" className="block text-sm font-medium text-[#c0d9ef] mb-2">Recipient's Email</label>
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
