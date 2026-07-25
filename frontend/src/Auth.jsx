import { useState } from 'react'
import axios from 'axios'
import deviceImage from "./assets/Mobile.webp"; // background photo ko lagi
import { useNavigate } from "react-router-dom";

const API_BASE = 'http://127.0.0.1:8000/api'

// input field component — email, password, name sabai yehi use garcha
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
        className="w-full rounded-2xl border border-[#c3d7f0]/70 bg-[rgba(238,243,251,0.55)] px-4 py-3.5 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-500 focus:border-[#2f5fa8] focus:ring-2 focus:ring-[#2f5fa8]/20"
      />
    </label> 
  )
}

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup') // signup ki signin, default signup
  const [role, setRole] = useState('customer') // customer ki seller
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const isSignIn = mode === 'signin'

  // form submit garda backend call garne — login ki register, mode anusaar
  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (isSignIn) {
        // login call
        const response = await axios.post(`${API_BASE}/auth/login/`, {
          username: form.email,
          password: form.password,
        })
        localStorage.setItem('access_token', response.data.access)
        localStorage.setItem('refresh_token', response.data.refresh)

        // role check garera kaha redirect garne decide garne
        const who = await axios.get(`${API_BASE}/auth/whoami/`, {
          headers: { Authorization: `Bearer ${response.data.access}` },
        })

        if (who.data.role === 'seller') {
          navigate(who.data.is_seller_profile_complete ? '/seller-dashboard' : '/seller-onboarding')
        } else {
          const prefCheck = await axios.get(`${API_BASE}/auth/has-preferences/`, {
            headers: { Authorization: `Bearer ${response.data.access}` },
          })
          navigate(prefCheck.data.has_preferences ? '/homepage' : '/preferences')
        }
      } else {
        // register call
        await axios.post(`${API_BASE}/auth/register/`, {
          username: form.email,
          email: form.email,
          password: form.password,
          role: role,
          name: form.name,
        })
        setMode('signin')
        setError(`Welcome, ${form.name || 'there'}! Your account is ready. Please sign in.`)
      }
    } catch (err) {
      // backend bata aayeko error message dekhaune
      const data = err.response?.data
      const message = data?.detail || (data && Object.values(data)[0]) || 'Something went wrong. Please try again.'
      setError(Array.isArray(message) ? message[0] : String(message))
    } finally {
      setIsSubmitting(false)
    }
  }

  // form ko kunai field update garne generic function
  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const title = isSignIn ? 'Welcome back' : 'Create your account'
  const copy = isSignIn
    ? 'Use your email and password to continue securely.'
    : 'Create your account to get started with Nexora.'

  const isSuccessMessage = error.startsWith('Welcome')

  return (
    <main className="relative min-h-screen overflow-hidden text-slate-100">
      {/* photo maathi blue-tint overlay halera theme sanga blend garne */}
      <div className="absolute inset-0">
        <img
          src={deviceImage}
          alt="Smartphone and laptop showcase"
          className="h-full w-full object-cover object-[center_24%]"
        />
        {/* blue gradient overlay — photo lai blue theme sanga match garaune */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,26,58,0.75)_0%,rgba(23,49,87,0.55)_45%,rgba(47,95,168,0.35)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(147,180,224,0.25),transparent_35%)]" />
      </div>

      {/* subtle grid pattern, blue tone ma */}
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(195,215,240,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(195,215,240,0.15)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        {/* left side — animated NEXORA branding, letter by letter reveal */}
      <section className="relative hidden lg:flex items-center justify-center px-12">
        <div className="text-center">
          <div className="flex justify-center gap-1 sm:gap-2">
            {"NEXORA".split("").map((letter, index) => (
              <span
                key={index}
                className="text-7xl font-bold tracking-tight xl:text-8xl bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #93b4e0, #ffffff, #2f5fa8, #93b4e0)',
                  backgroundSize: '300% auto',
                  animation: `letterReveal 0.6s ease-out forwards, gradientShift 4s ease-in-out infinite`,
                  animationDelay: `${index * 0.12}s, ${0.6 + index * 0.12}s`,
                  opacity: 0,
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          <p
            className="mt-6 text-lg text-slate-200"
            style={{
              animation: 'letterReveal 0.8s ease-out forwards',
              animationDelay: '0.9s',
              opacity: 0,
            }}
          >
            Your trusted marketplace for smartphones and laptops
          </p>
        </div>
      </section>

        {/* form card — light background, photo ko upar */}
        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:-translate-x-8 lg:px-8 lg:py-0">
          <div className="mx-auto w-full max-w-[380px] rounded-[26px] border border-[#93b4e0]/40 bg-[rgba(238,243,251,0.35)] p-3 shadow-[0_20px_60px_-12px_rgba(11,26,58,0.55)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 sm:p-4">
            <div className="rounded-[20px] border border-[#93b4e0]/30 bg-[rgba(238,243,251,0.4)] p-4 backdrop-blur-lg transition-all duration-300 sm:p-5">
              <div className="flex items-center justify-between gap-3 pb-5">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl border border-[#93b4e0] bg-[#e3edfa] p-2 shadow-[0_0_24px_rgba(23,49,87,0.18)]">
                    <Logo />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Nexora</p>
                  </div>
                </div>
                {/* Sign In / Create Account toggle */}
                <div className="flex rounded-full border border-[#c3d7f0] bg-[#e3edfa] p-1">
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setError('') }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      !isSignIn ? 'bg-[#2f5fa8] text-white' : 'text-slate-600'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setError('') }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isSignIn ? 'bg-[#2f5fa8] text-white' : 'text-slate-600'
                    }`}
                  >
                    Sign In
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
                    {/* signup bela matra dekhine: role toggle + name field */}
                    {!isSignIn && (
                      <>
                        <div className="flex rounded-full border border-[#c3d7f0] bg-[#e3edfa] p-1">
                          <button
                            type="button"
                            onClick={() => setRole('customer')}
                            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                              role === 'customer' ? 'bg-[#2f5fa8] text-white' : 'text-slate-600'
                            }`}
                          >
                            I'm a Customer
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole('seller')}
                            className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition ${
                              role === 'seller' ? 'bg-[#2f5fa8] text-white' : 'text-slate-600'
                            }`}
                          >
                            I'm a Seller
                          </button>
                        </div>

                        <FloatingField
                          id="name"
                          label="Full Name"
                          value={form.name}
                          onChange={updateField('name')}
                          autoComplete="name"
                        />
                      </>
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

                    {/* error/success message, color le differentiate garne */}
                    {error && (
                      <p className={`text-sm font-medium ${isSuccessMessage ? 'text-green-700' : 'text-red-600'}`}>
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-2xl border border-[#93b4e0] bg-[linear-gradient(120deg,#93b4e0_0%,#c3d7f0_55%,#2f5fa8_100%)] px-4 py-3.5 text-sm font-semibold text-[#1a3a66] shadow-[0_0_28px_rgba(23,49,87,0.22)] transition duration-300 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-[#2f5fa8]/25 disabled:opacity-60"
                    >
                      <span className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] opacity-60 transition-transform duration-700 hover:translate-x-full" />
                      <span className="relative">
                        {isSubmitting
                          ? (isSignIn ? 'Signing in…' : 'Creating your account…')
                          : (isSignIn ? 'Continue to dashboard' : 'Create account')}
                      </span>
                      {isSubmitting && (
                        <span className="relative ml-3 h-2.5 w-2.5 animate-pulse rounded-full bg-[#1a3a66]" />
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

// Nexora logo, blue gradient sanga
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
          <stop stopColor="#93b4e0" />
          <stop offset="0.5" stopColor="#2f5fa8" />
          <stop offset="1" stopColor="#173157" />
        </linearGradient>
      </defs>

      <path d="M40 12L56 22L56 38L40 48L24 38L24 22L40 12Z" fill="url(#nexoraNodeGradient)" opacity="0.18" />
      <path d="M24 22L40 12L56 22L40 32L24 22Z" fill="url(#nexoraNodeGradient)" />
      <path d="M40 32L56 22V38L40 48V32Z" fill="url(#nexoraNodeGradient)" opacity="0.8" />
      <path d="M40 32L24 22V38L40 48V32Z" fill="url(#nexoraNodeGradient)" opacity="0.6" />
      <path d="M18 47L31 39L40 44L27 52L18 47Z" fill="url(#nexoraNodeGradient)" opacity="0.9" />
      <path d="M62 47L49 39L40 44L53 52L62 47Z" fill="url(#nexoraNodeGradient)" opacity="0.9" />
      <path d="M40 48L27 52L40 60L53 52L40 48Z" fill="url(#nexoraNodeGradient)" />
    </svg>
  )
}

export default Auth