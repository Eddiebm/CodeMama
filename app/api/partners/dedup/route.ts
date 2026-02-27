import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // Fetch all partners ordered by createdAt ascending (keep the oldest/first)
    const all = await db.partner.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Group by name + contactEmail (or name + contactName if no email)
    const seen = new Map<string, string>(); // key -> id to keep
    const toDelete: string[] = [];

    for (const p of all) {
      const key = `${p.name.trim().toLowerCase()}|||${(p.contactEmail || p.contactName || '').trim().toLowerCase()}`;
      if (seen.has(key)) {
        toDelete.push(p.id);
      } else {
        seen.set(key, p.id);
      }
    }

    // Delete duplicates (no messages/drafts on new records, safe to delete)
    if (toDelete.length > 0) {
      await db.partner.deleteMany({ where: { id: { in: toDelete } } });
    }

    return NextResponse.json({
      before: all.length,
      removed: toDelete.length,
      after: all.length - toDelete.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
