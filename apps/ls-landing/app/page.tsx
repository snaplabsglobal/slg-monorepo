import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>效率利器</div>
          <h1 className={styles.title}>
            3秒完成收据处理
          </h1>
          <p className={styles.subtitle}>
            拍照 → AI识别 → 完成<br />
            Snap, Recognize, Done
          </p>
          <div className={styles.cta}>
            <a href="/camera" className={styles.ctaPrimary}>
              免费试用 Free Trial
            </a>
            <a href="#" className={styles.ctaSecondary}>
              观看演示 Watch Demo
            </a>
          </div>
        </div>

        {/* Speed indicator */}
        <div className={styles.speedIndicator}>
          <div className={styles.speedBar}>
            <div className={styles.speedFill}></div>
          </div>
          <span className={styles.speedText}>100% 准确 · 0延迟</span>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📸</div>
          <h3>瞬时启动</h3>
          <p>0延迟相机访问</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>🤖</div>
          <h3>AI识别</h3>
          <p>100%准确率</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>✓</div>
          <h3>滑动审批</h3>
          <p>一键完成</p>
        </div>
        <div className={styles.feature}>
          <div className={styles.featureIcon}>📱</div>
          <h3>离线优先</h3>
          <p>随时随地工作</p>
        </div>
      </section>
    </main>
  );
}
