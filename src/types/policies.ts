export interface CompanyPolicy {
  id: string;
  title: string;
  body: string;
  is_visible_to_all: boolean;
  company: string;
  attachment: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePolicyPayload {
  title: string;
  body: string;
  is_visible_to_all?: boolean;
  company?: string;
  attachment?: File | null;
}

export interface UpdatePolicyPayload {
  title?: string;
  body?: string;
  is_visible_to_all?: boolean;
  company?: string;
  attachment?: File | null;
}

