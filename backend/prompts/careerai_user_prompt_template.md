# CareerAI User Prompt Template

Use this template to send a user's data to the AI for analysis.

---

Analyze this student's profile for Kazakhstan job market fit.

## Resume / Profile (JSON)
```json
{
  "personal": {
    "name": "",
    "city": "",
    "email": "",
    "languages": ["ru", "kk", "en"]
  },
  "education": [
    {
      "university": "",
      "degree": "",
      "major": "",
      "start": "",
      "end": ""
    }
  ],
  "experience": [
    {
      "title": "",
      "company": "",
      "location": "",
      "start": "",
      "end": "",
      "bullets": ["", ""]
    }
  ],
  "projects": [
    {
      "name": "",
      "stack": ["", ""],
      "link": "",
      "bullets": ["", ""]
    }
  ],
  "skills": {
    "technical": ["", ""],
    "tools": ["", ""],
    "soft": ["", ""]
  }
}
```

## Goals
- Target roles (priority order):
  - 1) ...
  - 2) ...
- Preferred industries:
- Preferred city/region:
- Salary expectations (KZT, if any):
- Timeline (e.g., 3 months):

## What I want from CareerAI
- Give fit scores (estimate) for each target role.
- Identify must-have gaps and how to close them.
- Suggest a realistic 2w/30d/90d plan.
- Suggest courses/resources (prefer KZ-relevant if present in knowledge base).

