/**
 * Language-aware phrase pack used by SEO auto-repair to inject signal words
 * (CTAs, local cues, trust signals, transitions, schema descriptions) in the
 * SAME language as the page being optimized.
 *
 * Without this, the auto-repair would inject English fragments into French/
 * Spanish/German/etc. pages and produce mixed-language output.
 *
 * Supported languages match the platform's primary set. Anything else falls
 * back to English so existing behavior is unchanged.
 */

export type PhrasePackKey =
  | "en" | "fr" | "es" | "de" | "it" | "pt" | "nl" | "pl" | "tr";

export interface PhrasePack {
  // Section / heading
  geoHeading: (keyword: string) => string; // "Local <kw> Service Serving Your Area"

  // Lead intro paragraph (already wraps lots of signals)
  leadIntro: (keyword: string) => string;

  // Optional supporting paragraphs (community / service area / availability / credibility / trust / offer)
  community: (keyword: string) => string;
  serviceArea: (keyword: string) => string;
  availability: (keyword: string) => string;
  credibility: (keyword: string) => string;
  trustSupport: (keyword: string) => string;
  offerSupport: (keyword: string) => string;

  // Generic SEA filler sentences (used when specific signals are missing)
  seaCta: string;
  seaBenefit: string;
  seaTrust: string;
  seaOffer: string;
  seaUrgency: string;
  seaIntent: string;

  // Generic GEO filler sentences
  geoLocal: string;
  geoServiceArea: string;
  geoCommunity: string;
  geoAvailability: string;
  geoCredibility: string;

  // Final CTA link text
  ctaLinkText: string;
  ctaLinkSuffix: string;

  // "Looking for trusted X services?" prefix used to inject keyword in intro
  lookingForPrefix: (keyword: string) => string;

  // Internal contact link
  internalLinkText: string;
  internalLinkTrailing: string;
  internalLinkTitle: string;

  // Outbound link
  outboundPrefix: string;
  outboundLinkText: string;
  outboundSuffix: string;

  // Transition block (must contain transition words in the target language)
  transitionBlock: string;

  // Image alt suffix for keyword
  imgAltSuffix: string;

  // JSON-LD schema description
  schemaDescription: (keyword: string) => string;

  // SEO title polish: action prefix + uniqueness padding (used by normalizeOptimizationResult)
  actionPrefix: string; // e.g. "Get " or "Obtenez "
  uniquenessPadding: string; // e.g. " — Trusted Local Service"
  actionWordRegex: RegExp; // matches if title already contains an action word in this language

  // Density balancer filler templates
  densityTemplates: (keyword: string) => string[];
  densitySubstitutes: string[];
}

const ENGLISH: PhrasePack = {
  geoHeading: (kw) => `Local ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}Service Serving Your Area`,
  leadIntro: (kw) => `Looking for trusted ${kw}? We are a local team serving customers near you and in your area, delivering fast, easy, reliable and premium ${kw} results. Our certified, proven and recommended ${kw} specialists provide same-day, top-rated support today — get a free quote with transparent pricing and contact us now to book your ${kw} consultation.`,
  community: (kw) => `As local experts in ${kw}, we work closely with the community and families around you, with our nearby team ready to help.`,
  serviceArea: (kw) => `Our ${kw} service area covers nearby neighborhoods, with delivery and coverage available throughout the region.`,
  availability: (kw) => `We are open and available today for ${kw} during business hours — visit us, call us, or contact us for same-day response.`,
  credibility: (kw) => `Trusted locally, our ${kw} area specialists provide nearby support that customers recommend across the region.`,
  trustSupport: (kw) => `Backed by verified reviews, testimonials, a satisfaction guarantee, and warranty-protected ${kw} service from certified experts.`,
  offerSupport: (kw) => `Take advantage of our exclusive free ${kw} trial, special discount package, and starting-at pricing plan with bundle savings.`,
  seaCta: "Contact our team to book your free consultation today.",
  seaBenefit: "We deliver fast, reliable and premium results you can trust.",
  seaTrust: "Our service is trusted, certified and proven, with verified reviews and a satisfaction guarantee.",
  seaOffer: "Get a free quote with transparent pricing — no hidden fees, just real value.",
  seaUrgency: "Same-day response available — call now for instant, top-rated support.",
  seaIntent: "Call us or message our team to get started right away.",
  geoLocal: "We are a local team serving customers near you and in your area.",
  geoServiceArea: "Our service area covers nearby neighborhoods, with delivery available throughout the region.",
  geoCommunity: "As local experts, we work closely with the community and families around you.",
  geoAvailability: "We are open and available today — contact us during business hours for a same-day visit.",
  geoCredibility: "Trusted locally, our area specialists provide nearby support customers recommend.",
  ctaLinkText: "Contact us today for a free quote",
  ctaLinkSuffix: " — fast, local, trusted service available same-day in your area.",
  lookingForPrefix: (kw) => `Looking for trusted ${kw} services? `,
  internalLinkText: "Contact us today",
  internalLinkTrailing: " to learn more about our services.",
  internalLinkTitle: "Contact us for more information",
  outboundPrefix: "Learn more from ",
  outboundLinkText: "trusted sources",
  outboundSuffix: ".",
  transitionBlock: `<p>Additionally, our team is committed to quality. Moreover, we focus on results. Therefore, you can rely on us for consistent service.</p>`,
  imgAltSuffix: " - professional service",
  schemaDescription: (kw) => kw ? `Professional ${kw} services - trusted, reliable, and local.` : "Professional service",
  actionPrefix: "Get ",
  uniquenessPadding: " — Trusted Local Service",
  actionWordRegex: /\b(buy|get|shop|order|book|reserve|request|contact|call|discover|subscribe|free|best|top|new|save|deal|premium|try|hire|find|learn)\b/i,
  densityTemplates: (kw) => [
    `Our ${kw} team focuses on real results that customers actually notice.`,
    `When you choose our ${kw}, you get clear pricing and friendly support from start to finish.`,
    `We make ${kw} simple, so you spend less time worrying and more time enjoying the outcome.`,
    `Every ${kw} project follows a proven process built around quality and care.`,
    `If you have questions about ${kw}, our specialists are happy to walk you through every step.`,
    `Booking ${kw} with us is fast, transparent and designed around your schedule.`,
  ],
  densitySubstitutes: ["our service", "this service", "the service", "our work", "our team's work"],
};

