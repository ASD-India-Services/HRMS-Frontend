import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { GOALS, KRAS, PERFORMANCE_FEEDBACK, APPRAISALS } from '@/lib/endpoints';

export interface GoalItem {
  id: string;
  goal_name?: string;
  title?: string;
  employee?: string | number;
  employee_name?: string;
  kra?: string | null;
  kra_name?: string;
  parent_goal?: string | null;
  start_date?: string;
  end_date?: string;
  status: string; // 'not_started' | 'in_progress' | 'completed' | 'cancelled' | 'achieved'
  progress_percentage?: number;
  weightage?: number;
  score?: number;
  is_company_goal?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface KRAItem {
  id: string;
  name: string;
  description?: string;
  department?: string | number | null;
  department_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FeedbackItem {
  id: string;
  employee?: string | number;
  employee_name?: string;
  feedback_by?: string | number;
  feedback_by_name?: string;
  feedback_date: string;
  overall_rating: number; // 1-5
  feedback_text: string;
  linked_appraisal_cycle?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppraisalItem {
  id: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
    employee_id: string;
  };
  score?: number;
  status: string;
  remarks?: string;
  created_at?: string;
}

// ─── Fetchers with Graceful Fallbacks & localStorage sync ──────────────────

async function fetchGoals(): Promise<GoalItem[]> {
  try {
    const res = await api.get<any>(GOALS.LIST, { params: { page_size: 200 } });
    const remote: GoalItem[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.results)
      ? res.data.results
      : [];
    return remote;
  } catch (err) {
    console.warn('Could not fetch goals from API:', err);
    // Fallback to localStorage if any mock/user goals exist
    try {
      const stored = localStorage.getItem('hrms_performance_goals');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }
}

async function fetchKRAs(): Promise<KRAItem[]> {
  try {
    const res = await api.get<any>(KRAS.LIST, { params: { page_size: 200 } });
    const remote: KRAItem[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.results)
      ? res.data.results
      : [];
    return remote;
  } catch (err) {
    console.warn('Could not fetch KRAs from API:', err);
    try {
      const stored = localStorage.getItem('hrms_performance_kras');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }
}

async function fetchFeedbacks(): Promise<FeedbackItem[]> {
  try {
    const res = await api.get<any>(PERFORMANCE_FEEDBACK.LIST, { params: { page_size: 200 } });
    const remote: FeedbackItem[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.results)
      ? res.data.results
      : [];
    return remote;
  } catch (err) {
    console.warn('Could not fetch feedbacks from API:', err);
    try {
      const stored = localStorage.getItem('hrms_performance_feedback');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return [];
  }
}

async function fetchAppraisalsList(): Promise<AppraisalItem[]> {
  try {
    const res = await api.get<any>(APPRAISALS.LIST, { params: { page_size: 200 } });
    const remote: AppraisalItem[] = Array.isArray(res.data)
      ? res.data
      : Array.isArray(res.data?.results)
      ? res.data.results
      : [];
    return remote;
  } catch (err) {
    console.warn('Could not fetch appraisals from API:', err);
    return [];
  }
}

export function usePerformanceData() {
  const goalsQuery = useQuery({
    queryKey: ['performance-goals'],
    queryFn: fetchGoals,
  });

  const krasQuery = useQuery({
    queryKey: ['performance-kras'],
    queryFn: fetchKRAs,
  });

  const feedbacksQuery = useQuery({
    queryKey: ['performance-feedbacks'],
    queryFn: fetchFeedbacks,
  });

  const appraisalsQuery = useQuery({
    queryKey: ['performance-appraisals'],
    queryFn: fetchAppraisalsList,
  });

  return {
    goals: goalsQuery.data ?? [],
    kras: krasQuery.data ?? [],
    feedbacks: feedbacksQuery.data ?? [],
    appraisals: appraisalsQuery.data ?? [],
    isLoading:
      goalsQuery.isLoading ||
      krasQuery.isLoading ||
      feedbacksQuery.isLoading ||
      appraisalsQuery.isLoading,
    refetch: () => {
      goalsQuery.refetch();
      krasQuery.refetch();
      feedbacksQuery.refetch();
      appraisalsQuery.refetch();
    },
  };
}

