/**
 * Expense Claim Submission Form
 * Provides expense type dropdown, amount input, description, date picker, and file upload for receipts.
 * Requirements: 27.6
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExpenseTypes, useSubmitExpenseClaim, useUploadReceipt } from '@/hooks/useExpenses';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

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
        title: description.trim().slice(0, 50) || 'Expense claim',
        total_amount: parseFloat(amount),
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
    <PageContainer maxWidth="lg">
      <PageHeader title="Submit Expense Claim" subtitle="Submit a new expense reimbursement claim" />

      {/* Submission Form */}
      <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Expense Type */}
          <div className="sm:col-span-2">
            <label htmlFor="expense-type" className="block text-sm font-medium text-ink-primary">
              Expense Type <span className="text-error-main">*</span>
            </label>
            <Select
              id="expense-type"
              value={expenseType}
              onChange={(e) => setExpenseType(e.target.value)}
              disabled={typesLoading}
              className="mt-1"
              required
            >
              <option value="">Select expense type</option>
              {expenseTypes?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-ink-primary">
              Amount (₹) <span className="text-error-main">*</span>
            </label>
            <Input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
              required
            />
          </div>

          {/* Expense Date */}
          <div>
            <label htmlFor="expense-date" className="block text-sm font-medium text-ink-primary">
              Expense Date <span className="text-error-main">*</span>
            </label>
            <Input
              type="date"
              id="expense-date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="mt-1"
              required
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-ink-primary">
              Description <span className="text-error-main">*</span>
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the expense (e.g., client meeting lunch, cab to airport)..."
              className="mt-1 resize-y"
              required
            />
          </div>

          {/* File Upload */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink-primary">
              Receipts / Supporting Documents
            </label>
            <div className="mt-1">
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-divider px-6 py-8 transition-colors hover:border-grey-400">
                <div className="text-center">
                  <Iconify icon="upload" width={40} className="mx-auto text-ink-disabled" />
                  <div className="mt-3">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer rounded-md font-medium text-primary-main hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-main focus-within:ring-offset-2"
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
                    <span className="text-sm text-ink-secondary"> to attach receipts</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-secondary">
                    PNG, JPG, PDF up to 10MB each
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Error */}
            {uploadError && (
              <p className="mt-2 text-sm text-error-main">{uploadError}</p>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <ul className="mt-3 divide-y divide-divider rounded-lg bg-surface-neutral">
                {selectedFiles.map((sf, index) => (
                  <li key={index} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Iconify icon="link" width={20} className="text-ink-disabled" />
                      <span className="text-sm text-ink-primary">{sf.preview}</span>
                      <span className="text-xs text-ink-disabled">
                        ({(sf.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button variant="text" color="error" size="small" onClick={() => removeFile(index)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Error message */}
        {submitClaim.isError && (
          <div className="mt-4 rounded-card bg-error-lighter p-3 text-sm text-error-dark" role="alert">
            Failed to submit expense claim. Please try again.
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outlined" color="inherit"
            onClick={() => navigate('/expenses')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isFormValid || submitClaim.isPending || uploadReceipt.isPending}
          >
            {submitClaim.isPending || uploadReceipt.isPending ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>
      </form>
      </Card>
    </PageContainer>
  );
}
