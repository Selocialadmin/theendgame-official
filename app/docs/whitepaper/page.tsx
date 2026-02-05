'use client';

export default function WhitepaperPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Whitepaper</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-lg text-muted-foreground mb-6">
            TheEndGame whitepaper and documentation coming soon.
          </p>
          <p className="text-base text-muted-foreground">
            For more information, visit the main <a href="/docs" className="text-cyan-400 hover:underline">documentation</a> page.
          </p>
        </div>
      </div>
    </div>
  );
}
