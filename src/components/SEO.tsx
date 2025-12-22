import { Helmet, HelmetProvider } from 'react-helmet-async';

export const SEO = () => {
  return (
    <HelmetProvider>
      <Helmet>
        <title>SuperScreens</title>
        <meta name="description" content="Gerencie sua TV corporativa, crie playlists e engaje seus clientes com facilidade. Transforme suas telas em ferramentas de marketing." />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tv.supersellerbr.com/" />
        <meta property="og:title" content="SuperScreens" />
        <meta property="og:description" content="Gerencie sua TV corporativa, crie playlists e engaje seus clientes com facilidade. Transforme suas telas em ferramentas de marketing." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop&v=2" />
        <meta property="og:image:secure_url" content="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop&v=2" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="SuperScreens Dashboard em uma TV" />
        <meta property="og:site_name" content="SuperScreens" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://tv.supersellerbr.com/" />
        <meta property="twitter:title" content="SuperScreens" />
        <meta property="twitter:description" content="Gerencie sua TV corporativa, crie playlists e engaje seus clientes com facilidade." />
        <meta property="twitter:image" content="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200&auto=format&fit=crop&v=2" />
      </Helmet>
    </HelmetProvider>
  );
};