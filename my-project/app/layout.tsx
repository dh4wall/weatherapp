export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en">
        <body className="bg-gray-900 text-white">{children}</body>
      </html>
    );
  }
  