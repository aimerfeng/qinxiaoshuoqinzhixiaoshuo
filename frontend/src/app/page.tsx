import { APP_NAME, APP_DESCRIPTION } from '@/constants';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="text-center">
        <h1 className="gradient-text mb-4 text-4xl font-bold md:text-6xl">{APP_NAME}</h1>
        <p className="mb-8 text-lg text-muted-foreground">{APP_DESCRIPTION}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button className="btn btn-primary px-8 py-3">开始阅读</button>
          <button className="btn btn-outline px-8 py-3">开始创作</button>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      </div>
    </main>
  );
}
