module "agent_data_service_test" {
  source                 = "./modules/cloud_run_service"
  project_id             = "github-chatgpt-ggcloud"
  location               = "asia-southeast1"
  service_name           = "web-test"
  image_path             = "asia-southeast1-docker.pkg.dev/github-chatgpt-ggcloud/web-test/web-test:latest"
  api_key_secret         = google_secret_manager_secret.agent_data_api_key.secret_id
  api_key_secret_version = google_secret_manager_secret_version.agent_data_api_key.version
}
