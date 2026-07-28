import { Seo } from "@/components/Seo";
import { StaticPageLayout } from "@/components/landing/StaticPageLayout";

export default function CgvPage() {
  return (
    <>
      <Seo
        title="Conditions Générales de Vente (CGV)"
        description="Conditions générales de vente régissant l'utilisation des services de génération et publication de pages 3XVISIBILITY."
        path="/cgv"
      />
      <StaticPageLayout title="Conditions Générales de Vente" subtitle="Dernière mise à jour : Juillet 2026">
        <h2>1. Objet</h2>
        <p>
          Les présentes Conditions Générales de Vente (CGV) régissent la fourniture par 3XVISIBILITY
          de sa plateforme SaaS permettant la génération, l'optimisation SEO et la publication
          automatisée de pages web sur WordPress, Shopify, PrestaShop, WooCommerce et via HTML/CSS.
        </p>

        <h2>2. Éditeur</h2>
        <p>
          Le service est édité par 3XVISIBILITY. Toute question peut être adressée à
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>.
        </p>

        <h2>3. Souscription et abonnement</h2>
        <p>
          L'accès aux fonctionnalités payantes s'effectue par la souscription d'un abonnement
          mensuel ou annuel (plans Starter, Pro, Agency). Chaque nouvel abonné bénéficie
          d'une période d'essai gratuite de 30 jours, sans engagement, résiliable à tout moment
          avant la fin de la période d'essai sans facturation.
        </p>

        <h2>4. Prix et paiement</h2>
        <p>
          Les prix sont indiqués en euros hors taxes sur la page tarifs. Le paiement s'effectue
          par carte bancaire via notre prestataire Stripe. L'abonnement se renouvelle automatiquement
          à la fin de chaque période (mensuelle ou annuelle) jusqu'à résiliation par l'utilisateur.
        </p>

        <h2>5. Facturation</h2>
        <p>
          Une facture est automatiquement générée et envoyée par email à chaque paiement.
          L'ensemble des factures est consultable depuis la page Facturation de votre espace.
        </p>

        <h2>6. Résiliation et changement de plan</h2>
        <p>
          Vous pouvez à tout moment résilier votre abonnement ou changer de plan depuis la page
          Facturation. La résiliation prend effet à la fin de la période de facturation en cours.
          En cas de rétrogradation (downgrade), les nouvelles limites s'appliquent immédiatement
          tandis que la facturation ajustée intervient à la période suivante.
        </p>

        <h2>7. Droit de rétractation</h2>
        <p>
          Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation
          ne s'applique pas aux services pleinement exécutés avant la fin du délai de rétractation
          et dont l'exécution a commencé avec l'accord préalable exprès du consommateur.
          La période d'essai gratuite de 30 jours permet d'évaluer le service sans engagement.
        </p>

        <h2>8. Obligations de l'utilisateur</h2>
        <ul>
          <li>Ne pas utiliser le service à des fins de spam, malware ou de contenu illégal</li>
          <li>Respecter les conditions d'utilisation des plateformes tierces connectées
              (WordPress, Shopify, Google, etc.)</li>
          <li>Ne pas tenter de perturber, rétro-concevoir ou compromettre la sécurité du service</li>
          <li>Garantir la confidentialité de ses identifiants</li>
        </ul>

        <h2>9. Responsabilité</h2>
        <p>
          Le service est fourni « en l'état ». 3XVISIBILITY met en œuvre ses meilleurs efforts
          pour garantir la disponibilité et la performance du service, sans toutefois pouvoir
          être tenue responsable des dommages indirects (perte de trafic, perte d'exploitation,
          pénalités SEO liées à des pratiques utilisateur) résultant de l'utilisation du service.
        </p>

        <h2>10. Propriété intellectuelle</h2>
        <p>
          L'utilisateur reste propriétaire des contenus qu'il crée et publie via 3XVISIBILITY.
          La plateforme, ses modèles, son code et sa marque restent la propriété exclusive
          de 3XVISIBILITY.
        </p>

        <h2>11. Loi applicable</h2>
        <p>
          Les présentes CGV sont soumises au droit français. Tout litige relève de la compétence
          exclusive des tribunaux français.
        </p>

        <h2>12. Contact</h2>
        <p>
          Pour toute question relative aux présentes CGV :
          <a href="mailto:info@3xvisibility.com"> info@3xvisibility.com</a>
        </p>
      </StaticPageLayout>
    </>
  );
}
