import { Link, type LinkProps } from 'react-router'
import { buttonClassName, type ButtonVariant } from './buttonStyles'

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
}

/** Link chuyển trang nhưng trông như nút. Dùng khi hành động là "đi tới trang khác". */
export default function ButtonLink({ variant = 'primary', className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />
}
