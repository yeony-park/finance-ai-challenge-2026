import type {
  FocusEventHandler,
  FormEventHandler,
  ReactNode,
} from "react";

import s from "./SearchField.module.css";

interface SearchFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly className?: string;
  readonly autoComplete?: string;
  readonly children?: ReactNode;
  readonly onChange: (value: string) => void;
  readonly onFocus?: FocusEventHandler<HTMLInputElement>;
  readonly onBlur?: FocusEventHandler<HTMLInputElement>;
  readonly onSubmit?: FormEventHandler<HTMLFormElement>;
}

export function SearchField({
  id,
  label,
  value,
  placeholder,
  className,
  autoComplete = "off",
  children,
  onChange,
  onFocus,
  onBlur,
  onSubmit,
}: SearchFieldProps) {
  return (
    <form
      className={`${s.field} ${className ?? ""}`}
      role="search"
      onSubmit={(event) => {
        if (onSubmit) {
          onSubmit(event);
          return;
        }
        event.preventDefault();
      }}
    >
      <label htmlFor={id} className={s.label}>
        {label}
      </label>
      <input
        id={id}
        className={s.input}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button type="submit" className={s.button} aria-label="검색">
        <svg className={s.icon} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
      </button>
      {children}
    </form>
  );
}
