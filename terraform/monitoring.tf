# Cloud Monitoring Dashboard
# Adapted from agent-data-test for web-test Cloud Run services
# Monitors: Directus (CMS), Kestra (Workflow), Chatwoot (Chat)

resource "google_monitoring_dashboard" "web_test_services_dashboard" {
  project = var.project_id

  dashboard_json = jsonencode({
    displayName = "Web-Test Services – Cloud Run Metrics"
    mosaicLayout = {
      columns = 12
      tiles = [
        # Directus Service Metrics
        {
          xPos   = 0
          yPos   = 0
          width  = 4
          height = 3
          widget = {
            title = "Directus - Request Count (5m)"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"directus-${var.env}\" metric.type=\"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
              sparkChartView = { sparkChartType = "SPARK_LINE" }
            }
          }
        },
        # Kestra Service Metrics
        {
          xPos   = 4
          yPos   = 0
          width  = 4
          height = 3
          widget = {
            title = "Kestra - Request Count (5m)"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"kestra-${var.env}\" metric.type=\"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
              sparkChartView = { sparkChartType = "SPARK_LINE" }
            }
          }
        },
        # Chatwoot Service Metrics
        {
          xPos   = 8
          yPos   = 0
          width  = 4
          height = 3
          widget = {
            title = "Chatwoot - Request Count (5m)"
            scorecard = {
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "resource.type=\"cloud_run_revision\" resource.labels.service_name=\"chatwoot-${var.env}\" metric.type=\"run.googleapis.com/request_count\""
                  aggregation = {
                    alignmentPeriod  = "300s"
                    perSeriesAligner = "ALIGN_RATE"
                  }
                }
              }
              sparkChartView = { sparkChartType = "SPARK_LINE" }
            }
          }
        },
        # Combined Request Latency
        {
          xPos   = 0
          yPos   = 3
          width  = 12
          height = 6
          widget = {
            title = "All Services - Request Latency (p50 / p95 / p99)"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              dataSets = [
                {
                  legendTemplate     = "p50"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_50"
                        groupByFields      = ["resource.labels.service_name"]
                      }
                    }
                  }
                },
                {
                  legendTemplate     = "p95"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_95"
                        groupByFields      = ["resource.labels.service_name"]
                      }
                    }
                  }
                },
                {
                  legendTemplate     = "p99"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_latencies\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_DELTA"
                        crossSeriesReducer = "REDUCE_PERCENTILE_99"
                        groupByFields      = ["resource.labels.service_name"]
                      }
                    }
                  }
                }
              ]
              yAxis = { label = "milliseconds", scale = "LINEAR" }
            }
          }
        },
        # Cloud SQL MySQL Connections
        {
          xPos   = 0
          yPos   = 9
          width  = 6
          height = 4
          widget = {
            title = "MySQL (Directus) - Active Connections"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              dataSets = [
                {
                  legendTemplate     = "Connections"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloudsql_database\" metric.type=\"cloudsql.googleapis.com/database/mysql/connections\""
                      aggregation = {
                        alignmentPeriod  = "60s"
                        perSeriesAligner = "ALIGN_MEAN"
                      }
                    }
                  }
                }
              ]
              yAxis = { label = "connections", scale = "LINEAR" }
            }
          }
        },
        # Error Rate
        {
          xPos   = 6
          yPos   = 9
          width  = 6
          height = 4
          widget = {
            title = "All Services - Error Rate (5xx)"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              dataSets = [
                {
                  legendTemplate     = "5xx Errors"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    timeSeriesFilter = {
                      filter = "resource.type=\"cloud_run_revision\" metric.type=\"run.googleapis.com/request_count\" metric.labels.response_code_class=\"5xx\""
                      aggregation = {
                        alignmentPeriod    = "60s"
                        perSeriesAligner   = "ALIGN_RATE"
                        crossSeriesReducer = "REDUCE_SUM"
                        groupByFields      = ["resource.labels.service_name"]
                      }
                    }
                  }
                }
              ]
              yAxis = { label = "errors/second", scale = "LINEAR" }
            }
          }
        }
      ]
    }
  })
}
