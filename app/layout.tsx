// Root layout is intentionally minimal — <html> and <body> are rendered in
// app/[locale]/layout.tsx so that the locale-aware lang attribute can be set
// directly on the <html> element without a script-tag workaround.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
