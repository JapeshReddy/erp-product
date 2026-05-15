import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  formatter?: (n: number) => string
  className?: string
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function AnimatedCounter({
  value,
  duration = 900,
  formatter = (n) => n.toLocaleString(),
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const startRef    = useRef<number | null>(null)
  const startValRef = useRef(0)
  const rafRef      = useRef<number | null>(null)

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayValue(value)
      return
    }

    // Cancel any running animation
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    startRef.current  = null
    startValRef.current = displayValue

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed  = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased    = easeOutQuart(progress)
      const current  = Math.round(startValRef.current + (value - startValRef.current) * eased)

      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatter(displayValue)}
    </span>
  )
}

// ─── String-aware animated value ─────────────────────────────────────────────
// Handles values like "₹12.5 L", "94.3%", "1,234" by extracting the numeric part

interface AnimatedValueProps {
  value: string | number
  className?: string
}

export function AnimatedValue({ value, className }: AnimatedValueProps) {
  const str = String(value)

  // If it's purely numeric or comma-separated numbers, animate it
  const numericOnly = str.replace(/,/g, '').replace(/[₹$€£]/g, '')
  const parsed = parseFloat(numericOnly)

  if (!isNaN(parsed) && isFinite(parsed)) {
    const prefix = str.match(/^[₹$€£]?/)?.[0] ?? ''
    const suffix = str.replace(/^[₹$€£\d.,\s]+/, '')

    return (
      <span className={className}>
        {prefix}
        <AnimatedCounter
          value={parsed}
          formatter={(n) => {
            if (str.includes(',')) return n.toLocaleString()
            if (numericOnly.includes('.')) return n.toFixed(1)
            return String(n)
          }}
        />
        {suffix}
      </span>
    )
  }

  return <span className={className}>{value}</span>
}

export default AnimatedCounter
