import { cva, type VariantProps } from 'class-variance-authority';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const buttonStyles = cva('button inline-flex min-h-12 items-center justify-center gap-3 rounded-field border border-transparent px-5 py-3 text-sm leading-[1.4] font-bold transition-colors duration-150 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50', {
  variants: {
    variant: {
      primary: 'primary bg-brand text-brand-foreground hover:bg-brand-hover',
      secondary: 'secondary border-input bg-surface text-foreground hover:bg-surface-muted',
      text: 'text border-transparent bg-transparent px-2 py-2 text-brand hover:bg-brand-soft',
      danger: 'danger bg-danger text-white hover:bg-danger',
    },
  },
  defaultVariants: { variant: 'primary' },
});

type ButtonVariant = VariantProps<typeof buttonStyles>['variant'];
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({ variant, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonStyles({ variant }), className)} {...props} />;
}

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function LinkButton({ variant, className, ...props }: LinkButtonProps) {
  return <a className={cn(buttonStyles({ variant }), className)} {...props} />;
}

type IconButtonProps = Omit<ButtonProps, 'children'> & { label: string; icon: ReactNode };

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return <Button aria-label={label} className={cn('icon-button', className)} {...props}>{icon}</Button>;
}
