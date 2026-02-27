"""Core outreach management logic for COARE."""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional

from .models import (
    Campaign,
    CampaignStatus,
    Company,
    Contact,
    OutreachActivity,
    OutreachStatus,
)


class OutreachManager:
    """Manages contacts, companies, campaigns, and outreach activities.

    Data is persisted to a JSON file at the specified path.
    """

    def __init__(self, data_path: str = "coare_data.json") -> None:
        self.data_path = data_path
        self._data: dict = {
            "contacts": {},
            "companies": {},
            "campaigns": {},
            "activities": {},
        }
        self._load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def _load(self) -> None:
        """Load data from JSON file if it exists."""
        if os.path.exists(self.data_path):
            with open(self.data_path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            self._data = raw

    def save(self) -> None:
        """Persist current data to the JSON file."""
        with open(self.data_path, "w", encoding="utf-8") as fh:
            json.dump(self._data, fh, indent=2)

    # ------------------------------------------------------------------
    # Companies
    # ------------------------------------------------------------------

    def add_company(self, company: Company) -> Company:
        self._data["companies"][company.id] = company.to_dict()
        self.save()
        return company

    def get_company(self, company_id: str) -> Optional[Company]:
        raw = self._data["companies"].get(company_id)
        return Company.from_dict(raw) if raw else None

    def list_companies(self) -> List[Company]:
        return [Company.from_dict(v) for v in self._data["companies"].values()]

    def remove_company(self, company_id: str) -> bool:
        if company_id in self._data["companies"]:
            del self._data["companies"][company_id]
            self.save()
            return True
        return False

    # ------------------------------------------------------------------
    # Contacts
    # ------------------------------------------------------------------

    def add_contact(self, contact: Contact) -> Contact:
        self._data["contacts"][contact.id] = contact.to_dict()
        self.save()
        return contact

    def get_contact(self, contact_id: str) -> Optional[Contact]:
        raw = self._data["contacts"].get(contact_id)
        return Contact.from_dict(raw) if raw else None

    def list_contacts(self, company_id: Optional[str] = None) -> List[Contact]:
        contacts = [Contact.from_dict(v) for v in self._data["contacts"].values()]
        if company_id:
            contacts = [c for c in contacts if c.company_id == company_id]
        return contacts

    def remove_contact(self, contact_id: str) -> bool:
        if contact_id in self._data["contacts"]:
            del self._data["contacts"][contact_id]
            self.save()
            return True
        return False

    # ------------------------------------------------------------------
    # Campaigns
    # ------------------------------------------------------------------

    def add_campaign(self, campaign: Campaign) -> Campaign:
        self._data["campaigns"][campaign.id] = campaign.to_dict()
        self.save()
        return campaign

    def get_campaign(self, campaign_id: str) -> Optional[Campaign]:
        raw = self._data["campaigns"].get(campaign_id)
        return Campaign.from_dict(raw) if raw else None

    def list_campaigns(
        self, status: Optional[str] = None
    ) -> List[Campaign]:
        campaigns = [Campaign.from_dict(v) for v in self._data["campaigns"].values()]
        if status:
            campaigns = [c for c in campaigns if c.status == status]
        return campaigns

    def update_campaign_status(self, campaign_id: str, status: str) -> bool:
        if campaign_id in self._data["campaigns"]:
            self._data["campaigns"][campaign_id]["status"] = status
            self.save()
            return True
        return False

    # ------------------------------------------------------------------
    # Activities
    # ------------------------------------------------------------------

    def add_activity(self, activity: OutreachActivity) -> OutreachActivity:
        self._data["activities"][activity.id] = activity.to_dict()
        self.save()
        return activity

    def get_activity(self, activity_id: str) -> Optional[OutreachActivity]:
        raw = self._data["activities"].get(activity_id)
        return OutreachActivity.from_dict(raw) if raw else None

    def list_activities(
        self,
        contact_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[OutreachActivity]:
        activities = [
            OutreachActivity.from_dict(v) for v in self._data["activities"].values()
        ]
        if contact_id:
            activities = [a for a in activities if a.contact_id == contact_id]
        if campaign_id:
            activities = [a for a in activities if a.campaign_id == campaign_id]
        if status:
            activities = [a for a in activities if a.status == status]
        return activities

    def update_activity_status(self, activity_id: str, status: str) -> bool:
        if activity_id in self._data["activities"]:
            self._data["activities"][activity_id]["status"] = status
            self.save()
            return True
        return False

    # ------------------------------------------------------------------
    # Summary / Reporting
    # ------------------------------------------------------------------

    def summary(self) -> dict:
        """Return high-level counts for the dashboard."""
        activities = self.list_activities()
        pending = sum(
            1 for a in activities if a.status == OutreachStatus.PENDING
        )
        completed = sum(
            1 for a in activities if a.status == OutreachStatus.COMPLETED
        )
        follow_up = sum(
            1 for a in activities if a.status == OutreachStatus.FOLLOW_UP
        )
        return {
            "companies": len(self._data["companies"]),
            "contacts": len(self._data["contacts"]),
            "campaigns": len(self._data["campaigns"]),
            "activities": len(activities),
            "pending": pending,
            "completed": completed,
            "follow_up": follow_up,
        }
