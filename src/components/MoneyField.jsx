import { InputAdornment, TextField } from '@mui/material'
import { CURRENCY, groupInput } from '../lib/format'

/**
 * An amount field that groups digits as they are typed, so 45000000 reads
 * back as 45,000,000 while the value handed upward stays a plain number
 * string. Dinars take no decimals; dollars take two.
 */
export default function MoneyField({ currency = 'usd', value, onChange, ...props }) {
  const meta = CURRENCY[currency] ?? CURRENCY.usd

  const handle = (e) => {
    const grouped = groupInput(e.target.value, meta.decimals)
    onChange(grouped)
  }

  return (
    <TextField
      {...props}
      value={value ?? ''}
      onChange={handle}
      inputProps={{ dir: 'ltr', inputMode: 'decimal', ...(props.inputProps ?? {}) }}
      InputProps={{
        endAdornment: <InputAdornment position="end">{meta.short}</InputAdornment>,
        ...(props.InputProps ?? {}),
      }}
      sx={{
        '& input': { fontFamily: '"IBM Plex Sans", system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' },
        ...(props.sx ?? {}),
      }}
    />
  )
}
