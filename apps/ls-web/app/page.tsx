import Link from 'next/link';

export default function LedgerSnapLanding() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <nav className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          {/* Logo - shrink-0 to prevent squishing */}
          <div className="text-xl sm:text-2xl font-bold text-primary shrink-0">
            LedgerSnap
          </div>
          
          {/* Desktop Navigation - hidden on mobile, visible on md+ */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="#features" prefetch={false} className="text-gray-700 hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#pricing" prefetch={false} className="text-gray-700 hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link 
              href="/login" 
              prefetch={false}
              className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>

          {/* Mobile Login Button - visible on mobile, hidden on md+ */}
          {/* Using vibrant orange accent for visibility and easy tapping on construction sites */}
          <Link 
            href="/login"
            prefetch={false}
            className="md:hidden flex items-center justify-center w-12 h-12 rounded-lg border-2 border-orange-500 bg-orange-500 hover:bg-orange-600 transition-colors shadow-md active:scale-95"
            aria-label="Login"
          >
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
              />
            </svg>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 leading-tight">
            Snap Your Receipts.<br />
            Track Your Expenses.<br />
            <span className="text-primary">Effortlessly.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Turn receipt photos into organized expense reports 
            in seconds with AI-powered recognition.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              prefetch={false}
              className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <button className="px-8 py-4 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Everything You Need
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon="📸"
              title="Snap & Upload"
              description="拍照上传收据，自动识别"
            />
            <FeatureCard 
              icon="🤖"
              title="AI Recognition"
              description="AI 自动提取金额、日期、商家"
            />
            <FeatureCard 
              icon="📊"
              title="Smart Reports"
              description="自动生成费用报告"
            />
            <FeatureCard 
              icon="☁️"
              title="Cloud Storage"
              description="安全云端存储，随时访问"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard 
              number="1"
              title="Take a Photo"
              description="用手机拍摄收据或上传图片"
            />
            <StepCard 
              number="2"
              title="AI Processing"
              description="AI 自动识别并提取关键信息"
            />
            <StepCard 
              number="3"
              title="Get Organized"
              description="自动分类并生成费用报告"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto text-center px-6">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of users tracking expenses effortlessly
          </p>
          <Link 
            href="/register"
            prefetch={false}
            className="inline-block px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-400">© 2026 SnapLabs Global. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
