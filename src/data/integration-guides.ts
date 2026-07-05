import type { Language } from "@/i18n/translations";

export interface GuideStep {
  title: string;
  desc: string;
  bullets: string[];
}

export interface GuideQA {
  q: string;
  a: string;
}

export interface GuideContent {
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  beforeYouStart: string;
  prereqs: string[];
  stepByStep: string;
  stepLabel: string;
  steps: GuideStep[];
  troubleshooting: string;
  troubleshoot: GuideQA[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

type LocalizedGuide = Partial<Record<Language, GuideContent>> & { en: GuideContent };

export const wordpressGuide: LocalizedGuide = {
  en: {
    badge: "WordPress Integration",
    heroTitle: "Connect your WordPress site",
    heroSubtitle:
      "Link WordPress in under 5 minutes and start publishing pages directly from 3XVISIBILITY — no plugins to install.",
    beforeYouStart: "Before you start",
    prereqs: [
      "A self-hosted WordPress site (version 5.6 or newer).",
      "An admin account on that WordPress site.",
      "The REST API enabled (it is on by default on most installs).",
    ],
    stepByStep: "Step-by-step setup",
    stepLabel: "Step",
    steps: [
      {
        title: "Create a WordPress Application Password",
        desc: "Application Passwords let 3XVISIBILITY publish pages securely without sharing your main login.",
        bullets: [
          "Log in to your WordPress admin dashboard (yoursite.com/wp-admin).",
          "Go to Users → Profile (or Users → Your Profile).",
          "Scroll down to the Application Passwords section.",
          "Type a name like “3XVISIBILITY” and click Add New Application Password.",
          "Copy the generated password immediately — WordPress shows it only once.",
        ],
      },
      {
        title: "Open the Websites page in 3XVISIBILITY",
        desc: "This is where every connected site lives.",
        bullets: [
          "From the sidebar, click Websites.",
          "Click the Connect Website button in the top-right.",
          "Choose WordPress from the platform dropdown.",
        ],
      },
      {
        title: "Enter your site details",
        desc: "Fill in the connection form with your site and the credentials you just created.",
        bullets: [
          "Site name: anything you like (e.g. “My Blog”).",
          "Site URL: your full site address, including https:// (e.g. https://yoursite.com).",
          "Auth method: keep Application Password (recommended).",
          "Username: your WordPress admin username.",
          "Application Password: paste the password copied in step 1.",
        ],
      },
      {
        title: "Test and save the connection",
        desc: "We verify the credentials before storing anything.",
        bullets: [
          "Pick the site's primary language (or use Auto-detect from site).",
          "Click Connect / Save.",
          "A green “Connected” badge confirms everything works.",
        ],
      },
      {
        title: "Start publishing",
        desc: "Your WordPress site is now a publishing target for any campaign.",
        bullets: [
          "Build or import a template, add your data, and run a campaign.",
          "Generated pages are pushed straight to WordPress as drafts or published posts.",
          "Re-run anytime — new rows become new pages automatically.",
        ],
      },
    ],
    troubleshooting: "Troubleshooting",
    troubleshoot: [
      {
        q: "“401 / Unauthorized” error",
        a: "Double-check the username and re-paste the Application Password (no spaces). Make sure you used an Application Password, not your normal login password.",
      },
      {
        q: "“SSL / SNI” or certificate error",
        a: "Confirm whether your site needs the www prefix in the URL. If it is an SNI mismatch, contact your hosting provider to align the SSL certificate.",
      },
      {
        q: "Application Passwords section is missing",
        a: "Update WordPress to 5.6 or newer, and make sure your site is served over HTTPS — Application Passwords are disabled on non-secure sites.",
      },
      {
        q: "Pages not appearing on the site",
        a: "Check that the REST API is reachable at yoursite.com/wp-json. Some security plugins block it — temporarily allow REST access and reconnect.",
      },
    ],
    ctaTitle: "Ready to connect?",
    ctaSubtitle: "Open the app, head to Websites, and connect WordPress in a few clicks.",
    ctaPrimary: "Go to the app",
    ctaSecondary: "Connect Shopify instead",
  },
  fr: {
    badge: "Intégration WordPress",
    heroTitle: "Connectez votre site WordPress",
    heroSubtitle:
      "Reliez WordPress en moins de 5 minutes et commencez à publier des pages directement depuis 3XVISIBILITY — sans aucun plugin à installer.",
    beforeYouStart: "Avant de commencer",
    prereqs: [
      "Un site WordPress auto-hébergé (version 5.6 ou plus récente).",
      "Un compte administrateur sur ce site WordPress.",
      "L'API REST activée (elle l'est par défaut sur la plupart des installations).",
    ],
    stepByStep: "Configuration étape par étape",
    stepLabel: "Étape",
    steps: [
      {
        title: "Créer un mot de passe d'application WordPress",
        desc: "Les mots de passe d'application permettent à 3XVISIBILITY de publier des pages en toute sécurité sans partager votre identifiant principal.",
        bullets: [
          "Connectez-vous au tableau de bord d'administration WordPress (votresite.com/wp-admin).",
          "Allez dans Utilisateurs → Profil (ou Utilisateurs → Votre profil).",
          "Faites défiler jusqu'à la section Mots de passe d'application.",
          "Saisissez un nom comme « 3XVISIBILITY » et cliquez sur Ajouter un nouveau mot de passe d'application.",
          "Copiez immédiatement le mot de passe généré — WordPress ne l'affiche qu'une seule fois.",
        ],
      },
      {
        title: "Ouvrez la page Sites web dans 3XVISIBILITY",
        desc: "C'est là que se trouvent tous les sites connectés.",
        bullets: [
          "Dans la barre latérale, cliquez sur Sites web.",
          "Cliquez sur le bouton Connecter un site web en haut à droite.",
          "Choisissez WordPress dans le menu déroulant des plateformes.",
        ],
      },
      {
        title: "Saisissez les détails de votre site",
        desc: "Remplissez le formulaire de connexion avec votre site et les identifiants que vous venez de créer.",
        bullets: [
          "Nom du site : ce que vous voulez (par ex. « Mon blog »).",
          "URL du site : l'adresse complète, avec https:// (par ex. https://votresite.com).",
          "Méthode d'authentification : conservez Mot de passe d'application (recommandé).",
          "Nom d'utilisateur : votre nom d'utilisateur administrateur WordPress.",
          "Mot de passe d'application : collez le mot de passe copié à l'étape 1.",
        ],
      },
      {
        title: "Testez et enregistrez la connexion",
        desc: "Nous vérifions les identifiants avant de stocker quoi que ce soit.",
        bullets: [
          "Choisissez la langue principale du site (ou utilisez la détection automatique).",
          "Cliquez sur Connecter / Enregistrer.",
          "Un badge vert « Connecté » confirme que tout fonctionne.",
        ],
      },
      {
        title: "Commencez à publier",
        desc: "Votre site WordPress est désormais une cible de publication pour toute campagne.",
        bullets: [
          "Créez ou importez un modèle, ajoutez vos données et lancez une campagne.",
          "Les pages générées sont envoyées directement vers WordPress en brouillon ou publiées.",
          "Relancez à tout moment — les nouvelles lignes deviennent automatiquement de nouvelles pages.",
        ],
      },
    ],
    troubleshooting: "Dépannage",
    troubleshoot: [
      {
        q: "Erreur « 401 / Non autorisé »",
        a: "Vérifiez le nom d'utilisateur et recollez le mot de passe d'application (sans espaces). Assurez-vous d'avoir utilisé un mot de passe d'application, pas votre mot de passe de connexion habituel.",
      },
      {
        q: "Erreur « SSL / SNI » ou de certificat",
        a: "Vérifiez si votre site nécessite le préfixe www dans l'URL. En cas de non-concordance SNI, contactez votre hébergeur pour aligner le certificat SSL.",
      },
      {
        q: "La section Mots de passe d'application est absente",
        a: "Mettez WordPress à jour vers la version 5.6 ou plus récente, et assurez-vous que votre site est servi en HTTPS — les mots de passe d'application sont désactivés sur les sites non sécurisés.",
      },
      {
        q: "Les pages n'apparaissent pas sur le site",
        a: "Vérifiez que l'API REST est accessible à votresite.com/wp-json. Certains plugins de sécurité la bloquent — autorisez temporairement l'accès REST et reconnectez-vous.",
      },
    ],
    ctaTitle: "Prêt à vous connecter ?",
    ctaSubtitle: "Ouvrez l'application, allez dans Sites web et connectez WordPress en quelques clics.",
    ctaPrimary: "Accéder à l'application",
    ctaSecondary: "Connecter Shopify à la place",
  },
  de: {
    badge: "WordPress-Integration",
    heroTitle: "Verbinden Sie Ihre WordPress-Website",
    heroSubtitle:
      "Verbinden Sie WordPress in unter 5 Minuten und veröffentlichen Sie Seiten direkt aus 3XVISIBILITY — ohne Plugins zu installieren.",
    beforeYouStart: "Bevor Sie beginnen",
    prereqs: [
      "Eine selbst gehostete WordPress-Website (Version 5.6 oder neuer).",
      "Ein Administratorkonto auf dieser WordPress-Website.",
      "Die aktivierte REST-API (bei den meisten Installationen standardmäßig aktiv).",
    ],
    stepByStep: "Schritt-für-Schritt-Einrichtung",
    stepLabel: "Schritt",
    steps: [
      {
        title: "Ein WordPress-Anwendungspasswort erstellen",
        desc: "Anwendungspasswörter ermöglichen es 3XVISIBILITY, Seiten sicher zu veröffentlichen, ohne Ihren Haupt-Login zu teilen.",
        bullets: [
          "Melden Sie sich im WordPress-Admin-Dashboard an (ihreseite.com/wp-admin).",
          "Gehen Sie zu Benutzer → Profil (oder Benutzer → Ihr Profil).",
          "Scrollen Sie nach unten zum Abschnitt Anwendungspasswörter.",
          "Geben Sie einen Namen wie „3XVISIBILITY“ ein und klicken Sie auf Neues Anwendungspasswort hinzufügen.",
          "Kopieren Sie das generierte Passwort sofort — WordPress zeigt es nur einmal an.",
        ],
      },
      {
        title: "Öffnen Sie die Seite Websites in 3XVISIBILITY",
        desc: "Hier befinden sich alle verbundenen Websites.",
        bullets: [
          "Klicken Sie in der Seitenleiste auf Websites.",
          "Klicken Sie oben rechts auf die Schaltfläche Website verbinden.",
          "Wählen Sie WordPress aus dem Plattform-Dropdown.",
        ],
      },
      {
        title: "Geben Sie Ihre Website-Details ein",
        desc: "Füllen Sie das Verbindungsformular mit Ihrer Website und den soeben erstellten Zugangsdaten aus.",
        bullets: [
          "Website-Name: beliebig (z. B. „Mein Blog“).",
          "Website-URL: die vollständige Adresse inklusive https:// (z. B. https://ihreseite.com).",
          "Authentifizierungsmethode: Anwendungspasswort beibehalten (empfohlen).",
          "Benutzername: Ihr WordPress-Admin-Benutzername.",
          "Anwendungspasswort: Fügen Sie das in Schritt 1 kopierte Passwort ein.",
        ],
      },
      {
        title: "Verbindung testen und speichern",
        desc: "Wir überprüfen die Zugangsdaten, bevor irgendetwas gespeichert wird.",
        bullets: [
          "Wählen Sie die Hauptsprache der Website (oder nutzen Sie die automatische Erkennung).",
          "Klicken Sie auf Verbinden / Speichern.",
          "Ein grünes „Verbunden“-Abzeichen bestätigt, dass alles funktioniert.",
        ],
      },
      {
        title: "Mit dem Veröffentlichen beginnen",
        desc: "Ihre WordPress-Website ist jetzt ein Veröffentlichungsziel für jede Kampagne.",
        bullets: [
          "Erstellen oder importieren Sie eine Vorlage, fügen Sie Ihre Daten hinzu und starten Sie eine Kampagne.",
          "Generierte Seiten werden direkt als Entwürfe oder veröffentlichte Beiträge an WordPress gesendet.",
          "Jederzeit erneut ausführen — neue Zeilen werden automatisch zu neuen Seiten.",
        ],
      },
    ],
    troubleshooting: "Fehlerbehebung",
    troubleshoot: [
      {
        q: "Fehler „401 / Nicht autorisiert“",
        a: "Überprüfen Sie den Benutzernamen und fügen Sie das Anwendungspasswort erneut ein (ohne Leerzeichen). Stellen Sie sicher, dass Sie ein Anwendungspasswort verwendet haben, nicht Ihr normales Login-Passwort.",
      },
      {
        q: "Fehler „SSL / SNI“ oder Zertifikatsfehler",
        a: "Prüfen Sie, ob Ihre Website das www-Präfix in der URL benötigt. Bei einer SNI-Nichtübereinstimmung wenden Sie sich an Ihren Hosting-Anbieter, um das SSL-Zertifikat anzupassen.",
      },
      {
        q: "Der Abschnitt Anwendungspasswörter fehlt",
        a: "Aktualisieren Sie WordPress auf Version 5.6 oder neuer und stellen Sie sicher, dass Ihre Website über HTTPS bereitgestellt wird — Anwendungspasswörter sind auf unsicheren Websites deaktiviert.",
      },
      {
        q: "Seiten erscheinen nicht auf der Website",
        a: "Prüfen Sie, ob die REST-API unter ihreseite.com/wp-json erreichbar ist. Einige Sicherheits-Plugins blockieren sie — erlauben Sie vorübergehend den REST-Zugriff und verbinden Sie sich erneut.",
      },
    ],
    ctaTitle: "Bereit zum Verbinden?",
    ctaSubtitle: "Öffnen Sie die App, gehen Sie zu Websites und verbinden Sie WordPress mit wenigen Klicks.",
    ctaPrimary: "Zur App",
    ctaSecondary: "Stattdessen Shopify verbinden",
  },
  es: {
    badge: "Integración con WordPress",
    heroTitle: "Conecta tu sitio WordPress",
    heroSubtitle:
      "Conecta WordPress en menos de 5 minutos y empieza a publicar páginas directamente desde 3XVISIBILITY — sin plugins que instalar.",
    beforeYouStart: "Antes de empezar",
    prereqs: [
      "Un sitio WordPress autoalojado (versión 5.6 o más reciente).",
      "Una cuenta de administrador en ese sitio WordPress.",
      "La API REST habilitada (está activada por defecto en la mayoría de instalaciones).",
    ],
    stepByStep: "Configuración paso a paso",
    stepLabel: "Paso",
    steps: [
      {
        title: "Crear una contraseña de aplicación de WordPress",
        desc: "Las contraseñas de aplicación permiten a 3XVISIBILITY publicar páginas de forma segura sin compartir tu inicio de sesión principal.",
        bullets: [
          "Inicia sesión en el panel de administración de WordPress (tusitio.com/wp-admin).",
          "Ve a Usuarios → Perfil (o Usuarios → Tu perfil).",
          "Desplázate hasta la sección Contraseñas de aplicación.",
          "Escribe un nombre como «3XVISIBILITY» y haz clic en Añadir nueva contraseña de aplicación.",
          "Copia la contraseña generada inmediatamente — WordPress solo la muestra una vez.",
        ],
      },
      {
        title: "Abre la página Sitios web en 3XVISIBILITY",
        desc: "Aquí se encuentran todos los sitios conectados.",
        bullets: [
          "En la barra lateral, haz clic en Sitios web.",
          "Haz clic en el botón Conectar sitio web en la parte superior derecha.",
          "Elige WordPress en el menú desplegable de plataformas.",
        ],
      },
      {
        title: "Introduce los datos de tu sitio",
        desc: "Completa el formulario de conexión con tu sitio y las credenciales que acabas de crear.",
        bullets: [
          "Nombre del sitio: lo que quieras (p. ej. «Mi blog»).",
          "URL del sitio: la dirección completa, incluyendo https:// (p. ej. https://tusitio.com).",
          "Método de autenticación: mantén Contraseña de aplicación (recomendado).",
          "Nombre de usuario: tu nombre de usuario de administrador de WordPress.",
          "Contraseña de aplicación: pega la contraseña copiada en el paso 1.",
        ],
      },
      {
        title: "Prueba y guarda la conexión",
        desc: "Verificamos las credenciales antes de almacenar nada.",
        bullets: [
          "Elige el idioma principal del sitio (o usa la detección automática).",
          "Haz clic en Conectar / Guardar.",
          "Una insignia verde «Conectado» confirma que todo funciona.",
        ],
      },
      {
        title: "Empieza a publicar",
        desc: "Tu sitio WordPress ahora es un destino de publicación para cualquier campaña.",
        bullets: [
          "Crea o importa una plantilla, añade tus datos y ejecuta una campaña.",
          "Las páginas generadas se envían directamente a WordPress como borradores o publicadas.",
          "Vuelve a ejecutar cuando quieras — las nuevas filas se convierten en nuevas páginas automáticamente.",
        ],
      },
    ],
    troubleshooting: "Solución de problemas",
    troubleshoot: [
      {
        q: "Error «401 / No autorizado»",
        a: "Comprueba el nombre de usuario y vuelve a pegar la contraseña de aplicación (sin espacios). Asegúrate de haber usado una contraseña de aplicación, no tu contraseña de inicio de sesión habitual.",
      },
      {
        q: "Error «SSL / SNI» o de certificado",
        a: "Confirma si tu sitio necesita el prefijo www en la URL. Si es un error de SNI, contacta con tu proveedor de hosting para alinear el certificado SSL.",
      },
      {
        q: "Falta la sección Contraseñas de aplicación",
        a: "Actualiza WordPress a la versión 5.6 o más reciente y asegúrate de que tu sitio se sirve por HTTPS — las contraseñas de aplicación están deshabilitadas en sitios no seguros.",
      },
      {
        q: "Las páginas no aparecen en el sitio",
        a: "Comprueba que la API REST sea accesible en tusitio.com/wp-json. Algunos plugins de seguridad la bloquean — permite temporalmente el acceso REST y vuelve a conectar.",
      },
    ],
    ctaTitle: "¿Listo para conectar?",
    ctaSubtitle: "Abre la app, ve a Sitios web y conecta WordPress en unos pocos clics.",
    ctaPrimary: "Ir a la app",
    ctaSecondary: "Conectar Shopify en su lugar",
  },
};

export const shopifyGuide: LocalizedGuide = {
  en: {
    badge: "Shopify Integration",
    heroTitle: "Connect your Shopify store",
    heroSubtitle:
      "Authorize Shopify securely with one click — no API keys to copy — and publish pages and product SEO straight from 3XVISIBILITY.",
    beforeYouStart: "Before you start",
    prereqs: [
      "An active Shopify store (any paid plan or trial).",
      "Admin / owner access to that store.",
      "A Pro plan on 3XVISIBILITY (Shopify is a Pro feature).",
    ],
    stepByStep: "Step-by-step setup",
    stepLabel: "Step",
    steps: [
      {
        title: "Find your store domain",
        desc: "Shopify connects through a secure OAuth flow — you only need your store's .myshopify.com domain.",
        bullets: [
          "Log in to your Shopify admin.",
          "Go to Settings → Domains.",
          "Note your permanent domain — it looks like my-store.myshopify.com.",
        ],
      },
      {
        title: "Open the Websites page in 3XVISIBILITY",
        desc: "All your connected stores and sites are managed here.",
        bullets: [
          "From the sidebar, click Websites.",
          "Click Connect Website in the top-right.",
          "Select Shopify from the platform dropdown.",
        ],
      },
      {
        title: "Enter your store domain",
        desc: "We use this to start the secure authorization with Shopify.",
        bullets: [
          "Store name: anything you like (e.g. “My Shop”).",
          "Store domain: paste your full my-store.myshopify.com address.",
          "Pick the store's primary language.",
        ],
      },
      {
        title: "Authorize via Shopify OAuth",
        desc: "No API keys to copy — Shopify handles permissions for you.",
        bullets: [
          "Click Connect — you'll be redirected to Shopify.",
          "Review the requested permissions and click Install app / Authorize.",
          "You'll be sent back to 3XVISIBILITY automatically once approved.",
        ],
      },
      {
        title: "Confirm the connection",
        desc: "Verify everything is linked before you start.",
        bullets: [
          "A green “Connected” badge appears on the store card.",
          "Your product count and store details load automatically.",
          "If it ever expires, click Reconnect to re-authorize.",
        ],
      },
      {
        title: "Publish products & pages",
        desc: "Your Shopify store is now a publishing and SEO target.",
        bullets: [
          "Generate landing pages and push them to Shopify.",
          "Bulk-optimize product SEO (titles, meta descriptions) from the app.",
          "Re-run campaigns anytime to scale your catalog content.",
        ],
      },
    ],
    troubleshooting: "Troubleshooting",
    troubleshoot: [
      {
        q: "Shopify option is locked / 🔒 Pro",
        a: "Shopify is available on the Pro plan. Upgrade under Sidebar → Billing → Upgrade plan to unlock it.",
      },
      {
        q: "“Shopify OAuth is not configured”",
        a: "This means the integration wasn't fully set up for your workspace. Refresh and try again, or contact support if it persists.",
      },
      {
        q: "“Domain must end with .myshopify.com”",
        a: "Use your permanent store domain (my-store.myshopify.com), not your custom domain like www.mystore.com.",
      },
      {
        q: "Connection shows as expired",
        a: "Access tokens can expire or be revoked. Open the store card and click Reconnect to re-authorize via Shopify.",
      },
    ],
    ctaTitle: "Ready to connect?",
    ctaSubtitle: "Open the app, head to Websites, and authorize Shopify in a few clicks.",
    ctaPrimary: "Go to the app",
    ctaSecondary: "Connect WordPress instead",
  },
  fr: {
    badge: "Intégration Shopify",
    heroTitle: "Connectez votre boutique Shopify",
    heroSubtitle:
      "Autorisez Shopify en toute sécurité en un clic — aucune clé API à copier — et publiez des pages et le SEO produit directement depuis 3XVISIBILITY.",
    beforeYouStart: "Avant de commencer",
    prereqs: [
      "Une boutique Shopify active (offre payante ou période d'essai).",
      "Un accès administrateur / propriétaire à cette boutique.",
      "Un forfait Pro sur 3XVISIBILITY (Shopify est une fonctionnalité Pro).",
    ],
    stepByStep: "Configuration étape par étape",
    stepLabel: "Étape",
    steps: [
      {
        title: "Trouvez le domaine de votre boutique",
        desc: "Shopify se connecte via un flux OAuth sécurisé — vous n'avez besoin que de votre domaine .myshopify.com.",
        bullets: [
          "Connectez-vous à votre administration Shopify.",
          "Allez dans Paramètres → Domaines.",
          "Notez votre domaine permanent — il ressemble à ma-boutique.myshopify.com.",
        ],
      },
      {
        title: "Ouvrez la page Sites web dans 3XVISIBILITY",
        desc: "Toutes vos boutiques et sites connectés sont gérés ici.",
        bullets: [
          "Dans la barre latérale, cliquez sur Sites web.",
          "Cliquez sur Connecter un site web en haut à droite.",
          "Sélectionnez Shopify dans le menu déroulant des plateformes.",
        ],
      },
      {
        title: "Saisissez le domaine de votre boutique",
        desc: "Nous l'utilisons pour lancer l'autorisation sécurisée avec Shopify.",
        bullets: [
          "Nom de la boutique : ce que vous voulez (par ex. « Ma boutique »).",
          "Domaine de la boutique : collez votre adresse complète ma-boutique.myshopify.com.",
          "Choisissez la langue principale de la boutique.",
        ],
      },
      {
        title: "Autorisez via Shopify OAuth",
        desc: "Aucune clé API à copier — Shopify gère les autorisations pour vous.",
        bullets: [
          "Cliquez sur Connecter — vous serez redirigé vers Shopify.",
          "Vérifiez les autorisations demandées et cliquez sur Installer l'application / Autoriser.",
          "Vous serez automatiquement renvoyé vers 3XVISIBILITY une fois approuvé.",
        ],
      },
      {
        title: "Confirmez la connexion",
        desc: "Vérifiez que tout est bien relié avant de commencer.",
        bullets: [
          "Un badge vert « Connecté » apparaît sur la carte de la boutique.",
          "Le nombre de produits et les détails de la boutique se chargent automatiquement.",
          "En cas d'expiration, cliquez sur Reconnecter pour réautoriser.",
        ],
      },
      {
        title: "Publiez produits et pages",
        desc: "Votre boutique Shopify est désormais une cible de publication et de SEO.",
        bullets: [
          "Générez des pages de destination et envoyez-les vers Shopify.",
          "Optimisez en masse le SEO des produits (titres, méta-descriptions) depuis l'application.",
          "Relancez des campagnes à tout moment pour développer le contenu de votre catalogue.",
        ],
      },
    ],
    troubleshooting: "Dépannage",
    troubleshoot: [
      {
        q: "L'option Shopify est verrouillée / 🔒 Pro",
        a: "Shopify est disponible avec le forfait Pro. Mettez à niveau via Barre latérale → Facturation → Changer de forfait pour le débloquer.",
      },
      {
        q: "« Shopify OAuth n'est pas configuré »",
        a: "Cela signifie que l'intégration n'a pas été entièrement configurée pour votre espace de travail. Actualisez et réessayez, ou contactez le support si le problème persiste.",
      },
      {
        q: "« Le domaine doit se terminer par .myshopify.com »",
        a: "Utilisez votre domaine permanent (ma-boutique.myshopify.com), pas votre domaine personnalisé comme www.maboutique.com.",
      },
      {
        q: "La connexion apparaît comme expirée",
        a: "Les jetons d'accès peuvent expirer ou être révoqués. Ouvrez la carte de la boutique et cliquez sur Reconnecter pour réautoriser via Shopify.",
      },
    ],
    ctaTitle: "Prêt à vous connecter ?",
    ctaSubtitle: "Ouvrez l'application, allez dans Sites web et autorisez Shopify en quelques clics.",
    ctaPrimary: "Accéder à l'application",
    ctaSecondary: "Connecter WordPress à la place",
  },
  de: {
    badge: "Shopify-Integration",
    heroTitle: "Verbinden Sie Ihren Shopify-Shop",
    heroSubtitle:
      "Autorisieren Sie Shopify sicher mit einem Klick — keine API-Schlüssel zum Kopieren — und veröffentlichen Sie Seiten und Produkt-SEO direkt aus 3XVISIBILITY.",
    beforeYouStart: "Bevor Sie beginnen",
    prereqs: [
      "Ein aktiver Shopify-Shop (beliebiger kostenpflichtiger Plan oder Testversion).",
      "Admin-/Inhaberzugriff auf diesen Shop.",
      "Ein Pro-Plan bei 3XVISIBILITY (Shopify ist eine Pro-Funktion).",
    ],
    stepByStep: "Schritt-für-Schritt-Einrichtung",
    stepLabel: "Schritt",
    steps: [
      {
        title: "Finden Sie Ihre Shop-Domain",
        desc: "Shopify verbindet sich über einen sicheren OAuth-Ablauf — Sie benötigen nur Ihre .myshopify.com-Domain.",
        bullets: [
          "Melden Sie sich in Ihrem Shopify-Admin an.",
          "Gehen Sie zu Einstellungen → Domains.",
          "Notieren Sie Ihre permanente Domain — sie sieht aus wie mein-shop.myshopify.com.",
        ],
      },
      {
        title: "Öffnen Sie die Seite Websites in 3XVISIBILITY",
        desc: "Alle Ihre verbundenen Shops und Websites werden hier verwaltet.",
        bullets: [
          "Klicken Sie in der Seitenleiste auf Websites.",
          "Klicken Sie oben rechts auf Website verbinden.",
          "Wählen Sie Shopify aus dem Plattform-Dropdown.",
        ],
      },
      {
        title: "Geben Sie Ihre Shop-Domain ein",
        desc: "Wir verwenden sie, um die sichere Autorisierung mit Shopify zu starten.",
        bullets: [
          "Shop-Name: beliebig (z. B. „Mein Shop“).",
          "Shop-Domain: Fügen Sie Ihre vollständige Adresse mein-shop.myshopify.com ein.",
          "Wählen Sie die Hauptsprache des Shops.",
        ],
      },
      {
        title: "Über Shopify OAuth autorisieren",
        desc: "Keine API-Schlüssel zum Kopieren — Shopify übernimmt die Berechtigungen für Sie.",
        bullets: [
          "Klicken Sie auf Verbinden — Sie werden zu Shopify weitergeleitet.",
          "Überprüfen Sie die angeforderten Berechtigungen und klicken Sie auf App installieren / Autorisieren.",
          "Nach der Genehmigung werden Sie automatisch zu 3XVISIBILITY zurückgeleitet.",
        ],
      },
      {
        title: "Bestätigen Sie die Verbindung",
        desc: "Überprüfen Sie, ob alles verbunden ist, bevor Sie beginnen.",
        bullets: [
          "Ein grünes „Verbunden“-Abzeichen erscheint auf der Shop-Karte.",
          "Ihre Produktanzahl und Shop-Details werden automatisch geladen.",
          "Falls sie abläuft, klicken Sie auf Erneut verbinden, um neu zu autorisieren.",
        ],
      },
      {
        title: "Produkte & Seiten veröffentlichen",
        desc: "Ihr Shopify-Shop ist jetzt ein Veröffentlichungs- und SEO-Ziel.",
        bullets: [
          "Generieren Sie Landingpages und senden Sie sie an Shopify.",
          "Optimieren Sie Produkt-SEO (Titel, Meta-Beschreibungen) in großen Mengen aus der App.",
          "Führen Sie Kampagnen jederzeit erneut aus, um Ihre Katalog-Inhalte zu skalieren.",
        ],
      },
    ],
    troubleshooting: "Fehlerbehebung",
    troubleshoot: [
      {
        q: "Shopify-Option ist gesperrt / 🔒 Pro",
        a: "Shopify ist im Pro-Plan verfügbar. Führen Sie ein Upgrade unter Seitenleiste → Abrechnung → Plan upgraden durch, um es freizuschalten.",
      },
      {
        q: "„Shopify OAuth ist nicht konfiguriert“",
        a: "Das bedeutet, dass die Integration für Ihren Arbeitsbereich nicht vollständig eingerichtet wurde. Aktualisieren Sie und versuchen Sie es erneut, oder kontaktieren Sie den Support, falls es weiterhin auftritt.",
      },
      {
        q: "„Domain muss auf .myshopify.com enden“",
        a: "Verwenden Sie Ihre permanente Shop-Domain (mein-shop.myshopify.com), nicht Ihre benutzerdefinierte Domain wie www.meinshop.com.",
      },
      {
        q: "Verbindung wird als abgelaufen angezeigt",
        a: "Zugriffstoken können ablaufen oder widerrufen werden. Öffnen Sie die Shop-Karte und klicken Sie auf Erneut verbinden, um über Shopify neu zu autorisieren.",
      },
    ],
    ctaTitle: "Bereit zum Verbinden?",
    ctaSubtitle: "Öffnen Sie die App, gehen Sie zu Websites und autorisieren Sie Shopify mit wenigen Klicks.",
    ctaPrimary: "Zur App",
    ctaSecondary: "Stattdessen WordPress verbinden",
  },
  es: {
    badge: "Integración con Shopify",
    heroTitle: "Conecta tu tienda Shopify",
    heroSubtitle:
      "Autoriza Shopify de forma segura con un clic — sin claves API que copiar — y publica páginas y SEO de productos directamente desde 3XVISIBILITY.",
    beforeYouStart: "Antes de empezar",
    prereqs: [
      "Una tienda Shopify activa (cualquier plan de pago o prueba).",
      "Acceso de administrador / propietario a esa tienda.",
      "Un plan Pro en 3XVISIBILITY (Shopify es una función Pro).",
    ],
    stepByStep: "Configuración paso a paso",
    stepLabel: "Paso",
    steps: [
      {
        title: "Encuentra el dominio de tu tienda",
        desc: "Shopify se conecta mediante un flujo OAuth seguro — solo necesitas tu dominio .myshopify.com.",
        bullets: [
          "Inicia sesión en tu administración de Shopify.",
          "Ve a Configuración → Dominios.",
          "Anota tu dominio permanente — se parece a mi-tienda.myshopify.com.",
        ],
      },
      {
        title: "Abre la página Sitios web en 3XVISIBILITY",
        desc: "Todas tus tiendas y sitios conectados se gestionan aquí.",
        bullets: [
          "En la barra lateral, haz clic en Sitios web.",
          "Haz clic en Conectar sitio web en la parte superior derecha.",
          "Selecciona Shopify en el menú desplegable de plataformas.",
        ],
      },
      {
        title: "Introduce el dominio de tu tienda",
        desc: "Lo usamos para iniciar la autorización segura con Shopify.",
        bullets: [
          "Nombre de la tienda: lo que quieras (p. ej. «Mi tienda»).",
          "Dominio de la tienda: pega tu dirección completa mi-tienda.myshopify.com.",
          "Elige el idioma principal de la tienda.",
        ],
      },
      {
        title: "Autoriza mediante Shopify OAuth",
        desc: "Sin claves API que copiar — Shopify gestiona los permisos por ti.",
        bullets: [
          "Haz clic en Conectar — se te redirigirá a Shopify.",
          "Revisa los permisos solicitados y haz clic en Instalar app / Autorizar.",
          "Volverás a 3XVISIBILITY automáticamente una vez aprobado.",
        ],
      },
      {
        title: "Confirma la conexión",
        desc: "Verifica que todo esté vinculado antes de empezar.",
        bullets: [
          "Aparece una insignia verde «Conectado» en la tarjeta de la tienda.",
          "El número de productos y los detalles de la tienda se cargan automáticamente.",
          "Si caduca, haz clic en Reconectar para volver a autorizar.",
        ],
      },
      {
        title: "Publica productos y páginas",
        desc: "Tu tienda Shopify ahora es un destino de publicación y SEO.",
        bullets: [
          "Genera páginas de destino y envíalas a Shopify.",
          "Optimiza en masa el SEO de productos (títulos, metadescripciones) desde la app.",
          "Vuelve a ejecutar campañas cuando quieras para escalar el contenido de tu catálogo.",
        ],
      },
    ],
    troubleshooting: "Solución de problemas",
    troubleshoot: [
      {
        q: "La opción Shopify está bloqueada / 🔒 Pro",
        a: "Shopify está disponible en el plan Pro. Mejora tu plan en Barra lateral → Facturación → Cambiar de plan para desbloquearlo.",
      },
      {
        q: "«Shopify OAuth no está configurado»",
        a: "Esto significa que la integración no se configuró completamente para tu espacio de trabajo. Actualiza e inténtalo de nuevo, o contacta con soporte si persiste.",
      },
      {
        q: "«El dominio debe terminar en .myshopify.com»",
        a: "Usa tu dominio permanente de la tienda (mi-tienda.myshopify.com), no tu dominio personalizado como www.mitienda.com.",
      },
      {
        q: "La conexión aparece como caducada",
        a: "Los tokens de acceso pueden caducar o ser revocados. Abre la tarjeta de la tienda y haz clic en Reconectar para volver a autorizar mediante Shopify.",
      },
    ],
    ctaTitle: "¿Listo para conectar?",
    ctaSubtitle: "Abre la app, ve a Sitios web y autoriza Shopify en unos pocos clics.",
    ctaPrimary: "Ir a la app",
    ctaSecondary: "Conectar WordPress en su lugar",
  },
};
