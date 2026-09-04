import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  emptyLeadForm,
  leadFormSchema,
  LEAD_STATUSES,
} from '../../lib/schemas.js'
import Spinner from '../ui/Spinner.jsx'

// Shared styling for the three pieces of every field row.
const labelClass = 'block text-sm font-medium text-slate-700'
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200'
const errorClass = 'mt-1 text-xs text-red-600'

/**
 * Reusable lead form (create now, edit in Stage 3).
 *
 * React Hook Form keeps the inputs uncontrolled and collects values on
 * submit; the Zod schema does ALL validation through the resolver, so
 * this component contains no validation logic of its own.
 *
 * Props:
 *  - defaultValues : initial field values (empty form for create)
 *  - onSubmit(values) : called with the VALIDATED values — already
 *    trimmed, empty strings converted to null, value coerced to a number
 *  - submitLabel   : button text
 *  - cancelTo      : route for the Cancel link
 *  - serverError   : message from a failed Supabase call, shown as a banner
 */
export default function LeadForm({
  defaultValues = emptyLeadForm,
  onSubmit,
  submitLabel = 'Save lead',
  cancelTo,
  serverError = null,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            autoComplete="off"
            {...register('name')}
            className={inputClass}
          />
          {errors.name && <p className={errorClass}>{errors.name.message}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="company" className={labelClass}>
              Company
            </label>
            <input
              id="company"
              type="text"
              autoComplete="organization"
              {...register('company')}
              className={inputClass}
            />
            {errors.company && (
              <p className={errorClass}>{errors.company.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className={inputClass}
            />
            {errors.email && (
              <p className={errorClass}>{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register('phone')}
              className={inputClass}
            />
            {errors.phone && (
              <p className={errorClass}>{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="source" className={labelClass}>
              Source
            </label>
            <input
              id="source"
              type="text"
              placeholder="Website, Referral, LinkedIn…"
              {...register('source')}
              className={inputClass}
            />
            {errors.source && (
              <p className={errorClass}>{errors.source.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" {...register('status')} className={inputClass}>
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className={errorClass}>{errors.status.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="value" className={labelClass}>
              Value
            </label>
            <input
              id="value"
              type="text"
              inputMode="decimal"
              placeholder="0"
              {...register('value')}
              className={inputClass}
            />
            {errors.value && (
              <p className={errorClass}>{errors.value.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className={labelClass}>
            Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            {...register('notes')}
            className={inputClass}
          />
          {errors.notes && <p className={errorClass}>{errors.notes.message}</p>}
        </div>
      </div>

      {serverError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link
          to={cancelTo}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Spinner />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}

