'use client';

import { useEffect, useState } from 'react';
import styles from './Hero.module.css';

export const Hero = () => {
    const [scrollY, setScrollY] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);

        const handleScroll = () => {
            setScrollY(window.scrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const y1 = scrollY * 0.3;
    const y2 = scrollY * 0.5;
    const opacity = Math.max(0, 1 - scrollY / 300);

    return (
        <section className={styles.hero}>
            {/* Background layers for parallax */}
            <div
                className={styles.bgLayer1}
                style={{ transform: `translateY(${y1}px)` }}
            />
            <div
                className={styles.bgLayer2}
                style={{ transform: `translateY(${y2}px)` }}
            />

            {/* Content */}
            <div
                className={styles.content}
                style={{
                    opacity,
                    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'transform 0.8s ease-out'
                }}
            >
                <h1 className={styles.title}>
                    Construction Management
                    <br />
                    <span className={styles.titleAccent}>Reimagined</span>
                </h1>

                <p className={styles.subtitle}>
                    Luxury SaaS solutions that bring Apple-grade polish to the construction industry.
                    <br />
                    From receipt management to project oversight, we make complexity effortless.
                </p>

                <div className={styles.cta}>
                    <a href="#products" className={styles.ctaPrimary}>
                        Explore Products
                    </a>
                    <a href="#contact" className={styles.ctaSecondary}>
                        Get in Touch
                    </a>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className={styles.scrollIndicator}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
        </section>
    );
};
