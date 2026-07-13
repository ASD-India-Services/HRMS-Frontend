/**
 * Recruitment module — tabbed layout for Job Openings, Applicant Pipeline, and Interviews.
 * Requirements: 19.1, 19.2, 19.3, 24.2
 */

import { useState } from 'react';
import { JobOpenings } from './recruitment/JobOpenings';
import { ApplicantPipeline } from './recruitment/ApplicantPipeline';
import { InterviewSchedule } from './recruitment/InterviewSchedule';

type Tab = 'openings' | 'pipeline' | 'interviews';

const TABS: { key: Tab; label: string }[] = [
  { key: 'openings', label: 'Job Openings' },
  { key: 'pipeline', label: 'Applicant Pipeline' },
  { key: 'interviews', label: 'Interviews' },
];

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState<Tab>('openings');
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | undefined>();

  const handleSelectOpening = (id: string) => {
    setSelectedOpeningId(id);
    setActiveTab('pipeline');
  };

  const handleBackFromPipeline = () => {
    setSelectedOpeningId(undefined);
    setActiveTab('openings');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage job openings, applicants, and the hiring pipeline.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Recruitment tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
              aria-current={activeTab === tab.key ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'openings' && (
        <JobOpenings onSelectOpening={handleSelectOpening} />
      )}

      {activeTab === 'pipeline' && (
        <ApplicantPipeline
          jobOpeningId={selectedOpeningId}
          onBack={handleBackFromPipeline}
        />
      )}

      {activeTab === 'interviews' && (
        <InterviewSchedule />
      )}
    </div>
  );
}
