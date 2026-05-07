import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/auth'
import logoImg from '@/assets/branding/logo.png'

interface LogoProps {
  href?: string
  className?: string
}

const Logo: React.FC<LogoProps> = ({ href = ROUTES.SIGN_IN, className = '' }) => (
  <Link to={href} className={`logo-placeholder ${className}`}>
    <img
      src={logoImg}
      alt="Varun ERP Solutions"
      className="auth-logo-img"
    />
  </Link>
)

export default Logo