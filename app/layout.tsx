export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // <html> and <body> must live in the root layout (Next.js 16 requirement).
  // suppressHydrationWarning lets app/[locale]/layout.tsx set the lang attribute
  // on the client without a hydration mismatch.
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
