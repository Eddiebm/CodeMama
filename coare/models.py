"""Data models for COARE Business Development Outreach."""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timezone
from enum import Enum
from typing import List, Optional


class OutreachStatus(str, Enum):
    """Status of an outreach activity."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DECLINED = "declined"
    FOLLOW_UP = "follow_up"


class CampaignStatus(str, Enum):
    """Status of an outreach campaign."""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


@dataclass
class Contact:
    """A business contact for outreach."""

    name: str
    email: str
    title: str = ""
    phone: str = ""
    company_id: str = ""
    notes: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Contact":
        return cls(**data)


@dataclass
class Company:
    """A target company for business development."""

    name: str
    industry: str = ""
    website: str = ""
    address: str = ""
    notes: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Company":
        return cls(**data)


@dataclass
class OutreachActivity:
    """A single outreach interaction with a contact."""

    contact_id: str
    channel: str  # email, phone, linkedin, meeting, etc.
    subject: str
    notes: str = ""
    status: str = OutreachStatus.PENDING
    campaign_id: str = ""
    activity_date: str = field(default_factory=lambda: date.today().isoformat())
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "OutreachActivity":
        return cls(**data)


@dataclass
class Campaign:
    """A business development outreach campaign."""

    name: str
    goal: str
    start_date: str = field(default_factory=lambda: date.today().isoformat())
    end_date: str = ""
    status: str = CampaignStatus.DRAFT
    notes: str = ""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> "Campaign":
        return cls(**data)
