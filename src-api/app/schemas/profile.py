from pydantic import BaseModel


class Basics(BaseModel):
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    website: str | None = None
    summary: str | None = None
    photo: str | None = None  # URL to uploaded photo


class Skill(BaseModel):
    category: str | None = None
    items: list[str] | None = None


class Experience(BaseModel):
    company: str | None = None
    title: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    current: bool | None = None
    description: str | None = None
    highlights: list[str] | None = None


class Education(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    notes: str | None = None


class Certification(BaseModel):
    name: str | None = None
    issuer: str | None = None
    date_obtained: str | None = None
    expiration: str | None = None
    credential_id: str | None = None


class Project(BaseModel):
    name: str | None = None
    description: str | None = None
    role: str | None = None
    technologies: list[str] | None = None
    outcomes: list[str] | None = None


class Publication(BaseModel):
    title: str | None = None
    venue: str | None = None
    date: str | None = None
    url: str | None = None


class Award(BaseModel):
    title: str | None = None
    issuer: str | None = None
    date: str | None = None
    description: str | None = None


class Volunteer(BaseModel):
    organization: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None


class LanguageSkill(BaseModel):
    language: str | None = None
    proficiency: str | None = None


class ProfileData(BaseModel):
    basics: Basics | None = None
    skills: list[Skill] | None = None
    experience: list[Experience] | None = None
    education: list[Education] | None = None
    certifications: list[Certification] | None = None
    projects: list[Project] | None = None
    publications: list[Publication] | None = None
    awards: list[Award] | None = None
    volunteer: list[Volunteer] | None = None
    languages: list[LanguageSkill] | None = None


class SynthesizeRequest(BaseModel):
    model: str
    guidance: str | None = None


class ProfileResponse(BaseModel):
    id: str
    data: ProfileData
    guidance: str | None
    photo_path: str | None = None
    generated_at: str | None
    created_at: str
    updated_at: str
