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

