import Link from 'next/link';

export default function JobSiteSnapLanding() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">
            JobSite Snap
          </div>
          <div className="flex items-center space-x-6">
            <Link href="#features" className="text-gray-700 hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-700 hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link 
              href="/login" 
              className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-amber-50 to-white">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-gray-900 leading-tight">
            Digitize Job Site Timecards.<br />
            <span className="text-primary">Instantly.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transform paper timecards into digital records
            with one click. Perfect for construction teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="px-8 py-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
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
            Built for Construction Teams
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard 
              icon="📱"
              title="Mobile First"
              description="工地现场直接拍照，随时随地记录"
            />
            <FeatureCard 
              icon="⏱️"
              title="Time Tracking"
              description="自动识别工时数据，精确到分钟"
            />
            <FeatureCard 
              icon="👷"
              title="Worker Management"
              description="管理工人考勤记录，一目了然"
            />
            <FeatureCard 
              icon="📈"
              title="Reports & Analytics"
              description="生成工时报表，数据分析"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Simple Workflow
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard 
              number="1"
              title="Snap Timecard"
              description="在工地上拍摄工时卡照片"
            />
            <StepCard 
              number="2"
              title="Auto Recognition"
              description="AI 自动识别工人姓名和工时"
            />
            <StepCard 
              number="3"
              title="Generate Reports"
              description="自动生成工时报表和工资单"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-white">
        <div className="container mx-auto text-center px-6">
          <h2 className="text-4xl font-bold mb-6">
            Start Digitizing Today
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join construction teams saving hours every week
          </p>
          <Link 
            href="/register"
            className="inline-block px-8 py-4 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started Free
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
