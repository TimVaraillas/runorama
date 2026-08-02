import { Resend } from 'resend';

/**
 * Service d'envoi d'e-mails transactionnels basé sur Resend.
 *
 * Le client n'est instancié que si `RESEND_API_KEY` est défini. En son absence
 * (typiquement en développement local), les e-mails sont simplement journalisés
 * dans la console afin de ne pas bloquer le flux.
 */

const apiKey = process.env['RESEND_API_KEY'];
const from = process.env['MAIL_FROM'] ?? 'Runorama <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * Envoie l'e-mail de réinitialisation de mot de passe.
 *
 * @param to Adresse du destinataire.
 * @param resetLink Lien complet de réinitialisation (contient le token à usage unique).
 */
export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  const subject = 'Réinitialisation de votre mot de passe Runorama';
  const html = buildResetEmailHtml(resetLink);
  const text = `Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe Runorama.
Ouvrez ce lien pour choisir un nouveau mot de passe (valable 1 heure) :

${resetLink}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`;

  // Repli développement : pas de clé API => on journalise le lien.
  if (!resend) {
    console.log(`[email] (mode dev, aucune clé RESEND_API_KEY) Lien pour ${to} : ${resetLink}`);
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    // On ne relance pas l'erreur vers le client (message générique côté route),
    // mais on la journalise pour le diagnostic.
    console.error(`[email] Échec de l'envoi à ${to} :`, error);
  }
}

