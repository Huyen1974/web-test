# Budget and billing alerts infrastructure
# Adapted from agent-data-test for web-test multi-service stack

resource "google_pubsub_topic" "billing_alerts_topic" {
  name = "web-test-billing-alerts-topic"

  labels = {
    environment = var.env
    project     = "web-test"
    purpose     = "billing-alerts"
  }
}

resource "google_billing_budget" "web_test_budget" {
  count           = var.billing_account_id == "" ? 0 : 1
  billing_account = var.billing_account_id

  display_name = "Web-Test Budget (Nuxt + Directus + Kestra + Chatwoot)"

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "15" # Higher budget for multi-service stack
    }
  }

  # Alert at 50% budget consumption
  threshold_rules {
    threshold_percent = 0.5
  }

  # Alert at 75% budget consumption
  threshold_rules {
    threshold_percent = 0.75
  }

  # Alert at 90% budget consumption
  threshold_rules {
    threshold_percent = 0.9
  }

  # Alert at 100% budget consumption
  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    pubsub_topic   = google_pubsub_topic.billing_alerts_topic.id
    schema_version = "1.0"
  }

  # Filter to only track this project's costs
  budget_filter {
    projects = ["projects/${var.project_id}"]
  }
}
