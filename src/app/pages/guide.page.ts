import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faBookOpen,
  faChartLine,
  faCheck,
  faFilePdf,
  faFlag,
  faPersonRunning,
  faRoute,
  faUserPlus,
  faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import { ButtonComponent } from '../components/atoms/button/button.component';
import { IconComponent } from '../components/atoms/icon/icon.component';

/** Un bloc de contenu d'une section de documentation. */
interface DocBlock {
  heading?: string;
  text?: string;
  items?: string[];
  tip?: string;
  /** Capture illustrant spécifiquement ce bloc (déposée dans `public/guide/`). */
  image?: string;
}

/** Une section de documentation (une fonctionnalité). */
interface DocSection {
  id: string;
  icon: IconDefinition;
  title: string;
  intro: string;
  blocks: DocBlock[];
  /** Capture d'écran illustrant la fonctionnalité (déposée dans `public/guide/`). */
  image?: string;
}

/**
 * Page publique de documentation : présente en détail chaque fonctionnalité de
 * Runorama, avec un sommaire latéral (aside) et des sections ancrées.
 */
@Component({
  selector: 'app-guide-page',
  standalone: true,  imports: [RouterLink, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-6xl px-4 py-10">
      <!-- En-tête -->
      <header class="max-w-3xl">
        <span
          class="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-600"
        >
          <ui-icon [icon]="faPersonRunning" />
          Documentation
        </span>
        <h1 class="mt-5 font-display text-4xl font-bold text-slate-900 sm:text-5xl">
          Guide de Runorama
        </h1>
        <p class="mt-4 text-lg text-slate-600">
          Toutes les fonctionnalités expliquées en détail, du premier compte au plan de course
          exporté en PDF. Utilise le sommaire pour naviguer.
        </p>
      </header>

      <div class="mt-10 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <!-- Sommaire latéral -->
        <aside class="lg:sticky lg:top-20 lg:self-start">
          <p class="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Sommaire</p>
          <nav class="mt-2 space-y-1">
            @for (section of sections; track section.id) {
              <a
                [href]="'#' + section.id"
                (click)="scrollTo(section.id, $event)"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                [class.bg-brand-50]="activeSection() === section.id"
                [class.text-brand-700]="activeSection() === section.id"
                [class.text-slate-600]="activeSection() !== section.id"
                [class.hover:bg-slate-100]="activeSection() !== section.id"
              >
                <ui-icon [icon]="section.icon" fixedWidth />
                <span class="truncate">{{ section.title }}</span>
              </a>
            }
          </nav>
        </aside>

        <!-- Contenu -->
        <main class="mt-10 min-w-0 lg:mt-0">
          @for (section of sections; track section.id) {
            <section [id]="section.id" class="scroll-mt-24 border-b border-slate-100 pb-12 mb-12">
              <div class="flex items-center gap-3">
                <span
                  class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-brand-600 to-secondary-500 text-white shadow-sm"
                >
                  <ui-icon [icon]="section.icon" size="lg" />
                </span>
                <h2 class="font-display text-2xl font-bold text-slate-900">{{ section.title }}</h2>
              </div>

              <p class="mt-4 text-slate-600">{{ section.intro }}</p>

              @for (block of section.blocks; track $index) {
                <div class="mt-6">
                  @if (block.heading) {
                    <h3 class="font-display text-base font-bold text-slate-800">
                      {{ block.heading }}
                    </h3>
                  }
                  @if (block.text) {
                    <p class="mt-1 text-slate-600">{{ block.text }}</p>
                  }
                  @if (block.items?.length) {
                    <ul class="mt-2 space-y-1.5">
                      @for (item of block.items; track item) {
                        <li class="flex items-start gap-2 text-sm text-slate-600">
                          <ui-icon
                            [icon]="faCheck"
                            size="sm"
                            class="mt-0.5 shrink-0 text-secondary-500"
                          />
                          <span>{{ item }}</span>
                        </li>
                      }
                    </ul>
                  }
                  @if (block.tip) {
                    <p class="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <span class="font-semibold">Bon à savoir&nbsp;:</span> {{ block.tip }}
                    </p>
                  }
                  @if (block.image; as blockImage) {
                    @if (!failedImages().has(blockImage)) {
                      <div
                        class="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <img
                          [src]="blockImage"
                          [alt]="block.heading || section.title"
                          (error)="onImageError(blockImage)"
                          class="w-full"
                        />
                      </div>
                    }
                  }
                </div>
              }

              @if (section.image) {
                <div class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  @if (!failedImages().has(section.image)) {
                    <img
                      [src]="section.image"
                      [alt]="section.title"
                      (error)="onImageError(section.image)"
                      class="w-full"
                    />
                  } @else {
                    <div
                      class="flex aspect-video flex-col items-center justify-center gap-2 bg-slate-50 text-slate-300"
                    >
                      <ui-icon [icon]="section.icon" size="xl" />
                      <span class="text-xs font-medium text-slate-400">Capture à venir</span>
                    </div>
                  }
                </div>
              }
            </section>
          }

          <!-- Appel à l'action -->
          <div class="rounded-2xl bg-slate-50 p-8 text-center">
            <h2 class="font-display text-2xl font-bold text-slate-900">
              Prêt à préparer ta prochaine course&nbsp;?
            </h2>
            <p class="mt-2 text-slate-600">
              Crée ton compte et compose ta première stratégie en quelques minutes.
            </p>
            <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a routerLink="/register">
                <ui-button color="primary" size="lg">Créer un compte</ui-button>
              </a>
              <a routerLink="/login">
                <ui-button color="primary" variant="outlined" size="lg">Se connecter</ui-button>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
})
export class GuidePage {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly faPersonRunning = faPersonRunning;
  protected readonly faCheck = faCheck;

  /** Identifiant de la section active (mise en surbrillance dans le sommaire). */
  protected readonly activeSection = signal('demarrage');

  /** Sources d'images en échec (affiche un emplacement de remplacement). */
  protected readonly failedImages = signal<Set<string>>(new Set());

  constructor() {
    // Scrollspy : met à jour la section active au défilement (navigateur seul).
    afterNextRender(() => this.setupScrollSpy());
  }

  private setupScrollSpy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeSection.set(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    for (const section of this.sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  /** Fait défiler en douceur jusqu'à la section cible. */
  protected scrollTo(id: string, event: Event): void {
    event.preventDefault();
    this.activeSection.set(id);
    if (!isPlatformBrowser(this.platformId)) return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected onImageError(src: string): void {
    this.failedImages.update((set) => new Set(set).add(src));
  }

  protected readonly sections: DocSection[] = [
    {
      id: 'demarrage',
      icon: faUserPlus,
      title: 'Compte & prise en main',
      intro:
        'Crée ton compte pour accéder à tes produits et à tes stratégies. Tout est sauvegardé en ligne et te suit d’un appareil à l’autre.',
      blocks: [
        {
          heading: 'Inscription',
          text: 'Renseigne prénom, nom, adresse e-mail et un mot de passe.',
          items: [
            'Le mot de passe doit atteindre un niveau de robustesse minimum ; un indicateur t’aide en direct.',
            'Un e-mail de confirmation t’est envoyé juste après l’inscription.',
          ],
        },
        {
          heading: 'Vérification de l’adresse e-mail',
          text: 'La connexion reste bloquée tant que ton adresse n’est pas confirmée.',
          items: [
            'Clique sur le lien reçu par e-mail pour activer ton compte.',
            'Tu peux redemander l’envoi du lien si tu ne l’as pas reçu.',
          ],
        },
        {
          heading: 'Connexion & mot de passe oublié',
          items: [
            'Connecte-toi avec ton adresse e-mail et ton mot de passe.',
            'Un lien « Mot de passe oublié » permet de le réinitialiser par e-mail.',
          ],
        },
        {
          heading: 'Profil',
          text: 'Retrouve tes informations personnelles et déconnecte-toi depuis le menu utilisateur, en haut à droite.',
        },
      ],
      image: 'guide/01-connexion.png',
    },
    {
      id: 'produits',
      icon: faBookOpen,
      title: 'Bibliothèque de produits',
      intro:
        'La bibliothèque centralise tous les produits nutritionnels utilisables dans tes stratégies : gels, barres, boissons, aliments solides…',
      blocks: [
        {
          heading: 'Rechercher et filtrer',
          items: [
            'Recherche par nom ou par marque.',
            'Filtre par catégorie de produit.',
            'Affiche uniquement tes produits favoris.',
          ],
        },
        {
          heading: 'Vue tableau ou grille',
          text: 'Bascule entre une vue tableau (dense, idéale pour comparer les valeurs) et une vue grille (plus visuelle).',
        },
        {
          heading: 'Colonnes personnalisables',
          text: 'En vue tableau, choisis les colonnes affichées via le menu « Colonnes ».',
          items: [
            'Lipides, protéines et sodium sont masqués par défaut pour gagner en lisibilité.',
            'Ton choix de colonnes est mémorisé pour tes prochaines visites.',
          ],
        },
        {
          heading: 'Favoris et notes personnelles',
          items: [
            'Mets un produit en favori (étoile) pour le retrouver rapidement.',
            'Ajoute une note privée : appréciation du goût et tolérance digestive.',
          ],
        },
        {
          heading: 'Proposer un nouveau produit',
          text: 'Le produit n’existe pas encore ? Crée-le via « Proposer un produit ».',
          items: [
            'Renseigne la marque, le nom, la catégorie, les valeurs nutritionnelles (énergie, glucides, lipides, protéines, sodium) et le poids unitaire.',
            'Ajoute éventuellement une photo et le lien de la fiche fabricant pour faciliter la vérification.',
          ],
          image: 'guide/03-ajout-produit.png',
        },
        {
          heading: 'Modération et statuts',
          text: 'Les produits de la communauté sont modérés pour garder un catalogue fiable.',
          items: [
            'En attente : ton produit vient d’être proposé et attend une revue.',
            'Validé : publié dans le catalogue public, visible par tous.',
            'Refusé ou archivé : retiré du catalogue commun.',
          ],
          tip: 'Un produit que tu proposes reste immédiatement utilisable dans tes propres stratégies, même tant qu’il est en attente de validation.',
        },
      ],
      image: 'guide/02-bibliotheque-produits.png',
    },
    {
      id: 'strategies',
      icon: faFlag,
      title: 'Stratégies de nutrition',
      intro:
        'Une stratégie correspond à une course. Elle réunit tes objectifs, ton inventaire, ton plan horaire et ta logistique de ravitaillement.',
      blocks: [
        {
          heading: 'Créer une stratégie',
          items: [
            'Depuis l’onglet « Stratégies de nutrition », crée un nouvel évènement.',
            'Renseigne un nom, une date et ton chrono cible (durée estimée de la course).',
          ],
        },
        {
          heading: 'Objectifs nutritionnels horaires',
          text: 'Définis ce que tu veux consommer par heure de course.',
          items: [
            'Glucides (g/h), sodium, hydratation et autres nutriments.',
            'Ces cibles servent de référence aux jauges de couverture et au récapitulatif horaire.',
          ],
        },
        {
          heading: 'Retrouver ses stratégies',
          items: [
            'Recherche une stratégie par son nom et filtre par intervalle de dates.',
            'Ouvre-la pour accéder à son détail : inventaire, plan de consommation et ravitaillements.',
          ],
        },
      ],
      image: 'guide/04-strategies-liste.png',
    },
    {
      id: 'inventaire',
      icon: faUtensils,
      title: 'Inventaire',
      intro: 'L’inventaire liste tout ce que tu emportes pour la course, avec les quantités.',
      blocks: [
        {
          heading: 'Ajouter des produits',
          items: [
            'Ouvre le panneau « Ajouter des produits ».',
            'Recherche, filtre par catégorie ou favoris, puis coche les produits (la liste se charge au défilement).',
            'Valide ta sélection : les produits rejoignent l’inventaire.',
          ],
        },
        {
          heading: 'Ajuster les quantités',
          text: 'Modifie la quantité de chaque produit ; les totaux (poids et nutriments) se recalculent automatiquement.',
        },
        {
          heading: 'Couverture des objectifs',
          text: 'Des jauges comparent en direct ce que tu portes à tes besoins.',
          items: [
            'Énergie et glucides emportés face à tes cibles.',
            'Tu repères immédiatement un manque avant le départ.',
          ],
        },
        {
          heading: 'Répartition par emplacement',
          text: 'Indique où se trouve chaque produit.',
          items: [
            'Ce que tu portes dès le départ.',
            'Ce que tu récupères sur chaque ravitaillement.',
          ],
          tip: 'La répartition alimente automatiquement la logistique des ravitos et le contenu de tes sacs.',
        },
      ],
      image: 'guide/05-strategies-inventaire.png',
    },
    {
      id: 'plan',
      icon: faChartLine,
      title: 'Plan de consommation',
      intro:
        'Le plan place tes prises dans le temps pour lisser tes apports sur toute la durée de la course.',
      blocks: [
        {
          heading: 'Timeline en glisser-déposer',
          items: [
            'Dépose tes produits sur la timeline à l’instant où tu comptes les consommer.',
            'Déplace ou redimensionne une prise pour ajuster son horaire et sa durée.',
          ],
        },
        {
          heading: 'Découpage horaire',
          text: 'Le plan est découpé en tranches (horaires par défaut) que tu peux ajuster selon ta course.',
        },
        {
          heading: 'Récapitulatif par heure',
          text: 'Pour chaque tranche, Runorama affiche l’apport planifié face à ta cible : plus aucun trou ne t’échappe.',
        },
        {
          heading: 'Mode plein écran',
          text: 'Passe la timeline en plein écran pour éditer confortablement les plans des longues courses.',
        },
      ],
      image: 'guide/07-strategies-plan.png',
    },
    {
      id: 'ravitos',
      icon: faRoute,
      title: 'Ravitaillements & logistique',
      intro: 'Prépare chaque point de ravitaillement pour que rien ne manque le jour J.',
      blocks: [
        {
          heading: 'Positionner un ravitaillement',
          items: [
            'Place le ravito par son temps de passage estimé depuis le départ.',
            'Renseigne, si tu le souhaites, la distance et le dénivelé depuis le départ.',
          ],
        },
        {
          heading: 'Type de ravitaillement',
          items: [
            'Ravito course, fourni par l’organisation.',
            'Assistance personnelle.',
            'Drop bag.',
          ],
        },
        {
          heading: 'Récupérer et déposer',
          text: 'Détaille le contenu logistique de chaque point.',
          items: [
            'Ce que tu récupères : produits du catalogue et matériel.',
            'Ce que tu déposes.',
            'Une liste de tâches (todo) pour ne rien oublier.',
          ],
        },
      ],
      image: 'guide/06-strategies-ravitaillements.png',
    },
    {
      id: 'export',
      icon: faFilePdf,
      title: 'Export PDF',
      intro:
        'Quand ton plan est prêt, exporte un récapitulatif clair, prêt pour le terrain.',
      blocks: [
        {
          heading: 'Contenu du PDF',
          items: [
            'Inventaire complet des produits emportés.',
            'Plan horaire des prises.',
            'Logistique des ravitos : sacs, récupérations et dépôts.',
          ],
        },
        {
          heading: 'Impression & partage',
          text: 'Imprime le document ou transmets-le à ton équipe d’assistance.',
          tip: 'Autorise les fenêtres pop-up de ton navigateur pour lancer l’aperçu d’impression.',
        },
      ],
      image: 'guide/08-strategies-export.png',
    },
  ];
}
