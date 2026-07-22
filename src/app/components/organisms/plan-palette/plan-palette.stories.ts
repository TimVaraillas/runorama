import type { Meta, StoryObj } from '@storybook/angular';
import type { PaletteEntry, PlanHourlyRecap, PlanSequenceMinutes } from '../../../core/models';
import { PlanPaletteComponent } from './plan-palette.component';

const entries: PaletteEntry[] = [
  {
    product: { id: 'p1', categoryId: 'c1', brand: 'Maurten', name: 'Gel 100', unitWeight: 40, energy: 100, carbs: 25, fats: 0, proteins: 0, salt: 22 },
    carried: 6,
    remaining: 4,
  },
  {
    product: { id: 'p2', categoryId: 'c2', brand: 'Clif', name: 'Bar Chocolate', unitWeight: 68, energy: 260, carbs: 44, fats: 6, proteins: 9, salt: 150 },
    carried: 3,
    remaining: 0,
  },
];

const recapRows: PlanHourlyRecap[] = [
  { hour: 1, carbs: 60, targetCarbs: 60, energy: 250, targetEnergy: 250 },
  { hour: 2, carbs: 40, targetCarbs: 60, energy: 180, targetEnergy: 250 },
];

const meta: Meta<PlanPaletteComponent> = {
  title: 'Organisms/PlanPalette',
  component: PlanPaletteComponent,
  tags: ['autodocs'],
  argTypes: {
    sequenceChange: { action: 'sequenceChange' },
    dragStarted: { action: 'dragStarted' },
    dragEnded: { action: 'dragEnded' },
  },
  render: (args) => ({
    props: args,
    template: `<div class="max-w-sm">
      <ui-plan-palette
        [entries]="entries"
        [unplacedUnits]="unplacedUnits"
        [sequenceMinutes]="sequenceMinutes"
        [sequenceOptions]="sequenceOptions"
        [recapRows]="recapRows"
        (sequenceChange)="sequenceChange($event)"
        (dragStarted)="dragStarted()"
        (dragEnded)="dragEnded()"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanPaletteComponent>;

export const Default: Story = {
  args: {
    entries,
    unplacedUnits: 4,
    sequenceMinutes: 10 as PlanSequenceMinutes,
    sequenceOptions: [5, 10, 15, 20] as PlanSequenceMinutes[],
    recapRows,
  },
};