const FRENCH: PhrasePack = {
  geoHeading: (kw) => `Service ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}local au service de votre région`,
  leadIntro: (kw) => `Vous cherchez un service ${kw} de confiance ? Nous sommes une équipe locale au service des clients près de chez vous et dans votre région, offrant des résultats ${kw} rapides, simples, fiables et premium. Nos spécialistes ${kw} certifiés, éprouvés et recommandés proposent un support de qualité supérieure le jour même — obtenez un devis gratuit avec une tarification transparente et contactez-nous maintenant pour réserver votre consultation ${kw}.`,
  community: (kw) => `En tant qu'experts locaux du ${kw}, nous travaillons en étroite collaboration avec la communauté et les familles autour de vous, avec notre équipe à proximité prête à aider.`,
  serviceArea: (kw) => `Notre zone de service ${kw} couvre les quartiers voisins, avec une livraison et une couverture disponibles dans toute la région.`,
  availability: (kw) => `Nous sommes ouverts et disponibles aujourd'hui pour ${kw} pendant les heures d'ouverture — visitez-nous, appelez-nous ou contactez-nous pour une réponse le jour même.`,
  credibility: (kw) => `Reconnus localement, nos spécialistes ${kw} de la région offrent un support de proximité que les clients recommandent dans toute la région.`,
  trustSupport: (kw) => `Soutenu par des avis vérifiés, des témoignages, une garantie de satisfaction et un service ${kw} sous garantie par des experts certifiés.`,
  offerSupport: (kw) => `Profitez de notre essai ${kw} gratuit exclusif, de notre forfait à prix réduit et de notre plan tarifaire à partir de avec des économies sur les offres groupées.`,
  seaCta: "Contactez notre équipe pour réserver votre consultation gratuite aujourd'hui.",
  seaBenefit: "Nous offrons des résultats rapides, fiables et premium auxquels vous pouvez faire confiance.",
  seaTrust: "Notre service est de confiance, certifié et éprouvé, avec des avis vérifiés et une garantie de satisfaction.",
  seaOffer: "Obtenez un devis gratuit avec une tarification transparente — pas de frais cachés, juste une vraie valeur.",
  seaUrgency: "Réponse le jour même disponible — appelez maintenant pour un support instantané et de qualité supérieure.",
  seaIntent: "Appelez-nous ou envoyez un message à notre équipe pour commencer tout de suite.",
  geoLocal: "Nous sommes une équipe locale au service des clients près de chez vous et dans votre région.",
  geoServiceArea: "Notre zone de service couvre les quartiers voisins, avec une livraison disponible dans toute la région.",
  geoCommunity: "En tant qu'experts locaux, nous travaillons en étroite collaboration avec la communauté et les familles autour de vous.",
  geoAvailability: "Nous sommes ouverts et disponibles aujourd'hui — contactez-nous pendant les heures d'ouverture pour une visite le jour même.",
  geoCredibility: "Reconnus localement, nos spécialistes de la région offrent un support de proximité que les clients recommandent.",
  ctaLinkText: "Contactez-nous aujourd'hui pour un devis gratuit",
  ctaLinkSuffix: " — service rapide, local et de confiance disponible le jour même dans votre région.",
  lookingForPrefix: (kw) => `Vous cherchez des services ${kw} de confiance ? `,
  internalLinkText: "Contactez-nous aujourd'hui",
  internalLinkTrailing: " pour en savoir plus sur nos services.",
  internalLinkTitle: "Contactez-nous pour plus d'informations",
  outboundPrefix: "Apprenez-en plus sur ",
  outboundLinkText: "des sources fiables",
  outboundSuffix: ".",
  transitionBlock: `<p>De plus, notre équipe est dédiée à la qualité. En outre, nous nous concentrons sur les résultats. Par conséquent, vous pouvez compter sur nous pour un service constant.</p>`,
  imgAltSuffix: " - service professionnel",
  schemaDescription: (kw) => kw ? `Services ${kw} professionnels — fiables, de confiance et locaux.` : "Service professionnel",
  actionPrefix: "Obtenez ",
  uniquenessPadding: " — Service local de confiance",
  actionWordRegex: /\b(obtenez|achetez|commandez|réservez|contactez|appelez|découvrez|abonnez|gratuit|meilleur|top|nouveau|essayez|trouvez)\b/i,
  densityTemplates: (kw) => [
    `Notre équipe ${kw} se concentre sur des résultats concrets que les clients remarquent vraiment.`,
    `Quand vous choisissez notre ${kw}, vous bénéficiez d'une tarification claire et d'un support amical du début à la fin.`,
    `Nous rendons ${kw} simple, pour que vous passiez moins de temps à vous inquiéter et plus de temps à profiter du résultat.`,
    `Chaque projet ${kw} suit un processus éprouvé axé sur la qualité et le soin.`,
    `Si vous avez des questions sur ${kw}, nos spécialistes sont heureux de vous guider à chaque étape.`,
    `Réserver ${kw} avec nous est rapide, transparent et conçu pour votre emploi du temps.`,
  ],
  densitySubstitutes: ["notre service", "ce service", "le service", "notre travail", "le travail de notre équipe"],
};

