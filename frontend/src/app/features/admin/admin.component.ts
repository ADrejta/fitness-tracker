import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import { Chart, BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { PageContainerComponent } from '../../layout';
import { CardComponent, BadgeComponent, ButtonComponent, ModalComponent } from '../../shared/components';
import { AdminService, AdminUser, AdminMetrics } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [
    CommonModule,
    BaseChartDirective,
    PageContainerComponent,
    CardComponent,
    BadgeComponent,
    ButtonComponent,
    ModalComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  authService = inject(AuthService);

  activeTab = signal<'overview' | 'users'>('overview');

  metrics = signal<AdminMetrics | null>(null);
  metricsLoading = signal(false);
  metricsError = signal<string | null>(null);

  users = signal<AdminUser[]>([]);
  usersTotal = signal(0);
  usersPage = signal(1);
  usersPageSize = 20;
  usersLoading = signal(false);
  usersError = signal<string | null>(null);

  deleteTarget = signal<AdminUser | null>(null);
  deleteLoading = signal(false);

  barChartData = signal<ChartConfiguration<'bar'>['data']>({
    labels: [],
    datasets: [{ data: [], label: 'Registrations', backgroundColor: 'rgba(99, 102, 241, 0.7)' }],
  });

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  ngOnInit(): void {
    this.loadMetrics();
    this.loadUsers();
  }

  setTab(tab: 'overview' | 'users'): void {
    this.activeTab.set(tab);
  }

  async loadMetrics(): Promise<void> {
    this.metricsLoading.set(true);
    this.metricsError.set(null);
    try {
      const m = await this.adminService.getMetrics();
      this.metrics.set(m);
      this.barChartData.set({
        labels: m.registrationsByDay.map(d => d.date),
        datasets: [{
          data: m.registrationsByDay.map(d => d.count),
          label: 'Registrations',
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
        }],
      });
    } catch {
      this.metricsError.set('Failed to load metrics');
    } finally {
      this.metricsLoading.set(false);
    }
  }

  async loadUsers(): Promise<void> {
    this.usersLoading.set(true);
    this.usersError.set(null);
    try {
      const res = await this.adminService.listUsers(this.usersPage(), this.usersPageSize);
      this.users.set(res.users);
      this.usersTotal.set(res.total);
    } catch {
      this.usersError.set('Failed to load users');
    } finally {
      this.usersLoading.set(false);
    }
  }

  async toggleAdmin(user: AdminUser): Promise<void> {
    try {
      const updated = await this.adminService.setAdminStatus(user.id, !user.isAdmin);
      this.users.update(list => list.map(u => u.id === updated.id ? { ...u, isAdmin: updated.isAdmin } : u));
    } catch {
      // silently ignore — user stays unchanged
    }
  }

  confirmDelete(user: AdminUser): void {
    this.deleteTarget.set(user);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  async executeDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteLoading.set(true);
    try {
      await this.adminService.deleteUser(target.id);
      this.users.update(list => list.filter(u => u.id !== target.id));
      this.usersTotal.update(n => n - 1);
      this.deleteTarget.set(null);
    } catch {
      // silently ignore
    } finally {
      this.deleteLoading.set(false);
    }
  }

  isSelf(user: AdminUser): boolean {
    return user.id === this.authService.user()?.id;
  }

  get totalPages(): number {
    return Math.ceil(this.usersTotal() / this.usersPageSize);
  }

  goToPage(page: number): void {
    this.usersPage.set(page);
    this.loadUsers();
  }
}
