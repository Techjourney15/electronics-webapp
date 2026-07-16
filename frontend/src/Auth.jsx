import { useState } from 'react'
import deviceImage from './assets/Mobile.webp'

const brandPill = 'inline-flex items-center gap-2 rounded-full border border-[#d9c6a7] bg-[#f4eadc] px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[#6a5138]'

function FloatingField({ id, label, type = 'text', value, onChange, autoComplete }) {
  return (
    <label className="block">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={label}
        className="w-full rounded-2xl border border-[#dfd0b8]/70 bg-[rgba(251,247,239,0.55)] px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#9d7b55] focus:ring-2 focus:ring-[#9d7b55]/20"
      />
    </label> 
  )
}

function Auth() {
  const [mode, setMode] = useState('signin')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
  })

  const isSignIn = mode === 'signin'



  const handleSubmit = (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    window.setTimeout(() => {
      setIsSubmitting(false)
    }, 1400)
  }

  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const title = isSignIn ? 'Welcome back' : 'Create your account'
  const copy = isSignIn
    ? 'Use your email and password to continue securely.'
    : 'Create your account to get started with Nexora.'

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6efe3] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,176,126,0.28),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(141,109,72,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(95,74,44,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(95,74,44,0.06)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="absolute inset-0 animate-[pulse_10s_ease-in-out_infinite]">
        <img
          src={deviceImage}
          alt="Smartphone and laptop showcase"
          className="h-full w-full object-cover object-[center_24%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,239,227,0.24),rgba(246,239,227,0.08)_45%,rgba(246,239,227,0.25))]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <section className="hidden lg:block" />

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:-translate-x-8 lg:px-8 lg:py-0">
          <div className="mx-auto w-full max-w-[380px] rounded-[26px] border border-[#E6E1D5]/35 bg-[rgba(255,252,246,0.78)] p-3 shadow-[0_12px_48px_-12px_rgba(141,109,72,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 sm:p-4">
            <div className="rounded-[20px] border border-[#E6E1D5]/40 bg-[rgba(255,252,246,0.86)] p-4 backdrop-blur-lg transition-all duration-300 sm:p-5">
              <div className="flex items-center justify-between gap-3 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl border border-[#d9c6a7] bg-[#f7efe1] p-2 shadow-[0_0_24px_rgba(141,109,72,0.18)]">
                    <Logo />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Nexora</p>
                  </div>
                </div>
                <div className="flex rounded-full border border-[#e6d8bf] bg-[#f8f2e8] p-1">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isSignIn ? 'bg-[#a17c56] text-white' : 'text-slate-600'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      !isSignIn ? 'bg-[#a17c56] text-white' : 'text-slate-600'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              <div className="flex min-h-[340px] items-center py-2">
                <div className="w-full space-y-6 transition-all duration-300 ease-out">
                  <div className="space-y-3">
                    <h2 className="text-[1.75rem] font-semibold tracking-[-0.04em] text-slate-900 sm:text-[2rem]">
                      {title}
                    </h2>
                    {copy ? <p className="text-sm leading-6 text-slate-700">{copy}</p> : null}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isSignIn && (
                      <FloatingField
                        id="name"
                        label="Full Name"
                        value={form.name}
                        onChange={updateField('name')}
                        autoComplete="name"
                      />
                    )}

                    <FloatingField
                      id="email"
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={updateField('email')}
                      autoComplete="email"
                    />

                    <FloatingField
                      id="password"
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={updateField('password')}
                      autoComplete={isSignIn ? 'current-password' : 'new-password'}
                    />

                    <button
                      type="submit"
                      className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-[#d9c6a7] bg-[linear-gradient(120deg,#d9c6a7_0%,#f2e4cc_55%,#b69468_100%)] px-4 py-3.5 text-sm font-semibold text-[#4d3824] shadow-[0_0_28px_rgba(141,109,72,0.22)] transition duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#9d7b55]/25"
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] opacity-60 transition-transform duration-700 hover:translate-x-full" />
                      <span className="relative">
                        {isSubmitting ? 'Starting secure session…' : isSignIn ? 'Continue to dashboard' : 'Create account'}
                      </span>
                      {isSubmitting && (
                        <span className="relative ml-3 h-2.5 w-2.5 animate-pulse rounded-full bg-[#4d3824]" />
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function Logo() {
  return (
    <svg
      viewBox="0 0 80 80"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'float 6s ease-in-out infinite' }}
    >
      <defs>
        <linearGradient id="nexoraNodeGradient" x1="12" y1="10" x2="68" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d9c6a7" />
          <stop offset="0.5" stopColor="#9d7b55" />
          <stop offset="1" stopColor="#725539" />
        </linearGradient>
      </defs>

      <path
        d="M40 12L56 22L56 38L40 48L24 38L24 22L40 12Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.18"
      />
      <path
        d="M24 22L40 12L56 22L40 32L24 22Z"
        fill="url(#nexoraNodeGradient)"
      />
      <path
        d="M40 32L56 22V38L40 48V32Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.8"
      />
      <path
        d="M40 32L24 22V38L40 48V32Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.6"
      />
      <path
        d="M18 47L31 39L40 44L27 52L18 47Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.9"
      />
      <path
        d="M62 47L49 39L40 44L53 52L62 47Z"
        fill="url(#nexoraNodeGradient)"
        opacity="0.9"
      />
      <path
        d="M40 48L27 52L40 60L53 52L40 48Z"
        fill="url(#nexoraNodeGradient)"
      />
    </svg>
  )
}

export default Auth
