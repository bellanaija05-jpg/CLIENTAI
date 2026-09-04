import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  activityFormSchema,
  emptyActivityForm,
} from '../../lib/schemas.js'
import Spinner from '../ui/Spinner.jsx'

// Select options. STATUS_CHANGE is intentionally absent — users never
// create it manually (see data/activities.js).
const TYPE_OPTIONS = [
  { value: 'NOTE', label: 'Note' },
  { value: 'CALL', label: 'Call' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Meeting' },
]

const labelClass = 'block text-sm font-medium text-slate-700'
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Add-activity form (Phase 4 Stage 3). Same RHF + Zod pattern as
 * LeadForm: validation lives entirely in the schema, values arrive at
 * onSubmit already trimmed and validated.
 *
 * Props:
 *  - onSubmit(values) : called with validated { type, description }
 *  - onCancel()       : close without saving
 *  - serverError      : message from a failed Supabase call (banner);
 *                       RHF keeps every edited value intact for a retry
 */
export default function ActivityForm({ onSubmit, onCancel, serverError = null }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(activityFormSchema),
    defaultValues: emptyActivityForm,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="activityType" className={labelClass}>
            Type
          </label>
          <select
            id="activityType"
            {...register('type')}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.type && <p className={errorClass}>{errors.type.message}</p>}
        </div>

        <div>
          <label htmlFor="activityDescription" className={labelClass}>
            Description
          </label>
          <textarea
            id="activityDescription"
            rows={3}
            placeholder="What happened?"
            {...register('description')}
            className={inputClass}
          />
          {errors.description && (
            <p className={errorClass}>{errors.description.message}</p>
          )}
        </div>
      </div>

      {serverError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Spinner />}
          Add Activity
        </button>
      </div>
    </form>
  )
}
