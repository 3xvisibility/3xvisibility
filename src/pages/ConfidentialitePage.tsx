import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function ConfidentialitePage() {
  return (
    <>
      <Seo
        title="Politique de Confidentialité"
        description="Comment 3XVISIBILITY collecte, utilise et protège vos données personnelles conformément au RGPD."
        path="/confidentialite"
      />
      <StaticPageLayout title="Politique de Confidentialité" subtitle="Dernière mise à jour : Juillet 2026">
        <h2>1. Introduction</h2>
        <p>
          La présente politique de confidentialité décrit comment 3XVISIBILITY (« nous »)
          collecte, utilise, stocke et protège les données personnelles des utilisateurs
          de sa plateforme SaaS, conformément au Règlement Général sur la Protection
          des Données (RGPD) et à la loi Informatique et Libertés.
        </p>

        <h2>2. Données collectées</h2>
        <ul>
          <li><strong>Compte :</strong> nom, prénom, email, mot de passe (chiffré), espace de travail</li>
          <li><strong>Contenus créés :</strong> templates, campagnes, groupes de mots-clés, pages générées</li>
          <li><strong>Identifiants de connexion tiers :</strong> tokens WordPress, Shopify, Google Search Console
              (chiffrés au repos)</li>
          <li><strong>Facturation :</strong> gérée par Stripe, aucune donnée bancaire n'est stockée sur nos serveurs</li>
          <li><strong>Données d'usage :</strong> pages générées, crédits IA consommés, journaux d'audit pour la sécurité</li>
        </ul>

        <h2>3. Finalités du traitement</h2>
        <ul>
          <li>Fournir et exécuter le service (génération, optimisation SEO, publication)</li>
          <li>Facturer les abonnements et gérer la relation client</li>
          <li>Améliorer la qualité et la sécurité du service</li>
          <li>Respecter nos obligations légales et comptables</li>
        </ul>

        <h2>4. Base légale</h2>
        <p>
          Les traitements sont fondés sur l'exécution du contrat (fourniture du service),
          notre intérêt légitime (sécurité, amélioration produit) et le respect
          d'obligations légales (facturation, journalisation de sécurité).
        </p>

        <h2>5. Sous-traitants</h2>
        <p>Nous faisons appel à des sous-traitants strictement nécessaires au fonctionnement du service :</p>
        <ul>
          <li><strong>Supabase</strong> — hébergement de la base de données et authentification</li>
          <li><strong>Stripe</strong> — traitement des paiements et facturation</li>
          <li><strong>Fournisseurs d'IA</strong> (Google Gemini, OpenAI, DeepSeek selon configuration) —
              génération de contenu et d'images</li>
          <li><strong>Resend / prestataire e-mail</strong> — envoi des e-mails transactionnels</li>
        </ul>

        <h2>6. Conservation des données</h2>
        <p>
          Vos données sont conservées le temps de votre abonnement actif. En cas de résiliation,
          les contenus sont supprimés ou anonymisés dans un délai de 30 jours, sauf obligations
          légales de conservation (factures : 10 ans).
        </p>

        <h2>7. Sécurité</h2>
        <p>
          Nous appliquons des mesures de sécurité robustes : chiffrement en transit (TLS)
          et au repos, isolation par workspace (Row-Level Security), journaux d'audit des
          accès sensibles, authentification forte, et détection des tentatives d'accès
          inter-workspaces.
        </p>

        <h2>8. Vos droits</h2>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul>
          <li>Droit d'accès, de rectification et de suppression</li>
          <li>Droit à la portabilité de vos données</li>
          <li>Droit d'opposition et de limitation du traitement</li>
          <li>Droit d'introduire une réclamation auprès de la CNIL</li>
        </ul>
        <p>
          Pour exercer ces droits :
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>

        <h2>9. Cookies</h2>
        <p>
          Nous utilisons uniquement les cookies strictement nécessaires au fonctionnement
          du service (session, préférences de langue, thème). Aucun cookie publicitaire
          n'est déposé sans consentement.
        </p>

        <h2>10. Contact</h2>
        <p>
          Pour toute question relative à la protection de vos données :
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
