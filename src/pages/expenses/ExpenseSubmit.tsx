/**
 * Expense Claim Submission Form
 * Provides expense type dropdown, amount input, description, date picker, and file upload for receipts.
 * Requirements: 27.6
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseTypes, useSubmitExpenseClaim, useUploadReceipt } from '@/hooks/useExpenses';

interface SelectedFile {
  file: File;
  preview: string;
}

export function ExpenseSubmit() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: expenseTypes, isLoading: typesLoading } = useExpenseTypes();
  const submitClaim = useSubmitExpenseClaim();
  const uploadReceipt = useUploadReceipt();

  const [expenseType, setExpenseType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [uploadError, setUploadError] = useState('');

  const isFormValid = expenseType && amount && parseFloat(amount) > 0 && description.trim() && expenseDate;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      newFiles.push({ file, preview: file.name });
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    setUploadError('');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      // First submit the expense claim
      const claim = await submitClaim.mutateAsync({
        expense_type: expenseType,
        amount: parseFloat(amount),
        description: description.trim(),
        expense_date: expenseDate,
      });

      // Then upload receipts if any
      if (selectedFiles.length > 0) {
        for (const { file } of selectedFiles) {
          await uploadReceipt.mutateAsync({ claimId: claim.id, file });
        }
      }

      navigate('/expenses');
    } catch {
      // Error state is handled by mutation hooks
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Submit Expense Claim</h1>
        <p className="mt-1 text-sm text-gray-600">Submit a new expense reimbursement claim</p>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Expense Type */}
          <div className="sm:col-span-2">
            <label htmlFor="expense-type" className="block text-sm font-medium text-gray-700">
              Expense Type <span className="text-red-500">*</span>
            </label>
            <select
              id="expense-type"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              disabled={typesLoading}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-50"
              required
            >
              <option value="">Select expense type</option>
              {expenseTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Expense Date */}
          <div>
            <label htmlFor="expense-date" className="block text-sm font-medium text-gray-700">
              Expense Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="expense-date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the expense (e.g., client meeting lunch, cab to airport)..."
              className="mt-1 block w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          {/* File Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Receipts / Supporting Documents
            </label>
            <div className="mt-1">
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-gray-400">
                <div className="text-center">
                  <svg
                    className="mx-auto h-10 w-10 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-3">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2"
                    >
                      <span>Upload files</span>
                      <input
                        ref={fileInputRef}
                        id="file-upload"
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        className="sr-only"
                      />
                    </label>
                    <span className="text-sm text-gray-500"> or drag and drop</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, PDF up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <p className="mt-2 text-sm text-red-600">{uploadError}</p>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <ul className="mt-3 divide-y divide-gray-200 rounded-md border border-gray-200">
                {selectedFiles.map((sf, index) => (
                  <li key={index} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{sf.preview}</span>
                      <span className="text-xs text-gray-400">
                        ({(sf.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-sm font-medium text-red-600 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Error message */}
        {submitClaim.isError && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
            Failed to submit expense claim. Please try again.
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid || submitClaim.isPending || uploadReceipt.isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitClaim.isPending || uploadReceipt.isPending ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  );
}