const SPANISH: PhrasePack = {
  geoHeading: (kw) => `Servicio ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}local al servicio de su área`,
  leadIntro: (kw) => `¿Busca un servicio ${kw} de confianza? Somos un equipo local que atiende a clientes cerca de usted y en su área, ofreciendo resultados ${kw} rápidos, fáciles, fiables y premium. Nuestros especialistas en ${kw} certificados, probados y recomendados ofrecen soporte de primera categoría el mismo día — obtenga un presupuesto gratis con precios transparentes y contáctenos ahora para reservar su consulta ${kw}.`,
  community: (kw) => `Como expertos locales en ${kw}, trabajamos estrechamente con la comunidad y las familias a su alrededor, con nuestro equipo cercano listo para ayudar.`,
  serviceArea: (kw) => `Nuestra área de servicio ${kw} cubre los vecindarios cercanos, con entrega y cobertura disponibles en toda la región.`,
  availability: (kw) => `Estamos abiertos y disponibles hoy para ${kw} durante el horario comercial — visítenos, llámenos o contáctenos para una respuesta el mismo día.`,
  credibility: (kw) => `De confianza local, nuestros especialistas en ${kw} del área brindan soporte cercano que los clientes recomiendan en toda la región.`,
  trustSupport: (kw) => `Respaldado por reseñas verificadas, testimonios, una garantía de satisfacción y un servicio ${kw} con garantía por expertos certificados.`,
  offerSupport: (kw) => `Aproveche nuestra prueba ${kw} gratuita exclusiva, paquete con descuento especial y plan de precios desde con ahorros en paquetes.`,
  seaCta: "Contacte a nuestro equipo para reservar su consulta gratuita hoy.",
  seaBenefit: "Ofrecemos resultados rápidos, fiables y premium en los que puede confiar.",
  seaTrust: "Nuestro servicio es de confianza, certificado y probado, con reseñas verificadas y garantía de satisfacción.",
  seaOffer: "Obtenga un presupuesto gratis con precios transparentes — sin tarifas ocultas, solo valor real.",
  seaUrgency: "Respuesta el mismo día disponible — llame ahora para soporte instantáneo de primera categoría.",
  seaIntent: "Llámenos o envíe un mensaje a nuestro equipo para comenzar de inmediato.",
  geoLocal: "Somos un equipo local que atiende a clientes cerca de usted y en su área.",
  geoServiceArea: "Nuestra área de servicio cubre los vecindarios cercanos, con entrega disponible en toda la región.",
  geoCommunity: "Como expertos locales, trabajamos estrechamente con la comunidad y las familias a su alrededor.",
  geoAvailability: "Estamos abiertos y disponibles hoy — contáctenos durante el horario comercial para una visita el mismo día.",
  geoCredibility: "De confianza local, nuestros especialistas del área brindan soporte cercano que los clientes recomiendan.",
  ctaLinkText: "Contáctenos hoy para un presupuesto gratis",
  ctaLinkSuffix: " — servicio rápido, local y de confianza disponible el mismo día en su área.",
  lookingForPrefix: (kw) => `¿Busca servicios de ${kw} de confianza? `,
  internalLinkText: "Contáctenos hoy",
  internalLinkTrailing: " para obtener más información sobre nuestros servicios.",
  internalLinkTitle: "Contáctenos para más información",
  outboundPrefix: "Más información en ",
  outboundLinkText: "fuentes confiables",
  outboundSuffix: ".",
  transitionBlock: `<p>Además, nuestro equipo está comprometido con la calidad. Asimismo, nos centramos en los resultados. Por lo tanto, puede confiar en nosotros para un servicio constante.</p>`,
  imgAltSuffix: " - servicio profesional",
  schemaDescription: (kw) => kw ? `Servicios profesionales de ${kw} — de confianza, fiables y locales.` : "Servicio profesional",
  actionPrefix: "Obtenga ",
  uniquenessPadding: " — Servicio local de confianza",
  actionWordRegex: /\b(obtenga|compre|pida|reserve|contacte|llame|descubra|suscríbase|gratis|mejor|nuevo|pruebe|encuentre)\b/i,
  densityTemplates: (kw) => [
    `Nuestro equipo de ${kw} se centra en resultados reales que los clientes realmente notan.`,
    `Cuando elige nuestro ${kw}, obtiene precios claros y soporte amigable de principio a fin.`,
    `Hacemos ${kw} simple, para que pase menos tiempo preocupándose y más tiempo disfrutando del resultado.`,
    `Cada proyecto de ${kw} sigue un proceso probado basado en calidad y cuidado.`,
    `Si tiene preguntas sobre ${kw}, nuestros especialistas le guiarán en cada paso.`,
    `Reservar ${kw} con nosotros es rápido, transparente y diseñado para su horario.`,
  ],
  densitySubstitutes: ["nuestro servicio", "este servicio", "el servicio", "nuestro trabajo", "el trabajo de nuestro equipo"],
};

