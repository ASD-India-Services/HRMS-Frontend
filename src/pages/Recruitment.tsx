/**
 * Recruitment module — tabbed layout for Job Openings, Applicant Pipeline, and Interviews.
 * Requirements: 19.1, 19.2, 19.3, 24.2
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { JobOpenings } from './recruitment/JobOpenings';
import { ApplicantPipeline } from './recruitment/ApplicantPipeline';
import { InterviewSchedule } from './recruitment/InterviewSchedule';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';

type Tab = 'openings' | 'pipeline' | 'interviews';

const TABS: { key: Tab; label: string }[] = [
  { key: 'openings', label: 'Job Openings' },
  { key: 'pipeline', label: 'Candidates' },
  { key: 'interviews', label: 'Interviews' },
];

// Map URL paths to tabs
function getTabFromPath(pathname: string): Tab {
  if (pathname.includes('/candidates')) return 'pipeline';
  if (pathname.includes('/interviews')) return 'interviews';
  return 'openings';
}

export default function Recruitment() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>(() => getTabFromPath(location.pathname));
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | undefined>();

  // Sync tab with URL when navigating via sidebar
  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleSelectOpening = (id: string) => {
    setSelectedOpeningId(id);
    setActiveTab('pipeline');
  };

  const handleBackFromPipeline = () => {
    setSelectedOpeningId(undefined);
    setActiveTab('openings');
  };

  return (
    <PageContainer>
      <PageHeader title="Recruitment" subtitle="Manage job openings, applicants, and the hiring pipeline." />

      {/* Tab Navigation */}
      <Tabs
        aria-label="Recruitment tabs"
        items={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
        value={activeTab}
        onChange={setActiveTab}
      />

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
    </PageContainer>
  );
}
