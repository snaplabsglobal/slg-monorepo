import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl mb-4">Login</h1>
        <p className="mb-4">功能开发中...</p>
        <Link href="/" className="text-blue-600">返回首页</Link>
      </div>
    </div>
  )
}
