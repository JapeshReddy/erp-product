import React from 'react'
import Logo from './Logo'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

const AuthCard: React.FC<AuthCardProps> = ({ title, subtitle, children }) => (
  <div className="auth-wrapper">
    <div className="auth-card">
      <div className="auth-logo-area">
        <Logo />
      </div>
      <div className="auth-header">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
)

export default AuthCard
