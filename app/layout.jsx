export const metadata = {
  title: 'Domo Dither Tool',
  description: 'Generative dithering tool exploring flexible brand systems',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        overflow: 'hidden'
      }}>
        {children}
      </body>
    </html>
  );
}

