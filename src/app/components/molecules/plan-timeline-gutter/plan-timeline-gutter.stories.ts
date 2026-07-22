import type { Meta, StoryObj } from '@storybook/angular';
import type { SequenceMark } from '../../../core/models';
import { PlanTimelineGutterComponent } from './plan-timeline-gutter.component';

const marks: SequenceMark[] = [
  { minute: 0, top: 0, label: '0h00', major: true },
  { minute: 10, top: 60, label: '0h10', major: false },
  { minute: 20, top: 120, label: '0h20', major: false },
  { minute: 30, top: 180, label: '0h30', major: false },
  { minute: 60, top: 360, label: '1h00', major: true },
];

const meta: Meta<PlanTimelineGutterComponent> = {
  title: 'Molecules/PlanTimelineGutter',
  component: PlanTimelineGutterComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<div class="rounded-xl border border-slate-200 bg-white p-2">
      <ui-plan-timeline-gutter [marks]="marks" [height]="height" />
    </div>`,
  }),
};

export default meta;
type Story = StoryObj<PlanTimelineGutterComponent>;

export const Default: Story = {
  args: { marks, height: 400 },
};
