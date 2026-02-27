"""Command-line interface for COARE Business Development Outreach."""

from __future__ import annotations

import sys

import click
from tabulate import tabulate

from .models import Campaign, CampaignStatus, Company, Contact, OutreachActivity, OutreachStatus
from .outreach import OutreachManager

DATA_FILE = "coare_data.json"


def _manager() -> OutreachManager:
    return OutreachManager(data_path=DATA_FILE)


@click.group()
def cli() -> None:
    """COARE – Customer Outreach And Relationship Engine.

    Business Development Outreach toolkit for managing contacts,
    companies, campaigns, and activities.
    """


# ──────────────────────────────────────────────────────────────────────
# Dashboard
# ──────────────────────────────────────────────────────────────────────

@cli.command()
def dashboard() -> None:
    """Show a high-level summary of outreach activity."""
    mgr = _manager()
    s = mgr.summary()
    click.echo("\n=== COARE Business Development Dashboard ===\n")
    rows = [
        ["Companies", s["companies"]],
        ["Contacts", s["contacts"]],
        ["Campaigns", s["campaigns"]],
        ["Total Activities", s["activities"]],
        ["  Pending", s["pending"]],
        ["  Follow-up", s["follow_up"]],
        ["  Completed", s["completed"]],
    ]
    click.echo(tabulate(rows, tablefmt="simple"))
    click.echo()


# ──────────────────────────────────────────────────────────────────────
# Companies
# ──────────────────────────────────────────────────────────────────────

@cli.group()
def company() -> None:
    """Manage target companies."""


@company.command("add")
@click.option("--name", required=True, prompt=True)
@click.option("--industry", default="", prompt="Industry (optional)")
@click.option("--website", default="", prompt="Website (optional)")
@click.option("--address", default="", prompt="Address (optional)")
@click.option("--notes", default="", prompt="Notes (optional)")
def company_add(name: str, industry: str, website: str, address: str, notes: str) -> None:
    """Add a new company."""
    mgr = _manager()
    c = Company(name=name, industry=industry, website=website, address=address, notes=notes)
    mgr.add_company(c)
    click.echo(f"Company added: {c.name} (id={c.id})")


@company.command("list")
def company_list() -> None:
    """List all companies."""
    mgr = _manager()
    companies = mgr.list_companies()
    if not companies:
        click.echo("No companies found.")
        return
    rows = [[c.id[:8], c.name, c.industry, c.website] for c in companies]
    click.echo(tabulate(rows, headers=["ID (short)", "Name", "Industry", "Website"], tablefmt="simple"))


@company.command("remove")
@click.argument("company_id")
def company_remove(company_id: str) -> None:
    """Remove a company by ID."""
    mgr = _manager()
    if mgr.remove_company(company_id):
        click.echo(f"Company {company_id} removed.")
    else:
        click.echo(f"Company {company_id} not found.", err=True)
        sys.exit(1)


# ──────────────────────────────────────────────────────────────────────
# Contacts
# ──────────────────────────────────────────────────────────────────────

@cli.group()
def contact() -> None:
    """Manage contacts."""


@contact.command("add")
@click.option("--name", required=True, prompt=True)
@click.option("--email", required=True, prompt=True)
@click.option("--title", default="", prompt="Job title (optional)")
@click.option("--phone", default="", prompt="Phone (optional)")
@click.option("--company-id", default="", prompt="Company ID (optional)")
@click.option("--notes", default="", prompt="Notes (optional)")
def contact_add(name: str, email: str, title: str, phone: str, company_id: str, notes: str) -> None:
    """Add a new contact."""
    mgr = _manager()
    c = Contact(name=name, email=email, title=title, phone=phone, company_id=company_id, notes=notes)
    mgr.add_contact(c)
    click.echo(f"Contact added: {c.name} <{c.email}> (id={c.id})")


@contact.command("list")
@click.option("--company-id", default=None, help="Filter by company ID")
def contact_list(company_id: str) -> None:
    """List contacts."""
    mgr = _manager()
    contacts = mgr.list_contacts(company_id=company_id)
    if not contacts:
        click.echo("No contacts found.")
        return
    rows = [[c.id[:8], c.name, c.email, c.title, c.company_id[:8] if c.company_id else ""] for c in contacts]
    click.echo(tabulate(rows, headers=["ID (short)", "Name", "Email", "Title", "Company ID (short)"], tablefmt="simple"))


@contact.command("remove")
@click.argument("contact_id")
def contact_remove(contact_id: str) -> None:
    """Remove a contact by ID."""
    mgr = _manager()
    if mgr.remove_contact(contact_id):
        click.echo(f"Contact {contact_id} removed.")
    else:
        click.echo(f"Contact {contact_id} not found.", err=True)
        sys.exit(1)


