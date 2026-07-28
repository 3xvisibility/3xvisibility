import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function MentionsLegalesPage() {
  return (
    <>
      <Seo
        title="Mentions Légales"
        description="Informations légales relatives à l'éditeur et à l'hébergement du site 3XVISIBILITY."
        path="/mentions-legales"
      />
      <StaticPageLayout title="Mentions Légales" subtitle="Dernière mise à jour : Juillet 2026">
        <h2>1. Éditeur du site</h2>
        <p>
          Le site <strong>3xvisibility.com</strong> est édité par <strong>3XVISIBILITY</strong>.
          <br />
          Contact : <a href="mailto:info@3xvisibility.com">info@3xvisibility.com</a>
        </p>

        <h2>2. Directeur de la publication</h2>
        <p>
          Le directeur de la publication est le représentant légal de 3XVISIBILITY.
        </p>

        <h2>3. Hébergement</h2>
        <p>
          Le site est hébergé sur une infrastructure cloud sécurisée fournie par
          <strong> Lovable</strong> (frontend et distribution) et <strong>Supabase</strong>
          (base de données, authentification et fonctions serveur), avec réplication
          au sein de l'Union Européenne.
        </p>

        <h2>4. Propriété intellectuelle</h2>
        <p>
          L'ensemble du contenu présent sur le site 3xvisibility.com (textes, graphismes,
          logos, icônes, images, code source) est la propriété exclusive de 3XVISIBILITY,
          à l'exception des marques et logos appartenant à leurs propriétaires respectifs
          (WordPress, Shopify, PrestaShop, WooCommerce, Stripe, etc.).
        </p>
        <p>
          Toute reproduction, représentation, modification, publication ou adaptation
          totale ou partielle des éléments du site est interdite sans autorisation
          écrite préalable.
        </p>

        <h2>5. Données personnelles</h2>
        <p>
          Le traitement de vos données personnelles est décrit dans notre
          <a href="/confidentialite"> Politique de Confidentialité</a>.
        </p>

        <h2>6. Cookies</h2>
        <p>
          Seuls les cookies strictement nécessaires au fonctionnement du service sont
          utilisés (session utilisateur, préférences de langue et de thème). Aucun
          cookie de traçage publicitaire n'est déposé sans consentement.
        </p>

        <h2>7. Conditions d'utilisation</h2>
        <p>
          L'utilisation du service est régie par nos
          <a href="/cgv"> Conditions Générales de Vente</a>.
        </p>

        <h2>8. Loi applicable</h2>
        <p>
          Le site 3xvisibility.com et son utilisation sont soumis au droit français.
          Tout litige relève de la compétence exclusive des tribunaux français.
        </p>

        <h2>9. Contact</h2>
        <p>
          Pour toute question :
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
