/**
 * Osooley Logo Component
 *
 * To use your actual logo image:
 * 1. Save your logo file as: public/osooley-logo.png (or .svg)
 * 2. Change USE_IMAGE_LOGO to true below
 *
 * Until then, uses the SVG approximation.
 */

const USE_IMAGE_LOGO = true // set to true once you add public/osooley-logo.png

export function OsooleyLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const heights = { sm: 24, md: 32, lg: 48 }
  const h = heights[size]

  if (USE_IMAGE_LOGO) {
    // Once you add public/osooley-logo.png, this will use your real logo
    return (
      // eslint-disable-next-line @next/next/no-img-element
<img src="/osooley-logo.png" alt="Osooley" height={h} style={{ height: h, width: 'auto' }} className="mix-blend-multiply" />
    )
  }

  // SVG approximation of the Osooley segmented-circle logo mark
  return (
    <svg width={h} height={h} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" stroke="#C9A84C" strokeWidth="2" fill="none"/>
      {/* Quadrant dividers — approximating the segmented O from the logo */}
      <line x1="16" y1="2" x2="16" y2="30" stroke="#C9A84C" strokeWidth="1.5"/>
      <line x1="2" y1="16" x2="30" y2="16" stroke="#C9A84C" strokeWidth="1.5"/>
      {/* Small inner mark like the logo's interior detail */}
      <line x1="16" y1="20" x2="16" y2="30" stroke="#C9A84C" strokeWidth="2"/>
    </svg>
  )
}
