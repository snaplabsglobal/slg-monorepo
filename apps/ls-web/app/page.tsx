import { CameraCapture } from './components/CameraCapture';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <CameraCapture jobId="MOBILE-TEST-V1" />
    </main>
  );
}
