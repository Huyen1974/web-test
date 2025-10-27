# Directus Schema Definitions

This document describes the database schemas for the web-test application's CMS (Directus) content. These schemas support bilingual content (Vietnamese/Japanese) and integrate with the FastAPI Agent Data service via webhooks.

## Overview

The system consists of three main collections:
1. **Students** - Student profiles and information
2. **Jobs** - Job postings and opportunities
3. **Affiliate** - Partner organizations and affiliates

All collections support **bilingual content** (Vietnamese `vi` and Japanese `ja`) using Directus translations feature.

---

## Collection: Students

### Purpose
Manage student profiles, including personal information, academic details, and status tracking.

### Fields

| Field Name | Type | Required | Translations | Description |
|------------|------|----------|--------------|-------------|
| `id` | UUID | ✓ | No | Primary key (auto-generated) |
| `status` | Status | ✓ | No | Draft, Published, Archived |
| `sort` | Integer | No | No | Manual sorting order |
| `date_created` | Timestamp | Auto | No | Creation timestamp |
| `date_updated` | Timestamp | Auto | No | Last update timestamp |
| `full_name` | String | ✓ | **Yes** | Student's full name |
| `email` | String | ✓ | No | Contact email (unique) |
| `phone` | String | No | No | Phone number |
| `address` | Text | No | **Yes** | Residential address |
| `date_of_birth` | Date | No | No | Birth date |
| `major` | String | No | **Yes** | Field of study |
| `enrollment_year` | Integer | No | No | Year enrolled |
| `graduation_year` | Integer | No | No | Expected/actual graduation year |
| `student_status` | Dropdown | No | No | Active, Inactive, Graduated |
| `bio` | Textarea | No | **Yes** | Short biography |
| `avatar` | File | No | No | Profile photo (M2O to directus_files) |

### Translations Fields
- `full_name` → `full_name_translations` (VN/JA)
- `address` → `address_translations` (VN/JA)
- `major` → `major_translations` (VN/JA)
- `bio` → `bio_translations` (VN/JA)

### Relations
- **M2O**: `avatar` → `directus_files`

### Webhooks
- **On Create/Update/Delete** → FastAPI Agent Data endpoint: `/api/webhooks/students`

---

## Collection: Jobs

### Purpose
Manage job postings and employment opportunities for students and alumni.

### Fields

| Field Name | Type | Required | Translations | Description |
|------------|------|----------|--------------|-------------|
| `id` | UUID | ✓ | No | Primary key (auto-generated) |
| `status` | Status | ✓ | No | Draft, Published, Archived |
| `sort` | Integer | No | No | Manual sorting order |
| `date_created` | Timestamp | Auto | No | Creation timestamp |
| `date_updated` | Timestamp | Auto | No | Last update timestamp |
| `job_title` | String | ✓ | **Yes** | Job position title |
| `company_name` | String | ✓ | **Yes** | Employer company name |
| `company_logo` | File | No | No | Company logo (M2O to directus_files) |
| `location` | String | No | **Yes** | Work location |
| `job_type` | Dropdown | No | No | Full-time, Part-time, Contract, Internship |
| `salary_min` | Decimal | No | No | Minimum salary |
| `salary_max` | Decimal | No | No | Maximum salary |
| `salary_currency` | String | No | No | Currency code (VND, JPY, USD) |
| `description` | WYSIWYG | ✓ | **Yes** | Full job description |
| `requirements` | WYSIWYG | No | **Yes** | Required skills/qualifications |
| `benefits` | WYSIWYG | No | **Yes** | Benefits and perks |
| `application_deadline` | Date | No | No | Last date to apply |
| `contact_email` | String | No | No | Application email |
| `external_url` | String | No | No | External application link |
| `featured` | Boolean | No | No | Show as featured job |

### Translations Fields
- `job_title` → `job_title_translations` (VN/JA)
- `company_name` → `company_name_translations` (VN/JA)
- `location` → `location_translations` (VN/JA)
- `description` → `description_translations` (VN/JA)
- `requirements` → `requirements_translations` (VN/JA)
- `benefits` → `benefits_translations` (VN/JA)

### Relations
- **M2O**: `company_logo` → `directus_files`

### Webhooks
- **On Create/Update/Delete** → FastAPI Agent Data endpoint: `/api/webhooks/jobs`

---

## Collection: Affiliate

### Purpose
Manage partner organizations, affiliated companies, and collaborative institutions.

### Fields

| Field Name | Type | Required | Translations | Description |
|------------|------|----------|--------------|-------------|
| `id` | UUID | ✓ | No | Primary key (auto-generated) |
| `status` | Status | ✓ | No | Draft, Published, Archived |
| `sort` | Integer | No | No | Manual sorting order |
| `date_created` | Timestamp | Auto | No | Creation timestamp |
| `date_updated` | Timestamp | Auto | No | Last update timestamp |
| `name` | String | ✓ | **Yes** | Organization name |
| `logo` | File | No | No | Organization logo (M2O to directus_files) |
| `type` | Dropdown | No | **Yes** | University, Company, NGO, Government, Other |
| `website` | String | No | No | Official website URL |
| `description` | WYSIWYG | No | **Yes** | Organization description |
| `partnership_type` | Dropdown | No | **Yes** | Academic, Employment, Sponsorship, Research |
| `contact_person` | String | No | No | Main contact name |
| `contact_email` | String | No | No | Contact email |
| `contact_phone` | String | No | No | Contact phone |
| `country` | String | No | No | Country code (VN, JP, etc.) |
| `active` | Boolean | ✓ | No | Partnership active status |

### Translations Fields
- `name` → `name_translations` (VN/JA)
- `type` → `type_translations` (VN/JA)
- `description` → `description_translations` (VN/JA)
- `partnership_type` → `partnership_type_translations` (VN/JA)

