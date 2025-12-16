import { COLORS, FONTS } from './constants/design';

export const metadata = {
  title: 'Halftone Lab',
  description: 'Generative dithering and halftone pattern tool',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={COLORS.bg.primary} />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        fontFamily: FONTS.ui,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        overflow: 'hidden',
        backgroundColor: COLORS.bg.primary
      }}>
        {children}
      </body>
    </html>
  );
}
