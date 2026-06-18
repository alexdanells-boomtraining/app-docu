# Font Optimization

Source: https://nextjs.org/docs/app/getting-started/fonts

The `next/font` module automatically optimizes your fonts and removes external network requests for improved privacy and performance. It includes built-in self-hosting for any font file.

## Google fonts

Import your chosen font from `next/font/google`:

```tsx filename="app/layout.tsx"
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={geist.className}>
      <body>{children}</body>
    </html>
  )
}
```

Use [variable fonts](https://fonts.google.com/variablefonts) for best performance. If you can't, specify a weight:

```tsx
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
})
```

## Local fonts

```tsx filename="app/layout.tsx"
import localFont from 'next/font/local'

const myFont = localFont({
  src: './my-font.woff2',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={myFont.className}>
      <body>{children}</body>
    </html>
  )
}
```

Multiple files for one font family:

```js
const roboto = localFont({
  src: [
    { path: './Roboto-Regular.woff2', weight: '400', style: 'normal' },
    { path: './Roboto-Italic.woff2', weight: '400', style: 'italic' },
    { path: './Roboto-Bold.woff2', weight: '700', style: 'normal' },
    { path: './Roboto-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
})
```
