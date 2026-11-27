/**
 * ButtonLink — a link (react-router `Link` for `to`, `<a>` for `href`) that looks
 * exactly like Button. Use for navigation that should read as an action.
 */
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '../cx';
import { ButtonIcon, type ButtonProps } from './Button';
import { buttonClasses } from './buttonClasses';

type ButtonLinkStyleProps = Pick<ButtonProps, 'variant' | 'color' | 'size' | 'startIcon' | 'endIcon'>;

export type ButtonLinkProps = ButtonLinkStyleProps &
  (
    | (Omit<LinkProps, 'color'> & { to: LinkProps['to']; href?: never })
    | (Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'color'> & { href: string; to?: never })
  );

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'contained', color = 'primary', size = 'medium', startIcon, endIcon, className, children, ...rest },
  ref,
) {
  const classes = cx(
    buttonClasses({ variant, color, size }),
    variant === 'contained' && color === 'primary' && size === 'medium' ? '!h-10' : '',
    className,
  );
  const content = (
    <>
      {startIcon && <ButtonIcon>{startIcon}</ButtonIcon>}
      {children}
      {endIcon && <ButtonIcon>{endIcon}</ButtonIcon>}
    </>
  );
  if ('to' in rest && rest.to !== undefined) {
    return (
      <Link ref={ref} className={classes} {...(rest as LinkProps)}>
        {content}
      </Link>
    );
  }
  return (
    <a ref={ref} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
      {content}
    </a>
  );
});
