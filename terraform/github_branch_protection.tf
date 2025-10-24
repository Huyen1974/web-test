# GitHub branch protection configuration
# Adapted from agent-data-test for web-test repository

provider "github" {}

variable "enable_github_branch_protection" {
  description = "Enable creation of GitHub branch protection via Terraform"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository name (without owner)"
  type        = string
  default     = "web-test"
}

variable "branch_name" {
  description = "Branch name to protect"
  type        = string
  default     = "main"
}

variable "required_status_checks" {
  description = "List of required status checks (workflow names/contexts)"
  type        = list(string)
  default     = ["Nuxt CI", "Terraform Plan"]
}

resource "github_branch_protection_v3" "main" {
  count      = var.enable_github_branch_protection ? 1 : 0
  repository = var.github_repository
  branch     = var.branch_name

  enforce_admins                  = true
  require_conversation_resolution = true

  required_status_checks {
    strict   = false
    contexts = var.required_status_checks
  }

  required_pull_request_reviews {
    required_approving_review_count = 1
    require_code_owner_reviews      = true
    dismiss_stale_reviews           = true
  }
}
