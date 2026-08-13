type SearchFormProps = {
  action: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
  buttonLabel?: string;
};

export function SearchForm({
  action,
  defaultValue = "",
  placeholder,
  label,
  buttonLabel = "검색",
}: SearchFormProps) {
  return (
    <form className="catalog-search-form" action={action} role="search">
      <label className="sr-only" htmlFor={`${action}-query`}>{label}</label>
      <input
        id={`${action}-query`}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button type="submit">{buttonLabel}</button>
    </form>
  );
}