const GERMAN: PhrasePack = {
  geoHeading: (kw) => `${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}Service vor Ort in Ihrer Region`,
  leadIntro: (kw) => `Suchen Sie vertrauenswürdigen ${kw}? Wir sind ein lokales Team, das Kunden in Ihrer Nähe und Region betreut und schnelle, einfache, zuverlässige und Premium-${kw}-Ergebnisse liefert. Unsere zertifizierten, bewährten und empfohlenen ${kw}-Spezialisten bieten taggleichen, erstklassigen Support — fordern Sie ein kostenloses Angebot mit transparenten Preisen an und kontaktieren Sie uns jetzt, um Ihre ${kw}-Beratung zu buchen.`,
  community: (kw) => `Als lokale Experten für ${kw} arbeiten wir eng mit der Gemeinschaft und Familien in Ihrer Umgebung zusammen, mit unserem nahegelegenen Team, das bereit ist zu helfen.`,
  serviceArea: (kw) => `Unser ${kw}-Servicegebiet umfasst die umliegenden Stadtteile, mit Lieferung und Abdeckung in der gesamten Region.`,
  availability: (kw) => `Wir sind heute geöffnet und verfügbar für ${kw} während der Geschäftszeiten — besuchen Sie uns, rufen Sie uns an oder kontaktieren Sie uns für eine taggleiche Antwort.`,
  credibility: (kw) => `Lokal vertraut, bieten unsere ${kw}-Spezialisten in der Region nahegelegenen Support, den Kunden in der gesamten Region empfehlen.`,
  trustSupport: (kw) => `Unterstützt durch verifizierte Bewertungen, Erfahrungsberichte, eine Zufriedenheitsgarantie und einen garantiegeschützten ${kw}-Service von zertifizierten Experten.`,
  offerSupport: (kw) => `Profitieren Sie von unserem exklusiven kostenlosen ${kw}-Test, Sonderrabattpaket und Preisplan ab mit Bündel-Ersparnissen.`,
  seaCta: "Kontaktieren Sie unser Team, um Ihre kostenlose Beratung noch heute zu buchen.",
  seaBenefit: "Wir liefern schnelle, zuverlässige und Premium-Ergebnisse, denen Sie vertrauen können.",
  seaTrust: "Unser Service ist vertrauenswürdig, zertifiziert und bewährt, mit verifizierten Bewertungen und Zufriedenheitsgarantie.",
  seaOffer: "Erhalten Sie ein kostenloses Angebot mit transparenten Preisen — keine versteckten Gebühren, nur echter Wert.",
  seaUrgency: "Taggleiche Antwort verfügbar — rufen Sie jetzt an für sofortigen, erstklassigen Support.",
  seaIntent: "Rufen Sie uns an oder schreiben Sie unserem Team, um sofort loszulegen.",
  geoLocal: "Wir sind ein lokales Team, das Kunden in Ihrer Nähe und Region betreut.",
  geoServiceArea: "Unser Servicegebiet umfasst die umliegenden Stadtteile, mit Lieferung in der gesamten Region.",
  geoCommunity: "Als lokale Experten arbeiten wir eng mit der Gemeinschaft und Familien in Ihrer Umgebung zusammen.",
  geoAvailability: "Wir sind heute geöffnet und verfügbar — kontaktieren Sie uns während der Geschäftszeiten für einen taggleichen Besuch.",
  geoCredibility: "Lokal vertraut, bieten unsere Spezialisten in der Region nahegelegenen Support, den Kunden empfehlen.",
  ctaLinkText: "Kontaktieren Sie uns heute für ein kostenloses Angebot",
  ctaLinkSuffix: " — schneller, lokaler, vertrauenswürdiger Service taggleich in Ihrer Region verfügbar.",
  lookingForPrefix: (kw) => `Suchen Sie vertrauenswürdige ${kw}-Dienstleistungen? `,
  internalLinkText: "Kontaktieren Sie uns heute",
  internalLinkTrailing: ", um mehr über unsere Dienstleistungen zu erfahren.",
  internalLinkTitle: "Kontaktieren Sie uns für weitere Informationen",
  outboundPrefix: "Erfahren Sie mehr aus ",
  outboundLinkText: "vertrauenswürdigen Quellen",
  outboundSuffix: ".",
  transitionBlock: `<p>Außerdem ist unser Team der Qualität verpflichtet. Darüber hinaus konzentrieren wir uns auf Ergebnisse. Daher können Sie sich auf uns für einen konsistenten Service verlassen.</p>`,
  imgAltSuffix: " - professioneller Service",
  schemaDescription: (kw) => kw ? `Professionelle ${kw}-Dienstleistungen — vertrauenswürdig, zuverlässig und lokal.` : "Professioneller Service",
  actionPrefix: "Jetzt ",
  uniquenessPadding: " — Vertrauenswürdiger lokaler Service",
  actionWordRegex: /\b(jetzt|kaufen|bestellen|buchen|reservieren|kontaktieren|anrufen|entdecken|abonnieren|kostenlos|beste|neu|sparen)\b/i,
  densityTemplates: (kw) => [
    `Unser ${kw}-Team konzentriert sich auf echte Ergebnisse, die Kunden tatsächlich bemerken.`,
    `Wenn Sie unser ${kw} wählen, erhalten Sie klare Preise und freundlichen Support von Anfang bis Ende.`,
    `Wir machen ${kw} einfach, sodass Sie weniger Zeit mit Sorgen verbringen und mehr Zeit das Ergebnis genießen.`,
    `Jedes ${kw}-Projekt folgt einem bewährten Prozess, der auf Qualität und Sorgfalt basiert.`,
    `Wenn Sie Fragen zu ${kw} haben, helfen Ihnen unsere Spezialisten gerne bei jedem Schritt.`,
    `Die Buchung von ${kw} bei uns ist schnell, transparent und auf Ihren Zeitplan abgestimmt.`,
  ],
  densitySubstitutes: ["unser Service", "dieser Service", "der Service", "unsere Arbeit", "die Arbeit unseres Teams"],
};

const ITALIAN: PhrasePack = {
  geoHeading: (kw) => `Servizio ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}locale al servizio della tua zona`,
  leadIntro: (kw) => `Cerchi un servizio ${kw} di fiducia? Siamo un team locale al servizio dei clienti vicino a te e nella tua zona, offrendo risultati ${kw} veloci, semplici, affidabili e premium. I nostri specialisti ${kw} certificati, comprovati e raccomandati offrono assistenza in giornata di altissimo livello — ottieni un preventivo gratuito con prezzi trasparenti e contattaci ora per prenotare la tua consulenza ${kw}.`,
  community: (kw) => `Come esperti locali di ${kw}, lavoriamo a stretto contatto con la comunità e le famiglie intorno a te, con il nostro team vicino pronto ad aiutare.`,
  serviceArea: (kw) => `La nostra area di servizio ${kw} copre i quartieri vicini, con consegna e copertura disponibili in tutta la regione.`,
  availability: (kw) => `Siamo aperti e disponibili oggi per ${kw} durante l'orario lavorativo — visitaci, chiamaci o contattaci per una risposta in giornata.`,
  credibility: (kw) => `Affidabile localmente, i nostri specialisti ${kw} della zona offrono assistenza vicina che i clienti raccomandano in tutta la regione.`,
  trustSupport: (kw) => `Supportato da recensioni verificate, testimonianze, garanzia di soddisfazione e servizio ${kw} con garanzia da esperti certificati.`,
  offerSupport: (kw) => `Approfitta della nostra prova ${kw} gratuita esclusiva, pacchetto sconto speciale e piano tariffario a partire da con risparmi sui pacchetti.`,
  seaCta: "Contatta il nostro team per prenotare la tua consulenza gratuita oggi.",
  seaBenefit: "Offriamo risultati veloci, affidabili e premium di cui ti puoi fidare.",
  seaTrust: "Il nostro servizio è affidabile, certificato e comprovato, con recensioni verificate e garanzia di soddisfazione.",
  seaOffer: "Ottieni un preventivo gratuito con prezzi trasparenti — nessun costo nascosto, solo vero valore.",
  seaUrgency: "Risposta in giornata disponibile — chiama ora per assistenza istantanea di altissimo livello.",
  seaIntent: "Chiamaci o invia un messaggio al nostro team per iniziare subito.",
  geoLocal: "Siamo un team locale al servizio dei clienti vicino a te e nella tua zona.",
  geoServiceArea: "La nostra area di servizio copre i quartieri vicini, con consegna disponibile in tutta la regione.",
  geoCommunity: "Come esperti locali, lavoriamo a stretto contatto con la comunità e le famiglie intorno a te.",
  geoAvailability: "Siamo aperti e disponibili oggi — contattaci durante l'orario lavorativo per una visita in giornata.",
  geoCredibility: "Affidabile localmente, i nostri specialisti della zona offrono assistenza vicina che i clienti raccomandano.",
  ctaLinkText: "Contattaci oggi per un preventivo gratuito",
  ctaLinkSuffix: " — servizio veloce, locale e affidabile disponibile in giornata nella tua zona.",
  lookingForPrefix: (kw) => `Cerchi servizi ${kw} di fiducia? `,
  internalLinkText: "Contattaci oggi",
  internalLinkTrailing: " per saperne di più sui nostri servizi.",
  internalLinkTitle: "Contattaci per maggiori informazioni",
  outboundPrefix: "Scopri di più da ",
  outboundLinkText: "fonti affidabili",
  outboundSuffix: ".",
  transitionBlock: `<p>Inoltre, il nostro team è impegnato per la qualità. Inoltre, ci concentriamo sui risultati. Pertanto, puoi contare su di noi per un servizio costante.</p>`,
  imgAltSuffix: " - servizio professionale",
  schemaDescription: (kw) => kw ? `Servizi ${kw} professionali — affidabili, fidati e locali.` : "Servizio professionale",
  actionPrefix: "Ottieni ",
  uniquenessPadding: " — Servizio locale di fiducia",
  actionWordRegex: /\b(ottieni|acquista|ordina|prenota|contatta|chiama|scopri|iscriviti|gratis|migliore|nuovo|prova|trova)\b/i,
  densityTemplates: (kw) => [
    `Il nostro team ${kw} si concentra su risultati reali che i clienti notano davvero.`,
    `Quando scegli il nostro ${kw}, ottieni prezzi chiari e supporto amichevole dall'inizio alla fine.`,
    `Rendiamo ${kw} semplice, in modo da passare meno tempo a preoccuparti e più tempo a goderti il risultato.`,
    `Ogni progetto ${kw} segue un processo comprovato basato su qualità e cura.`,
    `Se hai domande su ${kw}, i nostri specialisti sono felici di guidarti in ogni passaggio.`,
    `Prenotare ${kw} con noi è veloce, trasparente e progettato per i tuoi orari.`,
  ],
  densitySubstitutes: ["il nostro servizio", "questo servizio", "il servizio", "il nostro lavoro", "il lavoro del nostro team"],
};

