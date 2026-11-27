export interface FAQCategory {
  id: string;
  title: string;
  description: string;
  faqs_count: number;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: string;
  category: string | null;
  category_name?: string;
  question: string;
  answer: string;
  tags: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFAQCategoryPayload {
  title: string;
  description?: string;
}

export interface UpdateFAQCategoryPayload {
  title?: string;
  description?: string;
}

export interface CreateFAQPayload {
  category?: string | null;
  question: string;
  answer: string;
  tags?: string;
  is_published?: boolean;
}

export interface UpdateFAQPayload {
  category?: string | null;
  question?: string;
  answer?: string;
  tags?: string;
  is_published?: boolean;
}

export interface HelpdeskTag {
  id: string;
  title: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateHelpdeskTagPayload {
  title: string;
  color: string;
}

export interface UpdateHelpdeskTagPayload {
  title?: string;
  color?: string;
}

export const DEFAULT_HELPDESK_TAGS: HelpdeskTag[] = [
  { id: '1', title: 'Horilla', color: '#000000' },
  { id: '2', title: 'Asset', color: '#4fc3f7' },
  { id: '3', title: 'Request', color: '#afb42b' },
  { id: '4', title: 'Allocation', color: '#00838f' },
  { id: '5', title: 'Recruitment', color: '#ef9a9a' },
  { id: '6', title: 'Stage', color: '#b39ddb' },
  { id: '7', title: 'Manager', color: '#00bfa5' },
  { id: '8', title: 'Attendance', color: '#9fa8da' },
];