# ──────────────────────────────────────────────────────────────────────
# Campaigns
# ──────────────────────────────────────────────────────────────────────

@cli.group()
def campaign() -> None:
    """Manage outreach campaigns."""


@campaign.command("add")
@click.option("--name", required=True, prompt=True)
@click.option("--goal", required=True, prompt=True)
@click.option("--start-date", default="", prompt="Start date YYYY-MM-DD (optional)")
@click.option("--end-date", default="", prompt="End date YYYY-MM-DD (optional)")
@click.option("--notes", default="", prompt="Notes (optional)")
def campaign_add(name: str, goal: str, start_date: str, end_date: str, notes: str) -> None:
    """Create a new outreach campaign."""
    mgr = _manager()
    kwargs = dict(name=name, goal=goal, end_date=end_date, notes=notes)
    if start_date:
        kwargs["start_date"] = start_date
    c = Campaign(**kwargs)
    mgr.add_campaign(c)
    click.echo(f"Campaign created: {c.name} (id={c.id})")


@campaign.command("list")
@click.option("--status", default=None, type=click.Choice([s.value for s in CampaignStatus]))
def campaign_list(status: str) -> None:
    """List campaigns."""
    mgr = _manager()
    campaigns = mgr.list_campaigns(status=status)
    if not campaigns:
        click.echo("No campaigns found.")
        return
    rows = [[c.id[:8], c.name, c.goal, c.status, c.start_date, c.end_date] for c in campaigns]
    click.echo(tabulate(rows, headers=["ID (short)", "Name", "Goal", "Status", "Start", "End"], tablefmt="simple"))


@campaign.command("status")
@click.argument("campaign_id")
@click.argument("new_status", type=click.Choice([s.value for s in CampaignStatus]))
def campaign_status(campaign_id: str, new_status: str) -> None:
    """Update campaign status."""
    mgr = _manager()
    if mgr.update_campaign_status(campaign_id, new_status):
        click.echo(f"Campaign {campaign_id} status set to {new_status}.")
    else:
        click.echo(f"Campaign {campaign_id} not found.", err=True)
        sys.exit(1)


# ──────────────────────────────────────────────────────────────────────
# Activities
# ──────────────────────────────────────────────────────────────────────

@cli.group()
def activity() -> None:
    """Log and manage outreach activities."""


@activity.command("add")
@click.option("--contact-id", required=True, prompt=True)
@click.option("--channel", required=True, prompt="Channel (email/phone/linkedin/meeting/other)")
@click.option("--subject", required=True, prompt=True)
@click.option("--notes", default="", prompt="Notes (optional)")
@click.option("--campaign-id", default="", prompt="Campaign ID (optional)")
@click.option(
    "--status",
    default=OutreachStatus.PENDING,
    type=click.Choice([s.value for s in OutreachStatus]),
    prompt="Status",
)
def activity_add(
    contact_id: str, channel: str, subject: str, notes: str, campaign_id: str, status: str
) -> None:
    """Log a new outreach activity."""
    mgr = _manager()
    a = OutreachActivity(
        contact_id=contact_id,
        channel=channel,
        subject=subject,
        notes=notes,
        campaign_id=campaign_id,
        status=status,
    )
    mgr.add_activity(a)
    click.echo(f"Activity logged: {a.subject} (id={a.id})")


@activity.command("list")
@click.option("--contact-id", default=None)
@click.option("--campaign-id", default=None)
@click.option("--status", default=None, type=click.Choice([s.value for s in OutreachStatus]))
def activity_list(contact_id: str, campaign_id: str, status: str) -> None:
    """List outreach activities."""
    mgr = _manager()
    activities = mgr.list_activities(
        contact_id=contact_id, campaign_id=campaign_id, status=status
    )
    if not activities:
        click.echo("No activities found.")
        return
    rows = [
        [a.id[:8], a.contact_id[:8], a.channel, a.subject, a.status, a.activity_date]
        for a in activities
    ]
    click.echo(
        tabulate(
            rows,
            headers=["ID (short)", "Contact (short)", "Channel", "Subject", "Status", "Date"],
            tablefmt="simple",
        )
    )


@activity.command("status")
@click.argument("activity_id")
@click.argument("new_status", type=click.Choice([s.value for s in OutreachStatus]))
def activity_status(activity_id: str, new_status: str) -> None:
    """Update activity status."""
    mgr = _manager()
    if mgr.update_activity_status(activity_id, new_status):
        click.echo(f"Activity {activity_id} status set to {new_status}.")
    else:
        click.echo(f"Activity {activity_id} not found.", err=True)
        sys.exit(1)


if __name__ == "__main__":
    cli()
