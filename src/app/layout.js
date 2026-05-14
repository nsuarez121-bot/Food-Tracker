export const metadata = {
  title: "Food Tracker",
  description: "Nico and Kathie's home food tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#faf8f4", fontFamily: "Georgia, serif" }}>
        {children}
      </body>
    </html>
  );
}
