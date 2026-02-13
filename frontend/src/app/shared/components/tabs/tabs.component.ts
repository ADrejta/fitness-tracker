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
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.scss']
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
