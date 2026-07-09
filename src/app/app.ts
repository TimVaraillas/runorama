import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MainLayoutComponent } from './shared/ui/templates/main-layout/main-layout.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MainLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ui-main-layout />`,
})
export class App {}
