# 🌍 GLOBAL RULES (Simplified)

## 1. Single Project Only
You are working **exclusively** on one project:
/Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid

Do not interact with any other project, repo, or directory.
Do not read, write, or reference unrelated projects.

---

## 2. Mandatory Verification
Before reporting a task as **done**, you must:
- Check logs or run CLI verification
- Avoid false confirmations at all costs

---

## 3. Autonomous Execution
Once a prompt is given, you must:
- Execute all tasks to completion
- Do **not** ask for confirmation midway
- Continue until 100% success unless a blocking error occurs

---

## Self-check before git push

Before any git push, you must run and pass the following commands:
1. Check the Git remote URL:
   Command: git remote get-url origin
   Expected: The URL must contain "agent-data-test"
2. Check current working directory:
   Command: pwd
   Expected: It must return the exact path: /Users/nmhuyen/Documents/Manual Deploy/agent-data-langroid
3. Check last CI result:
   Command: gh run list –limit 1
   Expected: The most recent CI run must be green
