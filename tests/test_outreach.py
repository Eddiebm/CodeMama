"""Tests for COARE Business Development Outreach."""

from __future__ import annotations

import json
import os
import tempfile
import pytest

from coare.models import (
    Campaign,
    CampaignStatus,
    Company,
    Contact,
    OutreachActivity,
    OutreachStatus,
)
from coare.outreach import OutreachManager


@pytest.fixture
def manager(tmp_path):
    """Return an OutreachManager backed by a temporary file."""
    return OutreachManager(data_path=str(tmp_path / "test_data.json"))


# ──────────────────────────────────────────────────────────────────────
# Model round-trip tests
# ──────────────────────────────────────────────────────────────────────

def test_contact_roundtrip():
    c = Contact(name="Alice Smith", email="alice@example.com", title="VP Sales")
    assert Contact.from_dict(c.to_dict()).name == "Alice Smith"


def test_company_roundtrip():
    co = Company(name="Acme Corp", industry="Technology", website="https://acme.example.com")
    assert Company.from_dict(co.to_dict()).industry == "Technology"


def test_campaign_roundtrip():
    camp = Campaign(name="Q1 Push", goal="Close 5 deals", status=CampaignStatus.ACTIVE)
    assert Campaign.from_dict(camp.to_dict()).goal == "Close 5 deals"


def test_activity_roundtrip():
    a = OutreachActivity(
        contact_id="abc", channel="email", subject="Partnership intro"
    )
    assert OutreachActivity.from_dict(a.to_dict()).channel == "email"


# ──────────────────────────────────────────────────────────────────────
# OutreachManager – companies
# ──────────────────────────────────────────────────────────────────────

def test_add_and_list_companies(manager):
    co = Company(name="Initech", industry="Finance")
    manager.add_company(co)
    companies = manager.list_companies()
    assert len(companies) == 1
    assert companies[0].name == "Initech"


def test_get_company(manager):
    co = Company(name="Globex")
    manager.add_company(co)
    fetched = manager.get_company(co.id)
    assert fetched is not None
    assert fetched.id == co.id


def test_remove_company(manager):
    co = Company(name="Umbrella")
    manager.add_company(co)
    assert manager.remove_company(co.id) is True
    assert manager.get_company(co.id) is None


def test_remove_nonexistent_company(manager):
    assert manager.remove_company("nonexistent-id") is False


# ──────────────────────────────────────────────────────────────────────
# OutreachManager – contacts
# ──────────────────────────────────────────────────────────────────────

def test_add_and_list_contacts(manager):
    c = Contact(name="Bob Jones", email="bob@example.com")
    manager.add_contact(c)
    contacts = manager.list_contacts()
    assert len(contacts) == 1
    assert contacts[0].email == "bob@example.com"


def test_list_contacts_by_company(manager):
    co = Company(name="Acme")
    manager.add_company(co)
    c1 = Contact(name="Alice", email="a@acme.com", company_id=co.id)
    c2 = Contact(name="Bob", email="b@other.com", company_id="other-id")
    manager.add_contact(c1)
    manager.add_contact(c2)
    result = manager.list_contacts(company_id=co.id)
    assert len(result) == 1
    assert result[0].name == "Alice"


def test_remove_contact(manager):
    c = Contact(name="Carol", email="carol@example.com")
    manager.add_contact(c)
    assert manager.remove_contact(c.id) is True
    assert manager.get_contact(c.id) is None


# ──────────────────────────────────────────────────────────────────────
# OutreachManager – campaigns
# ──────────────────────────────────────────────────────────────────────

def test_add_and_list_campaigns(manager):
    camp = Campaign(name="Spring Drive", goal="Generate 20 leads")
    manager.add_campaign(camp)
    camps = manager.list_campaigns()
    assert len(camps) == 1
    assert camps[0].goal == "Generate 20 leads"


