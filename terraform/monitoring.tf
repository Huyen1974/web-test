# =============================================================================
# Monitoring Dashboard for web-test Infrastructure
# Follows: HP-OBS-01 (observability), APP-LAW §6.1 (SLO targets)
# =============================================================================

# Enable Cloud Monitoring API
resource "google_project_service" "monitoring" {
  project = var.project_id
  service = "monitoring.googleapis.com"

  disable_on_destroy = false
}

# -----------------------------------------------------------------------------
# Monitoring Dashboard for web-test
# APP-LAW §6.1 SLO Targets:
#   - P95 latency < 600ms
#   - Error rate < 1%
#   - Sync lag ≤ 2 minutes
#   - DLQ rate < 0.1%/day
# -----------------------------------------------------------------------------

resource "google_monitoring_dashboard" "web_test_dashboard" {
  count = var.enable_monitoring_dashboard ? 1 : 0

  dashboard_json = jsonencode({
    displayName = "web-test Infrastructure Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        # -----------------------------------------------------------------------
        # SLO Group 1: Latency Metrics (P95 < 600ms)
        # -----------------------------------------------------------------------
        {
          width  = 6
          height = 4
          widget = {
            title = "HTTP Request Latency (P95 Target: < 600ms)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      # TODO: Replace with actual metric when Cloud Run service is deployed
                      # Example metric: run.googleapis.com/request_latencies
                      filter = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"directus-test\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_95"
                        groupByFields = [
                          "resource.service_name"
                        ]
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              timeshiftDuration = "0s"
              yAxis = {
                label = "Latency (ms)"
                scale = "LINEAR"
              }
              thresholds = [
                {
                  value = 600
                  color = "RED"
                  direction = "ABOVE"
                  label = "SLO Threshold (600ms)"
                }
              ]
            }
          }
        },

        # -----------------------------------------------------------------------
        # SLO Group 2: Error Rate (< 1%)
        # -----------------------------------------------------------------------
        {
          xPos   = 6
          width  = 6
          height = 4
          widget = {
            title = "Error Rate (Target: < 1%)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      # TODO: Replace with actual metric when Cloud Run service is deployed
                      # Example: count of 5xx responses / total requests
                      filter = "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_RATE"
                        crossSeriesReducer = "REDUCE_SUM"
                        groupByFields = [
                          "metric.response_code_class"
                        ]
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              yAxis = {
                label = "Error Rate (%)"
                scale = "LINEAR"
              }
              thresholds = [
                {
                  value = 1.0
                  color = "RED"
                  direction = "ABOVE"
                  label = "SLO Threshold (1%)"
                }
              ]
            }
          }
        },

        # -----------------------------------------------------------------------
        # SLO Group 3: Sync Lag (≤ 2 minutes)
        # -----------------------------------------------------------------------
        {
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Sync Lag (Target: ≤ 2 minutes)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    # TODO: Define custom metric for sync job lag
                    # This metric should track the time difference between:
                    # 1. Last sync job completion time
                    # 2. Current time
                    # Placeholder filter - needs actual metric implementation
                    timeSeriesFilter = {
                      filter = "resource.type=\"generic_task\" AND metric.type=\"custom.googleapis.com/sync_lag_seconds\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_MAX"
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              yAxis = {
                label = "Lag (seconds)"
                scale = "LINEAR"
              }
              thresholds = [
                {
                  value = 120
                  color = "RED"
                  direction = "ABOVE"
                  label = "SLO Threshold (2 minutes)"
                }
              ]
            }
          }
        },

        # -----------------------------------------------------------------------
        # SLO Group 4: DLQ Rate (< 0.1%/day)
        # -----------------------------------------------------------------------
        {
          xPos   = 6
          yPos   = 4
          width  = 6
          height = 4
          widget = {
            title = "Dead Letter Queue Rate (Target: < 0.1%/day)"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    # TODO: Define custom metric for DLQ rate
                    # This metric should track:
                    # (Messages in DLQ / Total messages processed) * 100
                    # Placeholder filter - needs actual metric implementation
                    timeSeriesFilter = {
                      filter = "resource.type=\"generic_task\" AND metric.type=\"custom.googleapis.com/dlq_rate_percent\""
                      aggregation = {
                        alignmentPeriod  = "86400s" # 1 day
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              yAxis = {
                label = "DLQ Rate (%)"
                scale = "LINEAR"
              }
              thresholds = [
                {
                  value = 0.1
                  color = "RED"
                  direction = "ABOVE"
                  label = "SLO Threshold (0.1%)"
                }
              ]
            }
          }
        },

        # -----------------------------------------------------------------------
        # Additional Metrics: Cloud SQL Performance
        # -----------------------------------------------------------------------
        {
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Cloud SQL - CPU Utilization"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/cpu/utilization\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              yAxis = {
                label = "CPU %"
                scale = "LINEAR"
              }
            }
          }
        },

        # -----------------------------------------------------------------------
        # Additional Metrics: Cloud SQL Connections
        # -----------------------------------------------------------------------
        {
          xPos   = 6
          yPos   = 8
          width  = 6
          height = 4
          widget = {
            title = "Cloud SQL - Active Connections"
            xyChart = {
              dataSets = [
                {
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloudsql_database\" AND metric.type=\"cloudsql.googleapis.com/database/mysql/connections\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                  plotType = "LINE"
                  targetAxis = "Y1"
                }
              ]
              yAxis = {
                label = "Connections"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })

  depends_on = [google_project_service.monitoring]
}

# -----------------------------------------------------------------------------
# IMPORTANT NOTES FOR MONITORING DASHBOARD
# -----------------------------------------------------------------------------
# 1. APP-LAW §6.1 SLO Targets (documented here for reference):
#    - P95 latency < 600ms: HTTP request response time
#    - Error rate < 1%: Percentage of failed requests (5xx errors)
#    - Sync lag ≤ 2 minutes: Time between sync job runs
#    - DLQ rate < 0.1%/day: Dead letter queue message percentage
#
# 2. Dashboard is SKELETON only:
#    - Placeholder metrics need to be replaced with actual metrics
#    - Some metrics require custom metric definitions
#    - Cloud Run metrics available after service deployment
#
# 3. Custom Metrics TODO:
#    - sync_lag_seconds: Track sync job completion lag
#    - dlq_rate_percent: Track DLQ message rate
#    - Implement using Cloud Monitoring custom metrics API
#
# 4. Alerting Policies:
#    - TODO: Create alerting policies for SLO violations
#    - Alert channels: email, Slack, PagerDuty, etc.
#    - Escalation policies for critical thresholds
#
# 5. Dashboard Customization:
#    - Adjust time windows and aggregation periods as needed
#    - Add more widgets for specific use cases
#    - Integrate with Cloud Trace for request tracing