const PORTUGUESE: PhrasePack = {
  geoHeading: (kw) => `Serviço ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}local a serviço da sua região`,
  leadIntro: (kw) => `Procura um serviço ${kw} de confiança? Somos uma equipa local ao serviço de clientes perto de si e na sua região, oferecendo resultados ${kw} rápidos, fáceis, fiáveis e premium. Os nossos especialistas ${kw} certificados, comprovados e recomendados oferecem suporte de altíssimo nível no mesmo dia — obtenha um orçamento gratuito com preços transparentes e contacte-nos agora para reservar a sua consulta ${kw}.`,
  community: (kw) => `Como especialistas locais em ${kw}, trabalhamos em estreita colaboração com a comunidade e as famílias à sua volta, com a nossa equipa próxima pronta a ajudar.`,
  serviceArea: (kw) => `A nossa área de serviço ${kw} cobre os bairros próximos, com entrega e cobertura disponíveis em toda a região.`,
  availability: (kw) => `Estamos abertos e disponíveis hoje para ${kw} durante o horário comercial — visite-nos, ligue-nos ou contacte-nos para uma resposta no mesmo dia.`,
  credibility: (kw) => `De confiança local, os nossos especialistas ${kw} da zona prestam suporte próximo que os clientes recomendam em toda a região.`,
  trustSupport: (kw) => `Apoiado por avaliações verificadas, depoimentos, garantia de satisfação e serviço ${kw} com garantia por especialistas certificados.`,
  offerSupport: (kw) => `Aproveite o nosso teste ${kw} gratuito exclusivo, pacote com desconto especial e plano tarifário a partir de com poupanças em pacotes.`,
  seaCta: "Contacte a nossa equipa para reservar a sua consulta gratuita hoje.",
  seaBenefit: "Oferecemos resultados rápidos, fiáveis e premium em que pode confiar.",
  seaTrust: "O nosso serviço é de confiança, certificado e comprovado, com avaliações verificadas e garantia de satisfação.",
  seaOffer: "Obtenha um orçamento gratuito com preços transparentes — sem taxas ocultas, apenas valor real.",
  seaUrgency: "Resposta no mesmo dia disponível — ligue agora para suporte instantâneo de altíssimo nível.",
  seaIntent: "Ligue-nos ou envie uma mensagem à nossa equipa para começar imediatamente.",
  geoLocal: "Somos uma equipa local ao serviço de clientes perto de si e na sua região.",
  geoServiceArea: "A nossa área de serviço cobre os bairros próximos, com entrega disponível em toda a região.",
  geoCommunity: "Como especialistas locais, trabalhamos em estreita colaboração com a comunidade e as famílias à sua volta.",
  geoAvailability: "Estamos abertos e disponíveis hoje — contacte-nos durante o horário comercial para uma visita no mesmo dia.",
  geoCredibility: "De confiança local, os nossos especialistas da zona prestam suporte próximo que os clientes recomendam.",
  ctaLinkText: "Contacte-nos hoje para um orçamento gratuito",
  ctaLinkSuffix: " — serviço rápido, local e de confiança disponível no mesmo dia na sua região.",
  lookingForPrefix: (kw) => `Procura serviços ${kw} de confiança? `,
  internalLinkText: "Contacte-nos hoje",
  internalLinkTrailing: " para saber mais sobre os nossos serviços.",
  internalLinkTitle: "Contacte-nos para mais informações",
  outboundPrefix: "Saiba mais em ",
  outboundLinkText: "fontes confiáveis",
  outboundSuffix: ".",
  transitionBlock: `<p>Além disso, a nossa equipa está comprometida com a qualidade. Adicionalmente, focamo-nos nos resultados. Portanto, pode contar connosco para um serviço consistente.</p>`,
  imgAltSuffix: " - serviço profissional",
  schemaDescription: (kw) => kw ? `Serviços ${kw} profissionais — fiáveis, de confiança e locais.` : "Serviço profissional",
  actionPrefix: "Obtenha ",
  uniquenessPadding: " — Serviço local de confiança",
  actionWordRegex: /\b(obtenha|compre|encomende|reserve|contacte|ligue|descubra|subscreva|gratuito|melhor|novo|experimente|encontre)\b/i,
  densityTemplates: (kw) => [
    `A nossa equipa ${kw} foca-se em resultados reais que os clientes realmente notam.`,
    `Quando escolhe o nosso ${kw}, obtém preços claros e suporte amigável do início ao fim.`,
    `Tornamos ${kw} simples, para que passe menos tempo preocupado e mais tempo a desfrutar do resultado.`,
    `Cada projeto ${kw} segue um processo comprovado baseado em qualidade e cuidado.`,
    `Se tiver perguntas sobre ${kw}, os nossos especialistas guiá-lo-ão em cada passo.`,
    `Reservar ${kw} connosco é rápido, transparente e adaptado ao seu horário.`,
  ],
  densitySubstitutes: ["o nosso serviço", "este serviço", "o serviço", "o nosso trabalho", "o trabalho da nossa equipa"],
};

