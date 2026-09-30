import type { ButtonHTMLAttributes } from 'react'
import { buttonClassName, type ButtonVariant } from './buttonStyles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

// Mặc định type="button" để nút không vô tình gửi form khi nằm trong <form>.
export default function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />
}
