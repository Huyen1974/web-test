# Secrets for Cloud Run services per PHỤ LỤC D
# All random_password must have lifecycle { ignore_changes = [result] } per Hiến pháp
# All secrets must use replication in asia-southeast1 per Hiến pháp

# ============================================================================
# DIRECTUS SECRETS
# ============================================================================

resource "random_password" "directus_key" {
  length  = 32
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_key" {
  secret_id = "directus-key-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

resource "random_password" "directus_secret" {
  length  = 32
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_secret" {
  secret_id = "directus-secret-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

resource "random_password" "directus_admin_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_admin_password" {
  secret_id = "directus-admin-password-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

resource "random_password" "directus_mysql_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "directus_mysql_password" {
  secret_id = "directus-mysql-password-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

# ============================================================================
# KESTRA SECRETS
# ============================================================================

resource "random_password" "kestra_encryption_key" {
  length  = 32
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "kestra_encryption_key" {
  secret_id = "kestra-encryption-key-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

resource "random_password" "kestra_postgres_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "kestra_postgres_password" {
  secret_id = "kestra-postgres-password-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

# ============================================================================
# CHATWOOT SECRETS
# ============================================================================

resource "random_password" "chatwoot_secret_key_base" {
  length  = 64
  special = false

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "chatwoot_secret_key_base" {
  secret_id = "chatwoot-secret-key-base-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}

resource "random_password" "chatwoot_mysql_password" {
  length  = 32
  special = true

  lifecycle {
    ignore_changes = [result]
  }
}

resource "google_secret_manager_secret" "chatwoot_mysql_password" {
  secret_id = "chatwoot-mysql-password-test"

  replication {
    user_managed {
      replicas {
        location = "asia-southeast1"
      }
    }
  }
}
