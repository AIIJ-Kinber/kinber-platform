export default function LegalPage() {
  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        <header>
          <h1 className="text-3xl font-bold mb-4">Legal Information</h1>
          <p className="text-sm text-muted-foreground">
            Below you can find the Terms of Service and Privacy Policy for Kinber.
          </p>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Terms of Service</h2>
          <p className="text-sm leading-relaxed">
            By using Kinber, you agree to follow our terms and use the service responsibly.
            Features may change during the MVP stage.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Privacy Policy</h2>
          <p className="text-sm leading-relaxed">
            Kinber processes minimal necessary data such as account info, message logs,
            and file metadata. Sensitive files should only be uploaded if you are
            comfortable doing so.
          </p>
          <p className="text-sm leading-relaxed">
            Questions? Email:
            <br />
            <span className="font-medium">support@kinber.com</span>
          </p>
        </section>

      </div>
    </main>
  );
}
