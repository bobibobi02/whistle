# i18n Setup

1. Install dependencies:
   ```
   npm install next-i18next react-i18next i18next
   ```
2. Create `next-i18next.config.js` in project root:
   ```js
   const { i18n } = require('./next-i18next.config');
   module.exports = {
     i18n,
     reactStrictMode: true,
     // other Next.js config...
   };
   ```
3. Wrap your app in `appWithTranslation` in `_app.tsx`:
   ```ts
   import { appWithTranslation } from 'next-i18next';
   function MyApp({ Component, pageProps }) {
     return <Component {...pageProps} />;
   }
   export default appWithTranslation(MyApp);
   ```
