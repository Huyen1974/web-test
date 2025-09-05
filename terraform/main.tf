module "agent_data_service_test" {
  source       = "./modules/cloud_run_service"
  project_id   = "github-chatgpt-ggcloud"
  location     = "asia-southeast1"
  service_name = "agent-data-test"
  image_path   = "asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/agent-data-test/agent-data-test:latest"
}

