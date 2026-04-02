"""Transform DB profile data to the generator's PortfolioData contract."""


def transform_profile_for_generator(
    profile_data: dict,
    theme: str,
    site_type: str,
    job_posting: dict | None = None,
) -> dict:
    """Convert the DB profile schema to the generator's PortfolioData shape."""
    basics = profile_data.get("basics") or {}

    return {
        "profile": {
            "fullName": basics.get("name") or "",
            "title": basics.get("title") or "",
            "summary": basics.get("summary"),
            "photo": basics.get("photo"),
            "location": basics.get("location"),
        },
        "contact": {
            "email": basics.get("email"),
            "phone": basics.get("phone"),
            "website": basics.get("website"),
            "socialLinks": _build_social_links(basics),
        },
        "workExperience": [
            _transform_experience(e) for e in (profile_data.get("experience") or [])
        ],
        "projects": [
            _transform_project(p) for p in (profile_data.get("projects") or [])
        ],
        "education": [
            _transform_education(e) for e in (profile_data.get("education") or [])
        ],
        "skills": profile_data.get("skills") or [],
        "certifications": [
            _transform_certification(c)
            for c in (profile_data.get("certifications") or [])
        ],
        "publications": profile_data.get("publications") or [],
        "awards": profile_data.get("awards") or [],
        "volunteer": [
            _transform_volunteer(v) for v in (profile_data.get("volunteer") or [])
        ],
        "languages": profile_data.get("languages") or [],
        "theme": {"name": theme},
        "siteType": site_type,
        "jobPosting": job_posting,
    }


def _build_social_links(basics: dict) -> list[dict]:
    links = []
    if basics.get("linkedin"):
        links.append({"platform": "LinkedIn", "url": basics["linkedin"]})
    return links


def _transform_experience(exp: dict) -> dict:
    end_date = exp.get("end_date") or ("Present" if exp.get("current") else "")
    return {
        "company": exp.get("company") or "",
        "location": exp.get("location"),
        "title": exp.get("title") or "",
        "startDate": exp.get("start_date") or "",
        "endDate": end_date,
        "responsibilities": exp.get("highlights") or [],
    }


def _transform_project(proj: dict) -> dict:
    return {
        "name": proj.get("name") or "",
        "description": proj.get("description") or "",
        "role": proj.get("role"),
        "technologies": proj.get("technologies") or [],
        "outcomes": proj.get("outcomes") or [],
        "url": proj.get("url"),
    }


def _transform_education(edu: dict) -> dict:
    return {
        "institution": edu.get("institution") or "",
        "degree": edu.get("degree") or "",
        "fieldOfStudy": edu.get("field"),
        "startDate": edu.get("start_date"),
        "endDate": edu.get("end_date") or "",
        "notes": edu.get("notes"),
    }


def _transform_certification(cert: dict) -> dict:
    return {
        "name": cert.get("name") or "",
        "issuer": cert.get("issuer"),
        "dateObtained": cert.get("date_obtained"),
        "expiration": cert.get("expiration"),
        "credentialId": cert.get("credential_id"),
    }


def _transform_volunteer(vol: dict) -> dict:
    return {
        "organization": vol.get("organization") or "",
        "role": vol.get("role"),
        "startDate": vol.get("start_date"),
        "endDate": vol.get("end_date"),
        "description": vol.get("description"),
    }
