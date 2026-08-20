import React from 'react';
import { Input } from '@/components/ui/input';
import { formatWithCommas, stripFormatting } from '@/lib/numberFormat';

type NumericInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> & {
  /** Raw (unformatted) value as string. */
  value: string;
  /** Receives the raw, unformatted value. */
  onChange: (raw: string) => void;
};

/**
 * Price/amount input with automatic 3-digit comma grouping while typing.
 * The parent always receives/stores the plain unformatted value.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, ...rest }, ref) => (
    <Input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      value={formatWithCommas(value)}
      onChange={(e) => onChange(stripFormatting(e.target.value))}
    />
  ),
);
NumericInput.displayName = 'NumericInput';
