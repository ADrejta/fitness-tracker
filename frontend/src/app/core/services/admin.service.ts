import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  workoutCount: number;
  lastActive: string | null;
}

export interface AdminUserDetail extends AdminUser {
  totalSets: number;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
}

export interface DailyRegistration {
  date: string;
  count: number;
}

export interface TopUser {
  id: string;
  email: string;
  workoutCount: number;
  totalSets: number;
}

export interface AdminMetrics {
  totalUsers: number;
  totalWorkouts: number;
  totalSets: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  registrationsByDay: DailyRegistration[];
  topUsersByWorkouts: TopUser[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/admin`;

  listUsers(page = 1, pageSize = 20): Promise<AdminUserListResponse> {
    return firstValueFrom(
      this.http.get<AdminUserListResponse>(`${this.base}/users`, {
        params: { page, pageSize },
      })
    );
  }

  getUser(id: string): Promise<AdminUserDetail> {
    return firstValueFrom(
      this.http.get<AdminUserDetail>(`${this.base}/users/${id}`)
    );
  }

  deleteUser(id: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/users/${id}`)
    );
  }

  setAdminStatus(id: string, isAdmin: boolean): Promise<AdminUser> {
    return firstValueFrom(
      this.http.patch<AdminUser>(`${this.base}/users/${id}`, { isAdmin })
    );
  }

  getMetrics(): Promise<AdminMetrics> {
    return firstValueFrom(
      this.http.get<AdminMetrics>(`${this.base}/metrics`)
    );
  }
}
