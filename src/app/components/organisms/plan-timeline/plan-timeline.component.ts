import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragMove, CdkDropList } from '@angular/cdk/drag-drop';
import { PlanTimelineGutterComponent } from '../../molecules/plan-timeline-gutter/plan-timeline-gutter.component';
import { PlanTimelineBlockComponent } from '../plan-timeline-block/plan-timeline-block.component';
import { PlanGhostBlockComponent } from '../../atoms/plan-ghost-block/plan-ghost-block.component';
import type {
  GhostBlock,
  IntakeResizeStartEvent,
  PlanConstrainPosition,
  PositionedIntake,
  SequenceMark,
} from '../../../core/models';

/**
 * Organism : piste verticale du plan de consommation.
 *
 * Regroupe la gouttière horaire, la piste de dépôt (`cdkDropList`) découpée en
 * séquences, les blocs de prises placées et l'emplacement fantôme prévisualisé.
 * Purement présentationnel : le glisser-déposer, le redimensionnement et les
 * mesures de géométrie sont pilotés par le parent, qui accède à la piste via
 * {@link trackElement}.
 */
@Component({
  selector: 'ui-plan-timeline',
  standalone: true,
  imports: [CdkDropList, CdkDrag, PlanTimelineGutterComponent, PlanTimelineBlockComponent, PlanGhostBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block rounded-2xl bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1 lg:overflow-y-auto',
  },
  template: `
    <div class="flex gap-2">
      <ui-plan-timeline-gutter [marks]="marks()" [height]="trackHeight()" />

      <!-- Piste -->
      <div
        #track
        cdkDropList
        [cdkDropListData]="'timeline'"
        [cdkDropListSortingDisabled]="true"
        (cdkDropListDropped)="timelineDrop.emit($event)"
        class="relative flex-1 overflow-hidden rounded-xl bg-slate-50/60"
        [style.height.px]="trackHeight()"
      >
        <!-- Lignes de séquence -->
        @for (mark of marks(); track mark.minute) {
          <div
            class="absolute inset-x-0 border-t"
            [class]="mark.major ? 'border-slate-200/70' : 'border-slate-100/70'"
            [style.top.px]="mark.top"
          ></div>
        }

        <!-- Blocs de prises -->
        @for (intake of intakes(); track intake.id) {
          <!--
            L'enveloppe porte le positionnement (couloir/hauteur) : le CDK ne
            manipule que le bloc interne pendant le drag, ce qui évite qu'il
            n'écrase nos styles de couloir au dépôt.
          -->
          <div
            class="absolute transition-[left,width]"
            [style.top.px]="intake.top"
            [style.height.px]="intake.height"
            [style.left]="laneLeft(intake.lane)"
            [style.width]="laneWidth()"
          >
            <ui-plan-timeline-block
              cdkDrag
              cdkDragLockAxis="y"
              [cdkDragConstrainPosition]="constrainPosition()"
              [cdkDragData]="{ kind: 'intake', intakeId: intake.id }"
              (cdkDragStarted)="dragStarted.emit()"
              (cdkDragMoved)="dragMoved.emit($event)"
              (cdkDragEnded)="dragEnded.emit()"
              [intake]="intake"
              [dragging]="dragging()"
              (remove)="removeIntake.emit(intake.id)"
              (resizeStart)="resizeStart.emit({ event: $event.event, edge: $event.edge, intake })"
            />
          </div>
        }

        <!-- Emplacement fantôme (drag depuis la palette) -->
        @if (ghost(); as g) {
          <ui-plan-ghost-block
            [top]="g.top"
            [height]="g.height"
            [left]="laneLeft(g.lane)"
            [width]="laneWidth()"
          />
        }
      </div>
    </div>
  `,
})
export class PlanTimelineComponent {
  /** Repères de séquence (position + libellé horaire). */
  readonly marks = input.required<SequenceMark[]>();
  /** Prises résolues et positionnées sur la piste. */
  readonly intakes = input.required<PositionedIntake[]>();
  /** Emplacement fantôme prévisualisé (drag depuis la palette). */
  readonly ghost = input<GhostBlock | null>(null);
  /** Hauteur totale de la piste (px). */
  readonly trackHeight = input.required<number>();
  /** Nombre de couloirs utilisés (pour la largeur des blocs). */
  readonly laneCount = input.required<number>();
  /** Vrai pendant qu'un élément est glissé (indice visuel d'empilement). */
  readonly dragging = input(false);
  /** Fonction contraignant la position d'un bloc glissé sur la grille. */
  readonly constrainPosition = input.required<PlanConstrainPosition>();

  /** Émis au dépôt d'un élément sur la piste. */
  readonly timelineDrop = output<CdkDragDrop<string>>();
  /** Émis au début du glissement d'une prise. */
  readonly dragStarted = output<void>();
  /** Émis pendant le glissement d'une prise (aperçu du créneau). */
  readonly dragMoved = output<CdkDragMove>();
  /** Émis à la fin du glissement d'une prise. */
  readonly dragEnded = output<void>();
  /** Émis pour retirer une prise du planning. */
  readonly removeIntake = output<string>();
  /** Émis quand une poignée de redimensionnement est saisie. */
  readonly resizeStart = output<IntakeResizeStartEvent>();

  private readonly trackRef = viewChild<ElementRef<HTMLElement>>('track');

  /** Élément DOM de la piste (mesures de géométrie côté parent). */
  trackElement(): HTMLElement | undefined {
    return this.trackRef()?.nativeElement;
  }

  protected laneLeft(lane: number): string {
    return `calc(${(lane / this.laneCount()) * 100}% + 2px)`;
  }

  protected laneWidth(): string {
    return `calc(${100 / this.laneCount()}% - 4px)`;
  }
}
