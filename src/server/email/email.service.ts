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
