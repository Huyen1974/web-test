provider "github" {}

variable "enable_github_branch_protection" {
  description = "Enable creation of GitHub branch protection via Terraform"
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository name (without owner)"
  type        = string
  default     = "agent-data-test"
}

variable "branch_name" {
  description = "Branch name to protect"
  type        = string
  default     = "main"
}

variable "required_status_checks" {
  description = "List of required status checks (workflow names/contexts)"
  type        = list(string)
  default     = ["Lint Only"]
}

data "github_repository" "this" {
  count = var.enable_github_branch_protection ? 1 : 0
  name  = var.github_repository
}

resource "github_branch_protection_v3" "main" {
  count         = var.enable_github_branch_protection ? 1 : 0
  repository_id = data.github_repository.this[0].node_id
  pattern       = var.branch_name

  enforce_admins                  = true
  require_conversation_resolution = true

  required_status_checks {
    strict   = false
    contexts = var.required_status_checks
  }

  # Minimal review requirements can be enabled later if needed
  # required_pull_request_reviews {
  #   dismiss_stale_reviews           = true
  #   required_approving_review_count = 1
  # }
}
