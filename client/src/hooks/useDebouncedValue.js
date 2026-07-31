import { useEffect, useState } from "react";

// Lags `value` by `delayMs` — used to hold off validation-error messages
// until the user pauses typing, instead of flashing "invalid" on every
// keystroke. Only the error text should read the debounced value; a submit
// button's disabled state should keep reading the live value so it enables
// the instant the input is actually valid.
export function useDebouncedValue(value, delayMs = 1200) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
