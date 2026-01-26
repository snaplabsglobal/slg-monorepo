'use client';

import { useEffect, useState } from 'react';
import styles from './ProductShowcase.module.css';

const products = [
    {
        name: 'LedgerSnap',
        tagline: 'The Edge',
        description: 'Mobile-first receipt management with AI-powered recognition. Snap, verify, approve—all in seconds.',
        features: [
            'Instant camera access',
            'AI receipt analysis',
            'Swipe-to-approve interface',
            'Offline-first architecture',
        ],
        color: '#007AFF',
    },
    {
        name: 'JobSite Snap',
        tagline: 'The Core',
        description: 'Construction project management dashboard with real-time insights and breathing data visualization.',
        features: [
            'Real-time project health',
            'Receipt gallery & management',
            'Advanced filtering & search',
            'Animated data visualizations',
        ],
        color: '#00C805',
    },
];

export const ProductShowcase = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsVisible(true);
                    }
                });
            },
            { threshold: 0.1 }
        );

        const section = document.getElementById('products');
        if (section) {
            observer.observe(section);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <section id="products" className={styles.showcase}>
            <div className={styles.container}>
                <div className={`${styles.header} ${isVisible ? styles.visible : ''}`}>
                    <h2 className={styles.title}>Our Products</h2>
                    <p className={styles.subtitle}>
                        Two powerful tools, one unified vision: making construction management effortless.
                    </p>
                </div>

                <div className={styles.products}>
                    {products.map((product, index) => (
                        <div
                            key={product.name}
                            className={`${styles.productCard} ${isVisible ? styles.visible : ''}`}
                            style={{ transitionDelay: `${index * 0.2}s` }}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.productName}>{product.name}</h3>
                                <span className={styles.tagline}>{product.tagline}</span>
                            </div>

                            <p className={styles.description}>{product.description}</p>

                            <ul className={styles.features}>
                                {product.features.map((feature) => (
                                    <li key={feature} className={styles.feature}>
                                        <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M16.6667 5L7.50004 14.1667L3.33337 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <a
                                href={`#${product.name.toLowerCase()}`}
                                className={styles.learnMore}
                            >
                                Learn More
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
