import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import type { PlanConstrainPosition, PositionedIntake, SequenceMark } from '../../../core/models';
import { PlanTimelineComponent } from './plan-timeline.component';

const product = {
  id: 'p1',
  categoryId: 'c1',
  brand: 'Maurten',
  name: 'Gel 100',
  unitWeight: 40,
  energy: 100,
  carbs: 25,
  fats: 0,
  proteins: 0,
  salt: 22,
};

const marks: SequenceMark[] = Array.from({ length: 7 }, (_, i) => ({
  minute: i * 10,
  top: i * 50,
  label: `${i}:00`,
  major: i % 2 === 0,
}));

const intakes: PositionedIntake[] = [
  {
    id: 'i1',
    productId: 'p1',
    startMinute: 10,
    durationMinutes: 10,
    quantity: 1,
    product,
    top: 50,
    height: 45,
    lane: 0,
    endMinute: 20,
    overlapped: false,
  },
  {
    id: 'i2',
    productId: 'p1',
    startMinute: 40,
    durationMinutes: 20,
    quantity: 1,
    product: { ...product, name: 'Barre énergétique' },
    top: 200,
    height: 95,
    lane: 0,
    endMinute: 60,
    overlapped: false,
  },
];

const constrainPosition: PlanConstrainPosition = (point) => point;

const meta: Meta<PlanTimelineComponent> = {
  title: 'Organisms/PlanTimeline',
  component: PlanTimelineComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [CdkDropListGroup] })],
  argTypes: {
    timelineDrop: { action: 'timelineDrop' },
    dragStarted: { action: 'dragStarted' },
    dragMoved: { action: 'dragMoved' },
    dragEnded: { action: 'dragEnded' },
    removeIntake: { action: 'removeIntake' },
    resizeStart: { action: 'resizeStart' },
  },
  render: (args) => ({
    props: args,
    template: `<div cdkDropListGroup class="max-w-md">
      <ui-plan-timeline
        [marks]="marks"
        [intakes]="intakes"
        [ghost]="ghost"
        [trackHeight]="trackHeight"
        [laneCount]="laneCount"
        [dragging]="dragging"
        [constrainPosition]="constrainPosition"
        (timelineDrop)="timelineDrop($event)"
        (dragStarted)="dragStarted()"
        (dragMoved)="dragMoved($event)"
        (dragEnded)="dragEnded()"
        (removeIntake)="removeIntake($event)"
        (resizeStart)="resizeStart($event)"
      />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanTimelineComponent>;

export const Default: Story = {
  args: {
    marks,
    intakes,
    ghost: null,
    trackHeight: 300,
    laneCount: 1,
    dragging: false,
    constrainPosition,
  },
};

export const WithGhost: Story = {
  args: {
    ...Default.args,
    ghost: { lane: 0, top: 100, height: 45 },
  },
};
