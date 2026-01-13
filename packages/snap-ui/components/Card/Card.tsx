import { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    /** Card variant */
    variant?: 'elevated' | 'flat' | 'interactive';

    /** Card content */
    children: ReactNode;

    /** Optional header */
    header?: ReactNode;

    /** Optional footer */
    footer?: ReactNode;
}

/**
 * Card component for content grouping.
 * 
 * @example
 * ```tsx
 * <Card variant="elevated" header={<h3>Receipt Details</h3>}>
 *   <p>Content goes here</p>
 * </Card>
 * ```
 */
export const Card = ({
    variant = 'elevated',
    children,
    header,
    footer,
    className,
    ...props
}: CardProps) => {
    const cardClass = [
        styles.card,
        styles[variant],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={cardClass} {...props}>
            {header && <div className={styles.header}>{header}</div>}
            <div className={styles.body}>{children}</div>
            {footer && <div className={styles.footer}>{footer}</div>}
        </div>
    );
};
