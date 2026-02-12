import { Component, Input, Output, EventEmitter, ContentChildren, QueryList, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Tab {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tabs-container">
      <div class="tabs" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button
            type="button"
            role="tab"
            class="tab"
            [class.tab--active]="tab.id === activeTab"
            [class.tab--disabled]="tab.disabled"
            [attr.aria-selected]="tab.id === activeTab"
            [disabled]="tab.disabled"
            (click)="selectTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
        <div class="tabs__indicator" [style.transform]="indicatorTransform" [style.width.px]="indicatorWidth"></div>
      </div>
      <div class="tabs-content">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .tabs-container {
      width: 100%;
    }

    .tabs {
      position: relative;
      display: flex;
      gap: var(--spacing-xs);
      border-bottom: 1px solid var(--color-border);
      overflow-x: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .tab {
      position: relative;
      padding: var(--spacing-sm) var(--spacing-md);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-medium);
      color: var(--color-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      white-space: nowrap;
      transition: color var(--transition-fast);

      &:hover:not(:disabled) {
        color: var(--color-text);
      }

      &--active {
        color: var(--color-primary-600);
      }

      &--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .tabs__indicator {
      position: absolute;
      bottom: -1px;
      left: 0;
      height: 2px;
      background: var(--color-primary-600);
      border-radius: var(--radius-full);
      transition: transform 0.2s ease, width 0.2s ease;
    }

    .tabs-content {
      padding-top: var(--spacing-lg);
    }
  `]
})
export class TabsComponent implements AfterContentInit {
  @Input() tabs: Tab[] = [];
  @Input() activeTab = '';

  @Output() tabChange = new EventEmitter<string>();

  indicatorTransform = 'translateX(0)';
  indicatorWidth = 0;

  ngAfterContentInit(): void {
    if (!this.activeTab && this.tabs.length > 0) {
      this.activeTab = this.tabs[0].id;
    }
    setTimeout(() => this.updateIndicator(), 0);
  }

  selectTab(tabId: string): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab && !tab.disabled) {
      this.activeTab = tabId;
      this.tabChange.emit(tabId);
      this.updateIndicator();
    }
  }

  private updateIndicator(): void {
    const activeIndex = this.tabs.findIndex(t => t.id === this.activeTab);
    if (activeIndex >= 0) {
      // Simple calculation - in a real app, you'd measure the actual tab elements
      const tabWidth = 100; // approximate
      this.indicatorWidth = tabWidth - 16;
      this.indicatorTransform = `translateX(${activeIndex * tabWidth + 8}px)`;
    }
  }
}
