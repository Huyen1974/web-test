resource "google_monitoring_dashboard" "agent_data_prom_dashboard" {
  project = var.project_id

  dashboard_json = jsonencode({
    displayName = "Agent Data – Prometheus Metrics"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          xPos   = 0
          yPos   = 0
          width  = 6
          height = 3
          widget = {
            title = "HTTP Requests (last 5m increase)"
            scorecard = {
              timeSeriesQuery = {
                prometheusQuery = "sum(increase(http_requests_total[5m]))"
              }
              sparkChartView = { sparkChartType = "SPARK_LINE" }
            }
          }
        },
        {
          xPos   = 0
          yPos   = 3
          width  = 12
          height = 6
          widget = {
            title = "Request Latency (p50 / p90)"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              dataSets = [
                {
                  legendTemplate     = "p50"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    prometheusQuery = "histogram_quantile(0.5, sum(rate(http_requests_latency_seconds_bucket[5m])) by (le))"
                  }
                },
                {
                  legendTemplate     = "p90"
                  plotType           = "LINE"
                  minAlignmentPeriod = "60s"
                  timeSeriesQuery = {
                    prometheusQuery = "histogram_quantile(0.9, sum(rate(http_requests_latency_seconds_bucket[5m])) by (le))"
                  }
                }
              ]
              yAxis = { label = "seconds", scale = "LINEAR" }
            }
          }
        }
      ]
    }
  })
}