def test_update_campaign_status(manager):
    camp = Campaign(name="Summer Drive", goal="Close 10 deals")
    manager.add_campaign(camp)
    assert manager.update_campaign_status(camp.id, CampaignStatus.ACTIVE) is True
    fetched = manager.get_campaign(camp.id)
    assert fetched.status == CampaignStatus.ACTIVE


def test_list_campaigns_by_status(manager):
    c1 = Campaign(name="Active One", goal="g1", status=CampaignStatus.ACTIVE)
    c2 = Campaign(name="Draft One", goal="g2", status=CampaignStatus.DRAFT)
    manager.add_campaign(c1)
    manager.add_campaign(c2)
    active = manager.list_campaigns(status=CampaignStatus.ACTIVE)
    assert len(active) == 1
    assert active[0].name == "Active One"


# ──────────────────────────────────────────────────────────────────────
# OutreachManager – activities
# ──────────────────────────────────────────────────────────────────────

def test_add_and_list_activities(manager):
    c = Contact(name="Dave", email="dave@example.com")
    manager.add_contact(c)
    a = OutreachActivity(contact_id=c.id, channel="email", subject="Hello!")
    manager.add_activity(a)
    activities = manager.list_activities()
    assert len(activities) == 1
    assert activities[0].subject == "Hello!"


def test_update_activity_status(manager):
    c = Contact(name="Eve", email="eve@example.com")
    manager.add_contact(c)
    a = OutreachActivity(contact_id=c.id, channel="phone", subject="Follow-up call")
    manager.add_activity(a)
    assert manager.update_activity_status(a.id, OutreachStatus.COMPLETED) is True
    fetched = manager.get_activity(a.id)
    assert fetched.status == OutreachStatus.COMPLETED


def test_list_activities_by_contact(manager):
    c1 = Contact(name="Frank", email="frank@example.com")
    c2 = Contact(name="Grace", email="grace@example.com")
    manager.add_contact(c1)
    manager.add_contact(c2)
    a1 = OutreachActivity(contact_id=c1.id, channel="email", subject="Intro")
    a2 = OutreachActivity(contact_id=c2.id, channel="email", subject="Proposal")
    manager.add_activity(a1)
    manager.add_activity(a2)
    result = manager.list_activities(contact_id=c1.id)
    assert len(result) == 1
    assert result[0].subject == "Intro"


def test_list_activities_by_status(manager):
    c = Contact(name="Hank", email="hank@example.com")
    manager.add_contact(c)
    a1 = OutreachActivity(contact_id=c.id, channel="email", subject="A", status=OutreachStatus.PENDING)
    a2 = OutreachActivity(contact_id=c.id, channel="email", subject="B", status=OutreachStatus.COMPLETED)
    manager.add_activity(a1)
    manager.add_activity(a2)
    pending = manager.list_activities(status=OutreachStatus.PENDING)
    assert len(pending) == 1
    assert pending[0].subject == "A"


# ──────────────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────────────

def test_summary(manager):
    co = Company(name="MegaCorp")
    manager.add_company(co)
    c = Contact(name="Ivy", email="ivy@example.com")
    manager.add_contact(c)
    camp = Campaign(name="Q4", goal="Revenue", status=CampaignStatus.ACTIVE)
    manager.add_campaign(camp)
    a = OutreachActivity(contact_id=c.id, channel="email", subject="Outreach", status=OutreachStatus.PENDING)
    manager.add_activity(a)

    s = manager.summary()
    assert s["companies"] == 1
    assert s["contacts"] == 1
    assert s["campaigns"] == 1
    assert s["activities"] == 1
    assert s["pending"] == 1
    assert s["completed"] == 0


# ──────────────────────────────────────────────────────────────────────
# Persistence
# ──────────────────────────────────────────────────────────────────────

def test_data_persists_across_instances(tmp_path):
    path = str(tmp_path / "persist.json")
    mgr1 = OutreachManager(data_path=path)
    co = Company(name="Persistco")
    mgr1.add_company(co)

    mgr2 = OutreachManager(data_path=path)
    assert len(mgr2.list_companies()) == 1
    assert mgr2.list_companies()[0].name == "Persistco"
