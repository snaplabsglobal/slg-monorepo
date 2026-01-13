import { forwardRef, InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /** Input label */
    label?: string;

    /** Error message */
    error?: string;

    /** Helper text */
    helperText?: string;

    /** Full width */
    fullWidth?: boolean;
}

/**
 * Text input component with label and error states.
 * 
 * @example
 * ```tsx
 * <Input 
 *   label="Vendor Name" 
 *   placeholder="Enter vendor name"
 *   error={errors.vendor}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, fullWidth, className, ...props }, ref) => {
        const wrapperClass = [
            styles.wrapper,
            fullWidth && styles.fullWidth,
        ]
            .filter(Boolean)
            .join(' ');

        const inputClass = [
            styles.input,
            error && styles.error,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={wrapperClass}>
                {label && (
                    <label className={styles.label} htmlFor={props.id}>
                        {label}
                    </label>
                )}
                <input ref={ref} className={inputClass} {...props} />
                {error && <span className={styles.errorText}>{error}</span>}
                {helperText && !error && (
                    <span className={styles.helperText}>{helperText}</span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
