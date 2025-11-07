# Firebase Hosting Infrastructure
# Task #0393: Enable Firebase Hosting for Nuxt 3 web app deployment
# Per PHỤ LỤC D - Web Test Infrastructure Planning

# Enable Firebase APIs
resource "google_project_service" "firebase" {
  project = var.project_id
  service = "firebase.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "firebasehosting" {
  project = var.project_id
  service = "firebasehosting.googleapis.com"

  disable_on_destroy = false
  depends_on         = [google_project_service.firebase]
}

# Additional APIs required for Firebase
resource "google_project_service" "identitytoolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
  depends_on         = [google_project_service.firebase]
}

resource "google_project_service" "firebaserules" {
  project = var.project_id
  service = "firebaserules.googleapis.com"

  disable_on_destroy = false
  depends_on         = [google_project_service.firebase]
}

# Link GCP Project to Firebase
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id

  depends_on = [
    google_project_service.firebase,
    google_project_service.firebasehosting,
    google_project_service.identitytoolkit,
    google_project_service.firebaserules,
  ]
}

# Create Firebase Hosting Site
resource "google_firebase_hosting_site" "web_test" {
  provider = google-beta
  project  = var.project_id
  site_id  = "web-test-huyen1974"

  depends_on = [google_firebase_project.default]
}

# Output the Firebase Hosting Site URL
output "firebase_hosting_url" {
  description = "Firebase Hosting default URL"
  value       = "https://${google_firebase_hosting_site.web_test.site_id}.web.app"
}

output "firebase_hosting_site_id" {
  description = "Firebase Hosting Site ID"
  value       = google_firebase_hosting_site.web_test.site_id
}
