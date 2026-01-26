import Link from 'next/link';
import { Hero } from './components/Hero';
import { ProductShowcase } from './components/ProductShowcase';

export default function SnapLabsGlobalLanding() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-gray-900/80 backdrop-blur-md z-50 border-b border-gray-800">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-white">
            SnapLabs Global
          </div>
          <div className="flex items-center space-x-6">
            <Link href="#products" className="text-gray-300 hover:text-white transition-colors">
              Products
            </Link>
            <Link href="#about" className="text-gray-300 hover:text-white transition-colors">
              About
            </Link>
            <Link href="#contact" className="text-gray-300 hover:text-white transition-colors">
              Contact
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <Hero />

      {/* Products Section */}
      <ProductShowcase />

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-4xl font-bold text-center mb-8 text-gray-900">
            About SnapLabs Global
          </h2>
          <p className="text-lg text-gray-600 text-center mb-6">
            We build AI-powered tools that turn paper documents into digital workflows.
          </p>
          <p className="text-lg text-gray-600 text-center">
            Our mission is to simplify document management for businesses, 
            making it effortless to digitize, organize, and analyze paper-based processes.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-4xl font-bold mb-6 text-gray-900">
            Get in Touch
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Have questions? We'd love to hear from you.
          </p>
          <Link 
            href="mailto:contact@snaplabs.global"
            className="inline-block px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Products</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="https://dev.ledgersnap.app" className="hover:text-white transition-colors">
                    LedgerSnap
                  </Link>
                </li>
                <li>
                  <Link href="https://dev.jobsitesnap.app" className="hover:text-white transition-colors">
                    JobSite Snap
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="#about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2026 SnapLabs Global. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
