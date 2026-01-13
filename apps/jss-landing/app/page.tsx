import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>掌控全局</div>
          <h1 className={styles.title}>
            一个平台<br />
            掌控全局
          </h1>
          <p className={styles.subtitle}>
            实时监控 · 智能分析 · 精准决策<br />
            Control Every Project, Optimize Every Cost
          </p>
          <div className={styles.cta}>
            <a href="#" className={styles.ctaPrimary}>
              预约演示 Schedule Demo
            </a>
            <a href="#" className={styles.ctaSecondary}>
              查看案例 View Cases
            </a>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className={styles.dashboardPreview}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>项目总数</span>
            <span className={styles.metricValue}>24</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>成本节省</span>
            <span className={styles.metricValue}>18%</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>实时监控</span>
            <span className={styles.metricValue}>100%</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📊</div>
          <h3>实时项目健康</h3>
          <p>一目了然的项目状态监控</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>💰</div>
          <h3>智能成本分析</h3>
          <p>AI驱动的成本优化建议</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📈</div>
          <h3>物料流向追踪</h3>
          <p>完整的供应链可视化</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🎯</div>
          <h3>多项目仪表盘</h3>
          <p>统一管理所有项目</p>
        </div>
      </section>
    </main>
  );
}