/** Construit le corps HTML de l'e-mail de réinitialisation. */
function buildResetEmailHtml(resetLink: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:480px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
      <h1 style="margin:0 0 8px;font-size:20px;">Réinitialisation de mot de passe</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;">
        Vous avez demandé à réinitialiser votre mot de passe Runorama.
        Ce lien est valable pendant 1 heure et ne peut servir qu'une seule fois.
      </p>
      <a href="${resetLink}"
         style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:10px;">
        Choisir un nouveau mot de passe
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Envoie l'e-mail de confirmation d'adresse à la création d'un compte.
 * Tant que le lien n'est pas ouvert, la connexion reste bloquée.
 *
 * @param to Adresse du destinataire.
 * @param verificationLink Lien complet de confirmation (contient le token à usage unique).
 */
export async function sendVerificationEmail(to: string, verificationLink: string): Promise<void> {
  const subject = 'Confirmez votre adresse e-mail Runorama';
  const html = buildVerificationEmailHtml(verificationLink);
  const text = `Bienvenue sur Runorama !

Pour activer votre compte et pouvoir vous connecter, confirmez votre adresse e-mail
en ouvrant ce lien (valable 24 heures) :

${verificationLink}

Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.`;

  // Repli développement : pas de clé API => on journalise le lien.
  if (!resend) {
    console.log(
      `[email] (mode dev, aucune clé RESEND_API_KEY) Lien de confirmation pour ${to} : ${verificationLink}`,
    );
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error(`[email] Échec de l'envoi à ${to} :`, error);
  }
}

/** Construit le corps HTML de l'e-mail de confirmation d'adresse. */
function buildVerificationEmailHtml(verificationLink: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:480px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
      <h1 style="margin:0 0 8px;font-size:20px;">Bienvenue sur Runorama</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;">
        Merci pour votre inscription. Pour activer votre compte et pouvoir vous connecter,
        confirmez votre adresse e-mail. Ce lien est valable pendant 24 heures.
      </p>
      <a href="${verificationLink}"
         style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:10px;">
        Confirmer mon adresse e-mail
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet e-mail en toute sécurité.
      </p>
    </div>
  </body>
</html>`;
}

// ---------------------------------------------------------------------------
// Bibliothèque communautaire : modération des produits
// ---------------------------------------------------------------------------

/** Coquille HTML commune aux e-mails de modération de produits. */
function buildEmailShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="max-width:480px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;">
      <h1 style="margin:0 0 16px;font-size:20px;">${title}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

/** Bouton d'action HTML réutilisable. */
function buildEmailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;border-radius:10px;">${label}</a>`;
}

/** Détails d'un produit soumis, pour les e-mails de modération. */
export interface ProductModerationMailInfo {
  productName: string;
  brand: string;
  /** Nom complet du propriétaire à l'origine de la soumission. */
  ownerName: string;
  /** Lien vers la file de modération (côté administrateur). */
  reviewLink: string;
  /** URL fabricant/produit fournie par le contributeur (facultative). */
  sourceUrl?: string;
}

/**
 * Notifie les administrateurs qu'un produit a été soumis et attend une revue.
 *
 * @param to Adresse(s) administrateur destinataire(s).
 * @param info Détails du produit soumis et lien de modération.
 */
export async function sendProductSubmittedEmail(
  to: string | string[],
  info: ProductModerationMailInfo,
): Promise<void> {
  const subject = `Nouveau produit à valider : ${info.brand} — ${info.productName}`;
  const sourceLine = info.sourceUrl
    ? `<p style="margin:0 0 8px;font-size:14px;color:#475569;">Source indiquée : <a href="${info.sourceUrl}">${info.sourceUrl}</a></p>`
    : '';
  const html = buildEmailShell(
    'Un produit attend votre validation',
    `<p style="margin:0 0 8px;font-size:14px;color:#475569;">
       <strong>${info.ownerName}</strong> a proposé le produit
       <strong>${info.brand} — ${info.productName}</strong> pour la bibliothèque communautaire.
     </p>
     ${sourceLine}
     <p style="margin:0 0 24px;font-size:14px;color:#475569;">
       Vérifiez les valeurs nutritionnelles puis validez, corrigez ou refusez la proposition.
     </p>
     ${buildEmailButton(info.reviewLink, 'Ouvrir la file de modération')}`,
  );
  const text = `${info.ownerName} a proposé le produit ${info.brand} — ${info.productName} pour la bibliothèque communautaire.
${info.sourceUrl ? `Source : ${info.sourceUrl}\n` : ''}Vérifiez et validez ici : ${info.reviewLink}`;

  if (!resend) {
    console.log(
      `[email] (mode dev) Produit soumis « ${info.brand} — ${info.productName} » à valider : ${info.reviewLink}`,
    );
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error(`[email] Échec de l'envoi (soumission produit) :`, error);
  }
}

/**
 * Informe le contributeur que son produit a été validé et publié.
 *
 * @param to Adresse du propriétaire.
 * @param productLabel Libellé du produit (« Marque — Nom »).
 * @param catalogLink Lien vers le catalogue.
 */
export async function sendProductApprovedEmail(
  to: string,
  productLabel: string,
  catalogLink: string,
): Promise<void> {
  const subject = `Votre produit « ${productLabel} » est validé`;
  const html = buildEmailShell(
    'Votre produit rejoint le catalogue',
    `<p style="margin:0 0 24px;font-size:14px;color:#475569;">
       Bonne nouvelle : votre produit <strong>${productLabel}</strong> a été validé par un
       administrateur. Il est désormais public et disponible pour toute la communauté.
     </p>
     ${buildEmailButton(catalogLink, 'Voir le catalogue')}`,
  );
  const text = `Votre produit ${productLabel} a été validé et publié dans le catalogue commun.
${catalogLink}`;

  if (!resend) {
    console.log(`[email] (mode dev) Produit validé « ${productLabel} » pour ${to}`);
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error(`[email] Échec de l'envoi (validation produit) :`, error);
  }
}

/**
 * Informe le contributeur que son produit a été refusé (il reste utilisable
 * en privé et peut être corrigé puis resoumis).
 *
 * @param to Adresse du propriétaire.
 * @param productLabel Libellé du produit (« Marque — Nom »).
 * @param reason Motif du refus.
 * @param productLink Lien vers ses produits.
 */
export async function sendProductRejectedEmail(
  to: string,
  productLabel: string,
  reason: string,
  productLink: string,
): Promise<void> {
  const subject = `Votre produit « ${productLabel} » n'a pas été retenu`;
  const reasonBlock = reason
    ? `<p style="margin:0 0 16px;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;font-size:14px;color:#991b1b;">
         <strong>Motif :</strong> ${reason}
       </p>`
    : '';
  const html = buildEmailShell(
    'Votre produit n\u2019a pas été publié',
    `<p style="margin:0 0 16px;font-size:14px;color:#475569;">
       Votre produit <strong>${productLabel}</strong> n'a pas été retenu pour le catalogue commun.
       Il reste disponible dans vos produits en mode privé : vous pouvez le corriger et le
       soumettre à nouveau.
     </p>
     ${reasonBlock}
     ${buildEmailButton(productLink, 'Voir mes produits')}`,
  );
  const text = `Votre produit ${productLabel} n'a pas été retenu pour le catalogue commun.
${reason ? `Motif : ${reason}\n` : ''}Il reste disponible en privé, corrigez-le et resoumettez-le : ${productLink}`;

  if (!resend) {
    console.log(`[email] (mode dev) Produit refusé « ${productLabel} » pour ${to} (motif : ${reason})`);
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, html, text });
  if (error) {
    console.error(`[email] Échec de l'envoi (refus produit) :`, error);
  }
}