const DUTCH: PhrasePack = {
  geoHeading: (kw) => `Lokale ${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}service in uw regio`,
  leadIntro: (kw) => `Op zoek naar betrouwbare ${kw}? Wij zijn een lokaal team dat klanten bij u in de buurt en in uw regio bedient met snelle, eenvoudige, betrouwbare en premium ${kw}-resultaten. Onze gecertificeerde, bewezen en aanbevolen ${kw}-specialisten bieden dezelfde dag nog topondersteuning — vraag een gratis offerte aan met transparante prijzen en neem nu contact op om uw ${kw}-consult te boeken.`,
  community: (kw) => `Als lokale ${kw}-experts werken we nauw samen met de gemeenschap en gezinnen om u heen, met ons team in de buurt klaar om te helpen.`,
  serviceArea: (kw) => `Ons ${kw}-servicegebied omvat de nabijgelegen buurten, met levering en dekking in de hele regio.`,
  availability: (kw) => `We zijn vandaag open en beschikbaar voor ${kw} tijdens kantooruren — bezoek ons, bel ons of neem contact op voor een reactie op dezelfde dag.`,
  credibility: (kw) => `Lokaal vertrouwd, onze ${kw}-specialisten in de regio bieden nabijgelegen ondersteuning die klanten in de hele regio aanbevelen.`,
  trustSupport: (kw) => `Ondersteund door geverifieerde beoordelingen, getuigenissen, een tevredenheidsgarantie en garantie-beschermde ${kw}-service van gecertificeerde experts.`,
  offerSupport: (kw) => `Profiteer van onze exclusieve gratis ${kw}-proefperiode, speciaal kortingspakket en prijsplan vanaf met bundelbesparingen.`,
  seaCta: "Neem vandaag nog contact op met ons team om uw gratis consult te boeken.",
  seaBenefit: "Wij leveren snelle, betrouwbare en premium resultaten waarop u kunt vertrouwen.",
  seaTrust: "Onze service is betrouwbaar, gecertificeerd en bewezen, met geverifieerde beoordelingen en tevredenheidsgarantie.",
  seaOffer: "Vraag een gratis offerte aan met transparante prijzen — geen verborgen kosten, alleen echte waarde.",
  seaUrgency: "Reactie op dezelfde dag mogelijk — bel nu voor directe, hoogwaardige ondersteuning.",
  seaIntent: "Bel ons of stuur een bericht naar ons team om direct aan de slag te gaan.",
  geoLocal: "Wij zijn een lokaal team dat klanten bij u in de buurt en in uw regio bedient.",
  geoServiceArea: "Ons servicegebied omvat de nabijgelegen buurten, met levering in de hele regio.",
  geoCommunity: "Als lokale experts werken we nauw samen met de gemeenschap en gezinnen om u heen.",
  geoAvailability: "We zijn vandaag open en beschikbaar — neem tijdens kantooruren contact op voor een bezoek dezelfde dag.",
  geoCredibility: "Lokaal vertrouwd, onze regionale specialisten bieden nabijgelegen ondersteuning die klanten aanbevelen.",
  ctaLinkText: "Neem vandaag contact op voor een gratis offerte",
  ctaLinkSuffix: " — snelle, lokale, betrouwbare service dezelfde dag beschikbaar in uw regio.",
  lookingForPrefix: (kw) => `Op zoek naar betrouwbare ${kw}-diensten? `,
  internalLinkText: "Neem vandaag contact op",
  internalLinkTrailing: " voor meer informatie over onze diensten.",
  internalLinkTitle: "Neem contact op voor meer informatie",
  outboundPrefix: "Lees meer op ",
  outboundLinkText: "betrouwbare bronnen",
  outboundSuffix: ".",
  transitionBlock: `<p>Daarnaast is ons team toegewijd aan kwaliteit. Bovendien richten we ons op resultaten. Daarom kunt u op ons rekenen voor consistente service.</p>`,
  imgAltSuffix: " - professionele service",
  schemaDescription: (kw) => kw ? `Professionele ${kw}-diensten — vertrouwd, betrouwbaar en lokaal.` : "Professionele service",
  actionPrefix: "Krijg ",
  uniquenessPadding: " — Vertrouwde lokale service",
  actionWordRegex: /\b(krijg|koop|bestel|boek|reserveer|contact|bel|ontdek|abonneer|gratis|beste|nieuw|probeer|vind)\b/i,
  densityTemplates: (kw) => [
    `Ons ${kw}-team focust op echte resultaten die klanten daadwerkelijk opmerken.`,
    `Wanneer u kiest voor onze ${kw}, krijgt u duidelijke prijzen en vriendelijke ondersteuning van begin tot eind.`,
    `We maken ${kw} eenvoudig, zodat u minder tijd besteedt aan zorgen en meer tijd aan het genieten van het resultaat.`,
    `Elk ${kw}-project volgt een bewezen proces gebaseerd op kwaliteit en zorg.`,
    `Als u vragen heeft over ${kw}, helpen onze specialisten u graag bij elke stap.`,
    `${kw} bij ons boeken is snel, transparant en afgestemd op uw schema.`,
  ],
  densitySubstitutes: ["onze service", "deze service", "de service", "ons werk", "het werk van ons team"],
};

