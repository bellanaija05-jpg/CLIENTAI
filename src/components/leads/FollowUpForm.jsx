import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  emptyFollowUpForm,
  followUpFormSchema,
} from '../../lib/schemas.js'
import Spinner from '../ui/Spinner.jsx'

const labelClass = 'block text-sm font-medium text-slate-700'
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Add-follow-up form (Phase 4 Stage 4). Same RHF + Zod pattern as the
 * other forms: all validation lives in the schema. due_date uses a
 * native date input (no time selection in this stage).
 *
 * Props:
 *  - onSubmit(values) : validated { title, description, due_date }
 *  - onCancel()       : close without saving
 *  - serverError      : banner from a failed Supabase call; the form's
 *                       values are preserved so the user can retry
 */
export default function FollowUpForm({ onSubmit, onCancel, serverError = null }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(followUpFormSchema),
    defaultValues: emptyFollowUpForm,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="followUpTitle" className={labelClass}>
            Title
          </label>
          <input
            id="followUpTitle"
            type="text"
            placeholder="Call to confirm details"
            {...register('title')}
            className={inputClass}
          />
          {errors.title && <p className={errorClass}>{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="followUpDescription" className={labelClass}>
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="followUpDescription"
            rows={2}
            {...register('description')}
            className={inputClass}
          />
          {errors.description && (
            <p className={errorClass}>{errors.description.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="followUpDueDate" className={labelClass}>
            Due date
          </label>
          <input
            id="followUpDueDate"
            type="date"
            {...register('due_date')}
            className={inputClass}
          />
          {errors.due_date && (
            <p className={errorClass}>{errors.due_date.message}</p>
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
          Add Follow-Up
        </button>
      </div>
    </form>
  )
}