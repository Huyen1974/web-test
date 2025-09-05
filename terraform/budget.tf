// Budget and billing alerts infrastructure
resource "google_pubsub_topic" "billing_alerts_topic" {
  name = "billing-alerts-topic"
}

resource "google_billing_budget" "r_and_d_budget" {
  count           = var.billing_account_id == "" ? 0 : 1
  billing_account = var.billing_account_id

  display_name = "R&D Budget (Plan V12)"

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "8"
    }
  }

  threshold_rules {
    threshold_percent = 0.5
  }

  threshold_rules {
    threshold_percent = 0.8
  }

  threshold_rules {
    threshold_percent = 1.0
  }

  all_updates_rule {
    pubsub_topic   = google_pubsub_topic.billing_alerts_topic.id
    schema_version = "1.0"
  }
}