const POLISH: PhrasePack = {
  geoHeading: (kw) => `Lokalna usługa ${kw ? kw + " " : ""}w Twoim regionie`,
  leadIntro: (kw) => `Szukasz zaufanego ${kw}? Jesteśmy lokalnym zespołem obsługującym klientów w pobliżu i w Twojej okolicy, zapewniając szybkie, łatwe, niezawodne i premium wyniki ${kw}. Nasi certyfikowani, sprawdzeni i polecani specjaliści ${kw} oferują wsparcie najwyższej klasy tego samego dnia — uzyskaj bezpłatną wycenę z przejrzystymi cenami i skontaktuj się z nami teraz, aby zarezerwować konsultację ${kw}.`,
  community: (kw) => `Jako lokalni eksperci ${kw} ściśle współpracujemy ze społecznością i rodzinami wokół Ciebie, a nasz pobliski zespół jest gotowy do pomocy.`,
  serviceArea: (kw) => `Nasz obszar usług ${kw} obejmuje pobliskie dzielnice, z dostawą i pokryciem dostępnym w całym regionie.`,
  availability: (kw) => `Jesteśmy otwarci i dostępni dzisiaj dla ${kw} w godzinach pracy — odwiedź nas, zadzwoń lub skontaktuj się z nami, aby uzyskać odpowiedź tego samego dnia.`,
  credibility: (kw) => `Lokalnie zaufani, nasi specjaliści ${kw} w okolicy zapewniają pobliskie wsparcie, które klienci polecają w całym regionie.`,
  trustSupport: (kw) => `Wsparte zweryfikowanymi recenzjami, opiniami, gwarancją satysfakcji i objętą gwarancją usługą ${kw} od certyfikowanych ekspertów.`,
  offerSupport: (kw) => `Skorzystaj z naszej ekskluzywnej darmowej wersji próbnej ${kw}, specjalnego pakietu rabatowego i planu cenowego od z oszczędnościami pakietowymi.`,
  seaCta: "Skontaktuj się z naszym zespołem, aby zarezerwować bezpłatną konsultację już dziś.",
  seaBenefit: "Dostarczamy szybkie, niezawodne i premium wyniki, którym możesz zaufać.",
  seaTrust: "Nasza usługa jest zaufana, certyfikowana i sprawdzona, z zweryfikowanymi recenzjami i gwarancją satysfakcji.",
  seaOffer: "Uzyskaj bezpłatną wycenę z przejrzystymi cenami — bez ukrytych opłat, tylko prawdziwa wartość.",
  seaUrgency: "Odpowiedź tego samego dnia dostępna — zadzwoń teraz, aby uzyskać natychmiastowe wsparcie najwyższej klasy.",
  seaIntent: "Zadzwoń do nas lub wyślij wiadomość do naszego zespołu, aby zacząć od razu.",
  geoLocal: "Jesteśmy lokalnym zespołem obsługującym klientów w pobliżu i w Twojej okolicy.",
  geoServiceArea: "Nasz obszar usług obejmuje pobliskie dzielnice, z dostawą dostępną w całym regionie.",
  geoCommunity: "Jako lokalni eksperci ściśle współpracujemy ze społecznością i rodzinami wokół Ciebie.",
  geoAvailability: "Jesteśmy otwarci i dostępni dzisiaj — skontaktuj się z nami w godzinach pracy, aby umówić wizytę tego samego dnia.",
  geoCredibility: "Lokalnie zaufani, nasi specjaliści w regionie zapewniają pobliskie wsparcie, które klienci polecają.",
  ctaLinkText: "Skontaktuj się z nami dzisiaj, aby uzyskać bezpłatną wycenę",
  ctaLinkSuffix: " — szybka, lokalna, zaufana usługa dostępna tego samego dnia w Twojej okolicy.",
  lookingForPrefix: (kw) => `Szukasz zaufanych usług ${kw}? `,
  internalLinkText: "Skontaktuj się z nami dzisiaj",
  internalLinkTrailing: ", aby dowiedzieć się więcej o naszych usługach.",
  internalLinkTitle: "Skontaktuj się z nami, aby uzyskać więcej informacji",
  outboundPrefix: "Dowiedz się więcej z ",
  outboundLinkText: "zaufanych źródeł",
  outboundSuffix: ".",
  transitionBlock: `<p>Dodatkowo nasz zespół jest zaangażowany w jakość. Ponadto skupiamy się na wynikach. Dlatego możesz polegać na nas w zakresie spójnej usługi.</p>`,
  imgAltSuffix: " - profesjonalna usługa",
  schemaDescription: (kw) => kw ? `Profesjonalne usługi ${kw} — zaufane, niezawodne i lokalne.` : "Profesjonalna usługa",
  actionPrefix: "Otrzymaj ",
  uniquenessPadding: " — Zaufana lokalna usługa",
  actionWordRegex: /\b(otrzymaj|kup|zamów|zarezerwuj|skontaktuj|zadzwoń|odkryj|subskrybuj|darmowy|najlepszy|nowy|spróbuj|znajdź)\b/i,
  densityTemplates: (kw) => [
    `Nasz zespół ${kw} koncentruje się na realnych wynikach, które klienci naprawdę zauważają.`,
    `Kiedy wybierasz nasz ${kw}, otrzymujesz jasne ceny i przyjazną pomoc od początku do końca.`,
    `Sprawiamy, że ${kw} jest proste, więc spędzasz mniej czasu na zmartwieniach, a więcej na cieszeniu się rezultatem.`,
    `Każdy projekt ${kw} przebiega według sprawdzonego procesu opartego na jakości i staranności.`,
    `Jeśli masz pytania dotyczące ${kw}, nasi specjaliści chętnie poprowadzą Cię na każdym kroku.`,
    `Rezerwacja ${kw} u nas jest szybka, przejrzysta i dostosowana do Twojego harmonogramu.`,
  ],
  densitySubstitutes: ["nasza usługa", "ta usługa", "usługa", "nasza praca", "praca naszego zespołu"],
};

