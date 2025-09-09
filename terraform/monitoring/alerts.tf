resource "google_monitoring_notification_channel" "email_ops" {
  display_name = "Ops Email"
  type         = "email"

  labels = {
    email_address = var.alert_email
  }
}

# High API Latency (P95 > 1.5s for 5m) on Cloud Run
resource "google_monitoring_alert_policy" "high_latency_p95" {
  display_name = "High API Latency (P95 > 1.5s)"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "P95 request latency over threshold"

    condition_threshold {
      filter = <<-EOT
        metric.type="run.googleapis.com/request_latencies" AND resource.type="cloud_run_revision" AND resource.label."service_name"="${var.run_service_name}"
      EOT

      comparison      = "COMPARISON_GT"
      threshold_value = 1.5
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_ops.name]
}

# High Error Rate (>2% 5xx over 5m) on Cloud Run
resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "High Error Rate (5xx > 2%)"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "5xx error ratio over threshold"

    condition_threshold {
      # Ratio alert: numerator (5xx) / denominator (all)
      filter             = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${var.run_service_name}\" AND metric.label.\"response_code_class\"=\"5xx\""
      denominator_filter = "metric.type=\"run.googleapis.com/request_count\" AND resource.type=\"cloud_run_revision\" AND resource.label.\"service_name\"=\"${var.run_service_name}\""

      comparison      = "COMPARISON_GT"
      threshold_value = 0.02
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }

      denominator_aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.label.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email_ops.name]
}

