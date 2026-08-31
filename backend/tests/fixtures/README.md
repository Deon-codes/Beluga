# Test Fixtures

This directory holds test fixtures and mock/sample sonar scans for automated testing and CI.

- Real sonar test scans (`sample_sonar.png`) can be added here when available from the survey dataset.
- Automated tests in `backend/tests/test_model_smoke.py` will dynamically generate a temporary synthetic sonar scan if no real scan is present, guaranteeing reliable test execution without hard dependencies on large binary assets.
