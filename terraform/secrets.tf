# Secret Manager for web-test infrastructure
# Per PHỤ LỤC D (Quy hoạch Hạ tầng Web-Test)
# All secrets follow:
# - lifecycle { ignore_changes = [result] } for rotation support
# - replication in asia-southeast1 region
# - Fix #2: No plain text passwords (using random_password + secret manager)

# ============================================
# Directus Secrets (4)
# ============================================

resource "random_password" "directus_key" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_key" {
  secret_id = "directus-key"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "directus_key" {
  secret      = google_secret_manager_secret.directus_key.id
  secret_data = random_password.directus_key.result
}

resource "random_password" "directus_secret" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_secret" {
  secret_id = "directus-secret"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "directus_secret" {
  secret      = google_secret_manager_secret.directus_secret.id
  secret_data = random_password.directus_secret.result
}

resource "random_password" "directus_admin_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_admin_password" {
  secret_id = "directus-admin-password"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "directus_admin_password" {
  secret      = google_secret_manager_secret.directus_admin_password.id
  secret_data = random_password.directus_admin_password.result
}

resource "random_password" "directus_db_password" {
  length  = 32
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_db_password" {
  secret_id = "directus-db-password"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "directus_db_password" {
  secret      = google_secret_manager_secret.directus_db_password.id
  secret_data = random_password.directus_db_password.result
}

# ============================================
# Kestra Secrets (2)
# DISABLED: Phase 1 focuses on MySQL + Directus only
# ============================================

# resource "random_password" "kestra_db_password" {
#   length  = 32
#   special = false
#
#   lifecycle {
#     ignore_changes = [result]
#   }
# }
#
# resource "google_secret_manager_secret" "kestra_db_password" {
#   secret_id = "kestra-db-password"
#
#   replication {
#     user_managed {
#       replicas {
#         location = var.region
#       }
#     }
#   }
# }
#
# resource "google_secret_manager_secret_version" "kestra_db_password" {
#   secret      = google_secret_manager_secret.kestra_db_password.id
#   secret_data = random_password.kestra_db_password.result
# }
#
# resource "random_password" "kestra_encryption_key" {
#   length  = 32
#   special = true
#
#   lifecycle {
#     ignore_changes = [result]
#   }
# }
#
# resource "google_secret_manager_secret" "kestra_encryption_key" {
#   secret_id = "kestra-encryption-key"
#
#   replication {
#     user_managed {
#       replicas {
#         location = var.region
#       }
#     }
#   }
# }
#
# resource "google_secret_manager_secret_version" "kestra_encryption_key" {
#   secret      = google_secret_manager_secret.kestra_encryption_key.id
#   secret_data = random_password.kestra_encryption_key.result
# }

# ============================================
# Chatwoot Secrets (2)
# DISABLED: Phase 1 focuses on MySQL + Directus only
# ============================================

# resource "random_password" "chatwoot_secret_key_base" {
#   length  = 64
#   special = true
#
#   lifecycle {
#     ignore_changes = [result]
#   }
# }
#
# resource "google_secret_manager_secret" "chatwoot_secret_key_base" {
#   secret_id = "chatwoot-secret-key-base"
#
#   replication {
#     user_managed {
#       replicas {
#         location = var.region
#       }
#     }
#   }
# }
#
# resource "google_secret_manager_secret_version" "chatwoot_secret_key_base" {
#   secret      = google_secret_manager_secret.chatwoot_secret_key_base.id
#   secret_data = random_password.chatwoot_secret_key_base.result
# }
#
# resource "random_password" "chatwoot_db_password" {
#   length  = 32
#   special = false
#
#   lifecycle {
#     ignore_changes = [result]
#   }
# }
#
# resource "google_secret_manager_secret" "chatwoot_db_password" {
#   secret_id = "chatwoot-db-password"
#
#   replication {
#     user_managed {
#       replicas {
#         location = var.region
#       }
#     }
#   }
# }
#
# resource "google_secret_manager_secret_version" "chatwoot_db_password" {
#   secret      = google_secret_manager_secret.chatwoot_db_password.id
#   secret_data = random_password.chatwoot_db_password.result
# }