### Relations
- **M2O**: `logo` → `directus_files`

### Webhooks
- **On Create/Update/Delete** → FastAPI Agent Data endpoint: `/api/webhooks/affiliates`

---

## Implementation Steps

### 1. Access Directus Admin

```bash
# Start Directus instance
gcloud sql instances patch mysql-directus-web-test \
  --activation-policy=ALWAYS \
  --project=github-chatgpt-ggcloud

# Wait for instance to start (~2-3 minutes)

# Access Directus URL (from terraform output or Cloud Run)
# URL format: https://directus-test-<hash>-uc.a.run.app
```

### 2. Create Collections

For each collection (Students, Jobs, Affiliate):

1. Navigate to **Settings → Data Model**
2. Click **Create Collection**
3. Set collection name (singular, lowercase with underscores: `students`, `jobs`, `affiliate`)
4. Enable **Singleton** if needed (usually No for these collections)
5. Configure primary key: `id` (UUID, auto-generated)
6. Add system fields:
   - `status` (Status interface)
   - `sort` (Sort interface)
   - `date_created` (Datetime created)
   - `date_updated` (Datetime updated)

### 3. Add Fields

For each field in the schema tables above:

1. Click **Create Field** in the collection
2. Select appropriate field type
3. Configure field options:
   - Set **Required** flag if needed
   - Set **Readonly** for auto fields
   - Configure validation rules
   - Set interface (dropdown, WYSIWYG, etc.)

### 4. Configure Translations

For fields marked with **Translations = Yes**:

1. Create a **Translations** interface for the collection
2. Add language codes: `vi` (Vietnamese), `ja` (Japanese)
3. For each translatable field:
   - Create corresponding `<field>_translations` relation
   - Link to translations table
   - Configure interface to show language tabs

**Example for Students.full_name**:
```
Field: full_name_translations
Type: Translations (O2M)
Languages: vi, ja
Related Collection: students_translations
Fields: full_name
```

### 5. Setup Webhooks

For each collection, configure webhooks to notify FastAPI Agent Data:

1. Navigate to **Settings → Webhooks**
2. Click **Create Webhook**
3. Configure:
   - **Name**: `<Collection> to Agent Data`
   - **URL**: `https://agent-data-test-<hash>-uc.a.run.app/api/webhooks/<collection>`
   - **Method**: POST
   - **Trigger**: `items.create`, `items.update`, `items.delete`
   - **Collections**: Select the specific collection
   - **Status**: Active

**Webhook URLs**:
- Students: `/api/webhooks/students`
- Jobs: `/api/webhooks/jobs`
- Affiliates: `/api/webhooks/affiliates`

### 6. Set Permissions

Configure role permissions for:

1. **Public** role:
   - Read access to published items only
   - No create/update/delete

2. **Authenticated** role (if using Firebase Auth):
   - Read published items
   - Create/update own submissions (if applicable)

3. **Administrator** role:
   - Full CRUD access
   - Manage translations

---

## Database Schema (MySQL)

Once collections are created via Directus UI, they will generate the following MySQL tables:

```sql
-- Students table
CREATE TABLE `students` (
  `id` char(36) NOT NULL,
  `status` varchar(255) DEFAULT 'draft',
  `sort` int DEFAULT NULL,
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `enrollment_year` int DEFAULT NULL,
  `graduation_year` int DEFAULT NULL,
  `student_status` varchar(50) DEFAULT NULL,
  `avatar` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
);

CREATE TABLE `students_translations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `students_id` char(36) DEFAULT NULL,
  `languages_code` varchar(10) DEFAULT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `address` text,
  `major` varchar(255) DEFAULT NULL,
  `bio` text,
  PRIMARY KEY (`id`)
);

-- Jobs table (similar structure with translations)
-- Affiliate table (similar structure with translations)
```

---

## Validation & Testing

After implementing the schemas:

1. **Test CRUD Operations**:
   - Create sample entries in each language
   - Verify translations display correctly
   - Test status workflows (Draft → Published)

2. **Test Webhooks**:
   - Monitor webhook delivery in Directus logs
   - Verify FastAPI receives and processes events
   - Check for errors in Cloud Run logs

3. **Test API Access**:
   ```javascript
   // Example: Fetch jobs in Vietnamese
   import { createDirectus, rest, readItems } from '@directus/sdk';

   const client = createDirectus(DIRECTUS_URL).with(rest());

   const jobs = await client.request(
     readItems('jobs', {
       filter: { status: { _eq: 'published' } },
       fields: ['*', 'job_title_translations.*']
     })
   );
   ```

---

## Maintenance Notes

### Backup Schema

After configuring all collections, export the schema for backup:

```bash
# Using Directus CLI (if available)
npx directus schema snapshot ./schema-snapshot.yaml

# Or export via API
curl https://<directus-url>/schema/snapshot \
  -H "Authorization: Bearer <admin-token>" \
  > schema-backup.json
```

### Future Migration to IaC

Consider migrating to Infrastructure as Code in the future using:
- **Directus Schema Snapshots** (YAML) + apply via CLI
- **Terraform + SQL migrations** for direct MySQL management
- **Directus Extensions** for custom schema management

---

## Related Documentation

- [Directus Data Model Documentation](https://docs.directus.io/app/data-model/)
- [Directus Translations Guide](https://docs.directus.io/app/data-model/translations/)
- [Directus Webhooks](https://docs.directus.io/app/webhooks/)
- [FastAPI Agent Data API](../README.md#webhooks)

---

**Last Updated**: 2025-10-27
**Version**: 1.0 (Sprint 1)
**Author**: Web-Test Development Team