const TURKISH: PhrasePack = {
  geoHeading: (kw) => `${kw ? kw.charAt(0).toUpperCase() + kw.slice(1) + " " : ""}Bölgenize Yerel Hizmet`,
  leadIntro: (kw) => `Güvenilir ${kw} mı arıyorsunuz? Yakınınızdaki ve bölgenizdeki müşterilere hizmet veren yerel bir ekibiz; hızlı, kolay, güvenilir ve birinci sınıf ${kw} sonuçları sunuyoruz. Sertifikalı, kanıtlanmış ve önerilen ${kw} uzmanlarımız aynı gün en üst düzey destek sağlar — şeffaf fiyatlandırma ile ücretsiz teklif alın ve ${kw} danışmanlığınızı rezerve etmek için şimdi bizimle iletişime geçin.`,
  community: (kw) => `${kw} alanında yerel uzmanlar olarak, çevrenizdeki toplum ve ailelerle yakın çalışıyoruz; yakındaki ekibimiz yardıma hazır.`,
  serviceArea: (kw) => `${kw} hizmet alanımız yakındaki mahalleleri kapsar, bölge genelinde teslimat ve kapsama sunar.`,
  availability: (kw) => `${kw} için bugün açığız ve mesai saatlerinde ulaşılabiliriz — bizi ziyaret edin, arayın veya aynı gün yanıt için bizimle iletişime geçin.`,
  credibility: (kw) => `Yerel olarak güvenilir, bölgedeki ${kw} uzmanlarımız müşterilerin tüm bölgede önerdiği yakın destek sağlar.`,
  trustSupport: (kw) => `Doğrulanmış incelemeler, referanslar, memnuniyet garantisi ve sertifikalı uzmanlardan garantili ${kw} hizmeti ile desteklenir.`,
  offerSupport: (kw) => `Özel ücretsiz ${kw} denememizden, özel indirim paketimizden ve paket tasarrufları ile başlayan fiyat planımızdan yararlanın.`,
  seaCta: "Bugün ücretsiz danışmanlığınızı rezerve etmek için ekibimizle iletişime geçin.",
  seaBenefit: "Güvenebileceğiniz hızlı, güvenilir ve birinci sınıf sonuçlar sunuyoruz.",
  seaTrust: "Hizmetimiz güvenilir, sertifikalı ve kanıtlanmıştır; doğrulanmış incelemeler ve memnuniyet garantisi vardır.",
  seaOffer: "Şeffaf fiyatlandırma ile ücretsiz teklif alın — gizli ücret yok, sadece gerçek değer.",
  seaUrgency: "Aynı gün yanıt mevcut — anında, en üst düzey destek için şimdi arayın.",
  seaIntent: "Hemen başlamak için bizi arayın veya ekibimize mesaj gönderin.",
  geoLocal: "Yakınınızdaki ve bölgenizdeki müşterilere hizmet veren yerel bir ekibiz.",
  geoServiceArea: "Hizmet alanımız yakındaki mahalleleri kapsar, bölge genelinde teslimat sunar.",
  geoCommunity: "Yerel uzmanlar olarak, çevrenizdeki toplum ve ailelerle yakın çalışıyoruz.",
  geoAvailability: "Bugün açığız ve ulaşılabiliriz — aynı gün ziyaret için mesai saatlerinde bizimle iletişime geçin.",
  geoCredibility: "Yerel olarak güvenilir, bölgedeki uzmanlarımız müşterilerin önerdiği yakın destek sağlar.",
  ctaLinkText: "Ücretsiz teklif için bugün bizimle iletişime geçin",
  ctaLinkSuffix: " — bölgenizde aynı gün mevcut hızlı, yerel, güvenilir hizmet.",
  lookingForPrefix: (kw) => `Güvenilir ${kw} hizmetleri mi arıyorsunuz? `,
  internalLinkText: "Bugün bizimle iletişime geçin",
  internalLinkTrailing: " hizmetlerimiz hakkında daha fazla bilgi edinmek için.",
  internalLinkTitle: "Daha fazla bilgi için bizimle iletişime geçin",
  outboundPrefix: "Daha fazlasını öğrenin: ",
  outboundLinkText: "güvenilir kaynaklar",
  outboundSuffix: ".",
  transitionBlock: `<p>Ayrıca, ekibimiz kaliteye bağlıdır. Üstelik sonuçlara odaklanıyoruz. Bu nedenle, tutarlı hizmet için bize güvenebilirsiniz.</p>`,
  imgAltSuffix: " - profesyonel hizmet",
  schemaDescription: (kw) => kw ? `Profesyonel ${kw} hizmetleri — güvenilir, yakın ve yerel.` : "Profesyonel hizmet",
  actionPrefix: "Hemen ",
  uniquenessPadding: " — Güvenilir Yerel Hizmet",
  actionWordRegex: /\b(hemen|satın al|sipariş|rezerve|iletişim|ara|keşfet|abone|ücretsiz|en iyi|yeni|dene|bul)\b/i,
  densityTemplates: (kw) => [
    `${kw} ekibimiz, müşterilerin gerçekten fark ettiği gerçek sonuçlara odaklanır.`,
    `${kw} hizmetimizi seçtiğinizde, baştan sona net fiyatlandırma ve dostça destek alırsınız.`,
    `${kw} işini basit hale getiriyoruz, böylece daha az endişelenip sonucun keyfini daha çok çıkarırsınız.`,
    `Her ${kw} projesi, kalite ve özen üzerine kurulu kanıtlanmış bir süreci izler.`,
    `${kw} hakkında sorularınız varsa, uzmanlarımız her adımda size yol göstermekten mutluluk duyar.`,
    `${kw} rezervasyonu hızlı, şeffaf ve programınıza göre tasarlanmıştır.`,
  ],
  densitySubstitutes: ["hizmetimiz", "bu hizmet", "hizmet", "çalışmamız", "ekibimizin çalışması"],
};

const PACKS: Record<PhrasePackKey, PhrasePack> = {
  en: ENGLISH,
  fr: FRENCH,
  es: SPANISH,
  de: GERMAN,
  it: ITALIAN,
  pt: PORTUGUESE,
  nl: DUTCH,
  pl: POLISH,
  tr: TURKISH,
};

/**
 * Resolve a phrase pack from a free-form language string. Accepts ISO-2 codes
 * ("fr"), full English names ("French"), and native names ("Français").
 * Falls back to English when nothing matches so existing callers stay safe.
 */
export function resolvePhrasePack(language: string | null | undefined): PhrasePack {
  if (!language) return ENGLISH;
  const norm = language.trim().toLowerCase();
  if (!norm) return ENGLISH;

  // Direct ISO-2 hit
  if ((PACKS as Record<string, PhrasePack>)[norm]) {
    return (PACKS as Record<string, PhrasePack>)[norm];
  }

  const ALIASES: Record<string, PhrasePackKey> = {
    english: "en", en: "en", "en-us": "en", "en-gb": "en",
    french: "fr", fr: "fr", "fr-fr": "fr", français: "fr", francais: "fr",
    spanish: "es", es: "es", "es-es": "es", español: "es", espanol: "es", castellano: "es",
    german: "de", de: "de", "de-de": "de", deutsch: "de",
    italian: "it", it: "it", "it-it": "it", italiano: "it",
    portuguese: "pt", pt: "pt", "pt-br": "pt", "pt-pt": "pt", português: "pt", portugues: "pt",
    dutch: "nl", nl: "nl", "nl-nl": "nl", nederlands: "nl",
    polish: "pl", pl: "pl", "pl-pl": "pl", polski: "pl",
    turkish: "tr", tr: "tr", "tr-tr": "tr", türkçe: "tr", turkce: "tr",
  };

  const key = ALIASES[norm];
  return key ? PACKS[key] : ENGLISH;
}
