use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use utoipa::IntoParams;
use uuid::Uuid;

use crate::dto::{
    AdminMetricsResponse, AdminUserDetailResponse, AdminUserListResponse, AdminUserResponse,
    SetAdminStatusRequest,
};
use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::repositories::AdminRepository;

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(rename_all = "camelCase")]
pub struct AdminUsersQuery {
    pub page: Option<i64>,
    #[serde(rename = "pageSize")]
    pub page_size: Option<i64>,
}

#[utoipa::path(
    get,
    path = "/api/v1/admin/users",
    tag = "Admin",
    params(AdminUsersQuery),
    responses(
        (status = 200, description = "List of users", body = AdminUserListResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - admin only"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn list_admin_users(
    State(pool): State<PgPool>,
    Extension(_auth_user): Extension<AuthUser>,
    Query(query): Query<AdminUsersQuery>,
) -> Result<Json<AdminUserListResponse>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);

    let (users, total) = AdminRepository::list_users(&pool, page, page_size).await?;

    Ok(Json(AdminUserListResponse { users, total }))
}

#[utoipa::path(
    get,
    path = "/api/v1/admin/users/{id}",
    tag = "Admin",
    params(
        ("id" = Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User detail", body = AdminUserDetailResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - admin only"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_admin_user(
    State(pool): State<PgPool>,
    Extension(_auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<Json<AdminUserDetailResponse>, AppError> {
    let user = AdminRepository::get_user(&pool, id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("User {} not found", id)))?;

    Ok(Json(user))
}

#[utoipa::path(
    delete,
    path = "/api/v1/admin/users/{id}",
    tag = "Admin",
    params(
        ("id" = Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 204, description = "User deleted"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - admin only"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn delete_admin_user(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, AppError> {
    if id == auth_user.user_id {
        return Err(AppError::BadRequest("Cannot delete your own account".to_string()));
    }

    AdminRepository::delete_user(&pool, id).await?;

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    patch,
    path = "/api/v1/admin/users/{id}",
    tag = "Admin",
    params(
        ("id" = Uuid, Path, description = "User ID")
    ),
    request_body = SetAdminStatusRequest,
    responses(
        (status = 200, description = "Updated user", body = AdminUserResponse),
        (status = 400, description = "Cannot demote yourself"),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - admin only"),
        (status = 404, description = "User not found"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn set_admin_status(
    State(pool): State<PgPool>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(body): Json<SetAdminStatusRequest>,
) -> Result<Json<AdminUserResponse>, AppError> {
    if id == auth_user.user_id && !body.is_admin {
        return Err(AppError::BadRequest("Cannot revoke your own admin status".to_string()));
    }

    let user = AdminRepository::set_admin_status(&pool, id, body.is_admin).await?;

    Ok(Json(user))
}

#[utoipa::path(
    get,
    path = "/api/v1/admin/metrics",
    tag = "Admin",
    responses(
        (status = 200, description = "Platform metrics", body = AdminMetricsResponse),
        (status = 401, description = "Unauthorized"),
        (status = 403, description = "Forbidden - admin only"),
    ),
    security(("bearer_auth" = []))
)]
pub async fn get_admin_metrics(
    State(pool): State<PgPool>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<Json<AdminMetricsResponse>, AppError> {
    let metrics = AdminRepository::get_metrics(&pool).await?;
    Ok(Json(metrics))
}
