use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserResponse {
    pub id: Uuid,
    pub email: String,
    pub is_admin: bool,
    pub created_at: DateTime<Utc>,
    pub workout_count: i64,
    pub last_active: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserListResponse {
    pub users: Vec<AdminUserResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserDetailResponse {
    pub id: Uuid,
    pub email: String,
    pub is_admin: bool,
    pub created_at: DateTime<Utc>,
    pub workout_count: i64,
    pub last_active: Option<DateTime<Utc>>,
    pub total_sets: i64,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SetAdminStatusRequest {
    pub is_admin: bool,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminUserListQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DailyRegistration {
    pub date: NaiveDate,
    pub count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct TopUserResponse {
    pub id: Uuid,
    pub email: String,
    pub workout_count: i64,
    pub total_sets: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AdminMetricsResponse {
    pub total_users: i64,
    pub total_workouts: i64,
    pub total_sets: i64,
    pub active_today: i64,
    pub active_this_week: i64,
    pub active_this_month: i64,
    pub registrations_by_day: Vec<DailyRegistration>,
    pub top_users_by_workouts: Vec<TopUserResponse>,
}
