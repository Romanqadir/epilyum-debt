import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Alert, Button, TextField } from '@mui/material'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { session } = useAuth()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { isSubmitting } } = useForm()

  if (session) return <Navigate to="/" replace />

  const submit = async ({ email, password }) => {
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError('ئیمەیل یان وشەی نهێنی هەڵەیە.')
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* the brand side carries the weight; the form stays quiet */}
      <div className="relative hidden overflow-hidden bg-navy-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <span
          aria-hidden
          className="pointer-events-none absolute -end-40 -top-40 size-[34rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(39,71,141,.55) 0%, rgba(7,26,68,0) 70%)' }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-52 -start-24 size-[30rem] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(164,192,255,.22) 0%, rgba(7,26,68,0) 70%)' }}
        />

        <p className="relative text-2xl font-bold tracking-tight text-white">EPILYUM</p>

        <div className="relative max-w-md">
          <h1 className="head text-4xl font-bold leading-tight text-white">
            فرۆشتن، قیست و خەرجی<br />لە یەک شوێن
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-accent-300/80">
            هەر ئامێرێک کە دەفرۆشرێت، هەر قیستێک کە وەردەگیرێت، و هەر دینارێک کە خەرج دەکرێت —
            هەمووی بە یەک ڕوانگەوە.
          </p>
        </div>

        <p className="relative text-[0.82rem] text-accent-300/50">
          Epilyum · Discover the convenience
        </p>
      </div>

      <div className="grid place-items-center px-6 py-12">
        <form onSubmit={handleSubmit(submit)} className="w-full max-w-sm">
          <p className="text-2xl font-bold tracking-tight text-brand-600 lg:hidden">EPILYUM</p>

          <h2 className="head mt-2 text-[1.6rem] font-semibold lg:mt-0">چوونەژوورەوە</h2>
          <p className="mt-1 text-[0.9rem] text-muted">
            بە هەژمارەکەی خۆت بچۆ ژوورەوە بۆ بەردەوامبوون.
          </p>

          <div className="mt-7 flex flex-col gap-4">
            <TextField label="ئیمەیل" type="email" fullWidth autoComplete="email"
              inputProps={{ dir: 'ltr' }} {...register('email', { required: true })} />
            <TextField label="وشەی نهێنی" type="password" fullWidth autoComplete="current-password"
              inputProps={{ dir: 'ltr' }} {...register('password', { required: true })} />

            {error && <Alert severity="error">{error}</Alert>}

            <Button type="submit" variant="contained" size="large" disabled={isSubmitting}
              sx={{ paddingBlock: 1.4 }}>
              {isSubmitting ? 'چاوەڕێ بکە…' : 'چوونەژوورەوە'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
