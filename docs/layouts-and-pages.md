# Layouts and Pages

Source: https://nextjs.org/docs/app/getting-started/layouts-and-pages

## Creating a page

```tsx
export default function Page() {
  return <h1>Hello Next.js!</h1>
}
```

## Creating a layout

```tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Layout UI */}
        {/* Place children where you want to render a page or nested layout */}
        <main>{children}</main>
      </body>
    </html>
  )
}
```
