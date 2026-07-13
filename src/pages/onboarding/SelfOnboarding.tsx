/**
 * Self-service multi-step onboarding wizard for new employees.
 *
 * Steps:
 * 1. Personal Details (date_of_birth, gender, phone)
 * 2. Address (address_line_1, city, state, postal_code, country)
 * 3. Emergency Contact (name, phone, relationship)
 * 4. Bank Details (account_number, bank_name, ifsc_code)
 * 5. Document Upload (id_proof file)
 *
 * Each step PATCHes to /api/v1/onboarding/self/steps/{n}/
 * Final completion calls POST /api/v1/onboarding/self/complete/
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepData {
  [key: string]: string | File | null;
}

interface ValidationErrors {
  [key: string]: string[];
}

const STEPS = [
  { number: 1, name: 'Personal Details' },
  { number: 2, name: 'Address' },
  { number: 3, name: 'Emergency Contact' },
  { number: 4, name: 'Bank Details' },
  { number: 5, name: 'Document Upload' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SelfOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: statusData, isLoading: statusLoading } = useOnboardingStatus();

  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Form state for each step
  const [personalDetails, setPersonalDetails] = useState({
    date_of_birth: '',
    gender: '',
    phone: '',
  });
  const [address, setAddress] = useState({
    address_line_1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  });
  const [emergencyContact, setEmergencyContact] = useState({
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  });
  const [bankDetails, setBankDetails] = useState({
    account_number: '',
    bank_name: '',
    ifsc_code: '',
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // If onboarding is already completed, redirect to dashboard
  useEffect(() => {
    if (statusData?.onboarding_status === 'completed') {
      navigate('/dashboard', { replace: true });
    }
  }, [statusData, navigate]);

  // Set current step based on first incomplete step
  useEffect(() => {
    if (statusData?.steps) {
      const firstIncomplete = statusData.steps.find((s) => !s.is_completed);
      if (firstIncomplete) {
        setCurrentStep(firstIncomplete.step_number);
      }
    }
  }, [statusData]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const saveStepMutation = useMutation({
    mutationFn: async ({ stepNumber, data }: { stepNumber: number; data: StepData | FormData }) => {
      const isFormData = data instanceof FormData;
      const response = await api.patch(
        `/api/v1/onboarding/self/steps/${stepNumber}/`,
        data,
        isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
      );
      return response.data;
    },
    onSuccess: () => {
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ValidationErrors } };
        if (axiosError.response?.data) {
          setErrors(axiosError.response.data);
        }
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/v1/onboarding/self/complete/');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      navigate('/dashboard', { replace: true });
    },
    onError: (error: unknown) => {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: ValidationErrors } };
        if (axiosError.response?.data) {
          setErrors(axiosError.response.data);
        }
      }
    },
  });

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveAndContinue = async () => {
    let data: StepData | FormData;

    switch (currentStep) {
      case 1:
        data = personalDetails;
        break;
      case 2:
        data = address;
        break;
      case 3:
        data = emergencyContact;
        break;
      case 4:
        data = bankDetails;
        break;
      case 5: {
        const formData = new FormData();
        if (documentFile) {
          formData.append('id_proof', documentFile);
        }
        data = formData;
        break;
      }
      default:
        return;
    }

    await saveStepMutation.mutateAsync({ stepNumber: currentStep, data });

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleComplete = async () => {
    // Save step 5 first, then complete
    const formData = new FormData();
    if (documentFile) {
      formData.append('id_proof', documentFile);
    }
    await saveStepMutation.mutateAsync({ stepNumber: 5, data: formData });
    completeMutation.mutate();
  };

  const handleBack = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome! Complete Your Onboarding</h1>
        <p className="mt-2 text-sm text-gray-600">
          Please fill in your details to get started. You can save and continue later.
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={STEPS} />

      {/* Step Content */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-semibold text-gray-900">
          Step {currentStep}: {STEPS[currentStep - 1].name}
        </h2>

        {currentStep === 1 && (
          <PersonalDetailsForm
            data={personalDetails}
            onChange={setPersonalDetails}
            errors={errors}
          />
        )}
        {currentStep === 2 && (
          <AddressForm data={address} onChange={setAddress} errors={errors} />
        )}
        {currentStep === 3 && (
          <EmergencyContactForm
            data={emergencyContact}
            onChange={setEmergencyContact}
            errors={errors}
          />
        )}
        {currentStep === 4 && (
          <BankDetailsForm data={bankDetails} onChange={setBankDetails} errors={errors} />
        )}
        {currentStep === 5 && (
          <DocumentUploadForm file={documentFile} onChange={setDocumentFile} errors={errors} />
        )}

        {/* Global error message */}
        {errors.non_field_errors && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">{errors.non_field_errors.join(', ')}</p>
          </div>
        )}
        {errors.detail && (
          <div className="mt-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-800">
              {Array.isArray(errors.detail) ? errors.detail.join(', ') : String(errors.detail)}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 1}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={saveStepMutation.isPending}
            className="rounded-md bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {saveStepMutation.isPending ? 'Saving...' : 'Save & Continue'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={saveStepMutation.isPending || completeMutation.isPending}
            className="rounded-md bg-green-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
          >
            {completeMutation.isPending ? 'Completing...' : 'Complete Onboarding'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: { number: number; name: string }[];
}) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex items-center justify-between">
        {steps.map((step) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;

          return (
            <li key={step.number} className="flex flex-1 flex-col items-center">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isCompleted ? '✓' : step.number}
                </div>
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isActive ? 'text-primary-600' : 'text-gray-500'
                }`}
              >
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Form Components ─────────────────────────────────────────────────────────

function FieldError({ errors, field }: { errors: ValidationErrors; field: string }) {
  if (!errors[field]) return null;
  return (
    <p className="mt-1 text-xs text-red-600">
      {errors[field].join(', ')}
    </p>
  );
}

function PersonalDetailsForm({
  data,
  onChange,
  errors,
}: {
  data: { date_of_birth: string; gender: string; phone: string };
  onChange: (data: { date_of_birth: string; gender: string; phone: string }) => void;
  errors: ValidationErrors;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700">
          Date of Birth
        </label>
        <input
          id="date_of_birth"
          type="date"
          value={data.date_of_birth}
          onChange={(e) => onChange({ ...data, date_of_birth: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="date_of_birth" />
      </div>
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
          Gender
        </label>
        <select
          id="gender"
          value={data.gender}
          onChange={(e) => onChange({ ...data, gender: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer_not_to_say">Prefer Not to Say</option>
        </select>
        <FieldError errors={errors} field="gender" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          id="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="+91 98765 43210"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="phone" />
      </div>
    </div>
  );
}

function AddressForm({
  data,
  onChange,
  errors,
}: {
  data: { address_line_1: string; city: string; state: string; postal_code: string; country: string };
  onChange: (data: { address_line_1: string; city: string; state: string; postal_code: string; country: string }) => void;
  errors: ValidationErrors;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="address_line_1" className="block text-sm font-medium text-gray-700">
          Address Line 1
        </label>
        <input
          id="address_line_1"
          type="text"
          value={data.address_line_1}
          onChange={(e) => onChange({ ...data, address_line_1: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="address_line_1" />
      </div>
      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
          City
        </label>
        <input
          id="city"
          type="text"
          value={data.city}
          onChange={(e) => onChange({ ...data, city: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="city" />
      </div>
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
          State
        </label>
        <input
          id="state"
          type="text"
          value={data.state}
          onChange={(e) => onChange({ ...data, state: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="state" />
      </div>
      <div>
        <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
          Postal Code
        </label>
        <input
          id="postal_code"
          type="text"
          value={data.postal_code}
          onChange={(e) => onChange({ ...data, postal_code: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="postal_code" />
      </div>
      <div>
        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
          Country
        </label>
        <input
          id="country"
          type="text"
          value={data.country}
          onChange={(e) => onChange({ ...data, country: e.target.value })}
          placeholder="India"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="country" />
      </div>
    </div>
  );
}

function EmergencyContactForm({
  data,
  onChange,
  errors,
}: {
  data: { emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string };
  onChange: (data: { emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string }) => void;
  errors: ValidationErrors;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="emergency_contact_name" className="block text-sm font-medium text-gray-700">
          Contact Name
        </label>
        <input
          id="emergency_contact_name"
          type="text"
          value={data.emergency_contact_name}
          onChange={(e) => onChange({ ...data, emergency_contact_name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="emergency_contact_name" />
      </div>
      <div>
        <label htmlFor="emergency_contact_phone" className="block text-sm font-medium text-gray-700">
          Contact Phone
        </label>
        <input
          id="emergency_contact_phone"
          type="tel"
          value={data.emergency_contact_phone}
          onChange={(e) => onChange({ ...data, emergency_contact_phone: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="emergency_contact_phone" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="emergency_contact_relationship" className="block text-sm font-medium text-gray-700">
          Relationship
        </label>
        <select
          id="emergency_contact_relationship"
          value={data.emergency_contact_relationship}
          onChange={(e) => onChange({ ...data, emergency_contact_relationship: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Select Relationship</option>
          <option value="spouse">Spouse</option>
          <option value="parent">Parent</option>
          <option value="sibling">Sibling</option>
          <option value="friend">Friend</option>
          <option value="other">Other</option>
        </select>
        <FieldError errors={errors} field="emergency_contact_relationship" />
      </div>
    </div>
  );
}

function BankDetailsForm({
  data,
  onChange,
  errors,
}: {
  data: { account_number: string; bank_name: string; ifsc_code: string };
  onChange: (data: { account_number: string; bank_name: string; ifsc_code: string }) => void;
  errors: ValidationErrors;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700">
          Bank Name
        </label>
        <input
          id="bank_name"
          type="text"
          value={data.bank_name}
          onChange={(e) => onChange({ ...data, bank_name: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="bank_name" />
      </div>
      <div>
        <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
          Account Number
        </label>
        <input
          id="account_number"
          type="text"
          value={data.account_number}
          onChange={(e) => onChange({ ...data, account_number: e.target.value })}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="account_number" />
      </div>
      <div>
        <label htmlFor="ifsc_code" className="block text-sm font-medium text-gray-700">
          IFSC Code
        </label>
        <input
          id="ifsc_code"
          type="text"
          value={data.ifsc_code}
          onChange={(e) => onChange({ ...data, ifsc_code: e.target.value.toUpperCase() })}
          placeholder="e.g. SBIN0001234"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <FieldError errors={errors} field="ifsc_code" />
      </div>
    </div>
  );
}

function DocumentUploadForm({
  file,
  onChange,
  errors,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  errors: ValidationErrors;
}) {
  return (
    <div>
      <label htmlFor="id_proof" className="block text-sm font-medium text-gray-700">
        ID Proof (Aadhaar, PAN, Passport, etc.)
      </label>
      <div className="mt-2">
        <input
          id="id_proof"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
        />
      </div>
      {file && (
        <p className="mt-2 text-xs text-gray-500">
          Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
        </p>
      )}
      <p className="mt-1 text-xs text-gray-400">
        Accepted formats: PDF, JPG, PNG. Max size: 5 MB.
      </p>
      <FieldError errors={errors} field="id_proof" />
    </div>
  );
}
