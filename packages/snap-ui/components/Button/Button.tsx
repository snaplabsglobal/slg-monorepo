import { forwardRef, ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button style variant */
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';

    /** Button size */
    size?: 'sm' | 'md' | 'lg';

    /** Button content */
    children: React.ReactNode;

    /** Disabled state */
    disabled?: boolean;
}

/**
 * Primary button component for user actions.
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleSubmit}>
 *   Submit
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', children, className, ...props }, ref) => {
        const classNames = [
            styles.btn,
            styles[variant],
            styles[size],
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button ref={ref} className={classNames} {...props}>
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';
