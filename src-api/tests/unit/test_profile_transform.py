import pytest

from app.services.profile_transform import transform_profile_for_generator


FULL_PROFILE_DATA = {
    "basics": {
        "name": "Jane Doe",
        "title": "Senior Engineer",
        "email": "jane@example.com",
        "phone": "555-1234",
        "location": "San Francisco, CA",
        "linkedin": "https://linkedin.com/in/janedoe",
        "website": "https://jane.dev",
        "summary": "Experienced engineer.",
        "photo": "/uploads/photo.jpg",
    },
    "skills": [{"category": "Languages", "items": ["Python", "TypeScript"]}],
    "experience": [
        {
            "company": "Acme Corp",
            "title": "Senior Engineer",
            "start_date": "2020-01",
            "end_date": "2024-06",
            "current": False,
            "description": "Built stuff.",
            "highlights": ["Led migration to microservices", "Reduced latency 40%"],
        },
        {
            "company": "StartupCo",
            "title": "Engineer",
            "start_date": "2018-03",
            "end_date": None,
            "current": True,
            "highlights": ["Full-stack development"],
        },
    ],
    "education": [
        {
            "institution": "MIT",
            "degree": "B.S.",
            "field": "Computer Science",
            "start_date": "2014-09",
            "end_date": "2018-05",
            "notes": "Magna cum laude",
        }
    ],
    "certifications": [
        {
            "name": "AWS Solutions Architect",
            "issuer": "Amazon",
            "date_obtained": "2023-01",
            "expiration": "2026-01",
            "credential_id": "ABC123",
        }
    ],
    "projects": [
        {
            "name": "OpenWidget",
            "description": "Open-source widget library",
            "role": "Creator",
            "technologies": ["React", "TypeScript"],
            "outcomes": ["500+ GitHub stars"],
        }
    ],
    "publications": [
        {"title": "Scaling Microservices", "venue": "InfoQ", "date": "2023-06", "url": "https://infoq.com/article"}
    ],
    "awards": [{"title": "Engineer of the Year", "issuer": "Acme Corp", "date": "2023", "description": "Top performer"}],
    "volunteer": [
        {
            "organization": "Code.org",
            "role": "Mentor",
            "start_date": "2022-01",
            "end_date": "2023-12",
            "description": "Mentored students",
        }
    ],
    "languages": [{"language": "English", "proficiency": "Native"}, {"language": "Spanish", "proficiency": "B2"}],
}


class TestTransformProfile:
    def test_profile_section(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        assert result["profile"]["fullName"] == "Jane Doe"
        assert result["profile"]["title"] == "Senior Engineer"
        assert result["profile"]["summary"] == "Experienced engineer."
        assert result["profile"]["photo"] == "/uploads/photo.jpg"
        assert result["profile"]["location"] == "San Francisco, CA"

    def test_contact_section(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        assert result["contact"]["email"] == "jane@example.com"
        assert result["contact"]["phone"] == "555-1234"
        assert result["contact"]["website"] == "https://jane.dev"
        assert result["contact"]["socialLinks"] == [
            {"platform": "LinkedIn", "url": "https://linkedin.com/in/janedoe"}
        ]

    def test_work_experience_transforms(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        exp = result["workExperience"]
        assert len(exp) == 2
        assert exp[0]["company"] == "Acme Corp"
        assert exp[0]["startDate"] == "2020-01"
        assert exp[0]["endDate"] == "2024-06"
        assert exp[0]["responsibilities"] == ["Led migration to microservices", "Reduced latency 40%"]
        # current=True with no end_date → "Present"
        assert exp[1]["endDate"] == "Present"

    def test_education_transforms(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        edu = result["education"]
        assert len(edu) == 1
        assert edu[0]["fieldOfStudy"] == "Computer Science"
        assert edu[0]["startDate"] == "2014-09"
        assert edu[0]["endDate"] == "2018-05"
        assert edu[0]["notes"] == "Magna cum laude"

    def test_certification_transforms(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        cert = result["certifications"][0]
        assert cert["dateObtained"] == "2023-01"
        assert cert["credentialId"] == "ABC123"

    def test_volunteer_transforms(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        vol = result["volunteer"][0]
        assert vol["startDate"] == "2022-01"
        assert vol["endDate"] == "2023-12"

    def test_passthrough_sections(self):
        """Skills, publications, awards, languages pass through with minimal transform."""
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        assert result["skills"] == FULL_PROFILE_DATA["skills"]
        assert result["publications"][0]["title"] == "Scaling Microservices"
        assert result["awards"][0]["title"] == "Engineer of the Year"
        assert result["languages"][0]["language"] == "English"

    def test_theme_and_site_type(self):
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="onyx", site_type="portfolio",
        )
        assert result["theme"] == {"name": "onyx"}
        assert result["siteType"] == "portfolio"
        assert result["jobPosting"] is None

    def test_targeted_with_job_posting(self):
        jp = {"title": "Staff Engineer", "company": "BigCo", "description": "Lead platform team"}
        result = transform_profile_for_generator(
            profile_data=FULL_PROFILE_DATA, theme="coral", site_type="targeted", job_posting=jp,
        )
        assert result["siteType"] == "targeted"
        assert result["jobPosting"]["company"] == "BigCo"
        assert result["jobPosting"]["title"] == "Staff Engineer"

    def test_empty_profile(self):
        result = transform_profile_for_generator(
            profile_data={}, theme="onyx", site_type="portfolio",
        )
        assert result["profile"]["fullName"] == ""
        assert result["profile"]["title"] == ""
        assert result["contact"]["socialLinks"] == []
        assert result["workExperience"] == []
        assert result["certifications"] == []

    def test_missing_sections_default_to_empty_lists(self):
        result = transform_profile_for_generator(
            profile_data={"basics": {"name": "Joe"}}, theme="onyx", site_type="portfolio",
        )
        assert result["workExperience"] == []
        assert result["projects"] == []
        assert result["education"] == []
        assert result["skills"] == []
        assert result["certifications"] == []
        assert result["publications"] == []
        assert result["awards"] == []
        assert result["volunteer"] == []
        assert result["languages"] == []
