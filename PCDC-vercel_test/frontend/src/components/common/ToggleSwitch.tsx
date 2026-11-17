interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label: string
  description?: string
  id?: string
}

/**
 * An on/off pill switch for a single boolean option, used in place of a
 * plain checkbox + label row wherever that option reads like a feature
 * toggle (e.g. "Include a memo") rather than a form field.
 */
export default function ToggleSwitch({ checked, onChange, disabled, label, description, id }: ToggleSwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`mt-3 flex items-start justify-between gap-4 rounded-xl border p-4 text-sm transition first:mt-0 ${
        checked ? "border-[#bfdbfe] bg-[#eff6ff]" : "border-[#e6e8eb] bg-white"
      } ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
    >
      <span className="min-w-0">
        <span className="font-semibold text-[#111827]">{label}</span>
        {description ? <span className="mt-0.5 block text-[#6b7280]">{description}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span
          aria-hidden="true"
          className={`block h-6 w-11 rounded-full transition ${checked ? "bg-[#2563eb]" : "bg-[#d1d5db]"}`}
        />
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  )
}
